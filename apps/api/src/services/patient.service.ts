import crypto from 'crypto';
import { Patient, IPatient, IPatientImageMetadata } from '../models/Patient';
import { getNextSequenceValue } from '../models/Counter';
import { normalizePhoneNumber, getPhoneSearchVariations } from '../utils/phone';
import { getStorageService } from '../storage';
import { imageProcessorService } from './image-processor.service';
import { getDatabaseStatus } from '../config/database';
import { getNafijDB } from '../config/nafijdb';
import { withTimeout } from '../utils/async';
import { logger } from '../utils/logger';

export interface CreatePatientDTO {
  fullName: string;
  age: number;
  phone: string;
  patientProblem: string;
  email?: string;
  address?: string;
  village?: string;
  area?: string;
  district?: string;
  guardianName?: string;
  occupation?: string;
  reference?: string;
  profileImage?: string | IPatientImageMetadata;
  customFields?: Array<{
    fieldId?: any;
    key: string;
    value: any;
  }>;
  isPublic?: boolean;
  publicToken?: string;
}

export interface PatientFilterQuery {
  search?: string;
  page?: number;
  limit?: number;
}

// In-memory fallback store
const inMemoryPatients: any[] = [];
let inMemorySequence = 1000;

function extractDocs(result: any): any[] {
  if (!result) return [];
  if (Array.isArray(result)) return result.map((item) => item.data || item);
  if (Array.isArray(result.data)) return result.data.map((item: any) => item.data || item);
  if (Array.isArray(result.documents)) return result.documents.map((item: any) => item.data || item);
  if (Array.isArray(result.items)) return result.items.map((item: any) => item.data || item);
  return [];
}

export class PatientService {
  private storageService = getStorageService();

  private async getNextPatientNumber(): Promise<number> {
    const isDbConnected = getDatabaseStatus() === 'connected';
    if (isDbConnected) {
      const nextSeq = await getNextSequenceValue('patientNumber');
      return nextSeq < 1000 ? 1000 + nextSeq : nextSeq;
    }

    const nafijDb = getNafijDB();
    if (nafijDb) {
      try {
        const counterData = await withTimeout(
          nafijDb.quick.get<{ seq: number }>('counter_patientNumber'),
          2500,
          null
        );
        const currentSeq = counterData?.seq && counterData.seq >= 1000 ? counterData.seq : 1000;
        const nextSeq = currentSeq + 1;
        withTimeout(nafijDb.quick.set('counter_patientNumber', { seq: nextSeq }), 2500).catch(() => {});
        return nextSeq;
      } catch (err) {
        logger.warn('NafijDB counter lookup failed, falling back to local sequence', { err });
      }
    }

    inMemorySequence++;
    return inMemorySequence;
  }

  async findDuplicateByPhone(phone: string): Promise<any | null> {
    const normalized = normalizePhoneNumber(phone);
    if (!normalized) return null;

    const variations = getPhoneSearchVariations(phone);
    const isDbConnected = getDatabaseStatus() === 'connected';

    if (isDbConnected) {
      return await Patient.findOne({
        phone: { $in: variations.map((v) => new RegExp(`^${v.replace('+', '\\+')}$`, 'i')) }
      });
    }

    const nafijDb = getNafijDB();
    if (nafijDb) {
      try {
        const result = await withTimeout(
          nafijDb.collection<any>('patients').find({ limit: 100 }),
          2500,
          null
        );
        const list = extractDocs(result);
        return list.find((p) => variations.some((v) => p.phone === v || p.phone?.includes(phone))) || null;
      } catch (err) {
        logger.warn('NafijDB findDuplicateByPhone failed', { err });
      }
    }

    return inMemoryPatients.find((p) => variations.some((v) => p.phone === v || p.phone?.includes(phone))) || null;
  }

