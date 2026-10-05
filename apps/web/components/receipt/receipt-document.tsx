'use client';

import React, { useState, useEffect } from 'react';
import { 
  Printer, 
  Edit3,
  ShieldCheck
} from 'lucide-react';
import { Receipt, Appointment, ClinicSettings, Patient } from '@patient-portal/shared';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api/client';

interface ReceiptDocumentProps {
  receipt: Receipt;
  appointment?: Appointment | null;
  onEdit?: () => void;
  onPrint?: () => void;
  showActions?: boolean;
  isPublic?: boolean;
  className?: string;
}

export function ReceiptDocument({
  receipt,
  onEdit,
  onPrint,
  showActions = true,
  isPublic = false,
  className = ''
}: ReceiptDocumentProps) {
  const [clinicSettings, setClinicSettings] = useState<ClinicSettings>({
    clinicName: 'Lucky Dental Care',
    tagline: 'SMILE FOR LIFE • ESTD 1982',
    phone: '01715-917834',
    email: '',
    address: 'Kushtia, Bangladesh',
    receiptFooter: 'Lucky Dental Care • SMILE FOR LIFE • Kushtia, Bangladesh'
  });

  const [resolvedPatientName, setResolvedPatientName] = useState(receipt.patientName || '');
  const [resolvedPatientPhone, setResolvedPatientPhone] = useState(receipt.patientPhone || '');
  const [resolvedPatientAge, setResolvedPatientAge] = useState(receipt.patientAge);

  // Guarantee canonical Patient Name from backend if receipt doesn't have it
  useEffect(() => {
    if ((!receipt.patientName || receipt.patientName === 'Patient') && receipt.patientNumber) {
      apiFetch<Patient>(`/patients/${receipt.patientNumber}`)
        .then((res) => {
          if (res.success && res.data) {
            setResolvedPatientName(res.data.fullName);
            if (res.data.phone) setResolvedPatientPhone(res.data.phone);
            if (res.data.age !== undefined) setResolvedPatientAge(res.data.age);
          }
        })
        .catch(() => {});
    } else {
      setResolvedPatientName(receipt.patientName || '');
      setResolvedPatientPhone(receipt.patientPhone || '');
      setResolvedPatientAge(receipt.patientAge);
    }
  }, [receipt.patientNumber, receipt.patientName, receipt.patientPhone, receipt.patientAge]);

  useEffect(() => {
    async function loadClinicSettings() {
      try {
        const res = await apiFetch<ClinicSettings>('/settings/clinic');
        if (res.success && res.data) {
          setClinicSettings({
            clinicName: res.data.clinicName || 'Lucky Dental Care',
            tagline: res.data.tagline || 'SMILE FOR LIFE • ESTD 1982',
            phone: res.data.phone || '01715-917834',
            email: res.data.email || '',
            // Explicitly enforce Kushtia if address accidentally has Dhaka
            address: res.data.address && !res.data.address.toLowerCase().includes('dhaka')
              ? res.data.address
              : 'Kushtia, Bangladesh',
            receiptFooter: res.data.receiptFooter || 'Lucky Dental Care • SMILE FOR LIFE • Kushtia, Bangladesh',
            logoUrl: res.data.logoUrl
          });
        }
      } catch {
        // Fallback to defaults
      }
    }
    loadClinicSettings();
  }, []);

  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    } else {
      window.print();
    }
  };

  const formattedReceiptDate = receipt.createdAt
    ? new Date(receipt.createdAt).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      })
    : new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });

  const formattedReceiptTime = receipt.createdAt
    ? new Date(receipt.createdAt).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })
    : '';

  const isCancelled = receipt.status === 'cancelled';
  const hasPreviousDue = Boolean(receipt.previousDueSnapshot && receipt.previousDueSnapshot > 0);
  const totalPayable = receipt.totalPayable !== undefined ? receipt.totalPayable : (receipt.totalAmount + (receipt.previousDueSnapshot || 0));

  // Active non-reversed payments calculation
  const activePayments = (receipt.payments || []).filter(
    (p) => p.status !== 'reversed' && p.status !== 'voided'
  );
  const totalPaid = activePayments.length > 0
    ? activePayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
    : (receipt.paidAmount || 0);

  const remainingDue = receipt.resultingDue !== undefined
    ? Math.max(0, totalPayable - totalPaid)
    : (receipt.dueAmount !== undefined ? Math.max(0, receipt.totalAmount - totalPaid) : 0);

  const isFullyPaid = !isCancelled && remainingDue === 0 && totalPayable > 0;
  const isPartial = !isCancelled && totalPaid > 0 && remainingDue > 0;

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Top Action Bar (hidden during print) */}
      {showActions && (
        <div className="flex flex-wrap items-center justify-between no-print px-1 gap-2">
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[11px] font-bold ${
              isCancelled
                ? 'bg-gray-800 text-gray-400 border-gray-700'
                : 'bg-red-950/60 border-red-800/40 text-red-400'
            }`}>
              <ShieldCheck className="w-3.5 h-3.5" />
              {isCancelled ? 'Cancelled Invoice' : 'Thermal Receipt (80mm)'}
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-mono font-bold">
              80 mm Thermal POS (Auto-Height)
            </span>
            {receipt.version && receipt.version > 1 && (
              <span className="text-[10px] text-gray-400 font-mono">
                v{receipt.version}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {onEdit && !isPublic && !isCancelled && (
              <Button
                variant="outline"
                size="sm"
                onClick={onEdit}
                className="gap-1.5 text-xs border-red-800/40 text-red-400 hover:text-white h-7 px-2.5"
              >
                <Edit3 className="w-3 h-3" />
                Edit Invoice
              </Button>
            )}
            <Button
              variant="primary"
              size="sm"
              onClick={handlePrint}
              className="gap-1.5 text-xs shadow-glow-red-sm h-7 px-3"
            >
              <Printer className="w-3 h-3" />
              Print Receipt
            </Button>
          </div>
        </div>
      )}

      {/* Screen Preview Container - Centered Thermal Paper Simulation */}
      <div className="receipt-preview-wrapper flex justify-center overflow-x-auto py-2 bg-slate-900/40 dark:bg-black/40 rounded-2xl border border-white/5 p-4">
        {/* Canonical Thermal Receipt Container: 80mm Width, Content-Driven AUTO Height */}
        <div 
          id="canonical-receipt-document"
          className="receipt-print-panel bg-white text-gray-900 border border-gray-300 shadow-xl font-sans select-text relative"
          style={{
            width: '80mm',
            minWidth: '80mm',
            maxWidth: '80mm',
            height: 'auto',
            minHeight: 'auto',
            boxSizing: 'border-box',
            padding: '3mm 4mm 4mm 4mm',
            display: 'flex',
            flexDirection: 'column',
            gap: '2.5mm'
          }}
        >
          {/* 1. Brand Logo & Header Information (Always Exists) */}
          <div className="text-center space-y-1 border-b border-dashed border-gray-400 pb-2">
            <div className="flex justify-center">
              <img 
                src={clinicSettings.logoUrl || '/logo_main.jpg'} 
                alt="Lucky Dental Care" 
                className="w-10 h-10 object-contain rounded shrink-0 border border-gray-200" 
              />
            </div>
            <div>
              <h1 className="text-[14px] font-black tracking-tight text-red-950 uppercase leading-tight font-sans">
                {clinicSettings.clinicName || 'LUCKY DENTAL CARE'}
              </h1>
              <p className="text-[9px] font-extrabold text-red-800 tracking-wider uppercase leading-none mt-0.5">
                {clinicSettings.tagline || 'SMILE FOR LIFE • ESTD 1982'}
              </p>
              <p className="text-[8px] font-bold text-gray-700 leading-tight mt-1">
                {clinicSettings.address || 'Kushtia, Bangladesh'}
              </p>
              <p className="text-[8px] text-gray-600 leading-none mt-0.5 font-mono">
                Hotline: {clinicSettings.phone || '01715-917834'}
              </p>
            </div>
          </div>

          {/* 2. Invoice Meta Strip (Invoice Number + Date/Time + Payment Status) */}
          <div className="border-b border-dashed border-gray-300 pb-2 text-[8.5px] leading-tight space-y-1">
            <div className="flex justify-between items-center font-mono">
              <span className="font-black text-[10px] text-red-950">
                INVOICE #{receipt.receiptNumber}
              </span>
              <span className={`px-1.5 py-0.2 rounded text-[7.5px] font-bold uppercase tracking-wider border leading-tight ${
                isCancelled
                  ? 'bg-gray-100 text-gray-700 border-gray-300'
                  : isFullyPaid
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : isPartial
                  ? 'bg-amber-50 text-amber-800 border-amber-300'
                  : 'bg-red-50 text-red-800 border-red-300'
              }`}>
                {isCancelled
                  ? 'CANCELLED'
                  : isFullyPaid
                  ? 'PAID'
                  : isPartial
                  ? 'PARTIAL'
                  : 'UNPAID'}
              </span>
            </div>

            <div className="flex justify-between text-gray-600 text-[8px]">
              <span>Date: <strong>{formattedReceiptDate}</strong></span>
              {formattedReceiptTime && <span>Time: <strong>{formattedReceiptTime}</strong></span>}
            </div>
          </div>

          {/* 3. Patient Information (Full Name ALWAYS appears, No Appointment Schedule) */}
          <div className="bg-gray-50 border border-gray-200 px-2 py-1.5 rounded text-[8.5px] leading-snug space-y-0.5">
            <div className="flex justify-between items-baseline">
              <span className="text-gray-500 font-bold uppercase text-[7.5px]">Patient:</span>
              <span className="font-extrabold text-gray-950 text-[9.5px] text-right truncate max-w-[170px]">
                {resolvedPatientName || 'Patient'}
              </span>
            </div>

            <div className="flex justify-between text-[8px] text-gray-600">
              <span>Patient ID: <strong className="font-mono text-red-950">#{receipt.patientNumber}</strong></span>
              {resolvedPatientAge !== undefined && <span>Age: <strong>{resolvedPatientAge}y</strong></span>}
            </div>

            <div className="flex justify-between text-[8px] text-gray-600">
              <span>Mobile: <strong className="font-mono text-gray-900">{resolvedPatientPhone || '-'}</strong></span>
            </div>

            {receipt.patientProblem && (
              <p className="text-[7.5px] text-gray-500 italic truncate pt-0.5 border-t border-gray-200/60 mt-0.5">
                Complaint: &ldquo;{receipt.patientProblem}&rdquo;
              </p>
            )}
          </div>

          {/* 4. Service / Treatment Table (NO Quantity column, Tooth display supported) */}
          <div className="border-b border-dashed border-gray-400 pb-2">
            <table className="w-full text-left text-[8.5px] border-collapse leading-snug">
              <thead>
                <tr className="border-b border-gray-300 text-gray-600 font-bold uppercase text-[7.5px]">
                  <th className="py-1">Treatment / Procedure</th>
                  <th className="py-1 text-right w-14">Price</th>
                  <th className="py-1 text-right w-16">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {receipt.items && receipt.items.length > 0 ? (
                  receipt.items.map((item, idx) => {
                    const hasTeeth = Array.isArray(item.teeth) && item.teeth.length > 0;
                    const itemAmount = item.total || (item.price * (item.quantity || 1));
                    return (
                      <tr key={idx} className="align-top">
                        <td className="py-1 pr-1 font-medium text-gray-900">
                          <div className="font-semibold text-gray-950">
                            {item.name || item.description}
                          </div>
                          {item.description && item.description !== item.name && (
                            <div className="text-[7px] text-gray-500 italic">
                              {item.description}
                            </div>
                          )}
                          {hasTeeth && (
                            <div className="text-[7.5px] font-bold text-red-900 font-mono mt-0.5">
                              Tooth: {item.teeth!.join(', ')}
                            </div>
                          )}
                        </td>
                        <td className="py-1 text-right font-mono text-gray-600">
                          ৳{item.price?.toLocaleString('en-BD')}
                        </td>
                        <td className="py-1 text-right font-mono font-bold text-gray-950">
                          ৳{itemAmount.toLocaleString('en-BD')}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={3} className="py-2 text-center text-gray-400 italic text-[8px]">
                      Dental Consultation / Clinical Treatment
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* 5. Totals Breakdown */}
          <div className="font-mono text-[8.5px] space-y-0.5 bg-gray-50 p-2 rounded border border-gray-200 leading-tight">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal:</span>
              <span className="font-semibold text-gray-900">৳{receipt.subtotal?.toLocaleString('en-BD')}</span>
            </div>

            {receipt.discount > 0 && (
              <div className="flex justify-between text-emerald-800">
                <span>Discount:</span>
                <span>-৳{receipt.discount?.toLocaleString('en-BD')}</span>
              </div>
            )}

            {hasPreviousDue && (
              <div className="flex justify-between text-amber-900">
                <span>Previous Due:</span>
                <span>+৳{receipt.previousDueSnapshot?.toLocaleString('en-BD')}</span>
              </div>
            )}

            <div className="flex justify-between font-bold text-gray-950 border-t border-gray-200 pt-1 text-[9px]">
              <span>Total Payable:</span>
              <span>৳{totalPayable?.toLocaleString('en-BD')}</span>
            </div>
          </div>

          {/* 6. Payment History & Active Installments */}
          <div className="space-y-1 text-[8px] leading-tight">
            <div className="font-bold text-gray-800 uppercase text-[7.5px] border-b border-gray-200 pb-0.5">
              Payment Transactions
            </div>

            {activePayments.length > 0 ? (
              <div className="space-y-1">
                {activePayments.map((p, pIdx) => (
                  <div key={p.id || pIdx} className="flex justify-between items-center font-mono text-gray-700">
                    <span>
                      {p.paymentDate || 'Paid'} • <span className="uppercase text-[7.5px] font-semibold">{p.paymentMethod || 'CASH'}</span>
                      {p.paymentTime && <span className="text-gray-500 text-[7px] ml-1">({p.paymentTime})</span>}
                    </span>
                    <span className="font-bold text-emerald-900">
                      ৳{p.amount?.toLocaleString('en-BD')}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex justify-between items-center font-mono text-gray-700">
                <span>Deposit ({receipt.paymentMethod?.toUpperCase() || 'CASH'}):</span>
                <span className="font-bold text-emerald-900">৳{(receipt.paidAmount || 0).toLocaleString('en-BD')}</span>
              </div>
            )}

            <div className="flex justify-between font-mono font-bold text-[8.5px] border-t border-gray-200 pt-1">
              <span>Total Paid:</span>
              <span className="text-emerald-900 font-extrabold">৳{totalPaid.toLocaleString('en-BD')}</span>
            </div>

            <div className="flex justify-between font-mono font-black text-[9.5px] border-t border-gray-200 pt-1 text-red-950">
              <span>Balance Due:</span>
              <span>৳{remainingDue.toLocaleString('en-BD')}</span>
            </div>
          </div>

          {receipt.notes && (
            <div className="text-[7.5px] text-gray-600 italic bg-gray-50 p-1.5 rounded border border-gray-200">
              Note: {receipt.notes}
            </div>
          )}

          {/* 7. Manual Signature / Recorded By (MUST REMAIN BLANK) */}
          <div className="pt-2 border-t border-dashed border-gray-300 space-y-3">
            <div className="text-[7.5px] text-gray-800">
              <div className="flex justify-between items-end pt-3">
                <div className="text-left">
                  <span>Recorded By: ___________________</span>
                </div>
                <div className="text-right">
                  <span>Authorized Signature: _________</span>
                </div>
              </div>
            </div>

            {/* 8. Receipt Footer */}
            <div className="text-center pt-1 text-[7px] font-medium text-gray-500 leading-tight">
              <p className="font-bold text-gray-700">{clinicSettings.clinicName || 'LUCKY DENTAL CARE'}</p>
              <p>{clinicSettings.tagline || 'SMILE FOR LIFE'}</p>
              <p className="text-red-950 font-bold">{clinicSettings.address || 'Kushtia, Bangladesh'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
