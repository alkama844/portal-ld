/**
 * Lucky Dental Care — Global Configuration & Utilities
 * Centralized API Base URL and shared helper functions
 */

(function () {
  'use strict';

  // 1. Centralized API Base URL Configuration & Resilient Fallback (Section 9, 22)
  const API_BASE_URL = 'https://api.luckydentalcare.com';

  const isFile = window.location.protocol === 'file:';
  const isLocalhost = Boolean(
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.endsWith('.local') ||
    isFile
  );

  window.LUCKY_API_BASE_URL = window.LUCKY_API_BASE_OVERRIDE || (
    isLocalhost ? 'http://localhost:5000' : API_BASE_URL
  );
  window.LUCKY_FALLBACK_API_URL = isLocalhost ? API_BASE_URL : 'http://localhost:5000';

  /**
   * Resilient Fetch with Automatic Fallback (Localhost <-> Cloud API)
   * Prevents "Cannot connect to server" when one backend is offline
   */
  window.fetchWithBackendFallback = async function (endpoint, options = {}) {
    const primary = (window.LUCKY_API_BASE_URL || API_BASE_URL).replace(/\/+$/, '');
    const fallback = (window.LUCKY_FALLBACK_API_URL || (primary.includes('localhost') ? API_BASE_URL : 'http://localhost:5000')).replace(/\/+$/, '');
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : '/' + endpoint;

    try {
      const res = await fetch(`${primary}${cleanEndpoint}`, options);
      return res;
    } catch (primaryErr) {
      console.warn(`Lucky API: Primary backend (${primary}) unreachable, attempting fallback (${fallback})...`);
      try {
        const fallbackRes = await fetch(`${fallback}${cleanEndpoint}`, options);
        // Fallback succeeded, remember it for subsequent requests
        window.LUCKY_API_BASE_URL = fallback;
        window.LUCKY_FALLBACK_API_URL = primary;
        return fallbackRes;
      } catch (fallbackErr) {
        throw primaryErr;
      }
    }
  };

  /**
   * Safe Frontend Error Sanitizer (Section 6, 7)
   * Prevents exposure of internal infrastructure, database tech, or stack traces to public visitors
   */
  window.toSafeErrorMessage = function (err, fallbackMsg) {
    if (!err) return fallbackMsg || 'কিছু সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।';
    const raw = String(err?.message || err).toLowerCase();
    if (raw.includes('failed to fetch') || raw.includes('network') || raw.includes('connection refused') || raw.includes('econnrefused')) {
      return 'unable to connect edit engine';
    }
    if (raw.includes('mongo') || raw.includes('database') || raw.includes('db')) {
      return 'ডাটা সেবা এই মুহূর্তে উপলভ্য নয়।';
    }
    if (raw.includes('unauthorized') || raw.includes('password') || raw.includes('credentials') || raw.includes('লগইন')) {
      return 'অ্যাডমিন পাসওয়ার্ড সঠিক নয়।';
    }
    if (raw.includes('sms')) {
      return 'SMS সেবা এই মুহূর্তে উপলভ্য নয়।';
    }
    return fallbackMsg || 'কিছু সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।';
  };

  // 2. Bengali Number Formatter
  window.toBengaliNumerals = function (num) {
    if (num === undefined || num === null || isNaN(num)) return '০';
    const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    const formattedStr = Math.round(Number(num)).toLocaleString('en-IN');
    return formattedStr.replace(/[0-9]/g, function (d) {
      return bengaliDigits[Number(d)];
    });
  };

  // 3. Currency Formatter (৳ x,xxx)
  window.formatBDT = function (amount) {
    return '৳ ' + window.toBengaliNumerals(amount);
  };

  // 4. Polished Toast Notifications
  window.showToast = function (message, type = 'info') {
    let container = document.getElementById('luckyToastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'luckyToastContainer';
      container.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:99999;display:flex;flex-direction:column;gap:10px;pointer-events:none;font-family:var(--font-base);';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    const bg = type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#1e293b';
    const icon = type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle';

    toast.style.cssText = `background:${bg};color:#fff;padding:12px 20px;border-radius:10px;font-size:0.92rem;font-weight:600;box-shadow:0 10px 25px rgba(0,0,0,0.2);display:inline-flex;align-items:center;gap:10px;pointer-events:auto;transition:all 0.3s ease;opacity:0;transform:translateY(15px);`;
    toast.innerHTML = `<i class="fas ${icon}"></i><span>${message}</span>`;
    container.appendChild(toast);

    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0)';
    });

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(15px)';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  };

  // 5. Admin Token Session Management
  const TOKEN_KEY = 'lucky_admin_session_token';

  window.LuckyAuth = {
    getToken: function () {
      try {
        return sessionStorage.getItem(TOKEN_KEY) || null;
      } catch (e) {
        return null;
      }
    },
    setToken: function (token) {
      try {
        if (token) {
          sessionStorage.setItem(TOKEN_KEY, token);
        } else {
          sessionStorage.removeItem(TOKEN_KEY);
        }
      } catch (e) {}
    },
    clearToken: function () {
      try {
        sessionStorage.removeItem(TOKEN_KEY);
      } catch (e) {}
    },
    isAuthenticated: function () {
      return Boolean(this.getToken());
    }
  };

  // ==========================================================================
  // Lucky Dental Care — Frontend Theme Synchronization (Sections 25-34)
  // ==========================================================================
  function hexToRgb(hex) {
    const res = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return res ? {
      r: parseInt(res[1], 16),
      g: parseInt(res[2], 16),
      b: parseInt(res[3], 16)
    } : null;
  }

  function adjustColor(rgb, percent) {
    const r = Math.min(255, Math.max(0, Math.round(rgb.r * (1 + percent))));
    const g = Math.min(255, Math.max(0, Math.round(rgb.g * (1 + percent))));
    const b = Math.min(255, Math.max(0, Math.round(rgb.b * (1 + percent))));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  function applyBrandColor(hex, hoverHex) {
    if (!hex || !/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(hex)) return;
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
    root.style.setProperty('--brand-primary-shadow', `0 10px 25px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.20)`);
    root.style.setProperty('--bs-primary', hex);
    root.style.setProperty('--bs-primary-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);

    // Dynamic aliases for legacy & component styles
    root.style.setProperty('--brand-red', hex);
    root.style.setProperty('--brand-red-dark', effectiveHover);
    root.style.setProperty('--brand-red-deep', deepHex);
    root.style.setProperty('--brand-red-light', lightHex);
    root.style.setProperty('--brand-red-soft', softHex);
    root.style.setProperty('--brand-red-subtle', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.05)`);
    root.style.setProperty('--brand-red-glow', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.18)`);
    root.style.setProperty('--shadow-red', `0 10px 25px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.25)`);
    root.style.setProperty('--shadow-red-lg', `0 16px 36px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.35)`);
  }

  function initThemeColor() {
    try {
      const saved = localStorage.getItem('lucky_dental_frontend_color');
      const savedHover = localStorage.getItem('lucky_dental_frontend_hover_color');
      if (saved) applyBrandColor(saved, savedHover);
    } catch (e) {}

    const apiBase = (window.LUCKY_API_BASE_URL || 'https://api.luckydentalcare.com').replace(/\/+$/, '');
    fetch(`${apiBase}/api/settings/clinic`)
      .then(res => res.json())
      .then(json => {
        if (json.success && json.data) {
          const pCol = json.data.frontendColor;
          const hCol = json.data.frontendHoverColor;
          if (pCol) {
            applyBrandColor(pCol, hCol);
            try {
              localStorage.setItem('lucky_dental_frontend_color', pCol);
              if (hCol) localStorage.setItem('lucky_dental_frontend_hover_color', hCol);
            } catch (e) {}
          }
        }
      })
      .catch(() => {});
  }

  window.LuckyTheme = {
    applyColor: applyBrandColor,
    init: initThemeColor
  };

  initThemeColor();

  // Universal mobile drawer controller shared by every static page.
  let drawerScrollPosition = 0;
  let drawerBodyStyles = null;

  function openMobileDrawer(drawer, overlay) {
    if (drawer.classList.contains('active')) return;

    drawerScrollPosition = window.scrollY;
    drawerBodyStyles = {
      position: document.body.style.position,
      top: document.body.style.top,
      width: document.body.style.width,
      overflow: document.body.style.overflow,
      touchAction: document.body.style.touchAction
    };

    document.body.style.position = 'fixed';
    document.body.style.top = `-${drawerScrollPosition}px`;
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
    document.body.classList.add('drawer-open');
    drawer.classList.add('active');
    overlay.classList.add('active');
  }

  function closeMobileDrawer(drawer, overlay) {
    if (!drawer.classList.contains('active')) return;

    drawer.classList.remove('active');
    overlay.classList.remove('active');
    document.body.classList.remove('drawer-open');

    if (drawerBodyStyles) {
      document.body.style.position = drawerBodyStyles.position;
      document.body.style.top = drawerBodyStyles.top;
      document.body.style.width = drawerBodyStyles.width;
      document.body.style.overflow = drawerBodyStyles.overflow;
      document.body.style.touchAction = drawerBodyStyles.touchAction;
    }

    window.scrollTo(0, drawerScrollPosition);
    drawerBodyStyles = null;
  }

  document.addEventListener('click', function (e) {
    const toggle = e.target && e.target.closest ? e.target.closest('#mobileMenuToggle, .mobile-toggle-btn') : null;
    if (toggle) {
      e.preventDefault();
      const drawer = document.getElementById('mobileDrawer');
      const overlay = document.getElementById('drawerOverlay');
      if (drawer && overlay) {
        openMobileDrawer(drawer, overlay);
      }
    }

    const close = e.target && e.target.closest ? e.target.closest('#drawerCloseBtn, .drawer-close-btn, #drawerOverlay, .drawer-link') : null;
    if (close) {
      const drawer = document.getElementById('mobileDrawer');
      const overlay = document.getElementById('drawerOverlay');
      if (drawer && overlay) {
        closeMobileDrawer(drawer, overlay);
      }
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;

    const drawer = document.getElementById('mobileDrawer');
    const overlay = document.getElementById('drawerOverlay');
    if (drawer && overlay && drawer.classList.contains('active')) {
      closeMobileDrawer(drawer, overlay);
    }
  });
})();

