'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, RotateCcw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface ToothItem {
  id: string;      // Standard FDI ID e.g. "11", "18", "21", "48"
  num: number;     // 1 to 8 in quadrant
  quadrant: 'UR' | 'UL' | 'LR' | 'LL';
  name: string;
  type: 'incisor' | 'canine' | 'premolar' | 'molar';
}

// Single Unified 1..8 Quadrant Dental System for all patients
export const UPPER_RIGHT_TEETH: ToothItem[] = [
  { id: '18', num: 8, quadrant: 'UR', name: 'UR8 • 3rd Molar (Wisdom)', type: 'molar' },
  { id: '17', num: 7, quadrant: 'UR', name: 'UR7 • 2nd Molar', type: 'molar' },
  { id: '16', num: 6, quadrant: 'UR', name: 'UR6 • 1st Molar', type: 'molar' },
  { id: '15', num: 5, quadrant: 'UR', name: 'UR5 • 2nd Premolar', type: 'premolar' },
  { id: '14', num: 4, quadrant: 'UR', name: 'UR4 • 1st Premolar', type: 'premolar' },
  { id: '13', num: 3, quadrant: 'UR', name: 'UR3 • Canine (Eye Tooth)', type: 'canine' },
  { id: '12', num: 2, quadrant: 'UR', name: 'UR2 • Lateral Incisor', type: 'incisor' },
  { id: '11', num: 1, quadrant: 'UR', name: 'UR1 • Central Incisor', type: 'incisor' }
];

export const UPPER_LEFT_TEETH: ToothItem[] = [
  { id: '21', num: 1, quadrant: 'UL', name: 'UL1 • Central Incisor', type: 'incisor' },
  { id: '22', num: 2, quadrant: 'UL', name: 'UL2 • Lateral Incisor', type: 'incisor' },
  { id: '23', num: 3, quadrant: 'UL', name: 'UL3 • Canine (Eye Tooth)', type: 'canine' },
  { id: '24', num: 4, quadrant: 'UL', name: 'UL4 • 1st Premolar', type: 'premolar' },
  { id: '25', num: 5, quadrant: 'UL', name: 'UL5 • 2nd Premolar', type: 'premolar' },
  { id: '26', num: 6, quadrant: 'UL', name: 'UL6 • 1st Molar', type: 'molar' },
  { id: '27', num: 7, quadrant: 'UL', name: 'UL7 • 2nd Molar', type: 'molar' },
  { id: '28', num: 8, quadrant: 'UL', name: 'UL8 • 3rd Molar (Wisdom)', type: 'molar' }
];

export const LOWER_RIGHT_TEETH: ToothItem[] = [
  { id: '48', num: 8, quadrant: 'LR', name: 'LR8 • 3rd Molar (Wisdom)', type: 'molar' },
  { id: '47', num: 7, quadrant: 'LR', name: 'LR7 • 2nd Molar', type: 'molar' },
  { id: '46', num: 6, quadrant: 'LR', name: 'LR6 • 1st Molar', type: 'molar' },
  { id: '45', num: 5, quadrant: 'LR', name: 'LR5 • 2nd Premolar', type: 'premolar' },
  { id: '44', num: 4, quadrant: 'LR', name: 'LR4 • 1st Premolar', type: 'premolar' },
  { id: '43', num: 3, quadrant: 'LR', name: 'LR3 • Canine', type: 'canine' },
  { id: '42', num: 2, quadrant: 'LR', name: 'LR2 • Lateral Incisor', type: 'incisor' },
  { id: '41', num: 1, quadrant: 'LR', name: 'LR1 • Central Incisor', type: 'incisor' }
];

