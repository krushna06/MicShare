const { getPool } = require('../db/connection');
const { table } = require('@micshare/shared/src/tables');

const USERS = () => table('users');

const USER_PUBLIC_COLUMNS = `
  id,
  username,
  display_name AS displayName,
  created_at AS createdAt,
  updated_at AS updatedAt
`;

function mapUserRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    displayName: row.displayName,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function createUser({ username, displayName, passwordHash }) {
  const [result] = await getPool().execute(
    `INSERT INTO ${USERS()} (username, display_name, password_hash)
     VALUES (?, ?, ?)`,
    [username, displayName, passwordHash]
  );
  return getById(result.insertId);
}

async function getById(id) {
  const [rows] = await getPool().execute(
    `SELECT ${USER_PUBLIC_COLUMNS} FROM ${USERS()} WHERE id = ? LIMIT 1`,
    [id]
  );
  return mapUserRow(rows[0]);
}

async function getByUsername(username) {
  const [rows] = await getPool().execute(
    `SELECT ${USER_PUBLIC_COLUMNS} FROM ${USERS()} WHERE username = ? LIMIT 1`,
    [username]
  );
  return mapUserRow(rows[0]);
}

async function getAuthRecordByUsername(username) {
  const [rows] = await getPool().execute(
    `SELECT ${USER_PUBLIC_COLUMNS}, password_hash AS passwordHash
     FROM ${USERS()} WHERE username = ? LIMIT 1`,
    [username]
  );
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    displayName: row.displayName,
    passwordHash: row.passwordHash,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function updateDisplayName(userId, displayName) {
  await getPool().execute(`UPDATE ${USERS()} SET display_name = ? WHERE id = ?`, [
    displayName,
    userId,
  ]);
  return getById(userId);
}

module.exports = {
  createUser,
  getById,
  getByUsername,
  getAuthRecordByUsername,
  updateDisplayName,
};
