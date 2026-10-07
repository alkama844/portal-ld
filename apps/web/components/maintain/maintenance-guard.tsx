'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Shield, AlertTriangle, Key, X, CheckCircle2, Lock, ExternalLink } from 'lucide-react';

interface MaintenancePayload {
  site: string;
  isMaintenance: boolean;
  message: string;
  title: string;
  description: string;
  extraDescription: string;
  mediaType: string;
  mediaUrl: string;
  btnText: string;
  btnUrl: string;
}

const SITE_ID = 'luckydental';
const STATUS_API = `https://maintain-doc.vercel.app/api/status/${encodeURIComponent(SITE_ID)}`;
const ENCRYPTION_KEY = 'nafijthepro';
const PASSCODE_ENCRYPTED = 'ARYIDBhGXg==';
const ACCEPTED_PASSCODES = ['ARYIDBhGXg==', 'nafijthepro', 'nafijpro++', 'admin', 'lucky2026'];
const POLL_INTERVAL = 30000;

function decryptXOR(b64: string, key: string = ENCRYPTION_KEY): string {
  if (!b64 || typeof b64 !== 'string') return '';
  const trimmed = b64.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.includes(' ')) {
    return trimmed;
  }
  try {
    const raw = typeof window !== 'undefined' ? window.atob(trimmed) : Buffer.from(trimmed, 'base64').toString('binary');
    let res = '';
    for (let i = 0; i < raw.length; i++) {
      res += String.fromCharCode(raw.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return res;
  } catch {
    return trimmed;
  }
}

export function MaintenanceGuard({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [isBypassed, setIsBypassed] = useState(false);
  const [payload, setPayload] = useState<MaintenancePayload>({
    site: SITE_ID,
    isMaintenance: false,
    message: '',
    title: 'Maintenance Mode',
    description: 'Our systems are undergoing scheduled maintenance to improve your experience. We will be back online shortly. Thank you for your patience.',
    extraDescription: '',
    mediaType: 'none',
    mediaUrl: '',
    btnText: '',
    btnUrl: ''
  });

  // Owner Admin Bypass Modal
  const [showBypassModal, setShowBypassModal] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [passcodeError, setPasscodeError] = useState('');
  const [footerClicks, setFooterClicks] = useState(0);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync Status from MaintainDoc API
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(STATUS_API, { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();

      const rawActive = data.active;
      const maintenanceVal = data.maintenance;

      // When active is true OR maintenance is true -> maintenance mode is ON
      // When active is false OR maintenance is false -> maintenance mode is OFF (show website)
      const activeState = maintenanceVal !== undefined
        ? Boolean(maintenanceVal)
        : (rawActive === true || rawActive === 'true');

      const message = decryptXOR(data.message) || '';
      const title = decryptXOR(data.maintenanceTitle) || 'Maintenance Mode';
      const description = decryptXOR(data.maintenanceDescription) || 'Our systems are undergoing scheduled maintenance. Back online shortly.';
      const extraDescription = decryptXOR(data.extraDescription) || '';
      const mediaType = data.mediaType || 'none';
      const mediaUrl = decryptXOR(data.mediaUrl) || '';
      const btnText = decryptXOR(data.btnText) || '';
      const btnUrl = decryptXOR(data.btnUrl) || '';

      setIsMaintenance(activeState);
      setPayload({
        site: SITE_ID,
        isMaintenance: activeState,
        message,
        title,
        description,
        extraDescription,
        mediaType,
        mediaUrl,
        btnText,
        btnUrl
      });

      if (typeof window !== 'undefined') {
        window.localStorage.setItem('maintenance_active', activeState ? 'true' : 'false');
      }
    } catch {
      // In case of network error, keep current state
    }
  }, []);

  useEffect(() => {
    setMounted(true);

    if (typeof window !== 'undefined') {
      const cachedBypass = window.localStorage.getItem('maintenance_bypass') === 'true';
      const cachedActive = window.localStorage.getItem('maintenance_active') === 'true';
      setIsBypassed(cachedBypass);
      setIsMaintenance(cachedActive);
    }

    fetchStatus();
    const interval = setInterval(fetchStatus, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  // Keyboard shortcut listener for Owner Bypass (Ctrl + Shift + M or Ctrl + Alt + A)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey && e.shiftKey && (e.key === 'M' || e.key === 'm')) ||
          (e.ctrlKey && e.altKey && (e.key === 'A' || e.key === 'a'))) {
        e.preventDefault();
        setShowBypassModal(prev => !prev);
        setPasscodeError('');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleFooterClick = () => {
    const newCount = footerClicks + 1;
    setFooterClicks(newCount);

    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
    }

    if (newCount >= 4) {
      setShowBypassModal(true);
      setFooterClicks(0);
    } else {
      clickTimeoutRef.current = setTimeout(() => {
        setFooterClicks(0);
      }, 1500);
    }
  };

  const handleBypassSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = passcode.trim();

    // Check against accepted passcode or decoded passcode
    const isMatch = ACCEPTED_PASSCODES.includes(clean) || clean === decryptXOR(PASSCODE_ENCRYPTED);

    if (isMatch) {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('maintenance_bypass', 'true');
      }
      setIsBypassed(true);
      setShowBypassModal(false);
      setPasscode('');
      setPasscodeError('');
    } else {
      setPasscodeError('Invalid owner passcode. Access denied.');
    }
  };

  const handleToggleBypassOff = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('maintenance_bypass');
    }
    setIsBypassed(false);
  };

  // SSR Safe: before mount, render children or simple placeholder
  if (!mounted) {
    return <>{children}</>;
  }

  // If maintenance is not active OR user has locally bypassed maintenance
  if (!isMaintenance || isBypassed) {
    return (
      <>
        {children}

        {/* Floating Owner Bypass Indicator if currently bypassed while maintenance is active */}
        {isMaintenance && isBypassed && (
          <div className="fixed bottom-4 right-4 z-[99999] flex items-center gap-2 bg-emerald-950/90 text-emerald-300 border border-emerald-500/30 px-3 py-2 rounded-lg text-xs font-medium shadow-2xl backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>⚡ Owner Bypass Active (Maintenance Online)</span>
            <button
              onClick={handleToggleBypassOff}
              className="ml-2 bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 px-2 py-0.5 rounded text-[10px] transition"
              title="Lock and return to maintenance mode"
            >
              Re-Lock
            </button>
          </div>
        )}
      </>
    );
  }

  // Render Full MaintainDoc Universal Maintenance UI
  return (
    <div className="min-h-screen w-full bg-[#09090b] text-[#fafafa] flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Dynamic Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(56,189,248,0.12)_0%,transparent_70%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(225,29,72,0.08)_0%,transparent_60%)] pointer-events-none" />

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }}
      />

      <div className="relative z-10 w-full max-w-xl mx-auto flex flex-col items-center text-center">
        {/* Pulsing Status Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold uppercase tracking-wider mb-6 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
          <span>System Maintenance</span>
        </div>

        {/* Media / Visual Container */}
        <div className="mb-6 w-full flex justify-center">
          {payload.mediaUrl ? (
            <div className="relative rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-900/60 shadow-2xl max-w-md w-full">
              {payload.mediaType === 'video' || payload.mediaUrl.match(/\.(mp4|webm|ogv|mov)$/i) ? (
                <video
                  src={payload.mediaUrl}
                  autoPlay
                  muted
                  loop
                  playsInline
                  controls
                  className="w-full h-auto max-h-64 object-cover"
                />
              ) : payload.mediaUrl.includes('youtube.com') || payload.mediaUrl.includes('youtu.be') || payload.mediaUrl.includes('vimeo.com') ? (
                <iframe
                  src={payload.mediaUrl}
                  className="w-full h-64 border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <img
                  src={payload.mediaUrl}
                  alt="Maintenance Visual"
                  className="w-full h-auto max-h-64 object-cover"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              )}
            </div>
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex items-center justify-center shadow-xl shadow-sky-950/20">
              <Shield className="w-10 h-10 text-sky-400 stroke-[1.5]" />
            </div>
          )}
        </div>

        {/* Main Title */}
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-3">
          {payload.title || 'Maintenance Mode'}
        </h1>

        {/* Primary Description */}
        <p className="text-zinc-400 text-sm sm:text-base leading-relaxed mb-6 max-w-lg">
          {payload.description}
        </p>

        {/* Broadcast Announcement Box if present */}
        {payload.message && (
          <div className="w-full bg-zinc-900/90 border border-zinc-800 rounded-xl p-4 mb-6 text-left shadow-lg backdrop-blur-sm">
            <div className="flex items-start gap-3">
              <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 shrink-0 mt-0.5">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-amber-400 uppercase tracking-wide mb-1">
                  Live Announcement
                </div>
                <div className="text-sm text-zinc-300 leading-normal">
                  {payload.message}
                </div>
                {payload.extraDescription && (
                  <div className="text-xs text-zinc-500 mt-2 border-t border-zinc-800/80 pt-2 leading-normal">
                    {payload.extraDescription}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Action Button CTA if configured */}
        {payload.btnText && payload.btnUrl && (
          <a
            href={payload.btnUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-zinc-950 font-semibold text-sm transition shadow-lg shadow-sky-500/20 mb-8"
          >
            <span>{payload.btnText}</span>
            <ExternalLink className="w-4 h-4" />
          </a>
        )}

        {/* Subtle Footer with 4-click owner backdoor trigger */}
        <div
          onClick={handleFooterClick}
          className="mt-8 text-xs text-zinc-600 cursor-pointer select-none hover:text-zinc-500 transition flex items-center gap-1.5"
          title="Lucky Dental Care Dental Management System"
        >
          <Lock className="w-3 h-3 opacity-50" />
          <span>Lucky Dental Care • Protected Administrative Portal</span>
        </div>
      </div>

      {/* Owner Bypass Passcode Modal (Ctrl + Shift + M) */}
      {showBypassModal && (
        <div className="fixed inset-0 z-[999999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <button
              onClick={() => setShowBypassModal(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Owner Bypass Gateway</h3>
                <p className="text-xs text-zinc-400">Enter authorization passcode to access dashboard</p>
              </div>
            </div>

            <form onSubmit={handleBypassSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                  Passcode
                </label>
                <input
                  type="password"
                  value={passcode}
                  onChange={(e) => {
                    setPasscode(e.target.value);
                    setPasscodeError('');
                  }}
                  autoFocus
                  placeholder="Enter administrator passcode..."
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-sky-500 transition"
                />
              </div>

              {passcodeError && (
                <div className="text-xs text-rose-400 font-medium">
                  {passcodeError}
                </div>
              )}

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowBypassModal(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-700 text-zinc-300 hover:bg-zinc-800 text-sm font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-zinc-950 text-sm font-semibold transition flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Verify & Unlock</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
