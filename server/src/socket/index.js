const { Server } = require('socket.io');
const logger = require('../logger');
const socketEvents = require('@micshare/shared/src/socket-events.json');
const { verifyAccessToken, isTokenRevoked } = require('../auth/tokens');
const { HttpError } = require('../http-error');
const usersRepository = require('../repositories/users');
const friendsRepository = require('../repositories/friends');
const presence = require('./presence');

let connectionCount = 0;

function extractToken(handshake) {
  if (handshake.auth && typeof handshake.auth.token === 'string') {
    return handshake.auth.token;
  }
  const header = handshake.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme === 'Bearer' && token) return token;
  return null;
}

async function authenticateSocket(socket) {
  const token = extractToken(socket.handshake);
  if (!token) {
    throw new HttpError(401, 'Authentication required', 'UNAUTHORIZED');
  }

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw new HttpError(401, 'Session expired, please log in again', 'TOKEN_EXPIRED');
    }
    throw new HttpError(401, 'Invalid authentication token', 'INVALID_TOKEN');
  }

  if (await isTokenRevoked(payload.jti)) {
    throw new HttpError(401, 'Session has been logged out', 'TOKEN_REVOKED');
  }

  const user = await usersRepository.getById(payload.userId);
  if (!user) {
    throw new HttpError(401, 'User no longer exists', 'USER_NOT_FOUND');
  }

  return { userId: payload.userId, jti: payload.jti, exp: payload.exp, user };
}

async function relayRtc(socket, io, eventName, payload, callback, attachSender = false) {
  const { userId, user } = socket.auth;
  const to = payload && payload.to;
  const reply = (ok, error) => {
    if (typeof callback === 'function') callback({ ok, ...(error ? { error } : {}) });
  };
  if (!Number.isInteger(to)) {
    reply(false, 'Missing or invalid recipient');
    return;
  }
  try {
    if (!(await friendsRepository.areFriends(userId, to))) {
      reply(false, 'You can only call your friends');
      return;
    }
    const relayed = { ...payload, from: userId };
    if (attachSender) {
      relayed.fromUser = { id: user.id, username: user.username, displayName: user.displayName };
    }
    io.to(`user:${to}`).emit(eventName, relayed);
    reply(true);
  } catch (err) {
    logger.warn(`RTC relay failed (${eventName})`, { error: err.message });
    reply(false, err.message);
  }
}

function createSocketServer(httpServer, options = {}) {
  const io = new Server(httpServer, {
    cors: {
      origin: options.origin || '*',
      methods: ['GET', 'POST'],
    },
  });

  io.use(async (socket, next) => {
    try {
      socket.auth = await authenticateSocket(socket);
      next();
    } catch (err) {
      next(err);
    }
  });

  io.on('connection', (socket) => {
    const { userId, user } = socket.auth;
    connectionCount += 1;
    presence.addConnection(userId, socket.id, {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
    });
    socket.join(`user:${userId}`);
    logger.info(`Socket connected: ${socket.id} (user ${userId})`, { connections: connectionCount });

    socket.friendUserIds = [];
    socket.presenceSent = false;

    socket.on('app:ping', (payload, callback) => {
      const response = {
        pong: true,
        serverTime: new Date().toISOString(),
      };
      if (typeof callback === 'function') {
        callback(response);
      } else {
        socket.emit(socketEvents.app.pong, response);
      }
    });

    socket.on(socketEvents.rtc.call, (payload, callback) =>
      relayRtc(socket, io, socketEvents.rtc.call, payload, callback, true)
    );
    socket.on(socketEvents.rtc.answer, (payload, callback) =>
      relayRtc(socket, io, socketEvents.rtc.answer, payload, callback)
    );
    socket.on(socketEvents.rtc.ice, (payload, callback) =>
      relayRtc(socket, io, socketEvents.rtc.ice, payload, callback)
    );
    socket.on(socketEvents.rtc.hangup, (payload, callback) =>
      relayRtc(socket, io, socketEvents.rtc.hangup, payload, callback)
    );

    socket.on('disconnect', (reason) => {
      connectionCount -= 1;
      const { gone, lastSeenAt } = presence.removeConnection(userId, socket.id);
      if (gone && socket.presenceSent) {
        const offlinePayload = {
          user: { id: user.id, username: user.username, displayName: user.displayName },
          online: false,
          at: lastSeenAt,
        };
        for (const friendId of socket.friendUserIds) {
          io.to(`user:${friendId}`).emit(socketEvents.presence.update, offlinePayload);
        }
      }
      logger.info(`Socket disconnected: ${socket.id} (user ${userId})`, {
        reason,
        connections: connectionCount,
        stillOnline: !gone,
      });
    });

    (async () => {
      try {
        socket.friendUserIds = (await friendsRepository.getFriends(userId)).map((f) => f.id);
      } catch (err) {
        logger.warn(`Failed to load friends for user ${userId}`, { error: err.message });
      }

      if (socket.disconnected) return;

      socket.presenceSent = true;
      const onlinePayload = {
        user: { id: user.id, username: user.username, displayName: user.displayName },
        online: true,
        at: new Date().toISOString(),
      };
      for (const friendId of socket.friendUserIds) {
        io.to(`user:${friendId}`).emit(socketEvents.presence.update, onlinePayload);
      }
    })();
  });

  io.on('connect_error', (err) => {
    logger.warn('Socket connect_error', { error: err.message });
  });

  return io;
}

function getConnectionCount() {
  return connectionCount;
}

module.exports = { createSocketServer, getConnectionCount, presence };
