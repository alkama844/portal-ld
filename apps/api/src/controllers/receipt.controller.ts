import { Request, Response } from 'express';
import { receiptService } from '../services/receipt.service';
import { logger } from '../utils/logger';

export const createReceipt = async (req: Request, res: Response) => {
  try {
    const { 
      patientNumber, 
      items, 
      discount, 
      discountType, 
      paidAmount, 
      paymentMethod, 
      appointmentDate,
      appointmentTime,
      notes,
      previousDueSnapshot
    } = req.body;

    if (!patientNumber || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Patient number and at least one billable item are required.'
      });
    }

    const receipt = await receiptService.createReceipt({
      patientNumber: Number(patientNumber),
      items,
      discount: Number(discount) || 0,
      discountType: discountType || 'flat',
      paidAmount: Number(paidAmount) || 0,
      paymentMethod: paymentMethod || 'cash',
      appointmentDate,
      appointmentTime,
      notes,
      previousDueSnapshot: previousDueSnapshot !== undefined ? Number(previousDueSnapshot) : undefined
    });

    return res.status(201).json({
      success: true,
      message: `Invoice #${receipt.receiptNumber} created successfully`,
      data: receipt
    });
  } catch (error: any) {
    logger.error('Error creating invoice', { error });
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to create invoice'
    });
  }
};

export const updateReceipt = async (req: Request, res: Response) => {
  try {
    const { identifier } = req.params;
    const receipt = await receiptService.updateReceipt(identifier, req.body);

    return res.status(200).json({
      success: true,
      message: `Invoice #${receipt.receiptNumber} updated successfully`,
      data: receipt
    });
  } catch (error: any) {
    logger.error('Error updating receipt', { error });
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to update invoice'
    });
  }
};

export const cancelReceipt = async (req: Request, res: Response) => {
  try {
    const { identifier } = req.params;
    await receiptService.cancelReceipt(identifier);

    return res.status(200).json({
      success: true,
      message: `Invoice #${identifier} cancelled successfully`
    });
  } catch (error: any) {
    logger.error('Error cancelling receipt', { error });
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to cancel invoice'
    });
  }
};

export const recordInvoicePayment = async (req: Request, res: Response) => {
  try {
    const { patientNumber } = req.params;
    const { receiptNumber, amount, paymentMethod, notes } = req.body;

    if (!patientNumber || !amount || Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Patient number and positive payment amount are required.'
      });
    }

    const adminName = (req as any).user?.name || 'Admin';
    const result = await receiptService.recordInvoicePayment(Number(patientNumber), {
      receiptNumber,
      amount: Number(amount),
      paymentMethod,
      notes,
      recordedBy: adminName
    });

    return res.status(201).json({
      success: true,
      message: `Payment of ৳${amount} recorded successfully`,
      data: result
    });
  } catch (error: any) {
    logger.error('Error recording payment', { error });
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to record payment'
    });
  }
};

export const getPatientBalance = async (req: Request, res: Response) => {
  try {
    const { patientIdentifier } = req.params;
    const num = Number(String(patientIdentifier).replace('#', ''));
    if (isNaN(num)) {
      return res.status(400).json({ success: false, message: 'Invalid patient number' });
    }

    const balance = await receiptService.getPatientAccountBalance(num);
    return res.status(200).json({
      success: true,
      data: balance
    });
  } catch (error: any) {
    logger.error('Error getting patient balance', { error });
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve patient account balance'
    });
  }
};

export const listReceipts = async (req: Request, res: Response) => {
  try {
    const { search, page, limit } = req.query;
    const result = await receiptService.listReceipts({
      search: search as string,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined
    });

    return res.status(200).json({
      success: true,
      data: result.receipts,
      pagination: result.pagination
    });
  } catch (error: any) {
    logger.error('Error listing receipts', { error });
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve receipts'
    });
  }
};

export const getReceipt = async (req: Request, res: Response) => {
  try {
    const { identifier } = req.params;
    const receipt = await receiptService.getReceiptByNumberOrId(identifier);

    if (!receipt) {
      return res.status(404).json({
        success: false,
        message: `Receipt #${identifier} not found.`
      });
    }

    return res.status(200).json({
      success: true,
      data: receipt
    });
  } catch (error: any) {
    logger.error('Error getting receipt', { error });
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve receipt'
    });
  }
};

export const getPatientReceipts = async (req: Request, res: Response) => {
  try {
    const { patientIdentifier } = req.params;
    const receipts = await receiptService.getPatientReceipts(patientIdentifier);

    return res.status(200).json({
      success: true,
      data: receipts
    });
  } catch (error: any) {
    logger.error('Error getting patient receipts', { error });
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve patient receipts'
    });
  }
};

export const deleteReceipt = async (req: Request, res: Response) => {
  try {
    const { identifier } = req.params;
    await receiptService.deleteReceipt(identifier);

    return res.status(200).json({
      success: true,
      message: `Receipt #${identifier} deleted successfully`
    });
  } catch (error: any) {
    logger.error('Error deleting receipt', { error });
    return res.status(500).json({
      success: false,
      message: 'Failed to delete receipt'
    });
  }
};

