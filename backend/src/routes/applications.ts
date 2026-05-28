import { Router, Request, Response } from 'express';
import { pool } from '../db/pool';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../lib/asyncHandler';
import { AppError } from '../lib/errors';
import {
  createApplicationSchema,
  updateApplicationSchema,
  statusPatchSchema,
  noteSchema,
  APPLICATION_STATUSES,
} from '../schemas/application.schemas';

export const applicationsRouter = Router();
applicationsRouter.use(requireAuth);


// ======== GET /stats ======== (def'd BEFORE /:id)
applicationsRouter.get(
  '/stats',
  asyncHandler(async (req: Request, res: Response) => {
    const { rows } = await pool.query(
      `SELECT status, COUNT(*)::int AS count
       FROM job_applications
       WHERE user_id = $1
       GROUP BY status`,
      [req.userId],
    );

    const stats = Object.fromEntries(APPLICATION_STATUSES.map(s => [s, 0])) as Record<string, number>;
    let total = 0;
    for (const row of rows) {
      stats[row.status] = row.count;
      total += row.count;
    }
    res.json({ ...stats, total });
  }),
);


// ======== GET /export/csv ======== (def'd before /:id)
applicationsRouter.get(
  '/export/csv',
  asyncHandler(async (req: Request, res: Response) => {
    const { rows } = await pool.query(
      `SELECT ja.id, ja.job_title, c.name AS company_name, ja.status, ja.url,
              ja.salary_min, ja.salary_max, ja.location, ja.remote,
              ja.date_saved, ja.date_applied, ja.notes, ja.created_at
       FROM job_applications ja
       LEFT JOIN companies c ON c.id = ja.company_id
       WHERE ja.user_id = $1
       ORDER BY ja.created_at DESC`,
      [req.userId],
    );

    const headers = [
      'id', 'job_title', 'company_name', 'status', 'url',
      'salary_min', 'salary_max', 'location', 'remote',
      'date_saved', 'date_applied', 'notes', 'created_at',
    ];
    const escape = (v: unknown): string => {
      if(v == null) return '';
      const s = String(v);
      return s.includes(',') || s.includes('"') || s.includes('\n') ? 
        `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [
      headers.join(','),
      ...rows.map(r => headers.map(h => escape(r[h])).join(',')),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="applications-${Date.now()}.csv"`);
    res.send(csv);
  }),
);


// ======== GET / ========
applicationsRouter.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const {
      status, search, remote,
      sort = 'created_at',
      page = '1',
      limit = '20',
    } = req.query as Record<string, string>;

    const conditions = ['ja.user_id = $1'];
    const params: unknown[] = [req.userId];
    let p = 2;

    if(status){
      conditions.push(`ja.status = $${p++}`);
      params.push(status);
    }
    if(search){
      conditions.push(`(ja.job_title ILIKE $${p} OR c.name ILIKE $${p})`);
      params.push(`%${search}%`);
      p++;
    }
    if(remote !== undefined){
      conditions.push(`ja.remote = $${p++}`);
      params.push(remote === 'true');
    }

    const validSorts: Record<string, string> = {
      created_at:   'ja.created_at DESC',
      date_applied: 'ja.date_applied DESC NULLS LAST',
      date_saved:   'ja.date_saved DESC',
      job_title:    'ja.job_title ASC',
    };
    const orderBy = validSorts[sort] ?? validSorts['created_at'];

    const pageNum = Math.max(1, parseInt(page, 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const offset = (pageNum - 1) * pageSize;
    const where = conditions.join(' AND ');

    const [{ rows }, { rows: countRows }] = await Promise.all([
      pool.query(
        `SELECT ja.*, c.name AS company_name
         FROM job_applications ja
         LEFT JOIN companies c ON c.id = ja.company_id
         WHERE ${where}
         ORDER BY ${orderBy}
         LIMIT $${p} OFFSET $${p + 1}`,
        [...params, pageSize, offset],
      ),
      pool.query(
        `SELECT COUNT(*)::int AS total
         FROM job_applications ja
         LEFT JOIN companies c ON c.id = ja.company_id
         WHERE ${where}`,
        params,
      ),
    ]);

    res.json({
      data: rows,
      pagination: {
        page: pageNum,
        limit: pageSize,
        total: countRows[0].total,
        pages: Math.ceil(countRows[0].total / pageSize),
      },
    });
  }),
);


// ======== POST / ========
applicationsRouter.post(
  '/',
  validate(createApplicationSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const {
      companyId, jobTitle, status, source, url, salaryMin, salaryMax,
      location, remote, jobDescription, dateSaved, dateApplied, notes,
    } = req.body;

    const { rows } = await pool.query(
      `INSERT INTO job_applications
         (user_id, company_id, job_title, status, source, url, salary_min, salary_max,
          location, remote, job_description, date_saved, date_applied, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING *`,
      [
        req.userId, companyId ?? null, jobTitle, status, source,
        url ?? null, salaryMin ?? null, salaryMax ?? null,
        location ?? null, remote, jobDescription ?? null,
        dateSaved ?? new Date().toISOString().slice(0, 10),
        dateApplied ?? null, notes ?? null,
      ],
    );
    res.status(201).json(rows[0]);
  }),
);


