import { Request, Response, NextFunction } from 'express';
import { AppError } from '../lib/errors';

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction): void => {
  if(err instanceof AppError){
    res.status(err.statusCode).json({ error: err.message });
    return;
  }
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
};
