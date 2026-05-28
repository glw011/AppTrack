import { Router, Request, Response } from 'express';
import multer from 'multer';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { pool } from '../db/pool';
import { requireAuth } from '../middleware/auth';
import { asyncHandler } from '../lib/asyncHandler';
import { AppError } from '../lib/errors';

export const resumesRouter = Router();
resumesRouter.use(requireAuth);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    if(file.mimetype === 'application/pdf' || file.mimetype.startsWith('application/')){
      cb(null, true);
    } 
    else{
      cb(new AppError(400, 'Only PDF files are accepted') as unknown as null, false);
    }
  },
});

const s3 = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
const BUCKET = process.env.S3_BUCKET_NAME!;
const PRESIGNED_URL_TTL = 3600; // 1 hour


// ======== GET / ========
resumesRouter.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const { rows } = await pool.query(
      'SELECT * FROM resumes WHERE user_id = $1 ORDER BY uploaded_at DESC',
      [req.userId],
    );

    const resumesWithUrls = await Promise.all(
      rows.map(async r => ({
        ...r,
        download_url: await getSignedUrl(
          s3,
          new GetObjectCommand({ Bucket: BUCKET, Key: r.s3_key }),
          { expiresIn: PRESIGNED_URL_TTL },
        ),
      })),
    );

    res.json(resumesWithUrls);
  }),
);


// ======== POST /upload ========
resumesRouter.post(
  '/upload',
  upload.single('resume'),
  asyncHandler(async (req: Request, res: Response) => {
    if(!req.file) throw new AppError(400, 'No file uploaded');

    const s3Key = `resumes/${req.userId}/${Date.now()}-${req.file.originalname}`;

    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: s3Key,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
      }),
    );

    const { rows } = await pool.query(
      `INSERT INTO resumes (user_id, filename, s3_key, file_size_bytes)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.userId, req.file.originalname, s3Key, req.file.size],
    );

    res.status(201).json(rows[0]);
  }),
);

// ======== DELETE /:id ========
resumesRouter.delete(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { rows: [resume] } = await pool.query(
      'SELECT s3_key FROM resumes WHERE id = $1 AND user_id = $2',
      [req.params.id, req.userId],
    );
    if(!resume) throw new AppError(404, 'Resume not found');

    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: resume.s3_key }));

    await pool.query('DELETE FROM resumes WHERE id = $1', [req.params.id]);
    res.status(204).send();
  }),
);
