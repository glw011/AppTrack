import { Request, Response, NextFunction, RequestHandler } from 'express';
import { ZodSchema } from 'zod';
import { AppError } from '../lib/errors';

export const validate = (schema: ZodSchema): RequestHandler => (req: Request, res: Response, next: NextFunction): void => {
  const result = schema.safeParse(req.body);
  if(!result.success){
    const message = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
    next(new AppError(400, message));
    return;
  }
  req.body = result.data;
  next();
};
