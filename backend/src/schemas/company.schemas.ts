import { z } from 'zod';

const optionalUrl = z
  .string()
  .url()
  .optional()
  .or(z.literal(''))
  .transform(v => v || null);

export const createCompanySchema = z.object({
  name: z.string().min(1).max(255),
  website: optionalUrl,
  industry: z.string().max(255).optional(),
  notes: z.string().optional(),
});

export const updateCompanySchema = createCompanySchema.partial();

export type CreateCompanyBody = z.infer<typeof createCompanySchema>;
export type UpdateCompanyBody = z.infer<typeof updateCompanySchema>;
