import { z } from 'zod';

export const createReminderSchema = z.object({
  applicationId: z.string().uuid(),
  message: z.string().min(1).max(500),
  dueAt: z.string().datetime(),
});

export type CreateReminderBody = z.infer<typeof createReminderSchema>;
