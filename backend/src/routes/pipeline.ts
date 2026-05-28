import { Router, Request, Response } from 'express';
import { pool } from '../db/pool';
import { requireAuth } from '../middleware/auth';
import { requireServiceAuth } from '../middleware/serviceAuth';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../lib/asyncHandler';
import { AppError } from '../lib/errors';
import {
  generateApprovalToken,
  storeApprovalToken,
  validateAndConsumeToken,
  verifyTokenStructure,
} from '../lib/tokens';
import { sendApprovalEmail } from '../lib/email';
import {
  ingestJobsSchema,
  submitDraftSchema,
  rejectFeedbackSchema,
  submissionStatusSchema,
  createRunSchema,
  updateRunSchema,
  userProfileSchema,
  searchConfigSchema,
} from '../schemas/pipeline.schemas';

export const pipelineRouter = Router();


// ======== User Profile ========

pipelineRouter.get(
  '/profile',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const { rows: [profile] } = await pool.query(
      'SELECT * FROM user_profiles WHERE user_id = $1',
      [req.userId],
    );
    res.json(profile ?? null);
  }),
);

pipelineRouter.put(
  '/profile',
  requireAuth,
  validate(userProfileSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { headline, summary, skills, technologies, certifications, yearsExperience } = req.body;
    const { rows: [profile] } = await pool.query(
      `INSERT INTO user_profiles (user_id, headline, summary, skills, technologies, certifications, years_experience)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (user_id) DO UPDATE SET
         headline = EXCLUDED.headline,
         summary = EXCLUDED.summary,
         skills = EXCLUDED.skills,
         technologies = EXCLUDED.technologies,
         certifications = EXCLUDED.certifications,
         years_experience = EXCLUDED.years_experience,
         updated_at = NOW()
       RETURNING *`,
      [
        req.userId,
        headline ?? null,
        summary ?? null,
        skills ?? [],
        technologies ?? [],
        certifications ?? [],
        yearsExperience ?? null,
      ],
    );
    res.json(profile);
  }),
);


// ======== Search Config ========

pipelineRouter.get(
  '/search-config',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const { rows: [cfg] } = await pool.query(
      'SELECT * FROM job_search_configs WHERE user_id = $1',
      [req.userId],
    );
    res.json(cfg ?? null);
  }),
);

pipelineRouter.put(
  '/search-config',
  requireAuth,
  validate(searchConfigSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const {
      targetTitles, requiredKeywords, excludedCompanies, preferredIndustries,
      minSalary, remotePreference, location, experienceLevel,
    } = req.body;
    const { rows: [cfg] } = await pool.query(
      `INSERT INTO job_search_configs
         (user_id, target_titles, required_keywords, excluded_companies,
          preferred_industries, min_salary, remote_preference, location, experience_level)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (user_id) DO UPDATE SET
         target_titles = COALESCE(EXCLUDED.target_titles, job_search_configs.target_titles),
         required_keywords = COALESCE(EXCLUDED.required_keywords, job_search_configs.required_keywords),
         excluded_companies = COALESCE(EXCLUDED.excluded_companies, job_search_configs.excluded_companies),
         preferred_industries = COALESCE(EXCLUDED.preferred_industries, job_search_configs.preferred_industries),
         min_salary = EXCLUDED.min_salary,
         remote_preference = COALESCE(EXCLUDED.remote_preference, job_search_configs.remote_preference),
         location = EXCLUDED.location,
         experience_level = COALESCE(EXCLUDED.experience_level, job_search_configs.experience_level),
         updated_at = NOW()
       RETURNING *`,
      [
        req.userId,
        targetTitles ?? [],
        requiredKeywords ?? [],
        excludedCompanies ?? [],
        preferredIndustries ?? [],
        minSalary ?? null,
        remotePreference ?? 'any',
        location ?? null,
        experienceLevel ?? 'entry',
      ],
    );
    res.json(cfg);
  }),
);