  async createPatient(data: CreatePatientDTO): Promise<any> {
    const patientNumber = await this.getNextPatientNumber();
    const normalizedPhone = normalizePhoneNumber(data.phone) || data.phone;
    const isDbConnected = getDatabaseStatus() === 'connected';

    const patientPayload = {
      ...data,
      patientNumber,
      phone: normalizedPhone,
      isPublic: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (isDbConnected) {
      const patient = new Patient(patientPayload);
      await patient.save();
      logger.info(`New patient created in MongoDB: #${patient.patientNumber} - ${patient.fullName}`);
      return patient;
    }

    const nafijDb = getNafijDB();
    if (nafijDb) {
      try {
        const doc = await withTimeout(
          nafijDb.collection<any>('patients').insert(patientPayload),
          3000,
          null
        );
        if (doc) {
          const created = (doc as any)?.data || doc;
          const newPatient = {
            ...patientPayload,
            _id: (created as any)?.id || (created as any)?._id || `nafij-${Date.now()}`,
            id: (created as any)?.id || (created as any)?._id || `nafij-${Date.now()}`
          };
          inMemoryPatients.unshift(newPatient);
          logger.info(`New patient created in NafijDB: #${patientNumber} - ${data.fullName}`);
          return newPatient;
        }
      } catch (err) {
        logger.error('Failed to insert patient into NafijDB, saving to memory fallback', { err });
      }
    }

    const localPatient = {
      ...patientPayload,
      _id: `mem-${Date.now()}`,
      id: `mem-${Date.now()}`
    };
    inMemoryPatients.unshift(localPatient);
    logger.info(`New patient saved to local session: #${patientNumber} - ${data.fullName}`);
    return localPatient;
  }

  async listPatients(query: PatientFilterQuery) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 10));
    const skip = (page - 1) * limit;
    const isDbConnected = getDatabaseStatus() === 'connected';

    if (isDbConnected) {
      let filter: any = {};
      if (query.search && query.search.trim()) {
        const search = query.search.trim();
        const numSearch = Number(search.replace('#', ''));
        const orConditions: any[] = [
          { fullName: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { patientProblem: { $regex: search, $options: 'i' } }
        ];
        if (!isNaN(numSearch)) {
          orConditions.push({ patientNumber: numSearch });
        }
        filter = { $or: orConditions };
      }

      const [patients, total] = await Promise.all([
        Patient.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
        Patient.countDocuments(filter)
      ]);

      return {
        patients,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
      };
    }

    let allPatients = [...inMemoryPatients];
    const nafijDb = getNafijDB();
    if (nafijDb) {
      try {
        const result = await nafijDb.collection<any>('patients').find({ limit: 100 });
        const list = extractDocs(result);
        if (list.length > 0) {
          allPatients = list;
        }
      } catch (err) {
        logger.warn('NafijDB listPatients failed, using memory store', { err });
      }
    }

    if (query.search && query.search.trim()) {
      const s = query.search.trim().toLowerCase();
      allPatients = allPatients.filter(
        (p) =>
          p.fullName?.toLowerCase().includes(s) ||
          p.phone?.toLowerCase().includes(s) ||
          p.patientProblem?.toLowerCase().includes(s) ||
          String(p.patientNumber) === s.replace('#', '')
      );
    }

    const total = allPatients.length;
    const paginated = allPatients.slice(skip, skip + limit);

    return {
      patients: paginated,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1
      }
    };
  }

  async getPatientByNumberOrId(identifier: string): Promise<any | null> {
    const isDbConnected = getDatabaseStatus() === 'connected';
    const num = Number(identifier.replace('#', ''));

    if (isDbConnected) {
      if (!isNaN(num)) {
        const patient = await Patient.findOne({ patientNumber: num });
        if (patient) return patient;
      }
      try {
        return await Patient.findById(identifier);
      } catch {
        return null;
      }
    }

    const nafijDb = getNafijDB();
    if (nafijDb) {
      try {
        const result = await nafijDb.collection<any>('patients').find({ limit: 100 });
        const list = extractDocs(result);
        const found = list.find((p) => (!isNaN(num) && Number(p.patientNumber) === num) || p.id === identifier || p._id === identifier);
        if (found) return found;
      } catch (err) {
        logger.warn('NafijDB getPatientByNumberOrId lookup failed', { err });
      }
    }

    return (
      inMemoryPatients.find((p) => (!isNaN(num) && Number(p.patientNumber) === num) || p.id === identifier || p._id === identifier) || null
    );
  }

  async getPublicPatientByToken(token: string): Promise<any | null> {
    const isDbConnected = getDatabaseStatus() === 'connected';
    if (isDbConnected) {
      return await Patient.findOne({ publicToken: token, isPublic: true }).lean();
    }

    const nafijDb = getNafijDB();
    if (nafijDb) {
      try {
        const result = await nafijDb.collection<any>('patients').find({ limit: 100 });
        const list = extractDocs(result);
        const found = list.find((p) => p.publicToken === token && (p.isPublic === true || p.isPublic === 'true'));
        if (found) return found;
      } catch (err) {
        logger.warn('NafijDB getPublicPatientByToken lookup failed', { err });
      }
    }

    return inMemoryPatients.find((p) => p.publicToken === token && p.isPublic === true) || null;
  }

  async updatePatient(identifier: string, updates: Partial<CreatePatientDTO>): Promise<any | null> {
    const patient = await this.getPatientByNumberOrId(identifier);
    if (!patient) return null;

    if (updates.phone) {
      updates.phone = normalizePhoneNumber(updates.phone) || updates.phone;
    }

    const oldImage = patient.profileImage;
    const isReplacingImage = updates.profileImage && updates.profileImage !== oldImage;

    const isDbConnected = getDatabaseStatus() === 'connected';
    if (isDbConnected && typeof patient.save === 'function') {
      Object.assign(patient, updates);
      await patient.save();
    } else {
      Object.assign(patient, updates, { updatedAt: new Date().toISOString() });
      const nafijDb = getNafijDB();
      const docId = patient.id || patient._id;
      if (nafijDb && docId) {
        try {
          await nafijDb.collection('patients').update(docId, updates);
        } catch (err) {
          logger.warn('NafijDB update failed', { err });
        }
      }
    }

    if (isReplacingImage && oldImage && typeof oldImage === 'object' && oldImage.publicId) {
      this.storageService.delete(oldImage.publicId).catch((err) => {
        logger.warn(`Deferred deletion of previous asset ${oldImage.publicId} failed`, { err });
      });
    }

    logger.info(`Patient updated: #${patient.patientNumber} - ${patient.fullName}`);
    return patient;
  }

  async deletePatient(identifier: string): Promise<boolean> {
    const patient = await this.getPatientByNumberOrId(identifier);
    if (!patient) return false;

    const patientNum = Number(patient.patientNumber || identifier.replace('#', ''));
    const patientId = patient._id?.toString() || patient.id;

    // 1. Delete associated profile image from Cloudinary
    if (patient.profileImage && typeof patient.profileImage === 'object' && patient.profileImage.publicId) {
      this.storageService.delete(patient.profileImage.publicId).catch((err) => {
        logger.warn('Failed to delete image on patient deletion', { err });
      });
    }

    const isDbConnected = getDatabaseStatus() === 'connected';
    if (isDbConnected) {
      try {
        const orConditions: any[] = [];
        if (!isNaN(patientNum)) orConditions.push({ patientNumber: patientNum });
        if (patientId) orConditions.push({ patientId });

        // Cascade delete all linked receipts and appointments
        if (orConditions.length > 0) {
          const { Receipt: MongoReceipt } = await import('../models/Receipt');
          const { Appointment: MongoAppointment } = await import('../models/Appointment');
          await Promise.all([
            MongoReceipt.deleteMany({ $or: orConditions }),
            MongoAppointment.deleteMany({ $or: orConditions })
          ]);
        }

        if (!isNaN(patientNum)) {
          await Patient.deleteOne({ patientNumber: patientNum });
        } else if (patientId) {
          await Patient.findByIdAndDelete(patientId);
        }
        logger.info(`Patient and all clinical/financial records deleted from MongoDB: #${patient.patientNumber}`);
        return true;
      } catch (err) {
        logger.error('Error during MongoDB patient cascade deletion', { err });
      }
    }

    const nafijDb = getNafijDB();
    const docId = patient.id || patient._id;
    if (nafijDb && docId) {
      try {
        await nafijDb.collection('patients').delete(docId);
        logger.info(`Patient deleted from NafijDB: #${patient.patientNumber}`);
      } catch (err) {
        logger.warn('NafijDB delete patient failed', { err });
      }
    }

    const num = Number(identifier.replace('#', ''));
    const idx = inMemoryPatients.findIndex(
      (p) => (!isNaN(num) && Number(p.patientNumber) === num) || p.id === identifier || p._id === identifier
    );
    if (idx !== -1) {
      inMemoryPatients.splice(idx, 1);
    }

    logger.info(`Patient deleted: #${patient.patientNumber}`);
    return true;
  }

  async processAndUploadProfileImage(
    fileBuffer: Buffer,
    originalName: string,
    mimeType: string,
    patientIdentifier?: string
  ): Promise<IPatientImageMetadata> {
    const processed = await imageProcessorService.processProfileImage(fileBuffer, originalName, mimeType);
    let uploadResult: any;

    try {
      const publicIdPrefix = patientIdentifier ? `${patientIdentifier}/profile` : undefined;
      uploadResult = await this.storageService.upload(processed.tempFilePath, {
        fileName: processed.fileName,
        mimeType: processed.mimeType,
        folder: 'patient-dashboard/patients',
        publicId: publicIdPrefix
      });
    } finally {
      await imageProcessorService.removeTempFile(processed.tempFilePath);
    }

    return {
      provider: uploadResult.provider,
      publicId: uploadResult.publicId,
      secureUrl: uploadResult.secureUrl,
      width: uploadResult.width || processed.width,
      height: uploadResult.height || processed.height,
      format: uploadResult.format || 'webp',
      bytes: uploadResult.bytes || processed.sizeBytes
    };
  }

  async deleteProfileImage(identifier: string): Promise<any | null> {
    const patient = await this.getPatientByNumberOrId(identifier);
    if (!patient) return null;

    const currentImage = patient.profileImage;
    if (currentImage && typeof currentImage === 'object' && currentImage.publicId) {
      await this.storageService.delete(currentImage.publicId);
    }

    patient.profileImage = undefined;
    if (typeof patient.save === 'function') {
      await patient.save();
    } else {
      const nafijDb = getNafijDB();
      const docId = patient.id || patient._id;
      if (nafijDb && docId) {
        await nafijDb.collection('patients').update(docId, { profileImage: null });
      }
    }

    logger.info(`Profile image deleted for patient #${patient.patientNumber}`);
    return patient;
  }
}

export const patientService = new PatientService();
