-- Schema fixes for databases created BEFORE the AI gateway change.
--
-- Only needed if you already ran this project and have an existing
-- ai_interview_db. A database created from scratch is built correctly
-- by Hibernate and needs none of this.
--
-- The project has no migration tool yet, and `ddl-auto: update` only
-- ever ADDS columns - it never drops or alters the stale ones. So old
-- columns hang around and block the current code.
--
-- Run with, in PowerShell ("<" redirection is not supported there):
--   Get-Content scripts\001-align-existing-schema.sql -Raw |
--       docker exec -i interview_postgres psql -U postgres -d ai_interview_db
--
-- or in bash / Git Bash:
--   docker exec -i interview_postgres psql -U postgres -d ai_interview_db \
--       < scripts/001-align-existing-schema.sql
--
-- Safe to run more than once. It deletes no data.

BEGIN;

-- ------------------------------------------------------------------
-- 1. users.role / users.is_active
--
-- Databases created before the auth rework have no `role` or
-- `is_active` column at all. Hibernate `ddl-auto: update` adds them
-- on the next backend start, but this script must not depend on that
-- having happened yet - so create them here if missing.
--
-- The old role constraint only allowed CANDIDATE and ADMIN, so
-- registering a recruiter failed. RECRUITER is now a real role.
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
-- null now. It is NOT NULL in old databases, which made every analysis
-- insert fail - and that failure used to roll back the whole resume
-- upload with "Transaction silently rolled back".
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

COMMIT;


-- ------------------------------------------------------------------
-- Optional cleanup, once you are sure nothing needs the old data.
-- These tables belong to fields the AI service no longer returns.
-- Uncomment deliberately - this DOES delete data.
-- ------------------------------------------------------------------

-- DROP TABLE IF EXISTS resume_analysis_strengths;
-- DROP TABLE IF EXISTS resume_analysis_weaknesses;
-- DROP TABLE IF EXISTS resume_analysis_missing_skills;
-- DROP TABLE IF EXISTS resume_analysis_recommendations;
-- ALTER TABLE resume_analysis DROP COLUMN IF EXISTS score;
