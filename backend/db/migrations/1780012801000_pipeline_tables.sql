-- Up Migration

-- ======== user_profiles ========
-- One row per user (Arrays store capabilities used by draft agent to tailor resumes/cover letter)
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  headline VARCHAR(500),
  summary TEXT,
  skills TEXT[] NOT NULL DEFAULT '{}',
  technologies TEXT[] NOT NULL DEFAULT '{}',
  certifications TEXT[] NOT NULL DEFAULT '{}',
  years_experience INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ======== projects ========
-- Portfolio projects user wants available for resume
-- highlight = TRUE: project always included regardless of job matched
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  technologies TEXT[] NOT NULL DEFAULT '{}',
  url VARCHAR(500),
  highlight BOOLEAN NOT NULL DEFAULT FALSE,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_projects_user ON projects(user_id, display_order);


-- ======== job_search_configs ========
-- One row per user (is_active = FALSE: disables all automated pipeline runs)
-- remote_preference: 'remote' | 'hybrid' | 'onsite' | 'any'
-- experience_level:  'entry' | 'mid' | 'senior'
CREATE TABLE job_search_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  target_titles TEXT[] NOT NULL DEFAULT '{}',
  required_keywords TEXT[] NOT NULL DEFAULT '{}',
  excluded_companies TEXT[] NOT NULL DEFAULT '{}',
  preferred_industries TEXT[] NOT NULL DEFAULT '{}',
  min_salary INTEGER,
  remote_preference VARCHAR(20) NOT NULL DEFAULT 'any',
  location VARCHAR(255),
  experience_level VARCHAR(50) NOT NULL DEFAULT 'entry',
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_search_configs_updated_at
  BEFORE UPDATE ON job_search_configs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ======== cover_letters ========
-- Multiple rows per app (1 per draft iteration)
-- agent_context: stores reasoning 
--    i.e. matched keywords, company research, summary/rationale for debugging and revision context
-- status: 'draft' | 'awaiting_approval' | 'approved' | 'rejected'
CREATE TABLE cover_letters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES job_applications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  iteration INTEGER NOT NULL DEFAULT 1,
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  user_feedback TEXT,
  agent_context JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_cover_letters_updated_at
  BEFORE UPDATE ON cover_letters
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_cover_letters_application ON cover_letters(application_id, iteration DESC);


-- ======== resume_drafts ========
-- Multiple rows per app (1 per draft iteration)
-- latex_source: full modified .tex source
-- compiled_pdf_s3_key: set after tectonic compiles LaTeX to PDF
-- status: 'draft' | 'awaiting_approval' | 'approved' | 'rejected'
CREATE TABLE resume_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES job_applications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  base_resume_id UUID REFERENCES resumes(id) ON DELETE SET NULL,
  latex_source TEXT NOT NULL,
  compiled_pdf_s3_key VARCHAR(1000),
  iteration INTEGER NOT NULL DEFAULT 1,
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  user_feedback TEXT,
  agent_context JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_resume_drafts_updated_at
  BEFORE UPDATE ON resume_drafts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_resume_drafts_application ON resume_drafts(application_id, iteration DESC);


-- ======== approval_tokens ========
-- Single-use JWT tokens embedded in approval email
-- token_hash: SHA-256 of JWT so token can be invalidated without DB needing secret
-- used_at: IS NULL = token still valid (used in partial index below)
CREATE TABLE approval_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  application_id UUID NOT NULL REFERENCES job_applications(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Partial index: validation queries only care about unconsumed tokens
CREATE INDEX idx_approval_tokens_active ON approval_tokens(token_hash)
  WHERE used_at IS NULL;


-- ======== pipeline_runs ========
-- Audit log for every search/draft/submission agent run
-- component: 'search' | 'draft' | 'submission'
-- status: 'running' | 'completed' | 'failed' | 'partial'
-- metadata: agent-specific log (e.g. { sources_checked: 3, new_jobs: 12 })
CREATE TABLE pipeline_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  component VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'running',
  items_processed INTEGER NOT NULL DEFAULT 0,
  items_succeeded INTEGER NOT NULL DEFAULT 0,
  items_failed INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  metadata JSONB
);

CREATE INDEX idx_pipeline_runs_user ON pipeline_runs(user_id, started_at DESC);


-- ======== FK constraints: job_applications <=> cover_letters/resume_drafts ========
-- FKs create circular dependency so had to be added once both sides of relationships existed
ALTER TABLE job_applications
  ADD CONSTRAINT fk_approved_cover_letter
    FOREIGN KEY (approved_cover_letter_id) REFERENCES cover_letters(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_approved_resume_draft
    FOREIGN KEY (approved_resume_draft_id) REFERENCES resume_drafts(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_search_config
    FOREIGN KEY (search_config_id) REFERENCES job_search_configs(id) ON DELETE SET NULL;


-- Down Migration

-- Drop FK constraints before dropping referenced tables
ALTER TABLE job_applications
  DROP CONSTRAINT IF EXISTS fk_approved_cover_letter,
  DROP CONSTRAINT IF EXISTS fk_approved_resume_draft,
  DROP CONSTRAINT IF EXISTS fk_search_config;

DROP INDEX IF EXISTS idx_pipeline_runs_user;
DROP INDEX IF EXISTS idx_approval_tokens_active;
DROP INDEX IF EXISTS idx_resume_drafts_application;
DROP INDEX IF EXISTS idx_cover_letters_application;
DROP INDEX IF EXISTS idx_projects_user;

DROP TABLE IF EXISTS pipeline_runs;
DROP TABLE IF EXISTS approval_tokens;
DROP TABLE IF EXISTS resume_drafts;
DROP TABLE IF EXISTS cover_letters;
DROP TABLE IF EXISTS job_search_configs;
DROP TABLE IF EXISTS projects;
DROP TABLE IF EXISTS user_profiles;