// ======== Ownership helper function ========
async function requireOwnership(id: string, userId: string): Promise<void> {
  const { rows } = await pool.query('SELECT id FROM job_applications WHERE id = $1 AND user_id = $2', [id, userId],);
  if(rows.length === 0) throw new AppError(404, 'Application not found');
}


// ======== GET /:id ========
applicationsRouter.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { rows: [app] } = await pool.query(
      `SELECT ja.*, c.name AS company_name
       FROM job_applications ja
       LEFT JOIN companies c ON c.id = ja.company_id
       WHERE ja.id = $1 AND ja.user_id = $2`,
      [req.params.id, req.userId],
    );
    if(!app) throw new AppError(404, 'Application not found');

    const [notesRes, contactsRes, remindersRes] = await Promise.all([
      pool.query(
        'SELECT * FROM application_notes WHERE application_id = $1 ORDER BY created_at DESC',
        [req.params.id],
      ),
      pool.query(
        'SELECT * FROM contacts WHERE application_id = $1',
        [req.params.id],
      ),
      pool.query(
        'SELECT * FROM reminders WHERE application_id = $1 ORDER BY due_at',
        [req.params.id],
      ),
    ]);

    res.json({
      ...app,
      notes: notesRes.rows,
      contacts: contactsRes.rows,
      reminders: remindersRes.rows,
    });
  }),
);


// ======== PUT /:id ========
applicationsRouter.put(
  '/:id',
  validate(updateApplicationSchema),
  asyncHandler(async (req: Request, res: Response) => {
    await requireOwnership(req.params.id, req.userId!);

    const fieldMap: Record<string, string> = {
      companyId:      'company_id',
      jobTitle:       'job_title',
      status:         'status',
      source:         'source',
      url:            'url',
      salaryMin: 'salary_min',
      salaryMax: 'salary_max',
      location: 'location',
      remote: 'remote',
      jobDescription: 'job_description',
      dateSaved: 'date_saved',
      dateApplied: 'date_applied',
      notes: 'notes',
    };

    const setClauses: string[] = [];
    const values: unknown[] = [req.params.id, req.userId];
    let p = 3;

    for(const [key, val] of Object.entries(fieldMap)){
      if(Object.prototype.hasOwnProperty.call(req.body, key)){
        setClauses.push(`${val} = $${p++}`);
        values.push(req.body[key] ?? null);
      }
    }
    if(setClauses.length === 0) throw new AppError(400, 'No fields to update');

    const { rows } = await pool.query(
      `UPDATE job_applications SET ${setClauses.join(', ')}
       WHERE id = $1 AND user_id = $2 RETURNING *`,
      values,
    );
    res.json(rows[0]);
  }),
);


// ======== DELETE /:id ========
applicationsRouter.delete(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { rowCount } = await pool.query(
      'DELETE FROM job_applications WHERE id = $1 AND user_id = $2',
      [req.params.id, req.userId],
    );
    if(!rowCount) throw new AppError(404, 'Application not found');
    res.status(204).send();
  }),
);


// ======== PATCH /:id/status ========
applicationsRouter.patch(
  '/:id/status',
  validate(statusPatchSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { rows } = await pool.query(
      `UPDATE job_applications SET status = $3,
         date_applied = CASE WHEN $3 = 'applied' AND date_applied IS NULL THEN CURRENT_DATE ELSE date_applied END
       WHERE id = $1 AND user_id = $2 RETURNING *`,
      [req.params.id, req.userId, req.body.status],
    );
    if(rows.length === 0) throw new AppError(404, 'Application not found');
    res.json(rows[0]);
  }),
);


// ======== POST /:id/notes ========
applicationsRouter.post(
  '/:id/notes',
  validate(noteSchema),
  asyncHandler(async (req: Request, res: Response) => {
    await requireOwnership(req.params.id, req.userId!);
    const { rows } = await pool.query(
      `INSERT INTO application_notes (application_id, user_id, body)
       VALUES ($1, $2, $3) RETURNING *`,
      [req.params.id, req.userId, req.body.body],
    );
    res.status(201).json(rows[0]);
  }),
);


// ======== DELETE /:id/notes/:noteId ========
applicationsRouter.delete(
  '/:id/notes/:noteId',
  asyncHandler(async (req: Request, res: Response) => {
    const { rowCount } = await pool.query(
      'DELETE FROM application_notes WHERE id = $1 AND user_id = $2 AND application_id = $3',
      [req.params.noteId, req.userId, req.params.id],
    );
    if(!rowCount) throw new AppError(404, 'Note not found');
    res.status(204).send();
  }),
);
