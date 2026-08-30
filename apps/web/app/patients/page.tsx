'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Users, 
  Plus, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  Phone, 
  Eye, 
  ArrowRight, 
  User, 
  Receipt, 
  Trash2,
  AlertTriangle
} from 'lucide-react';
import DashboardLayout from '@/app/dashboard/layout';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { TableSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { apiFetch } from '@/lib/api/client';
import { Patient, ImageMetadata } from '@patient-portal/shared';

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Delete modal state
  const [patientToDelete, setPatientToDelete] = useState<Patient | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const router = useRouter();
  const { showToast } = useToast();

  const fetchPatients = useCallback(async (searchQuery: string, pageNum: number) => {
    setIsLoading(true);
    try {
      const query = new URLSearchParams({
        page: pageNum.toString(),
        limit: '10'
      });
      if (searchQuery.trim()) {
        query.set('search', searchQuery.trim());
      }

      const res = await apiFetch<any>(`/patients?${query.toString()}`);
      if (res.success && res.data) {
        setPatients(res.data);
        if (res.pagination) {
          setTotalPages(res.pagination.totalPages || 1);
          setTotalCount(res.pagination.total || 0);
        }
      } else {
        setPatients([]);
      }
    } catch {
      setPatients([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPatients(search, page);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, page, fetchPatients]);

  const handleDeletePatient = async () => {
    if (!patientToDelete) return;

    setIsDeleting(true);
    try {
      const res = await apiFetch(`/patients/${patientToDelete.patientNumber}`, {
        method: 'DELETE'
      });

      if (res.success) {
        showToast(`Patient #${patientToDelete.patientNumber} deleted successfully.`, 'success');
        setPatients((prev) => prev.filter((p) => p.patientNumber !== patientToDelete.patientNumber));
        setTotalCount((prev) => Math.max(0, prev - 1));
      } else {
        showToast(res.error || 'Failed to delete patient.', 'error');
      }
    } catch {
      showToast('Network error while deleting patient.', 'error');
    } finally {
      setIsDeleting(false);
      setPatientToDelete(null);
    }
  };

  const getImageUrl = (img: string | ImageMetadata | null | undefined): string | null => {
    if (!img) return null;
    if (typeof img === 'string') return img;
    return img.secureUrl || null;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Top Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-extrabold text-white tracking-tight">Patient Directory</h2>
            <p className="text-xs text-gray-400">
              {totalCount > 0 ? `${totalCount} registered patients` : 'Manage clinic patients and clinical records'}
            </p>
          </div>

          <Link href="/patients/new">
            <Button variant="primary" size="sm" className="gap-2 w-full sm:w-auto shadow-glow-red">
              <Plus className="w-4 h-4" />
              New Patient
            </Button>
          </Link>
        </div>

        {/* Search Bar */}
        <div className="relative max-w-md w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by name, phone (01...), or patient #..."
            className="w-full glass-input text-sm rounded-xl pl-10 pr-4 py-2.5 text-gray-200 placeholder:text-gray-500"
            aria-label="Search patients"
          />
        </div>

        {/* Patient Table / Cards */}
        {isLoading ? (
          <TableSkeleton rows={5} cols={5} />
        ) : patients.length === 0 ? (
          <EmptyState
            title="No Patients Found"
            description={
              search
                ? `No patients match your search criteria "${search}".`
                : 'Your clinic database does not have any patients registered yet.'
            }
            icon={Users}
            actionLabel={search ? 'Clear Search' : 'Register First Patient'}
            onAction={() => {
              if (search) setSearch('');
              else router.push('/patients/new');
            }}
          />
        ) : (
          <div className="space-y-4">
            {/* Mobile View: Responsive Glass Cards */}
            <div className="grid grid-cols-1 gap-3.5 md:hidden">
              {patients.map((patient) => {
                const imgUrl = getImageUrl(patient.profileImage);
                return (
                  <GlassCard
                    key={patient.id || (patient as any)._id}
                    className="p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {imgUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={imgUrl}
                            alt={patient.fullName}
                            className="w-11 h-11 rounded-xl object-cover border border-red-500/40 shrink-0"
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-xl bg-red-950/60 border border-red-800/40 flex items-center justify-center text-red-400 shrink-0">
                            <User className="w-5 h-5" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-gray-100 truncate">{patient.fullName}</h4>
                          <p className="text-xs text-red-400 font-mono font-medium">{patient.phone}</p>
                        </div>
                      </div>

                      <span className="font-mono text-xs font-bold text-red-400 bg-red-950/80 border border-red-800/50 px-2 py-0.5 rounded-lg shrink-0">
                        #{patient.patientNumber}
                      </span>
                    </div>

                    <p className="text-xs text-gray-300 line-clamp-2 italic bg-white/[0.02] p-2.5 rounded-lg border border-white/5">
                      &ldquo;{patient.patientProblem}&rdquo;
                    </p>

                    <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs text-gray-400">
                      <span>Age: {patient.age} yrs</span>
                      <div className="flex items-center gap-2">
                        <Link href={`/patients/${patient.patientNumber}/receipt/new`}>
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-red-400 gap-1">
                            <Receipt className="w-3 h-3" />
                            Bill
                          </Button>
                        </Link>
                        <Link href={`/patients/${patient.patientNumber}`}>
                          <Button variant="primary" size="sm" className="h-7 px-2.5 text-xs gap-1">
                            <Eye className="w-3 h-3" />
                            View
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </GlassCard>
                );
              })}
            </div>

            {/* Tablet & Desktop View: Contained Overflow Table */}
            <div className="hidden md:block">
              <GlassCard className="p-0 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-white/[0.03] border-b border-white/10 text-xs text-gray-400 uppercase tracking-wider">
                      <tr>
                        <th className="py-3.5 px-5">ID</th>
                        <th className="py-3.5 px-5">Patient Name</th>
                        <th className="py-3.5 px-5">Age</th>
                        <th className="py-3.5 px-5">Phone</th>
                        <th className="py-3.5 px-5">Primary Complaint</th>
                        <th className="py-3.5 px-5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {patients.map((patient) => (
                        <tr
                          key={patient.id || (patient as any)._id}
                          className="hover:bg-white/[0.03] transition-colors"
                        >
                          <td className="py-4 px-5 font-mono text-xs text-red-400 font-bold">
                            #{patient.patientNumber}
                          </td>
                          <td className="py-4 px-5 font-semibold text-gray-100 truncate max-w-[200px]">
                            {patient.fullName}
                          </td>
                          <td className="py-4 px-5 text-gray-300">
                            {patient.age} yrs
                          </td>
                          <td className="py-4 px-5 font-mono text-xs text-gray-300">
                            {patient.phone}
                          </td>
                          <td className="py-4 px-5 text-gray-300 max-w-xs truncate">
                            {patient.patientProblem}
                          </td>
                          <td className="py-4 px-5 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              <Link href={`/patients/${patient.patientNumber}/receipt/new`}>
                                <Button variant="secondary" size="sm" className="h-8 px-2.5 text-xs gap-1">
                                  <Receipt className="w-3.5 h-3.5 text-red-400" />
                                  Receipt
                                </Button>
                              </Link>

                              <Link href={`/patients/${patient.patientNumber}`}>
                                <Button variant="ghost" size="sm" className="h-8 px-2.5 text-xs gap-1 text-gray-300 hover:text-white">
                                  <Eye className="w-3.5 h-3.5" />
                                  Profile
                                </Button>
                              </Link>

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setPatientToDelete(patient)}
                                className="h-8 px-2 text-xs text-red-400 hover:bg-red-950/50 hover:text-red-300"
                                aria-label="Delete patient"
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

                {/* Pagination Controls */}
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
                        aria-label="Previous page"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={page >= totalPages}
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        className="p-2"
                        aria-label="Next page"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </GlassCard>
            </div>
          </div>
        )}
      </div>

      {/* Delete Patient Modal */}
      <Modal
        isOpen={Boolean(patientToDelete)}
        onClose={() => setPatientToDelete(null)}
        title="Delete Patient Record"
        description="Permanently delete patient file and medical history"
      >
        {patientToDelete && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-red-950/60 border border-red-700/50 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div className="text-xs text-red-200 space-y-1">
                <p className="font-bold text-red-100">
                  Delete #{patientToDelete.patientNumber} - {patientToDelete.fullName}?
                </p>
                <p className="text-red-300/80">
                  This will permanently delete this patient from the database.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPatientToDelete(null)}
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
        )}
      </Modal>
    </DashboardLayout>
  );
}
