import express from 'express';
import cors from 'cors';
import { authRouter } from './routes/auth';
import { applicationsRouter } from './routes/applications';
import { companiesRouter } from './routes/companies';
import { contactsRouter } from './routes/contacts';
import { remindersRouter } from './routes/reminders';
import { resumesRouter } from './routes/resumes';
import { pipelineRouter } from './routes/pipeline';
import { errorHandler } from './middleware/errorHandler';

export function createApp() {
  const app = express();

  app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }));
  app.use(express.json());

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  app.use('/api/auth', authRouter);
  app.use('/api/applications', applicationsRouter);
  app.use('/api/companies', companiesRouter);
  app.use('/api/contacts', contactsRouter);
  app.use('/api/reminders', remindersRouter);
  app.use('/api/resumes', resumesRouter);
  app.use('/api/pipeline', pipelineRouter);

  app.use(errorHandler);

  return app;
}
