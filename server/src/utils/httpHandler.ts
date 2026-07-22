import { Request, Response, NextFunction } from 'express';
import createError, { isHttpError } from 'http-errors';
import { getMatchedMethods } from './routeChecker';

//Request Logger
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  console.log(`[Request] ${req.method} ${req.url}`);
  next();
};

//Http Error Handlers
export const allowedMethods = (req: Request, res: Response, next: NextFunction): void => {
  const stack = req.app._router?.stack ?? [];
  const matchedMethods = getMatchedMethods(stack, req.path);

  if (matchedMethods.length > 0) {
    res.set('Allow', matchedMethods.join(', '));
    return next(createError(405, `Method ${req.method} not allowed on ${req.path}.`));
  }

  next();
};

export const notFound = (req: Request, res: Response, next: NextFunction): void => {
  next(createError(404, `Path not found ${req.url}`));
};

export const httpError = (err: unknown, req: Request, res: Response, next: NextFunction): void => {
  if (!isHttpError(err)) {
    return next(err);
  }
  const statusCode = err.statusCode ?? 500;
  const errorMessage = err.message ?? `An unexpected error occurred`;
  // Log to console
  console.error(
    `[Error] ${req.method} ${req.url} - Status: ${statusCode} - Message: ${errorMessage}`,
  );

  res.status(statusCode).json({
    error: {
      status: statusCode,
      message: errorMessage,
      stack: process.env.NODE_ENV === 'development' && isHttpError(err) ? err.stack : undefined,
    },
  });
};
