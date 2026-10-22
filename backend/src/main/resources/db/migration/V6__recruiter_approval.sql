-- Recruiter accounts need an administrator's approval.
--
-- Until now anyone could register with role "recruiter" and the
-- recruiter dashboard would show them every candidate's name, email
-- and scores. Choosing a role on a public form is not proof of being a
-- recruiter, so a recruiter account now starts PENDING and gets
-- recruiter access only once an administrator approves it.
--
-- Candidates and administrators are never reviewed, so the column
-- defaults to APPROVED for them.

ALTER TABLE users
    ADD COLUMN approval_status character varying(16) DEFAULT 'APPROVED' NOT NULL;

ALTER TABLE users
    ADD CONSTRAINT users_approval_status_check
        CHECK (approval_status IN ('PENDING', 'APPROVED', 'REJECTED'));

-- Every recruiter that exists today registered themselves, which is
-- exactly the unchecked path this migration closes. They go back to
-- PENDING rather than keeping access nobody ever granted them; an
-- administrator approves the genuine ones from the admin page.
UPDATE users
SET approval_status = 'PENDING'
WHERE role = 'RECRUITER';
