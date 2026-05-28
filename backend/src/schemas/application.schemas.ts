import { z } from 'zod';

const optionalUrl = z
  .string()
  .url()
  .optional()
  .or(z.literal(''))
  .transform(v => v || null);

// Manual-entry statuses (user-managed)
export const MANUAL_STATUSES = ['saved', 'applied', 'interviewing', 'offer', 'rejected', 'withdrawn'] as const;

// Pipeline statuses (agent-managed)
export const PIPELINE_STATUSES = [
  'discovered', 'pending_draft', 'drafting', 'awaiting_approval',
  'revision_requested', 'approved', 'awaiting_submission', 'submitting', 'submitted',
] as const;

export const APPLICATION_STATUSES = [...MANUAL_STATUSES, ...PIPELINE_STATUSES] as const;

export const APPLICATION_SOURCES = ['manual', 'pipeline'] as const;

export const createApplicationSchema = z
  .object({
    companyId: z.string().uuid().optional(),
    jobTitle: z.string().min(1).max(255),
    status: z.enum(APPLICATION_STATUSES).default('saved'),
    source: z.enum(APPLICATION_SOURCES).default('manual'),
    url: optionalUrl,
    salaryMin: z.number().int().nonnegative().optional(),
    salaryMax: z.number().int().nonnegative().optional(),
    location: z.string().max(255).optional(),
    remote: z.boolean().default(false),
    jobDescription: z.string().optional(),
    dateSaved: z.string().date().optional(),
    dateApplied: z.string().date().nullable().optional(),
    notes: z.string().optional(),
  })
  .refine(
    d => d.salaryMin == null || d.salaryMax == null || d.salaryMax >= d.salaryMin,
    { message: 'salaryMax must be >= salaryMin', path: ['salaryMax'] },
  );

export const updateApplicationSchema = createApplicationSchema.partial();

export const statusPatchSchema = z.object({
  status: z.enum(APPLICATION_STATUSES),
});

export const noteSchema = z.object({
  body: z.string().min(1),
});

export type CreateApplicationBody = z.infer<typeof createApplicationSchema>;
export type UpdateApplicationBody = z.infer<typeof updateApplicationSchema>;
export type ApplicationStatus = typeof APPLICATION_STATUSES[number];
