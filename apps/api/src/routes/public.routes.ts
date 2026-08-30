import { Router } from 'express';
import { getPublicPatientProfile, getPublicPatientReceipt } from '../controllers/patient.controller';

const router = Router();

// Public routes do NOT require admin authentication
router.get('/public/patients/:token', getPublicPatientProfile);
router.get('/public/patients/:token/receipts/:receiptIdentifier', getPublicPatientReceipt);

export default router;

