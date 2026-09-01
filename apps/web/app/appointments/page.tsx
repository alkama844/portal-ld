'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  Clock, 
  Filter, 
  Trash2, 
  Search, 
  Check, 
  X, 
  Edit3, 
  User, 
  Phone,
  RotateCcw
} from 'lucide-react';
import DashboardLayout from '@/app/dashboard/layout';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { DatePicker } from '@/components/ui/date-picker';
import { TimePicker } from '@/components/ui/time-picker';
import { useToast } from '@/components/ui/toast';
import { apiFetch } from '@/lib/api/client';
import { Appointment, AppointmentStatus, Patient, ServicePackage } from '@patient-portal/shared';

type ScheduleTab = 'today' | 'tomorrow' | 'upcoming' | 'past' | 'all';

export default function AppointmentsPage() {
  const { showToast } = useToast();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Active Schedule Tab
  const [activeTab, setActiveTab] = useState<ScheduleTab>('today');

  // Search & Filters State
  const [search, setSearch] = useState('');
  const [filterDate, setFilterDate] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // New Appointment Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPatientNumber, setNewPatientNumber] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newTime, setNewTime] = useState('07:30 PM');
  const [newCategory, setNewCategory] = useState('General Consultation');
  const [newNotes, setNewNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Appointment Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editId, setEditId] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editCategory, setEditCategory] = useState('General Consultation');
  const [editStatus, setEditStatus] = useState<AppointmentStatus>('upcoming');
  const [editNotes, setEditNotes] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const tomorrowStr = useMemo(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  }, []);

  const fetchAppointments = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterDate) params.set('date', filterDate);
      if (filterCategory && filterCategory !== 'All') params.set('category', filterCategory);
      if (filterStatus && filterStatus !== 'all') params.set('status', filterStatus);

      const res = await apiFetch<Appointment[]>(`/appointments?${params.toString()}`);
      if (res.success && res.data) {
        setAppointments(res.data);
      } else {
        setAppointments([]);
      }
    } catch {
      setAppointments([]);
    } finally {
      setIsLoading(false);
    }
  }, [filterDate, filterCategory, filterStatus]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // Load patients and service packages
  useEffect(() => {
    async function loadAuxData() {
      try {
        const [patRes, pkgRes] = await Promise.all([
          apiFetch<Patient[]>('/patients?limit=100'),
          apiFetch<ServicePackage[]>('/packages')
        ]);
        if (patRes.success && patRes.data) setPatients(patRes.data);
        if (pkgRes.success && pkgRes.data) setPackages(pkgRes.data);
      } catch {}
    }
    loadAuxData();
  }, []);

  // Filter appointments by tab and search
  const filteredAppointments = useMemo(() => {
    let list = [...appointments];

    // Filter by Tab
    if (activeTab === 'today') {
      list = list.filter((a) => a.appointmentDate === todayStr);
    } else if (activeTab === 'tomorrow') {
      list = list.filter((a) => a.appointmentDate === tomorrowStr);
    } else if (activeTab === 'upcoming') {
      list = list.filter((a) => a.appointmentDate >= todayStr && a.status !== 'completed' && a.status !== 'cancelled');
    } else if (activeTab === 'past') {
      list = list.filter((a) => a.appointmentDate < todayStr || a.status === 'completed');
    }

    // Filter by Search Query
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (a) =>
          a.patientName?.toLowerCase().includes(q) ||
          a.patientPhone?.includes(q) ||
          String(a.patientNumber) === q.replace('#', '') ||
          a.category?.toLowerCase().includes(q)
      );
    }

    // Sort chronologically by date and time
    list.sort((a, b) => {
      if (a.appointmentDate !== b.appointmentDate) {
        return a.appointmentDate.localeCompare(b.appointmentDate);
      }
      return (a.appointmentTime || '').localeCompare(b.appointmentTime || '');
    });

    return list;
  }, [appointments, activeTab, search, todayStr]);

  // Create Appointment (Immediate Save / Approved)
  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatientNumber || !newDate || !newTime) {
      showToast('Please select a patient, date, and appointment time.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiFetch<Appointment>('/appointments', {
        method: 'POST',
        body: JSON.stringify({
          patientNumber: Number(newPatientNumber.replace('#', '')),
          appointmentDate: newDate,
          appointmentTime: newTime,
          category: newCategory,
          notes: newNotes.trim() || undefined
        })
      });

      if (res.success && res.data) {
        showToast('Appointment scheduled and approved successfully', 'success');
        setShowCreateModal(false);
        setNewNotes('');
        fetchAppointments();
      } else {
        showToast(res.error || 'Failed to schedule appointment', 'error');
      }
    } catch {
      showToast('Network error while scheduling appointment', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (apt: Appointment) => {
    setEditId(apt.id || (apt as any)._id);
    setEditDate(apt.appointmentDate);
    setEditTime(apt.appointmentTime);
    setEditCategory(apt.category || 'General Consultation');
    setEditStatus(apt.status);
    setEditNotes(apt.notes || '');
    setShowEditModal(true);
  };

  // Save Edit Appointment
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editId) return;

    setIsSavingEdit(true);
    try {
      const res = await apiFetch<Appointment>(`/appointments/${editId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          appointmentDate: editDate,
          appointmentTime: editTime,
          category: editCategory,
          status: editStatus,
          notes: editNotes.trim() || undefined
        })
      });

      if (res.success && res.data) {
        showToast('Appointment updated successfully', 'success');
        setShowEditModal(false);
        fetchAppointments();
      } else {
        showToast(res.error || 'Failed to update appointment', 'error');
      }
    } catch {
      showToast('Network error updating appointment', 'error');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Quick Status Update
  const handleUpdateStatus = async (id: string, status: AppointmentStatus) => {
    try {
      const res = await apiFetch(`/appointments/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      });
      if (res.success) {
        showToast(`Appointment marked as ${status}`, 'success');
        fetchAppointments();
      } else {
        showToast(res.error || 'Failed to update appointment status', 'error');
      }
    } catch {
      showToast('Network error updating status', 'error');
    }
  };

  // Delete Appointment
  const handleDeleteAppointment = async (id: string) => {
    try {
      const res = await apiFetch(`/appointments/${id}`, { method: 'DELETE' });
      if (res.success) {
        showToast('Appointment removed', 'success');
        setAppointments((prev) => prev.filter((a) => a.id !== id && a._id !== id));
      }
    } catch {
      showToast('Failed to delete appointment', 'error');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-red-950/80 border border-red-700/50 text-red-400">
                <CalendarIcon className="w-5 h-5" />
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                Dental Appointment Schedule
              </h1>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Organize patient visits, consultations, maxillofacial surgeries, and follow-ups
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`text-xs gap-1.5 ${isFilterOpen ? 'border-red-500 text-red-400' : 'text-gray-300'}`}
            >
              <Filter className="w-3.5 h-3.5" />
              Filter
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowCreateModal(true)}
              className="text-xs gap-1.5 shadow-glow-red"
            >
              <Plus className="w-3.5 h-3.5" />
              Book Appointment
            </Button>
          </div>
        </div>

        {/* Schedule Tabs & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Tabs: Today, Tomorrow, Upcoming, Past, All */}
          <div className="flex items-center p-1 rounded-xl bg-black/40 border border-white/10 text-xs overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('today')}
              className={`px-3.5 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap ${
                activeTab === 'today'
                  ? 'bg-red-600 text-white shadow-glow-red-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('tomorrow')}
              className={`px-3.5 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap ${
                activeTab === 'tomorrow'
                  ? 'bg-red-600 text-white shadow-glow-red-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Tomorrow
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('upcoming')}
              className={`px-3.5 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap ${
                activeTab === 'upcoming'
                  ? 'bg-red-600 text-white shadow-glow-red-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Upcoming
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('past')}
              className={`px-3.5 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap ${
                activeTab === 'past'
                  ? 'bg-red-600 text-white shadow-glow-red-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Past / Completed
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3.5 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap ${
                activeTab === 'all'
                  ? 'bg-red-600 text-white shadow-glow-red-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              All
            </button>
          </div>

          {/* Search Box */}
          <div className="relative max-w-xs w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search patient, phone, #..."
              className="w-full glass-input text-xs rounded-xl pl-9 pr-3 py-2 text-gray-200 placeholder:text-gray-500"
            />
          </div>
        </div>

        {/* Expandable Filter Panel */}
        {isFilterOpen && (
          <GlassCard className="p-4 space-y-3 relative z-30 border border-slate-200 dark:border-red-900/30">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <DatePicker
                label="Pick Specific Date"
                value={filterDate}
                onChange={(val) => setFilterDate(val)}
                placeholder="All dates"
              />

              <div>
                <label className="block text-xs font-medium text-gray-300 uppercase tracking-wide mb-1.5">
                  Procedure Category
                </label>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="w-full glass-input rounded-xl px-3 py-2 text-xs text-gray-100 bg-[#0e0e0e]"
                >
                  <option value="All">All Categories</option>
                  <option value="General Consultation">General Consultation</option>
                  <option value="Root Canal">Root Canal</option>
                  <option value="Scaling & Polishing">Scaling & Polishing</option>
                  <option value="Dental Extraction">Dental Extraction</option>
                  <option value="Crown & Bridge">Crown & Bridge</option>
                  <option value="Dental Filling">Dental Filling</option>
                  {packages.map((pkg) => (
                    <option key={pkg.id || (pkg as any)._id} value={pkg.name}>
                      {pkg.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 uppercase tracking-wide mb-1.5">
                  Status
                </label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full glass-input rounded-xl px-3 py-2 text-xs text-gray-100 bg-[#0e0e0e]"
                >
                  <option value="all">All Statuses</option>
                  <option value="upcoming">Upcoming</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="no-show">No-Show</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFilterDate('');
                  setFilterCategory('All');
                  setFilterStatus('all');
                }}
                className="text-xs text-gray-400 hover:text-white gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                Reset Filters
              </Button>
            </div>
          </GlassCard>
        )}

        {/* Appointments List / Table */}
        {isLoading ? (
          <div className="min-h-[250px] flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredAppointments.length === 0 ? (
          <GlassCard className="p-12 text-center space-y-3">
            <CalendarIcon className="w-10 h-10 text-gray-600 mx-auto" />
            <h3 className="text-base font-bold text-gray-200">No Appointments Found</h3>
            <p className="text-xs text-gray-400 max-w-sm mx-auto">
              {filterDate
                ? `There are no scheduled dental visits for ${filterDate}.`
                : 'No appointments match the selected filter criteria.'}
            </p>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowCreateModal(true)}
              className="text-xs gap-1.5 mt-2 shadow-glow-red"
            >
              <Plus className="w-3.5 h-3.5" />
              Schedule Visit
            </Button>
          </GlassCard>
        ) : (
          <GlassCard className="p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/[0.03] border-b border-white/10 text-gray-400 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-5">Time & Date</th>
                    <th className="py-3.5 px-5">Patient Details</th>
                    <th className="py-3.5 px-5">Category / Procedure</th>
                    <th className="py-3.5 px-5">Status</th>
                    <th className="py-3.5 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredAppointments.map((apt) => (
                    <tr key={apt.id || (apt as any)._id} className="hover:bg-white/[0.02]">
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-red-400 shrink-0" />
                          <div>
                            <p className="font-bold text-gray-100 text-sm font-mono">{apt.appointmentTime}</p>
                            <p className="text-[11px] text-gray-400">
                              {new Date(apt.appointmentDate + 'T00:00:00').toLocaleDateString('en-GB', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-5">
                        <Link href={`/patients/${apt.patientNumber}`} className="group block">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-red-400 bg-red-950/80 border border-red-800/40 px-1.5 py-0.5 rounded text-[10px]">
                              #{apt.patientNumber}
                            </span>
                            <span className="font-semibold text-gray-100 group-hover:text-red-400 transition-colors">
                              {apt.patientName}
                            </span>
                          </div>
                          <p className="text-[11px] font-mono text-gray-400 mt-0.5">{apt.patientPhone}</p>
                        </Link>
                      </td>

                      <td className="py-4 px-5">
                        <span className="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/10 font-medium text-gray-200">
                          {apt.category || 'General'}
                        </span>
                        {apt.notes && (
                          <p className="text-[11px] text-gray-400 italic mt-1 max-w-xs truncate">
                            &ldquo;{apt.notes}&rdquo;
                          </p>
                        )}
                      </td>

                      <td className="py-4 px-5">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                          apt.status === 'completed'
                            ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/50'
                            : apt.status === 'cancelled'
                            ? 'bg-red-950/80 text-red-400 border border-red-800/50'
                            : apt.status === 'no-show'
                            ? 'bg-amber-950/80 text-amber-300 border border-amber-800/50'
                            : 'bg-blue-950/80 text-blue-300 border border-blue-800/50'
                        }`}>
                          {apt.status}
                        </span>
                      </td>

                      <td className="py-4 px-5 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEdit(apt)}
                            className="h-7 px-2 text-[11px] text-gray-300 hover:text-white hover:bg-white/10 gap-1"
                            title="Edit appointment"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-red-400" />
                            Edit
                          </Button>
                          {apt.status === 'upcoming' && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleUpdateStatus(apt.id || (apt as any)._id, 'completed')}
                                className="h-7 px-2 text-[11px] text-emerald-400 hover:bg-emerald-950/40 gap-1"
                                title="Mark Completed"
                              >
                                <Check className="w-3.5 h-3.5" />
                                Done
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleUpdateStatus(apt.id || (apt as any)._id, 'cancelled')}
                                className="h-7 px-2 text-[11px] text-amber-400 hover:bg-amber-950/40 gap-1"
                                title="Cancel Appointment"
                              >
                                <X className="w-3.5 h-3.5" />
                                Cancel
                              </Button>
                            </>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteAppointment(apt.id || (apt as any)._id)}
                            className="h-7 px-2 text-[11px] text-red-400 hover:bg-red-950/50"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>
        )}
      </div>

      {/* New Appointment Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Schedule Dental Appointment"
        description="Book a consultation or procedure time slot"
      >
        <form onSubmit={handleCreateAppointment} className="space-y-4 text-xs">
          {/* Patient Selector */}
          <div className="space-y-1.5">
            <label className="block text-gray-300 font-medium uppercase tracking-wide">
              Select Patient *
            </label>
            <select
              value={newPatientNumber}
              onChange={(e) => setNewPatientNumber(e.target.value)}
              className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs text-gray-100 bg-[#0e0e0e] border border-red-900/40"
              required
            >
              <option value="" className="bg-[#121212] text-gray-400">
                -- Choose Patient from Records --
              </option>
              {patients.map((p) => (
                <option key={p.id || (p as any)._id} value={p.patientNumber} className="bg-[#121212] text-gray-200">
                  #{p.patientNumber} - {p.fullName} ({p.phone})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <DatePicker
              label="Date"
              value={newDate}
              onChange={(val) => setNewDate(val)}
              required
            />
            <TimePicker
              label="Time Slot"
              value={newTime}
              onChange={(val) => setNewTime(val)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-gray-300 font-medium uppercase tracking-wide">
              Procedure / Category
            </label>
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs text-gray-100 bg-[#0e0e0e]"
            >
              <option value="General Consultation">General Consultation</option>
              <option value="Root Canal">Root Canal</option>
              <option value="Scaling & Polishing">Scaling & Polishing</option>
              <option value="Dental Extraction">Dental Extraction</option>
              <option value="Crown & Bridge">Crown & Bridge</option>
              <option value="Dental Filling">Dental Filling</option>
              {packages.map((pkg) => (
                <option key={pkg.id || (pkg as any)._id} value={pkg.name}>
                  {pkg.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-gray-300 font-medium uppercase tracking-wide">
              Doctor Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              placeholder="Instructions, pre-requisites, or doctor notes..."
              className="w-full glass-input rounded-xl p-3 text-xs text-gray-100 placeholder:text-gray-500 resize-none"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowCreateModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSubmitting}
              className="gap-1.5 shadow-glow-red-sm"
            >
              Confirm Appointment
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Appointment Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Dental Appointment"
        description="Modify scheduled consultation time or status"
      >
        <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <DatePicker
              label="Appointment Date"
              value={editDate}
              onChange={(val) => setEditDate(val)}
              required
            />
            <TimePicker
              label="Appointment Time"
              value={editTime}
              onChange={(val) => setEditTime(val)}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-300 font-medium mb-1">Category</label>
              <select
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value)}
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
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as AppointmentStatus)}
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
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              placeholder="Clinical remarks or follow-up directions..."
              className="w-full glass-input rounded-xl p-3 text-xs text-gray-100 placeholder:text-gray-500 resize-none"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isSavingEdit}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
