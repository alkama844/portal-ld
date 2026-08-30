'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface DatePickerProps {
  label?: string;
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  minDate?: string;
  maxDate?: string;
  disabled?: boolean;
  className?: string;
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
  placeholder = 'Select date',
  required = false,
  minDate,
  maxDate,
  disabled = false,
  className = ''
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse initial view month/year
  const initialDate = value ? new Date(value) : new Date();
  const [viewYear, setViewYear] = useState<number>(
    isNaN(initialDate.getFullYear()) ? new Date().getFullYear() : initialDate.getFullYear()
  );
  const [viewMonth, setViewMonth] = useState<number>(
    isNaN(initialDate.getMonth()) ? new Date().getMonth() : initialDate.getMonth()
  );

  // Sync view when value changes
  useEffect(() => {
    if (value) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
      }
    }
  }, [value]);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const handleSelectDay = (day: number) => {
    const monthStr = String(viewMonth + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const dateStr = `${viewYear}-${monthStr}-${dayStr}`;
    onChange(dateStr);
    setIsOpen(false);
  };

  const handleSetQuick = (offsetDays: number) => {
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

  // Generate calendar grid days
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  // Format display string
  const formatDisplay = (val: string) => {
    if (!val) return '';
    const d = new Date(val + 'T00:00:00');
    if (isNaN(d.getTime())) return val;
    return d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className={`space-y-1.5 ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-xs font-medium text-gray-300 uppercase tracking-wide">
          {label} {required && <span className="text-red-400">*</span>}
        </label>
      )}

      <div className="relative">
        <div
          onClick={() => !disabled && setIsOpen(!isOpen)}
          className={`glass-input flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
            disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-red-500/50'
          } ${isOpen ? 'border-red-500 ring-2 ring-red-500/20' : ''}`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <CalendarIcon className="w-4 h-4 text-red-400 shrink-0" />
            <span className={`text-xs truncate ${value ? 'text-gray-100 font-medium' : 'text-gray-500'}`}>
              {value ? formatDisplay(value) : placeholder}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {value && !disabled && (
              <button
                type="button"
                onClick={handleClear}
                className="p-1 text-gray-400 hover:text-red-400 rounded-lg transition-colors"
                title="Clear date"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Dropdown Popover */}
        {isOpen && (
          <div className="absolute z-50 mt-2 left-0 w-72 p-3.5 rounded-2xl bg-[#121212] border border-white/15 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
            {/* Quick Actions */}
            <div className="flex items-center gap-1.5 mb-3 pb-2 border-b border-white/10">
              <button
                type="button"
                onClick={() => handleSetQuick(0)}
                className="flex-1 py-1 px-2 rounded-lg bg-white/5 hover:bg-red-950/60 hover:text-red-300 text-[11px] text-gray-300 font-medium transition-all"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => handleSetQuick(1)}
                className="flex-1 py-1 px-2 rounded-lg bg-white/5 hover:bg-red-950/60 hover:text-red-300 text-[11px] text-gray-300 font-medium transition-all"
              >
                Tomorrow
              </button>
              <button
                type="button"
                onClick={() => handleSetQuick(7)}
                className="flex-1 py-1 px-2 rounded-lg bg-white/5 hover:bg-red-950/60 hover:text-red-300 text-[11px] text-gray-300 font-medium transition-all"
              >
                +1 Week
              </button>
            </div>

            {/* Header: Month & Year Navigation */}
            <div className="flex items-center justify-between mb-2">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Previous month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="text-xs font-bold text-gray-100 font-mono">
                {MONTH_NAMES[viewMonth]} {viewYear}
              </div>

              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Next month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Weekday Headers */}
            <div className="grid grid-cols-7 gap-1 text-center mb-1">
              {DAY_NAMES.map((d) => (
                <span key={d} className="text-[10px] font-bold text-gray-500 py-1">
                  {d}
                </span>
              ))}
            </div>

            {/* Day Cells */}
            <div className="grid grid-cols-7 gap-1 text-center">
              {/* Prev month fill */}
              {Array.from({ length: firstDayOfWeek }).map((_, i) => {
                const prevDay = daysInPrevMonth - firstDayOfWeek + i + 1;
                return (
                  <span
                    key={`prev-${i}`}
                    className="text-[11px] py-1.5 text-gray-600 cursor-not-allowed select-none"
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
                const isToday = new Date().toISOString().split('T')[0] === currentCellDate;

                return (
                  <button
                    key={dayNum}
                    type="button"
                    onClick={() => handleSelectDay(dayNum)}
                    className={`text-xs py-1.5 rounded-lg font-medium transition-all ${
                      isSelected
                        ? 'bg-red-600 text-white font-bold shadow-glow-red-sm'
                        : isToday
                        ? 'bg-red-950/60 text-red-400 border border-red-800/60 font-semibold'
                        : 'text-gray-300 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {dayNum}
                  </button>
                );
              })}
            </div>

            {/* Manual Native Input Fallback for Accessibility */}
            <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between">
              <label className="text-[10px] text-gray-400">Manual Entry:</label>
              <input
                type="date"
                value={value}
                min={minDate}
                max={maxDate}
                onChange={(e) => {
                  onChange(e.target.value);
                  if (e.target.value) setIsOpen(false);
                }}
                className="bg-black/50 border border-white/15 rounded-lg px-2 py-1 text-[11px] text-gray-200"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
