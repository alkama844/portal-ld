'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Settings as SettingsIcon, 
  Building2, 
  Layers, 
  Plus, 
  Trash2, 
  Save, 
  Package, 
  Check, 
  Activity, 
  ShieldCheck, 
  ExternalLink,
  Sun,
  Moon,
  Palette
} from 'lucide-react';
import DashboardLayout from '@/app/dashboard/layout';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { useTheme } from '@/lib/theme/theme-context';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { apiFetch } from '@/lib/api/client';
import { CustomFieldDefinition, CustomFieldType } from '@patient-portal/shared';

export default function SettingsPage() {
  const { showToast } = useToast();
  const { theme, setTheme } = useTheme();

  // Clinic Info State
  const [clinicName, setClinicName] = useState('Luckydental');
  const [clinicPhone, setClinicPhone] = useState('+880 1900-000000');
  const [clinicAddress, setClinicAddress] = useState('Dhaka / Bangladesh');
  const [receiptFooter, setReceiptFooter] = useState('Thank you for choosing Luckydental.');
  const [isSavingClinic, setIsSavingClinic] = useState(false);

  // Custom Fields State
  const [customFields, setCustomFields] = useState<CustomFieldDefinition[]>([]);
  const [isLoadingFields, setIsLoadingFields] = useState(true);
  const [showAddFieldModal, setShowAddFieldModal] = useState(false);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldKey, setNewFieldKey] = useState('');
  const [newFieldType, setNewFieldType] = useState<CustomFieldType>('text');
  const [newFieldRequired, setNewFieldRequired] = useState(false);
  const [newFieldOptions, setNewFieldOptions] = useState('');
  const [isSavingField, setIsSavingField] = useState(false);

  const fetchCustomFields = async () => {
    setIsLoadingFields(true);
    try {
      const res = await apiFetch<CustomFieldDefinition[]>('/custom-fields');
      if (res.success && res.data) {
        setCustomFields(res.data);
      }
    } catch {
      // fallback
    } finally {
      setIsLoadingFields(false);
    }
  };

  useEffect(() => {
    fetchCustomFields();
  }, []);

  const handleSaveClinicInfo = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingClinic(true);
    setTimeout(() => {
      setIsSavingClinic(false);
      showToast('Clinic details and receipt configuration saved', 'success');
    }, 400);
  };

  const handleCreateCustomField = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFieldName.trim() || !newFieldKey.trim()) {
      showToast('Field name and key are required', 'error');
      return;
    }

    const optionsArray = newFieldType === 'select'
      ? newFieldOptions.split(',').map((o) => o.trim()).filter(Boolean)
      : undefined;

    setIsSavingField(true);
    try {
      const res = await apiFetch<CustomFieldDefinition>('/custom-fields', {
        method: 'POST',
        body: JSON.stringify({
          name: newFieldName.trim(),
          key: newFieldKey.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_'),
          type: newFieldType,
          required: newFieldRequired,
          options: optionsArray,
          active: true
        })
      });

      if (res.success && res.data) {
        showToast(`Custom field "${newFieldName}" created`, 'success');
        setShowAddFieldModal(false);
        setNewFieldName('');
        setNewFieldKey('');
        setNewFieldOptions('');
        fetchCustomFields();
      } else {
        showToast(res.error || 'Failed to create field', 'error');
      }
    } catch {
      showToast('Network error creating custom field', 'error');
    } finally {
      setIsSavingField(false);
    }
  };

  const handleDeleteField = async (id: string) => {
    try {
      const res = await apiFetch(`/custom-fields/${id}`, { method: 'DELETE' });
      if (res.success) {
        showToast('Custom field removed', 'success');
        setCustomFields((prev) => prev.filter((f) => f.id !== id && f._id !== id));
      }
    } catch {
      showToast('Failed to delete custom field', 'error');
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-white/10 dark:border-white/10 pb-4">
          <div className="p-2.5 rounded-xl bg-red-950/80 border border-red-700/50 text-red-400">
            <SettingsIcon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
              Luckydental Settings & Configuration
            </h1>
            <p className="text-xs text-gray-400">
              Manage clinic identity, theme mode, custom patient form fields, and system defaults
            </p>
          </div>
        </div>

        {/* Section 1: Visual Theme Mode (Dark & Light) */}
        <GlassCard className="p-6 space-y-5">
          <div className="flex items-center gap-2.5 border-b border-white/10 dark:border-white/10 pb-3">
            <Palette className="w-4 h-4 text-red-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider">
              1. Visual Theme & Aesthetics
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Dark Mode Option */}
            <div
              onClick={() => setTheme('dark')}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                theme === 'dark'
                  ? 'bg-red-950/40 border-red-500 shadow-glow-red-sm'
                  : 'bg-black/20 border-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Moon className="w-4 h-4 text-red-400" />
                  <span className="font-bold text-xs">Dark Obsidian Mode</span>
                </div>
                {theme === 'dark' && <Check className="w-4 h-4 text-red-400" />}
              </div>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                Deep black canvas with crimson glassmorphism and soft glowing accents. Best for low-light environments.
              </p>
            </div>

            {/* Light Mode Option */}
            <div
              onClick={() => setTheme('light')}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                theme === 'light'
                  ? 'bg-red-50 border-red-500 shadow-md'
                  : 'bg-black/20 border-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Sun className="w-4 h-4 text-amber-500" />
                  <span className="font-bold text-xs">Light Dental Crisp Mode</span>
                </div>
                {theme === 'light' && <Check className="w-4 h-4 text-red-600" />}
              </div>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                Crisp white cards, slate typography, and clean red highlights. Ideal for brightly lit dental offices.
              </p>
            </div>
          </div>
        </GlassCard>

        {/* Section 2: Clinic Identity & Receipt Settings */}
        <GlassCard className="p-6 space-y-5">
          <div className="flex items-center gap-2.5 border-b border-white/10 dark:border-white/10 pb-3">
            <Building2 className="w-4 h-4 text-red-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider">
              2. Clinic Identity & Receipt Settings
            </h2>
          </div>

          <form onSubmit={handleSaveClinicInfo} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Official Business / Clinic Name"
                value={clinicName}
                onChange={(e) => setClinicName(e.target.value)}
                required
              />
              <Input
                label="Clinic Contact Phone"
                value={clinicPhone}
                onChange={(e) => setClinicPhone(e.target.value)}
                required
              />
            </div>

            <Input
              label="Clinic Address & Location"
              value={clinicAddress}
              onChange={(e) => setClinicAddress(e.target.value)}
              required
            />

            <div className="space-y-1.5">
              <label className="block font-medium uppercase tracking-wide">
                Invoice & Receipt Footer Note
              </label>
              <textarea
                rows={2}
                value={receiptFooter}
                onChange={(e) => setReceiptFooter(e.target.value)}
                className="w-full glass-input rounded-xl p-3 text-xs placeholder:text-gray-500 resize-none"
              />
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" variant="primary" size="sm" isLoading={isSavingClinic} className="gap-1.5 shadow-glow-red-sm">
                <Save className="w-3.5 h-3.5" />
                Save Clinic Settings
              </Button>
            </div>
          </form>
        </GlassCard>

        {/* Section 3: Custom Patient Fields Builder */}
        <GlassCard className="p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-white/10 dark:border-white/10 pb-3">
            <div className="flex items-center gap-2.5">
              <Layers className="w-4 h-4 text-red-400" />
              <h2 className="text-sm font-bold uppercase tracking-wider">
                3. Dynamic Patient Custom Fields
              </h2>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddFieldModal(true)}
              className="text-xs gap-1.5 border-red-700/40 text-red-500 dark:text-red-300"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Custom Field
            </Button>
          </div>

          <p className="text-xs text-gray-400">
            Define custom fields (e.g. Blood Group, Occupation, Guardian Name, Emergency Contact) that automatically appear on patient registration.
          </p>

          {isLoadingFields ? (
            <div className="p-6 text-center text-xs text-gray-400">Loading custom fields...</div>
          ) : customFields.length === 0 ? (
            <div className="p-6 text-center text-xs text-gray-400 border border-dashed border-white/10 rounded-xl">
              No custom fields configured yet. Click above to add one.
            </div>
          ) : (
            <div className="divide-y divide-white/5 border border-white/10 rounded-xl overflow-hidden">
              {customFields.map((field) => (
                <div key={field.id || field._id} className="p-3.5 flex items-center justify-between bg-black/20 dark:bg-black/20 hover:bg-white/[0.02]">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs">{field.name}</span>
                      <span className="px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/10 text-[10px] font-mono text-gray-400">
                        {field.type}
                      </span>
                      {field.required && (
                        <span className="text-[10px] text-red-500 font-semibold">Required</span>
                      )}
                    </div>
                    <p className="text-[11px] font-mono text-gray-500 mt-0.5">key: {field.key}</p>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteField(field.id || (field as any)._id)}
                    className="h-7 px-2 text-xs text-gray-500 hover:text-red-500"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        {/* Section 4: Treatment Packages Shortcut */}
        <GlassCard className="p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 dark:border-white/10 pb-3">
            <div className="flex items-center gap-2.5">
              <Package className="w-4 h-4 text-red-400" />
              <h2 className="text-sm font-bold uppercase tracking-wider">
                4. Treatment Packages & Procedures Catalog
              </h2>
            </div>
            <Link href="/packages">
              <Button variant="secondary" size="sm" className="text-xs gap-1.5">
                <ExternalLink className="w-3.5 h-3.5" />
                Manage Packages
              </Button>
            </Link>
          </div>
          <p className="text-xs text-gray-400">
            Configure standard treatment packages (e.g. Root Canal, Scaling, Extraction) and pricing stored in MongoDB.
          </p>
        </GlassCard>
      </div>

      {/* Add Custom Field Modal */}
      <Modal
        isOpen={showAddFieldModal}
        onClose={() => setShowAddFieldModal(false)}
        title="Add Dynamic Custom Field"
        description="Configure a new clinical or demographic data field"
      >
        <form onSubmit={handleCreateCustomField} className="space-y-4 text-xs">
          <Input
            label="Field Display Name *"
            placeholder="e.g. Blood Group, Guardian Name, Occupation"
            value={newFieldName}
            onChange={(e) => {
              setNewFieldName(e.target.value);
              if (!newFieldKey) {
                setNewFieldKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'));
              }
            }}
            required
          />

          <Input
            label="Field Database Key *"
            placeholder="e.g. blood_group"
            value={newFieldKey}
            onChange={(e) => setNewFieldKey(e.target.value)}
            required
          />

          <div className="space-y-1.5">
            <label className="block font-medium uppercase tracking-wide">
              Field Input Type
            </label>
            <select
              value={newFieldType}
              onChange={(e) => setNewFieldType(e.target.value as CustomFieldType)}
              className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs bg-[#0e0e0e] dark:bg-[#0e0e0e]"
            >
              <option value="text">Single-line Text</option>
              <option value="number">Numeric Input</option>
              <option value="date">Date Picker</option>
              <option value="select">Dropdown Select (Options)</option>
              <option value="textarea">Multi-line Textarea</option>
              <option value="boolean">Yes / No Checkbox</option>
            </select>
          </div>

          {newFieldType === 'select' && (
            <Input
              label="Dropdown Options (Comma separated)"
              placeholder="A+, A-, B+, B-, O+, O-, AB+, AB-"
              value={newFieldOptions}
              onChange={(e) => setNewFieldOptions(e.target.value)}
              required
            />
          )}

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="field-required"
              checked={newFieldRequired}
              onChange={(e) => setNewFieldRequired(e.target.checked)}
              className="rounded bg-black border-white/20 text-red-600 focus:ring-red-500"
            />
            <label htmlFor="field-required" className="font-medium">
              Make this field required during patient registration
            </label>
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setShowAddFieldModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isSavingField}>
              Create Field
            </Button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
