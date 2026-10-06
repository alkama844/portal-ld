import { Schema, model, Document } from 'mongoose';

export interface IAllPatientEntry extends Document {
  serial: string;
  patientNumber: number;
  patientName: string;
  age: number;
  phone: string;
  mobileNumber?: string;
  location: string;
  amount: number;
  date: string;
  time: string;
  receiptNumber?: string;
  service?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const allPatientEntrySchema = new Schema<IAllPatientEntry>(
  {
    serial: { type: String, required: true, unique: true, index: true },
    patientNumber: { type: Number, required: true, index: true },
    patientName: { type: String, required: true, trim: true },
    age: { type: Number, required: true, min: 0 },
    phone: { type: String, required: true, trim: true, index: true },
    mobileNumber: { type: String, trim: true },
    location: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    date: { type: String, required: true, index: true },
    time: { type: String, required: true },
    receiptNumber: { type: String, index: true },
    service: { type: String },
    notes: { type: String }
  },
  { timestamps: true }
);

allPatientEntrySchema.index({ patientName: 'text', phone: 'text' });
allPatientEntrySchema.index({ date: -1, serial: -1 });

export const AllPatientEntry = model<IAllPatientEntry>('AllPatientEntry', allPatientEntrySchema);
