import { Router, Request, Response } from 'express';
import { pool } from '../db/pool';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../lib/asyncHandler';
import { AppError } from '../lib/errors';
import { createCompanySchema, updateCompanySchema } from '../schemas/company.schemas';

export const companiesRouter = Router();
companiesRouter.use(requireAuth);


// ======== GET / ========
companiesRouter.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const { rows } = await pool.query(
      `SELECT c.*, COUNT(ja.id)::int AS application_count
       FROM companies c
       LEFT JOIN job_applications ja ON ja.company_id = c.id AND ja.user_id = c.user_id
       WHERE c.user_id = $1
       GROUP BY c.id
       ORDER BY c.name`,
      [req.userId],
    );
    res.json(rows);
  }),
);


// ======== POST / ========
companiesRouter.post(
  '/',
  validate(createCompanySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { name, website, industry, notes } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO companies (user_id, name, website, industry, notes)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.userId, name, website ?? null, industry ?? null, notes ?? null],
    );
    res.status(201).json(rows[0]);
  }),
);


// ======== GET /:id ========
companiesRouter.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { rows: [company] } = await pool.query(
      'SELECT * FROM companies WHERE id = $1 AND user_id = $2',
      [req.params.id, req.userId],
    );
    if(!company) throw new AppError(404, 'Company not found');

    const { rows: applications } = await pool.query(
      `SELECT id, job_title, status, date_applied, created_at
       FROM job_applications
       WHERE company_id = $1 AND user_id = $2
       ORDER BY created_at DESC`,
      [req.params.id, req.userId],
    );

    res.json({ ...company, applications });
  }),
);


// ======== PUT /:id ========
companiesRouter.put(
  '/:id',
  validate(updateCompanySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { name, website, industry, notes } = req.body;
    const { rows } = await pool.query(
      `UPDATE companies
       SET name = COALESCE($3, name),
           website = COALESCE($4, website),
           industry = COALESCE($5, industry),
           notes = COALESCE($6, notes)
       WHERE id = $1 AND user_id = $2 RETURNING *`,
      [req.params.id, req.userId, name, website, industry, notes],
    );
    if(rows.length === 0) throw new AppError(404, 'Company not found');
    res.json(rows[0]);
  }),
);


// ======== DELETE /:id ========
companiesRouter.delete(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { rowCount } = await pool.query(
      'DELETE FROM companies WHERE id = $1 AND user_id = $2',
      [req.params.id, req.userId],
    );
    if(!rowCount) throw new AppError(404, 'Company not found');
    res.status(204).send();
  }),
);
