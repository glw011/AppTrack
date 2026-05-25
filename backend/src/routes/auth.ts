import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from '../db/pool';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../lib/asyncHandler';
import { AppError } from '../lib/errors';
import { registerSchema, loginSchema } from '../schemas/auth.schemas';

export const authRouter = Router();

const signToken = (userId: string, email: string): string =>
  jwt.sign({ userId, email }, process.env.JWT_SECRET!, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

authRouter.post(
  '/register',
  validate(registerSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password, fullName } = req.body;

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if(existing.rows.length > 0) throw new AppError(409, 'Email already registered');

    const passwordHash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `INSERT INTO users (email, password_hash, full_name)
       VALUES ($1, $2, $3)
       RETURNING id, email, full_name, created_at`,
      [email, passwordHash, fullName ?? null],
    );

    const user = rows[0];
    res.status(201).json({ token: signToken(user.id, user.email), user });
  }),
);

authRouter.post(
  '/login',
  validate(loginSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;

    const { rows } = await pool.query(
      'SELECT id, email, full_name, password_hash, created_at FROM users WHERE email = $1',
      [email],
    );
    if(rows.length === 0) throw new AppError(401, 'Invalid email or password');

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if(!valid) throw new AppError(401, 'Invalid email or password');

    const { password_hash: _, ...userWithoutPassword } = user;
    res.json({ token: signToken(user.id, user.email), user: userWithoutPassword });
  }),
);

authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const { rows } = await pool.query(
      'SELECT id, email, full_name, created_at, updated_at FROM users WHERE id = $1',
      [req.userId],
    );
    if(rows.length === 0) throw new AppError(404, 'User not found');
    res.json(rows[0]);
  }),
);
