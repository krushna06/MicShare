const { HttpError } = require('../http-error');
const { verifyAccessToken, isTokenRevoked } = require('../auth/tokens');

async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) {
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

    const revoked = await isTokenRevoked(payload.jti);
    if (revoked) {
      throw new HttpError(401, 'Session has been logged out', 'TOKEN_REVOKED');
    }

    req.auth = { userId: payload.userId, jti: payload.jti, exp: payload.exp };
    return next();
  } catch (err) {
    return next(err);
  }
}

module.exports = { requireAuth };