pipelineRouter.patch(
  '/search-config/toggle',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const { rows: [cfg] } = await pool.query(
      `UPDATE job_search_configs
       SET is_active = NOT is_active, updated_at = NOW()
       WHERE user_id = $1
       RETURNING *`,
      [req.userId],
    );
    if(!cfg) throw new AppError(404, 'Search config not found: verify it exists');
    res.json(cfg);
  }),
);


// ======== Job Ingest (Service auth) ========

pipelineRouter.post(
  '/jobs/ingest',
  requireServiceAuth,
  validate(ingestJobsSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { userId, jobs } = req.body;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const created: string[] = [];
      const skipped: string[] = [];

      for (const job of jobs){
        // Upsert company by name
        const { rows: [company] } = await client.query(
          `INSERT INTO companies (name, ats_type, ats_identifier, career_page_url)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (name) DO UPDATE SET
             ats_type = COALESCE(EXCLUDED.ats_type, companies.ats_type),
             ats_identifier = COALESCE(EXCLUDED.ats_identifier, companies.ats_identifier),
             career_page_url = COALESCE(EXCLUDED.career_page_url, companies.career_page_url)
           RETURNING id`,
          [job.companyName, job.atsType ?? null, job.atsIdentifier ?? null, job.careerPageUrl ?? null],
        );

        // Skip duplicate job (same user + title + company)
        const { rows: existing } = await client.query(
          `SELECT id FROM job_applications
           WHERE user_id = $1 AND company_id = $2 AND job_title = $3`,
          [userId, company.id, job.jobTitle],
        );
        if(existing.length > 0){
          skipped.push(existing[0].id);
          continue;
        }

        const { rows: [app] } = await client.query(
          `INSERT INTO job_applications
             (user_id, company_id, job_title, status, source, url,
              salary_min, salary_max, location, remote, job_description,
              raw_posting, posting_fetched_at, search_config_id)
           VALUES ($1,$2,$3,'discovered','pipeline',$4,$5,$6,$7,$8,$9,$10,NOW(),$11)
           RETURNING id`,
          [
            userId, company.id, job.jobTitle, job.url ?? null,
            job.salaryMin ?? null, job.salaryMax ?? null,
            job.location ?? null, job.remote,
            job.jobDescription ?? null, job.rawPosting ?? null,
            job.searchConfigId ?? null,
          ],
        );
        created.push(app.id);
      }

      await client.query('COMMIT');
      res.status(201).json({ created: created.length, skipped: skipped.length, ids: created });
    } catch (err){
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }),
);

pipelineRouter.get(
  '/jobs/pending',
  requireServiceAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const { userId, limit = '20' } = req.query as Record<string, string>;
    if(!userId) throw new AppError(400, 'userId query param required');

    const pageSize = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const { rows } = await pool.query(
      `SELECT ja.*, c.name AS company_name
       FROM job_applications ja
       LEFT JOIN companies c ON c.id = ja.company_id
       WHERE ja.user_id = $1 AND ja.status = 'pending_draft'
       ORDER BY ja.created_at ASC
       LIMIT $2`,
      [userId, pageSize],
    );
    res.json(rows);
  }),
);


// ======== Draft Submission (Service auth) ========

