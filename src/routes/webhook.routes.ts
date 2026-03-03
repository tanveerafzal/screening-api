import { Router, Response, NextFunction } from 'express';
import { validate, matchRequestSchema } from '../middleware/validate.middleware.js';
import { performScreening } from '../utils/screening.utils.js';
import { coveWebhookService } from '../services/cove-webhook.service.js';
import { config } from '../config/index.js';
import type { PartnerRequest } from '../middleware/api-key.middleware.js';
import type { MatchRequest, MatchOptions } from '../types/index.js';

const router = Router();

/**
 * POST /webhook/cove/:dataset
 * Screen entities and deliver results to Cove webhook synchronously.
 */
router.post(
  '/cove/:dataset',
  validate(matchRequestSchema),
  async (
    req: PartnerRequest & {
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

      const queryCount = Object.keys(queries.queries).length;
      if (queryCount > config.maxBatchSize) {
        res.status(400).json({
          error: 'Batch size exceeded',
          detail: `Maximum batch size is ${config.maxBatchSize}, received ${queryCount}`,
        });
        return;
      }

      const options: MatchOptions = {
        dataset,
        limit: req.query['limit'] ? parseInt(req.query['limit'], 10) : 10,
        threshold: req.query['threshold'] ? parseFloat(req.query['threshold']) : 0.7,
        algorithm: req.query['algorithm'],
      };

      const screeningResponse = await performScreening(queries, options);
      const webhookResult = await coveWebhookService.send(screeningResponse);

      res.json({
        screening: screeningResponse,
        webhook: webhookResult,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
