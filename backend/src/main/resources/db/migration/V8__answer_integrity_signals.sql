-- What happened in the browser while each exam answer was written.
--
-- A job interview's result now reaches a recruiter, and nothing showed
-- whether the candidate left the page to look the answer up or pasted
-- it in. These are recorded per answer, in exam mode only, and shown to
-- the recruiter next to the score. They are signals for a person to
-- weigh, not verdicts: nothing is blocked, and a candidate is told in
-- advance that they are recorded.
--
-- No camera, no screen capture and no blocking of paste: a browser
-- cannot see a second device anyway, and blocking paste breaks
-- assistive tools.
--
-- NULL means not recorded (practice mode, or an interview from before
-- this migration), which is different from 0 (recorded, none seen).

ALTER TABLE interview_session_turns
    ADD COLUMN left_page_count integer,
    ADD COLUMN away_seconds    integer,
    ADD COLUMN paste_count     integer,
    ADD COLUMN pasted_chars    integer;