pipelineRouter.post(
  '/drafts',
  requireServiceAuth,
  validate(submitDraftSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { applicationId, coverLetter, resumeDraft } = req.body;

    // Verify application exists and get owner's email
    const { rows: [app] } = await pool.query(
      `SELECT ja.user_id, ja.job_title, c.name AS company_name, u.email
       FROM job_applications ja
       LEFT JOIN companies c ON c.id = ja.company_id
       JOIN users u ON u.id = ja.user_id
       WHERE ja.id = $1`,
      [applicationId],
    );
    if(!app) throw new AppError(404, 'Application not found');

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Derive next iteration numbers
      const { rows: [clIter] } = await client.query(
        'SELECT COALESCE(MAX(iteration), 0) + 1 AS next FROM cover_letters WHERE application_id = $1',
        [applicationId],
      );
      const { rows: [rdIter] } = await client.query(
        'SELECT COALESCE(MAX(iteration), 0) + 1 AS next FROM resume_drafts WHERE application_id = $1',
        [applicationId],
      );

      const { rows: [cl] } = await client.query(
        `INSERT INTO cover_letters (application_id, user_id, content, iteration, status, agent_context)
         VALUES ($1, $2, $3, $4, 'awaiting_approval', $5)
         RETURNING *`,
        [applicationId, app.user_id, coverLetter.content, clIter.next, coverLetter.agentContext ?? null],
      );

      const { rows: [rd] } = await client.query(
        `INSERT INTO resume_drafts
           (application_id, user_id, latex_source, compiled_pdf_s3_key, iteration, status, base_resume_id, agent_context)
         VALUES ($1, $2, $3, $4, $5, 'awaiting_approval', $6, $7)
         RETURNING *`,
        [
          applicationId, app.user_id, resumeDraft.latexSource,
          resumeDraft.compiledPdfS3Key ?? null, rdIter.next,
          resumeDraft.baseResumeId ?? null, resumeDraft.agentContext ?? null,
        ],
      );

      await client.query(
        `UPDATE job_applications SET status = 'awaiting_approval' WHERE id = $1`,
        [applicationId],
      );

      await client.query('COMMIT');

      // Generate single-use approval token and a structural reject token
      const approveToken = generateApprovalToken({ applicationId, userId: app.user_id, action: 'approve' });
      const rejectToken  = generateApprovalToken({ applicationId, userId: app.user_id, action: 'reject' });
      await storeApprovalToken(approveToken, app.user_id, applicationId);

      await sendApprovalEmail({
        to: app.email,
        jobTitle: app.job_title,
        companyName: app.company_name ?? 'Unknown Company',
        applicationId,
        approveToken,
        rejectToken,
      });

      res.status(201).json({ coverLetterId: cl.id, resumeDraftId: rd.id });
    } catch (err){
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }),
);

pipelineRouter.get(
  '/drafts/:applicationId',
  requireServiceAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const { applicationId } = req.params;

    const [clRes, rdRes] = await Promise.all([
      pool.query(
        'SELECT * FROM cover_letters WHERE application_id = $1 ORDER BY iteration DESC LIMIT 1',
        [applicationId],
      ),
      pool.query(
        'SELECT * FROM resume_drafts WHERE application_id = $1 ORDER BY iteration DESC LIMIT 1',
        [applicationId],
      ),
    ]);

    res.json({
      coverLetter: clRes.rows[0] ?? null,
      resumeDraft: rdRes.rows[0] ?? null,
    });
  }),
);


// ======== Approval/Rejection (Approval token) ========

