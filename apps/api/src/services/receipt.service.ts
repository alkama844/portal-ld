import { Receipt as MongoReceipt } from '../models/Receipt';
import { AllPatientEntry as MongoAllPatientEntry } from '../models/AllPatientEntry';
import { getNextSequenceValue } from '../models/Counter';
import { getDatabaseStatus } from '../config/database';
import { getNafijDB } from '../config/nafijdb';
import { withTimeout } from '../utils/async';
import { getDhakaDateString } from '../utils/date-time';
import { patientService } from './patient.service';
import { appointmentService } from './appointment.service';
import { Receipt, ReceiptItem, PaymentMethod, PaymentStatus, InvoicePayment, PatientAccountBalance, AllPatientEntry } from '@patient-portal/shared';
import { logger } from '../utils/logger';

export interface CreateReceiptDTO {
  patientNumber: number;
  items: Array<{
    name: string;
    description?: string;
    packageId?: string;
    price: number;
    quantity: number;
    teeth?: string[];
  }>;
  discount?: number;
  discountType?: 'flat' | 'percentage';
  paidAmount?: number;
  paymentMethod?: PaymentMethod;
  appointmentDate?: string;
  appointmentTime?: string;
  notes?: string;
  previousDueSnapshot?: number;
  entrySerial?: string;
}

export interface UpdateReceiptDTO {
  items?: Array<{
    name: string;
    description?: string;
    packageId?: string;
    price: number;
    quantity: number;
    teeth?: string[];
  }>;
  discount?: number;
  discountType?: 'flat' | 'percentage';
  paidAmount?: number;
  paymentMethod?: PaymentMethod;
  appointmentDate?: string;
  appointmentTime?: string;
  notes?: string;
  status?: 'draft' | 'finalized' | 'partial' | 'paid' | 'cancelled';
}

