import { Router, Request, Response, NextFunction } from 'express';
import { screeningService } from '../services/screening.service.js';
import { validate, matchRequestSchema } from '../middleware/validate.middleware.js';
import type { MatchRequest, MatchOptions } from '../types/index.js';
import { config } from '../config/index.js';

const router = Router();

/**
 * POST /match/:dataset
 * Match entities against sanctions lists
 */
router.post(
  '/:dataset',
  validate(matchRequestSchema),
  async (
    req: Request<
      { dataset: string },
      unknown,
      MatchRequest,
      {
        limit?: string;
        threshold?: string;
        algorithm?: string;
        topics?: string | string[];
        include_dataset?: string | string[];
        exclude_dataset?: string | string[];
        exclude_schema?: string | string[];
      }
    >,
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
        limit: req.query.limit ? parseInt(req.query.limit, 10) : undefined,
        threshold: req.query.threshold
          ? parseFloat(req.query.threshold)
          : undefined,
        algorithm: req.query.algorithm,
        topics: Array.isArray(req.query.topics)
          ? req.query.topics
          : req.query.topics
            ? [req.query.topics]
            : undefined,
        includeDataset: Array.isArray(req.query.include_dataset)
          ? req.query.include_dataset
          : req.query.include_dataset
            ? [req.query.include_dataset]
            : undefined,
        excludeDataset: Array.isArray(req.query.exclude_dataset)
          ? req.query.exclude_dataset
          : req.query.exclude_dataset
            ? [req.query.exclude_dataset]
            : undefined,
      };

      const result = await screeningService.match(queries, options);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
