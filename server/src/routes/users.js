const express = require('express');
const { z } = require('zod');
const { requireAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const usersRepository = require('../repositories/users');
const friendsRepository = require('../repositories/friends');
const presence = require('../socket/presence');
const { HttpError } = require('../http-error');

const router = express.Router();

const searchSchema = z.object({
  q: z.string().trim().min(1).max(64),
});

const updateMeSchema = z.object({
  displayName: z.string().trim().min(1, 'Display name cannot be empty').max(64, 'Display name must be at most 64 characters'),
});

router.get('/search', requireAuth, validate(searchSchema, 'query'), async (req, res, next) => {
  try {
    const users = await friendsRepository.searchUsers(req.query.q, req.auth.userId);
    res.json({ users });
  } catch (err) {
    next(err);
  }
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await usersRepository.getById(req.auth.userId);
    if (!user) {
      throw new HttpError(404, 'User not found', 'USER_NOT_FOUND');
    }
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

router.patch('/me', requireAuth, validate(updateMeSchema), async (req, res, next) => {
  try {
    const user = await usersRepository.updateDisplayName(req.auth.userId, req.body.displayName);
    if (!user) {
      throw new HttpError(404, 'User not found', 'USER_NOT_FOUND');
    }
    presence.updateUserMeta(req.auth.userId, { displayName: user.displayName });
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
