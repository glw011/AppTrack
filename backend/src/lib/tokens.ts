import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { pool } from '../db/pool';
import { AppError } from './errors';

export interface ApprovalTokenPayload {
  applicationId: string;
  userId: string;
  action: 'approve' | 'reject';
}

export function generateApprovalToken(payload: ApprovalTokenPayload): string {
  return jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '7d' });
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function storeApprovalToken(
  token: string,
  userId: string,
  applicationId: string,
): Promise<void> {
  const hash = hashToken(token);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await pool.query(
    `INSERT INTO approval_tokens (user_id, application_id, token_hash, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [userId, applicationId, hash, expiresAt],
  );
}

export async function validateAndConsumeToken(
  token: string,
): Promise<ApprovalTokenPayload> {
  let payload: ApprovalTokenPayload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET!) as ApprovalTokenPayload;
  } catch {
    throw new AppError(401, 'Invalid or expired approval token');
  }

  const hash = hashToken(token);
  const { rows } = await pool.query(
    `UPDATE approval_tokens
     SET used_at = NOW()
     WHERE token_hash = $1
       AND used_at IS NULL
       AND expires_at > NOW()
     RETURNING id`,
    [hash],
  );
  if(rows.length === 0){
    throw new AppError(410, 'Approval token has already been used or has expired');
  }

  return payload;
}

export function verifyTokenStructure(token: string): ApprovalTokenPayload {
  try{
    return jwt.verify(token, process.env.JWT_SECRET!) as ApprovalTokenPayload;
  }
  catch{
    throw new AppError(401, 'Invalid or expired approval token');
  }
}

export function verifyUserJwt(authorizationHeader: string): string {
  if(!authorizationHeader.startsWith('Bearer ')){
    throw new AppError(401, 'Missing or invalid authorization header');
  }
  try{
    const payload = jwt.verify(authorizationHeader.slice(7), process.env.JWT_SECRET!) as { userId: string };
    return payload.userId;
  }
  catch{
    throw new AppError(401, 'Invalid or expired token');
  }
}
