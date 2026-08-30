import { Schema, model, Document } from 'mongoose';

export interface IPayment extends Document {
  receiptId: Schema.Types.ObjectId;
  patientId: Schema.Types.ObjectId;
  amount: number;
  paymentMethod: 'cash' | 'card' | 'bank_transfer' | 'mobile_payment';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<IPayment>(
  {
    receiptId: { type: Schema.Types.ObjectId, ref: 'Receipt', required: true, index: true },
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    paymentMethod: {
      type: String,
      enum: ['cash', 'card', 'bank_transfer', 'mobile_payment'],
      default: 'cash'
    },
    notes: { type: String }
  },
  { timestamps: true }
);

export const Payment = model<IPayment>('Payment', paymentSchema);
