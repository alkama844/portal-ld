import crypto from 'crypto';
import { Request, Response } from 'express';
import { patientService } from '../services/patient.service';
import { receiptService } from '../services/receipt.service';
import { logger } from '../utils/logger';

export const createPatient = async (req: Request, res: Response) => {
  try {
    const { 
      fullName, 
      age, 
      phone, 
      patientProblem, 
      email, 
      address, 
      village, 
      area, 
      district, 
      guardianName, 
      occupation, 
      reference, 
      profileImage, 
      customFields 
    } = req.body;

    if (!fullName || age === undefined || !phone || !patientProblem) {
      return res.status(400).json({
        success: false,
        message: 'Full Name, Age, Phone Number, and Patient Problem are required.'
      });
    }

    const patient = await patientService.createPatient({
      fullName,
      age: Number(age),
      phone,
      patientProblem,
      email,
      address,
      village,
      area,
      district,
      guardianName,
      occupation,
      reference,
      profileImage,
      customFields
    });

    return res.status(201).json({
      success: true,
      message: 'Patient created successfully',
      data: patient
    });
  } catch (error: any) {
    logger.error('Error creating patient', { error });
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to save patient record'
    });
  }
};

export const listPatients = async (req: Request, res: Response) => {
  try {
    const { search, page, limit } = req.query;
    const result = await patientService.listPatients({
      search: search as string,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined
    });

    return res.status(200).json({
      success: true,
      data: result.patients,
      pagination: result.pagination
    });
  } catch (error: any) {
    logger.error('Error fetching patients', { error });
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve patient records'
    });
  }
};

export const getPatient = async (req: Request, res: Response) => {
  try {
    const { identifier } = req.params;
    const patient = await patientService.getPatientByNumberOrId(identifier);

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: `Patient #${identifier} not found.`
      });
    }

    return res.status(200).json({
      success: true,
      data: patient
    });
  } catch (error: any) {
    logger.error('Error retrieving patient profile', { error });
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve patient profile'
    });
  }
};

export const updatePatient = async (req: Request, res: Response) => {
  try {
    const { identifier } = req.params;
    const patient = await patientService.updatePatient(identifier, req.body);

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: `Patient #${identifier} not found.`
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Patient updated successfully',
      data: patient
    });
  } catch (error: any) {
    logger.error('Error updating patient', { error });
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update patient record'
    });
  }
};

export const deletePatient = async (req: Request, res: Response) => {
  try {
    const { identifier } = req.params;
    const success = await patientService.deletePatient(identifier);

    if (!success) {
      return res.status(404).json({
        success: false,
        message: `Patient #${identifier} not found.`
      });
    }

    return res.status(200).json({
      success: true,
      message: `Patient #${identifier} and all clinical records deleted successfully.`
    });
  } catch (error: any) {
    logger.error('Error deleting patient', { error });
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete patient record'
    });
  }
};

export const togglePatientShare = async (req: Request, res: Response) => {
  try {
    const { identifier } = req.params;
    const { isPublic } = req.body;

    const patient = await patientService.getPatientByNumberOrId(identifier);
    if (!patient) {
      return res.status(404).json({ success: false, message: `Patient #${identifier} not found.` });
    }

    const publicToken = isPublic ? crypto.randomBytes(12).toString('hex') : undefined;

    const updated = await patientService.updatePatient(identifier, {
      isPublic: Boolean(isPublic),
      publicToken
    } as any);

    return res.status(200).json({
      success: true,
      message: isPublic ? 'Patient profile is now public' : 'Patient profile is now private',
      data: updated
    });
  } catch (error: any) {
    logger.error('Error toggling patient visibility', { error });
    return res.status(500).json({ success: false, message: 'Failed to update patient visibility' });
  }
};

