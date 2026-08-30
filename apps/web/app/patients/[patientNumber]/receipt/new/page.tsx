'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Receipt as ReceiptIcon, 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Printer, 
  CreditCard, 
  Wallet, 
  CheckCircle, 
  AlertCircle, 
  Sparkles, 
  FileText, 
  User, 
  Phone, 
  Calendar as CalendarIcon,
  Clock,
  DollarSign,
  Package as PackageIcon,
  Save,
  Check,
  RotateCcw,
  Eye,
  Edit3
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
import { Patient, ServicePackage, ReceiptItem, PaymentMethod, Receipt } from '@patient-portal/shared';

export default function NewReceiptPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const patientNumber = params.patientNumber as string;

  // Patient & Packages State
  const [patient, setPatient] = useState<Patient | null>(null);
  const [availablePackages, setAvailablePackages] = useState<ServicePackage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Existing Receipt Singleton State
  const [existingReceipt, setExistingReceipt] = useState<Receipt | null>(null);
  const [isExplicitNewReceipt, setIsExplicitNewReceipt] = useState(false);

  // Active View Tab: 'builder' | 'preview'
  const [activeTab, setActiveTab] = useState<'builder' | 'preview'>('builder');

  // Line Items State
  const [items, setItems] = useState<ReceiptItem[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState('');

  // Custom Item Modal State
  const [showCustomItemModal, setShowCustomItemModal] = useState(false);
  const [customItemName, setCustomItemName] = useState('');
  const [customItemPrice, setCustomItemPrice] = useState('');
  const [customItemQty, setCustomItemQty] = useState('1');

  // Appointment State inside Receipt Page
  const [appointmentDate, setAppointmentDate] = useState<string>('');
  const [appointmentTime, setAppointmentTime] = useState<string>('07:30 PM');

  // Discount & Payment State
  const [discount, setDiscount] = useState<string>('0');
  const [discountType, setDiscountType] = useState<'flat' | 'percentage'>('flat');
  const [paidAmount, setPaidAmount] = useState<string>('0');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [notes, setNotes] = useState('');

  // Submission & Print State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [savedReceipt, setSavedReceipt] = useState<Receipt | null>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Fetch Patient, Existing Receipt & Packages
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [patientRes, packagesRes, receiptsRes] = await Promise.all([
          apiFetch<Patient>(`/patients/${patientNumber}`),
          apiFetch<ServicePackage[]>('/packages'),
          apiFetch<Receipt[]>(`/receipts/patient/${patientNumber}`)
        ]);

        if (patientRes.success && patientRes.data) {
          setPatient(patientRes.data);
        } else {
          showToast('Failed to load patient record.', 'error');
        }

        if (packagesRes.success && packagesRes.data) {
          setAvailablePackages(packagesRes.data);
        }

        // Singleton: Check if an active receipt exists for this patient
        if (receiptsRes.success && receiptsRes.data && receiptsRes.data.length > 0) {
          const currentRec = receiptsRes.data[0];
          setExistingReceipt(currentRec);
          setItems(currentRec.items || []);
          setDiscount(String(currentRec.discount || 0));
          setDiscountType(currentRec.discountType || 'flat');
          setPaidAmount(String(currentRec.paidAmount || 0));
          setPaymentMethod(currentRec.paymentMethod || 'cash');
          setNotes(currentRec.notes || '');
          if (currentRec.appointmentDate) setAppointmentDate(currentRec.appointmentDate);
          if (currentRec.appointmentTime) setAppointmentTime(currentRec.appointmentTime);
        } else {
          // Restore Draft from LocalStorage if no saved receipt
          try {
            const savedDraft = localStorage.getItem(`luckydental_receipt_draft_${patientNumber}`);
            if (savedDraft) {
              const parsed = JSON.parse(savedDraft);
              if (parsed.items && Array.isArray(parsed.items)) setItems(parsed.items);
              if (parsed.discount !== undefined) setDiscount(parsed.discount);
              if (parsed.discountType) setDiscountType(parsed.discountType);
              if (parsed.paidAmount !== undefined) setPaidAmount(parsed.paidAmount);
              if (parsed.paymentMethod) setPaymentMethod(parsed.paymentMethod);
              if (parsed.appointmentDate) setAppointmentDate(parsed.appointmentDate);
              if (parsed.appointmentTime) setAppointmentTime(parsed.appointmentTime);
              if (parsed.notes) setNotes(parsed.notes);
            }
          } catch {}
        }
      } catch {
        showToast('Network error loading patient billing information.', 'error');
      } finally {
        setIsLoading(false);
      }
    }

    if (patientNumber) {
      loadData();
    }
  }, [patientNumber]);

  // Save Draft to LocalStorage on changes
  useEffect(() => {
    if (!existingReceipt && (items.length > 0 || Number(paidAmount) > 0 || notes || appointmentDate)) {
      localStorage.setItem(
        `luckydental_receipt_draft_${patientNumber}`,
        JSON.stringify({ items, discount, discountType, paidAmount, paymentMethod, appointmentDate, appointmentTime, notes })
      );
    }
  }, [items, discount, discountType, paidAmount, paymentMethod, appointmentDate, appointmentTime, notes, patientNumber, existingReceipt]);

  // Add Package to Line Items
  const handleAddPackage = () => {
    if (!selectedPackageId) return;

    const pkg = availablePackages.find((p) => p.id === selectedPackageId || (p as any)._id === selectedPackageId);
    if (!pkg) return;

    const existingIndex = items.findIndex((i) => i.packageId === pkg.id || i.packageId === (pkg as any)._id);
    if (existingIndex !== -1) {
      const updated = [...items];
      updated[existingIndex].quantity += 1;
      updated[existingIndex].total = updated[existingIndex].quantity * updated[existingIndex].price;
      setItems(updated);
      showToast(`Increased quantity for ${pkg.name}`, 'info');
    } else {
      const newItem: ReceiptItem = {
        id: `item-${Date.now()}`,
        name: pkg.name,
        description: pkg.description,
        packageId: pkg.id || (pkg as any)._id,
        price: pkg.price,
        quantity: 1,
        total: pkg.price
      };
      setItems([...items, newItem]);
      showToast(`Added ${pkg.name} to bill`, 'success');
    }

    setSelectedPackageId('');
  };

  // Add Custom Item
  const handleAddCustomItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customItemName.trim()) {
      showToast('Item name is required', 'error');
      return;
    }
    const priceNum = Math.max(0, Number(customItemPrice) || 0);
    const qtyNum = Math.max(1, Number(customItemQty) || 1);

    const newItem: ReceiptItem = {
      id: `custom-${Date.now()}`,
      name: customItemName.trim(),
      price: priceNum,
      quantity: qtyNum,
      total: priceNum * qtyNum
    };

    setItems([...items, newItem]);
    setCustomItemName('');
    setCustomItemPrice('');
    setCustomItemQty('1');
    setShowCustomItemModal(false);
    showToast('Custom item added to bill', 'success');
  };

  // Update Item Quantity
  const handleUpdateQty = (index: number, delta: number) => {
    const updated = [...items];
    const newQty = Math.max(1, updated[index].quantity + delta);
    updated[index].quantity = newQty;
    updated[index].total = newQty * updated[index].price;
    setItems(updated);
  };

  // Remove Item
  const handleRemoveItem = (index: number) => {
    const updated = items.filter((_, i) => i !== index);
    setItems(updated);
  };

  // Reset Draft
  const handleResetDraft = () => {
    if (existingReceipt) {
      setItems(existingReceipt.items || []);
      setDiscount(String(existingReceipt.discount || 0));
      setPaidAmount(String(existingReceipt.paidAmount || 0));
      setNotes(existingReceipt.notes || '');
      setAppointmentDate(existingReceipt.appointmentDate || '');
      setAppointmentTime(existingReceipt.appointmentTime || '07:30 PM');
      showToast('Reset back to saved receipt state', 'info');
    } else {
      setItems([]);
      setDiscount('0');
      setPaidAmount('0');
      setNotes('');
      setAppointmentDate('');
      try {
        localStorage.removeItem(`luckydental_receipt_draft_${patientNumber}`);
      } catch {}
      showToast('Receipt draft cleared', 'info');
    }
  };

  // Calculations
  const subtotal = useMemo(() => {
    return items.reduce((acc, item) => acc + item.total, 0);
  }, [items]);

  const discountAmount = useMemo(() => {
    const d = Math.max(0, Number(discount) || 0);
    if (discountType === 'percentage') {
      return Math.round((subtotal * Math.min(100, d)) / 100);
    }
    return Math.min(subtotal, d);
  }, [subtotal, discount, discountType]);

  const grandTotal = useMemo(() => {
    return Math.max(0, subtotal - discountAmount);
  }, [subtotal, discountAmount]);

  const paidNum = useMemo(() => {
    return Math.max(0, Number(paidAmount) || 0);
  }, [paidAmount]);

  const dueAmount = useMemo(() => {
    return Math.max(0, grandTotal - paidNum);
  }, [grandTotal, paidNum]);

  // Pre-fill paidAmount with grandTotal
  const handleSetFullPayment = () => {
    setPaidAmount(grandTotal.toString());
  };

  // Construct Transient Receipt for Live Preview
  const livePreviewReceipt: Receipt = useMemo(() => {
    return {
      id: existingReceipt?.id || `rec-preview`,
      receiptNumber: existingReceipt?.receiptNumber || 'DRAFT',
      patientId: patient?.id || patient?._id || '',
      patientNumber: Number(patientNumber),
      patientName: patient?.fullName || 'Patient',
      patientPhone: patient?.phone || '',
      patientAge: patient?.age,
      patientAddress: patient?.address || patient?.village || patient?.district,
      patientProblem: patient?.patientProblem,
      appointmentDate: appointmentDate || undefined,
      appointmentTime: appointmentTime || undefined,
      items,
      subtotal,
      discount: discountAmount,
      discountType,
      totalAmount: grandTotal,
      paidAmount: paidNum,
      dueAmount,
      paymentMethod,
      paymentStatus: dueAmount === 0 && grandTotal > 0 ? 'paid' : paidNum > 0 ? 'partial' : 'pending',
      notes,
      version: existingReceipt?.version || 1,
      createdAt: existingReceipt?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }, [existingReceipt, patient, patientNumber, appointmentDate, appointmentTime, items, subtotal, discountAmount, discountType, grandTotal, paidNum, dueAmount, paymentMethod, notes]);

  // Submit & Save Receipt
  const handleSaveReceipt = async (triggerPrint = false) => {
    if (submittingRef.current || isSubmitting) return;

    if (items.length === 0) {
      showToast('Please select at least one treatment or package.', 'error');
      return;
    }

    submittingRef.current = true;
    setIsSubmitting(true);

    try {
      const res = await apiFetch<any>('/receipts', {
        method: 'POST',
        body: JSON.stringify({
          patientNumber: Number(patientNumber),
          items: items.map((i) => ({
            name: i.name,
            description: i.description,
            packageId: i.packageId,
            price: i.price,
            quantity: i.quantity
          })),
          discount: Number(discount) || 0,
          discountType,
          paidAmount: Number(paidAmount) || 0,
          paymentMethod,
          appointmentDate: appointmentDate?.trim() || undefined,
          appointmentTime: appointmentTime?.trim() || undefined,
          notes: notes.trim() || undefined,
          isNewReceipt: isExplicitNewReceipt
        })
      });

      if (res.success && res.data) {
        const receipt = res.data?.data || res.data;
        setSavedReceipt(receipt);
        setExistingReceipt(receipt);
        setIsExplicitNewReceipt(false);
        
        // Clear saved draft on success
        try {
          localStorage.removeItem(`luckydental_receipt_draft_${patientNumber}`);
        } catch {}

        const recNum = receipt.receiptNumber || receipt.id || '';
        showToast(
          existingReceipt && !isExplicitNewReceipt
            ? `Receipt #${recNum} updated successfully!`
            : `Receipt #${recNum} generated successfully!`,
          'success'
        );

        if (triggerPrint) {
          setShowPrintModal(true);
        } else {
          router.push(`/patients/${patientNumber}`);
        }
      } else {
        submittingRef.current = false;
        showToast(res.error || 'Failed to save receipt.', 'error');
      }
    } catch {
      submittingRef.current = false;
      showToast('Network error saving receipt.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="min-h-[400px] flex items-center justify-center">
          <div className="text-center space-y-3">
            <div className="w-10 h-10 border-2 border-red-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-gray-400">Loading Luckydental billing engine...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <Link href={`/patients/${patientNumber}`}>
              <Button variant="ghost" size="sm" className="p-2 text-gray-400 hover:text-white" aria-label="Back">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                  {existingReceipt && !isExplicitNewReceipt ? 'Edit Patient Receipt' : 'Create Patient Receipt'}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-red-950/80 border border-red-700/60 text-red-400 text-xs font-mono font-bold">
                  #{patientNumber}
                </span>
                {existingReceipt && !isExplicitNewReceipt && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-700/60 text-emerald-400 text-[11px] font-mono font-bold">
                    INVOICE #{existingReceipt.receiptNumber}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400">
                {existingReceipt && !isExplicitNewReceipt
                  ? 'Editing existing active receipt (Singleton). Preserves invoice number & records version history.'
                  : 'Treatment billing, appointment booking, advance deposit, and official PDF invoice'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Switcher */}
            <div className="flex items-center p-1 rounded-xl bg-black/40 border border-white/10 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('builder')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  activeTab === 'builder'
                    ? 'bg-red-600 text-white shadow-glow-red-sm'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Invoice Builder
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all ${
                  activeTab === 'preview'
                    ? 'bg-red-600 text-white shadow-glow-red-sm'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                Live Preview
              </button>
            </div>

            <Button variant="ghost" size="sm" onClick={handleResetDraft} className="text-xs text-gray-400 hover:text-red-400 gap-1">
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </Button>
          </div>
        </div>

        {/* Existing Receipt Banner with Explicit New Receipt Option */}
        {existingReceipt && (
          <GlassCard className="p-4 border-l-4 border-l-amber-500 bg-amber-950/20">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div>
                <p className="font-bold text-amber-200">
                  {isExplicitNewReceipt ? 'Mode: Creating New Additional Receipt' : `Active Receipt Found (#${existingReceipt.receiptNumber})`}
                </p>
                <p className="text-amber-300/80 text-[11px] mt-0.5">
                  {isExplicitNewReceipt
                    ? 'A new separate receipt number will be generated upon saving.'
                    : 'Changes will update this current receipt without generating a duplicate receipt number.'}
                </p>
              </div>

              <Button
                type="button"
                variant={isExplicitNewReceipt ? 'outline' : 'secondary'}
                size="sm"
                onClick={() => setIsExplicitNewReceipt(!isExplicitNewReceipt)}
                className="text-xs shrink-0"
              >
                {isExplicitNewReceipt ? 'Switch to Edit Existing' : 'Create New Receipt Instead'}
              </Button>
            </div>
          </GlassCard>
        )}

        {/* Patient Summary Banner */}
        {patient && (
          <GlassCard className="p-4 sm:p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-red-950/60 text-red-400 border border-red-800/40">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-gray-400 text-[10px] uppercase font-semibold">Patient Name</p>
                  <p className="text-sm font-bold text-gray-100">{patient.fullName}</p>
                  <p className="text-gray-400">{patient.age} Years Old</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-red-950/60 text-red-400 border border-red-800/40">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-gray-400 text-[10px] uppercase font-semibold">Contact Phone</p>
                  <p className="text-sm font-bold text-gray-100 font-mono">{patient.phone}</p>
                  <p className="text-gray-400 truncate max-w-[150px]">{patient.address || patient.village || 'N/A'}</p>
                </div>
              </div>

              <div className="sm:col-span-2 flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-red-950/60 text-red-400 border border-red-800/40 shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-gray-400 text-[10px] uppercase font-semibold">Clinical Problem / Reason</p>
                  <p className="text-xs text-gray-200 font-medium line-clamp-2 italic">
                    &ldquo;{patient.patientProblem}&rdquo;
                  </p>
                </div>
              </div>
            </div>
          </GlassCard>
        )}

        {/* Tab 1: Live Preview Tab */}
        {activeTab === 'preview' ? (
          <div className="space-y-4">
            <ReceiptDocument
              receipt={livePreviewReceipt}
              showActions={true}
              onEdit={() => setActiveTab('builder')}
              onPrint={() => handleSaveReceipt(true)}
            />
          </div>
        ) : (
          /* Tab 2: Builder Tab */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Columns: Treatments, Appointment Selector, Line Items Table */}
            <div className="lg:col-span-2 space-y-6">
              {/* Dedicated Appointment Section */}
              <GlassCard className="p-5 space-y-4 border border-red-900/30">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-red-400" />
                    <h2 className="text-sm font-bold text-gray-100 uppercase tracking-wider">
                      Appointment Booking
                    </h2>
                  </div>
                  <span className="text-[11px] text-gray-400">
                    Saves against patient & prints on receipt
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <DatePicker
                    label="Appointment Date"
                    value={appointmentDate}
                    onChange={(val) => setAppointmentDate(val)}
                    placeholder="Select appointment date"
                  />

                  <TimePicker
                    label="Appointment Time"
                    value={appointmentTime}
                    onChange={(val) => setAppointmentTime(val)}
                    placeholder="07:30 PM"
                  />
                </div>

                {appointmentDate && (
                  <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/40 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-red-300">
                      <Clock className="w-4 h-4 text-red-400" />
                      <span>
                        Scheduled: <strong>{new Date(appointmentDate + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</strong> at <strong>{appointmentTime}</strong>
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAppointmentDate('')}
                      className="text-[11px] text-gray-400 hover:text-red-300 underline"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </GlassCard>

              {/* Treatment Packages & Custom Procedure Selector */}
              <GlassCard className="p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <PackageIcon className="w-4 h-4 text-red-400" />
                    <h2 className="text-sm font-bold text-gray-100 uppercase tracking-wider">
                      Treatment Procedures & Services
                    </h2>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCustomItemModal(true)}
                    className="text-xs gap-1.5 border-red-700/40 text-red-300 hover:bg-red-950/50"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Custom Item
                  </Button>
                </div>

                {/* Package Dropdown Selector */}
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row gap-2.5">
                    <div className="relative flex-1">
                      <select
                        value={selectedPackageId}
                        onChange={(e) => setSelectedPackageId(e.target.value)}
                        className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-gray-100 appearance-none bg-[#0e0e0e] border border-red-900/40 focus:border-red-500 pr-8"
                      >
                        <option value="" className="bg-[#121212] text-gray-400">
                          -- Select Treatment Package from Catalog --
                        </option>
                        {availablePackages.map((pkg) => (
                          <option key={pkg.id || (pkg as any)._id} value={pkg.id || (pkg as any)._id} className="bg-[#121212] text-gray-200">
                            {pkg.name} — ৳{pkg.price.toLocaleString('en-BD')} ({pkg.category || 'Dental'})
                          </option>
                        ))}
                      </select>
                    </div>

                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={handleAddPackage}
                      disabled={!selectedPackageId}
                      className="sm:w-auto gap-1.5 text-xs shrink-0 shadow-glow-red-sm"
                    >
                      <Plus className="w-4 h-4" />
                      Add to Bill
                    </Button>
                  </div>
                </div>
              </GlassCard>

              {/* Line Items Table */}
              <GlassCard className="p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <h2 className="text-sm font-bold text-gray-100 uppercase tracking-wider">
                    Selected Items ({items.length})
                  </h2>
                  <span className="text-xs font-mono text-gray-400">
                    Subtotal: ৳{subtotal.toLocaleString('en-BD')}
                  </span>
                </div>

                {items.length === 0 ? (
                  <div className="py-12 text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-white/[0.02] border border-white/10 flex items-center justify-center text-gray-500 mx-auto">
                      <ReceiptIcon className="w-6 h-6" />
                    </div>
                    <p className="text-xs text-gray-400 font-medium">No treatments added yet.</p>
                    <p className="text-[11px] text-gray-500">
                      Select a package above or add a custom fee/service.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-white/10 text-gray-400 uppercase text-[10px]">
                            <th className="py-2">Procedure / Item</th>
                            <th className="py-2 text-right">Price</th>
                            <th className="py-2 text-center">Qty</th>
                            <th className="py-2 text-right">Total</th>
                            <th className="py-2 text-center w-10"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {items.map((item, idx) => (
                            <tr key={item.id || idx} className="hover:bg-white/[0.02]">
                              <td className="py-3 pr-2">
                                <p className="font-semibold text-gray-100">{item.name}</p>
                                {item.description && (
                                  <p className="text-[10px] text-gray-400 truncate max-w-xs">{item.description}</p>
                                )}
                              </td>
                              <td className="py-3 text-right font-mono text-gray-300">
                                ৳{item.price.toLocaleString('en-BD')}
                              </td>
                              <td className="py-3 text-center">
                                <div className="inline-flex items-center gap-1.5 bg-black/40 border border-white/10 rounded-lg p-1">
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateQty(idx, -1)}
                                    className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-white rounded hover:bg-white/10 text-xs font-bold"
                                  >
                                    -
                                  </button>
                                  <span className="w-6 text-center font-mono font-bold text-xs text-gray-100">
                                    {item.quantity}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateQty(idx, 1)}
                                    className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-white rounded hover:bg-white/10 text-xs font-bold"
                                  >
                                    +
                                  </button>
                                </div>
                              </td>
                              <td className="py-3 text-right font-mono font-bold text-gray-100">
                                ৳{item.total.toLocaleString('en-BD')}
                              </td>
                              <td className="py-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveItem(idx)}
                                  className="p-1.5 text-gray-500 hover:text-red-400 rounded-lg hover:bg-red-950/40 transition-colors"
                                  aria-label="Remove item"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </GlassCard>
            </div>

            {/* Right 1 Column: Discount, Deposit, Payment Summary & Actions */}
            <div className="space-y-6">
              <GlassCard className="p-5 space-y-4 sticky top-6">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <h2 className="text-sm font-bold text-gray-100 uppercase tracking-wider">
                    Billing Summary
                  </h2>
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-white/5 text-gray-300">
                    BDT (৳)
                  </span>
                </div>

                {/* Subtotal Display */}
                <div className="flex justify-between items-center text-xs text-gray-300">
                  <span>Subtotal:</span>
                  <span className="font-mono font-bold text-gray-100">৳{subtotal.toLocaleString('en-BD')}</span>
                </div>

                {/* Discount Control */}
                <div className="space-y-1.5 pt-2 border-t border-white/5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-gray-300">Discount</label>
                    <div className="flex items-center rounded-lg bg-black/40 border border-white/10 p-0.5 text-[10px]">
                      <button
                        type="button"
                        onClick={() => setDiscountType('flat')}
                        className={`px-2 py-0.5 rounded font-bold transition-all ${
                          discountType === 'flat' ? 'bg-red-600 text-white' : 'text-gray-400'
                        }`}
                      >
                        ৳ Flat
                      </button>
                      <button
                        type="button"
                        onClick={() => setDiscountType('percentage')}
                        className={`px-2 py-0.5 rounded font-bold transition-all ${
                          discountType === 'percentage' ? 'bg-red-600 text-white' : 'text-gray-400'
                        }`}
                      >
                        % Off
                      </button>
                    </div>
                  </div>
                  <Input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    className="font-mono text-right"
                  />
                  {discountAmount > 0 && (
                    <p className="text-[10px] text-emerald-400 text-right">
                      -৳{discountAmount.toLocaleString('en-BD')} applied
                    </p>
                  )}
                </div>

                {/* Grand Total Highlight */}
                <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-700/50 space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-200">Grand Total:</span>
                    <span className="text-lg font-black font-mono text-red-400">
                      ৳{grandTotal.toLocaleString('en-BD')}
                    </span>
                  </div>
                </div>

                {/* Paid Amount / Advance Deposit */}
                <div className="space-y-1.5 pt-2 border-t border-white/5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-gray-300">
                      Cash Deposit / Paid Now
                    </label>
                    <button
                      type="button"
                      onClick={handleSetFullPayment}
                      className="text-[10px] text-red-400 hover:text-red-300 font-semibold"
                    >
                      Pay Full (৳{grandTotal})
                    </button>
                  </div>
                  <Input
                    type="number"
                    min="0"
                    max={grandTotal}
                    placeholder="0"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                    className="font-mono text-right"
                  />
                </div>

                {/* Due Balance Calculation */}
                <div className="flex justify-between items-center p-3 rounded-xl bg-black/40 border border-white/10 text-xs">
                  <span className="text-gray-300 font-medium">Due Balance:</span>
                  <span className={`font-mono font-bold text-sm ${dueAmount > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                    ৳{dueAmount.toLocaleString('en-BD')}
                  </span>
                </div>

                {/* Payment Method */}
                <div className="space-y-2 pt-2 border-t border-white/5">
                  <label className="block text-xs font-medium text-gray-300 uppercase tracking-wide">
                    Payment Method
                  </label>
                  <div className="grid grid-cols-3 gap-1.5 text-xs">
                    {(['cash', 'bkash', 'nagad', 'card', 'bank_transfer'] as PaymentMethod[]).map((method) => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setPaymentMethod(method)}
                        className={`p-2 rounded-xl border text-[11px] font-semibold capitalize transition-all ${
                          paymentMethod === method
                            ? 'bg-red-600 border-red-500 text-white shadow-glow-red-sm'
                            : 'bg-black/30 border-white/10 text-gray-400 hover:text-white'
                        }`}
                      >
                        {method.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-1.5 pt-2 border-t border-white/5">
                  <label className="block text-xs font-medium text-gray-300">Doctor / Invoice Notes</label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Optional patient instructions or diagnosis notes..."
                    className="w-full glass-input rounded-xl p-2.5 text-xs text-gray-100 placeholder:text-gray-500 resize-none"
                  />
                </div>

                {/* Action Buttons with Rapid-Click Guard */}
                <div className="space-y-2.5 pt-4 border-t border-white/10">
                  <Button
                    type="button"
                    variant="primary"
                    size="lg"
                    disabled={items.length === 0 || isSubmitting}
                    isLoading={isSubmitting}
                    onClick={() => handleSaveReceipt(true)}
                    className="w-full justify-center gap-2 text-sm shadow-glow-red"
                  >
                    <Printer className="w-4 h-4" />
                    {isSubmitting ? 'Saving receipt...' : 'Save & Print Invoice'}
                  </Button>

                  <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    disabled={items.length === 0 || isSubmitting}
                    isLoading={isSubmitting}
                    onClick={() => handleSaveReceipt(false)}
                    className="w-full justify-center gap-2 text-xs"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {isSubmitting ? 'Saving receipt...' : 'Save Receipt & Finish'}
                  </Button>
                </div>
              </GlassCard>
            </div>
          </div>
        )}
      </div>

      {/* Custom Item Modal */}
      <Modal
        isOpen={showCustomItemModal}
        onClose={() => setShowCustomItemModal(false)}
        title="Add Custom Procedure / Item"
        description="Add ad-hoc consultation fees, medicines, therapy sessions, or diagnostic tests."
      >
        <form onSubmit={handleAddCustomItem} className="space-y-4">
          <Input
            label="Service / Item Description"
            placeholder="e.g. Tooth Extraction, Scaling, Root Canal, Dressing"
            value={customItemName}
            onChange={(e) => setCustomItemName(e.target.value)}
            required
            autoFocus
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Unit Price (৳)"
              type="number"
              min="0"
              placeholder="500"
              value={customItemPrice}
              onChange={(e) => setCustomItemPrice(e.target.value)}
              required
            />
            <Input
              label="Quantity"
              type="number"
              min="1"
              placeholder="1"
              value={customItemQty}
              onChange={(e) => setCustomItemQty(e.target.value)}
              required
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowCustomItemModal(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Add to Bill
            </Button>
          </div>
        </form>
      </Modal>

      {/* Printable Receipt Modal with Canonical ReceiptDocument */}
      <Modal
        isOpen={showPrintModal}
        onClose={() => {
          setShowPrintModal(false);
          router.push(`/patients/${patientNumber}`);
        }}
        title="Official Dental Invoice"
        description="Luckydental official receipt"
        maxWidth="lg"
      >
        {savedReceipt && (
          <div className="space-y-4">
            <ReceiptDocument
              receipt={savedReceipt}
              showActions={false}
            />
            <div className="flex justify-end gap-2.5 pt-2 border-t border-white/10 no-print">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowPrintModal(false);
                  router.push(`/patients/${patientNumber}`);
                }}
              >
                Close & Return
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => window.print()}
                className="gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                Print Now
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
}
