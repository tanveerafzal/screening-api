import { Request, Response, NextFunction } from 'express';
import { config } from '../config/index.js';

export const apiKeyMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const apiKey =
    (req.query['apiKey'] as string | undefined) ||
    (req.headers['x-api-key'] as string | undefined);

  if (!apiKey) {
    res.status(401).json({
      error: 'Unauthorized',
      detail: 'Missing API key. Provide x-api-key header or apiKey query parameter.',
    });
    return;
  }

  if (apiKey !== config.apiKey) {
    res.status(401).json({
      error: 'Unauthorized',
      detail: 'Invalid API key.',
    });
    return;
  }

  next();
};
