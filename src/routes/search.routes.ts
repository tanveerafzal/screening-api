import { Router, Request, Response, NextFunction } from 'express';
import { screeningService } from '../services/screening.service.js';
import type { SearchParams } from '../types/index.js';

const router = Router();

/**
 * GET /search/:dataset
 * Search for entities in sanctions lists
 */
router.get(
  '/:dataset',
  async (
    req: Request<
      { dataset: string },
      unknown,
      unknown,
      {
        q: string;
        schema?: string;
        limit?: string;
        offset?: string;
        countries?: string | string[];
        topics?: string | string[];
        datasets?: string | string[];
        fuzzy?: string;
        simple?: string;
      }
    >,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { dataset } = req.params;

      if (!req.query.q) {
        res.status(400).json({
          error: 'Validation error',
          detail: 'Query parameter "q" is required',
        });
        return;
      }

      const params: SearchParams = {
        q: req.query.q,
        schema: req.query.schema as SearchParams['schema'],
        limit: req.query.limit ? parseInt(req.query.limit, 10) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset, 10) : undefined,
        fuzzy: req.query.fuzzy === 'true',
        simple: req.query.simple === 'true',
        countries: Array.isArray(req.query.countries)
          ? req.query.countries
          : req.query.countries
            ? [req.query.countries]
            : undefined,
        topics: Array.isArray(req.query.topics)
          ? req.query.topics
          : req.query.topics
            ? [req.query.topics]
            : undefined,
        datasets: Array.isArray(req.query.datasets)
          ? req.query.datasets
          : req.query.datasets
            ? [req.query.datasets]
            : undefined,
      };

      const result = await screeningService.search(dataset, params);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
