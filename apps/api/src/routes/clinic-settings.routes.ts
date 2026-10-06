import { Router } from 'express';
import { getClinicSettings, updateClinicSettings, updateThemeColor } from '../controllers/clinic-settings.controller';
import { authenticateAdmin } from '../middleware/auth.middleware';

const router = Router();

// Publicly readable so printable receipts and portals can fetch clinic info
router.get('/settings/clinic', getClinicSettings);

// Updating requires admin authentication
router.put('/settings/clinic', authenticateAdmin, updateClinicSettings);
router.patch('/settings/clinic', authenticateAdmin, updateClinicSettings);

// Independent theme settings routes
router.put('/settings/theme', authenticateAdmin, updateThemeColor);
router.patch('/settings/theme', authenticateAdmin, updateThemeColor);

export default router;
