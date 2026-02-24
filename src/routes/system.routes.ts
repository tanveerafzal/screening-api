import { Router, Request, Response, NextFunction } from 'express';
import { screeningService } from '../services/screening.service.js';

const router = Router();

/**
 * GET /healthz
 * Basic health check
 */
router.get(
  '/healthz',
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await screeningService.getHealth();
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /readyz
 * Readiness check (index is ready)
 */
router.get(
  '/readyz',
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await screeningService.getReadiness();
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /catalog
 * Get available datasets
 */
router.get(
  '/catalog',
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await screeningService.getCatalog();
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /algorithms
 * Get available matching algorithms
 */
router.get(
  '/algorithms',
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await screeningService.getAlgorithms();
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /info
 * Get service info (custom endpoint)
 */
router.get('/info', (_req: Request, res: Response): void => {
  const backendInfo = screeningService.getBackendInfo();
  res.json({
    service: 'screening-api',
    version: '1.0.0',
    backend: backendInfo.backend,
    backendUrl: backendInfo.url,
  });
});

export default router;
