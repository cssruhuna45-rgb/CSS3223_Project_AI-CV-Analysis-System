-- Public job listings, and archiving.
--
-- Until now a job could only be reached through its invite code: the
-- recruiter shared a link and nobody else could find the job. A
-- recruiter can now publish a job, which lists it under Public Jobs
-- for every signed-in candidate to read and apply for.
--
-- Publication is kept apart from is_open on purpose. is_open still
-- decides whether a job takes candidates at all; publication_status
-- only decides whether it is listed. A published job that is closed
-- stays listed, marked closed, and takes no applications.
--
-- is_archived retires a job without deleting anything. An archived job
-- is never listed, its invite code stops working and no interview for
-- it can be started or resumed - but its applications, CV snapshots,
-- interviews, results and decisions are all kept, and unarchiving
-- brings it back as it was.
--
-- Existing data: every job already here becomes DRAFT and not
-- archived. Nothing is published that a recruiter did not publish, and
-- every invite link that works today keeps working.

ALTER TABLE job_postings
    ADD COLUMN publication_status character varying(16) DEFAULT 'DRAFT' NOT NULL,
    ADD COLUMN published_at       timestamp(6) without time zone,
    ADD COLUMN is_archived        boolean DEFAULT false NOT NULL;

ALTER TABLE job_postings
    ADD CONSTRAINT ck_job_postings_publication_status
        CHECK (publication_status IN ('DRAFT', 'PUBLISHED'));

-- The Public Jobs list reads only published, unarchived jobs, newest
-- first.
CREATE INDEX idx_job_postings_public
    ON job_postings (publication_status, is_archived, published_at DESC);
