import { Router, Request, Response } from 'express';
import { pool } from '../db/pool';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../lib/asyncHandler';
import { AppError } from '../lib/errors';
import { createReminderSchema } from '../schemas/reminder.schemas';

export const remindersRouter = Router();
remindersRouter.use(requireAuth);


// ======== GET / ========
remindersRouter.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const { applicationId, completed } = req.query as Record<string, string>;

    const conditions = ['r.user_id = $1'];
    const params: unknown[] = [req.userId];
    let p = 2;

    if(applicationId){
      conditions.push(`r.application_id = $${p++}`);
      params.push(applicationId);
    }
    if(completed !== undefined){
      conditions.push(`r.completed = $${p++}`);
      params.push(completed === 'true');
    }

    const { rows } = await pool.query(
      `SELECT r.*, ja.job_title AS application_title, c.name AS company_name
       FROM reminders r
       JOIN job_applications ja ON ja.id = r.application_id
       LEFT JOIN companies c ON c.id = ja.company_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY r.completed ASC, r.due_at ASC`,
      params,
    );
    res.json(rows);
  }),
);


// ======== POST / ========
remindersRouter.post(
  '/',
  validate(createReminderSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { applicationId, message, dueAt } = req.body;

    // Verify the application belongs to this user
    const { rows: [app] } = await pool.query(
      'SELECT id FROM job_applications WHERE id = $1 AND user_id = $2',
      [applicationId, req.userId],
    );
    if(!app) throw new AppError(404, 'Application not found');

    const { rows } = await pool.query(
      `INSERT INTO reminders (application_id, user_id, message, due_at)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [applicationId, req.userId, message, dueAt],
    );
    res.status(201).json(rows[0]);
  }),
);


// ======== PATCH /:id/complete ========
remindersRouter.patch(
  '/:id/complete',
  asyncHandler(async (req: Request, res: Response) => {
    const { rows } = await pool.query(
      `UPDATE reminders
       SET completed = TRUE, completed_at = NOW()
       WHERE id = $1 AND user_id = $2 AND completed = FALSE
       RETURNING *`,
      [req.params.id, req.userId],
    );
    if(rows.length === 0) throw new AppError(404, 'Reminder not found or already completed');
    res.json(rows[0]);
  }),
);


// ======== DELETE /:id ========
remindersRouter.delete(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { rowCount } = await pool.query(
      'DELETE FROM reminders WHERE id = $1 AND user_id = $2',
      [req.params.id, req.userId],
    );
    if(!rowCount) throw new AppError(404, 'Reminder not found');
    res.status(204).send();
  }),
);
