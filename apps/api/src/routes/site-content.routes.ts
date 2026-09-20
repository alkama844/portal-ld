import { Router } from 'express';
import {
  getPublicSiteContent,
  getPublicSiteContentByPage,
  updateSiteContent,
  batchUpdateSiteContent
} from '../controllers/site-content.controller';
import { authenticateAdmin } from '../middleware/auth.middleware';

const router = Router();

// Publicly readable endpoints (No authentication required)
router.get('/site-content', getPublicSiteContent);
router.get('/site-content/:page', getPublicSiteContentByPage);

// Admin mutations (Require valid admin session)
router.put('/admin/site-content', authenticateAdmin, updateSiteContent);
router.post('/admin/site-content/batch', authenticateAdmin, batchUpdateSiteContent);

export default router;
