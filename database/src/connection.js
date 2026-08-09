const mysql = require('mysql2/promise');
const { getDbConfig } = require('@micshare/shared/src/db-config');


async function createServerConnection() {
  const config = getDbConfig();
  const connection = await mysql.createConnection({
    host: config.DB_HOST,
    port: config.DB_PORT,
    user: config.DB_USER,
    password: config.DB_PASSWORD,
  });
  return connection;
}

module.exports = { createServerConnection };
