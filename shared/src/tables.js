const { loadEnv } = require('./env');

function getTablePrefix() {
  loadEnv();
  return process.env.DB_TABLE_PREFIX || 'micshare_';
}

function table(name) {
  return `${getTablePrefix()}${name}`;
}

module.exports = { getTablePrefix, table };
