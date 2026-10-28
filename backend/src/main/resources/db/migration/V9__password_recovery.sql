ALTER TABLE users ADD COLUMN password_reset_hash VARCHAR(64);
ALTER TABLE users ADD COLUMN password_reset_expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN password_reset_requested_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN password_changed_at TIMESTAMP WITH TIME ZONE;
CREATE UNIQUE INDEX users_password_reset_hash_idx ON users(password_reset_hash);
