import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001';

const companies = [
  { name: 'TechFlow Inc', industry: 'Software', website: 'https://techflow.io' },
  { name: 'DataBridge Corp', industry: 'Data & Analytics', website: 'https://databridge.com' },
  { name: 'Cloudvane Technologies', industry: 'Cloud Infrastructure', website: 'https://cloudvane.io' },
  { name: 'Meridian Health Tech', industry: 'Health Technology', website: 'https://meridianhealth.tech' },
  { name: 'Stratos Engineering', industry: 'Software', website: 'https://stratos.dev' },
  { name: 'Nova Analytics', industry: 'Data & Analytics', website: 'https://novaanalytics.ai' },
  { name: 'Cascade Systems', industry: 'Enterprise Software', website: 'https://cascadesys.com' },
  { name: 'Vertex Labs', industry: 'AI/ML', website: 'https://vertexlabs.ai' },
];

async function seed() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    console.log('Seeding database...');

    // ── Demo user ──────────────────────────────────────────────────────────────
    const passwordHash = await bcrypt.hash('demo1234', 10);
    await pool.query(
      `INSERT INTO users (id, email, password_hash, full_name)
       VALUES ($1, 'demo@apptrack.dev', $2, 'Bob Boberts')
       ON CONFLICT (email) DO NOTHING`,
      [DEMO_USER_ID, passwordHash]
    );

    // ── Companies ─────────────────────────────────────────────────────────────
    const companyIds: Record<string, string> = {};
    for (const c of companies) {
      const { rows } = await pool.query(
        `INSERT INTO companies (user_id, name, industry, website)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, name) DO UPDATE SET industry = EXCLUDED.industry
         RETURNING id`,
        [DEMO_USER_ID, c.name, c.industry, c.website]
      );
      companyIds[c.name] = rows[0].id;
    }

    // ── Job Applications ──────────────────────────────────────────────────────
    const applications = [
      {
        company: 'TechFlow Inc',
        title: 'Junior Backend Engineer',
        status: 'interviewing',
        remote: true,
        salary_min: 85000, salary_max: 105000,
        date_saved: '2026-04-15', date_applied: '2026-04-20',
        url: 'https://techflow.io/careers/junior-backend',
      },
      {
        company: 'Cloudvane Technologies',
        title: 'Full Stack Engineer',
        status: 'offer',
        remote: true,
        salary_min: 95000, salary_max: 120000,
        date_saved: '2026-03-28', date_applied: '2026-04-01',
        url: 'https://cloudvane.io/jobs/fullstack',
      },
      {
        company: 'Meridian Health Tech',
        title: 'Software Developer',
        status: 'rejected',
        remote: false,
        salary_min: 75000, salary_max: 90000,
        date_saved: '2026-03-10', date_applied: '2026-03-15',
        url: 'https://meridianhealth.tech/careers',
      },
      {
        company: 'Cascade Systems',
        title: 'Full Stack Developer',
        status: 'interviewing',
        remote: true,
        salary_min: 90000, salary_max: 115000,
        date_saved: '2026-04-30', date_applied: '2026-05-05',
        url: 'https://cascadesys.com/jobs/fsd',
      },
      {
        company: 'DataBridge Corp',
        title: 'Software Engineer I',
        status: 'applied',
        remote: true,
        salary_min: 80000, salary_max: 100000,
        date_saved: '2026-05-08', date_applied: '2026-05-12',
        url: 'https://databridge.com/careers',
      },
      {
        company: 'Nova Analytics',
        title: 'Full Stack Developer',
        status: 'applied',
        remote: true,
        salary_min: 85000, salary_max: 105000,
        date_saved: '2026-05-10', date_applied: '2026-05-15',
        url: 'https://novaanalytics.ai/careers/fsd',
      },
      {
        company: 'Stratos Engineering',
        title: 'Junior Software Developer',
        status: 'applied',
        remote: false,
        salary_min: 70000, salary_max: 90000,
        date_saved: '2026-05-14', date_applied: '2026-05-18',
        url: 'https://stratos.dev/jobs',
      },
      {
        company: 'Vertex Labs',
        title: 'Software Engineer (Full Stack)',
        status: 'saved',
        remote: true,
        salary_min: 100000, salary_max: 130000,
        date_saved: '2026-05-20', date_applied: null,
        url: 'https://vertexlabs.ai/careers/swe',
      },
      {
        company: 'TechFlow Inc',
        title: 'Full Stack Engineer',
        status: 'saved',
        remote: true,
        salary_min: 90000, salary_max: 110000,
        date_saved: '2026-05-22', date_applied: null,
        url: 'https://techflow.io/careers/fullstack',
      },
      {
        company: 'DataBridge Corp',
        title: 'React Developer',
        status: 'withdrawn',
        remote: false,
        salary_min: 75000, salary_max: 95000,
        date_saved: '2026-04-01', date_applied: '2026-04-10',
        url: 'https://databridge.com/careers/react',
      },
    ];

    const appIds: string[] = [];
    for (const a of applications) {
      const { rows } = await pool.query(
        `INSERT INTO job_applications
           (user_id, company_id, job_title, status, url, salary_min, salary_max,
            remote, date_saved, date_applied)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING id`,
        [
          DEMO_USER_ID, companyIds[a.company], a.title, a.status, a.url,
          a.salary_min, a.salary_max, a.remote, a.date_saved, a.date_applied,
        ]
      );
      appIds.push(rows[0].id);
    }

    // ── Notes ─────────────────────────────────────────────────────────────────
    const notes = [
      { appIndex: 0, body: 'Phone screen went well, recruiter mentioned strong TypeScript a must. Prep Node.js system design for next round.' },
      { appIndex: 0, body: 'Tech round scheduled for May 28. Reviewed their GitHub, they use Express + Postgres heavily.' },
      { appIndex: 1, body: 'Offer received: $112k base + equity. Response deadline is June 1.' },
      { appIndex: 3, body: 'First interview done. Waiting on invite to second round.' },
      { appIndex: 7, body: 'Job posting closes June 6, need to polish resume and cover letter then apply.' },
    ];

    for (const n of notes) {
      await pool.query(
        `INSERT INTO application_notes (application_id, user_id, body)
         VALUES ($1, $2, $3)`,
        [appIds[n.appIndex], DEMO_USER_ID, n.body]
      );
    }

    // ── Contacts ──────────────────────────────────────────────────────────────
    await pool.query(
      `INSERT INTO contacts (user_id, company_id, application_id, name, email, role)
       VALUES
         ($1, $2, $3, 'Alan Turing', 'alan.turing@techflow.io', 'Engineering Lead'),
         ($1, $4, $5, 'Emil Post', 'emil.post@cascadesys.com', 'Senior Engineer'),
         ($1, $6, NULL, 'Geoffrey Hinton', 'geoffrey.hinton@vertexlabs.ai', 'Head of Engineering')`,
      [
        DEMO_USER_ID,
        companyIds['TechFlow Inc'],          appIds[0],
        companyIds['Cascade Systems'],       appIds[3],
        companyIds['Vertex Labs'],
      ]
    );

    // ── Reminders ─────────────────────────────────────────────────────────────
    await pool.query(
      `INSERT INTO reminders (application_id, user_id, message, due_at)
       VALUES
         ($1, $2, 'Send thank-you email to Emil at Cascade Systems', NOW() + INTERVAL '1 day'),
         ($3, $2, 'Follow up with Alan at TechFlow if no response by Thursday', NOW() + INTERVAL '3 days'),
         ($4, $2, 'Deadline: apply to Vertex Labs before post closes', NOW() + INTERVAL '12 days'),
         ($5, $2, 'Follow up on DataBridge app (no response in 2 weeks)', NOW() + INTERVAL '5 days')`,
      [appIds[3], DEMO_USER_ID, appIds[0], appIds[7], appIds[4]]
    );

    console.log('Done. Demo account: demo@apptrack.dev / demo1234');
  }
  catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  }
  finally {
    await pool.end();
  }
}

seed();
