const fs = require('node:fs');
const path = require('node:path');
const { getDbConfig } = require('@micshare/shared/src/db-config');
const { createServerConnection } = require('./connection');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');
const TABLE_PREFIX = process.env.DB_TABLE_PREFIX || 'micshare_';
const MIGRATIONS_TABLE = `${TABLE_PREFIX}schema_migrations`;

function loadMigrations() {
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.js'))
    .sort();
  return files.map((file) => {
    const migration = require(path.join(MIGRATIONS_DIR, file));
    if (!Number.isInteger(migration.version) || migration.version < 1) {
      throw new Error(`Migration ${file} must export an integer version >= 1`);
    }
    if (typeof migration.up !== 'function') {
      throw new Error(`Migration ${file} must export an up(connection) function`);
    }
    return { file, ...migration };
  });
}

function quoteIdentifier(identifier) {
  return `\`${String(identifier).replace(/`/g, '``')}\``;
}

async function applyMigration(connection, migration) {
  const label = `v${migration.version} (${migration.file})`;
  try {
    await connection.beginTransaction();
    await migration.up(connection);
    await connection.query(
      `INSERT INTO ${quoteIdentifier(MIGRATIONS_TABLE)} (version) VALUES (?)`,
      [migration.version]
    );
    await connection.commit();
    console.log(`[migrate] applied ${label}`);
  } catch (err) {
    await connection.rollback();
    throw new Error(`Migration ${label} failed and was rolled back: ${err.message}`);
  }
}

async function runMigrations() {
  const config = getDbConfig();
  const connection = await createServerConnection();
  try {
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS ${quoteIdentifier(config.DB_NAME)} ` +
        `CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    await connection.changeUser({ database: config.DB_NAME });

    await connection.query(`
      CREATE TABLE IF NOT EXISTS ${quoteIdentifier(MIGRATIONS_TABLE)} (
        version INT UNSIGNED NOT NULL,
        applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (version)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    const [rows] = await connection.query(
      `SELECT version FROM ${quoteIdentifier(MIGRATIONS_TABLE)}`
    );
    const applied = new Set(rows.map((r) => Number(r.version)));
    const migrations = loadMigrations();

    for (const migration of migrations) {
      if (applied.has(migration.version)) continue;
      await applyMigration(connection, migration);
    }

    console.log(`[migrate] database '${config.DB_NAME}' is up to date (${migrations.length} migration(s) defined).`);
  } finally {
    await connection.end();
  }
}

async function showStatus() {
  const config = getDbConfig();
  const connection = await createServerConnection();
  try {
    await connection.changeUser({ database: config.DB_NAME });
    const [rows] = await connection.query(
      `SELECT version, applied_at FROM ${quoteIdentifier(MIGRATIONS_TABLE)} ORDER BY version`
    );
    const applied = new Map(rows.map((r) => [Number(r.version), r.applied_at]));
    const migrations = loadMigrations();

    console.log('version  applied_at  file');
    for (const migration of migrations) {
      const when = applied.get(migration.version);
      console.log(`${String(migration.version).padEnd(8)} ${when ? new Date(when).toISOString() : '-'.padEnd(24)} ${migration.file}`);
    }
  } finally {
    await connection.end();
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--status')) {
    await showStatus();
    return;
  }
  await runMigrations();
}

main().catch((err) => {
  console.error(`[migrate] error: ${err.message}`);
  process.exit(1);
});
