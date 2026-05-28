// ─── Auth ────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  name: string;
  created_at: string;
}

// ─── Applications ────────────────────────────────────────────────────────────

export type ManualStatus = 'saved' | 'applied' | 'interviewing' | 'offer' | 'rejected' | 'withdrawn';
export type PipelineStatus =
  | 'discovered' | 'pending_draft' | 'drafting' | 'awaiting_approval'
  | 'revision_requested' | 'approved' | 'awaiting_submission' | 'submitting' | 'submitted';
export type ApplicationStatus = ManualStatus | PipelineStatus;
export type ApplicationSource = 'manual' | 'pipeline';

export interface Application {
  id: string;
  user_id: string;
  company_id: string | null;
  company_name: string | null;
  job_title: string;
  status: ApplicationStatus;
  source: ApplicationSource;
  url: string | null;
  salary_min: number | null;
  salary_max: number | null;
  location: string | null;
  remote: boolean;
  job_description: string | null;
  date_saved: string;
  date_applied: string | null;
  notes: string | null;
  raw_posting: string | null;
  posting_fetched_at: string | null;
  search_config_id: string | null;
  approved_cover_letter_id: string | null;
  approved_resume_draft_id: string | null;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApplicationNote {
  id: string;
  application_id: string;
  user_id: string;
  body: string;
  created_at: string;
}

export interface ApplicationDetail extends Application {
  notes: ApplicationNote[];
  contacts: Contact[];
  reminders: Reminder[];
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// ─── Companies ───────────────────────────────────────────────────────────────

export interface Company {
  id: string;
  name: string;
  website: string | null;
  industry: string | null;
  notes: string | null;
  ats_type: string | null;
  ats_identifier: string | null;
  career_page_url: string | null;
  created_at: string;
  updated_at: string;
  application_count?: number;
}

// ─── Contacts ────────────────────────────────────────────────────────────────

export interface Contact {
  id: string;
  user_id: string;
  application_id: string | null;
  name: string;
  title: string | null;
  email: string | null;
  linkedin_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Reminders ───────────────────────────────────────────────────────────────

export interface Reminder {
  id: string;
  user_id: string;
  application_id: string | null;
  title: string;
  due_at: string;
  completed: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Resumes ─────────────────────────────────────────────────────────────────

export interface Resume {
  id: string;
  user_id: string;
  filename: string;
  s3_key: string;
  is_base_template: boolean;
  parsed_metadata: { skills: string[]; technologies: string[]; projects: string[] } | null;
  created_at: string;
  url?: string;
}

// ─── Pipeline ────────────────────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  user_id: string;
  headline: string | null;
  summary: string | null;
  skills: string[];
  technologies: string[];
  certifications: string[];
  years_experience: number | null;
  created_at: string;
  updated_at: string;
}

export interface SearchConfig {
  id: string;
  user_id: string;
  target_titles: string[];
  required_keywords: string[];
  excluded_companies: string[];
  preferred_industries: string[];
  min_salary: number | null;
  remote_preference: 'remote' | 'hybrid' | 'onsite' | 'any';
  location: string | null;
  experience_level: 'entry' | 'mid' | 'senior';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PipelineRun {
  id: string;
  user_id: string;
  component: 'search' | 'draft' | 'submission';
  status: 'running' | 'completed' | 'failed' | 'partial';
  items_processed: number;
  items_succeeded: number;
  items_failed: number;
  started_at: string;
  completed_at: string | null;
  error_message: string | null;
  metadata: Record<string, unknown> | null;
}

export interface CoverLetter {
  id: string;
  application_id: string;
  user_id: string;
  content: string;
  iteration: number;
  status: 'draft' | 'awaiting_approval' | 'approved' | 'rejected';
  user_feedback: string | null;
  agent_context: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface ResumeDraft {
  id: string;
  application_id: string;
  user_id: string;
  base_resume_id: string | null;
  latex_source: string;
  compiled_pdf_s3_key: string | null;
  iteration: number;
  status: 'draft' | 'awaiting_approval' | 'approved' | 'rejected';
  user_feedback: string | null;
  agent_context: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

// ======== Stats ========

export type StatsResponse = Record<ApplicationStatus, number> & { total: number };
