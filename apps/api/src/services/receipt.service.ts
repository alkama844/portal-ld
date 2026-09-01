import { Receipt as MongoReceipt } from '../models/Receipt';
import { getNextSequenceValue } from '../models/Counter';
import { getDatabaseStatus } from '../config/database';
import { getNafijDB } from '../config/nafijdb';
import { withTimeout } from '../utils/async';
import { patientService } from './patient.service';
import { appointmentService } from './appointment.service';
import { Receipt, ReceiptItem, PaymentMethod, PaymentStatus } from '@patient-portal/shared';
import { logger } from '../utils/logger';

export interface CreateReceiptDTO {
  patientNumber: number;
  items: Array<{
    name: string;
    description?: string;
    packageId?: string;
    price: number;
    quantity: number;
  }>;
  discount?: number;
  discountType?: 'flat' | 'percentage';
  paidAmount?: number;
  paymentMethod?: PaymentMethod;
  appointmentDate?: string;
  appointmentTime?: string;
  notes?: string;
  isNewReceipt?: boolean;
}

const inMemoryReceipts: Receipt[] = [];
let inMemoryReceiptSeq = 1000;

export class ReceiptService {
  private async getNextReceiptNumber(): Promise<number> {
    const isDbConnected = getDatabaseStatus() === 'connected';
    if (isDbConnected) {
      const nextSeq = await getNextSequenceValue('receiptNumber');
      return nextSeq < 1000 ? 1000 + nextSeq : nextSeq;
    }

    const nafijDb = getNafijDB();
    if (nafijDb) {
      try {
        const counterData = await withTimeout(
          nafijDb.quick.get<{ seq: number }>('counter_receiptNumber'),
          2500,
          null
        );
        const currentSeq = counterData?.seq && counterData.seq >= 1000 ? counterData.seq : 1000;
        const nextSeq = currentSeq + 1;
        withTimeout(nafijDb.quick.set('counter_receiptNumber', { seq: nextSeq }), 2500).catch(() => {});
        return nextSeq;
      } catch (err) {
        logger.warn('NafijDB receipt counter lookup failed, falling back to local sequence', { err });
      }
    }

    inMemoryReceiptSeq++;
    return inMemoryReceiptSeq;
  }

