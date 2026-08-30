import { Schema, model, Document } from 'mongoose';

export interface IPackage extends Document {
  name: string;
  category?: string;
  description?: string;
  price: number;
  durationDays?: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const packageSchema = new Schema<IPackage>(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, trim: true, default: 'General' },
    description: { type: String, trim: true },
    price: { type: Number, required: true, min: 0 },
    durationDays: { type: Number, min: 1 },
    active: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export const Package = model<IPackage>('Package', packageSchema);
