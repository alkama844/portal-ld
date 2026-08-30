'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  User, 
  Phone, 
  Mail, 
  Calendar as CalendarIcon, 
  MapPin, 
  FileText, 
  Edit3, 
  ArrowLeft, 
  Receipt as ReceiptIcon, 
  Clock, 
  Plus, 
  Save,
  Trash2,
  Upload,
  Printer,
  AlertTriangle,
  CreditCard,
  Share2,
  Copy,
  Check,
  X,
  Eye
} from 'lucide-react';
import DashboardLayout from '@/app/dashboard/layout';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { DatePicker } from '@/components/ui/date-picker';
import { TimePicker } from '@/components/ui/time-picker';
import { ReceiptDocument } from '@/components/receipt/receipt-document';
import { useToast } from '@/components/ui/toast';
import { apiFetch } from '@/lib/api/client';
import { Patient, ImageMetadata, Receipt, Appointment, AppointmentStatus } from '@patient-portal/shared';

export default function PatientProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const patientNumber = params.patientNumber as string;

  const [patient, setPatient] = useState<Patient | null>(null);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Edit form state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isUploadingEditImage, setIsUploadingEditImage] = useState(false);
  const [editName, setEditName] = useState('');
  const [editAge, setEditAge] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editVillage, setEditVillage] = useState('');
  const [editDistrict, setEditDistrict] = useState('');
  const [editProblem, setEditProblem] = useState('');
  const [editProfileImage, setEditProfileImage] = useState<ImageMetadata | string | null>(null);

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Share modal state
  const [showShareModal, setShowShareModal] = useState(false);
  const [isTogglingShare, setIsTogglingShare] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // New Appointment modal state
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [aptDate, setAptDate] = useState(new Date().toISOString().split('T')[0]);
  const [aptTime, setAptTime] = useState('10:30 AM');
  const [aptCategory, setAptCategory] = useState('General Consultation');
  const [aptNotes, setAptNotes] = useState('');
  const [isSavingApt, setIsSavingApt] = useState(false);

  // Edit Appointment modal state
  const [showEditAptModal, setShowEditAptModal] = useState(false);
  const [editAptId, setEditAptId] = useState('');
  const [editAptDate, setEditAptDate] = useState('');
  const [editAptTime, setEditAptTime] = useState('10:30 AM');
  const [editAptCategory, setEditAptCategory] = useState('General Consultation');
  const [editAptStatus, setEditAptStatus] = useState<AppointmentStatus>('upcoming');
  const [editAptNotes, setEditAptNotes] = useState('');
  const [isSavingEditApt, setIsSavingEditApt] = useState(false);

  // View Receipt modal state
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  const fetchPatientData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [patientRes, receiptsRes, appointmentsRes] = await Promise.all([
        apiFetch<Patient>(`/patients/${patientNumber}`),
        apiFetch<Receipt[]>(`/receipts/patient/${patientNumber}`),
        apiFetch<Appointment[]>(`/appointments/patient/${patientNumber}`)
      ]);

      if (patientRes.success && patientRes.data) {
        setPatient(patientRes.data);
      } else {
        setErrorMessage(patientRes.error || `Patient #${patientNumber} does not exist or could not be loaded.`);
      }

      if (receiptsRes.success && receiptsRes.data) {
        setReceipts(receiptsRes.data);
      }

      if (appointmentsRes.success && appointmentsRes.data) {
        setAppointments(appointmentsRes.data);
      }
    } catch {
      setErrorMessage('Unable to connect to backend server. Please verify network connection.');
    } finally {
      setIsLoading(false);
    }
  }, [patientNumber]);

  useEffect(() => {
    if (patientNumber) {
      fetchPatientData();
    }
  }, [patientNumber, fetchPatientData]);

  // Open Edit Patient Modal
  const handleOpenEdit = () => {
    if (!patient) return;
    setEditName(patient.fullName);
    setEditAge(patient.age.toString());
    setEditPhone(patient.phone);
    setEditEmail(patient.email || '');
    setEditAddress(patient.address || '');
    setEditVillage(patient.village || '');
    setEditDistrict(patient.district || '');
    setEditProblem(patient.patientProblem);
    setEditProfileImage(patient.profileImage || null);
    setIsEditOpen(true);
  };

  // Upload Profile Image
  const handleEditImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingEditImage(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('patientIdentifier', patientNumber);

      const res = await apiFetch<any>('/patients/upload-image', {
        method: 'POST',
        body: formData
      });

      if (res.success && res.data) {
        setEditProfileImage(res.data.data || res.data);
        showToast('Profile photo uploaded', 'success');
      } else {
        showToast(res.error || 'Image upload failed', 'error');
      }
    } catch {
      showToast('Network error during image upload', 'error');
    } finally {
      setIsUploadingEditImage(false);
    }
  };

  const handleDeleteImage = () => {
    setEditProfileImage(null);
  };

  // Save Patient Updates
  const handleUpdatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patient) return;

    setIsSavingEdit(true);
    try {
      const res = await apiFetch<Patient>(`/patients/${patient.patientNumber}`, {
        method: 'PATCH',
        body: JSON.stringify({
          fullName: editName.trim(),
          age: Number(editAge),
          phone: editPhone.trim(),
          email: editEmail.trim() || undefined,
          address: editAddress.trim() || undefined,
          village: editVillage.trim() || undefined,
          district: editDistrict.trim() || undefined,
          patientProblem: editProblem.trim(),
          profileImage: editProfileImage
        })
      });

      if (res.success && res.data) {
        setPatient(res.data);
        setIsEditOpen(false);
        showToast('Patient record updated successfully', 'success');
        fetchPatientData();
      } else {
        showToast(res.error || 'Failed to update patient', 'error');
      }
    } catch {
      showToast('Network error updating patient', 'error');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Delete Patient
  const handleDeletePatient = async () => {
    if (!patient) return;
    setIsDeleting(true);
    try {
      const res = await apiFetch(`/patients/${patient.patientNumber}`, {
        method: 'DELETE'
      });
      if (res.success) {
        showToast(`Patient #${patient.patientNumber} deleted`, 'success');
        router.push('/patients');
      } else {
        showToast(res.error || 'Failed to delete patient', 'error');
      }
    } catch {
      showToast('Network error deleting patient', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Toggle Public / Private Profile
  const handleToggleShare = async (newStatus: boolean) => {
    if (!patient) return;
    setIsTogglingShare(true);
    try {
      const res = await apiFetch<Patient>(`/patients/${patient.patientNumber}/share`, {
        method: 'POST',
        body: JSON.stringify({ isPublic: newStatus })
      });
      if (res.success && res.data) {
        setPatient(res.data);
        showToast(
          newStatus ? 'Public profile link generated' : 'Patient profile is now private',
          'success'
        );
      } else {
        showToast(res.error || 'Failed to update visibility', 'error');
      }
    } catch {
      showToast('Network error updating visibility', 'error');
    } finally {
      setIsTogglingShare(false);
    }
  };

  const handleCopyPublicLink = () => {
    if (!patient?.publicToken) return;
    const url = `${window.location.origin}/public/patient/${patient.publicToken}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    showToast('Public link copied to clipboard', 'success');
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Create Appointment
  const handleAddAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patient) return;

    if (!aptDate || !aptTime) {
      showToast('Date and Time are required.', 'error');
      return;
    }

    setIsSavingApt(true);
    try {
      const res = await apiFetch<Appointment>('/appointments', {
        method: 'POST',
        body: JSON.stringify({
          patientNumber: patient.patientNumber,
          appointmentDate: aptDate,
          appointmentTime: aptTime,
          category: aptCategory,
          notes: aptNotes.trim() || undefined
        })
      });

      if (res.success && res.data) {
        showToast('Appointment scheduled successfully', 'success');
        setShowAppointmentModal(false);
        setAptNotes('');
        fetchPatientData();
      } else {
        showToast(res.error || 'Failed to schedule appointment', 'error');
      }
    } catch {
      showToast('Network error scheduling appointment', 'error');
    } finally {
      setIsSavingApt(false);
    }
  };

  // Open Edit Appointment Modal
  const handleOpenEditApt = (apt: Appointment) => {
    setEditAptId(apt.id || (apt as any)._id);
    setEditAptDate(apt.appointmentDate);
    setEditAptTime(apt.appointmentTime);
    setEditAptCategory(apt.category || 'General Consultation');
    setEditAptStatus(apt.status);
    setEditAptNotes(apt.notes || '');
    setShowEditAptModal(true);
  };

  // Save Edited Appointment
  const handleSaveEditAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editAptId) return;

    setIsSavingEditApt(true);
    try {
      const res = await apiFetch<Appointment>(`/appointments/${editAptId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          appointmentDate: editAptDate,
          appointmentTime: editAptTime,
          category: editAptCategory,
          status: editAptStatus,
          notes: editAptNotes.trim() || undefined
        })
      });

      if (res.success && res.data) {
        showToast('Appointment updated successfully', 'success');
        setShowEditAptModal(false);
        fetchPatientData();
      } else {
        showToast(res.error || 'Failed to update appointment', 'error');
      }
    } catch {
      showToast('Network error updating appointment', 'error');
    } finally {
      setIsSavingEditApt(false);
    }
  };

  // Quick Update Appointment Status
  const handleUpdateAptStatus = async (id: string, status: AppointmentStatus) => {
    try {
      const res = await apiFetch(`/appointments/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      });
      if (res.success) {
        showToast(`Appointment marked as ${status}`, 'success');
        fetchPatientData();
      } else {
        showToast(res.error || 'Failed to update appointment status', 'error');
      }
    } catch {
      showToast('Network error updating appointment', 'error');
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/5 animate-pulse" />
            <div className="h-6 w-48 bg-white/5 rounded animate-pulse" />
          </div>
          <GlassCard className="p-6">
            <div className="flex gap-4">
              <div className="w-20 h-20 rounded-2xl bg-white/5 animate-pulse" />
              <div className="space-y-2 flex-1">
                <div className="h-6 w-1/3 bg-white/5 rounded animate-pulse" />
                <div className="h-4 w-1/4 bg-white/5 rounded animate-pulse" />
              </div>
            </div>
          </GlassCard>
        </div>
      </DashboardLayout>
    );
  }

  if (errorMessage || !patient) {
    return (
      <DashboardLayout>
        <div className="max-w-md mx-auto py-16 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-red-950/60 border border-red-800/40 flex items-center justify-center text-red-400 mx-auto">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white">Patient Record Error</h2>
          <p className="text-xs text-gray-400 leading-relaxed">
            {errorMessage || `Patient #${patientNumber} does not exist or has been removed.`}
          </p>
          <div className="pt-2">
            <Link href="/patients">
              <Button variant="primary" size="sm" className="text-xs">
                Back to Patient Registry
              </Button>
            </Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const profileImageUrl = typeof patient.profileImage === 'string'
    ? patient.profileImage
    : patient.profileImage?.secureUrl;

  const editImageUrl = typeof editProfileImage === 'string'
    ? editProfileImage
    : editProfileImage?.secureUrl;

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Top Action Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <Link href="/patients">
              <Button variant="ghost" size="sm" className="p-2 text-gray-400 hover:text-white" aria-label="Back">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                  {patient.fullName}
                </h1>
                <span className="font-mono text-xs font-bold text-red-400 bg-red-950/80 border border-red-800/60 px-2.5 py-0.5 rounded-full">
                  #{patient.patientNumber}
                </span>
                {patient.isPublic && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-700/50 text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                    Public Share Active
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400">Official Clinical Dossier & Treatment Archive</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowShareModal(true)}
              className="text-xs gap-1.5 border-white/10 hover:border-red-500/40"
            >
              <Share2 className="w-3.5 h-3.5 text-red-400" />
              Share
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleOpenEdit}
              className="text-xs gap-1.5"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Edit Profile
            </Button>
            <Link href={`/patients/${patient.patientNumber}/receipt/new`}>
              <Button variant="primary" size="sm" className="text-xs gap-1.5 shadow-glow-red">
                <ReceiptIcon className="w-3.5 h-3.5" />
                {receipts.length > 0 ? 'Edit / View Receipt' : 'Create Receipt'}
              </Button>
            </Link>
          </div>
        </div>

        {/* Patient Profile Card */}
        <GlassCard className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {profileImageUrl ? (
              <div className="relative w-20 h-20 rounded-2xl overflow-hidden border-2 border-red-500/50 shadow-glow-red-sm shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={profileImageUrl} alt={patient.fullName} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-red-950/80 border border-red-700/50 flex items-center justify-center text-red-400 shrink-0">
                <User className="w-10 h-10" />
              </div>
            )}

            <div className="space-y-2 flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-300">
                <div className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-red-400" />
                  <span className="font-mono font-semibold">{patient.phone}</span>
                </div>
                {patient.email && (
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-red-400" />
                    <span>{patient.email}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-red-400" />
                  <span>{patient.age} Years Old</span>
                </div>
              </div>

              {(patient.village || patient.district || patient.address) && (
                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                  <MapPin className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                  <span className="truncate">
                    {[patient.village, patient.district, patient.address].filter(Boolean).join(', ')}
                  </span>
                </div>
              )}

              <div className="pt-2 border-t border-white/5 space-y-1">
                <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Chief Dental Concern</p>
                <p className="text-xs text-gray-200 italic font-medium">
                  &ldquo;{patient.patientProblem}&rdquo;
                </p>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Patient Appointments Section */}
        <GlassCard className="p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-red-400" />
              <h3 className="text-sm font-bold text-gray-100 uppercase tracking-wider">
                Appointments & Consultations ({appointments.length})
              </h3>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAppointmentModal(true)}
              className="text-xs gap-1.5 border-red-800/40 text-red-300 hover:bg-red-950/40"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Appointment
            </Button>
          </div>

          {appointments.length === 0 ? (
            <div className="text-center py-8 space-y-3 border border-dashed border-white/10 rounded-xl">
              <CalendarIcon className="w-8 h-8 text-gray-600 mx-auto" />
              <p className="text-xs text-gray-400">No appointments scheduled for this patient yet</p>
              <Button variant="outline" size="sm" onClick={() => setShowAppointmentModal(true)} className="text-xs">
                Schedule First Appointment
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-gray-400 font-semibold uppercase tracking-wider">
                    <th className="pb-2.5">Date & Time</th>
                    <th className="pb-2.5">Procedure / Category</th>
                    <th className="pb-2.5">Status</th>
                    <th className="pb-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {appointments.map((apt) => (
                    <tr key={apt.id || (apt as any)._id} className="hover:bg-white/[0.02]">
                      <td className="py-3">
                        <p className="font-bold text-gray-100">{apt.appointmentDate}</p>
                        <p className="text-[11px] text-gray-400 font-mono">{apt.appointmentTime}</p>
                      </td>
                      <td className="py-3 text-gray-200">
                        <span className="font-semibold">{apt.category}</span>
                        {apt.notes && <p className="text-[10px] text-gray-400 italic truncate max-w-xs">{apt.notes}</p>}
                      </td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          apt.status === 'completed'
                            ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/50'
                            : apt.status === 'cancelled'
                            ? 'bg-red-950/80 text-red-400 border border-red-800/50'
                            : 'bg-blue-950/80 text-blue-300 border border-blue-800/50'
                        }`}>
                          {apt.status}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEditApt(apt)}
                            className="h-7 px-2 text-[11px] text-gray-300 hover:text-white hover:bg-white/10 gap-1"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            Edit
                          </Button>
                          {apt.status === 'upcoming' && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleUpdateAptStatus(apt.id || (apt as any)._id, 'completed')}
                                className="h-7 px-2 text-[11px] text-emerald-400 hover:bg-emerald-950/40 gap-1"
                              >
                                <Check className="w-3.5 h-3.5" />
                                Done
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleUpdateAptStatus(apt.id || (apt as any)._id, 'cancelled')}
                                className="h-7 px-2 text-[11px] text-amber-400 hover:bg-amber-950/40 gap-1"
                              >
                                <X className="w-3.5 h-3.5" />
                                Cancel
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>

        {/* Patient Invoices / Receipts Section */}
        <GlassCard className="p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <ReceiptIcon className="w-4 h-4 text-red-400" />
              <h3 className="text-sm font-bold text-gray-100 uppercase tracking-wider">
                Luckydental Invoices & Receipts ({receipts.length})
              </h3>
            </div>
            <Link href={`/patients/${patient.patientNumber}/receipt/new`}>
              <Button variant="primary" size="sm" className="text-xs gap-1.5 shadow-glow-red">
                <Plus className="w-3.5 h-3.5" />
                {receipts.length > 0 ? 'Edit Active Receipt' : 'New Invoice'}
              </Button>
            </Link>
          </div>

          {receipts.length === 0 ? (
            <div className="text-center py-8 space-y-3 border border-dashed border-white/10 rounded-xl">
              <ReceiptIcon className="w-8 h-8 text-gray-600 mx-auto" />
              <p className="text-xs text-gray-400">No receipts generated yet for this patient</p>
              <Link href={`/patients/${patient.patientNumber}/receipt/new`}>
                <Button variant="outline" size="sm" className="text-xs">
                  Create First Invoice
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-gray-400 font-semibold uppercase tracking-wider">
                    <th className="pb-2.5">Invoice #</th>
                    <th className="pb-2.5">Date</th>
                    <th className="pb-2.5">Appointment</th>
                    <th className="pb-2.5">Items</th>
                    <th className="pb-2.5 text-right">Total</th>
                    <th className="pb-2.5 text-right">Paid</th>
                    <th className="pb-2.5 text-right">Due</th>
                    <th className="pb-2.5 text-center">Status</th>
                    <th className="pb-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {receipts.map((rec) => (
                    <tr key={rec.id || (rec as any)._id} className="hover:bg-white/[0.02]">
                      <td className="py-3 font-mono font-bold text-red-400">
                        #{rec.receiptNumber}
                      </td>
                      <td className="py-3 text-gray-400">
                        {new Date(rec.createdAt).toLocaleDateString('en-GB')}
                      </td>
                      <td className="py-3 text-gray-300">
                        {rec.appointmentDate ? (
                          <span className="text-[11px] font-medium text-red-300">
                            {rec.appointmentDate} ({rec.appointmentTime || 'N/A'})
                          </span>
                        ) : (
                          <span className="text-gray-500 italic text-[11px]">Not scheduled</span>
                        )}
                      </td>
                      <td className="py-3 text-gray-300">
                        {rec.items?.length || 0} service(s)
                      </td>
                      <td className="py-3 text-right font-mono font-semibold text-gray-100">
                        ৳{rec.totalAmount?.toLocaleString('en-BD')}
                      </td>
                      <td className="py-3 text-right font-mono text-emerald-400">
                        ৳{rec.paidAmount?.toLocaleString('en-BD')}
                      </td>
                      <td className="py-3 text-right font-mono font-bold text-red-400">
                        ৳{rec.dueAmount?.toLocaleString('en-BD')}
                      </td>
                      <td className="py-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          rec.paymentStatus === 'paid' 
                            ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-700/40' 
                            : 'bg-red-950/80 text-red-400 border border-red-700/40'
                        }`}>
                          {rec.paymentStatus}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedReceipt(rec);
                              setShowReceiptModal(true);
                            }}
                            className="h-7 px-2 text-xs text-gray-300 hover:text-white gap-1"
                            title="View full invoice"
                          >
                            <Eye className="w-3.5 h-3.5 text-red-400" />
                            View
                          </Button>
                          <Link href={`/patients/${patient.patientNumber}/receipt/new`}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs text-gray-400 hover:text-white gap-1"
                              title="Edit receipt"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              Edit
                            </Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>

        {/* Danger Zone: Delete Patient */}
        <div className="pt-4 flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDeleteModal(true)}
            className="text-xs text-red-400 hover:text-red-300 hover:bg-red-950/30 gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete Patient Record
          </Button>
        </div>
      </div>

      {/* Share Modal */}
      <Modal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        title="Public / Private Profile Sharing"
        description="Generate a secure public link for the patient or their guardian"
      >
        <div className="space-y-4 text-xs">
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-gray-100">Profile Visibility</p>
                <p className="text-gray-400 text-[11px]">
                  {patient.isPublic 
                    ? 'Anyone with the secure token link can view verified dental records and receipts.' 
                    : 'Profile is private. Only authenticated administrators can view.'}
                </p>
              </div>
              <Button
                variant={patient.isPublic ? 'primary' : 'outline'}
                size="sm"
                onClick={() => handleToggleShare(!patient.isPublic)}
                isLoading={isTogglingShare}
                className="text-xs shrink-0"
              >
                {patient.isPublic ? 'Make Private' : 'Make Public'}
              </Button>
            </div>

            {patient.isPublic && patient.publicToken && (
              <div className="pt-3 border-t border-white/10 space-y-2">
                <label className="block text-gray-300 font-semibold">Secure Public URL</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={typeof window !== 'undefined' ? `${window.location.origin}/public/patient/${patient.publicToken}` : ''}
                    className="w-full glass-input rounded-xl px-3 py-2 text-xs font-mono text-gray-300"
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleCopyPublicLink}
                    className="shrink-0 gap-1 text-xs"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedLink ? 'Copied' : 'Copy'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Book Appointment Modal */}
      <Modal
        isOpen={showAppointmentModal}
        onClose={() => setShowAppointmentModal(false)}
        title="Schedule Dental Appointment"
        description={`Set appointment for #${patient.patientNumber} - ${patient.fullName}`}
      >
        <form onSubmit={handleAddAppointment} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <DatePicker
              label="Appointment Date"
              value={aptDate}
              onChange={(val) => setAptDate(val)}
              required
            />
            <TimePicker
              label="Appointment Time"
              value={aptTime}
              onChange={(val) => setAptTime(val)}
              required
            />
          </div>

          <div>
            <label className="block text-gray-300 font-medium mb-1">Procedure / Category</label>
            <select
              value={aptCategory}
              onChange={(e) => setAptCategory(e.target.value)}
              className="w-full glass-input rounded-xl px-3 py-2 text-xs text-gray-100 bg-[#0e0e0e]"
            >
              <option value="General Consultation">General Consultation</option>
              <option value="Root Canal">Root Canal</option>
              <option value="Scaling & Polishing">Scaling & Polishing</option>
              <option value="Dental Extraction">Dental Extraction</option>
              <option value="Crown & Bridge">Crown & Bridge</option>
              <option value="Dental Filling">Dental Filling</option>
            </select>
          </div>

          <div>
            <label className="block text-gray-300 font-medium mb-1">Notes / Pre-requisites</label>
            <textarea
              rows={2}
              value={aptNotes}
              onChange={(e) => setAptNotes(e.target.value)}
              placeholder="Add patient instructions..."
              className="w-full glass-input rounded-xl p-3 text-xs text-gray-100 placeholder:text-gray-500 resize-none"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setShowAppointmentModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isSavingApt}>
              Confirm Booking
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Appointment Modal */}
      <Modal
        isOpen={showEditAptModal}
        onClose={() => setShowEditAptModal(false)}
        title="Edit Dental Appointment"
        description="Modify scheduled consultation time or status"
      >
        <form onSubmit={handleSaveEditAppointment} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <DatePicker
              label="Appointment Date"
              value={editAptDate}
              onChange={(val) => setEditAptDate(val)}
              required
            />
            <TimePicker
              label="Appointment Time"
              value={editAptTime}
              onChange={(val) => setEditAptTime(val)}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-300 font-medium mb-1">Category</label>
              <select
                value={editAptCategory}
                onChange={(e) => setEditAptCategory(e.target.value)}
                className="w-full glass-input rounded-xl px-3 py-2 text-xs text-gray-100 bg-[#0e0e0e]"
              >
                <option value="General Consultation">General Consultation</option>
                <option value="Root Canal">Root Canal</option>
                <option value="Scaling & Polishing">Scaling & Polishing</option>
                <option value="Dental Extraction">Dental Extraction</option>
                <option value="Crown & Bridge">Crown & Bridge</option>
                <option value="Dental Filling">Dental Filling</option>
              </select>
            </div>

            <div>
              <label className="block text-gray-300 font-medium mb-1">Status</label>
              <select
                value={editAptStatus}
                onChange={(e) => setEditAptStatus(e.target.value as AppointmentStatus)}
                className="w-full glass-input rounded-xl px-3 py-2 text-xs text-gray-100 bg-[#0e0e0e]"
              >
                <option value="upcoming">Upcoming</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="no-show">No-Show</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-gray-300 font-medium mb-1">Notes</label>
            <textarea
              rows={2}
              value={editAptNotes}
              onChange={(e) => setEditAptNotes(e.target.value)}
              placeholder="Clinical remarks or follow-up directions..."
              className="w-full glass-input rounded-xl p-3 text-xs text-gray-100 placeholder:text-gray-500 resize-none"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setShowEditAptModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isSavingEditApt}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Patient Modal */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Edit Patient Information"
        description={`Update records for #${patient.patientNumber} - ${patient.fullName}`}
        maxWidth="lg"
      >
        <form onSubmit={handleUpdatePatient} className="space-y-4">
          {/* Profile Photo */}
          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
            <label className="block text-xs font-medium text-gray-300 uppercase tracking-wide">
              Profile Photo
            </label>
            <div className="flex items-center gap-3">
              {editImageUrl ? (
                <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-red-500/50 shadow-glow-red-sm shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={editImageUrl} alt="Preview" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-14 h-14 rounded-xl bg-white/[0.02] border border-white/10 flex items-center justify-center text-gray-500 shrink-0">
                  <User className="w-6 h-6" />
                </div>
              )}

              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={editFileInputRef}
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  onChange={handleEditImageUpload}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  isLoading={isUploadingEditImage}
                  onClick={() => editFileInputRef.current?.click()}
                  className="text-xs gap-1.5"
                >
                  <Upload className="w-3 h-3" />
                  {editImageUrl ? 'Change' : 'Upload'}
                </Button>

                {editImageUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleDeleteImage}
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    Remove
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Full Name *"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              required
            />
            <Input
              label="Age *"
              type="number"
              value={editAge}
              onChange={(e) => setEditAge(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Phone Number *"
              value={editPhone}
              onChange={(e) => setEditPhone(e.target.value)}
              required
            />
            <Input
              label="Email Address"
              type="email"
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Village / Local Area"
              value={editVillage}
              onChange={(e) => setEditVillage(e.target.value)}
            />
            <Input
              label="District / Thana"
              value={editDistrict}
              onChange={(e) => setEditDistrict(e.target.value)}
            />
          </div>

          <Input
            label="Full Address"
            value={editAddress}
            onChange={(e) => setEditAddress(e.target.value)}
          />

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-gray-300 uppercase tracking-wide">
              Medical Complaint / Problem *
            </label>
            <textarea
              rows={3}
              value={editProblem}
              onChange={(e) => setEditProblem(e.target.value)}
              className="w-full glass-input rounded-xl p-3 text-xs text-gray-100 placeholder:text-gray-500 resize-none"
              required
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsEditOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSavingEdit}
              className="gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              Save Updates
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Patient Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Patient Record"
        description="Permanently remove this patient file and clinical data"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-red-950/60 border border-red-700/50 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div className="text-xs text-red-200 space-y-1">
              <p className="font-bold text-red-100">
                Are you sure you want to delete #{patient.patientNumber} - {patient.fullName}?
              </p>
              <p className="text-red-300/80">
                This action is irreversible and will delete all associated medical notes, profiles, and billing histories.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDeleteModal(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleDeletePatient}
              isLoading={isDeleting}
              className="bg-red-700 hover:bg-red-600 border-red-500 gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Confirm Delete
            </Button>
          </div>
        </div>
      </Modal>

      {/* Full Canonical Receipt Modal */}
      <Modal
        isOpen={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
        title="Official Dental Invoice"
        description={`Luckydental Receipt #${selectedReceipt?.receiptNumber}`}
        maxWidth="lg"
      >
        {selectedReceipt && (
          <div className="space-y-4">
            <ReceiptDocument
              receipt={selectedReceipt}
              showActions={false}
            />
            <div className="flex justify-between items-center pt-2 border-t border-white/10 no-print">
              <Link href={`/patients/${patient.patientNumber}/receipt/new`}>
                <Button variant="outline" size="sm" className="text-xs gap-1.5">
                  <Edit3 className="w-3.5 h-3.5" />
                  Edit Receipt
                </Button>
              </Link>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowReceiptModal(false)}>
                  Close
                </Button>
                <Button variant="primary" size="sm" onClick={() => window.print()} className="gap-1.5 shadow-glow-red-sm">
                  <Printer className="w-3.5 h-3.5" />
                  Print Invoice
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
}
