CREATE TABLE coach_users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin','coach') NOT NULL DEFAULT 'coach',
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE coach_players (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  external_id VARCHAR(80) NULL UNIQUE,
  birth_year SMALLINT UNSIGNED NOT NULL DEFAULT 2020,
  first_name VARCHAR(120) NOT NULL,
  last_name VARCHAR(120) NOT NULL,
  parent_phone VARCHAR(80) NULL,
  parent_email VARCHAR(190) NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_players_year_active (birth_year, active),
  INDEX idx_players_name (last_name, first_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE coach_events (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  event_type ENUM('training','league','friendly','tournament') NOT NULL,
  team ENUM('ALL','BLU','GIALLA') NOT NULL DEFAULT 'ALL',
  event_date DATE NOT NULL,
  start_time TIME NULL,
  meeting_time TIME NULL,
  opponent VARCHAR(190) NULL,
  home_away ENUM('home','away','neutral') NULL,
  venue VARCHAR(190) NULL,
  address VARCHAR(255) NULL,
  notes TEXT NULL,
  created_by INT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_events_user FOREIGN KEY (created_by) REFERENCES coach_users(id) ON DELETE SET NULL,
  INDEX idx_events_date (event_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE coach_attendance (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  event_id INT UNSIGNED NOT NULL,
  player_id INT UNSIGNED NOT NULL,
  status ENUM('present','absent','late','unavailable') NOT NULL,
  note VARCHAR(255) NULL,
  updated_by INT UNSIGNED NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_attendance_event_player (event_id, player_id),
  CONSTRAINT fk_attendance_event FOREIGN KEY (event_id) REFERENCES coach_events(id) ON DELETE CASCADE,
  CONSTRAINT fk_attendance_player FOREIGN KEY (player_id) REFERENCES coach_players(id) ON DELETE CASCADE,
  CONSTRAINT fk_attendance_user FOREIGN KEY (updated_by) REFERENCES coach_users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE coach_callups (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  event_id INT UNSIGNED NOT NULL,
  player_id INT UNSIGNED NOT NULL,
  team ENUM('BLU','GIALLA') NOT NULL,
  updated_by INT UNSIGNED NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_callup_event_player (event_id, player_id),
  CONSTRAINT fk_callup_event FOREIGN KEY (event_id) REFERENCES coach_events(id) ON DELETE CASCADE,
  CONSTRAINT fk_callup_player FOREIGN KEY (player_id) REFERENCES coach_players(id) ON DELETE CASCADE,
  CONSTRAINT fk_callup_user FOREIGN KEY (updated_by) REFERENCES coach_users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
