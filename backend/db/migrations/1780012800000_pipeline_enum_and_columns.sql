-- Up Migration

-- ======== Extended application_status enum ========
-- IF NOT EXISTS prevents errors on re-run attempts
ALTER TYPE application_status ADD VALUE IF NOT EXISTS 'discovered';         -- found by search agent, not yet drafted
ALTER TYPE application_status ADD VALUE IF NOT EXISTS 'pending_draft';      -- queued for draft agent
ALTER TYPE application_status ADD VALUE IF NOT EXISTS 'drafting';           -- draft agent actively working
ALTER TYPE application_status ADD VALUE IF NOT EXISTS 'awaiting_approval';  -- drafts sent to user
ALTER TYPE application_status ADD VALUE IF NOT EXISTS 'revision_requested'; -- user rejected, wants changes
ALTER TYPE application_status ADD VALUE IF NOT EXISTS 'approved';           -- user approved both documents
ALTER TYPE application_status ADD VALUE IF NOT EXISTS 'awaiting_submission';-- queued for submission agent
ALTER TYPE application_status ADD VALUE IF NOT EXISTS 'submitting';         -- submission agent actively submitting
ALTER TYPE application_status ADD VALUE IF NOT EXISTS 'submitted';          -- delivered to employer (pipeline equivalent of 'applied')


-- ======== job_applications: pipeline tracking ========
-- source: manual vs pipeline
-- FK cols for approved documents added as bare columns here
-- Actual FK constraints added after cover_letters and resume_drafts tables created
ALTER TABLE job_applications
  ADD COLUMN source                     VARCHAR(20)  NOT NULL DEFAULT 'manual',
  ADD COLUMN raw_posting                TEXT,
  ADD COLUMN posting_fetched_at         TIMESTAMPTZ,
  ADD COLUMN search_config_id           UUID,
  ADD COLUMN approved_cover_letter_id   UUID,
  ADD COLUMN approved_resume_draft_id   UUID,
  ADD COLUMN submitted_at               TIMESTAMPTZ;


-- ======== resumes: LaTeX support ========
-- latex_source stores raw .tex content of base resume template
-- parsed_metadata caches APPTRACK tag block parsed on upload:
--   { skills: string[], technologies: string[], highlight_projects: string[] }
ALTER TABLE resumes
  ADD COLUMN latex_source     TEXT,
  ADD COLUMN is_base_template BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN parsed_metadata  JSONB;


-- ======== companies: ATS platform identifiers ========
ALTER TABLE companies
  ADD COLUMN ats_type        VARCHAR(50),   -- 'greenhouse' | 'lever' | 'ashby' | 'workday' | 'other'
  ADD COLUMN ats_identifier  VARCHAR(255),  -- company slug on the ATS (e.g. 'stripe' for boards.greenhouse.io/stripe)
  ADD COLUMN career_page_url VARCHAR(500);


-- Down Migration

-- PostgreSQL does not support removing enum values
-- Enum additions in the Up migration cannot be auto-reversed
-- To roll back: type + all dependent cols need to be recreated (treat enum adds as irreversible)

ALTER TABLE companies
  DROP COLUMN IF EXISTS career_page_url,
  DROP COLUMN IF EXISTS ats_identifier,
  DROP COLUMN IF EXISTS ats_type;

ALTER TABLE resumes
  DROP COLUMN IF EXISTS parsed_metadata,
  DROP COLUMN IF EXISTS is_base_template,
  DROP COLUMN IF EXISTS latex_source;

ALTER TABLE job_applications
  DROP COLUMN IF EXISTS submitted_at,
  DROP COLUMN IF EXISTS approved_resume_draft_id,
  DROP COLUMN IF EXISTS approved_cover_letter_id,
  DROP COLUMN IF EXISTS search_config_id,
  DROP COLUMN IF EXISTS posting_fetched_at,
  DROP COLUMN IF EXISTS raw_posting,
  DROP COLUMN IF EXISTS source;
