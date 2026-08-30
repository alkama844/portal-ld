import { Router } from 'express';
import { getHealthStatus } from '../controllers/health.controller';

const router = Router();

// Matches both /health and /api/health
router.get('/', getHealthStatus);
router.get('/health', getHealthStatus);

export default router;
