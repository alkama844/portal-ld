'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Package as PackageIcon, Plus, Tag, Check, Clock } from 'lucide-react';
import DashboardLayout from '@/app/dashboard/layout';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Badge } from '@/components/ui/badge';
import { TableSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { useToast } from '@/components/ui/toast';
import { apiFetch } from '@/lib/api/client';
import { ServicePackage } from '@patient-portal/shared';

export default function PackagesPage() {
  const { showToast } = useToast();
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [category, setCategory] = useState('General Treatment');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');

  const fetchPackages = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiFetch<ServicePackage[]>('/packages');
      if (res.success && res.data) {
        setPackages(res.data);
      } else {
        setPackages([]);
      }
    } catch {
      setPackages([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPackages();
  }, [fetchPackages]);

  const handleCreatePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !price || isNaN(Number(price))) {
      showToast('Please enter a valid package name and price.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const res = await apiFetch<ServicePackage>('/packages', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          category: category.trim(),
          price: Number(price),
          description: description.trim() || undefined
        })
      });

      if (res.success && res.data) {
        showToast(`Package "${res.data.name}" created successfully`, 'success');
        setName('');
        setPrice('');
        setDescription('');
        setIsModalOpen(false);
        fetchPackages();
      } else {
        showToast(res.error || 'Failed to create package.', 'error');
      }
    } catch {
      showToast('Network error during package creation', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-extrabold text-white tracking-tight">Treatment & Service Packages</h2>
            <p className="text-xs text-gray-400">
              Configure medical service rates, pricing, and treatment procedures
            </p>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsModalOpen(true)}
            className="gap-2 w-full sm:w-auto"
          >
            <Plus className="w-4 h-4" />
            New Package
          </Button>
        </div>

        {/* Packages Grid / List */}
        {isLoading ? (
          <TableSkeleton rows={4} cols={4} />
        ) : packages.length === 0 ? (
          <EmptyState
            title="No Treatment Packages Configured"
            description="Create standard clinical treatment packages (e.g., Root Canal, Physiotherapy Session, Consultation) with fixed pricing."
            icon={PackageIcon}
            actionLabel="Create First Package"
            onAction={() => setIsModalOpen(true)}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {packages.map((pkg) => (
              <GlassCard key={pkg.id || (pkg as any)._id} hoverEffect className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <Badge variant="default" className="text-[10px]">
                      {pkg.category || 'General'}
                    </Badge>
                    <h3 className="text-base font-bold text-gray-100">{pkg.name}</h3>
                  </div>

                  <div className="p-2.5 rounded-xl bg-red-950/60 border border-red-800/40 text-red-400 shadow-glow-red-sm">
                    <PackageIcon className="w-4 h-4" />
                  </div>
                </div>

                {pkg.description && (
                  <p className="text-xs text-gray-400 line-clamp-2">{pkg.description}</p>
                )}

                <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                  <span className="text-xs text-gray-400">Standard Fee:</span>
                  <span className="text-lg font-extrabold text-white font-mono tracking-tight">
                    ৳{pkg.price.toLocaleString()}
                  </span>
                </div>
              </GlassCard>
            ))}
          </div>
        )}

        {/* Create Package Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Create Service Package"
          description="Define standard procedure, diagnosis, or therapy fee"
        >
          <form onSubmit={handleCreatePackage} className="space-y-4">
            <Input
              label="Package / Service Name *"
              placeholder="e.g. Root Canal Treatment"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            <Input
              label="Category"
              placeholder="e.g. Dental Surgery, Consultation, Therapy"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />

            <Input
              label="Price in Bangladeshi Taka (৳) *"
              type="number"
              placeholder="e.g. 6000"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
            />

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-gray-300 uppercase tracking-wide">
                Description / Notes
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional details regarding procedures, inclusions, or follow-ups..."
                className="w-full glass-input rounded-xl p-3 text-sm text-gray-100 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={isSaving}
                className="gap-2"
              >
                <Plus className="w-3.5 h-3.5" />
                Save Package
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