const inMemoryReceipts: Receipt[] = [];
let inMemoryReceiptSeq = 1000;
const inMemoryAllPatientEntries: AllPatientEntry[] = [];
let inMemoryEntrySerialSeq = 0;

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

  /**
   * Calculate previous outstanding balance across all non-cancelled historical invoices for a patient
   */
  async getPatientOutstandingBalance(patientNumber: number): Promise<number> {
    const isDbConnected = getDatabaseStatus() === 'connected';
    if (isDbConnected) {
      try {
        const invoices = await MongoReceipt.find(
          { patientNumber, status: { $ne: 'cancelled' } },
          { totalAmount: 1, paidAmount: 1, dueAmount: 1, payments: 1 }
        ).lean();

        return invoices.reduce((sum, inv: any) => {
          let paidForInv = 0;
          if (Array.isArray(inv.payments) && inv.payments.length > 0) {
            const activePays = inv.payments.filter((p: any) => p.status !== 'reversed' && p.status !== 'voided');
            paidForInv = activePays.reduce((pSum: number, p: any) => pSum + (Number(p.amount) || 0), 0);
          } else {
            paidForInv = Number(inv.paidAmount) || 0;
          }
          const dueForInv = Math.max(0, (Number(inv.totalAmount) || 0) - paidForInv);
          return sum + dueForInv;
        }, 0);
      } catch (err) {
        logger.warn('Error calculating patient outstanding balance', { err });
      }
    }

    const localInvoices = inMemoryReceipts.filter(
      (r) => Number(r.patientNumber) === patientNumber && r.status !== 'cancelled'
    );
    return localInvoices.reduce((sum, inv) => {
      let paidForInv = 0;
      if (Array.isArray(inv.payments) && inv.payments.length > 0) {
        const activePays = inv.payments.filter((p) => p.status !== 'reversed' && p.status !== 'voided');
        paidForInv = activePays.reduce((pSum, p) => pSum + (Number(p.amount) || 0), 0);
      } else {
        paidForInv = Number(inv.paidAmount) || 0;
      }
      return sum + Math.max(0, (Number(inv.totalAmount) || 0) - paidForInv);
    }, 0);
  }

  /**
   * Complete financial summary for a patient
   */
  async getPatientAccountBalance(patientNumber: number): Promise<PatientAccountBalance> {
    const isDbConnected = getDatabaseStatus() === 'connected';
    if (isDbConnected) {
      try {
        const invoices = await MongoReceipt.find({
          patientNumber,
          status: { $ne: 'cancelled' }
        }).lean();

        let totalInvoiced = 0;
        let totalPaid = 0;
        let totalOutstanding = 0;

        for (const inv of invoices as any[]) {
          const invTotal = Number(inv.totalAmount) || 0;
          totalInvoiced += invTotal;

          let paidForInv = 0;
          if (Array.isArray(inv.payments) && inv.payments.length > 0) {
            const activePays = inv.payments.filter((p: any) => p.status !== 'reversed' && p.status !== 'voided');
            paidForInv = activePays.reduce((pSum: number, p: any) => pSum + (Number(p.amount) || 0), 0);
          } else {
            paidForInv = Number(inv.paidAmount) || 0;
          }
          totalPaid += paidForInv;
          totalOutstanding += Math.max(0, invTotal - paidForInv);
        }

        return {
          totalInvoiced,
          totalPaid,
          totalOutstanding,
          outstandingDue: totalOutstanding,
          remainingDue: totalOutstanding,
          invoiceCount: invoices.length
        };
      } catch (err) {
        logger.warn('Error fetching patient account balance', { err });
      }
    }

    const patientInvoices = inMemoryReceipts.filter(
      (r) => Number(r.patientNumber) === patientNumber && r.status !== 'cancelled'
    );
    let totalInvoiced = 0;
    let totalPaid = 0;
    let totalOutstanding = 0;
    for (const inv of patientInvoices) {
      const invTotal = Number(inv.totalAmount) || 0;
      totalInvoiced += invTotal;
      let paidForInv = 0;
      if (Array.isArray(inv.payments) && inv.payments.length > 0) {
        const activePays = inv.payments.filter((p) => p.status !== 'reversed' && p.status !== 'voided');
        paidForInv = activePays.reduce((pSum, p) => pSum + (Number(p.amount) || 0), 0);
      } else {
        paidForInv = Number(inv.paidAmount) || 0;
      }
      totalPaid += paidForInv;
      totalOutstanding += Math.max(0, invTotal - paidForInv);
    }

    return {
      totalInvoiced,
      totalPaid,
      totalOutstanding,
      outstandingDue: totalOutstanding,
      remainingDue: totalOutstanding,
      invoiceCount: patientInvoices.length
    };
  }

  /**
   * Create a NEW invoice event for a patient's visit (Multiple Invoices per Patient architecture)
   */
  async createReceipt(data: CreateReceiptDTO): Promise<Receipt> {
    const patient = await patientService.getPatientByNumberOrId(String(data.patientNumber));
    if (!patient) {
      throw new Error(`Patient #${data.patientNumber} not found.`);
    }

    if (!data.items || data.items.length === 0) {
      throw new Error('Receipt must have at least one line item or package.');
    }

    // 1. Calculate line items with totals
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
        total: price * quantity,
        teeth: Array.isArray(item.teeth) ? item.teeth : []
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

    // 2. Previous Due carry-forward calculation
    const previousDueSnapshot = data.previousDueSnapshot !== undefined
      ? Math.max(0, Number(data.previousDueSnapshot))
      : await this.getPatientOutstandingBalance(patient.patientNumber);

    const totalPayable = totalAmount + previousDueSnapshot;

    // 3. Paid Amount (Cash Deposit Now) & Resulting Dues
    const paidAmount = Math.max(0, Number(data.paidAmount) || 0);
    const dueAmount = Math.max(0, totalAmount - paidAmount);
    const resultingDue = Math.max(0, totalPayable - paidAmount);

    let paymentStatus: PaymentStatus = 'unpaid';
    if (dueAmount === 0 && totalAmount > 0) {
      paymentStatus = 'paid';
    } else if (paidAmount > 0 && dueAmount > 0) {
      paymentStatus = 'partial';
    } else if (totalAmount === 0) {
      paymentStatus = 'paid';
    }

    const paymentMethod: PaymentMethod = data.paymentMethod || 'cash';
    let appointmentId: string | undefined;

    // 4. Handle Appointment integration if appointmentDate & Time are specified
    if (data.appointmentDate && data.appointmentTime) {
      try {
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
      } catch (aptErr) {
        logger.warn('Could not auto-link appointment to new receipt', { aptErr });
      }
    }

    // 5. Generate unique invoice number
    const receiptNumber = await this.getNextReceiptNumber();
    const todayDhaka = getDhakaDateString();

    // 6. Record initial payment transaction if paidAmount > 0
    const initialPayments: InvoicePayment[] = [];
    if (paidAmount > 0) {
      initialPayments.push({
        id: `pay-${receiptNumber}-1`,
        receiptNumber: String(receiptNumber),
        patientId: patient.id || patient._id,
        patientNumber: patient.patientNumber,
        amount: paidAmount,
        paymentMethod,
        notes: 'Initial visit cash deposit',
        recordedBy: 'Admin',
        paymentDate: todayDhaka,
        paymentTime: data.appointmentTime || '10:30 AM',
        status: 'active',
        createdAt: new Date().toISOString()
      });
    }

    const receiptPayload: Receipt = {
      id: `rec-${receiptNumber}`,
      _id: `rec-${receiptNumber}`,
      receiptNumber,
      entrySerial: data.entrySerial,
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
      previousDueSnapshot,
      totalPayable,
      paidAmount,
      dueAmount,
      resultingDue,
      paymentMethod,
      paymentStatus,
      status: paymentStatus === 'paid' ? 'paid' : paymentStatus === 'partial' ? 'partial' : 'finalized',
      payments: initialPayments,
      notes: data.notes?.trim(),
      version: 1,
      history: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const isDbConnected = getDatabaseStatus() === 'connected';
    if (isDbConnected) {
      try {
        const mongoDoc = new MongoReceipt({
          receiptNumber: String(receiptNumber),
          entrySerial: data.entrySerial,
          patientId: patient._id || patient.id,
          patientNumber: patient.patientNumber,
          patientName: patient.fullName,
          patientPhone: patient.phone,
          items: calculatedItems.map((i) => ({
            description: i.name,
            packageId: i.packageId,
            amount: i.price,
            quantity: i.quantity,
            teeth: i.teeth || []
          })),
          subtotal,
          discount,
          discountType: data.discountType || 'flat',
          totalAmount,
          previousDueSnapshot,
          totalPayable,
          paidAmount,
          dueAmount,
          resultingDue,
          paymentMethod,
          paymentStatus: paymentStatus === 'unpaid' ? 'pending' : paymentStatus,
          status: receiptPayload.status,
          payments: initialPayments.map((p) => ({
            receiptNumber: String(receiptNumber),
            patientId: patient._id || patient.id,
            patientNumber: patient.patientNumber,
            amount: p.amount,
            paymentMethod: p.paymentMethod,
            notes: p.notes,
            recordedBy: p.recordedBy,
            paymentDate: p.paymentDate,
            paymentTime: p.paymentTime,
            status: 'active',
            createdAt: new Date()
          })),
          appointmentDate: receiptPayload.appointmentDate,
          appointmentTime: receiptPayload.appointmentTime,
          notes: receiptPayload.notes,
          version: 1,
          history: [],
          isCurrent: true
        });
        await mongoDoc.save();
        logger.info(`New Invoice #${receiptNumber} created in MongoDB for patient #${patient.patientNumber}`);
        return this.mapMongoToReceipt(mongoDoc.toObject());
      } catch (err) {
        logger.warn('Failed to save to MongoDB receipt model, using cloud persistence', { err });
      }
    }

    inMemoryReceipts.unshift(receiptPayload);
    logger.info(`Invoice #${receiptNumber} saved to memory for patient #${patient.patientNumber}`);
    return receiptPayload;
  }

  /**
   * Update an existing specific invoice (Does NOT create a second duplicate invoice)
   */
  async updateReceipt(identifier: string, data: UpdateReceiptDTO): Promise<Receipt> {
    const existing = await this.getReceiptByNumberOrId(identifier);
    if (!existing) {
      throw new Error(`Invoice #${identifier} not found.`);
    }

    // 1. Recalculate line items if provided
    let calculatedItems = existing.items;
    let subtotal = existing.subtotal;

    if (data.items && data.items.length > 0) {
      calculatedItems = data.items.map((item, index) => {
        const price = Math.max(0, Number(item.price) || 0);
        const quantity = Math.max(1, Number(item.quantity) || 1);
        return {
          id: item.packageId ? `pkg-${item.packageId}` : `item-${index + 1}`,
          name: item.name.trim(),
          description: item.description?.trim(),
          packageId: item.packageId,
          price,
          quantity,
          total: price * quantity,
          teeth: Array.isArray(item.teeth) ? item.teeth : (existing.items?.[index]?.teeth || [])
        };
      });
      subtotal = calculatedItems.reduce((acc, curr) => acc + curr.total, 0);
    }

    const discountType = data.discountType || existing.discountType || 'flat';
    let discount = data.discount !== undefined ? Math.max(0, Number(data.discount) || 0) : existing.discount;
    if (discountType === 'percentage') {
      discount = Math.round((subtotal * Math.min(100, discount)) / 100);
    }
    if (discount > subtotal) {
      discount = subtotal;
    }

    const totalAmount = Math.max(0, subtotal - discount);
    const previousDueSnapshot = existing.previousDueSnapshot || 0;
    const totalPayable = totalAmount + previousDueSnapshot;

    const paidAmount = data.paidAmount !== undefined ? Math.max(0, Number(data.paidAmount) || 0) : existing.paidAmount;
    const dueAmount = Math.max(0, totalAmount - paidAmount);
    const resultingDue = Math.max(0, totalPayable - paidAmount);

    let paymentStatus: PaymentStatus = 'unpaid';
    if (dueAmount === 0 && totalAmount > 0) {
      paymentStatus = 'paid';
    } else if (paidAmount > 0 && dueAmount > 0) {
      paymentStatus = 'partial';
    } else if (totalAmount === 0) {
      paymentStatus = 'paid';
    }

    const currentVersion = existing.version || 1;
    const historyEntry = {
      version: currentVersion,
      items: existing.items,
      subtotal: existing.subtotal,
      discount: existing.discount,
      totalAmount: existing.totalAmount,
      paidAmount: existing.paidAmount,
      dueAmount: existing.dueAmount,
      paymentMethod: existing.paymentMethod,
      paymentStatus: existing.paymentStatus,
      appointmentDate: existing.appointmentDate,
      appointmentTime: existing.appointmentTime,
      notes: existing.notes,
      updatedAt: new Date().toISOString()
    };

    const updatedHistory = Array.isArray(existing.history)
      ? [...existing.history, historyEntry]
      : [historyEntry];

    const updatedPayload: Receipt = {
      ...existing,
      items: calculatedItems,
      subtotal,
      discount,
      discountType,
      totalAmount,
      previousDueSnapshot,
      totalPayable,
      paidAmount,
      dueAmount,
      resultingDue,
      paymentMethod: data.paymentMethod || existing.paymentMethod,
      paymentStatus,
      status: data.status || (paymentStatus === 'paid' ? 'paid' : paymentStatus === 'partial' ? 'partial' : 'finalized'),
      appointmentDate: data.appointmentDate !== undefined ? data.appointmentDate.trim() : existing.appointmentDate,
      appointmentTime: data.appointmentTime !== undefined ? data.appointmentTime.trim() : existing.appointmentTime,
      notes: data.notes !== undefined ? data.notes.trim() : existing.notes,
      version: currentVersion + 1,
      history: updatedHistory,
      updatedAt: new Date().toISOString()
    };

    const isDbConnected = getDatabaseStatus() === 'connected';
    if (isDbConnected) {
      try {
        const num = Number(String(existing.receiptNumber).replace('#', ''));
        const filter = !isNaN(num)
          ? { $or: [{ receiptNumber: String(num) }, { receiptNumber: String(existing.receiptNumber) }] }
          : { _id: existing.id || existing._id };

        await MongoReceipt.findOneAndUpdate(
          filter,
          {
            items: calculatedItems.map((i) => ({
              description: i.name,
              packageId: i.packageId,
              amount: i.price,
              quantity: i.quantity,
              teeth: i.teeth || []
            })),
            subtotal,
            discount,
            discountType,
            totalAmount,
            previousDueSnapshot,
            totalPayable,
            paidAmount,
            dueAmount,
            resultingDue,
            paymentMethod: updatedPayload.paymentMethod,
            paymentStatus: paymentStatus === 'unpaid' ? 'pending' : paymentStatus,
            status: updatedPayload.status,
            appointmentDate: updatedPayload.appointmentDate,
            appointmentTime: updatedPayload.appointmentTime,
            notes: updatedPayload.notes,
            version: updatedPayload.version,
            $push: { history: historyEntry }
          },
          { new: true }
        );
        logger.info(`Invoice #${existing.receiptNumber} updated in MongoDB`);
      } catch (err) {
        logger.warn('Failed to update receipt in MongoDB', { err });
      }
    }

    const idx = inMemoryReceipts.findIndex((r) => String(r.receiptNumber) === String(existing.receiptNumber));
    if (idx !== -1) {
      inMemoryReceipts[idx] = updatedPayload;
    } else {
      inMemoryReceipts.unshift(updatedPayload);
    }

    return updatedPayload;
  }

  /**
   * Cancel an invoice (Status: 'cancelled'). Excluded from active revenue and due calculations.
   */
  async cancelReceipt(identifier: string): Promise<boolean> {
    const isDbConnected = getDatabaseStatus() === 'connected';
    const num = Number(String(identifier).replace('#', ''));
    const filter = !isNaN(num)
      ? { $or: [{ receiptNumber: String(num) }, { receiptNumber: identifier }] }
      : { _id: identifier };

    if (isDbConnected) {
      try {
        await MongoReceipt.findOneAndUpdate(filter, { status: 'cancelled', updatedAt: new Date() });
        logger.info(`Invoice #${identifier} cancelled`);
      } catch (err) {
        logger.error('Failed to cancel invoice in MongoDB', { err });
        throw err;
      }
    }

    const item = inMemoryReceipts.find(
      (r) => String(r.receiptNumber) === String(identifier) || r.id === identifier || r._id === identifier
    );
    if (item) {
      item.status = 'cancelled';
    }
    return true;
  }

  /**
   * Record a payment against a patient's invoice(s).
   * If receiptNumber is specified, applies directly to that invoice.
   * If omitted, applies oldest-first to unresolved invoices.
   */
  async recordInvoicePayment(
    patientNumber: number,
    data: {
      receiptNumber?: string;
      amount: number;
      paymentMethod?: PaymentMethod | string;
      notes?: string;
      recordedBy?: string;
    }
  ): Promise<{ appliedPayments: InvoicePayment[]; remainingUnallocated: number }> {
    const amount = Number(data.amount);
    if (!amount || amount <= 0) {
      throw new Error('Payment amount must be greater than 0.');
    }

    const method: PaymentMethod = (data.paymentMethod as PaymentMethod) || 'cash';
    const todayDhaka = getDhakaDateString();
    const recordedBy = data.recordedBy || 'Admin';

    // 1. If specific receipt targeted
    if (data.receiptNumber) {
      const receipt = await this.getReceiptByNumberOrId(data.receiptNumber);
      if (!receipt) {
        throw new Error(`Invoice #${data.receiptNumber} not found.`);
      }
      if (receipt.status === 'cancelled') {
        throw new Error(`Cannot record payment against cancelled invoice #${data.receiptNumber}.`);
      }

      const newPaid = (receipt.paidAmount || 0) + amount;
      const newDue = Math.max(0, receipt.totalAmount - newPaid);
      const newResulting = Math.max(0, (receipt.totalPayable || receipt.totalAmount) - newPaid);

      const paymentRecord: InvoicePayment = {
        receiptNumber: String(receipt.receiptNumber),
        patientId: receipt.patientId,
        patientNumber: receipt.patientNumber,
        amount,
        paymentMethod: method,
        notes: data.notes || 'Subsequent visit payment',
        recordedBy,
        paymentDate: todayDhaka,
        createdAt: new Date().toISOString()
      };

      const isDbConnected = getDatabaseStatus() === 'connected';
      if (isDbConnected) {
        await MongoReceipt.findOneAndUpdate(
          { receiptNumber: String(receipt.receiptNumber) },
          {
            paidAmount: newPaid,
            dueAmount: newDue,
            resultingDue: newResulting,
            paymentStatus: newDue === 0 ? 'paid' : 'partial',
            $push: { payments: paymentRecord }
          }
        );
      }

      return { appliedPayments: [paymentRecord], remainingUnallocated: 0 };
    }

    // 2. Oldest-first automatic payment allocation across unresolved invoices
    const allPatientInvoices = await this.getPatientReceipts(String(patientNumber));
    const activeUnpaid = allPatientInvoices
      .filter((r) => r.status !== 'cancelled' && (r.dueAmount || 0) > 0)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    let unallocated = amount;
    const applied: InvoicePayment[] = [];

    for (const inv of activeUnpaid) {
      if (unallocated <= 0) break;
      const invDue = inv.dueAmount || 0;
      const paymentToThis = Math.min(unallocated, invDue);

      const newPaid = (inv.paidAmount || 0) + paymentToThis;
      const newDue = Math.max(0, inv.totalAmount - newPaid);
      const newResulting = Math.max(0, (inv.totalPayable || inv.totalAmount) - newPaid);

      const paymentRecord: InvoicePayment = {
        receiptNumber: String(inv.receiptNumber),
        patientId: inv.patientId,
        patientNumber: inv.patientNumber,
        amount: paymentToThis,
        paymentMethod: method,
        notes: data.notes || `Allocated payment against Invoice #${inv.receiptNumber}`,
        recordedBy,
        paymentDate: todayDhaka,
        createdAt: new Date().toISOString()
      };

      const isDbConnected = getDatabaseStatus() === 'connected';
      if (isDbConnected) {
        await MongoReceipt.findOneAndUpdate(
          { receiptNumber: String(inv.receiptNumber) },
          {
            paidAmount: newPaid,
            dueAmount: newDue,
            resultingDue: newResulting,
            paymentStatus: newDue === 0 ? 'paid' : 'partial',
            $push: { payments: paymentRecord }
          }
        );
      }

      applied.push(paymentRecord);
      unallocated -= paymentToThis;
    }

    return { appliedPayments: applied, remainingUnallocated: unallocated };
  }

  async getLatestPatientReceipt(patientNumber: number): Promise<Receipt | null> {
    const receipts = await this.getPatientReceipts(String(patientNumber));
    return receipts.length > 0 ? receipts[0] : null;
  }

  async listReceipts(query: { search?: string; page?: number; limit?: number }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const isDbConnected = getDatabaseStatus() === 'connected';
    if (isDbConnected) {
      try {
        let filter: any = {};
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
          const mapped = this.mapMongoToReceipt(doc);
          if ((!mapped.patientName || mapped.patientName === 'Patient') && mapped.patientNumber) {
            try {
              const p = await patientService.getPatientByNumberOrId(String(mapped.patientNumber));
              if (p) {
                mapped.patientName = p.fullName;
                mapped.patientPhone = p.phone || mapped.patientPhone;
                mapped.patientAge = p.age || mapped.patientAge;
                mapped.patientAddress = p.address || p.village || p.district || mapped.patientAddress;
                mapped.patientProblem = p.patientProblem || mapped.patientProblem;
              }
            } catch {}
          }
          return mapped;
        }
      } catch (err) {
        logger.warn('MongoDB getReceiptByNumberOrId failed', { err });
      }
    }

    const memoryMatch = inMemoryReceipts.find(
      (r) =>
        (!isNaN(num) && (Number(r.receiptNumber) === num || r.receiptNumber === String(num))) ||
        r.id === identifier ||
        r._id === identifier
    ) || null;

    if (memoryMatch && (!memoryMatch.patientName || memoryMatch.patientName === 'Patient') && memoryMatch.patientNumber) {
      try {
        const p = await patientService.getPatientByNumberOrId(String(memoryMatch.patientNumber));
        if (p) {
          memoryMatch.patientName = p.fullName;
          memoryMatch.patientPhone = p.phone || memoryMatch.patientPhone;
        }
      } catch {}
    }

    return memoryMatch;
  }

  async getPatientReceipts(patientIdentifier: string): Promise<Receipt[]> {
    const num = Number(patientIdentifier.replace('#', ''));
    const isDbConnected = getDatabaseStatus() === 'connected';

    if (isDbConnected) {
      try {
        const filter: any = !isNaN(num) ? { patientNumber: num } : { patientId: patientIdentifier };
        const docs = await MongoReceipt.find(filter).sort({ createdAt: -1 }).populate('patientId').lean();
        if (docs && docs.length > 0) {
          const mappedList = docs.map((d) => this.mapMongoToReceipt(d));
          if (!isNaN(num) && mappedList.some((r) => !r.patientName || r.patientName === 'Patient')) {
            try {
              const p = await patientService.getPatientByNumberOrId(String(num));
              if (p) {
                for (const r of mappedList) {
                  if (!r.patientName || r.patientName === 'Patient') {
                    r.patientName = p.fullName;
                    r.patientPhone = p.phone || r.patientPhone;
                    r.patientAge = p.age || r.patientAge;
                    r.patientAddress = p.address || p.village || p.district || r.patientAddress;
                    r.patientProblem = p.patientProblem || r.patientProblem;
                  }
                }
              }
            } catch {}
          }
          return mappedList;
        }
      } catch (err) {
        logger.warn('MongoDB getPatientReceipts failed', { err });
      }
    }

    return inMemoryReceipts
      .filter((r) => (!isNaN(num) && Number(r.patientNumber) === num) || r.patientId === patientIdentifier)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
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

    const idx = inMemoryReceipts.findIndex(
      (r) =>
        (!isNaN(num) && (Number(r.receiptNumber) === num || r.receiptNumber === String(num))) ||
        r.id === identifier ||
        r._id === identifier
    );
    if (idx !== -1) {
      inMemoryReceipts.splice(idx, 1);
    }
    return true;
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

    for (let i = inMemoryReceipts.length - 1; i >= 0; i--) {
      const r = inMemoryReceipts[i];
      if ((!isNaN(num) && Number(r.patientNumber) === num) || (patientId && r.patientId === patientId)) {
        inMemoryReceipts.splice(i, 1);
      }
    }

    return true;
  }

  /**
   * Add a payment directly to an existing receipt
   */
  async addInvoicePayment(
    receiptIdentifier: string,
    data: {
      amount: number;
      paymentMethod?: PaymentMethod | string;
      paymentDate?: string;
      paymentTime?: string;
      recordedBy?: string;
      notes?: string;
    },
    adminUser: string = 'Admin'
  ): Promise<{ receipt: Receipt; payment: InvoicePayment }> {
    const amount = Number(data.amount);
    if (!amount || amount <= 0) {
      throw new Error('Payment amount must be greater than 0.');
    }

    const receipt = await this.getReceiptByNumberOrId(receiptIdentifier);
    if (!receipt) {
      throw new Error(`Invoice #${receiptIdentifier} not found.`);
    }
    if (receipt.status === 'cancelled') {
      throw new Error(`Cannot record payment against cancelled invoice #${receiptIdentifier}.`);
    }

    const todayDhaka = getDhakaDateString();
    const method: PaymentMethod = (data.paymentMethod as PaymentMethod) || 'cash';
    const paymentRecord: InvoicePayment = {
      id: `pay-${Date.now()}`,
      receiptNumber: String(receipt.receiptNumber),
      patientId: receipt.patientId,
      patientNumber: receipt.patientNumber,
      amount,
      paymentMethod: method,
      notes: data.notes || 'Additional payment installment',
      recordedBy: data.recordedBy || adminUser,
      paymentDate: data.paymentDate || todayDhaka,
      paymentTime: data.paymentTime || '',
      status: 'active',
      auditTrail: [
        {
          action: 'created',
          changedBy: adminUser,
          changedAt: new Date().toISOString(),
          newAmount: amount,
          reason: 'Initial payment creation'
        }
      ],
      createdAt: new Date().toISOString()
    };

    const currentPayments = Array.isArray(receipt.payments) ? [...receipt.payments] : [];
    currentPayments.push(paymentRecord);

    const activePayments = currentPayments.filter((p) => p.status !== 'reversed' && p.status !== 'voided');
    const newPaid = activePayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const newDue = Math.max(0, receipt.totalAmount - newPaid);
    const totalPayable = receipt.totalPayable !== undefined ? receipt.totalPayable : receipt.totalAmount + (receipt.previousDueSnapshot || 0);
    const newResulting = Math.max(0, totalPayable - newPaid);
    const newStatus: PaymentStatus = newDue === 0 ? 'paid' : newPaid > 0 ? 'partial' : 'pending';

    const isDbConnected = getDatabaseStatus() === 'connected';
    if (isDbConnected) {
      await MongoReceipt.findOneAndUpdate(
        { receiptNumber: String(receipt.receiptNumber) },
        {
          paidAmount: newPaid,
          dueAmount: newDue,
          resultingDue: newResulting,
          paymentStatus: newStatus,
          status: newStatus === 'paid' ? 'paid' : newStatus === 'partial' ? 'partial' : receipt.status,
          $push: {
            payments: {
              receiptNumber: String(receipt.receiptNumber),
              patientId: receipt.patientId,
              patientNumber: receipt.patientNumber,
              amount: paymentRecord.amount,
              paymentMethod: paymentRecord.paymentMethod,
              notes: paymentRecord.notes,
              recordedBy: paymentRecord.recordedBy,
              paymentDate: paymentRecord.paymentDate,
              paymentTime: paymentRecord.paymentTime,
              status: 'active',
              auditTrail: paymentRecord.auditTrail,
              createdAt: new Date()
            }
          }
        }
      );
    }

    const idx = inMemoryReceipts.findIndex((r) => String(r.receiptNumber) === String(receipt.receiptNumber));
    if (idx !== -1) {
      inMemoryReceipts[idx].payments = currentPayments;
      inMemoryReceipts[idx].paidAmount = newPaid;
      inMemoryReceipts[idx].dueAmount = newDue;
      inMemoryReceipts[idx].resultingDue = newResulting;
      inMemoryReceipts[idx].paymentStatus = newStatus;
    }

    const updated = await this.getReceiptByNumberOrId(receiptIdentifier);
    return { receipt: updated || receipt, payment: paymentRecord };
  }

  /**
   * Edit an existing payment transaction on a receipt
   */
  async editInvoicePayment(
    receiptIdentifier: string,
    paymentId: string,
    data: {
      amount?: number;
      paymentMethod?: string;
      paymentDate?: string;
      paymentTime?: string;
      recordedBy?: string;
      notes?: string;
      reason?: string;
    },
    adminUser: string = 'Admin'
  ): Promise<Receipt> {
    const receipt = await this.getReceiptByNumberOrId(receiptIdentifier);
    if (!receipt) {
      throw new Error(`Invoice #${receiptIdentifier} not found.`);
    }

    const payments = Array.isArray(receipt.payments) ? [...receipt.payments] : [];
    const targetIdx = payments.findIndex(
      (p) => String(p.id) === String(paymentId) || String(p._id) === String(paymentId)
    );
    if (targetIdx === -1) {
      throw new Error(`Payment transaction #${paymentId} not found on invoice #${receiptIdentifier}.`);
    }

    const targetPay = { ...payments[targetIdx] };
    if (targetPay.status === 'reversed' || targetPay.status === 'voided') {
      throw new Error('Cannot edit a reversed or voided payment transaction.');
    }

    const newAmount = data.amount !== undefined ? Math.max(0, Number(data.amount)) : targetPay.amount;
    const auditEntry = {
      action: 'edited' as const,
      changedBy: adminUser,
      changedAt: new Date().toISOString(),
      oldAmount: targetPay.amount,
      newAmount,
      oldPaymentMethod: targetPay.paymentMethod,
      newPaymentMethod: data.paymentMethod || targetPay.paymentMethod,
      oldPaymentDate: targetPay.paymentDate,
      newPaymentDate: data.paymentDate || targetPay.paymentDate,
      oldPaymentTime: targetPay.paymentTime,
      newPaymentTime: data.paymentTime || targetPay.paymentTime,
      reason: data.reason || 'Payment corrected by admin'
    };

    targetPay.amount = newAmount;
    if (data.paymentMethod) targetPay.paymentMethod = data.paymentMethod;
    if (data.paymentDate) targetPay.paymentDate = data.paymentDate;
    if (data.paymentTime !== undefined) targetPay.paymentTime = data.paymentTime;
    if (data.recordedBy) targetPay.recordedBy = data.recordedBy;
    if (data.notes !== undefined) targetPay.notes = data.notes;
    targetPay.auditTrail = [...(targetPay.auditTrail || []), auditEntry];
    targetPay.updatedAt = new Date().toISOString();

    payments[targetIdx] = targetPay;

    // Recalculate balances from active payments only
    const activePayments = payments.filter((p) => p.status !== 'reversed' && p.status !== 'voided');
    const newPaid = activePayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const newDue = Math.max(0, receipt.totalAmount - newPaid);
    const totalPayable = receipt.totalPayable !== undefined ? receipt.totalPayable : receipt.totalAmount + (receipt.previousDueSnapshot || 0);
    const newResulting = Math.max(0, totalPayable - newPaid);
    const newStatus: PaymentStatus = newDue === 0 ? 'paid' : newPaid > 0 ? 'partial' : 'pending';

    const isDbConnected = getDatabaseStatus() === 'connected';
    if (isDbConnected) {
      await MongoReceipt.findOneAndUpdate(
        { 
          receiptNumber: String(receipt.receiptNumber),
          'payments._id': targetPay._id || targetPay.id 
        },
        {
          $set: {
            'payments.$.amount': targetPay.amount,
            'payments.$.paymentMethod': targetPay.paymentMethod,
            'payments.$.paymentDate': targetPay.paymentDate,
            'payments.$.paymentTime': targetPay.paymentTime,
            'payments.$.recordedBy': targetPay.recordedBy,
            'payments.$.notes': targetPay.notes,
            'payments.$.updatedAt': new Date(),
            paidAmount: newPaid,
            dueAmount: newDue,
            resultingDue: newResulting,
            paymentStatus: newStatus,
            status: newStatus === 'paid' ? 'paid' : newStatus === 'partial' ? 'partial' : receipt.status
          },
          $push: {
            'payments.$.auditTrail': auditEntry
          }
        }
      );
    }

    const idx = inMemoryReceipts.findIndex((r) => String(r.receiptNumber) === String(receipt.receiptNumber));
    if (idx !== -1) {
      inMemoryReceipts[idx].payments = payments;
      inMemoryReceipts[idx].paidAmount = newPaid;
      inMemoryReceipts[idx].dueAmount = newDue;
      inMemoryReceipts[idx].resultingDue = newResulting;
      inMemoryReceipts[idx].paymentStatus = newStatus;
    }

    const updated = await this.getReceiptByNumberOrId(receiptIdentifier);
    return updated || receipt;
  }

  /**
   * Reverse/void an existing payment transaction safely with audit reason
   */
  async reverseInvoicePayment(
    receiptIdentifier: string,
    paymentId: string,
    reason: string,
    adminUser: string = 'Admin'
  ): Promise<Receipt> {
    if (!reason || !reason.trim()) {
      throw new Error('A reason is required to reverse a payment.');
    }

    const receipt = await this.getReceiptByNumberOrId(receiptIdentifier);
    if (!receipt) {
      throw new Error(`Invoice #${receiptIdentifier} not found.`);
    }

    const payments = Array.isArray(receipt.payments) ? [...receipt.payments] : [];
    const targetIdx = payments.findIndex(
      (p) => String(p.id) === String(paymentId) || String(p._id) === String(paymentId)
    );
    if (targetIdx === -1) {
      throw new Error(`Payment transaction #${paymentId} not found on invoice #${receiptIdentifier}.`);
    }

    const targetPay = { ...payments[targetIdx] };
    if (targetPay.status === 'reversed' || targetPay.status === 'voided') {
      throw new Error('This payment transaction has already been reversed.');
    }

    const auditEntry = {
      action: 'reversed' as const,
      changedBy: adminUser,
      changedAt: new Date().toISOString(),
      oldAmount: targetPay.amount,
      reason: reason.trim()
    };

    targetPay.status = 'reversed';
    targetPay.reversedAt = new Date().toISOString();
    targetPay.reversedBy = adminUser;
    targetPay.reversalReason = reason.trim();
    targetPay.auditTrail = [...(targetPay.auditTrail || []), auditEntry];
    targetPay.updatedAt = new Date().toISOString();

    payments[targetIdx] = targetPay;

    // Recalculate balances excluding the reversed payment
    const activePayments = payments.filter((p) => p.status !== 'reversed' && p.status !== 'voided');
    const newPaid = activePayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const newDue = Math.max(0, receipt.totalAmount - newPaid);
    const totalPayable = receipt.totalPayable !== undefined ? receipt.totalPayable : receipt.totalAmount + (receipt.previousDueSnapshot || 0);
    const newResulting = Math.max(0, totalPayable - newPaid);
    const newStatus: PaymentStatus = newDue === 0 ? 'paid' : newPaid > 0 ? 'partial' : 'pending';

    const isDbConnected = getDatabaseStatus() === 'connected';
    if (isDbConnected) {
      await MongoReceipt.findOneAndUpdate(
        { 
          receiptNumber: String(receipt.receiptNumber),
          'payments._id': targetPay._id || targetPay.id 
        },
        {
          $set: {
            'payments.$.status': 'reversed',
            'payments.$.reversedAt': new Date(),
            'payments.$.reversedBy': adminUser,
            'payments.$.reversalReason': reason.trim(),
            'payments.$.updatedAt': new Date(),
            paidAmount: newPaid,
            dueAmount: newDue,
            resultingDue: newResulting,
            paymentStatus: newStatus,
            status: newStatus === 'paid' ? 'paid' : newStatus === 'partial' ? 'partial' : receipt.status
          },
          $push: {
            'payments.$.auditTrail': auditEntry
          }
        }
      );
    }

    const idx = inMemoryReceipts.findIndex((r) => String(r.receiptNumber) === String(receipt.receiptNumber));
    if (idx !== -1) {
      inMemoryReceipts[idx].payments = payments;
      inMemoryReceipts[idx].paidAmount = newPaid;
      inMemoryReceipts[idx].dueAmount = newDue;
      inMemoryReceipts[idx].resultingDue = newResulting;
      inMemoryReceipts[idx].paymentStatus = newStatus;
    }

    const updated = await this.getReceiptByNumberOrId(receiptIdentifier);
    return updated || receipt;
  }

  /**
   * Generate sequential 4-digit Entry Serial (e.g. 0001, 0002)
   */
  async getNextEntrySerial(): Promise<string> {
    const isDbConnected = getDatabaseStatus() === 'connected';
    let seqNum = 1;
    if (isDbConnected) {
      seqNum = await getNextSequenceValue('entrySerial', 0);
    } else {
      inMemoryEntrySerialSeq++;
      seqNum = inMemoryEntrySerialSeq;
    }
    return String(seqNum).padStart(4, '0');
  }

  /**
   * Create an All Patients Ledger entry with validation and persistence
   */
  async createAllPatientEntry(data: {
    patientName: string;
    age: number;
    phone: string;
    location: string;
    amount: number;
    date: string;
    time: string;
    service?: string;
    notes?: string;
  }): Promise<{ entry: AllPatientEntry; receipt: Receipt }> {
    if (!data.patientName || !data.patientName.trim()) {
      throw new Error('Patient Name is required.');
    }
    if (data.age === undefined || isNaN(Number(data.age)) || Number(data.age) < 0) {
      throw new Error('Valid Age is required.');
    }
    if (!data.phone || !data.phone.trim()) {
      throw new Error('Mobile Number is required.');
    }
    if (!data.location || !data.location.trim()) {
      throw new Error('Location is required.');
    }
    if (data.amount === undefined || isNaN(Number(data.amount)) || Number(data.amount) < 0) {
      throw new Error('Amount is required.');
    }
    if (!data.date || !data.date.trim()) {
      throw new Error('Date is required.');
    }
    if (!data.time || !data.time.trim()) {
      throw new Error('Time is required.');
    }

    // 1. Locate or create Patient record
    let patient = await patientService.findDuplicateByPhone(data.phone.trim());
    if (!patient) {
      patient = await patientService.createPatient({
        fullName: data.patientName.trim(),
        age: Number(data.age),
        phone: data.phone.trim(),
        patientProblem: data.service?.trim() || 'Dental Visit / Clinical Treatment',
        address: data.location.trim(),
        district: data.location.trim()
      });
    }

    // 2. Generate atomic server-side Entry Serial
    const serial = await this.getNextEntrySerial();

    // 3. Create associated invoice/receipt
    const receipt = await this.createReceipt({
      patientNumber: patient.patientNumber,
      items: [
        {
          name: data.service?.trim() || 'Dental Visit / Clinical Treatment',
          description: data.notes?.trim() || `Visit Entry #${serial}`,
          price: Number(data.amount),
          quantity: 1,
          teeth: []
        }
      ],
      paidAmount: Number(data.amount),
      paymentMethod: 'cash',
      appointmentDate: data.date.trim(),
      appointmentTime: data.time.trim(),
      notes: data.notes?.trim() || `All Patients Entry #${serial}`,
      entrySerial: serial
    });

    // 4. Save AllPatientEntry
    const entryPayload: AllPatientEntry = {
      id: `entry-${serial}`,
      _id: `entry-${serial}`,
      serial,
      patientNumber: patient.patientNumber,
      patientName: data.patientName.trim(),
      age: Number(data.age),
      phone: data.phone.trim(),
      location: data.location.trim(),
      amount: Number(data.amount),
      date: data.date.trim(),
      time: data.time.trim(),
      receiptNumber: String(receipt.receiptNumber),
      service: data.service?.trim() || 'Dental Visit / Clinical Treatment',
      notes: data.notes?.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const isDbConnected = getDatabaseStatus() === 'connected';
    if (isDbConnected) {
      try {
        const mongoEntry = new MongoAllPatientEntry({
          serial,
          patientNumber: patient.patientNumber,
          patientName: data.patientName.trim(),
          age: Number(data.age),
          phone: data.phone.trim(),
          location: data.location.trim(),
          amount: Number(data.amount),
          date: data.date.trim(),
          time: data.time.trim(),
          receiptNumber: String(receipt.receiptNumber),
          service: data.service?.trim() || 'Dental Visit / Clinical Treatment',
          notes: data.notes?.trim()
        });
        await mongoEntry.save();
      } catch (err) {
        logger.warn('Failed to save to MongoAllPatientEntry model, using memory store', { err });
      }
    }

    inMemoryAllPatientEntries.unshift(entryPayload);
    return { entry: entryPayload, receipt };
  }

  /**
   * List All Patients Ledger entries with search and exact sorting options
   */
  async listAllPatientEntries(query: {
    search?: string;
    sortBy?: 'date' | 'time' | 'serial';
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const isDbConnected = getDatabaseStatus() === 'connected';
    if (isDbConnected) {
      try {
        let filter: any = {};
        if (query.search && query.search.trim()) {
          const s = query.search.trim();
          const num = Number(s.replace('#', ''));
          const orCond: any[] = [
            { patientName: { $regex: s, $options: 'i' } },
            { phone: { $regex: s, $options: 'i' } },
            { serial: { $regex: s, $options: 'i' } }
          ];
          if (!isNaN(num)) {
            orCond.push({ patientNumber: num });
          }
          filter.$or = orCond;
        }

        let sortObj: any = { date: -1, serial: -1 };
        const orderVal = query.sortOrder === 'asc' ? 1 : -1;
        if (query.sortBy === 'date') {
          sortObj = { date: orderVal, time: orderVal };
        } else if (query.sortBy === 'time') {
          sortObj = { time: orderVal };
        } else if (query.sortBy === 'serial') {
          sortObj = { serial: orderVal };
        }

        const [docs, total] = await Promise.all([
          MongoAllPatientEntry.find(filter).sort(sortObj).skip(skip).limit(limit).lean(),
          MongoAllPatientEntry.countDocuments(filter)
        ]);

        return {
          entries: docs.map((d: any) => ({
            id: d._id?.toString() || d.id,
            serial: d.serial,
            patientNumber: d.patientNumber,
            patientName: d.patientName,
            age: d.age,
            phone: d.phone,
            location: d.location,
            amount: d.amount,
            date: d.date,
            time: d.time,
            receiptNumber: d.receiptNumber,
            service: d.service,
            notes: d.notes,
            createdAt: d.createdAt ? new Date(d.createdAt).toISOString() : new Date().toISOString(),
            updatedAt: d.updatedAt ? new Date(d.updatedAt).toISOString() : new Date().toISOString()
          })),
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit) || 1
          }
        };
      } catch (err) {
        logger.warn('MongoDB listAllPatientEntries failed, falling back', { err });
      }
    }

    let all = [...inMemoryAllPatientEntries];
    if (query.search && query.search.trim()) {
      const s = query.search.trim().toLowerCase();
      all = all.filter(
        (e) =>
          e.patientName.toLowerCase().includes(s) ||
          e.phone.includes(s) ||
          e.serial.includes(s) ||
          String(e.patientNumber) === s.replace('#', '')
      );
    }

    const orderMultiplier = query.sortOrder === 'asc' ? 1 : -1;
    if (query.sortBy === 'date') {
      all.sort((a, b) => (new Date(a.date).getTime() - new Date(b.date).getTime()) * orderMultiplier);
    } else if (query.sortBy === 'time') {
      all.sort((a, b) => a.time.localeCompare(b.time) * orderMultiplier);
    } else if (query.sortBy === 'serial') {
      all.sort((a, b) => a.serial.localeCompare(b.serial) * orderMultiplier);
    } else {
      all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }

    const total = all.length;
    const paginated = all.slice(skip, skip + limit);

    return {
      entries: paginated,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1
      }
    };
  }

  /**
   * Get all historical visits and entries for a patient across dates
   */
  async getPatientHistoryEntries(patientNumber: number): Promise<{
    patient: any;
    entries: AllPatientEntry[];
    receipts: Receipt[];
  }> {
    const patient = await patientService.getPatientByNumberOrId(String(patientNumber));
    const [entriesRes, patientReceipts] = await Promise.all([
      this.listAllPatientEntries({ search: String(patientNumber), limit: 100 }),
      this.getPatientReceipts(String(patientNumber))
    ]);

    const matchingEntries = entriesRes.entries.filter((e) => e.patientNumber === patientNumber);

    return {
      patient,
      entries: matchingEntries,
      receipts: patientReceipts
    };
  }

  /**
   * Update an All Patients Ledger entry
   */
  async updateAllPatientEntry(
    identifier: string,
    data: {
      patientName?: string;
      age?: number;
      phone?: string;
      mobileNumber?: string;
      location?: string;
      amount?: number;
      date?: string;
      time?: string;
      service?: string;
      notes?: string;
    }
  ): Promise<AllPatientEntry> {
    const isDbConnected = getDatabaseStatus() === 'connected';
    const targetPhone = data.phone || data.mobileNumber;

    if (isDbConnected) {
      try {
        const query: any = {
          $or: [
            { serial: identifier },
            ...(identifier.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: identifier }] : [])
          ]
        };

        const existing = await MongoAllPatientEntry.findOne(query);
        if (existing) {
          if (data.patientName !== undefined) existing.patientName = data.patientName.trim();
          if (data.age !== undefined) existing.age = Number(data.age);
          if (targetPhone !== undefined) {
            existing.phone = targetPhone.trim();
            existing.mobileNumber = targetPhone.trim();
          }
          if (data.location !== undefined) existing.location = data.location.trim();
          if (data.amount !== undefined) existing.amount = Number(data.amount);
          if (data.date !== undefined) existing.date = data.date.trim();
          if (data.time !== undefined) existing.time = data.time.trim();
          if (data.service !== undefined) existing.service = data.service.trim();
          if (data.notes !== undefined) existing.notes = data.notes.trim();

          await existing.save();

          // Sync inMemory
          const memIdx = inMemoryAllPatientEntries.findIndex(
            (e) => e.id === identifier || e._id === identifier || e.serial === identifier
          );
          if (memIdx !== -1) {
            inMemoryAllPatientEntries[memIdx] = {
              ...inMemoryAllPatientEntries[memIdx],
              patientName: existing.patientName,
              age: existing.age,
              phone: existing.phone,
              mobileNumber: existing.phone,
              location: existing.location,
              amount: existing.amount,
              date: existing.date,
              time: existing.time,
              service: existing.service,
              notes: existing.notes,
              updatedAt: new Date().toISOString()
            };
          }

          return {
            id: existing._id?.toString() || existing.id,
            _id: existing._id?.toString(),
            serial: existing.serial,
            patientNumber: existing.patientNumber,
            patientName: existing.patientName,
            age: existing.age,
            phone: existing.phone,
            mobileNumber: existing.phone,
            location: existing.location,
            amount: existing.amount,
            date: existing.date,
            time: existing.time,
            receiptNumber: existing.receiptNumber,
            service: existing.service,
            notes: existing.notes,
            createdAt: existing.createdAt ? new Date(existing.createdAt).toISOString() : new Date().toISOString(),
            updatedAt: existing.updatedAt ? new Date(existing.updatedAt).toISOString() : new Date().toISOString()
          };
        }
      } catch (err) {
        logger.warn('Failed to update MongoAllPatientEntry, falling back to memory', { err });
      }
    }

    const memIdx = inMemoryAllPatientEntries.findIndex(
      (e) => e.id === identifier || e._id === identifier || e.serial === identifier
    );
    if (memIdx === -1) {
      throw new Error(`Patient entry #${identifier} not found`);
    }

    const current = inMemoryAllPatientEntries[memIdx];
    const updated: AllPatientEntry = {
      ...current,
      patientName: data.patientName !== undefined ? data.patientName.trim() : current.patientName,
      age: data.age !== undefined ? Number(data.age) : current.age,
      phone: targetPhone !== undefined ? targetPhone.trim() : current.phone,
      mobileNumber: targetPhone !== undefined ? targetPhone.trim() : current.mobileNumber,
      location: data.location !== undefined ? data.location.trim() : current.location,
      amount: data.amount !== undefined ? Number(data.amount) : current.amount,
      date: data.date !== undefined ? data.date.trim() : current.date,
      time: data.time !== undefined ? data.time.trim() : current.time,
      service: data.service !== undefined ? data.service.trim() : current.service,
      notes: data.notes !== undefined ? data.notes.trim() : current.notes,
      updatedAt: new Date().toISOString()
    };
    inMemoryAllPatientEntries[memIdx] = updated;
    return updated;
  }

  /**
   * Delete an All Patients Ledger entry
   */
  async deleteAllPatientEntry(identifier: string): Promise<boolean> {
    const isDbConnected = getDatabaseStatus() === 'connected';
    let deleted = false;

    if (isDbConnected) {
      try {
        const query: any = {
          $or: [
            { serial: identifier },
            ...(identifier.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: identifier }] : [])
          ]
        };
        const res = await MongoAllPatientEntry.deleteOne(query);
        if (res.deletedCount && res.deletedCount > 0) {
          deleted = true;
        }
      } catch (err) {
        logger.warn('Failed to delete MongoAllPatientEntry', { err });
      }
    }

    const memIdx = inMemoryAllPatientEntries.findIndex(
      (e) => e.id === identifier || e._id === identifier || e.serial === identifier
    );
    if (memIdx !== -1) {
      inMemoryAllPatientEntries.splice(memIdx, 1);
      deleted = true;
    }

    return deleted;
  }

  private mapMongoToReceipt(doc: any): Receipt {
    const patientObj = doc.patientId && typeof doc.patientId === 'object' ? doc.patientId : null;
    return {
      id: doc._id?.toString() || doc.id,
      _id: doc._id?.toString() || doc._id,
      receiptNumber: doc.receiptNumber,
      entrySerial: doc.entrySerial,
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
        total: (i.amount || i.price || 0) * (i.quantity || 1),
        teeth: Array.isArray(i.teeth) ? i.teeth : []
      })),
      subtotal: doc.subtotal || 0,
      discount: doc.discount || 0,
      discountType: doc.discountType || 'flat',
      totalAmount: doc.totalAmount || 0,
      previousDueSnapshot: doc.previousDueSnapshot || 0,
      totalPayable: doc.totalPayable !== undefined ? doc.totalPayable : doc.totalAmount || 0,
      paidAmount: doc.paidAmount || 0,
      dueAmount: doc.dueAmount || 0,
      resultingDue: doc.resultingDue !== undefined ? doc.resultingDue : doc.dueAmount || 0,
      paymentMethod: doc.paymentMethod || 'cash',
      paymentStatus: doc.paymentStatus || 'pending',
      status: doc.status || 'finalized',
      payments: (doc.payments || []).map((p: any) => ({
        id: p._id?.toString() || p.id,
        _id: p._id?.toString() || p._id,
        receiptNumber: p.receiptNumber,
        patientId: p.patientId?.toString(),
        patientNumber: p.patientNumber,
        amount: p.amount,
        paymentMethod: p.paymentMethod,
        notes: p.notes,
        recordedBy: p.recordedBy,
        paymentDate: p.paymentDate,
        paymentTime: p.paymentTime,
        status: p.status || 'active',
        reversedAt: p.reversedAt ? new Date(p.reversedAt).toISOString() : undefined,
        reversedBy: p.reversedBy,
        reversalReason: p.reversalReason,
        auditTrail: p.auditTrail || [],
        createdAt: p.createdAt ? new Date(p.createdAt).toISOString() : new Date().toISOString(),
        updatedAt: p.updatedAt ? new Date(p.updatedAt).toISOString() : undefined
      })),
      notes: doc.notes,
      version: doc.version || 1,
      history: doc.history || [],
      createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString(),
      updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : new Date().toISOString()
    };
  }
}

export const receiptService = new ReceiptService();
