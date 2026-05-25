import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '../lib/errors';

export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  const header = req.headers.authorization;
  if(!header?.startsWith('Bearer ')){
    next(new AppError(401, 'Missing or invalid authorization header'));
    return;
  }
  try{
    const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET!) as { userId: string };
    req.userId = payload.userId;
    next();
  }
  catch{
    next(new AppError(401, 'Invalid or expired token'));
  }
};
