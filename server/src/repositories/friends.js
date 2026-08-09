const { getPool } = require('../db/connection');
const { table } = require('@micshare/shared/src/tables');

const FRIEND_REQUESTS = () => table('friend_requests');
const FRIENDSHIPS = () => table('friendships');
const USERS = () => table('users');

function mapUser(row) {
  return {
    id: row.id,
    username: row.username,
    displayName: row.displayName,
    createdAt: row.createdAt,
  };
}

async function searchUsers(query, currentUserId, limit = 20) {
  const pattern = `%${query}%`;
  const [rows] = await getPool().execute(
    `SELECT id, username, display_name AS displayName, created_at AS createdAt
     FROM ${USERS()}
     WHERE id <> ?
       AND (username LIKE ? OR display_name LIKE ?)
     ORDER BY username
     LIMIT ?`,
    [currentUserId, pattern, pattern, limit]
  );
  return rows.map(mapUser);
}

async function areFriends(userId, friendId) {
  const [rows] = await getPool().execute(
    `SELECT id FROM ${FRIENDSHIPS()}
     WHERE user_id = ? AND friend_id = ? LIMIT 1`,
    [userId, friendId]
  );
  return rows.length > 0;
}

async function findPendingBetween(userA, userB) {
  const [rows] = await getPool().execute(
    `SELECT id, sender_id AS senderId, receiver_id AS receiverId, status
     FROM ${FRIEND_REQUESTS()}
     WHERE status = 'pending' AND (
       (sender_id = ? AND receiver_id = ?) OR
       (sender_id = ? AND receiver_id = ?)
     )
     LIMIT 1`,
    [userA, userB, userB, userA]
  );
  return rows[0] || null;
}

async function findActiveBetween(userA, userB) {
  const [rows] = await getPool().execute(
    `SELECT id, sender_id AS senderId, receiver_id AS receiverId, status
     FROM ${FRIEND_REQUESTS()}
     WHERE status IN ('pending','accepted') AND (
       (sender_id = ? AND receiver_id = ?) OR
       (sender_id = ? AND receiver_id = ?)
     )
     LIMIT 1`,
    [userA, userB, userB, userA]
  );
  return rows[0] || null;
}

async function getRequestById(id) {
  const [rows] = await getPool().execute(
    `SELECT id, sender_id AS senderId, receiver_id AS receiverId, status, created_at AS createdAt, responded_at AS respondedAt
     FROM ${FRIEND_REQUESTS()} WHERE id = ? LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

async function createFriendRequest(senderId, receiverId) {
  const [result] = await getPool().execute(
    `INSERT INTO ${FRIEND_REQUESTS()} (sender_id, receiver_id, status)
     VALUES (?, ?, 'pending')`,
    [senderId, receiverId]
  );
  return getRequestById(result.insertId);
}

async function acceptFriendRequest(requestId, receiverId) {
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();

    const [rows] = await connection.execute(
      `SELECT id, sender_id AS senderId, receiver_id AS receiverId
       FROM ${FRIEND_REQUESTS()}
       WHERE id = ? AND receiver_id = ? AND status = 'pending'
       FOR UPDATE`,
      [requestId, receiverId]
    );
    if (rows.length === 0) {
      await connection.rollback();
      return { ok: false };
    }
    const { senderId } = rows[0];

    await connection.execute(
      `UPDATE ${FRIEND_REQUESTS()}
       SET status = 'accepted', responded_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [requestId]
    );

    await connection.execute(
      `INSERT INTO ${FRIENDSHIPS()} (user_id, friend_id) VALUES (?, ?), (?, ?)
       ON DUPLICATE KEY UPDATE friend_id = VALUES(friend_id)`,
      [receiverId, senderId, senderId, receiverId]
    );

    await connection.commit();
    return { ok: true, senderId, receiverId };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

async function rejectFriendRequest(requestId, receiverId) {
  const [result] = await getPool().execute(
    `UPDATE ${FRIEND_REQUESTS()}
     SET status = 'rejected', responded_at = CURRENT_TIMESTAMP
     WHERE id = ? AND receiver_id = ? AND status = 'pending'`,
    [requestId, receiverId]
  );
  return result.affectedRows > 0;
}

async function getFriends(userId) {
  const [rows] = await getPool().execute(
    `SELECT u.id, u.username, u.display_name AS displayName, u.created_at AS createdAt
     FROM ${FRIENDSHIPS()} f
     JOIN ${USERS()} u ON u.id = f.friend_id
     WHERE f.user_id = ?
     ORDER BY u.display_name, u.username`,
    [userId]
  );
  return rows.map(mapUser);
}

async function removeFriend(userId, friendId) {
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();

    const [deleteResult] = await connection.execute(
      `DELETE FROM ${FRIENDSHIPS()}
       WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)`,
      [userId, friendId, friendId, userId]
    );

    await connection.execute(
      `DELETE FROM ${FRIEND_REQUESTS()}
       WHERE status = 'accepted' AND (
         (sender_id = ? AND receiver_id = ?) OR
         (sender_id = ? AND receiver_id = ?)
       )`,
      [userId, friendId, friendId, userId]
    );

    await connection.commit();
    return deleteResult.affectedRows > 0;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

async function getIncomingRequests(userId) {
  const [rows] = await getPool().execute(
    `SELECT fr.id AS requestId, fr.created_at AS createdAt,
            u.id, u.username, u.display_name AS displayName
     FROM ${FRIEND_REQUESTS()} fr
     JOIN ${USERS()} u ON u.id = fr.sender_id
     WHERE fr.receiver_id = ? AND fr.status = 'pending'
     ORDER BY fr.created_at DESC`,
    [userId]
  );
  return rows.map((row) => ({
    requestId: row.requestId,
    createdAt: row.createdAt,
    sender: mapUser(row),
  }));
}

async function getOutgoingRequests(userId) {
  const [rows] = await getPool().execute(
    `SELECT fr.id AS requestId, fr.created_at AS createdAt,
            u.id, u.username, u.display_name AS displayName
     FROM ${FRIEND_REQUESTS()} fr
     JOIN ${USERS()} u ON u.id = fr.receiver_id
     WHERE fr.sender_id = ? AND fr.status = 'pending'
     ORDER BY fr.created_at DESC`,
    [userId]
  );
  return rows.map((row) => ({
    requestId: row.requestId,
    createdAt: row.createdAt,
    receiver: mapUser(row),
  }));
}

module.exports = {
  searchUsers,
  areFriends,
  findPendingBetween,
  findActiveBetween,
  getRequestById,
  createFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  getFriends,
  removeFriend,
  getIncomingRequests,
  getOutgoingRequests,
};
