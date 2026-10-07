'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Building2, 
  Layers, 
  Package, 
  Palette, 
  Save, 
  Plus, 
  Trash2, 
  ExternalLink,
  Sun,
  Moon,
  Check,
  Edit3,
  Power,
  AlertTriangle,
  Download,
  Upload,
  DatabaseBackup,
  ShieldCheck
} from 'lucide-react';
import DashboardLayout from '@/app/dashboard/layout';
import { GlassCard } from '@/components/ui/glass-card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { useTheme } from '@/lib/theme/theme-context';
import { apiFetch } from '@/lib/api/client';
import { CustomFieldDefinition, CustomFieldType, ClinicSettings } from '@patient-portal/shared';

export default function SettingsPage() {
  const { showToast } = useToast();
  const { theme, setTheme } = useTheme();

  // Clinic Info State
  const [clinicName, setClinicName] = useState('Lucky Dental Care');
  const [tagline, setTagline] = useState('SMILE FOR LIFE • ESTD 1982');
  const [clinicPhone, setClinicPhone] = useState('01715-917834');
  const [clinicEmail, setClinicEmail] = useState('');
  const [clinicAddress, setClinicAddress] = useState('Kushtia, Bangladesh');
  const [website, setWebsite] = useState('https://luckydentalcare.com');
  const [receiptFooter, setReceiptFooter] = useState('Lucky Dental Care • SMILE FOR LIFE • Kushtia, Bangladesh');
  const [isSavingClinic, setIsSavingClinic] = useState(false);
  const [isLoadingClinic, setIsLoadingClinic] = useState(true);

  // Frontend Theme Color & Hover Color State
  const [frontendColor, setFrontendColor] = useState('#941324');
  const [frontendHoverColor, setFrontendHoverColor] = useState('#770f1d');
  const [isSavingFrontendColor, setIsSavingFrontendColor] = useState(false);
  const [colorSaveStatus, setColorSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  const THEME_PRESETS = [
    { name: 'Crimson Classic', color: '#941324', hover: '#770f1d' },
    { name: 'Lucky Orange', color: '#c2410c', hover: '#9a3412' },
    { name: 'Orion Deep Blue', color: '#1e3a8a', hover: '#172554' },
    { name: 'Dark Obsidian', color: '#0f172a', hover: '#020617' },
    { name: 'Emerald Forest', color: '#059669', hover: '#064e3b' },
    { name: 'Amber Gold', color: '#d97706', hover: '#92400e' }
  ];

  const HOVER_PRESETS = [
    { name: 'Deep Crimson', color: '#770f1d' },
    { name: 'Bright Crimson', color: '#b8182c' },
    { name: 'Burnt Rust', color: '#9a3412' },
    { name: 'Midnight Navy', color: '#172554' },
    { name: 'Forest Dark', color: '#064e3b' },
    { name: 'Deep Bronze', color: '#92400e' }
  ];

  const hexToRgb = (hex: string) => {
    const res = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return res ? {
      r: parseInt(res[1], 16),
      g: parseInt(res[2], 16),
      b: parseInt(res[3], 16)
    } : null;
  };

  const adjustColor = (rgb: { r: number; g: number; b: number }, percent: number) => {
    const r = Math.min(255, Math.max(0, Math.round(rgb.r * (1 + percent))));
    const g = Math.min(255, Math.max(0, Math.round(rgb.g * (1 + percent))));
    const b = Math.min(255, Math.max(0, Math.round(rgb.b * (1 + percent))));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  };

  const applyThemeColor = (hex: string, hoverHex?: string) => {
    if (!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(hex)) return;
    const rgb = hexToRgb(hex);
    if (!rgb) return;
    const darkHex = adjustColor(rgb, -0.2);
    const deepHex = adjustColor(rgb, -0.38);
    const lightHex = adjustColor(rgb, 0.15);
    const softHex = adjustColor(rgb, 0.85);
    const effectiveHover = hoverHex && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(hoverHex) ? hoverHex : darkHex;
    const hoverRgb = hexToRgb(effectiveHover) || rgb;

    const root = document.documentElement;
    root.style.setProperty('--brand-primary', hex);
    root.style.setProperty('--brand-primary-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
    root.style.setProperty('--brand-hover', effectiveHover);
    root.style.setProperty('--brand-hover-rgb', `${hoverRgb.r}, ${hoverRgb.g}, ${hoverRgb.b}`);
    root.style.setProperty('--brand-primary-dark', darkHex);
    root.style.setProperty('--brand-primary-deep', deepHex);
    root.style.setProperty('--brand-primary-light', lightHex);
    root.style.setProperty('--brand-primary-soft', softHex);
    root.style.setProperty('--brand-primary-subtle', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.08)`);
    root.style.setProperty('--brand-primary-border', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.25)`);
    root.style.setProperty('--brand-primary-glow', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.18)`);
    root.style.setProperty('--bs-primary', hex);
    root.style.setProperty('--bs-primary-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);

    // Aliases
    root.style.setProperty('--brand-red', hex);
    root.style.setProperty('--brand-red-dark', effectiveHover);
  };

  const handleThemeColorChange = (newColor: string) => {
    setFrontendColor(newColor);
    setColorSaveStatus('idle');
    applyThemeColor(newColor, frontendHoverColor);
  };

  const handleHoverColorChange = (newHoverColor: string) => {
    setFrontendHoverColor(newHoverColor);
    setColorSaveStatus('idle');
    applyThemeColor(frontendColor, newHoverColor);
  };

  const handleSelectThemePreset = (preset: { name: string; color: string; hover: string }) => {
    setFrontendColor(preset.color);
    setFrontendHoverColor(preset.hover);
    setColorSaveStatus('idle');
    applyThemeColor(preset.color, preset.hover);
  };

  const handleAutoGenerateHover = () => {
    const rgb = hexToRgb(frontendColor);
    if (rgb) {
      const generated = adjustColor(rgb, -0.22);
      setFrontendHoverColor(generated);
      setColorSaveStatus('idle');
      applyThemeColor(frontendColor, generated);
      showToast(`Generated optimal hover shade: ${generated}`, 'info');
    }
  };

  const handleSaveFrontendColor = async () => {
    if (!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(frontendColor)) {
      showToast('Please enter a valid hex theme color code (e.g. #941324)', 'error');
      return;
    }
    if (!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(frontendHoverColor)) {
      showToast('Please enter a valid hex hover color code (e.g. #770f1d)', 'error');
      return;
    }

    setIsSavingFrontendColor(true);
    setColorSaveStatus('saving');
    try {
      const res = await apiFetch<ClinicSettings>('/settings/theme', {
        method: 'PUT',
        body: JSON.stringify({ frontendColor, frontendHoverColor })
      });

      if (res.success) {
        setColorSaveStatus('saved');
        showToast('Frontend default & hover colors saved and synchronized live!', 'success');
        try {
          localStorage.setItem('lucky_dental_frontend_color', frontendColor);
          localStorage.setItem('lucky_dental_frontend_hover_color', frontendHoverColor);
        } catch {}
      } else {
        setColorSaveStatus('idle');
        showToast(res.error || 'Failed to persist theme color', 'error');
      }
    } catch {
      setColorSaveStatus('idle');
      showToast('Network error saving theme color', 'error');
    } finally {
      setIsSavingFrontendColor(false);
    }
  };

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

  // Edit Field State
  const [editingField, setEditingField] = useState<CustomFieldDefinition | null>(null);
  const [editFieldName, setEditFieldName] = useState('');
  const [editFieldType, setEditFieldType] = useState<CustomFieldType>('text');
  const [editFieldRequired, setEditFieldRequired] = useState(false);
  const [editFieldOptions, setEditFieldOptions] = useState('');
  const [isSavingEditField, setIsSavingEditField] = useState(false);

  // Delete Confirmation State
  const [deletingField, setDeletingField] = useState<CustomFieldDefinition | null>(null);
  const [isDeletingField, setIsDeletingField] = useState(false);

  // Backup / Restore State
  const [isExporting, setIsExporting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);

  // Export full database backup
  const handleExportBackup = async () => {
    setIsExporting(true);
    try {
      const res = await apiFetch<Record<string, unknown>>('/backup/export');
      if (res.success && res.data) {
        const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const now = new Date();
        const stamp = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}_${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}`;
        a.href = url;
        a.download = `luckydental_backup_${stamp}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('Backup downloaded successfully', 'success');
      } else {
        showToast(res.error || 'Failed to export backup', 'error');
      }
    } catch {
      showToast('Network error during export', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // Restore from backup file
  const handleRestoreBackup = async () => {
    if (!restoreFile) return;
    setIsRestoring(true);
    try {
      const text = await restoreFile.text();
      const data = JSON.parse(text);
      const res = await apiFetch('/backup/restore', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      if (res.success) {
        showToast('Database restored successfully! Please refresh the page.', 'success');
        setShowRestoreConfirm(false);
        setRestoreFile(null);
      } else {
        showToast(res.error || 'Failed to restore backup', 'error');
      }
    } catch (err) {
      showToast('Invalid backup file or network error', 'error');
    } finally {
      setIsRestoring(false);
    }
  };

  // Load Clinic Settings from MongoDB
  const fetchClinicSettings = async () => {
    setIsLoadingClinic(true);
    try {
      const res = await apiFetch<ClinicSettings>('/settings/clinic');
      if (res.success && res.data) {
        setClinicName(res.data.clinicName || 'Lucky Dental Care');
        setTagline(res.data.tagline || 'SMILE FOR LIFE • ESTD 1982');
        setClinicPhone(res.data.phone || '01715-917834');
        setClinicEmail(res.data.email || '');
        setClinicAddress(res.data.address || 'Kushtia, Bangladesh');
        setWebsite(res.data.website || 'https://luckydentalcare.com');
        setReceiptFooter(res.data.receiptFooter || 'Lucky Dental Care • SMILE FOR LIFE • Kushtia, Bangladesh');
        if (res.data.frontendColor) {
          setFrontendColor(res.data.frontendColor);
          const hCol = res.data.frontendHoverColor || '#770f1d';
          setFrontendHoverColor(hCol);
          applyThemeColor(res.data.frontendColor, hCol);
        } else if (res.data.frontendHoverColor) {
          setFrontendHoverColor(res.data.frontendHoverColor);
        }
      }
    } catch {
      // Fallback
    } finally {
      setIsLoadingClinic(false);
    }
  };

  // Load Custom Fields
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
    fetchClinicSettings();
    fetchCustomFields();
  }, []);

  // Save Clinic Settings to MongoDB
  const handleSaveClinicInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clinicName.trim() || !clinicPhone.trim() || !clinicAddress.trim()) {
      showToast('Clinic name, phone, and address are required.', 'error');
      return;
    }

    setIsSavingClinic(true);
    try {
      const res = await apiFetch<ClinicSettings>('/settings/clinic', {
        method: 'PUT',
        body: JSON.stringify({
          clinicName: clinicName.trim(),
          tagline: tagline.trim(),
          phone: clinicPhone.trim(),
          email: clinicEmail.trim(),
          address: clinicAddress.trim(),
          website: website.trim(),
          receiptFooter: receiptFooter.trim()
        })
      });

      if (res.success && res.data) {
        showToast('Clinic details and invoice branding saved to database', 'success');
      } else {
        showToast(res.error || 'Failed to update clinic settings', 'error');
      }
    } catch {
      showToast('Network error saving clinic settings', 'error');
    } finally {
      setIsSavingClinic(false);
    }
  };

  // Create Custom Field
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

  // Open Edit Custom Field Modal
  const handleOpenEditField = (field: CustomFieldDefinition) => {
    setEditingField(field);
    setEditFieldName(field.name);
    setEditFieldType(field.type);
    setEditFieldRequired(Boolean(field.required));
    setEditFieldOptions(field.options?.join(', ') || '');
  };

  // Save Edit Custom Field
  const handleSaveEditField = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingField || !editFieldName.trim()) return;

    const id = editingField.id || (editingField as any)._id;
    const optionsArray = editFieldType === 'select'
      ? editFieldOptions.split(',').map((o) => o.trim()).filter(Boolean)
      : undefined;

    setIsSavingEditField(true);
    try {
      const res = await apiFetch(`/custom-fields/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: editFieldName.trim(),
          type: editFieldType,
          required: editFieldRequired,
          options: optionsArray
        })
      });

      if (res.success) {
        showToast('Custom field updated', 'success');
        setEditingField(null);
        fetchCustomFields();
      } else {
        showToast(res.error || 'Failed to update field', 'error');
      }
    } catch {
      showToast('Network error updating field', 'error');
    } finally {
      setIsSavingEditField(false);
    }
  };

  // Toggle Active / Inactive on Custom Field
  const handleToggleFieldActive = async (field: CustomFieldDefinition) => {
    const id = field.id || (field as any)._id;
    try {
      const res = await apiFetch(`/custom-fields/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ active: !field.active })
      });
      if (res.success) {
        showToast(`Field ${!field.active ? 'enabled' : 'disabled'}`, 'success');
        fetchCustomFields();
      }
    } catch {
      showToast('Failed to toggle field status', 'error');
    }
  };

  // Delete Custom Field (2-step modal confirmation)
  const handleConfirmDeleteField = async () => {
    if (!deletingField) return;
    const id = deletingField.id || (deletingField as any)._id;
    setIsDeletingField(true);
    try {
      const res = await apiFetch(`/custom-fields/${id}`, {
        method: 'DELETE'
      });
      if (res.success) {
        showToast(`Field "${deletingField.name}" deleted`, 'success');
        setDeletingField(null);
        fetchCustomFields();
      } else {
        showToast(res.error || 'Failed to delete field', 'error');
      }
    } catch {
      showToast('Network error deleting field', 'error');
    } finally {
      setIsDeletingField(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-100 dark:text-white tracking-tight">
            Clinic Settings & Configuration
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Manage clinic identity, theme mode, custom patient form fields, and system defaults
          </p>
        </div>

        {/* Section 1: Visual Theme Mode */}
        <GlassCard className="p-6 space-y-4">
          <div className="flex items-center gap-2.5 border-b border-white/10 dark:border-white/10 pb-3">
            <Palette className="w-4 h-4 text-red-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider">
              1. Theme & Appearance
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
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

        {/* Section 2: Frontend Theme & Hover Color Control */}
        <GlassCard className="p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-white/10 dark:border-white/10 pb-3">
            <div className="flex items-center gap-2.5">
              <Palette className="w-4 h-4 text-red-400" />
              <h2 className="text-sm font-bold uppercase tracking-wider">
                2. Frontend Theme & Hover Color Control
              </h2>
            </div>
            <span className="text-[10px] text-gray-400 font-mono">
              Live Real-Time Sync
            </span>
          </div>

          <p className="text-xs text-gray-400">
            Control the public frontend colors. Set the default brand accent color (e.g. Crimson Red) and customize the hover color independently. Updates buttons, badges, links, cards, section accents, and headers across all public pages in real-time.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-1">
            {/* Left: Color Pickers & Presets (7 cols) */}
            <div className="lg:col-span-7 space-y-5">
              {/* 1. Primary Default Color */}
              <div className="p-4 rounded-xl bg-black/20 border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-200 uppercase tracking-wide">
                    A. Default Brand Theme Color (Primary)
                  </span>
                  <span className="text-[10px] font-mono text-gray-400">Default button & accent state</span>
                </div>

                <div className="flex items-center gap-3">
                  <div 
                    className="w-11 h-11 rounded-xl border-2 border-white/20 shadow-md shrink-0 relative overflow-hidden cursor-pointer transition-transform hover:scale-105"
                    style={{ backgroundColor: frontendColor }}
                  >
                    <input
                      type="color"
                      value={frontendColor}
                      onChange={(e) => handleThemeColorChange(e.target.value)}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      title="Choose custom theme color"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1">
                      Hex Code (#RRGGBB)
                    </label>
                    <Input
                      value={frontendColor}
                      onChange={(e) => handleThemeColorChange(e.target.value)}
                      placeholder="#941324"
                      className="font-mono uppercase text-xs"
                    />
                  </div>
                </div>

                {/* Theme Presets */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400 block">
                    Curated Brand Theme Presets
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {THEME_PRESETS.map((preset) => (
                      <button
                        key={preset.color}
                        type="button"
                        onClick={() => handleSelectThemePreset(preset)}
                        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-left text-[11px] transition-all ${
                          frontendColor.toLowerCase() === preset.color.toLowerCase()
                            ? 'border-white bg-white/10 text-white font-bold shadow-sm'
                            : 'border-white/10 bg-black/20 text-gray-400 hover:border-white/20'
                        }`}
                      >
                        <span 
                          className="w-3.5 h-3.5 rounded-full shrink-0 border border-white/30"
                          style={{ backgroundColor: preset.color }}
                        />
                        <span className="truncate">{preset.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 2. Hover Color */}
              <div className="p-4 rounded-xl bg-black/20 border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-200 uppercase tracking-wide">
                    B. Frontend Hover Color (Interactive State)
                  </span>
                  <button
                    type="button"
                    onClick={handleAutoGenerateHover}
                    className="text-[10px] text-red-400 hover:text-white underline font-medium"
                  >
                    Auto-Generate Matching Shade
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <div 
                    className="w-11 h-11 rounded-xl border-2 border-white/20 shadow-md shrink-0 relative overflow-hidden cursor-pointer transition-transform hover:scale-105"
                    style={{ backgroundColor: frontendHoverColor }}
                  >
                    <input
                      type="color"
                      value={frontendHoverColor}
                      onChange={(e) => handleHoverColorChange(e.target.value)}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      title="Choose custom hover color"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1">
                      Hover Hex Code (#RRGGBB)
                    </label>
                    <Input
                      value={frontendHoverColor}
                      onChange={(e) => handleHoverColorChange(e.target.value)}
                      placeholder="#770f1d"
                      className="font-mono uppercase text-xs"
                    />
                  </div>
                </div>

                {/* Hover Presets */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400 block">
                    Curated Hover Shades
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {HOVER_PRESETS.map((preset) => (
                      <button
                        key={preset.color}
                        type="button"
                        onClick={() => handleHoverColorChange(preset.color)}
                        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-left text-[11px] transition-all ${
                          frontendHoverColor.toLowerCase() === preset.color.toLowerCase()
                            ? 'border-white bg-white/10 text-white font-bold shadow-sm'
                            : 'border-white/10 bg-black/20 text-gray-400 hover:border-white/20'
                        }`}
                      >
                        <span 
                          className="w-3.5 h-3.5 rounded-full shrink-0 border border-white/30"
                          style={{ backgroundColor: preset.color }}
                        />
                        <span className="truncate">{preset.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Real-time Live Preview Components (5 cols) */}
            <div className="lg:col-span-5 space-y-4 bg-black/30 p-4 rounded-xl border border-white/10 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-gray-300">
                    Live Hover & Component Sync Preview
                  </span>
                  <span className="text-[9px] text-emerald-400 font-mono">● Active</span>
                </div>

                <p className="text-[11px] text-gray-400">
                  Hover over the elements below to preview how your frontend buttons and links react:
                </p>

                <div className="space-y-3.5 p-3 rounded-lg bg-black/40 border border-white/5">
                  {/* Primary CTA with Live Hover transition */}
                  <div className="space-y-1">
                    <span className="text-[10px] text-gray-400 font-medium block">1. Primary Button (Hover Me):</span>
                    <button
                      type="button"
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.backgroundColor = frontendHoverColor;
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.backgroundColor = frontendColor;
                      }}
                      style={{ backgroundColor: frontendColor }}
                      className="text-white text-xs font-bold px-4 py-2.5 rounded-full shadow-md transition-all duration-200 flex items-center gap-1.5 cursor-pointer w-full justify-center"
                    >
                      <span>অ্যাপয়েন্টমেন্ট নিন (Theme → Hover)</span>
                    </button>
                  </div>

                  {/* Outline CTA with Live Hover transition */}
                  <div className="space-y-1">
                    <span className="text-[10px] text-gray-400 font-medium block">2. Outline Button (Hover Me):</span>
                    <button
                      type="button"
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.backgroundColor = frontendHoverColor;
                        (e.currentTarget as HTMLElement).style.borderColor = frontendHoverColor;
                        (e.currentTarget as HTMLElement).style.color = '#ffffff';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                        (e.currentTarget as HTMLElement).style.borderColor = frontendColor;
                        (e.currentTarget as HTMLElement).style.color = frontendColor;
                      }}
                      style={{ borderColor: frontendColor, color: frontendColor }}
                      className="border-2 text-xs font-bold px-4 py-2 rounded-full transition-all duration-200 flex items-center gap-1.5 cursor-pointer w-full justify-center bg-transparent"
                    >
                      <span>আমাদের সেবাসমূহ দেখুন</span>
                    </button>
                  </div>

                  {/* Badge & Link with Hover */}
                  <div className="flex items-center justify-between pt-1">
                    <span 
                      style={{ 
                        color: frontendColor,
                        backgroundColor: `${frontendColor}18`,
                        borderColor: `${frontendColor}40`
                      }}
                      className="px-2.5 py-1 rounded-full text-[11px] font-bold border"
                    >
                      ★ ৪৪+ বছরের সমৃদ্ধ ঐতিহ্য
                    </span>

                    <a 
                      href="#"
                      onClick={(e) => e.preventDefault()}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.color = frontendHoverColor;
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.color = frontendColor;
                      }}
                      style={{ color: frontendColor }} 
                      className="text-xs font-semibold underline cursor-pointer transition-colors duration-150"
                    >
                      বিস্তারিত দেখুন →
                    </a>
                  </div>

                  {/* Card Border */}
                  <div 
                    style={{ borderLeftColor: frontendColor }}
                    className="border-l-4 bg-white/5 p-2 rounded-r-lg text-[11px] text-gray-300"
                  >
                    লাইভ প্রাইস এস্টিমেটর ও সার্ভিস কার্ড অ্যাকসেন্ট
                  </div>
                </div>
              </div>

              {/* Save Button for Theme & Hover Color */}
              <div className="pt-3 border-t border-white/10 space-y-2">
                <Button
                  type="button"
                  onClick={handleSaveFrontendColor}
                  isLoading={isSavingFrontendColor}
                  size="sm"
                  className="w-full gap-1.5 text-xs text-white font-bold py-2.5"
                  style={{ backgroundColor: frontendColor }}
                >
                  <Save className="w-3.5 h-3.5" />
                  {colorSaveStatus === 'saved' ? 'Colors Saved & Synchronized ✓' : colorSaveStatus === 'saving' ? 'Saving Colors...' : 'Save Theme & Hover Colors'}
                </Button>
                <p className="text-[10px] text-center text-gray-400">
                  Instantly synchronizes to public website across all visitors
                </p>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Section 3: Clinic Identity & Receipt Settings */}
        <GlassCard className="p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-white/10 dark:border-white/10 pb-3">
            <div className="flex items-center gap-2.5">
              <Building2 className="w-4 h-4 text-red-400" />
              <h2 className="text-sm font-bold uppercase tracking-wider">
                3. Clinic Identity & Receipt Settings
              </h2>
            </div>
            {isLoadingClinic && (
              <span className="text-[10px] text-gray-400 font-mono animate-pulse">Loading settings...</span>
            )}
          </div>

          <form onSubmit={handleSaveClinicInfo} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Official Business / Clinic Name *"
                value={clinicName}
                onChange={(e) => setClinicName(e.target.value)}
                required
              />
              <Input
                label="Clinic Contact Phone *"
                value={clinicPhone}
                onChange={(e) => setClinicPhone(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Clinic Tagline / Subtitle"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="Specialized Dental Care & Oral Surgery"
              />
              <Input
                label="Clinic Official Email"
                value={clinicEmail}
                onChange={(e) => setClinicEmail(e.target.value)}
                placeholder="appointment@luckydental.com"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Clinic Address & Location *"
                value={clinicAddress}
                onChange={(e) => setClinicAddress(e.target.value)}
                required
              />
              <Input
                label="Clinic Website"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://luckydental.com"
              />
            </div>

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
                4. Dynamic Patient Custom Fields
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
            Define custom fields (e.g. Blood Group, Occupation, Guardian Name, Emergency Contact) that automatically appear on patient registration and profile.
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
                <div key={field.id || (field as any)._id} className="p-3.5 flex items-center justify-between bg-black/20 dark:bg-black/20 hover:bg-white/[0.02]">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`font-bold text-xs ${!field.active ? 'text-gray-500 line-through' : ''}`}>
                        {field.name}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/10 text-[10px] font-mono text-gray-400">
                        {field.type}
                      </span>
                      {field.required && (
                        <span className="text-[10px] text-red-500 font-semibold">Required</span>
                      )}
                      {!field.active && (
                        <span className="text-[10px] text-gray-500 bg-gray-800/40 px-1.5 py-0.5 rounded">Disabled</span>
                      )}
                    </div>
                    <p className="text-[11px] font-mono text-gray-500 mt-0.5">
                      key: {field.key} {field.options && field.options.length > 0 ? `• [${field.options.join(', ')}]` : ''}
                    </p>
                  </div>

                  <div className="inline-flex items-center gap-1.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleFieldActive(field)}
                      className={`h-7 px-2 text-xs ${field.active ? 'text-emerald-400 hover:bg-emerald-950/40' : 'text-gray-500'}`}
                      title={field.active ? 'Disable field' : 'Enable field'}
                    >
                      <Power className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenEditField(field)}
                      className="h-7 px-2 text-xs text-gray-400 hover:text-white"
                      title="Edit field"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeletingField(field)}
                      className="h-7 px-2 text-xs text-gray-500 hover:text-red-500"
                      title="Delete field"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
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
                5. Treatment Packages &amp; Procedures Catalog
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

        {/* Section 5: Backup & Restore */}
        <GlassCard className="p-6 space-y-5">
          <div className="flex items-center gap-2.5 border-b border-white/10 dark:border-white/10 pb-3">
            <ShieldCheck className="w-4 h-4 text-red-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider">
              6. Data Backup &amp; Restore
            </h2>
          </div>

          <p className="text-xs text-gray-400">
            Export a full snapshot of all clinic data (patients, appointments, staff, invoices, payments, settings) as a JSON file.
            You can restore from any previously exported backup file.
          </p>

          {/* Export */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl border border-white/10 bg-black/20">
            <div>
              <p className="text-xs font-bold text-gray-100">Export Full Database Backup</p>
              <p className="text-[11px] text-gray-400 mt-0.5">Downloads a timestamped .json file of the entire MongoDB database</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportBackup}
              isLoading={isExporting}
              className="gap-1.5 border-emerald-700/40 text-emerald-400 hover:bg-emerald-950/30 shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              Download Backup
            </Button>
          </div>

          {/* Restore */}
          <div className="p-4 rounded-xl border border-white/10 bg-black/20 space-y-3">
            <div>
              <p className="text-xs font-bold text-gray-100">Restore from Backup File</p>
              <p className="text-[11px] text-gray-400 mt-0.5">Select a previously exported .json backup file to restore all data. This will overwrite existing records.</p>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <label className="flex-1 cursor-pointer">
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-white/20 hover:border-red-500/40 transition-colors bg-black/10">
                  <Upload className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <span className="text-[11px] text-gray-400 truncate">
                    {restoreFile ? restoreFile.name : 'Click to select backup .json file'}
                  </span>
                </div>
                <input
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  onChange={(e) => setRestoreFile(e.target.files?.[0] || null)}
                />
              </label>

              <Button
                variant="outline"
                size="sm"
                disabled={!restoreFile}
                onClick={() => setShowRestoreConfirm(true)}
                className="gap-1.5 border-amber-700/40 text-amber-400 hover:bg-amber-950/30 shrink-0 disabled:opacity-40"
              >
                <DatabaseBackup className="w-3.5 h-3.5" />
                Restore Backup
              </Button>
            </div>
          </div>
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

      {/* Edit Custom Field Modal */}
      {editingField && (
        <Modal
          isOpen={true}
          onClose={() => setEditingField(null)}
          title="Edit Custom Field"
          description={`Modify settings for ${editingField.name}`}
        >
          <form onSubmit={handleSaveEditField} className="space-y-4 text-xs">
            <Input
              label="Field Display Name *"
              value={editFieldName}
              onChange={(e) => setEditFieldName(e.target.value)}
              required
            />

            <div className="space-y-1.5">
              <label className="block font-medium uppercase tracking-wide">
                Field Input Type
              </label>
              <select
                value={editFieldType}
                onChange={(e) => setEditFieldType(e.target.value as CustomFieldType)}
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

            {editFieldType === 'select' && (
              <Input
                label="Dropdown Options (Comma separated)"
                value={editFieldOptions}
                onChange={(e) => setEditFieldOptions(e.target.value)}
                required
              />
            )}

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="edit-field-required"
                checked={editFieldRequired}
                onChange={(e) => setEditFieldRequired(e.target.checked)}
                className="rounded bg-black border-white/20 text-red-600 focus:ring-red-500"
              />
              <label htmlFor="edit-field-required" className="font-medium">
                Make this field required during patient registration
              </label>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setEditingField(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" isLoading={isSavingEditField}>
                Save Changes
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Field 2-Step Confirmation Modal */}
      {deletingField && (
        <Modal
          isOpen={true}
          onClose={() => setDeletingField(null)}
          title="Delete Custom Field?"
          description="This action cannot be undone."
        >
          <div className="space-y-4 text-xs">
            <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-800/40 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="text-gray-300 space-y-1">
                <p className="font-semibold text-white">
                  Are you sure you want to delete the field &quot;{deletingField.name}&quot;?
                </p>
                <p className="text-[11px] text-gray-400">
                  New forms will no longer show this field. Historical data already recorded for existing patients will remain preserved in MongoDB.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setDeletingField(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                className="bg-red-700 hover:bg-red-600"
                isLoading={isDeletingField}
                onClick={handleConfirmDeleteField}
              >
                Confirm Delete Field
              </Button>
            </div>
          </div>
        </Modal>
      )}
      {/* Restore Confirmation Modal */}
      {showRestoreConfirm && (
        <Modal
          isOpen={true}
          onClose={() => setShowRestoreConfirm(false)}
          title="Restore Database?"
          description="This will overwrite all existing data."
        >
          <div className="space-y-4 text-xs">
            <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-800/40 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-gray-300 space-y-1">
                <p className="font-semibold text-white">Warning: This will overwrite all current data!</p>
                <p className="text-[11px] text-gray-400">
                  Restoring from <span className="font-mono text-amber-300">{restoreFile?.name}</span> will replace all patients, appointments, staff, invoices, and settings with the backup data. This cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowRestoreConfirm(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                className="bg-amber-700 hover:bg-amber-600"
                isLoading={isRestoring}
                onClick={handleRestoreBackup}
              >
                Yes, Restore Now
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </DashboardLayout>
  );
}
