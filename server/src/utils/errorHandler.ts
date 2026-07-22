import { Request, Response, NextFunction } from 'express';

interface AppError extends Error {
  status?: number;
  statusCode?: number;
  code?: string;
}

// mysql2 error codes that map to 409 Conflict
const CONFLICT_CODES = new Set(['ER_DUP_ENTRY', 'ER_ROW_IS_REFERENCED_2']);

// mysql2 / Node net error codes that map to 503 Service Unavailable
const UNAVAILABLE_CODES = new Set([
  'ECONNREFUSED',
  'ENOTFOUND',
  'ETIMEDOUT',
  'ECONNRESET',
  'ER_ACCESS_DENIED_ERROR',
]);

// User-facing messages for known DB error codes (safe to expose in any env)
const KNOWN_MESSAGES: Record<string, string> = {
  ER_DUP_ENTRY: 'A record with that value already exists.',
  ER_ROW_IS_REFERENCED_2: 'Cannot delete: this record is referenced by another resource.',
};

function resolveStatus(err: AppError): number {
  if (err.code && CONFLICT_CODES.has(err.code)) return 409;
  if (err.code && UNAVAILABLE_CODES.has(err.code)) return 503;
  // http-errors uses .status; some libs use .statusCode
  return err.status ?? err.statusCode ?? 500;
}

function resolveMessage(err: AppError): string {
  if (err.code && KNOWN_MESSAGES[err.code]) return KNOWN_MESSAGES[err.code];
  if (err.code && UNAVAILABLE_CODES.has(err.code)) return 'Database unavailable, please try again.';
  return process.env.NODE_ENV !== 'production'
    ? (err.message ?? 'Unexpected server error')
    : 'Something went wrong, please try again later';
}

export const globalError = (
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  const appErr = err as AppError;

  const statusCode = resolveStatus(appErr);
  const message = resolveMessage(appErr);

  console.error(`[Error] ${req.method} ${req.url}. ${message}`);

  res.status(statusCode).json({
    error: {
      status: statusCode,
      message,
      stack: process.env.NODE_ENV !== 'production' ? appErr.stack : undefined,
    },
  });
};
