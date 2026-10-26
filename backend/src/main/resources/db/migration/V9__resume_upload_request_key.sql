ALTER TABLE resumes ADD COLUMN upload_request_key VARCHAR(80);
CREATE UNIQUE INDEX uq_resume_upload_request ON resumes(user_id, upload_request_key) WHERE upload_request_key IS NOT NULL;
