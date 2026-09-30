'use client';

import React, { useState, useEffect } from 'react';
import { 
  Printer, 
  Edit3,
  ShieldCheck
} from 'lucide-react';
import { Receipt, Appointment, ClinicSettings } from '@patient-portal/shared';
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
  appointment,
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
            address: res.data.address || 'Kushtia, Bangladesh',
            receiptFooter: res.data.receiptFooter || 'Lucky Dental Care • SMILE FOR LIFE • Kushtia, Bangladesh'
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
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      })
    : new Date().toLocaleDateString('en-GB', {
        day: 'numeric',
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
  const isFullyPaid = !isCancelled && (receipt.dueAmount === 0 || receipt.resultingDue === 0) && receipt.totalAmount > 0;
  const isPartial = !isCancelled && receipt.paidAmount > 0 && (receipt.dueAmount > 0 || (receipt.resultingDue || 0) > 0);

  const hasPreviousDue = Boolean(receipt.previousDueSnapshot && receipt.previousDueSnapshot > 0);
  const totalPayable = receipt.totalPayable !== undefined ? receipt.totalPayable : (receipt.totalAmount + (receipt.previousDueSnapshot || 0));
  const remainingDue = receipt.resultingDue !== undefined ? receipt.resultingDue : receipt.dueAmount;

  // Format payment transactions compactly
  const paymentSummaryText = receipt.payments && receipt.payments.length > 0
    ? receipt.payments.map(p => `${p.paymentDate || 'Paid'}: ৳${p.amount?.toLocaleString('en-BD')} (${p.paymentMethod?.toUpperCase() || 'CASH'})`).join(' • ')
    : null;

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
              {isCancelled ? 'Cancelled Invoice' : 'Official Print Receipt'}
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-mono font-bold">
              210 × 99 mm (1/3 A4 Panel)
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

      {/* Screen Preview Container (Centered with physical aspect-ratio indication) */}
      <div className="receipt-preview-wrapper flex justify-center overflow-x-auto py-1">
        {/* Canonical Physical Print Container: 210mm × 99mm */}
        <div 
          id="canonical-receipt-document"
          className="receipt-print-panel bg-white text-gray-900 border border-gray-300 shadow-md font-sans select-text relative"
          style={{
            width: '210mm',
            minWidth: '210mm',
            maxWidth: '210mm',
            height: '99mm',
            minHeight: '99mm',
            maxHeight: '99mm',
            overflow: 'hidden',
            boxSizing: 'border-box',
            padding: '3mm 5mm 2.5mm 5mm',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          {/* 1. Header Row (Height ~16mm) */}
          <div className="flex items-center justify-between border-b border-red-900 pb-1.5 leading-tight">
            <div className="flex items-center gap-2">
              <img 
                src="/logo_main.jpg" 
                alt="Lucky Dental Care" 
                className="w-9 h-9 rounded object-cover border border-red-900/30 shrink-0" 
              />
              <div>
                <h1 className="text-[13px] font-black tracking-tight text-red-950 uppercase leading-none font-sans">
                  {clinicSettings.clinicName || 'LUCKY DENTAL CARE'}
                </h1>
                <p className="text-[8.5px] font-bold text-red-800 tracking-wider uppercase leading-none mt-0.5">
                  {clinicSettings.tagline || 'SMILE FOR LIFE • ESTD 1982'}
                </p>
                <p className="text-[7.5px] text-gray-600 leading-none mt-0.5">
                  {clinicSettings.address || 'Kushtia, Bangladesh'} • Hotline: {clinicSettings.phone || '01715-917834'}
                </p>
              </div>
            </div>

            <div className="text-right font-mono">
              <p className="text-[12px] font-black text-red-900 leading-none tracking-wide">
                INVOICE #{receipt.receiptNumber}
              </p>
              <p className="text-[8px] text-gray-600 font-sans mt-0.5">
                {formattedReceiptDate} {formattedReceiptTime && `• ${formattedReceiptTime}`}
              </p>
              <div className="mt-0.5">
                <span className={`inline-block px-1.5 py-0.2 rounded text-[7.5px] font-bold uppercase tracking-wider border leading-tight ${
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
                    ? 'PAYMENT COMPLETE'
                    : isPartial
                    ? 'PARTIAL PAYMENT'
                    : 'PAYMENT DUE'}
                </span>
              </div>
            </div>
          </div>

          {/* 2. Patient Identification Strip (Height ~7mm, Appointment Schedule REMOVED) */}
          <div className="bg-gray-50 border border-gray-200 px-2 py-1 rounded flex items-center justify-between text-[8px] leading-tight">
            <div className="flex items-center gap-1.5 truncate">
              <span className="font-bold text-gray-500 uppercase text-[7.5px]">PATIENT:</span>
              <span className="font-mono font-bold text-red-950 bg-red-100 px-1 py-0.2 rounded text-[8px]">
                #{receipt.patientNumber}
              </span>
              <span className="font-bold text-gray-900 text-[9px] truncate">
                {receipt.patientName || 'Patient'}
              </span>
              {receipt.patientAge !== undefined && (
                <span className="text-gray-500">({receipt.patientAge}y)</span>
              )}
            </div>

            <div className="flex items-center gap-3 shrink-0 ml-2">
              <span>Phone: <strong className="font-mono text-gray-900">{receipt.patientPhone || '-'}</strong></span>
              {receipt.patientProblem && (
                <span className="text-gray-600 truncate max-w-[180px] italic">
                  Chief Complaint: &ldquo;{receipt.patientProblem}&rdquo;
                </span>
              )}
            </div>
          </div>

          {/* 3. Itemized Treatment Procedures Table (Height ~28-30mm, QTY column REMOVED) */}
          <div className="flex-1 overflow-hidden my-0.5">
            <table className="w-full text-left text-[8px] border-collapse leading-tight">
              <thead>
                <tr className="border-b border-gray-300 text-gray-600 font-bold uppercase text-[7.5px]">
                  <th className="py-1 w-6 text-center">SL</th>
                  <th className="py-1">Procedure / Treatment Description</th>
                  <th className="py-1 text-right w-20">Unit Price</th>
                  <th className="py-1 text-right w-24">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {receipt.items && receipt.items.length > 0 ? (
                  receipt.items.slice(0, 3).map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-0.5 text-center text-gray-500 font-mono text-[8px]">{idx + 1}</td>
                      <td className="py-0.5 font-medium text-gray-900 pr-2 truncate max-w-[260px]">
                        <span>{item.name || item.description}</span>
                        {item.description && item.description !== item.name && (
                          <span className="text-[7.5px] text-gray-500 ml-1">({item.description})</span>
                        )}
                      </td>
                      <td className="py-0.5 text-right font-mono text-gray-700">
                        ৳{item.price?.toLocaleString('en-BD')}
                      </td>
                      <td className="py-0.5 text-right font-mono font-bold text-gray-900">
                        ৳{(item.total || (item.price * (item.quantity || 1)))?.toLocaleString('en-BD')}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-2 text-center text-gray-400 italic text-[8px]">
                      Dental Consultation / Clinical Treatment
                    </td>
                  </tr>
                )}
                {receipt.items && receipt.items.length > 3 && (
                  <tr>
                    <td colSpan={4} className="py-0.5 text-right text-[7.5px] text-gray-500 italic pr-1">
                      + {receipt.items.length - 3} additional procedure(s) included in total
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* 4. Financial Summary & Payment Breakdown (Height ~17mm) */}
          <div className="grid grid-cols-2 gap-3 pt-1 border-t border-gray-200 text-[8px] leading-tight">
            {/* Left: Payment Method & Transactions */}
            <div className="space-y-0.5">
              <div className="flex items-center gap-1 font-medium text-gray-800">
                <span className="text-gray-500">Payment:</span>
                <strong className="uppercase font-mono text-gray-900">{receipt.paymentMethod || 'Cash'}</strong>
                {paymentSummaryText && (
                  <span className="text-gray-500 font-mono truncate max-w-[140px] text-[7.5px]">({paymentSummaryText})</span>
                )}
              </div>
              {receipt.notes && (
                <p className="text-gray-500 italic truncate text-[7.5px]">
                  Remarks: {receipt.notes}
                </p>
              )}
            </div>

            {/* Right: Key-Value Financial Matrix */}
            <div className="font-mono text-[8px] space-y-0.5 bg-gray-50 p-1.5 rounded border border-gray-200">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal:</span>
                <span className="font-semibold text-gray-900">৳{receipt.subtotal?.toLocaleString('en-BD')}</span>
              </div>
              {receipt.discount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Discount:</span>
                  <span>-৳{receipt.discount?.toLocaleString('en-BD')}</span>
                </div>
              )}
              {hasPreviousDue && (
                <div className="flex justify-between text-amber-800">
                  <span>Previous Due:</span>
                  <span>+৳{receipt.previousDueSnapshot?.toLocaleString('en-BD')}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-gray-900 border-t border-gray-200 pt-0.5">
                <span>Total Payable:</span>
                <span>৳{totalPayable?.toLocaleString('en-BD')}</span>
              </div>
              <div className="flex justify-between text-emerald-800 font-semibold">
                <span>Paid Deposit:</span>
                <span>৳{receipt.paidAmount?.toLocaleString('en-BD')}</span>
              </div>
              <div className="flex justify-between font-black text-red-900 border-t border-gray-200 pt-0.5">
                <span>Balance Due:</span>
                <span>৳{remainingDue?.toLocaleString('en-BD')}</span>
              </div>
            </div>
          </div>

          {/* 5. Footer: Recorded By (BLANK) & Authorized Signature (Height ~14mm) */}
          <div className="pt-1 border-t border-gray-200 space-y-1">
            <div className="flex justify-between items-end text-[7.5px] px-2">
              <div className="text-left">
                <span className="text-gray-700 font-medium">Recorded By: __________________________</span>
              </div>
              <div className="text-right">
                <span className="text-gray-700 font-medium">Authorized Signature: __________________</span>
              </div>
            </div>

            <p className="text-[7px] text-gray-500 text-center leading-none">
              {clinicSettings.clinicName || 'LUCKY DENTAL CARE'} • {clinicSettings.tagline || 'SMILE FOR LIFE'} • {clinicSettings.address || 'Kushtia, Bangladesh'} • Hotline: {clinicSettings.phone || '01715-917834'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
