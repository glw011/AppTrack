import { z } from 'zod';

// ======== Job Ingestion ========

export const ingestJobSchema = z.object({
  jobTitle: z.string().min(1).max(255),
  companyName: z.string().min(1).max(255),
  url: z.string().url().optional().or(z.literal('')).transform(v => v || null),
  location: z.string().max(255).optional(),
  remote: z.boolean().default(false),
  salaryMin: z.number().int().nonnegative().optional(),
  salaryMax: z.number().int().nonnegative().optional(),
  jobDescription: z.string().optional(),
  rawPosting: z.string().optional(),
  atsType: z.string().max(50).optional(),
  atsIdentifier: z.string().max(255).optional(),
  careerPageUrl: z.string().url().optional().or(z.literal('')).transform(v => v || null),
  searchConfigId: z.string().uuid().optional(),
});

export const ingestJobsSchema = z.object({
  userId: z.string().uuid(),
  jobs: z.array(ingestJobSchema).min(1).max(100),
});

// ======== Draft Submission ========

export const submitDraftSchema = z.object({
  applicationId: z.string().uuid(),
  coverLetter: z.object({
    content: z.string().min(1),
    agentContext: z.record(z.unknown()).optional(),
  }),
  resumeDraft: z.object({
    latexSource: z.string().min(1),
    compiledPdfS3Key: z.string().optional(),
    baseResumeId: z.string().uuid().optional(),
    agentContext: z.record(z.unknown()).optional(),
  }),
});

// ======== Approval/Rejection ========

export const rejectFeedbackSchema = z.object({
  token: z.string().min(1),
  feedback: z.string().min(1).max(2000),
});

// ======== Submission Queue ========

export const submissionStatusSchema = z.object({
  status: z.enum(['submitting', 'submitted', 'failed']),
  submittedAt: z.string().datetime().optional(),
  errorMessage: z.string().optional(),
});

// ======== Pipeline Runs ========

export const createRunSchema = z.object({
  component: z.enum(['search', 'draft', 'submission']),
  metadata:  z.record(z.unknown()).optional(),
});

export const updateRunSchema = z.object({
  status: z.enum(['running', 'completed', 'failed', 'partial']),
  itemsProcessed: z.number().int().nonnegative().optional(),
  itemsSucceeded: z.number().int().nonnegative().optional(),
  itemsFailed: z.number().int().nonnegative().optional(),
  errorMessage: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

// ======== User Profile ========

export const userProfileSchema = z.object({
  headline: z.string().max(500).optional(),
  summary: z.string().optional(),
  skills: z.array(z.string()).optional(),
  technologies: z.array(z.string()).optional(),
  certifications: z.array(z.string()).optional(),
  yearsExperience: z.number().int().nonnegative().optional(),
});

// ======== Search Configuration ========

export const searchConfigSchema = z.object({
  targetTitles: z.array(z.string()).optional(),
  requiredKeywords: z.array(z.string()).optional(),
  excludedCompanies: z.array(z.string()).optional(),
  preferredIndustries: z.array(z.string()).optional(),
  minSalary: z.number().int().nonnegative().optional().nullable(),
  remotePreference: z.enum(['remote', 'hybrid', 'onsite', 'any']).optional(),
  location: z.string().max(255).optional(),
  experienceLevel: z.enum(['entry', 'mid', 'senior']).optional(),
});

export type IngestJobsBody = z.infer<typeof ingestJobsSchema>;
export type SubmitDraftBody = z.infer<typeof submitDraftSchema>;
export type RejectFeedbackBody = z.infer<typeof rejectFeedbackSchema>;
export type SubmissionStatusBody = z.infer<typeof submissionStatusSchema>;
export type CreateRunBody = z.infer<typeof createRunSchema>;
export type UpdateRunBody = z.infer<typeof updateRunSchema>;
export type UserProfileBody = z.infer<typeof userProfileSchema>;
export type SearchConfigBody = z.infer<typeof searchConfigSchema>;
