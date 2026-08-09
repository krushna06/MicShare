const socketsByUser = new Map();
const lastSeenByUser = new Map();
const userMeta = new Map();

function addConnection(userId, socketId, user) {
  let sockets = socketsByUser.get(userId);
  if (!sockets) {
    sockets = new Set();
    socketsByUser.set(userId, sockets);
  }
  sockets.add(socketId);
  userMeta.set(userId, user);
}

/**
 * removes a socket from the registry
 * @returns {{ gone: boolean, lastSeenAt: string|null }} `gone` is true
 * when this was the user's last remaining socket (user just went offline).
 */
function removeConnection(userId, socketId) {
  const sockets = socketsByUser.get(userId);
  if (!sockets || !sockets.has(socketId)) {
    return { gone: socketsByUser.has(userId), lastSeenAt: lastSeenByUser.get(userId) || null };
  }
  sockets.delete(socketId);
  if (sockets.size === 0) {
    socketsByUser.delete(userId);
    const at = new Date().toISOString();
    lastSeenByUser.set(userId, at);
    return { gone: true, lastSeenAt: at };
  }
  return { gone: false, lastSeenAt: null };
}

function isOnline(userId) {
  return socketsByUser.has(userId);
}

function getLastSeenAt(userId) {
  return lastSeenByUser.get(userId) || null;
}

function getStatus(userId) {
  return {
    online: isOnline(userId),
    lastSeenAt: getLastSeenAt(userId),
  };
}

function getUserMeta(userId) {
  return userMeta.get(userId) || null;
}

function updateUserMeta(userId, patch) {
  const meta = userMeta.get(userId);
  if (!meta) return null;
  const next = { ...meta, ...patch };
  userMeta.set(userId, next);
  return next;
}

function getOnlineUserIds() {
  return Array.from(socketsByUser.keys());
}

module.exports = {
  addConnection,
  removeConnection,
  isOnline,
  getLastSeenAt,
  getStatus,
  getUserMeta,
  updateUserMeta,
  getOnlineUserIds,
};
