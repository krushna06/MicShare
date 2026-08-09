const express = require('express');
const { z } = require('zod');
const { requireAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const friendsRepository = require('../repositories/friends');
const usersRepository = require('../repositories/users');
const { HttpError } = require('../http-error');
const socketEvents = require('@micshare/shared/src/socket-events.json');

const router = express.Router();

function notifyFriendsUpdated(req, userIds) {
  const io = req.app.get('io');
  if (!io) return;
  for (const id of userIds) {
    io.to(`user:${id}`).emit(socketEvents.friends.updated);
  }
}

const userIdSchema = z.object({
  userId: z.coerce.number().int().positive(),
});

const requestIdSchema = z.object({
  requestId: z.coerce.number().int().positive(),
});

const friendIdParamsSchema = z.object({
  friendId: z.coerce.number().int().positive(),
});

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const friends = await friendsRepository.getFriends(req.auth.userId);
    res.json({ friends });
  } catch (err) {
    next(err);
  }
});

router.get('/requests', requireAuth, async (req, res, next) => {
  try {
    const [incoming, outgoing] = await Promise.all([
      friendsRepository.getIncomingRequests(req.auth.userId),
      friendsRepository.getOutgoingRequests(req.auth.userId),
    ]);
    res.json({ incoming, outgoing });
  } catch (err) {
    next(err);
  }
});

router.post('/request', requireAuth, validate(userIdSchema), async (req, res, next) => {
  try {
    const { userId } = req.body;
    if (userId === req.auth.userId) {
      throw new HttpError(400, 'You cannot friend yourself', 'CANNOT_FRIEND_SELF');
    }

    const target = await usersRepository.getById(userId);
    if (!target) {
      throw new HttpError(404, 'User not found', 'USER_NOT_FOUND');
    }

    if (await friendsRepository.areFriends(req.auth.userId, userId)) {
      throw new HttpError(409, 'You are already friends', 'ALREADY_FRIENDS');
    }

    const active = await friendsRepository.findActiveBetween(req.auth.userId, userId);
    if (active) {
      if (active.status === 'pending' && active.senderId === req.auth.userId) {
        throw new HttpError(409, 'Friend request already sent', 'REQUEST_PENDING');
      }
      if (active.status === 'pending' && active.senderId === userId) {
        throw new HttpError(409, 'This user already sent you a friend request', 'REQUEST_PENDING');
      }
      if (active.status === 'accepted') {
        throw new HttpError(409, 'You are already friends', 'ALREADY_FRIENDS');
      }
    }

    const request = await friendsRepository.createFriendRequest(req.auth.userId, userId);
    notifyFriendsUpdated(req, [userId]);
    res.status(201).json({ request });
  } catch (err) {
    next(err);
  }
});

router.post('/accept', requireAuth, validate(requestIdSchema), async (req, res, next) => {
  try {
    const { requestId } = req.body;
    const request = await friendsRepository.getRequestById(requestId);
    if (!request || request.receiverId !== req.auth.userId) {
      throw new HttpError(404, 'Friend request not found', 'REQUEST_NOT_FOUND');
    }
    if (request.status !== 'pending') {
      throw new HttpError(409, 'Friend request is not pending', 'REQUEST_NOT_PENDING');
    }

    const result = await friendsRepository.acceptFriendRequest(requestId, req.auth.userId);
    if (!result.ok) {
      throw new HttpError(409, 'Friend request is not pending', 'REQUEST_NOT_PENDING');
    }

    notifyFriendsUpdated(req, [result.receiverId, result.senderId]);
    res.json({
      friendship: { userId: result.receiverId, friendId: result.senderId },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/reject', requireAuth, validate(requestIdSchema), async (req, res, next) => {
  try {
    const { requestId } = req.body;
    const request = await friendsRepository.getRequestById(requestId);
    if (!request || request.receiverId !== req.auth.userId) {
      throw new HttpError(404, 'Friend request not found', 'REQUEST_NOT_FOUND');
    }
    if (request.status !== 'pending') {
      throw new HttpError(409, 'Friend request is not pending', 'REQUEST_NOT_PENDING');
    }

    const rejected = await friendsRepository.rejectFriendRequest(requestId, req.auth.userId);
    if (!rejected) {
      throw new HttpError(409, 'Friend request is not pending', 'REQUEST_NOT_PENDING');
    }

    notifyFriendsUpdated(req, [req.auth.userId, request.senderId]);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.delete('/:friendId', requireAuth, validate(friendIdParamsSchema, 'params'), async (req, res, next) => {
  try {
    const friendId = Number(req.params.friendId);
    if (friendId === req.auth.userId) {
      throw new HttpError(400, 'You cannot unfriend yourself', 'CANNOT_FRIEND_SELF');
    }

    const removed = await friendsRepository.removeFriend(req.auth.userId, friendId);
    if (!removed) {
      throw new HttpError(404, 'Friendship not found', 'FRIENDSHIP_NOT_FOUND');
    }
    notifyFriendsUpdated(req, [req.auth.userId, friendId]);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
