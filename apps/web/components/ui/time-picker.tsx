'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Clock, Check } from 'lucide-react';

interface TimePickerProps {
  label?: string;
  value: string; // e.g. "07:30 PM" or "10:00 AM"
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
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
  placeholder = 'Select time',
  required = false,
  disabled = false,
  className = ''
}: TimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse existing value or set defaults
  const parseTime = (timeStr: string) => {
    if (!timeStr) return { hour: '10', minute: '00', period: 'AM' };
    const parts = timeStr.trim().split(' ');
    const period = parts[1]?.toUpperCase() === 'PM' ? 'PM' : 'AM';
    const [h, m] = (parts[0] || '10:00').split(':');
    const hour = String(Math.min(12, Math.max(1, Number(h) || 10))).padStart(2, '0');
    const minute = String(Math.min(59, Math.max(0, Number(m) || 0))).padStart(2, '0');
    return { hour, minute, period };
  };

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
  }, [value]);

  // Close on click outside
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

  const updateTime = (h: string, m: string, p: string) => {
    setSelectedHour(h);
    setSelectedMinute(m);
    setSelectedPeriod(p);
    const formatted = `${h}:${m} ${p}`;
    setManualInput(formatted);
    onChange(formatted);
  };

  const handlePresetClick = (slot: string) => {
    onChange(slot);
    setIsOpen(false);
  };

  const handleManualBlur = () => {
    if (manualInput.trim()) {
      onChange(manualInput.trim());
    }
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
            <Clock className="w-4 h-4 text-red-400 shrink-0" />
            <span className={`text-xs truncate font-mono ${value ? 'text-gray-100 font-semibold' : 'text-gray-500'}`}>
              {value || placeholder}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] uppercase font-bold text-red-400 bg-red-950/80 px-2 py-0.5 rounded-md border border-red-800/40">
              {parsed.period}
            </span>
          </div>
        </div>

        {/* Dropdown Popover */}
        {isOpen && (
          <div className="absolute z-50 mt-2 left-0 w-80 p-4 rounded-2xl bg-[#121212] border border-white/15 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 space-y-3.5">
            {/* Presets Header */}
            <div>
              <p className="text-[10px] uppercase font-bold text-gray-400 mb-1.5 tracking-wider">
                Common Dental Slots
              </p>
              <div className="grid grid-cols-3 gap-1.5">
                {PRESET_SLOTS.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => handlePresetClick(slot)}
                    className={`py-1.5 px-2 rounded-lg text-[11px] font-mono font-medium transition-all ${
                      value === slot
                        ? 'bg-red-600 text-white font-bold shadow-glow-red-sm'
                        : 'bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </div>

            {/* Interactive Dial Selector */}
            <div className="pt-2 border-t border-white/10 space-y-2">
              <div className="flex items-center justify-between text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                <span>Hour</span>
                <span>Minute</span>
                <span>Period</span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {/* Hours Column */}
                <div className="h-32 overflow-y-auto rounded-xl bg-black/40 border border-white/10 p-1 space-y-1 custom-scrollbar">
                  {HOURS.map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => updateTime(h, selectedMinute, selectedPeriod)}
                      className={`w-full py-1 text-center text-xs font-mono rounded-lg transition-all ${
                        selectedHour === h
                          ? 'bg-red-600 text-white font-bold'
                          : 'text-gray-400 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {h}
                    </button>
                  ))}
                </div>

                {/* Minutes Column */}
                <div className="h-32 overflow-y-auto rounded-xl bg-black/40 border border-white/10 p-1 space-y-1 custom-scrollbar">
                  {MINUTES.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => updateTime(selectedHour, m, selectedPeriod)}
                      className={`w-full py-1 text-center text-xs font-mono rounded-lg transition-all ${
                        selectedMinute === m
                          ? 'bg-red-600 text-white font-bold'
                          : 'text-gray-400 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>

                {/* Period Column */}
                <div className="h-32 flex flex-col justify-center gap-2 rounded-xl bg-black/40 border border-white/10 p-1.5">
                  <button
                    type="button"
                    onClick={() => updateTime(selectedHour, selectedMinute, 'AM')}
                    className={`flex-1 flex items-center justify-center text-xs font-bold font-mono rounded-lg transition-all ${
                      selectedPeriod === 'AM'
                        ? 'bg-red-600 text-white shadow-glow-red-sm'
                        : 'text-gray-400 hover:bg-white/10 hover:text-white'
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
                        : 'text-gray-400 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    PM
                  </button>
                </div>
              </div>
            </div>

            {/* Manual Text Input & Confirm */}
            <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="e.g. 07:30 PM"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  onBlur={handleManualBlur}
                  className="w-full bg-black/50 border border-white/15 rounded-lg px-2.5 py-1 text-xs text-gray-100 font-mono"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  if (manualInput) onChange(manualInput.trim());
                  setIsOpen(false);
                }}
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
