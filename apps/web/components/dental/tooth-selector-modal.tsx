'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface ToothSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTeeth: string[];
  onConfirm?: (teeth: string[]) => void;
  onSave?: (teeth: string[]) => void;
  treatmentName?: string;
  procedureName?: string;
}

interface ToothData {
  id: string;
  name: string;
  type: 'incisor' | 'canine' | 'premolar' | 'molar';
}

const UPPER_RIGHT: ToothData[] = [
  { id: '18', name: 'Third Molar (Wisdom)', type: 'molar' },
  { id: '17', name: 'Second Molar', type: 'molar' },
  { id: '16', name: 'First Molar', type: 'molar' },
  { id: '15', name: 'Second Premolar', type: 'premolar' },
  { id: '14', name: 'First Premolar', type: 'premolar' },
  { id: '13', name: 'Canine (Eye Tooth)', type: 'canine' },
  { id: '12', name: 'Lateral Incisor', type: 'incisor' },
  { id: '11', name: 'Central Incisor', type: 'incisor' },
];

const UPPER_LEFT: ToothData[] = [
  { id: '21', name: 'Central Incisor', type: 'incisor' },
  { id: '22', name: 'Lateral Incisor', type: 'incisor' },
  { id: '23', name: 'Canine (Eye Tooth)', type: 'canine' },
  { id: '24', name: 'First Premolar', type: 'premolar' },
  { id: '25', name: 'Second Premolar', type: 'premolar' },
  { id: '26', name: 'First Molar', type: 'molar' },
  { id: '27', name: 'Second Molar', type: 'molar' },
  { id: '28', name: 'Third Molar (Wisdom)', type: 'molar' },
];

const LOWER_RIGHT: ToothData[] = [
  { id: '48', name: 'Third Molar (Wisdom)', type: 'molar' },
  { id: '47', name: 'Second Molar', type: 'molar' },
  { id: '46', name: 'First Molar', type: 'molar' },
  { id: '45', name: 'Second Premolar', type: 'premolar' },
  { id: '44', name: 'First Premolar', type: 'premolar' },
  { id: '43', name: 'Canine', type: 'canine' },
  { id: '42', name: 'Lateral Incisor', type: 'incisor' },
  { id: '41', name: 'Central Incisor', type: 'incisor' },
];

