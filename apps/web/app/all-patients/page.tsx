'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { 
  Users, 
  Search, 
  Plus, 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  Phone, 
  DollarSign, 
  History, 
  Loader2, 
  ArrowUpDown, 
  Filter,
  CheckCircle2,
  FileSpreadsheet,
  AlertCircle,
  X,
  User
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
import { AllPatientEntry } from '@patient-portal/shared';

type SortOption = 'date' | 'time' | 'serial';

export default function AllPatientsPage() {
  const { showToast } = useToast();

  const [entries, setEntries] = useState<AllPatientEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('serial');

  // Add Patient Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const savingRef = useRef(false);

  // Form fields
  const [formName, setFormName] = useState('');
  const [formAge, setFormAge] = useState('');
  const [formMobile, setFormMobile] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formDate, setFormDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [formTime, setFormTime] = useState('10:30 AM');

  // Validation errors map
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Field input refs for auto-focusing on first missing field
  const nameInputRef = useRef<HTMLInputElement>(null);
  const ageInputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const locationInputRef = useRef<HTMLInputElement>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);
  const dateInputRef = useRef<HTMLDivElement>(null);
  const timeInputRef = useRef<HTMLDivElement>(null);

  // Patient Visit History Modal State
  const [selectedPatientHistory, setSelectedPatientHistory] = useState<AllPatientEntry[] | null>(null);
  const [historyPatientName, setHistoryPatientName] = useState('');
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Fetch entries
  const fetchEntries = async () => {
    setIsLoading(true);
    try {
      const res = await apiFetch<AllPatientEntry[]>(`/all-patients?sortBy=${sortBy}&search=${encodeURIComponent(searchQuery.trim())}`);
      if (res.success && Array.isArray(res.data)) {
        setEntries(res.data);
      } else {
        setEntries([]);
      }
    } catch {
      showToast('Network error loading all patient entries', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, [sortBy]);

  // Client-side quick filter when typing
  const filteredEntries = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return entries;
    return entries.filter((e) => 
      e.patientName.toLowerCase().includes(q) ||
      (e.mobileNumber || e.phone || '').toLowerCase().includes(q) ||
      e.serial.toLowerCase().includes(q) ||
      (e.location && e.location.toLowerCase().includes(q))
    );
  }, [entries, searchQuery]);

  // Handle Add Entry with strict validation
  const handleAddPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingRef.current || isSaving) return;

    const errors: Record<string, string> = {};

    if (!formName.trim()) {
      errors.patientName = 'Patient Name is required';
    }
    if (!formAge.trim() || isNaN(Number(formAge)) || Number(formAge) <= 0) {
      errors.age = 'A valid positive Age is required';
    }
    if (!formMobile.trim()) {
      errors.mobileNumber = 'Mobile Number is required';
    }
    if (!formLocation.trim()) {
      errors.location = 'Location is required';
    }
    if (!formAmount.trim() || isNaN(Number(formAmount)) || Number(formAmount) < 0) {
      errors.amount = 'Valid Amount (৳) is required';
    }
    if (!formDate.trim()) {
      errors.date = 'Date is required';
    }
    if (!formTime.trim()) {
      errors.time = 'Time is required';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      showToast('Please fill in all strictly required fields', 'error');

      // Auto focus on the first missing field
      if (errors.patientName) {
        nameInputRef.current?.focus();
      } else if (errors.age) {
        ageInputRef.current?.focus();
      } else if (errors.mobileNumber) {
        mobileInputRef.current?.focus();
      } else if (errors.location) {
        locationInputRef.current?.focus();
      } else if (errors.amount) {
        amountInputRef.current?.focus();
      } else if (errors.date) {
        dateInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else if (errors.time) {
        timeInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    setFieldErrors({});
    savingRef.current = true;
    setIsSaving(true);

    try {
      const res = await apiFetch<AllPatientEntry>('/all-patients', {
        method: 'POST',
        body: JSON.stringify({
          patientName: formName.trim(),
          age: Number(formAge),
          phone: formMobile.trim(),
          mobileNumber: formMobile.trim(),
          location: formLocation.trim(),
          amount: Number(formAmount),
          date: formDate.trim(),
          time: formTime.trim()
        })
      });

      if (res.success && res.data) {
        showToast(`Patient #${res.data.serial} added to ledger successfully!`, 'success');
        setShowAddModal(false);
        // Reset form
        setFormName('');
        setFormAge('');
        setFormMobile('');
        setFormLocation('');
        setFormAmount('');
        setFormDate(new Date().toISOString().split('T')[0]);
        setFormTime('10:30 AM');
        fetchEntries();
      } else {
        showToast(res.error || 'Failed to save patient entry', 'error');
      }
    } catch {
      showToast('Network error saving patient entry', 'error');
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  };

  // Open Patient History Modal
  const handleOpenHistory = async (entry: AllPatientEntry) => {
    setHistoryPatientName(entry.patientName);
    setIsLoadingHistory(true);
    setSelectedPatientHistory(null);

    try {
      const identifier = entry.patientNumber || entry.mobileNumber || entry.phone;
      const res = await apiFetch<AllPatientEntry[]>(`/all-patients/patient/${identifier}`);
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        setSelectedPatientHistory(res.data);
      } else {
        // Fallback to all entries with matching mobile or name
        const targetPhone = entry.mobileNumber || entry.phone;
        const localMatches = entries.filter((e) => 
          (targetPhone && (e.mobileNumber === targetPhone || e.phone === targetPhone)) ||
          e.patientName.toLowerCase() === entry.patientName.toLowerCase()
        );
        setSelectedPatientHistory(localMatches.length > 0 ? localMatches : [entry]);
      }
    } catch {
      setSelectedPatientHistory([entry]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-red-900 border border-red-500/40 flex items-center justify-center text-white shadow-glow-red-sm">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  All Patients Ledger
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-red-100 dark:bg-red-950/80 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-400 text-xs font-mono font-bold">
                  {entries.length} Total
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">
                Structured Excel-like patient register with sequential server-side serial numbers and visit histories.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setFieldErrors({});
                setShowAddModal(true);
              }}
              className="gap-1.5 shadow-glow-red-sm"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Patient</span>
            </Button>
          </div>
        </div>

        {/* Filter and Sort Toolbar */}
        <GlassCard className="p-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by Name, Phone, or Serial (e.g. 0001)..."
                className="w-full glass-input rounded-xl pl-9 pr-4 py-2 text-xs sm:text-sm text-slate-900 dark:text-gray-100 placeholder:text-slate-400 dark:placeholder:text-gray-500 bg-white dark:bg-[#0e0e0e] border border-slate-200 dark:border-white/10 focus:border-red-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-semibold text-slate-500 dark:text-gray-400 flex items-center gap-1">
                <ArrowUpDown className="w-3.5 h-3.5" />
                Sort:
              </span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="glass-input rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-gray-200 bg-white dark:bg-[#0e0e0e] border border-slate-200 dark:border-white/10 focus:border-red-500"
              >
                <option value="date">Sort by Date</option>
                <option value="time">Sort by Time</option>
                <option value="serial">Sort by Serial</option>
              </select>
            </div>
          </div>
        </GlassCard>

        {/* Desktop Excel-like Table View */}
        <div className="hidden md:block">
          <GlassCard className="overflow-hidden p-0 border border-slate-200 dark:border-white/10">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/80 dark:bg-white/[0.04] border-b border-slate-200 dark:border-white/10 text-slate-600 dark:text-gray-400 uppercase text-[10px] font-extrabold tracking-wider">
                    <th className="py-3 px-4 w-20">Serial</th>
                    <th className="py-3 px-4">Patient Name</th>
                    <th className="py-3 px-3 w-16 text-center">Age</th>
                    <th className="py-3 px-4">Mobile Number</th>
                    <th className="py-3 px-4">Location</th>
                    <th className="py-3 px-4 text-right">Amount (৳)</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Time</th>
                    <th className="py-3 px-4 text-center w-24">History</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-medium">
                  {isLoading ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400 dark:text-gray-500">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-red-600 mb-2" />
                        <p className="text-xs">Loading patient registry...</p>
                      </td>
                    </tr>
                  ) : filteredEntries.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400 dark:text-gray-500 space-y-2">
                        <Users className="w-8 h-8 mx-auto text-slate-300 dark:text-gray-600" />
                        <p className="text-xs font-semibold">No patient records found matching criteria</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setFieldErrors({});
                            setShowAddModal(true);
                          }}
                          className="text-xs"
                        >
                          + Add First Entry
                        </Button>
                      </td>
                    </tr>
                  ) : (
                    filteredEntries.map((entry) => (
                      <tr 
                        key={entry.id || entry.serial} 
                        className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors group cursor-pointer"
                        onClick={() => handleOpenHistory(entry)}
                      >
                        <td className="py-3 px-4 font-mono font-black text-red-600 dark:text-red-400">
                          {entry.serial}
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-bold text-slate-900 dark:text-gray-100 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                            {entry.patientName}
                          </p>
                        </td>
                        <td className="py-3 px-3 text-center text-slate-600 dark:text-gray-400 font-mono">
                          {entry.age}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-700 dark:text-gray-300">
                          {entry.mobileNumber || entry.phone}
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-gray-300">
                          {entry.location}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          ৳{entry.amount.toLocaleString('en-BD')}
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-gray-400 whitespace-nowrap">
                          {entry.date}
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-gray-400 whitespace-nowrap">
                          {entry.time}
                        </td>
                        <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenHistory(entry)}
                            className="h-7 px-2 text-[11px] text-slate-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 gap-1"
                            title="View visit history across dates"
                          >
                            <History className="w-3.5 h-3.5" />
                            History
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </div>

        {/* Mobile Responsive Card-Based Layout */}
        <div className="md:hidden space-y-3">
          {isLoading ? (
            <div className="py-12 text-center text-slate-400 dark:text-gray-500">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-red-600 mb-2" />
              <p className="text-xs">Loading patient registry...</p>
            </div>
          ) : filteredEntries.length === 0 ? (
            <GlassCard className="py-8 text-center text-slate-400 dark:text-gray-500 space-y-2">
              <Users className="w-8 h-8 mx-auto text-slate-300 dark:text-gray-600" />
              <p className="text-xs font-semibold">No patient records found</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setFieldErrors({});
                  setShowAddModal(true);
                }}
                className="text-xs"
              >
                + Add First Entry
              </Button>
            </GlassCard>
          ) : (
            filteredEntries.map((entry) => (
              <GlassCard key={entry.id || entry.serial} className="p-4 space-y-3 border-l-4 border-l-red-600">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-red-100 dark:bg-red-950/80 border border-red-300 dark:border-red-800 text-[11px] font-mono font-black text-red-700 dark:text-red-400">
                        #{entry.serial}
                      </span>
                      <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                        {entry.patientName}
                      </h3>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">
                      {entry.age} Years Old &bull; {entry.location}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-mono font-black text-emerald-600 dark:text-emerald-400">
                      ৳{entry.amount.toLocaleString('en-BD')}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100 dark:border-white/5 text-slate-600 dark:text-gray-300">
                  <div className="flex items-center gap-1.5 font-mono">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{entry.mobileNumber || entry.phone}</span>
                  </div>
                  <div className="flex items-center gap-1.5 justify-end">
                    <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
                    <span>{entry.date}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-white/5 text-[11px]">
                  <span className="flex items-center gap-1 text-slate-500 dark:text-gray-400">
                    <Clock className="w-3 h-3" />
                    {entry.time}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenHistory(entry)}
                    className="h-7 px-2 text-xs text-red-600 dark:text-red-400 gap-1"
                  >
                    <History className="w-3.5 h-3.5" />
                    View History
                  </Button>
                </div>
              </GlassCard>
            ))
          )}
        </div>
      </div>

      {/* "+ Add" Patient Entry Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => {
          if (!isSaving) {
            setShowAddModal(false);
            setFieldErrors({});
          }
        }}
        title="Add New Patient Entry"
        description="All fields are strictly required for registration into the clinic ledger."
      >
        <form onSubmit={handleAddPatient} className="space-y-4">
          {/* Patient Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1">
              Patient Name *
            </label>
            <input
              ref={nameInputRef}
              type="text"
              value={formName}
              onChange={(e) => {
                setFormName(e.target.value);
                if (fieldErrors.patientName) setFieldErrors({ ...fieldErrors, patientName: '' });
              }}
              placeholder="e.g. Mohammad Rahim"
              className={`w-full glass-input rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-gray-100 bg-white dark:bg-[#0e0e0e] border ${
                fieldErrors.patientName ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-200 dark:border-white/10'
              }`}
              autoFocus
            />
            {fieldErrors.patientName && (
              <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {fieldErrors.patientName}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Age */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1">
                Age *
              </label>
              <input
                ref={ageInputRef}
                type="number"
                min="1"
                max="120"
                value={formAge}
                onChange={(e) => {
                  setFormAge(e.target.value);
                  if (fieldErrors.age) setFieldErrors({ ...fieldErrors, age: '' });
                }}
                placeholder="e.g. 35"
                className={`w-full glass-input rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-gray-100 bg-white dark:bg-[#0e0e0e] border ${
                  fieldErrors.age ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-200 dark:border-white/10'
                }`}
              />
              {fieldErrors.age && (
                <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {fieldErrors.age}
                </p>
              )}
            </div>

            {/* Mobile Number */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1">
                Mobile Number *
              </label>
              <input
                ref={mobileInputRef}
                type="tel"
                value={formMobile}
                onChange={(e) => {
                  setFormMobile(e.target.value);
                  if (fieldErrors.mobileNumber) setFieldErrors({ ...fieldErrors, mobileNumber: '' });
                }}
                placeholder="e.g. 01712345678"
                className={`w-full glass-input rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-gray-100 bg-white dark:bg-[#0e0e0e] border font-mono ${
                  fieldErrors.mobileNumber ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-200 dark:border-white/10'
                }`}
              />
              {fieldErrors.mobileNumber && (
                <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {fieldErrors.mobileNumber}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Location */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1">
                Location *
              </label>
              <input
                ref={locationInputRef}
                type="text"
                value={formLocation}
                onChange={(e) => {
                  setFormLocation(e.target.value);
                  if (fieldErrors.location) setFieldErrors({ ...fieldErrors, location: '' });
                }}
                placeholder="e.g. Kushtia Sadar, Mirpur"
                className={`w-full glass-input rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-gray-100 bg-white dark:bg-[#0e0e0e] border ${
                  fieldErrors.location ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-200 dark:border-white/10'
                }`}
              />
              {fieldErrors.location && (
                <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {fieldErrors.location}
                </p>
              )}
            </div>

            {/* Amount */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1">
                Amount (৳) *
              </label>
              <input
                ref={amountInputRef}
                type="number"
                min="0"
                value={formAmount}
                onChange={(e) => {
                  setFormAmount(e.target.value);
                  if (fieldErrors.amount) setFieldErrors({ ...fieldErrors, amount: '' });
                }}
                placeholder="e.g. 1500"
                className={`w-full glass-input rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-gray-100 bg-white dark:bg-[#0e0e0e] border font-mono ${
                  fieldErrors.amount ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-200 dark:border-white/10'
                }`}
              />
              {fieldErrors.amount && (
                <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {fieldErrors.amount}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Date */}
            <div ref={dateInputRef}>
              <DatePicker
                label="Date *"
                value={formDate}
                onChange={(val) => {
                  setFormDate(val);
                  if (fieldErrors.date) setFieldErrors({ ...fieldErrors, date: '' });
                }}
                hasError={Boolean(fieldErrors.date)}
              />
              {fieldErrors.date && (
                <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {fieldErrors.date}
                </p>
              )}
            </div>

            {/* Time */}
            <div ref={timeInputRef}>
              <TimePicker
                label="Time *"
                value={formTime}
                onChange={(val) => {
                  setFormTime(val);
                  if (fieldErrors.time) setFieldErrors({ ...fieldErrors, time: '' });
                }}
                hasError={Boolean(fieldErrors.time)}
              />
              {fieldErrors.time && (
                <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {fieldErrors.time}
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-white/10">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAddModal(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSaving}
              className="gap-1.5 shadow-glow-red-sm"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  Save Entry
                </>
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Patient Multi-Date History Modal */}
      <Modal
        isOpen={Boolean(selectedPatientHistory)}
        onClose={() => setSelectedPatientHistory(null)}
        title={`Visit History — ${historyPatientName}`}
        description="Comprehensive timeline of visits and fees across all recorded dates"
        maxWidth="3xl"
      >
        {selectedPatientHistory && (
          <div className="space-y-4">
            {/* Summary statistics */}
            <div className="grid grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 text-xs">
              <div>
                <p className="text-[10px] text-slate-400 dark:text-gray-400 font-bold uppercase tracking-wider">Total Recorded Visits</p>
                <p className="text-base font-extrabold text-slate-900 dark:text-white font-mono mt-0.5">
                  {selectedPatientHistory.length}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 dark:text-gray-400 font-bold uppercase tracking-wider">Total Amount</p>
                <p className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
                  ৳{selectedPatientHistory.reduce((sum, e) => sum + e.amount, 0).toLocaleString('en-BD')}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 dark:text-gray-400 font-bold uppercase tracking-wider">Primary Location</p>
                <p className="text-xs font-bold text-slate-800 dark:text-gray-200 truncate mt-1">
                  {selectedPatientHistory[0]?.location || 'Kushtia'}
                </p>
              </div>
            </div>

            {/* Visit table */}
            <div className="overflow-x-auto border border-slate-200 dark:border-white/10 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-100 dark:bg-white/[0.04] border-b border-slate-200 dark:border-white/10 text-slate-600 dark:text-gray-400 uppercase text-[10px] font-bold">
                    <th className="py-2.5 px-3">Serial</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Time</th>
                    <th className="py-2.5 px-3">Location</th>
                    <th className="py-2.5 px-3 text-right">Amount (৳)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {selectedPatientHistory.map((item, idx) => (
                    <tr key={item.id || idx} className="hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                      <td className="py-2.5 px-3 font-mono font-bold text-red-600 dark:text-red-400">
                        {item.serial}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 dark:text-gray-300">
                        {item.date}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-gray-400">
                        {item.time}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-gray-300">
                        {item.location}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        ৳{item.amount.toLocaleString('en-BD')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedPatientHistory(null)}
              >
                Close History
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
}
