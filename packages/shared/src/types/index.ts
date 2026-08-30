export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'admin';
  createdAt: string;
  updatedAt: string;
}

export type CustomFieldType = 
  | 'text' 
  | 'number' 
  | 'email' 
  | 'phone' 
  | 'date' 
  | 'select' 
  | 'checkbox' 
  | 'textarea'
  | 'boolean';

export interface CustomFieldDefinition {
  id: string;
  _id?: string;
  name: string;
  key: string;
  type: CustomFieldType;
  required: boolean;
  options?: string[];
  active: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface PatientCustomFieldValue {
  fieldId?: string;
  key: string;
  value: string | number | boolean | string[];
}

export interface ImageMetadata {
  provider: 'cloudinary' | 'local';
  publicId: string;
  secureUrl: string;
  width?: number;
  height?: number;
  format?: string;
  bytes?: number;
}

export interface Patient {
  id: string;
  _id?: string;
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
  guardianName?: string;
  occupation?: string;
  reference?: string;
  profileImage?: string | ImageMetadata;
  customFields?: PatientCustomFieldValue[];
  isPublic?: boolean;
  publicToken?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ServicePackage {
  id: string;
  _id?: string;
  name: string;
  category?: string;
  description?: string;
  price: number;
  durationDays?: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ReceiptItem {
  id?: string;
  name: string;
  description?: string;
  packageId?: string;
  price: number;
  quantity: number;
  total: number;
}

export type PaymentMethod = 'cash' | 'bkash' | 'nagad' | 'card' | 'bank_transfer';
export type PaymentStatus = 'paid' | 'partial' | 'unpaid' | 'pending';

export interface ReceiptHistoryEntry {
  version: number;
  items: ReceiptItem[];
  subtotal: number;
  discount: number;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  appointmentDate?: string;
  appointmentTime?: string;
  notes?: string;
  updatedAt: string;
}

export interface Receipt {
  id: string;
  _id?: string;
  receiptNumber: number | string;
  patientId: string;
  patientNumber: number;
  patientName: string;
  patientPhone: string;
  patientAge?: number;
  patientAddress?: string;
  patientProblem?: string;
  appointmentId?: string;
  appointmentDate?: string;
  appointmentTime?: string;
  items: ReceiptItem[];
  subtotal: number;
  discount: number;
  discountType?: 'flat' | 'percentage';
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  notes?: string;
  version?: number;
  history?: ReceiptHistoryEntry[];
  createdAt: string;
  updatedAt: string;
}

export type AppointmentStatus = 'upcoming' | 'completed' | 'cancelled' | 'no-show';

export interface Appointment {
  id: string;
  _id?: string;
  patientId: string;
  patientNumber: number;
  patientName: string;
  patientPhone: string;
  appointmentDate: string; // YYYY-MM-DD
  appointmentTime: string; // e.g. "10:30 AM" or "07:30 PM"
  category?: string;
  status: AppointmentStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  totalPatients: number;
  todayAppointments: number;
  upcomingAppointments: number;
  totalReceipts: number;
  todayRevenue: number;
  totalRevenue: number;
  pendingDue: number;
  recentPatients?: Patient[];
  recentAppointments?: Appointment[];
  recentReceipts?: Receipt[];
}

export interface AuthSession {
  user: AdminUser | null;
  token?: string;
}