const LOWER_LEFT: ToothData[] = [
  { id: '31', name: 'Central Incisor', type: 'incisor' },
  { id: '32', name: 'Lateral Incisor', type: 'incisor' },
  { id: '33', name: 'Canine', type: 'canine' },
  { id: '34', name: 'First Premolar', type: 'premolar' },
  { id: '35', name: 'Second Premolar', type: 'premolar' },
  { id: '36', name: 'First Molar', type: 'molar' },
  { id: '37', name: 'Second Molar', type: 'molar' },
  { id: '38', name: 'Third Molar (Wisdom)', type: 'molar' },
];

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

  // Handle ESC key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!mounted || !isOpen) return null;

  const toggleTooth = (id: string) => {
    setLocalSelection((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  const handleClear = () => {
    setLocalSelection([]);
  };

  const handleDone = () => {
    if (onSave) onSave(localSelection);
    if (onConfirm) onConfirm(localSelection);
    onClose();
  };

  const renderTooth = (tooth: ToothData, isUpper: boolean) => {
    const isSelected = localSelection.includes(tooth.id);

    return (
      <button
        key={tooth.id}
        type="button"
        onClick={() => toggleTooth(tooth.id)}
        className={`group relative flex flex-col items-center justify-center p-1 sm:p-1.5 rounded-xl transition-all duration-150 border select-none ${
          isSelected
            ? 'bg-red-600 text-white border-red-500 shadow-glow-red scale-105 z-10'
            : 'bg-white/5 hover:bg-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] text-gray-300 hover:text-white border-white/10 hover:border-white/20'
        }`}
        title={`Tooth ${tooth.id} - ${tooth.name}`}
      >
        {/* Anatomical Tooth SVG / Icon Representation */}
        <div className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center">
          <svg
            viewBox="0 0 24 24"
            className={`w-5 h-5 sm:w-6 sm:h-6 transition-transform ${
              isUpper ? 'rotate-180' : ''
            } ${isSelected ? 'fill-white stroke-white' : 'fill-none stroke-current'}`}
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* Adult Molar / Bicuspid / Incisor Profile */}
            {tooth.type === 'molar' ? (
              <path d="M7 4C4.5 4 3 6.5 3 9.5C3 13 4.5 16 6 19.5C6.5 20.5 8 20.5 8.5 19L9.5 15C10 13.5 11 13.5 11.5 15L12.5 19C13 20.5 14.5 20.5 15 19.5C16.5 16 18 13 18 9.5C18 6.5 16.5 4 14 4C12.5 4 11.5 5 10.5 5C9.5 5 8.5 4 7 4Z" />
            ) : tooth.type === 'premolar' ? (
              <path d="M7.5 4C5.5 4 4 6.5 4 9.5C4 13 5.5 16 7 19.5C7.5 20.5 9 20.5 9.5 19L10.5 14.5C11 13.5 12 13.5 12.5 14.5L13.5 19C14 20.5 15.5 20.5 16 19.5C17.5 16 19 13 19 9.5C19 6.5 17.5 4 15.5 4C14 4 13 5 11.5 5C10 5 9 4 7.5 4Z" />
            ) : tooth.type === 'canine' ? (
              <path d="M8 4C6 4.5 5 7 5 10C5 13.5 6.5 16.5 8 20C8.5 21 10 21 10.5 19.5L11.5 15C12 14 13 14 13.5 15L14.5 19.5C15 21 16.5 21 17 20C18.5 16.5 20 13.5 20 10C20 7 19 4.5 17 4C15 3.5 13.5 4.5 12.5 4.5C11.5 4.5 10 3.5 8 4Z" />
            ) : (
              <path d="M8 4C6 4.5 5 7 5 10C5 14 7 17 9 20C9.5 20.5 11 20.5 11.5 19L12 14C12.5 13.5 13.5 13.5 14 14L14.5 19C15 20.5 16.5 20.5 17 20C19 17 21 14 21 10C21 7 20 4.5 18 4C16.5 3.5 14.5 4 13 4C11.5 4 9.5 3.5 8 4Z" />
            )}
          </svg>
        </div>

        {/* FDI Tooth Number */}
        <span
          className={`font-mono text-[11px] sm:text-xs font-black mt-1 leading-none ${
            isSelected ? 'text-white' : 'text-gray-200'
          }`}
        >
          {tooth.id}
        </span>
      </button>
    );
  };

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
                Dental Tooth Selector (FDI 32-Odontogram)
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-red-600/20 border border-red-500/40 text-red-400 text-[10px] font-mono font-bold">
                Adult Teeth
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              {treatmentName ? `Select target teeth for "${treatmentName}"` : 'Click teeth to select or deselect for procedure'}
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

        {/* Selected Badges Preview */}
        <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-xl bg-white/[0.03] border border-white/10 min-h-[40px]">
          <span className="text-[11px] font-bold text-gray-400 mr-1 uppercase">Selected:</span>
          {localSelection.length === 0 ? (
            <span className="text-xs text-gray-500 italic">No teeth selected yet (General / Whole Mouth)</span>
          ) : (
            localSelection.map((id) => (
              <span
                key={id}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-red-600 text-white font-mono font-bold text-xs shadow-glow-red-sm"
              >
                #{id}
                <button
                  type="button"
                  onClick={() => toggleTooth(id)}
                  className="hover:text-red-200"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))
          )}
        </div>

        {/* Odontogram Container */}
        <div className="space-y-4 py-2">
          {/* Upper Jaw (Maxilla) */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-[10px] sm:text-xs font-bold text-red-400 uppercase tracking-wider px-2">
              <span>Upper Right (Q1)</span>
              <span className="text-gray-400 font-extrabold">UPPER JAW (MAXILLA)</span>
              <span>Upper Left (Q2)</span>
            </div>

            <div className="p-2 sm:p-3 rounded-2xl bg-black/40 border border-white/10 grid grid-cols-8 sm:grid-cols-16 gap-1 sm:gap-1.5">
              {/* Q1: 18 -> 11 */}
              {UPPER_RIGHT.map((tooth) => renderTooth(tooth, true))}
              {/* Q2: 21 -> 28 */}
              {UPPER_LEFT.map((tooth) => renderTooth(tooth, true))}
            </div>
          </div>

          {/* Dental Midline Divider */}
          <div className="relative flex items-center justify-center my-1">
            <div className="w-full border-t border-dashed border-white/20"></div>
            <span className="absolute bg-[#0f0f10] px-3 text-[10px] text-gray-400 uppercase tracking-widest font-mono font-bold">
              Midline
            </span>
          </div>

          {/* Lower Jaw (Mandible) */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-[10px] sm:text-xs font-bold text-red-400 uppercase tracking-wider px-2">
              <span>Lower Right (Q4)</span>
              <span className="text-gray-400 font-extrabold">LOWER JAW (MANDIBLE)</span>
              <span>Lower Left (Q3)</span>
            </div>

            <div className="p-2 sm:p-3 rounded-2xl bg-black/40 border border-white/10 grid grid-cols-8 sm:grid-cols-16 gap-1 sm:gap-1.5">
              {/* Q4: 48 -> 41 */}
              {LOWER_RIGHT.map((tooth) => renderTooth(tooth, false))}
              {/* Q3: 31 -> 38 */}
              {LOWER_LEFT.map((tooth) => renderTooth(tooth, false))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-white/10 pt-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
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
              Done ({localSelection.length} Selected)
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
