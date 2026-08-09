const express = require('express');
const { HttpError } = require('../http-error');
const { validate } = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const { authLimiter, registerLimiter } = require('../middleware/rate-limit');
const usersRepository = require('../repositories/users');
const { hashPassword, verifyPassword } = require('../auth/password');
const { issueAccessToken, revokeToken } = require('../auth/tokens');
const { registerSchema, loginSchema } = require('../auth/schemas');
const logger = require('../logger');

const router = express.Router();

function authResponse(user) {
  const { token, jti } = issueAccessToken(user.id);
  return { user, token, jti };
}

router.post('/register', registerLimiter, validate(registerSchema), async (req, res, next) => {
  try {
    const { username, password, displayName } = req.body;

    const existing = await usersRepository.getByUsername(username);
    if (existing) {
      throw new HttpError(409, 'That username is already taken', 'USERNAME_TAKEN');
    }

    const passwordHash = await hashPassword(password);
    const user = await usersRepository.createUser({
      username,
      displayName: displayName || username,
      passwordHash,
    });

    logger.info(`User registered: ${user.username} (id=${user.id})`);
    res.status(201).json(authResponse(user));
  } catch (err) {
    next(err);
  }
});

router.post('/login', authLimiter, validate(loginSchema), async (req, res, next) => {
  try {
    const { username, password } = req.body;

    const record = await usersRepository.getAuthRecordByUsername(username);
    if (!record) {
      throw new HttpError(401, 'Invalid username or password', 'INVALID_CREDENTIALS');
    }

    const valid = await verifyPassword(password, record.passwordHash);
    if (!valid) {
      throw new HttpError(401, 'Invalid username or password', 'INVALID_CREDENTIALS');
    }

    const { id, username: name, displayName, createdAt, updatedAt } = record;
    const user = { id, username: name, displayName, createdAt, updatedAt };

    logger.info(`User logged in: ${user.username} (id=${user.id})`);
    res.json(authResponse(user));
  } catch (err) {
    next(err);
  }
});

router.post('/logout', requireAuth, async (req, res, next) => {
  try {
    await revokeToken(req.auth.jti, req.auth.userId, req.auth.exp);
    logger.info(`User logged out (id=${req.auth.userId})`);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
