import { Schema, model, Document } from 'mongoose';

export interface IAppointment extends Document {
  patientId: Schema.Types.ObjectId;
  patientNumber: number;
  patientName: string;
  patientPhone: string;
  appointmentDate: string; // YYYY-MM-DD
  appointmentTime: string; // e.g. "10:30 AM" or "07:30 PM"
  category?: string;
  status: 'upcoming' | 'completed' | 'cancelled' | 'no-show';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const appointmentSchema = new Schema<IAppointment>(
  {
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    patientNumber: { type: Number, required: true, index: true },
    patientName: { type: String, required: true },
    patientPhone: { type: String, required: true },
    appointmentDate: { type: String, required: true, index: true },
    appointmentTime: { type: String, required: true },
    category: { type: String, default: 'General Consultation' },
    status: { 
      type: String, 
      enum: ['upcoming', 'completed', 'cancelled', 'no-show'], 
      default: 'upcoming',
      index: true 
    },
    notes: { type: String }
  },
  { timestamps: true }
);

export const Appointment = model<IAppointment>('Appointment', appointmentSchema);
