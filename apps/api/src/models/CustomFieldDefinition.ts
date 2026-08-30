import { Schema, model, Document } from 'mongoose';

export interface ICustomFieldDefinition extends Document {
  name: string;
  key: string;
  type: 'text' | 'number' | 'email' | 'phone' | 'date' | 'select' | 'checkbox' | 'textarea' | 'boolean';
  required: boolean;
  options?: string[];
  active: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const customFieldDefinitionSchema = new Schema<ICustomFieldDefinition>(
  {
    name: { type: String, required: true, trim: true },
    key: { type: String, required: true, unique: true, trim: true },
    type: { 
      type: String, 
      required: true, 
      enum: ['text', 'number', 'email', 'phone', 'date', 'select', 'checkbox', 'textarea', 'boolean'] 
    },
    required: { type: Boolean, default: false },
    options: [{ type: String }],
    active: { type: Boolean, default: true },
    order: { type: Number, default: 0 }
  },
  { timestamps: true }
);

export const CustomFieldDefinition = model<ICustomFieldDefinition>('CustomFieldDefinition', customFieldDefinitionSchema);