export const LOWER_LEFT_TEETH: ToothItem[] = [
  { id: '31', num: 1, quadrant: 'LL', name: 'LL1 • Central Incisor', type: 'incisor' },
  { id: '32', num: 2, quadrant: 'LL', name: 'LL2 • Lateral Incisor', type: 'incisor' },
  { id: '33', num: 3, quadrant: 'LL', name: 'LL3 • Canine', type: 'canine' },
  { id: '34', num: 4, quadrant: 'LL', name: 'LL4 • 1st Premolar', type: 'premolar' },
  { id: '35', num: 5, quadrant: 'LL', name: 'LL5 • 2nd Premolar', type: 'premolar' },
  { id: '36', num: 6, quadrant: 'LL', name: 'LL6 • 1st Molar', type: 'molar' },
  { id: '37', num: 7, quadrant: 'LL', name: 'LL7 • 2nd Molar', type: 'molar' },
  { id: '38', num: 8, quadrant: 'LL', name: 'LL8 • 3rd Molar (Wisdom)', type: 'molar' }
];

export const ALL_TEETH: ToothItem[] = [
  ...UPPER_RIGHT_TEETH,
  ...UPPER_LEFT_TEETH,
  ...LOWER_RIGHT_TEETH,
  ...LOWER_LEFT_TEETH
];

/**
 * Beautiful Anatomical Tooth Vector SVG Icon with integrated Tooth Number inside
 */