export const getPublicPatientProfile = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    if (!token) {
      return res.status(400).json({ success: false, message: 'Invalid public token.' });
    }

    const patient = await patientService.getPublicPatientByToken(token);
    if (!patient || !patient.isPublic) {
      return res.status(403).json({
        success: false,
        message: 'Access Denied. This patient profile is private.'
      });
    }

    // Securely retrieve receipts ONLY for this specific patient
    const receipts = await receiptService.getPatientReceipts(String(patient.patientNumber));

    return res.status(200).json({
      success: true,
      data: {
        fullName: patient.fullName,
        patientNumber: patient.patientNumber,
        age: patient.age,
        patientProblem: patient.patientProblem,
        profileImage: patient.profileImage,
        createdAt: patient.createdAt,
        isPublic: true,
        receipts: receipts.map((r) => ({
          receiptNumber: r.receiptNumber,
          createdAt: r.createdAt,
          appointmentDate: r.appointmentDate,
          appointmentTime: r.appointmentTime,
          items: r.items,
          subtotal: r.subtotal,
          discount: r.discount,
          totalAmount: r.totalAmount,
          paidAmount: r.paidAmount,
          dueAmount: r.dueAmount,
          paymentMethod: r.paymentMethod,
          paymentStatus: r.paymentStatus,
          notes: r.notes
        }))
      }
    });
  } catch (error: any) {
    logger.error('Error retrieving public profile', { error });
    return res.status(500).json({ success: false, message: 'Failed to retrieve public profile' });
  }
};

export const getPublicPatientReceipt = async (req: Request, res: Response) => {
  try {
    const { token, receiptIdentifier } = req.params;
    if (!token || !receiptIdentifier) {
      return res.status(400).json({ success: false, message: 'Token and receipt identifier are required.' });
    }

    const patient = await patientService.getPublicPatientByToken(token);
    if (!patient || !patient.isPublic) {
      return res.status(403).json({
        success: false,
        message: 'Access Denied. This patient profile is private.'
      });
    }

    const receipt = await receiptService.getReceiptByNumberOrId(receiptIdentifier);
    if (!receipt || Number(receipt.patientNumber) !== Number(patient.patientNumber)) {
      return res.status(404).json({
        success: false,
        message: 'Receipt not found or does not belong to this patient.'
      });
    }

    return res.status(200).json({
      success: true,
      data: receipt
    });
  } catch (error: any) {
    logger.error('Error retrieving public receipt', { error });
    return res.status(500).json({ success: false, message: 'Failed to retrieve public receipt' });
  }
};

export const checkDuplicatePhone = async (req: Request, res: Response) => {
  try {
    const { phone } = req.params;
    const existing = await patientService.findDuplicateByPhone(phone);

    return res.status(200).json({
      success: true,
      exists: Boolean(existing),
      data: existing
        ? {
            id: existing._id || existing.id,
            patientNumber: existing.patientNumber,
            fullName: existing.fullName,
            phone: existing.phone,
            age: existing.age,
            patientProblem: existing.patientProblem
          }
        : null
    });
  } catch (error: any) {
    logger.error('Error checking duplicate phone', { error });
    return res.status(500).json({
      success: false,
      message: 'Failed to verify phone number'
    });
  }
};

export const uploadProfileImage = async (req: Request, res: Response) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided.'
      });
    }

    const { patientNumber } = req.query;

    const imageMetadata = await patientService.processAndUploadProfileImage(
      file.buffer,
      file.originalname,
      file.mimetype,
      patientNumber as string | undefined
    );

    return res.status(200).json({
      success: true,
      message: 'Image uploaded and optimized successfully',
      data: imageMetadata,
      url: imageMetadata.secureUrl
    });
  } catch (error: any) {
    logger.error('Error uploading profile image', { error });
    return res.status(400).json({
      success: false,
      message: error.message || 'Image upload failed'
    });
  }
};

export const deleteProfileImage = async (req: Request, res: Response) => {
  try {
    const { identifier } = req.params;
    const patient = await patientService.deleteProfileImage(identifier);

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: `Patient #${identifier} not found.`
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Profile image removed successfully',
      data: patient
    });
  } catch (error: any) {
    logger.error('Error deleting profile image', { error });
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to remove profile image'
    });
  }
};
