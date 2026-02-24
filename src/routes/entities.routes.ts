import { Router, Request, Response, NextFunction } from 'express';
import { screeningService } from '../services/screening.service.js';

const router = Router();

/**
 * GET /entities/:entityId
 * Get a single entity by ID
 */
router.get(
  '/:entityId',
  async (
    req: Request<
      { entityId: string },
      unknown,
      unknown,
      { nested?: string }
    >,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { entityId } = req.params;
      const nested = req.query.nested !== 'false';

      const result = await screeningService.getEntity(entityId, nested);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
