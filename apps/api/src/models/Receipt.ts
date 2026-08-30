import { Schema, model, Document } from 'mongoose';

export interface IReceiptItem {
  description: string;
  packageId?: Schema.Types.ObjectId;
  amount: number;
  quantity: number;
}

export interface IReceipt extends Document {
  receiptNumber: string;
  patientId: Schema.Types.ObjectId;
  patientNumber: number;
  items: IReceiptItem[];
  subtotal: number;
  discount: number;
  discountType?: 'flat' | 'percentage';
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  paymentMethod: string;
  paymentStatus: 'paid' | 'partial' | 'pending';
  appointmentId?: Schema.Types.ObjectId;
  appointmentDate?: string;
  appointmentTime?: string;
  notes?: string;
  version: number;
  history: any[];
  isCurrent: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const receiptSchema = new Schema<IReceipt>(
  {
    receiptNumber: { type: String, required: true, unique: true, index: true },
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    patientNumber: { type: Number, required: true, index: true },
    items: [
      {
        description: { type: String, required: true },
        packageId: { type: Schema.Types.ObjectId, ref: 'Package' },
        amount: { type: Number, required: true, min: 0 },
        quantity: { type: Number, required: true, min: 1, default: 1 }
      }
    ],
    subtotal: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    discountType: { type: String, enum: ['flat', 'percentage'], default: 'flat' },
    totalAmount: { type: Number, required: true, min: 0 },
    paidAmount: { type: Number, default: 0, min: 0 },
    dueAmount: { type: Number, default: 0, min: 0 },
    paymentMethod: { type: String, default: 'cash' },
    paymentStatus: { type: String, enum: ['paid', 'partial', 'pending'], default: 'pending' },
    appointmentId: { type: Schema.Types.ObjectId, ref: 'Appointment' },
    appointmentDate: { type: String },
    appointmentTime: { type: String },
    notes: { type: String },
    version: { type: Number, default: 1 },
    history: [Schema.Types.Mixed],
    isCurrent: { type: Boolean, default: true, index: true }
  },
  { timestamps: true }
);

// Compound index for querying active receipt by patient
receiptSchema.index({ patientId: 1, isCurrent: 1 });
receiptSchema.index({ patientNumber: 1, isCurrent: 1 });

export const Receipt = model<IReceipt>('Receipt', receiptSchema);

