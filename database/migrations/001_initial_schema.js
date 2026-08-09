const P = 'micshare_';

exports.version = 1;
exports.name = 'initial_schema';

exports.up = async function up(connection) {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS ${P}users (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      username VARCHAR(64) NOT NULL,
      display_name VARCHAR(128) NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_users_username (username)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS ${P}friend_requests (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      sender_id BIGINT UNSIGNED NOT NULL,
      receiver_id BIGINT UNSIGNED NOT NULL,
      status ENUM('pending','accepted','rejected') NOT NULL DEFAULT 'pending',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      responded_at TIMESTAMP NULL DEFAULT NULL,
      PRIMARY KEY (id),
      UNIQUE KEY uq_friend_requests_pair (sender_id, receiver_id),
      KEY idx_friend_requests_receiver (receiver_id, status),
      CONSTRAINT fk_friend_requests_sender FOREIGN KEY (sender_id)
        REFERENCES ${P}users (id) ON DELETE CASCADE,
      CONSTRAINT fk_friend_requests_receiver FOREIGN KEY (receiver_id)
        REFERENCES ${P}users (id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS ${P}friendships (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_id BIGINT UNSIGNED NOT NULL,
      friend_id BIGINT UNSIGNED NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_friendships_pair (user_id, friend_id),
      KEY idx_friendships_friend (friend_id),
      CONSTRAINT fk_friendships_user FOREIGN KEY (user_id)
        REFERENCES ${P}users (id) ON DELETE CASCADE,
      CONSTRAINT fk_friendships_friend FOREIGN KEY (friend_id)
        REFERENCES ${P}users (id) ON DELETE CASCADE,
      CONSTRAINT chk_friendships_not_self CHECK (user_id <> friend_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS ${P}devices (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_id BIGINT UNSIGNED NOT NULL,
      kind ENUM('input','output','virtual_cable') NOT NULL,
      name VARCHAR(255) NOT NULL,
      identifier VARCHAR(512) NOT NULL,
      is_default BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_devices_user_kind_identifier (user_id, kind, identifier(191)),
      KEY idx_devices_user (user_id),
      CONSTRAINT fk_devices_user FOREIGN KEY (user_id)
        REFERENCES ${P}users (id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS ${P}sessions (
      id CHAR(36) NOT NULL,
      initiator_id BIGINT UNSIGNED NOT NULL,
      receiver_id BIGINT UNSIGNED NOT NULL,
      status ENUM('pending','active','ended','rejected','canceled') NOT NULL DEFAULT 'pending',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      started_at TIMESTAMP NULL DEFAULT NULL,
      ended_at TIMESTAMP NULL DEFAULT NULL,
      PRIMARY KEY (id),
      KEY idx_sessions_initiator (initiator_id, status),
      KEY idx_sessions_receiver (receiver_id, status),
      CONSTRAINT fk_sessions_initiator FOREIGN KEY (initiator_id)
        REFERENCES ${P}users (id) ON DELETE CASCADE,
      CONSTRAINT fk_sessions_receiver FOREIGN KEY (receiver_id)
        REFERENCES ${P}users (id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS ${P}user_settings (
      user_id BIGINT UNSIGNED NOT NULL,
      input_device_id BIGINT UNSIGNED NULL,
      output_device_id BIGINT UNSIGNED NULL,
      virtual_cable_device_id BIGINT UNSIGNED NULL,
      audio_quality ENUM('low','standard','high') NOT NULL DEFAULT 'standard',
      input_volume INT NOT NULL DEFAULT 100,
      output_volume INT NOT NULL DEFAULT 100,
      push_to_talk BOOLEAN NOT NULL DEFAULT FALSE,
      push_to_talk_key VARCHAR(64) NULL,
      auto_accept_sessions BOOLEAN NOT NULL DEFAULT FALSE,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id),
      KEY idx_user_settings_input (input_device_id),
      KEY idx_user_settings_output (output_device_id),
      KEY idx_user_settings_virtual_cable (virtual_cable_device_id),
      CONSTRAINT fk_user_settings_user FOREIGN KEY (user_id)
        REFERENCES ${P}users (id) ON DELETE CASCADE,
      CONSTRAINT fk_user_settings_input_device FOREIGN KEY (input_device_id)
        REFERENCES ${P}devices (id) ON DELETE SET NULL,
      CONSTRAINT fk_user_settings_output_device FOREIGN KEY (output_device_id)
        REFERENCES ${P}devices (id) ON DELETE SET NULL,
      CONSTRAINT fk_user_settings_virtual_cable FOREIGN KEY (virtual_cable_device_id)
        REFERENCES ${P}devices (id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
};
