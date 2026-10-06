import { Router } from 'express';
import { getPublicPatientProfile, getPublicPatientReceipt, getPublicPatientByNumber } from '../controllers/patient.controller';

const router = Router();

// Public routes do NOT require admin authentication
router.get('/public/patient/:patientNumber', getPublicPatientByNumber);
router.get('/public/patients/:identifier', (req, res, next) => {
  const num = Number(req.params.identifier);
  if (!isNaN(num)) {
    return getPublicPatientByNumber(req, res);
  }
  return getPublicPatientProfile(req, res);
});
router.get('/public/patients/:token/receipts/:receiptIdentifier', getPublicPatientReceipt);

export default router;

