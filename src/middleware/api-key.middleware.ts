import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';

export interface PartnerRequest extends Request {
  partnerId?: string;
}

export const apiKeyMiddleware = async (
  req: PartnerRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
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

    const partner = await prisma.partner.findUnique({
      where: { apiKey },
    });

    if (!partner) {
      res.status(401).json({
        error: 'Unauthorized',
        detail: 'Invalid API key.',
      });
      return;
    }

    if (!partner.isActive) {
      res.status(403).json({
        error: 'Forbidden',
        detail: 'Partner account is inactive.',
      });
      return;
    }

    req.partnerId = partner.id;
    next();
  } catch (error) {
    console.error('API key middleware error:', error);
    res.status(500).json({
      error: 'Internal server error',
      detail: 'Authentication check failed.',
    });
  }
};
