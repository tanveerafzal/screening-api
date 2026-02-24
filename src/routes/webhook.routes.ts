import { Router, Response, NextFunction } from 'express';
import { validate, matchRequestSchema } from '../middleware/validate.middleware.js';
import { performScreening } from '../utils/screening.utils.js';
import { coveWebhookService } from '../services/cove-webhook.service.js';
import { screeningDbService } from '../services/screening-db.service.js';
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
    const startTime = Date.now();
    let screeningId: string | undefined;

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

      // Create screening record
      const screening = await screeningDbService.createScreening({
        partnerId: req.partnerId,
        dataset,
        inputPayload: JSON.parse(JSON.stringify(queries)),
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
        queriesCount: queryCount,
      });
      screeningId = screening.id;

      const options: MatchOptions = {
        dataset,
        limit: req.query['limit'] ? parseInt(req.query['limit'], 10) : 10,
        threshold: req.query['threshold'] ? parseFloat(req.query['threshold']) : 0.7,
        algorithm: req.query['algorithm'],
      };

      const screeningResponse = await performScreening(queries, options);

      // Complete screening record
      const processingTimeMs = Date.now() - startTime;
      await screeningDbService.completeScreening({
        screeningId,
        response: screeningResponse,
        processingTimeMs,
      });

      const webhookResult = await coveWebhookService.send(screeningResponse);

      res.json({
        screeningId,
        screening: screeningResponse,
        webhook: webhookResult,
      });
    } catch (error) {
      if (screeningId) {
        const processingTimeMs = Date.now() - startTime;
        screeningDbService.failScreening(screeningId, processingTimeMs).catch((err: unknown) =>
          console.error('Failed to mark screening as failed:', err)
        );
      }
      next(error);
    }
  }
);

export default router;
