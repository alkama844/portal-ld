'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface DatePickerProps {
  label?: string;
  value: string; // Canonical YYYY-MM-DD
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  minDate?: string;
  maxDate?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  hasError?: boolean;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export function DatePicker({
  label,
  value,
  onChange,
  placeholder = 'Select appointment date',
  required = false,
  minDate,
  maxDate,
  disabled = false,
  className = '',
  id,
  hasError = false
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Parse initial view month/year from value or current date
  const parseDate = useCallback((val?: string) => {
    if (!val) return new Date();
    const parts = val.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) return d;
    }
    const fallback = new Date(val);
    return isNaN(fallback.getTime()) ? new Date() : fallback;
  }, []);

  const [viewDate, setViewDate] = useState<Date>(() => parseDate(value));

  // Sync viewDate whenever value changes
  useEffect(() => {
    if (value) {
      const d = parseDate(value);
      setViewDate(d);
    }
  }, [value, parseDate]);

  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();

  // Close when clicking outside (mousedown & touchstart)
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

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewDate(new Date(viewYear, viewMonth - 1, 1));
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewDate(new Date(viewYear, viewMonth + 1, 1));
  };

  const handleSelectDay = (day: number) => {
    const monthStr = String(viewMonth + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const dateStr = `${viewYear}-${monthStr}-${dayStr}`;
    onChange(dateStr);
    setIsOpen(false);
  };

  const handleSetQuick = (offsetDays: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const target = new Date();
    target.setDate(target.getDate() + offsetDays);
    const yyyy = target.getFullYear();
    const mm = String(target.getMonth() + 1).padStart(2, '0');
    const dd = String(target.getDate()).padStart(2, '0');
    onChange(`${yyyy}-${mm}-${dd}`);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  };

  // Generate calendar days
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  // Format display string
  const formatDisplay = (val: string) => {
    if (!val) return '';
    const parts = val.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        });
      }
    }
    return val;
  };

  const todayStr = (() => {
    const t = new Date();
    const y = t.getFullYear();
    const m = String(t.getMonth() + 1).padStart(2, '0');
    const d = String(t.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  })();

  return (
    <div className={`space-y-1.5 relative ${className}`} ref={containerRef} id={id}>
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
            <CalendarIcon className="w-4 h-4 text-red-500 dark:text-red-400 shrink-0" />
            <span
              className={`text-xs sm:text-sm truncate ${
                value
                  ? 'text-slate-900 dark:text-gray-100 font-semibold'
                  : 'text-gray-400 dark:text-gray-500 font-normal'
              }`}
            >
              {value ? formatDisplay(value) : placeholder}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 ml-2">
            {value && !disabled && (
              <span
                role="button"
                tabIndex={0}
                onClick={handleClear}
                onKeyDown={(e) => e.key === 'Enter' && handleClear(e as any)}
                className="p-1 text-gray-400 hover:text-red-500 rounded-lg transition-colors cursor-pointer"
                title="Clear date"
                aria-label="Clear date"
              >
                <X className="w-3.5 h-3.5" />
              </span>
            )}
          </div>
        </button>

        {/* Dropdown Calendar Popover */}
        {isOpen && (
          <div
            ref={popoverRef}
            role="dialog"
            aria-modal="true"
            aria-label="Calendar date selector"
            className="absolute z-[100] mt-2 left-0 w-80 p-4 rounded-2xl bg-white dark:bg-[#141414] border border-slate-200 dark:border-white/15 shadow-2xl backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-150"
          >
            {/* Quick Action Shortcuts */}
            <div className="flex items-center gap-1.5 mb-3 pb-2.5 border-b border-slate-100 dark:border-white/10">
              <button
                type="button"
                onClick={(e) => handleSetQuick(0, e)}
                className="flex-1 py-1.5 px-2 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-red-50 dark:hover:bg-red-950/60 hover:text-red-600 dark:hover:text-red-300 text-[11px] text-slate-700 dark:text-gray-300 font-bold transition-all text-center"
              >
                Today
              </button>
              <button
                type="button"
                onClick={(e) => handleSetQuick(1, e)}
                className="flex-1 py-1.5 px-2 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-red-50 dark:hover:bg-red-950/60 hover:text-red-600 dark:hover:text-red-300 text-[11px] text-slate-700 dark:text-gray-300 font-bold transition-all text-center"
              >
                Tomorrow
              </button>
              <button
                type="button"
                onClick={(e) => handleSetQuick(7, e)}
                className="flex-1 py-1.5 px-2 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-red-50 dark:hover:bg-red-950/60 hover:text-red-600 dark:hover:text-red-300 text-[11px] text-slate-700 dark:text-gray-300 font-bold transition-all text-center"
              >
                +1 Week
              </button>
            </div>

            {/* Header: Month & Year Navigation */}
            <div className="flex items-center justify-between mb-3 px-1">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1.5 rounded-lg text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                aria-label="Previous month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-gray-100 tracking-tight">
                {MONTH_NAMES[viewMonth]} {viewYear}
              </div>

              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1.5 rounded-lg text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                aria-label="Next month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Weekday Headers */}
            <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
              {DAY_NAMES.map((d) => (
                <span
                  key={d}
                  className="text-[10px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider py-1"
                >
                  {d}
                </span>
              ))}
            </div>

            {/* Day Cells Grid */}
            <div className="grid grid-cols-7 gap-1 text-center">
              {/* Prev month fill */}
              {Array.from({ length: firstDayOfWeek }).map((_, i) => {
                const prevDay = daysInPrevMonth - firstDayOfWeek + i + 1;
                return (
                  <span
                    key={`prev-${i}`}
                    className="text-[11px] h-9 flex items-center justify-center text-slate-300 dark:text-gray-600 select-none"
                  >
                    {prevDay}
                  </span>
                );
              })}

              {/* Current month days */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const monthStr = String(viewMonth + 1).padStart(2, '0');
                const dayStr = String(dayNum).padStart(2, '0');
                const currentCellDate = `${viewYear}-${monthStr}-${dayStr}`;
                const isSelected = value === currentCellDate;
                const isToday = todayStr === currentCellDate;

                return (
                  <button
                    key={dayNum}
                    type="button"
                    onClick={() => handleSelectDay(dayNum)}
                    className={`text-xs h-9 rounded-xl font-semibold transition-all flex items-center justify-center ${
                      isSelected
                        ? 'bg-red-600 text-white font-bold shadow-glow-red-sm scale-105'
                        : isToday
                        ? 'bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/60 font-bold'
                        : 'text-slate-800 dark:text-gray-200 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-red-600 dark:hover:text-white'
                    }`}
                  >
                    {dayNum}
                  </button>
                );
              })}
            </div>

            {/* Manual Native Fallback Input */}
            <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-white/10 flex items-center justify-between">
              <label className="text-[11px] font-medium text-slate-500 dark:text-gray-400">
                Manual / Native:
              </label>
              <input
                type="date"
                value={value}
                min={minDate}
                max={maxDate}
                onChange={(e) => {
                  onChange(e.target.value);
                  if (e.target.value) setIsOpen(false);
                }}
                className="bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-white/15 rounded-lg px-2.5 py-1 text-xs text-slate-800 dark:text-gray-200 font-mono"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
