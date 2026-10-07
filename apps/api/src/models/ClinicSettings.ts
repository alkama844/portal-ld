import { Schema, model, Document } from 'mongoose';

export interface IClinicSettings extends Document {
  clinicName: string;
  tagline: string;
  phone: string;
  email: string;
  address: string;
  website?: string;
  receiptFooter: string;
  logoUrl?: string;
  frontendColor?: string;
  frontendHoverColor?: string;
  createdAt: Date;
  updatedAt: Date;
}

const clinicSettingsSchema = new Schema<IClinicSettings>(
  {
    clinicName: { type: String, required: true, default: 'Lucky Dental Care' },
    tagline: { type: String, default: 'SMILE FOR LIFE • ESTD 1982' },
    phone: { type: String, required: true, default: '01715-917834' },
    email: { type: String, default: '' },
    address: { type: String, required: true, default: 'Kushtia, Bangladesh' },
    website: { type: String, default: 'https://luckydentalcare.com' },
    receiptFooter: {
      type: String,
      default: 'Lucky Dental Care • SMILE FOR LIFE • Kushtia, Bangladesh'
    },
    logoUrl: { type: String },
    frontendColor: { type: String, default: '#941324' },
    frontendHoverColor: { type: String, default: '#770f1d' }
  },
  { timestamps: true }
);

export const ClinicSettings = model<IClinicSettings>('ClinicSettings', clinicSettingsSchema);