pipelineRouter.get(
  '/approve',
  asyncHandler(async (req: Request, res: Response) => {
    const token = req.query.token as string | undefined;
    if(!token) throw new AppError(400, 'token query param required');

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const payload = await validateAndConsumeToken(token);

    if(payload.action !== 'approve'){
      throw new AppError(400, 'Token is not an approval token');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Mark latest drafts as approved
      await client.query(
        `UPDATE cover_letters SET status = 'approved'
         WHERE application_id = $1
           AND iteration = (SELECT MAX(iteration) FROM cover_letters WHERE application_id = $1)`,
        [payload.applicationId],
      );
      await client.query(
        `UPDATE resume_drafts SET status = 'approved'
         WHERE application_id = $1
           AND iteration = (SELECT MAX(iteration) FROM resume_drafts WHERE application_id = $1)`,
        [payload.applicationId],
      );

      // Link approved docs back onto the application and advance status
      await client.query(
        `UPDATE job_applications SET
           status = 'awaiting_submission',
           approved_cover_letter_id = (
             SELECT id FROM cover_letters WHERE application_id = $1 ORDER BY iteration DESC LIMIT 1
           ),
           approved_resume_draft_id = (
             SELECT id FROM resume_drafts WHERE application_id = $1 ORDER BY iteration DESC LIMIT 1
           )
         WHERE id = $1`,
        [payload.applicationId],
      );

      await client.query('COMMIT');
    } catch (err){
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    res.redirect(`${frontendUrl}/applications/${payload.applicationId}?approved=true`);
  }),
);

pipelineRouter.get(
  '/reject',
  asyncHandler(async (req: Request, res: Response) => {
    const token = req.query.token as string | undefined;
    if(!token) throw new AppError(400, 'token query param required');

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const payload = verifyTokenStructure(token);

    if(payload.action !== 'reject'){
      throw new AppError(400, 'Token is not a rejection token');
    }

    // Reject tokens NOT consumed here
    //    - frontend calls POST /reject with feedback text (NO token consume either) & reject links don't use single-use tokens
    res.redirect(
      `${frontendUrl}/review/${payload.applicationId}?token=${encodeURIComponent(token)}`,
    );
  }),
);

pipelineRouter.post(
  '/reject',
  validate(rejectFeedbackSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { token, feedback } = req.body;
    const payload = verifyTokenStructure(token);

    if(payload.action !== 'reject'){
      throw new AppError(400, 'Token is not a rejection token');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Store feedback on the latest drafts and mark as rejected
      await client.query(
        `UPDATE cover_letters SET status = 'rejected', user_feedback = $2
         WHERE application_id = $1
           AND iteration = (SELECT MAX(iteration) FROM cover_letters WHERE application_id = $1)`,
        [payload.applicationId, feedback],
      );
      await client.query(
        `UPDATE resume_drafts SET status = 'rejected', user_feedback = $2
         WHERE application_id = $1
           AND iteration = (SELECT MAX(iteration) FROM resume_drafts WHERE application_id = $1)`,
        [payload.applicationId, feedback],
      );

      await client.query(
        `UPDATE job_applications SET status = 'revision_requested' WHERE id = $1`,
        [payload.applicationId],
      );

      await client.query('COMMIT');
    } catch (err){
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    res.json({ message: 'Feedback recorded: Application queued for revision' });
  }),
);


// ======== Submission Queue (Service auth) ========

pipelineRouter.get(
  '/submissions/pending',
  requireServiceAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const { userId, limit = '20' } = req.query as Record<string, string>;
    if(!userId) throw new AppError(400, 'userId query param required');

    const pageSize = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const { rows } = await pool.query(
      `SELECT ja.*, c.name AS company_name,
              cl.content AS cover_letter_content,
              rd.compiled_pdf_s3_key, rd.latex_source
       FROM job_applications ja
       LEFT JOIN companies c ON c.id = ja.company_id
       LEFT JOIN cover_letters cl ON cl.id = ja.approved_cover_letter_id
       LEFT JOIN resume_drafts rd ON rd.id = ja.approved_resume_draft_id
       WHERE ja.user_id = $1 AND ja.status = 'awaiting_submission'
       ORDER BY ja.updated_at ASC
       LIMIT $2`,
      [userId, pageSize],
    );
    res.json(rows);
  }),
);

pipelineRouter.patch(
  '/submissions/:id/status',
  requireServiceAuth,
  validate(submissionStatusSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { status, submittedAt, errorMessage } = req.body;

    const setClauses = [`status = $2`];
    const values: unknown[] = [req.params.id, status];
    let p = 3;

    if(status === 'submitted'){
      setClauses.push(`submitted_at = $${p++}`);
      values.push(submittedAt ? new Date(submittedAt) : new Date());
      setClauses.push(`date_applied = COALESCE(date_applied, CURRENT_DATE)`);
    }
    if(errorMessage !== undefined){
      // store error message in notes column if submission failed
      setClauses.push(`notes = $${p++}`);
      values.push(errorMessage);
    }

    const { rows } = await pool.query(
      `UPDATE job_applications SET ${setClauses.join(', ')} WHERE id = $1 RETURNING *`,
      values,
    );
    if(rows.length === 0) throw new AppError(404, 'Application not found');
    res.json(rows[0]);
  }),
);


// ======== Pipeline Runs ========

