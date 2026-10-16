-- Practice mode and exam mode.
--
-- A candidate now chooses how to sit an interview. Practice has no
-- timer and shows the model answer after every question, with the
-- option to revise; exam is timed and shows nothing until the end.
--
-- The two kinds of score are not comparable - a practice answer can
-- be rewritten after reading the model answer - so the mode is stored
-- and progress compares exam scores only.
--
-- Nullable: interviews from before this column existed were sat in
-- neither mode and stay NULL rather than being guessed at.

ALTER TABLE interview_sessions
    ADD COLUMN mode character varying(16);

ALTER TABLE interview_sessions
    ADD CONSTRAINT interview_sessions_mode_check
        CHECK (mode IS NULL OR mode IN ('practice', 'exam'));