  async createReceipt(data: CreateReceiptDTO): Promise<Receipt> {
    const patient = await patientService.getPatientByNumberOrId(String(data.patientNumber));
    if (!patient) {
      throw new Error(`Patient #${data.patientNumber} not found.`);
    }

    if (!data.items || data.items.length === 0) {
      throw new Error('Receipt must have at least one line item or package.');
    }

    // Check if patient already has an existing active receipt (Singleton pattern)
    const existingReceipt = !data.isNewReceipt
      ? await this.getLatestPatientReceipt(patient.patientNumber)
      : null;

    // Calculate line items with totals
    const calculatedItems: ReceiptItem[] = data.items.map((item, index) => {
      const price = Math.max(0, Number(item.price) || 0);
      const quantity = Math.max(1, Number(item.quantity) || 1);
      return {
        id: item.packageId ? `pkg-${item.packageId}` : `item-${index + 1}`,
        name: item.name.trim(),
        description: item.description?.trim(),
        packageId: item.packageId,
        price,
        quantity,
        total: price * quantity
      };
    });

    const subtotal = calculatedItems.reduce((acc, curr) => acc + curr.total, 0);

    let discount = Math.max(0, Number(data.discount) || 0);
    if (data.discountType === 'percentage') {
      discount = Math.round((subtotal * Math.min(100, discount)) / 100);
    }
    if (discount > subtotal) {
      discount = subtotal;
    }

    const totalAmount = Math.max(0, subtotal - discount);
    const paidAmount = Math.max(0, Number(data.paidAmount) || 0);
    const dueAmount = Math.max(0, totalAmount - paidAmount);

    let paymentStatus: PaymentStatus = 'unpaid';
    if (dueAmount === 0 && totalAmount > 0) {
      paymentStatus = 'paid';
    } else if (paidAmount > 0 && dueAmount > 0) {
      paymentStatus = 'partial';
    } else if (totalAmount === 0) {
      paymentStatus = 'paid';
    }

    const paymentMethod: PaymentMethod = data.paymentMethod || 'cash';
    let appointmentId = existingReceipt?.appointmentId;

    // Handle Appointment integration: if date & time are provided, save or update appointment
    if (data.appointmentDate && data.appointmentTime) {
      try {
        if (existingReceipt?.appointmentId) {
          const updatedApt = await appointmentService.updateAppointment(existingReceipt.appointmentId, {
            appointmentDate: data.appointmentDate.trim(),
            appointmentTime: data.appointmentTime.trim(),
            category: calculatedItems[0]?.name || patient.patientProblem || 'General Consultation',
            notes: data.notes?.trim()
          });
          if (updatedApt) {
            appointmentId = updatedApt.id || updatedApt._id;
          }
        } else {
          const apt = await appointmentService.createAppointment({
            patientNumber: patient.patientNumber,
            appointmentDate: data.appointmentDate.trim(),
            appointmentTime: data.appointmentTime.trim(),
            category: calculatedItems[0]?.name || patient.patientProblem || 'General Consultation',
            notes: data.notes?.trim()
          });
          if (apt) {
            appointmentId = apt.id || apt._id;
          }
        }
      } catch (aptErr) {
        logger.warn('Could not auto-link appointment to receipt', { aptErr });
      }
    }

    const isDbConnected = getDatabaseStatus() === 'connected';

    // 1. UPDATE EXISTING RECEIPT (Singleton / Edit mode)
    if (existingReceipt) {
      const currentVersion = existingReceipt.version || 1;
      const historyEntry = {
        version: currentVersion,
        items: existingReceipt.items,
        subtotal: existingReceipt.subtotal,
        discount: existingReceipt.discount,
        totalAmount: existingReceipt.totalAmount,
        paidAmount: existingReceipt.paidAmount,
        dueAmount: existingReceipt.dueAmount,
        paymentMethod: existingReceipt.paymentMethod,
        paymentStatus: existingReceipt.paymentStatus,
        appointmentDate: existingReceipt.appointmentDate,
        appointmentTime: existingReceipt.appointmentTime,
        notes: existingReceipt.notes,
        updatedAt: new Date().toISOString()
      };

      const updatedHistory = Array.isArray(existingReceipt.history)
        ? [...existingReceipt.history, historyEntry]
        : [historyEntry];

      const updatedPayload: Receipt = {
        ...existingReceipt,
        items: calculatedItems,
        subtotal,
        discount,
        discountType: data.discountType || 'flat',
        totalAmount,
        paidAmount,
        dueAmount,
        paymentMethod,
        paymentStatus,
        appointmentId,
        appointmentDate: data.appointmentDate?.trim() || existingReceipt.appointmentDate,
        appointmentTime: data.appointmentTime?.trim() || existingReceipt.appointmentTime,
        notes: data.notes?.trim(),
        version: currentVersion + 1,
        history: updatedHistory,
        updatedAt: new Date().toISOString()
      };

      if (isDbConnected) {
        try {
          await MongoReceipt.findOneAndUpdate(
            { receiptNumber: String(existingReceipt.receiptNumber) },
            {
              items: calculatedItems.map((i) => ({
                description: i.name,
                packageId: i.packageId,
                amount: i.price,
                quantity: i.quantity
              })),
              subtotal,
              discount,
              discountType: data.discountType || 'flat',
              totalAmount,
              paidAmount,
              dueAmount,
              paymentMethod,
              paymentStatus: paymentStatus === 'unpaid' ? 'pending' : paymentStatus,
              appointmentDate: updatedPayload.appointmentDate,
              appointmentTime: updatedPayload.appointmentTime,
              notes: updatedPayload.notes,
              version: updatedPayload.version,
              $push: { history: historyEntry }
            },
            { new: true }
          );
          logger.info(`Receipt #${existingReceipt.receiptNumber} updated in MongoDB`);
        } catch (err) {
          logger.warn('Failed to update receipt in MongoDB', { err });
        }
      }

      const nafijDb = getNafijDB();
      if (nafijDb) {
        try {
          const docId = existingReceipt.id || existingReceipt._id;
          if (docId) {
            await withTimeout(nafijDb.collection('receipts').update(docId, updatedPayload), 3000).catch(() => {});
          }
        } catch (err) {
          logger.warn('NafijDB update receipt failed', { err });
        }
      }

      // Update in-memory
      const idx = inMemoryReceipts.findIndex((r) => r.receiptNumber === existingReceipt.receiptNumber);
      if (idx !== -1) {
        inMemoryReceipts[idx] = updatedPayload;
      } else {
        inMemoryReceipts.unshift(updatedPayload);
      }

      logger.info(`Receipt #${existingReceipt.receiptNumber} updated for patient #${patient.patientNumber}`);
      return updatedPayload;
    }

    // 2. CREATE NEW RECEIPT
    const receiptNumber = await this.getNextReceiptNumber();

    const receiptPayload: Receipt = {
      id: `rec-${receiptNumber}`,
      _id: `rec-${receiptNumber}`,
      receiptNumber,
      patientId: patient.id || patient._id,
      patientNumber: patient.patientNumber,
      patientName: patient.fullName,
      patientPhone: patient.phone,
      patientAge: patient.age,
      patientAddress: patient.address || patient.village || patient.district,
      patientProblem: patient.patientProblem,
      appointmentId,
      appointmentDate: data.appointmentDate?.trim(),
      appointmentTime: data.appointmentTime?.trim(),
      items: calculatedItems,
      subtotal,
      discount,
      discountType: data.discountType || 'flat',
      totalAmount,
      paidAmount,
      dueAmount,
      paymentMethod,
      paymentStatus,
      notes: data.notes?.trim(),
      version: 1,
      history: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (isDbConnected) {
      try {
        const mongoDoc = new MongoReceipt({
          receiptNumber: String(receiptNumber),
          patientId: patient._id || patient.id,
          patientNumber: patient.patientNumber,
          items: calculatedItems.map((i) => ({
            description: i.name,
            packageId: i.packageId,
            amount: i.price,
            quantity: i.quantity
          })),
          subtotal,
          discount,
          discountType: data.discountType || 'flat',
          totalAmount,
          paidAmount,
          dueAmount,
          paymentMethod,
          paymentStatus: paymentStatus === 'unpaid' ? 'pending' : paymentStatus,
          appointmentDate: receiptPayload.appointmentDate,
          appointmentTime: receiptPayload.appointmentTime,
          notes: receiptPayload.notes,
          version: 1,
          history: [],
          isCurrent: true
        });
        await mongoDoc.save();
        logger.info(`Receipt #${receiptNumber} saved to MongoDB`);
        return receiptPayload;
      } catch (err) {
        logger.warn('Failed to save to MongoDB receipt model, using cloud persistence', { err });
      }
    }

    const nafijDb = getNafijDB();
    if (nafijDb) {
      try {
        const created = await withTimeout(
          nafijDb.collection<any>('receipts').insert(receiptPayload),
          3000,
          null
        );
        if (created) {
          const doc = (created as any)?.data || created;
          const savedReceipt = {
            ...receiptPayload,
            id: (doc as any)?.id || (doc as any)?._id || receiptPayload.id,
            _id: (doc as any)?.id || (doc as any)?._id || receiptPayload._id
          };
          inMemoryReceipts.unshift(savedReceipt);
          logger.info(`Receipt #${receiptNumber} saved to NafijDB`);
          return savedReceipt;
        }
      } catch (err) {
        logger.error('NafijDB insert receipt failed, saving to memory', { err });
      }
    }

    inMemoryReceipts.unshift(receiptPayload);
    logger.info(`Receipt #${receiptNumber} saved to local session`);
    return receiptPayload;
  }

  async getLatestPatientReceipt(patientNumber: number): Promise<Receipt | null> {
    const isDbConnected = getDatabaseStatus() === 'connected';
    if (isDbConnected) {
      try {
        const doc = await MongoReceipt.findOne({ patientNumber, isCurrent: true })
          .sort({ createdAt: -1 })
          .populate('patientId')
          .lean();
        if (doc) {
          return this.mapMongoToReceipt(doc);
        }
      } catch (err) {
        logger.warn('MongoDB getLatestPatientReceipt lookup error', { err });
      }
    }

    const patientReceipts = await this.getPatientReceipts(String(patientNumber));
    return patientReceipts.length > 0 ? patientReceipts[0] : null;
  }

  async listReceipts(query: { search?: string; page?: number; limit?: number }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const isDbConnected = getDatabaseStatus() === 'connected';
    if (isDbConnected) {
      try {
        let filter: any = { isCurrent: true };
        if (query.search && query.search.trim()) {
          const s = query.search.trim();
          const numSearch = Number(s.replace('#', ''));
          const orConditions: any[] = [
            { receiptNumber: { $regex: s, $options: 'i' } }
          ];
          if (!isNaN(numSearch)) {
            orConditions.push({ patientNumber: numSearch });
          }
          filter.$or = orConditions;
        }

        const [docs, total] = await Promise.all([
          MongoReceipt.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('patientId').lean(),
          MongoReceipt.countDocuments(filter)
        ]);

        return {
          receipts: docs.map((d) => this.mapMongoToReceipt(d)),
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit) || 1
          }
        };
      } catch (err) {
        logger.warn('MongoDB listReceipts failed, falling back', { err });
      }
    }

