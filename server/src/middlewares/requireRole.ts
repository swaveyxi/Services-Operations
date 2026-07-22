import { Request, Response, NextFunction } from 'express';
import createError from 'http-errors';

export const requireRole =
  (...roles: string[]) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) throw createError(401, 'Unauthenticated.');
    const hasRole = roles.some((r) => req.user!.roles.includes(r));
    if (!hasRole) throw createError(403, 'Insufficient permissions.');
    next();
  };
