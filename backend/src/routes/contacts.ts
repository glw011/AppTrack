import { Router, Request, Response } from 'express';
import { pool } from '../db/pool';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../lib/asyncHandler';
import { AppError } from '../lib/errors';
import { createContactSchema, updateContactSchema } from '../schemas/contact.schemas';

export const contactsRouter = Router();
contactsRouter.use(requireAuth);


// ======== GET / ========
contactsRouter.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const { applicationId, companyId } = req.query as Record<string, string>;

    const conditions = ['ct.user_id = $1'];
    const params: unknown[] = [req.userId];
    let p = 2;

    if(applicationId){
      conditions.push(`ct.application_id = $${p++}`);
      params.push(applicationId);
    }
    if(companyId){
      conditions.push(`ct.company_id = $${p++}`);
      params.push(companyId);
    }

    const { rows } = await pool.query(
      `SELECT ct.*, c.name AS company_name, ja.job_title AS application_title
       FROM contacts ct
       LEFT JOIN companies c ON c.id = ct.company_id
       LEFT JOIN job_applications ja ON ja.id = ct.application_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY ct.name`,
      params,
    );
    res.json(rows);
  }),
);


// ======== POST / ========
contactsRouter.post(
  '/',
  validate(createContactSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { companyId, applicationId, name, email, phone, linkedin, role, notes } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO contacts (user_id, company_id, application_id, name, email, phone, linkedin, role, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [
        req.userId, companyId ?? null, applicationId ?? null,
        name, email ?? null, phone ?? null, linkedin ?? null,
        role ?? null, notes ?? null,
      ],
    );
    res.status(201).json(rows[0]);
  }),
);


// ======== PUT /:id ========
contactsRouter.put(
  '/:id',
  validate(updateContactSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { companyId, applicationId, name, email, phone, linkedin, role, notes } = req.body;
    const { rows } = await pool.query(
      `UPDATE contacts
       SET company_id = COALESCE($3, company_id),
           application_id = COALESCE($4, application_id),
           name = COALESCE($5, name),
           email = COALESCE($6, email),
           phone = COALESCE($7, phone),
           linkedin = COALESCE($8, linkedin),
           role = COALESCE($9, role),
           notes = COALESCE($10, notes)
       WHERE id = $1 AND user_id = $2 RETURNING *`,
      [req.params.id, req.userId, companyId, applicationId, name, email, phone, linkedin, role, notes],
    );
    if(rows.length === 0) throw new AppError(404, 'Contact not found');
    res.json(rows[0]);
  }),
);


// ======== DELETE /:id ========
contactsRouter.delete(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { rowCount } = await pool.query(
      'DELETE FROM contacts WHERE id = $1 AND user_id = $2',
      [req.params.id, req.userId],
    );
    if(!rowCount) throw new AppError(404, 'Contact not found');
    res.status(204).send();
  }),
);
