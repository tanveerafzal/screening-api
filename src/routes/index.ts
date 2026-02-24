import { Router } from 'express';
import matchRoutes from './match.routes.js';
import searchRoutes from './search.routes.js';
import entitiesRoutes from './entities.routes.js';
import screenRoutes from './screen.routes.js';
import webhookRoutes from './webhook.routes.js';
import systemRoutes from './system.routes.js';
import { apiKeyMiddleware } from '../middleware/api-key.middleware.js';

const router = Router();

// System routes (public — no auth required)
router.use('/', systemRoutes);

// Protected routes (require API key)
router.use('/match', apiKeyMiddleware, matchRoutes);
router.use('/search', apiKeyMiddleware, searchRoutes);
router.use('/screen', apiKeyMiddleware, screenRoutes);
router.use('/webhook', apiKeyMiddleware, webhookRoutes);
router.use('/entities', apiKeyMiddleware, entitiesRoutes);

export default router;
