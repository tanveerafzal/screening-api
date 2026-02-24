import type { Request, Response, NextFunction } from 'express';
import type { ApiError } from '../types/index.js';
import { config } from '../config/index.js';

export function errorHandler(
  err: Error | ApiError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error('Error:', err);

  // Check if it's our API error
  if ('status' in err && typeof err.status === 'number') {
    const apiError = err as ApiError;
    res.status(apiError.status).json({
      error: apiError.message,
      detail: apiError.detail,
      ...(config.nodeEnv === 'development' && { stack: (err as Error).stack }),
    });
    return;
  }

  // Generic error
  res.status(500).json({
    error: 'Internal server error',
    ...(config.nodeEnv === 'development' && {
      message: err.message,
      stack: err.stack,
    }),
  });
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: 'Not found',
    path: req.path,
  });
}
