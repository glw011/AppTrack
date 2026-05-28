-- Up Migration
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- App status pipeline
CREATE TYPE application_status AS ENUM (
  'saved',
  'applied',
  'interviewing',
  'offer',
  'rejected',
  'withdrawn'
);


-- Reusable trigger for updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ======== Users ========
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ======== Companies ========
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  website VARCHAR(500),
  industry VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, name)
);

CREATE TRIGGER trg_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_companies_user ON companies(user_id);


-- ======== Job Applications ========
CREATE TABLE job_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  job_title VARCHAR(255) NOT NULL,
  status application_status NOT NULL DEFAULT 'saved',
  url VARCHAR(1000),
  salary_min INTEGER CHECK (salary_min >= 0),
  salary_max INTEGER CHECK (salary_max >= 0),
  location VARCHAR(255),
  remote BOOLEAN NOT NULL DEFAULT FALSE,
  job_description TEXT,
  date_saved DATE NOT NULL DEFAULT CURRENT_DATE,
  date_applied DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (salary_max IS NULL OR salary_min IS NULL OR salary_max >= salary_min)
);

CREATE TRIGGER trg_applications_updated_at
  BEFORE UPDATE ON job_applications
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_applications_user        ON job_applications(user_id);
CREATE INDEX idx_applications_user_status ON job_applications(user_id, status);
CREATE INDEX idx_applications_user_date   ON job_applications(user_id, date_applied DESC NULLS LAST);


-- ======== Contacts ========
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  application_id UUID REFERENCES job_applications(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  linkedin VARCHAR(500),
  role VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_contacts_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_contacts_user ON contacts(user_id);


-- ======== Resumes ========
CREATE TABLE resumes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  filename VARCHAR(500) NOT NULL,
  s3_key VARCHAR(1000) NOT NULL UNIQUE,
  file_size_bytes INTEGER CHECK (file_size_bytes > 0),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_resumes_user ON resumes(user_id);


-- ======== Application Notes ========
CREATE TABLE application_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES job_applications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_notes_updated_at
  BEFORE UPDATE ON application_notes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_notes_application ON application_notes(application_id);


-- ======== Reminders ========
CREATE TABLE reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES job_applications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message VARCHAR(500) NOT NULL,
  due_at TIMESTAMPTZ NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (completed = FALSE OR completed_at IS NOT NULL)
);

-- Only index incomplete reminders for "what's due?" queries
CREATE INDEX idx_reminders_user_pending ON reminders(user_id, due_at)
  WHERE completed = FALSE;


-- Down Migration
DROP INDEX IF EXISTS idx_reminders_user_pending;
DROP INDEX IF EXISTS idx_notes_application;
DROP INDEX IF EXISTS idx_resumes_user;
DROP INDEX IF EXISTS idx_contacts_user;
DROP INDEX IF EXISTS idx_applications_user_date;
DROP INDEX IF EXISTS idx_applications_user_status;
DROP INDEX IF EXISTS idx_applications_user;
DROP INDEX IF EXISTS idx_companies_user;

DROP TABLE IF EXISTS reminders;
DROP TABLE IF EXISTS application_notes;
DROP TABLE IF EXISTS resumes;
DROP TABLE IF EXISTS contacts;
DROP TABLE IF EXISTS job_applications;
DROP TABLE IF EXISTS companies;
DROP TABLE IF EXISTS users;

DROP FUNCTION IF EXISTS set_updated_at();
DROP TYPE IF EXISTS application_status;
