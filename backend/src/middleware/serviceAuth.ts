import { Request, Response, NextFunction } from 'express';
import { AppError } from '../lib/errors';

export function requireServiceAuth(req: Request, _res: Response, next: NextFunction): void {
  const apiKey = process.env.SERVICE_API_KEY;
  if(!apiKey){
    next(new AppError(500, 'Service API key not configured'));
    return;
  }
  const header = req.headers.authorization;
  if(!header?.startsWith('Bearer ')){
    next(new AppError(401, 'Missing or invalid authorization header'));
    return;
  }
  if(header.slice(7) !== apiKey){
    next(new AppError(401, 'Invalid service API key'));
    return;
  }
  next();
}