    let allReceipts = [...inMemoryReceipts];

    const nafijDb = getNafijDB();
    if (nafijDb) {
      try {
        const res = await withTimeout<any>(nafijDb.collection<any>('receipts').find({ limit: 100 }), 3000, { data: [], pagination: { page: 1, limit: 100, total: 0, totalPages: 1 } });
        const list = Array.isArray(res) ? res : (res as any)?.data || (res as any)?.documents || [];
        if (list.length > 0) {
          allReceipts = list;
        }
      } catch (err) {
        logger.warn('NafijDB list receipts failed', { err });
      }
    }

    if (query.search && query.search.trim()) {
      const s = query.search.trim().toLowerCase();
      allReceipts = allReceipts.filter(
        (r) =>
          r.patientName?.toLowerCase().includes(s) ||
          r.patientPhone?.toLowerCase().includes(s) ||
          String(r.receiptNumber) === s.replace('#', '') ||
          String(r.patientNumber) === s.replace('#', '')
      );
    }

    const total = allReceipts.length;
    const paginated = allReceipts.slice(skip, skip + limit);

    return {
      receipts: paginated,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1
      }
    };
  }

  async getReceiptByNumberOrId(identifier: string): Promise<Receipt | null> {
    const num = Number(identifier.replace('#', ''));
    const isDbConnected = getDatabaseStatus() === 'connected';

    if (isDbConnected) {
      try {
        const filter: any = !isNaN(num)
          ? { $or: [{ receiptNumber: String(num) }, { receiptNumber: identifier }] }
          : { _id: identifier };

        const doc = await MongoReceipt.findOne(filter).populate('patientId').lean();
        if (doc) {
          return this.mapMongoToReceipt(doc);
        }
      } catch (err) {
        logger.warn('MongoDB getReceiptByNumberOrId failed', { err });
      }
    }

    const nafijDb = getNafijDB();
    if (nafijDb) {
      try {
        const res = await withTimeout<any>(nafijDb.collection<any>('receipts').find({ limit: 100 }), 2500, { data: [], pagination: { page: 1, limit: 100, total: 0, totalPages: 1 } });
        const list: Receipt[] = Array.isArray(res) ? res : (res as any)?.data || (res as any)?.documents || [];
        const found = list.find((r) => (!isNaN(num) && (Number(r.receiptNumber) === num || r.receiptNumber === String(num))) || r.id === identifier || r._id === identifier);
        if (found) return found;
      } catch (err) {
        logger.warn('NafijDB getReceipt lookup failed', { err });
      }
    }

    return (
      inMemoryReceipts.find((r) => (!isNaN(num) && (Number(r.receiptNumber) === num || r.receiptNumber === String(num))) || r.id === identifier || r._id === identifier) || null
    );
  }

  async getPatientReceipts(patientIdentifier: string): Promise<Receipt[]> {
    const num = Number(patientIdentifier.replace('#', ''));
    const isDbConnected = getDatabaseStatus() === 'connected';

    if (isDbConnected) {
      try {
        const filter: any = !isNaN(num) ? { patientNumber: num } : { patientId: patientIdentifier };
        const docs = await MongoReceipt.find(filter).sort({ createdAt: -1 }).populate('patientId').lean();
        if (docs && docs.length > 0) {
          return docs.map((d) => this.mapMongoToReceipt(d));
        }
      } catch (err) {
        logger.warn('MongoDB getPatientReceipts failed', { err });
      }
    }

    let list: Receipt[] = [...inMemoryReceipts];
    const nafijDb = getNafijDB();
    if (nafijDb) {
      try {
        const res = await withTimeout<any>(nafijDb.collection<any>('receipts').find({ limit: 100 }), 3000, { data: [], pagination: { page: 1, limit: 100, total: 0, totalPages: 1 } });
        const remoteList: Receipt[] = Array.isArray(res) ? res : (res as any)?.data || (res as any)?.documents || [];
        if (remoteList.length > 0) {
          list = remoteList;
        }
      } catch (err) {
        logger.warn('NafijDB getPatientReceipts failed', { err });
      }
    }

    return list.filter((r) => (!isNaN(num) && Number(r.patientNumber) === num) || r.patientId === patientIdentifier);
  }

  async deletePatientReceipts(patientNumber: number | string, patientId?: string): Promise<boolean> {
    const num = Number(String(patientNumber).replace('#', ''));
    const isDbConnected = getDatabaseStatus() === 'connected';

    if (isDbConnected) {
      try {
        const orConditions: any[] = [];
        if (!isNaN(num)) orConditions.push({ patientNumber: num });
        if (patientId) orConditions.push({ patientId: patientId });
        if (orConditions.length > 0) {
          await MongoReceipt.deleteMany({ $or: orConditions });
          logger.info(`Cascade deleted receipts for patient #${patientNumber}`);
        }
      } catch (err) {
        logger.warn('MongoDB deletePatientReceipts error', { err });
      }
    }

    const nafijDb = getNafijDB();
    if (nafijDb) {
      try {
        const patientReceipts = await this.getPatientReceipts(String(patientNumber));
        for (const r of patientReceipts) {
          const docId = r.id || r._id;
          if (docId) {
            await withTimeout(nafijDb.collection('receipts').delete(docId), 2500).catch(() => {});
          }
        }
      } catch (err) {
        logger.warn('NafijDB deletePatientReceipts failed', { err });
      }
    }

    for (let i = inMemoryReceipts.length - 1; i >= 0; i--) {
      const r = inMemoryReceipts[i];
      if ((!isNaN(num) && Number(r.patientNumber) === num) || (patientId && r.patientId === patientId)) {
        inMemoryReceipts.splice(i, 1);
      }
    }

    return true;
  }

  async deleteReceipt(identifier: string): Promise<boolean> {
    const num = Number(identifier.replace('#', ''));
    const isDbConnected = getDatabaseStatus() === 'connected';

    if (isDbConnected) {
      try {
        if (!isNaN(num)) {
          await MongoReceipt.deleteOne({ receiptNumber: String(num) });
        } else {
          await MongoReceipt.findByIdAndDelete(identifier);
        }
      } catch (err) {
        logger.warn('MongoDB deleteReceipt error', { err });
      }
    }

    const nafijDb = getNafijDB();
    if (nafijDb) {
      try {
        const receipt = await this.getReceiptByNumberOrId(identifier);
        const docId = receipt?.id || receipt?._id;
        if (docId) {
          await withTimeout(nafijDb.collection('receipts').delete(docId), 2500).catch(() => {});
        }
      } catch (err) {
        logger.warn('NafijDB deleteReceipt failed', { err });
      }
    }

    const idx = inMemoryReceipts.findIndex((r) => (!isNaN(num) && (Number(r.receiptNumber) === num || r.receiptNumber === String(num))) || r.id === identifier || r._id === identifier);
    if (idx !== -1) {
      inMemoryReceipts.splice(idx, 1);
    }
    return true;
  }

  private mapMongoToReceipt(doc: any): Receipt {
    const patientObj = doc.patientId && typeof doc.patientId === 'object' ? doc.patientId : null;
    return {
      id: doc._id?.toString() || doc.id,
      _id: doc._id?.toString() || doc._id,
      receiptNumber: doc.receiptNumber,
      patientId: patientObj ? patientObj._id?.toString() : doc.patientId?.toString(),
      patientNumber: doc.patientNumber || patientObj?.patientNumber,
      patientName: patientObj?.fullName || doc.patientName || 'Patient',
      patientPhone: patientObj?.phone || doc.patientPhone || '',
      patientAge: patientObj?.age,
      patientAddress: patientObj?.address || patientObj?.village || patientObj?.district,
      patientProblem: patientObj?.patientProblem,
      appointmentId: doc.appointmentId?.toString(),
      appointmentDate: doc.appointmentDate,
      appointmentTime: doc.appointmentTime,
      items: (doc.items || []).map((i: any, idx: number) => ({
        id: `item-${idx + 1}`,
        name: i.description || i.name,
        description: i.description,
        packageId: i.packageId?.toString(),
        price: i.amount || i.price || 0,
        quantity: i.quantity || 1,
        total: (i.amount || i.price || 0) * (i.quantity || 1)
      })),
      subtotal: doc.subtotal || 0,
      discount: doc.discount || 0,
      discountType: doc.discountType || 'flat',
      totalAmount: doc.totalAmount || 0,
      paidAmount: doc.paidAmount || 0,
      dueAmount: doc.dueAmount || 0,
      paymentMethod: doc.paymentMethod || 'cash',
      paymentStatus: doc.paymentStatus || 'pending',
      notes: doc.notes,
      version: doc.version || 1,
      history: doc.history || [],
      createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString(),
      updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : new Date().toISOString()
    };
  }
}

export const receiptService = new ReceiptService();
