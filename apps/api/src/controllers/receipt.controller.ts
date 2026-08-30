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
      isNewReceipt 
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
      isNewReceipt: Boolean(isNewReceipt)
    });

    return res.status(201).json({
      success: true,
      message: `Receipt #${receipt.receiptNumber} saved successfully`,
      data: receipt
    });
  } catch (error: any) {
    logger.error('Error creating/updating receipt', { error });
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to process receipt'
    });
  }
};

export const updateReceipt = async (req: Request, res: Response) => {
  try {
    const { identifier } = req.params;
    const existing = await receiptService.getReceiptByNumberOrId(identifier);

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: `Receipt #${identifier} not found.`
      });
    }

    const receipt = await receiptService.createReceipt({
      patientNumber: existing.patientNumber,
      items: req.body.items || existing.items,
      discount: req.body.discount !== undefined ? Number(req.body.discount) : existing.discount,
      discountType: req.body.discountType || existing.discountType,
      paidAmount: req.body.paidAmount !== undefined ? Number(req.body.paidAmount) : existing.paidAmount,
      paymentMethod: req.body.paymentMethod || existing.paymentMethod,
      appointmentDate: req.body.appointmentDate !== undefined ? req.body.appointmentDate : existing.appointmentDate,
      appointmentTime: req.body.appointmentTime !== undefined ? req.body.appointmentTime : existing.appointmentTime,
      notes: req.body.notes !== undefined ? req.body.notes : existing.notes,
      isNewReceipt: false
    });

    return res.status(200).json({
      success: true,
      message: `Receipt #${receipt.receiptNumber} updated successfully`,
      data: receipt
    });
  } catch (error: any) {
    logger.error('Error updating receipt', { error });
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to update receipt'
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
