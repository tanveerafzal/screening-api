import { Router, Request, Response, NextFunction } from 'express';
import { validate, matchRequestSchema } from '../middleware/validate.middleware.js';
import { performScreening } from '../utils/screening.utils.js';
import { config } from '../config/index.js';
import type { MatchRequest, MatchOptions } from '../types/index.js';

const router = Router();

/**
 * POST /screen/:dataset
 * Smart screening — matches entities and returns categorized verdicts
 */
router.post(
  '/:dataset',
  validate(matchRequestSchema),
  async (
    req: Request & {
      params: { dataset: string };
      body: MatchRequest;
      query: { limit?: string; threshold?: string; algorithm?: string };
    },
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { dataset } = req.params;
      const queries = req.body;

      // Validate batch size
      const queryCount = Object.keys(queries.queries).length;
      if (queryCount > config.maxBatchSize) {
        res.status(400).json({
          error: 'Batch size exceeded',
          detail: `Maximum batch size is ${config.maxBatchSize}, received ${queryCount}`,
        });
        return;
      }

      // Parse options from query params
      const options: MatchOptions = {
        dataset,
        limit: req.query['limit'] ? parseInt(req.query['limit'], 10) : 10,
        threshold: req.query['threshold'] ? parseFloat(req.query['threshold']) : 0.7,
        algorithm: req.query['algorithm'],
      };

      const response = await performScreening(queries, options);

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
