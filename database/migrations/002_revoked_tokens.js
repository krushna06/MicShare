const P = 'micshare_';

exports.version = 2;
exports.name = 'revoked_tokens';

exports.up = async function up(connection) {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS ${P}revoked_tokens (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_id BIGINT UNSIGNED NOT NULL,
      token_id VARCHAR(64) NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      revoked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_revoked_tokens_token_id (token_id),
      KEY idx_revoked_tokens_user (user_id),
      CONSTRAINT fk_revoked_tokens_user FOREIGN KEY (user_id)
        REFERENCES ${P}users (id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
};
