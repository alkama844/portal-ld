import { Router } from 'express';
import {
  createReceipt,
  updateReceipt,
  cancelReceipt,
  recordInvoicePayment,
  addInvoicePayment,
  editInvoicePayment,
  reverseInvoicePayment,
  getPatientBalance,
  listReceipts,
  getReceipt,
  getPatientReceipts,
  deleteReceipt,
  createAllPatientEntry,
  listAllPatientEntries,
  getPatientHistory
} from '../controllers/receipt.controller';
import { authenticateAdmin } from '../middleware/auth.middleware';

const router = Router();

// All receipt and all-patients endpoints require authentication
router.use('/receipts', authenticateAdmin);
router.use('/all-patients', authenticateAdmin);

// Receipts endpoints
router.get('/receipts', listReceipts);
router.post('/receipts', createReceipt);
router.put('/receipts/:identifier', updateReceipt);
router.patch('/receipts/:identifier', updateReceipt);
router.post('/receipts/:identifier/cancel', cancelReceipt);
router.post('/receipts/:identifier/payments', addInvoicePayment);
router.put('/receipts/:identifier/payments/:paymentId', editInvoicePayment);
router.post('/receipts/:identifier/payments/:paymentId/revert', reverseInvoicePayment);
router.post('/receipts/patient/:patientNumber/payments', recordInvoicePayment);
router.get('/receipts/patient/:patientIdentifier/balance', getPatientBalance);
router.get('/receipts/patient/:patientIdentifier', getPatientReceipts);
router.get('/receipts/:identifier', getReceipt);
router.delete('/receipts/:identifier', deleteReceipt);

// All Patients ledger endpoints
router.get('/all-patients', listAllPatientEntries);
router.post('/all-patients', createAllPatientEntry);
router.get('/all-patients/patient/:patientNumber', getPatientHistory);

export default router;

