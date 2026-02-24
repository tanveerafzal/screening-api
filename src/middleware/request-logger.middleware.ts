import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../lib/prisma.js';

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      partnerId?: string;
    }
  }
}

export const requestLoggerMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const startTime = Date.now();
  const requestId = uuidv4();
  req.requestId = requestId;

  res.on('finish', () => {
    const processingTimeMs = Date.now() - startTime;
    const clientIp =
      req.ip ||
      req.socket.remoteAddress ||
      req.headers['x-forwarded-for']?.toString();
    const userAgent = req.headers['user-agent'];
    const queryParams =
      Object.keys(req.query).length > 0 ? JSON.stringify(req.query) : null;

    prisma.requestLogs
      .create({
        data: {
          requestId,
          method: req.method,
          path: req.path,
          queryParams,
          clientIp: clientIp?.substring(0, 45) ?? null,
          userAgent: userAgent?.substring(0, 500) ?? null,
          requestContentType: req.headers['content-type']?.substring(0, 100) ?? null,
          statusCode: res.statusCode,
          processingTimeMs: Math.round(processingTimeMs * 100) / 100,
          partnerId: req.partnerId ?? null,
        },
      })
      .catch((error: unknown) => {
        console.error('[RequestLogger] Failed to log request:', error);
      });
  });

  next();
};
