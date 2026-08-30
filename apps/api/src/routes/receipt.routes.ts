import { Router } from 'express';
import {
  createReceipt,
  updateReceipt,
  listReceipts,
  getReceipt,
  getPatientReceipts,
  deleteReceipt
} from '../controllers/receipt.controller';
import { authenticateAdmin } from '../middleware/auth.middleware';

const router = Router();

// All receipt endpoints require authentication
router.use(authenticateAdmin);

router.get('/receipts', listReceipts);
router.post('/receipts', createReceipt);
router.put('/receipts/:identifier', updateReceipt);
router.patch('/receipts/:identifier', updateReceipt);
router.get('/receipts/patient/:patientIdentifier', getPatientReceipts);
router.get('/receipts/:identifier', getReceipt);
router.delete('/receipts/:identifier', deleteReceipt);

export default router;