export function ToothVector({
  number,
  fdiId,
  isSelected,
  isUpper = false,
  size = 'md'
}: {
  number: number | string;
  fdiId?: string;
  isSelected: boolean;
  isUpper?: boolean;
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizeClasses = size === 'sm' 
    ? 'w-6 h-7 sm:w-7 sm:h-8' 
    : size === 'lg' 
    ? 'w-9 h-11 sm:w-10 sm:h-12' 
    : 'w-7 h-9 sm:w-8 sm:h-10';

  return (
    <div className={`relative flex items-center justify-center ${sizeClasses} select-none transition-transform duration-150`}>
      <svg
        viewBox="0 0 36 42"
        className={`w-full h-full transition-all duration-200 ${
          isUpper ? 'rotate-180' : ''
        }`}
      >
        <defs>
          <linearGradient id={`grad-active-${fdiId || number}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#991b1b" />
          </linearGradient>
          <linearGradient id="grad-idle" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.14)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.03)" />
          </linearGradient>
        </defs>

        {/* Anatomical Tooth Body with Double Roots & Cuspal Crown */}
        <path
          d="M 18 3 C 11 3 5 7 5 14 C 5 19 7 23 9.5 31 C 11 36 13 40 14 40 C 15.2 40 15.8 33 18 29 C 20.2 33 20.8 40 22 40 C 23 40 25 36 26.5 31 C 29 23 31 19 31 14 C 31 7 25 3 18 3 Z"
          fill={isSelected ? `url(#grad-active-${fdiId || number})` : "url(#grad-idle)"}
          stroke={isSelected ? "#fca5a5" : "rgba(255, 255, 255, 0.28)"}
          strokeWidth={isSelected ? "2" : "1.25"}
          strokeLinejoin="round"
          className="transition-colors duration-150"
        />

        {/* Crown Enamel Arch Contour */}
        <path
          d="M 10 12 C 14 15 22 15 26 12"
          fill="none"
          stroke={isSelected ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.22)"}
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </svg>

      {/* Centered Tooth Number (1..8) - Always oriented right-side up */}
      <span
        className={`absolute inset-0 flex items-center justify-center font-mono font-extrabold text-xs sm:text-[13px] leading-none pointer-events-none transition-all duration-150 ${
          isUpper ? '-translate-y-1' : 'translate-y-1'
        } ${
          isSelected 
            ? 'text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] scale-110' 
            : 'text-gray-200 dark:text-gray-100 group-hover:text-white'
        }`}
      >
        {number}
      </span>
    </div>
  );
}

export interface ToothSelectorProps {
  selectedTeeth: string[];
  onChange: (teeth: string[]) => void;
  className?: string;
  compact?: boolean;
}

/**
 * Interactive Dental Odontogram Selector Component (Can be rendered inline on any page/div)
 */
export function ToothSelector({
  selectedTeeth,
  onChange,
  className = '',
  compact = false
}: ToothSelectorProps) {
  const isSelected = (tooth: ToothItem) => {
    return selectedTeeth.includes(tooth.id) || selectedTeeth.includes(String(tooth.num));
  };

  const toggleTooth = (tooth: ToothItem) => {
    if (isSelected(tooth)) {
      onChange(selectedTeeth.filter((t) => t !== tooth.id && t !== String(tooth.num)));
    } else {
      onChange([...selectedTeeth, tooth.id]);
    }
  };

  const selectUpper = () => {
    const upperIds = [...UPPER_RIGHT_TEETH, ...UPPER_LEFT_TEETH].map((t) => t.id);
    const combined = Array.from(new Set([...selectedTeeth, ...upperIds]));
    onChange(combined);
  };

  const selectLower = () => {
    const lowerIds = [...LOWER_RIGHT_TEETH, ...LOWER_LEFT_TEETH].map((t) => t.id);
    const combined = Array.from(new Set([...selectedTeeth, ...lowerIds]));
    onChange(combined);
  };

  const selectAll = () => {
    const allIds = ALL_TEETH.map((t) => t.id);
    onChange(allIds);
  };

  const clearAll = () => {
    onChange([]);
  };

  const renderToothButton = (tooth: ToothItem, isUpper: boolean) => {
    const active = isSelected(tooth);

    return (
      <button
        key={tooth.id}
        type="button"
        onClick={() => toggleTooth(tooth)}
        className={`group relative flex flex-col items-center justify-center p-1 sm:p-1.5 rounded-xl border transition-all duration-150 cursor-pointer ${
          active
            ? 'bg-red-600/90 border-red-500 shadow-[0_0_14px_rgba(239,68,68,0.55)] scale-105 z-10'
            : 'bg-white/[0.03] hover:bg-white/[0.09] border-white/10 hover:border-red-500/50 text-gray-300'
        }`}
        title={`${tooth.name} (FDI #${tooth.id})`}
      >
        <ToothVector
          number={tooth.num}
          fdiId={tooth.id}
          isSelected={active}
          isUpper={isUpper}
          size={compact ? 'sm' : 'md'}
        />
        <span className={`text-[9px] font-mono mt-0.5 leading-none ${active ? 'text-white font-bold' : 'text-gray-400'}`}>
          #{tooth.id}
        </span>
      </button>
    );
  };

  return (
    <div className={`space-y-3.5 ${className}`}>
      {/* Quick Selection Actions Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-red-400" />
            Tooth Chart:
          </span>
          <span className="text-[10px] text-gray-400 font-mono">
            1 2 3 4 5 6 7 8 | 8 7 6 5 4 3 2 1
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={selectUpper}
            className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white transition-colors"
          >
            Upper Arch
          </button>
          <button
            type="button"
            onClick={selectLower}
            className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white transition-colors"
          >
            Lower Arch
          </button>
          <button
            type="button"
            onClick={selectAll}
            className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white transition-colors"
          >
            All Teeth
          </button>
          {selectedTeeth.length > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="text-[10px] px-2 py-0.5 rounded-md bg-red-950/40 hover:bg-red-900/60 border border-red-800/40 text-red-300 hover:text-white transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Odontogram Grid: 4 Quadrants with Central Midline */}
      <div className="p-3 sm:p-4 rounded-2xl bg-black/40 border border-white/10 space-y-3">
        {/* UPPER JAW (MAXILLA) */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-[10px] font-bold text-red-400 uppercase tracking-wider px-1">
            <span>Upper Right (UR 8 → 1)</span>
            <span className="text-gray-400 font-extrabold text-[9px] sm:text-[10px]">UPPER JAW (MAXILLA)</span>
            <span>Upper Left (UL 1 → 8)</span>
          </div>

          <div className="grid grid-cols-8 sm:grid-cols-16 gap-1 sm:gap-1.5">
            {UPPER_RIGHT_TEETH.map((tooth) => renderToothButton(tooth, true))}
            {UPPER_LEFT_TEETH.map((tooth) => renderToothButton(tooth, true))}
          </div>
        </div>

        {/* Central Midline Divider */}
        <div className="relative flex items-center justify-center my-1">
          <div className="w-full border-t border-dashed border-white/20"></div>
          <span className="absolute bg-[#121316] px-3 py-0.5 rounded-full border border-white/10 text-[9px] text-gray-400 uppercase tracking-widest font-mono font-bold">
            Dental Midline
          </span>
        </div>

        {/* LOWER JAW (MANDIBLE) */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-[10px] font-bold text-red-400 uppercase tracking-wider px-1">
            <span>Lower Right (LR 8 → 1)</span>
            <span className="text-gray-400 font-extrabold text-[9px] sm:text-[10px]">LOWER JAW (MANDIBLE)</span>
            <span>Lower Left (LL 1 → 8)</span>
          </div>

          <div className="grid grid-cols-8 sm:grid-cols-16 gap-1 sm:gap-1.5">
            {LOWER_RIGHT_TEETH.map((tooth) => renderToothButton(tooth, false))}
            {LOWER_LEFT_TEETH.map((tooth) => renderToothButton(tooth, false))}
          </div>
        </div>
      </div>

      {/* Selected Teeth Summary Badges */}
      <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-xl bg-white/[0.02] border border-white/10 min-h-[38px]">
        <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mr-1">
          Selected ({selectedTeeth.length}):
        </span>
        {selectedTeeth.length === 0 ? (
          <span className="text-xs text-gray-500 italic">
            General / Whole Mouth (Click any tooth to select)
          </span>
        ) : (
          selectedTeeth.map((id) => (
            <span
              key={id}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-red-600 text-white font-mono font-bold text-xs shadow-glow-red-sm"
            >
              #{id}
              <button
                type="button"
                onClick={() => onChange(selectedTeeth.filter((t) => t !== id))}
                className="hover:text-red-200 ml-0.5"
                title="Remove tooth"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))
        )}
      </div>
    </div>
  );
}

export interface ToothSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTeeth: string[];
  onConfirm?: (teeth: string[]) => void;
  onSave?: (teeth: string[]) => void;
  treatmentName?: string;
  procedureName?: string;
}

/**
 * Portaled Modal Wrapper for ToothSelector
 */
export function ToothSelectorModal({
  isOpen,
  onClose,
  selectedTeeth,
  onConfirm,
  onSave,
  treatmentName,
  procedureName
}: ToothSelectorModalProps) {
  const [mounted, setMounted] = useState(false);
  const [localSelection, setLocalSelection] = useState<string[]>([]);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setLocalSelection([...(selectedTeeth || [])]);
    }
  }, [isOpen, selectedTeeth]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!mounted || !isOpen) return null;

  const handleDone = () => {
    if (onSave) onSave(localSelection);
    if (onConfirm) onConfirm(localSelection);
    onClose();
  };

  const title = procedureName || treatmentName;

  const modalContent = (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        className="w-full max-w-2xl bg-[#0f0f10] text-gray-100 rounded-2xl border border-white/10 shadow-2xl p-4 sm:p-6 space-y-4 max-h-[92vh] flex flex-col justify-between overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-extrabold text-white tracking-tight">
                Dental Tooth Selector
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-red-600/20 border border-red-500/40 text-red-400 text-[10px] font-mono font-bold">
                1 2 3 4 5 6 7 8 | 8 7 6 5 4 3 2 1
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              {title ? `Select affected teeth for "${title}"` : 'Click teeth to select or deselect for procedure'}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Interactive Chart */}
        <ToothSelector
          selectedTeeth={localSelection}
          onChange={setLocalSelection}
        />

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-white/10 pt-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setLocalSelection([])}
            className="text-xs text-gray-400 hover:text-white gap-1.5"
            disabled={localSelection.length === 0}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Clear Selection
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleDone}
              className="text-xs gap-1.5 shadow-glow-red"
            >
              <Check className="w-3.5 h-3.5" />
              Apply ({localSelection.length} Selected)
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
