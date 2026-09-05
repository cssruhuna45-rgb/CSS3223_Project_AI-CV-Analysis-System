-- Prints the whole database: every table, its columns, and how many
-- rows each holds.
--
-- Run with, in PowerShell:
--   Get-Content scripts\show-schema.sql -Raw |
--       docker exec -i interview_postgres psql -U postgres -d ai_interview_db
--
-- or in bash / Git Bash:
--   docker exec -i interview_postgres psql -U postgres -d ai_interview_db \
--       < scripts/show-schema.sql
--
-- Read-only. Safe to run any time.

\echo
\echo ================================================================
\echo  TABLES AND ROW COUNTS
\echo ================================================================

-- reltuples is only an estimate and reads -1 until ANALYZE has run, so
-- count for real. query_to_xml runs a COUNT per table without needing
-- one UNION branch hand-written per table.
SELECT
    c.relname AS table_name,
    (
        xpath(
            '/row/cnt/text()',
            query_to_xml(
                format('SELECT count(*) AS cnt FROM %I.%I', n.nspname, c.relname),
                false, true, ''
            )
        )
    )[1]::text::bigint AS rows
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
ORDER BY c.relname;

\echo
\echo ================================================================
\echo  COLUMNS
\echo ================================================================

SELECT
    c.relname                                          AS table_name,
    a.attname                                          AS column_name,
    format_type(a.atttypid, a.atttypmod)               AS type,
    CASE WHEN a.attnotnull THEN 'NOT NULL' ELSE '' END AS nullable
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
JOIN pg_attribute a ON a.attrelid = c.oid
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND a.attnum > 0
  AND NOT a.attisdropped
ORDER BY c.relname, a.attnum;

\echo
\echo ================================================================
\echo  FOREIGN KEYS - how the tables join up
\echo ================================================================

SELECT
    src.relname  AS from_table,
    con.conname  AS constraint_name,
    tgt.relname  AS to_table
FROM pg_constraint con
JOIN pg_class src ON src.oid = con.conrelid
JOIN pg_class tgt ON tgt.oid = con.confrelid
JOIN pg_namespace n ON n.oid = con.connamespace
WHERE con.contype = 'f'
  AND n.nspname = 'public'
ORDER BY src.relname, tgt.relname;
