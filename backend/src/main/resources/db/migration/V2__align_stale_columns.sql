-- Brings databases created before the auth rework and the AI gateway
-- change into line with what the entities expect.
--
-- This is scripts/001-align-existing-schema.sql, moved into Flyway so
-- nobody has to remember to run it by hand. That script is now
-- superseded and kept only for reference.
--
-- Every statement is idempotent, because this migration runs against
-- two different starting points:
--
--   * a fresh database, where V1 has just created everything
--     correctly and each statement below is a no-op;
--   * an existing database stamped at baseline version 1, whose
--     schema Hibernate's ddl-auto=update left half-migrated.
--
-- It deletes no data.


-- ------------------------------------------------------------------
-- 1. users.role / users.is_active
--
-- Databases created before the auth rework have neither column.
-- The old check constraint allowed only CANDIDATE and ADMIN, so
-- registering a recruiter failed; RECRUITER is a real role now.
-- ------------------------------------------------------------------

ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(32) NOT NULL DEFAULT 'CANDIDATE';

ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users ADD CONSTRAINT users_role_check
    CHECK (role IN ('CANDIDATE', 'RECRUITER', 'ADMIN'));


-- ------------------------------------------------------------------
-- 2. resume_analysis.score
--
-- The AI service stopped returning a score, so the column is always
-- null now. It is NOT NULL in old databases, which made every
-- analysis insert fail - and that failure used to roll back the whole
-- resume upload with "Transaction silently rolled back".
--
-- Left in place rather than dropped so existing rows keep their value.
-- ------------------------------------------------------------------

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'resume_analysis' AND column_name = 'score'
    ) THEN
        ALTER TABLE resume_analysis ALTER COLUMN score DROP NOT NULL;
    END IF;
END $$;
