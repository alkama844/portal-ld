'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Clock, Check } from 'lucide-react';

interface TimePickerProps {
  label?: string;
  value: string; // Canonical 12-hour format e.g. "07:30 PM"
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  id?: string;
  hasError?: boolean;
}

const HOURS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
const MINUTES = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];
const PRESET_SLOTS = [
  '09:00 AM',
  '10:00 AM',
  '11:30 AM',
  '12:30 PM',
  '03:00 PM',
  '04:30 PM',
  '06:00 PM',
  '07:30 PM',
  '08:30 PM'
];

export function TimePicker({
  label,
  value,
  onChange,
  placeholder = '07:30 PM',
  required = false,
  disabled = false,
  className = '',
  id,
  hasError = false
}: TimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Parse time string e.g. "07:30 PM" or "7:30pm" or "19:30"
  const parseTime = useCallback((timeStr?: string) => {
    if (!timeStr) return { hour: '07', minute: '30', period: 'PM' };
    const cleaned = timeStr.trim().toUpperCase();
    const periodMatch = cleaned.match(/(AM|PM)/);
    const period = periodMatch ? periodMatch[0] : 'PM';
    const digitsOnly = cleaned.replace(/[A-Z]/g, '').trim();
    const [hRaw, mRaw] = digitsOnly.split(':');
    let hNum = parseInt(hRaw, 10);
    if (isNaN(hNum)) hNum = 7;
    if (hNum > 12) {
      hNum = hNum % 12 || 12;
    } else if (hNum < 1) {
      hNum = 12;
    }
    const hour = String(hNum).padStart(2, '0');
    let mNum = parseInt(mRaw, 10);
    if (isNaN(mNum)) mNum = 0;
    if (mNum > 59) mNum = 59;
    if (mNum < 0) mNum = 0;
    const minute = String(mNum).padStart(2, '0');
    return { hour, minute, period };
  }, []);

  const parsed = parseTime(value);
  const [selectedHour, setSelectedHour] = useState(parsed.hour);
  const [selectedMinute, setSelectedMinute] = useState(parsed.minute);
  const [selectedPeriod, setSelectedPeriod] = useState(parsed.period);
  const [manualInput, setManualInput] = useState(value || '');

  useEffect(() => {
    const p = parseTime(value);
    setSelectedHour(p.hour);
    setSelectedMinute(p.minute);
    setSelectedPeriod(p.period);
    setManualInput(value || '');
  }, [value, parseTime]);

  // Close when clicking outside or pressing Escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node) &&
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const updateTime = (h: string, m: string, p: string) => {
    setSelectedHour(h);
    setSelectedMinute(m);
    setSelectedPeriod(p);
    const formatted = `${h}:${m} ${p}`;
    setManualInput(formatted);
    onChange(formatted);
  };

  const handlePresetClick = (slot: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(slot);
    setIsOpen(false);
  };

  const handleApplyManual = (e: React.FormEvent | React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (manualInput.trim()) {
      const p = parseTime(manualInput);
      const formatted = `${p.hour}:${p.minute} ${p.period}`;
      onChange(formatted);
    }
    setIsOpen(false);
  };

  return (
    <div className={`space-y-1.5 relative ${isOpen ? 'z-[60]' : 'z-auto'} ${className}`} ref={containerRef} id={id}>
      {label && (
        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      <div className="relative">
        {/* Clickable Trigger Control */}
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          aria-label={label || placeholder}
          className={`w-full glass-input flex items-center justify-between px-3.5 py-2.5 rounded-xl cursor-pointer transition-all text-left select-none ${
            disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-red-500/50'
          } ${
            isOpen ? 'border-red-500 ring-2 ring-red-500/20 shadow-glow-red-sm' : ''
          } ${
            hasError ? 'border-red-500 ring-2 ring-red-500/30' : ''
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <Clock className="w-4 h-4 text-red-500 dark:text-red-400 shrink-0" />
            <span
              className={`text-xs sm:text-sm font-mono truncate ${
                value
                  ? 'text-slate-900 dark:text-gray-100 font-bold'
                  : 'text-gray-400 dark:text-gray-500 font-normal'
              }`}
            >
              {value || placeholder}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 ml-2">
            <span className="text-[10px] uppercase font-extrabold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/80 px-2 py-0.5 rounded-md border border-red-200 dark:border-red-800/40 font-mono">
              {parsed.period}
            </span>
          </div>
        </button>

        {/* Dropdown Popover */}
        {isOpen && (
          <div
            ref={popoverRef}
            role="dialog"
            aria-modal="true"
            aria-label="Time selector"
            className="absolute z-[9999] top-full mt-2 left-0 w-80 sm:w-88 p-4 rounded-2xl bg-white dark:bg-[#141414] border border-slate-200 dark:border-white/15 shadow-2xl backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-150 space-y-3.5"
          >
            {/* Presets Header */}
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-500 dark:text-gray-400 mb-1.5 tracking-wider">
                Common Dental Slots
              </p>
              <div className="grid grid-cols-3 gap-1.5">
                {PRESET_SLOTS.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={(e) => handlePresetClick(slot, e)}
                    className={`py-1.5 px-2 rounded-lg text-[11px] font-mono font-semibold transition-all ${
                      value === slot
                        ? 'bg-red-600 text-white font-bold shadow-glow-red-sm'
                        : 'bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-white/10 hover:text-red-600 dark:hover:text-white'
                    }`}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </div>

            {/* Interactive Dial Selector */}
            <div className="pt-2 border-t border-slate-100 dark:border-white/10 space-y-2">
              <div className="flex items-center justify-between text-[10px] font-extrabold text-slate-400 dark:text-gray-500 uppercase tracking-wider px-1">
                <span>Hour</span>
                <span>Minute</span>
                <span>Period</span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {/* Hours Column */}
                <div className="h-32 overflow-y-auto rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 p-1 space-y-1 custom-scrollbar">
                  {HOURS.map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => updateTime(h, selectedMinute, selectedPeriod)}
                      className={`w-full py-1 text-center text-xs font-mono font-semibold rounded-lg transition-all ${
                        selectedHour === h
                          ? 'bg-red-600 text-white font-bold'
                          : 'text-slate-700 dark:text-gray-400 hover:bg-slate-200 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {h}
                    </button>
                  ))}
                </div>

                {/* Minutes Column */}
                <div className="h-32 overflow-y-auto rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 p-1 space-y-1 custom-scrollbar">
                  {MINUTES.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => updateTime(selectedHour, m, selectedPeriod)}
                      className={`w-full py-1 text-center text-xs font-mono font-semibold rounded-lg transition-all ${
                        selectedMinute === m
                          ? 'bg-red-600 text-white font-bold'
                          : 'text-slate-700 dark:text-gray-400 hover:bg-slate-200 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>

                {/* Period Column */}
                <div className="h-32 flex flex-col justify-center gap-2 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 p-1.5">
                  <button
                    type="button"
                    onClick={() => updateTime(selectedHour, selectedMinute, 'AM')}
                    className={`flex-1 flex items-center justify-center text-xs font-bold font-mono rounded-lg transition-all ${
                      selectedPeriod === 'AM'
                        ? 'bg-red-600 text-white shadow-glow-red-sm'
                        : 'text-slate-700 dark:text-gray-400 hover:bg-slate-200 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    AM
                  </button>
                  <button
                    type="button"
                    onClick={() => updateTime(selectedHour, selectedMinute, 'PM')}
                    className={`flex-1 flex items-center justify-center text-xs font-bold font-mono rounded-lg transition-all ${
                      selectedPeriod === 'PM'
                        ? 'bg-red-600 text-white shadow-glow-red-sm'
                        : 'text-slate-700 dark:text-gray-400 hover:bg-slate-200 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    PM
                  </button>
                </div>
              </div>
            </div>

            {/* Manual Text Input & Confirm */}
            <div className="pt-2 border-t border-slate-100 dark:border-white/10 flex items-center justify-between gap-2">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="e.g. 07:30 PM"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleApplyManual(e)}
                  className="w-full bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-white/15 rounded-lg px-2.5 py-1 text-xs text-slate-900 dark:text-gray-100 font-mono"
                />
              </div>
              <button
                type="button"
                onClick={handleApplyManual}
                className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg shadow-glow-red-sm transition-all"
              >
                Apply
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
