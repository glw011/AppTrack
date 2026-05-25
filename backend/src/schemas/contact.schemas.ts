import { z } from 'zod';

const optionalUrl = z
  .string()
  .url()
  .optional()
  .or(z.literal(''))
  .transform(v => v || null);

const optionalEmail = z
  .string()
  .email()
  .optional()
  .or(z.literal(''))
  .transform(v => v || null);

export const createContactSchema = z.object({
  companyId: z.string().uuid().optional(),
  applicationId: z.string().uuid().optional(),
  name: z.string().min(1).max(255),
  email: optionalEmail,
  phone: z.string().max(50).optional(),
  linkedin: optionalUrl,
  role: z.string().max(255).optional(),
  notes: z.string().optional(),
});

export const updateContactSchema = createContactSchema.partial();

export type CreateContactBody = z.infer<typeof createContactSchema>;
export type UpdateContactBody = z.infer<typeof updateContactSchema>;
