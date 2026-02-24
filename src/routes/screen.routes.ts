import { Router, Response, NextFunction } from 'express';
import { validate, matchRequestSchema } from '../middleware/validate.middleware.js';
import { performScreening } from '../utils/screening.utils.js';
import { coveWebhookService } from '../services/cove-webhook.service.js';
import { screeningDbService } from '../services/screening-db.service.js';
import { screeningWebhookService } from '../services/screening-webhook.service.js';
import { config } from '../config/index.js';
import type { PartnerRequest } from '../middleware/api-key.middleware.js';
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

      // Validate batch size
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

      // Parse options from query params
      const options: MatchOptions = {
        dataset,
        limit: req.query['limit'] ? parseInt(req.query['limit'], 10) : 10,
        threshold: req.query['threshold'] ? parseFloat(req.query['threshold']) : 0.7,
        algorithm: req.query['algorithm'],
      };

      const response = await performScreening(queries, options);

      // Complete screening record
      const processingTimeMs = Date.now() - startTime;
      await screeningDbService.completeScreening({
        screeningId,
        response,
        processingTimeMs,
      });

      res.json({
        screeningId,
        ...response,
      });

      // Fire-and-forget webhook delivery to Cove
      coveWebhookService.send(response).catch((err: unknown) =>
        console.error('Cove webhook failed:', err)
      );

      // Fire-and-forget partner webhook delivery
      if (req.partnerId) {
        screeningWebhookService
          .sendWebhook(screeningId, req.partnerId, response)
          .catch((err: unknown) =>
            console.error('Partner screening webhook failed:', err)
          );
      }
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
