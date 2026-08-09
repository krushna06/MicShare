const mysql = require('mysql2/promise');
const { getDbConfig } = require('@micshare/shared/src/db-config');

let pool = null;

function createPool() {
  const config = getDbConfig();
  return mysql.createPool({
    host: config.DB_HOST,
    port: config.DB_PORT,
    user: config.DB_USER,
    password: config.DB_PASSWORD,
    database: config.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    namedPlaceholders: true,
    charset: 'utf8mb4',
    timezone: 'Z',
  });
}

function getPool() {
  if (!pool) pool = createPool();
  return pool;
}

async function checkHealth() {
  const connection = await getPool().getConnection();
  try {
    await connection.ping();
  } finally {
    connection.release();
  }
}

module.exports = { getPool, checkHealth };
