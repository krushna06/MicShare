const express = require('express');
const healthRouter = require('./health');
const authRouter = require('./auth');
const usersRouter = require('./users');
const friendsRouter = require('./friends');
const presenceRouter = require('./presence');

const router = express.Router();

router.use('/health', healthRouter);
router.use('/auth', authRouter);
router.use('/users', usersRouter);
router.use('/friends', friendsRouter);
router.use('/presence', presenceRouter);

module.exports = router;