pipelineRouter.post(
  '/runs',
  requireServiceAuth,
  validate(createRunSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { component, metadata } = req.body;
    const userId = req.query.userId as string | undefined;
    if(!userId) throw new AppError(400, 'userId query param required');

    const { rows: [run] } = await pool.query(
      `INSERT INTO pipeline_runs (user_id, component, status, metadata)
       VALUES ($1, $2, 'running', $3)
       RETURNING *`,
      [userId, component, metadata ?? null],
    );
    res.status(201).json(run);
  }),
);

pipelineRouter.patch(
  '/runs/:id',
  requireServiceAuth,
  validate(updateRunSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { status, itemsProcessed, itemsSucceeded, itemsFailed, errorMessage, metadata } = req.body;

    const setClauses = ['status = $2'];
    const values: unknown[] = [req.params.id, status];
    let p = 3;

    if(['completed', 'failed', 'partial'].includes(status)){
      setClauses.push(`completed_at = $${p++}`);
      values.push(new Date());
    }
    if(itemsProcessed !== undefined){ setClauses.push(`items_processed = $${p++}`); values.push(itemsProcessed); }
    if(itemsSucceeded !== undefined){ setClauses.push(`items_succeeded = $${p++}`); values.push(itemsSucceeded); }
    if(itemsFailed !== undefined){ setClauses.push(`items_failed = $${p++}`); values.push(itemsFailed); }
    if(errorMessage !== undefined){ setClauses.push(`error_message = $${p++}`); values.push(errorMessage); }
    if(metadata !== undefined){ setClauses.push(`metadata = $${p++}`); values.push(metadata); }

    const { rows } = await pool.query(
      `UPDATE pipeline_runs SET ${setClauses.join(', ')} WHERE id = $1 RETURNING *`,
      values,
    );
    if(rows.length === 0) throw new AppError(404, 'Pipeline run not found');
    res.json(rows[0]);
  }),
);

pipelineRouter.get(
  '/runs',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const { component, limit = '50' } = req.query as Record<string, string>;
    const pageSize = Math.min(200, Math.max(1, parseInt(limit, 10)));

    const conditions = ['user_id = $1'];
    const params: unknown[] = [req.userId];
    let p = 2;

    if(component){
      conditions.push(`component = $${p++}`);
      params.push(component);
    }

    const { rows } = await pool.query(
      `SELECT * FROM pipeline_runs
       WHERE ${conditions.join(' AND ')}
       ORDER BY started_at DESC
       LIMIT $${p}`,
      [...params, pageSize],
    );
    res.json(rows);
  }),
);


// ======== Manual Trigger (User auth) ========

pipelineRouter.post(
  '/trigger/:component',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const { component } = req.params;
    if(!['search', 'draft', 'submission'].includes(component)){
      throw new AppError(400, 'component must be one of: search, draft, submission');
    }

    const serviceUrlMap: Record<string, string | undefined> = {
      search: process.env.SEARCH_SERVICE_URL,
      draft: process.env.DRAFT_SERVICE_URL,
      submission: process.env.SUBMISSION_SERVICE_URL,
    };
    const serviceUrl = serviceUrlMap[component];
    if(!serviceUrl){
      throw new AppError(503, `${component} service URL not configured`);
    }

    // Create a run record before calling the service
    const { rows: [run] } = await pool.query(
      `INSERT INTO pipeline_runs (user_id, component, status, metadata)
       VALUES ($1, $2, 'running', $3)
       RETURNING *`,
      [req.userId, component, { triggered_by: 'manual' }],
    );

    // Fire-and-forget: call Python service /trigger endpoint
    fetch(`${serviceUrl}/trigger`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SERVICE_API_KEY}`,
      },
      body: JSON.stringify({ userId: req.userId, runId: run.id }),
    }).catch(() => {
      // Service call failure => run record already created
      pool.query(
        `UPDATE pipeline_runs SET status = 'failed', error_message = 'Service unreachable', completed_at = NOW()
         WHERE id = $1`,
        [run.id],
      );
    });

    res.status(202).json({ runId: run.id, component, status: 'running' });
  }),
);
