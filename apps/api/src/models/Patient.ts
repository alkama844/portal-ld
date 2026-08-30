import { Schema, model, Document } from 'mongoose';

export interface IPatientCustomFieldValue {
  fieldId: Schema.Types.ObjectId;
  key: string;
  value: Schema.Types.Mixed;
}

export interface IPatientImageMetadata {
  provider: 'cloudinary' | 'local';
  publicId: string;
  secureUrl: string;
  width?: number;
  height?: number;
  format?: string;
  bytes?: number;
}

export interface IPatient extends Document {
  patientNumber: number;
  fullName: string;
  age: number;
  phone: string;
  patientProblem: string;
  email?: string;
  address?: string;
  village?: string;
  area?: string;
  district?: string;
  profileImage?: string | IPatientImageMetadata;
  customFields?: IPatientCustomFieldValue[];
  createdAt: Date;
  updatedAt: Date;
}

const patientSchema = new Schema<IPatient>(
  {
    patientNumber: { type: Number, required: true, unique: true, index: true },
    fullName: { type: String, required: true, trim: true },
    age: { type: Number, required: true, min: 0 },
    phone: { type: String, required: true, trim: true, index: true },
    patientProblem: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true, index: true },
    address: { type: String, trim: true },
    village: { type: String, trim: true },
    area: { type: String, trim: true },
    district: { type: String, trim: true },
    profileImage: { type: Schema.Types.Mixed },
    customFields: [
      {
        fieldId: { type: Schema.Types.ObjectId, ref: 'CustomFieldDefinition' },
        key: { type: String, required: true },
        value: { type: Schema.Types.Mixed }
      }
    ]
  },
  { timestamps: true }
);

// Compound index for quick phone search and autocomplete
patientSchema.index({ phone: 1, fullName: 1 });

export const Patient = model<IPatient>('Patient', patientSchema);
