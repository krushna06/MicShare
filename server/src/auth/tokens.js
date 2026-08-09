const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { getServerConfig } = require('../config');
const { getPool } = require('../db/connection');
const { table } = require('@micshare/shared/src/tables');

const REVOKED = () => table('revoked_tokens');

function tokenTtlSeconds(config) {
  return config.AUTH_TOKEN_TTL_SECONDS ?? 86400;
}

function issueAccessToken(userId) {
  const config = getServerConfig();
  const jti = uuidv4();
  const token = jwt.sign(
    { sub: String(userId) },
    config.AUTH_SECRET,
    { expiresIn: tokenTtlSeconds(config), jwtid: jti }
  );
  return { token, jti };
}

function verifyAccessToken(token) {
  const config = getServerConfig();
  const payload = jwt.verify(token, config.AUTH_SECRET);
  const sub = Number(payload.sub);
  if (!Number.isInteger(sub) || sub <= 0) {
    throw new Error('Invalid token subject');
  }
  if (typeof payload.jti !== 'string' || payload.jti.length === 0) {
    throw new Error('Invalid token id');
  }
  return {
    userId: sub,
    jti: payload.jti,
    exp: payload.exp,
  };
}

async function revokeToken(jti, userId, expiresAt) {
  const expiresAtDate = expiresAt ? new Date(expiresAt * 1000) : new Date();
  const connection = await getPool().getConnection();
  try {
    await connection.execute(
      `DELETE FROM ${REVOKED()} WHERE expires_at < CURRENT_TIMESTAMP`
    );
    await connection.execute(
      `INSERT INTO ${REVOKED()} (user_id, token_id, expires_at)
       VALUES (?, ?, ?)`,
      [userId, jti, expiresAtDate]
    );
  } finally {
    connection.release();
  }
}

async function isTokenRevoked(jti) {
  const [rows] = await getPool().execute(
    `SELECT id FROM ${REVOKED()} WHERE token_id = ? LIMIT 1`,
    [jti]
  );
  return rows.length > 0;
}

module.exports = {
  issueAccessToken,
  verifyAccessToken,
  revokeToken,
  isTokenRevoked,
};
