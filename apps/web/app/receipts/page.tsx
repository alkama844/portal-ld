'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { 
  Receipt as ReceiptIcon, 
  Search, 
  Printer, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Calendar, 
  User, 
  Eye, 
  DollarSign 
} from 'lucide-react';
import DashboardLayout from '@/app/dashboard/layout';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { apiFetch } from '@/lib/api/client';
import { ReceiptDocument } from '@/components/receipt/receipt-document';
import { Receipt } from '@patient-portal/shared';

export default function ReceiptsPage() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Selected receipt for print / preview
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  const fetchReceipts = useCallback(async (searchQuery: string, pageNum: number) => {
    setIsLoading(true);
    try {
      const query = new URLSearchParams({ page: pageNum.toString(), limit: '15' });
      if (searchQuery.trim()) query.set('search', searchQuery.trim());

      const res = await apiFetch<any>(`/receipts?${query.toString()}`);
      if (res.success && res.data) {
        setReceipts(res.data);
        if (res.pagination) {
          setTotalPages(res.pagination.totalPages || 1);
          setTotalCount(res.pagination.total || 0);
        }
      } else {
        setReceipts([]);
      }
    } catch {
      setReceipts([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchReceipts(search, page);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, page, fetchReceipts]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-red-950/80 border border-red-700/50 text-red-400">
                <ReceiptIcon className="w-5 h-5" />
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                Luckydental Financial Invoices
              </h1>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {totalCount > 0 ? `${totalCount} total receipts generated` : 'All patient billing receipts, deposits, and dues'}
            </p>
          </div>

          <Link href="/patients">
            <Button variant="primary" size="sm" className="gap-1.5 text-xs shadow-glow-red">
              <Plus className="w-3.5 h-3.5" />
              New Patient Invoice
            </Button>
          </Link>
        </div>

        {/* Search */}
        <div className="relative max-w-md w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by invoice #, patient name, or phone..."
            className="w-full glass-input text-xs sm:text-sm rounded-xl pl-10 pr-4 py-2.5 text-gray-200 placeholder:text-gray-500"
          />
        </div>

        {/* Invoices List / Table */}
        {isLoading ? (
          <div className="min-h-[250px] flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : receipts.length === 0 ? (
          <GlassCard className="p-12 text-center space-y-3">
            <ReceiptIcon className="w-10 h-10 text-gray-600 mx-auto" />
            <h3 className="text-base font-bold text-gray-200">No Invoices Found</h3>
            <p className="text-xs text-gray-400 max-w-sm mx-auto">
              {search
                ? `No receipts match your search "${search}".`
                : 'No patient receipts have been created yet.'}
            </p>
          </GlassCard>
        ) : (
          <GlassCard className="p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/[0.03] border-b border-white/10 text-gray-400 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-5">Invoice #</th>
                    <th className="py-3.5 px-5">Date</th>
                    <th className="py-3.5 px-5">Patient Details</th>
                    <th className="py-3.5 px-5">Procedures</th>
                    <th className="py-3.5 px-5 text-right">Grand Total</th>
                    <th className="py-3.5 px-5 text-right">Paid</th>
                    <th className="py-3.5 px-5 text-right">Due Balance</th>
                    <th className="py-3.5 px-5 text-center">Status</th>
                    <th className="py-3.5 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {receipts.map((rec) => (
                    <tr key={rec.id || (rec as any)._id} className="hover:bg-white/[0.02]">
                      <td className="py-4 px-5 font-mono font-bold text-red-400">
                        #{rec.receiptNumber}
                      </td>
                      <td className="py-4 px-5 text-gray-400 font-mono">
                        {new Date(rec.createdAt).toLocaleDateString('en-GB')}
                      </td>
                      <td className="py-4 px-5">
                        <Link href={`/patients/${rec.patientNumber}`} className="group block">
                          <p className="font-bold text-gray-100 group-hover:text-red-400 transition-colors">
                            #{rec.patientNumber} {rec.patientName}
                          </p>
                          <p className="text-[11px] text-gray-400 font-mono">{rec.patientPhone}</p>
                        </Link>
                      </td>
                      <td className="py-4 px-5 text-gray-300">
                        {rec.items?.length || 0} item(s)
                      </td>
                      <td className="py-4 px-5 text-right font-mono font-semibold text-gray-100">
                        ৳{rec.totalAmount?.toLocaleString('en-BD')}
                      </td>
                      <td className="py-4 px-5 text-right font-mono text-emerald-400">
                        ৳{rec.paidAmount?.toLocaleString('en-BD')}
                      </td>
                      <td className="py-4 px-5 text-right font-mono font-bold text-red-400">
                        ৳{rec.dueAmount?.toLocaleString('en-BD')}
                      </td>
                      <td className="py-4 px-5 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          rec.paymentStatus === 'paid'
                            ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/50'
                            : 'bg-red-950/80 text-red-400 border border-red-800/50'
                        }`}>
                          {rec.paymentStatus}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedReceipt(rec);
                            setShowReceiptModal(true);
                          }}
                          className="h-8 px-2 text-xs text-gray-300 hover:text-white gap-1"
                        >
                          <Printer className="w-3.5 h-3.5 text-red-400" />
                          View / Print
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-white/10 flex items-center justify-between text-xs text-gray-400">
                <span>Page {page} of {totalPages}</span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="p-2"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="p-2"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </GlassCard>
        )}
      </div>

      {/* Canonical Print / View Modal */}
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
              onEdit={() => {
                setShowReceiptModal(false);
              }}
            />
            <div className="flex justify-between items-center pt-2 border-t border-white/10 no-print">
              <Link href={`/patients/${selectedReceipt.patientNumber}/receipt/new`}>
                <Button variant="outline" size="sm" className="text-xs">
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