export const addInvoicePayment = async (req: Request, res: Response) => {
  try {
    const { identifier } = req.params;
    const { amount, paymentMethod, paymentDate, paymentTime, notes } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Payment amount must be greater than 0.'
      });
    }

    const adminName = (req as any).user?.name || 'Admin';
    const result = await receiptService.addInvoicePayment(
      identifier,
      {
        amount: Number(amount),
        paymentMethod,
        paymentDate,
        paymentTime,
        notes,
        recordedBy: adminName
      },
      adminName
    );

    return res.status(201).json({
      success: true,
      message: `Payment of ৳${amount} recorded successfully`,
      data: result
    });
  } catch (error: any) {
    logger.error('Error adding invoice payment', { error });
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to add payment'
    });
  }
};

export const editInvoicePayment = async (req: Request, res: Response) => {
  try {
    const { identifier, paymentId } = req.params;
    const { amount, paymentMethod, paymentDate, paymentTime, notes, reason } = req.body;
    const adminName = (req as any).user?.name || 'Admin';

    const updated = await receiptService.editInvoicePayment(
      identifier,
      paymentId,
      {
        amount: amount !== undefined ? Number(amount) : undefined,
        paymentMethod,
        paymentDate,
        paymentTime,
        notes,
        reason,
        recordedBy: adminName
      },
      adminName
    );

    return res.status(200).json({
      success: true,
      message: 'Payment updated successfully',
      data: updated
    });
  } catch (error: any) {
    logger.error('Error editing invoice payment', { error });
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to edit payment'
    });
  }
};

export const reverseInvoicePayment = async (req: Request, res: Response) => {
  try {
    const { identifier, paymentId } = req.params;
    const { reason } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({
        success: false,
        message: 'A reason is required to reverse a payment.'
      });
    }

    const adminName = (req as any).user?.name || 'Admin';
    const updated = await receiptService.reverseInvoicePayment(
      identifier,
      paymentId,
      reason,
      adminName
    );

    return res.status(200).json({
      success: true,
      message: 'Payment reversed successfully',
      data: updated
    });
  } catch (error: any) {
    logger.error('Error reversing payment', { error });
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to reverse payment'
    });
  }
};

export const createAllPatientEntry = async (req: Request, res: Response) => {
  try {
    const { patientName, age, phone, location, amount, date, time, service, notes } = req.body;

    if (!patientName || !patientName.trim()) {
      return res.status(400).json({ success: false, message: 'Patient Name is required.', field: 'patientName' });
    }
    if (age === undefined || age === '' || isNaN(Number(age)) || Number(age) < 0) {
      return res.status(400).json({ success: false, message: 'Valid Age is required.', field: 'age' });
    }
    if (!phone || !phone.trim()) {
      return res.status(400).json({ success: false, message: 'Mobile Number is required.', field: 'phone' });
    }
    if (!location || !location.trim()) {
      return res.status(400).json({ success: false, message: 'Location is required.', field: 'location' });
    }
    if (amount === undefined || amount === '' || isNaN(Number(amount)) || Number(amount) < 0) {
      return res.status(400).json({ success: false, message: 'Amount is required.', field: 'amount' });
    }
    if (!date || !date.trim()) {
      return res.status(400).json({ success: false, message: 'Date is required.', field: 'date' });
    }
    if (!time || !time.trim()) {
      return res.status(400).json({ success: false, message: 'Time is required.', field: 'time' });
    }

    const result = await receiptService.createAllPatientEntry({
      patientName: patientName.trim(),
      age: Number(age),
      phone: phone.trim(),
      location: location.trim(),
      amount: Number(amount),
      date: date.trim(),
      time: time.trim(),
      service,
      notes
    });

    return res.status(201).json({
      success: true,
      message: `Patient entry #${result.entry.serial} created successfully`,
      data: result
    });
  } catch (error: any) {
    logger.error('Error creating All Patient entry', { error });
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to create patient entry'
    });
  }
};

export const listAllPatientEntries = async (req: Request, res: Response) => {
  try {
    const { search, sortBy, sortOrder, page, limit } = req.query;
    const result = await receiptService.listAllPatientEntries({
      search: search as string,
      sortBy: sortBy as any,
      sortOrder: sortOrder as any,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined
    });

    return res.status(200).json({
      success: true,
      data: result.entries,
      pagination: result.pagination
    });
  } catch (error: any) {
    logger.error('Error listing All Patient entries', { error });
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve all patient entries'
    });
  }
};

export const getPatientHistory = async (req: Request, res: Response) => {
  try {
    const { patientNumber } = req.params;
    const num = Number(String(patientNumber).replace('#', ''));
    if (isNaN(num)) {
      return res.status(400).json({ success: false, message: 'Invalid patient number' });
    }

    const result = await receiptService.getPatientHistoryEntries(num);
    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error: any) {
    logger.error('Error getting patient history entries', { error });
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve patient history'
    });
  }
};

