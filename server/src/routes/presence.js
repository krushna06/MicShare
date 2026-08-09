const express = require('express');
const { requireAuth } = require('../middleware/auth');
const friendsRepository = require('../repositories/friends');
const presence = require('../socket/presence');

const router = express.Router();

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    res.json({
      presence: presence.getStatus(req.auth.userId),
    });
  } catch (err) {
    next(err);
  }
});

router.get('/friends', requireAuth, async (req, res, next) => {
  try {
    const friends = await friendsRepository.getFriends(req.auth.userId);
    const friendsWithPresence = friends.map((friend) => ({
      ...friend,
      online: presence.isOnline(friend.id),
      lastSeenAt: presence.getLastSeenAt(friend.id),
    }));
    res.json({ friends: friendsWithPresence });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
