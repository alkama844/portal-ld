/* Anti-FOUC boot script. Loaded synchronously in <head> before the body renders.
   1. Restores the cached theme colour + fonts from localStorage instantly.
   2. Restores the saved language on <html> so no wrong-language text paints.
   3. Hides page content (keeping the loader visible) until the theme, fonts and
      CMS content have been attached, so nothing flashes or jumps. */
(function () {
    'use strict';

    var SETTINGS_CACHE = 'site:settings:v1';
    var root = document.documentElement;
    var settings = {};


    try { settings = JSON.parse(window.localStorage.getItem(SETTINGS_CACHE) || '{}') || {}; } catch (e) { settings = {}; }

    /* ---- theme colour baseline (before any stylesheet paints) ---- */
    if (settings.theme) {
        root.style.setProperty('--theme-primary', settings.theme);
        root.style.setProperty('--bs-primary', settings.theme);
    }

    /* ---- fonts: preload + font-display:swap so text never reflows ---- */
    function addFont(href) {
        if (!href) return;
        var link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        root.appendChild(link);
    }
    ['fontBody', 'fontHeading', 'fontBn'].forEach(function (key) {
        var name = settings[key];
        if (!name) return;
        if (/^[A-Za-z0-9 ]+$/.test(name)) {
            addFont('https://fonts.googleapis.com/css2?family=' + name.replace(/ /g, '+') +
                ':wght@400;700&display=swap');
        }
    });

    /* ---- language baseline ---- */
    var lang = 'en';
    try { lang = window.localStorage.getItem('site-language') || 'en'; } catch (e) { /* ignore */ }
    root.lang = lang === 'bn' ? 'bn' : 'en';

    /* ---- anti-flash gate ---- */
    root.className += (root.className ? ' ' : '') + 'site-booting';
    var style = document.createElement('style');
    style.id = 'siteBootStyle';
    style.textContent = [
        'html.site-booting body > *:not(#spinner){visibility:hidden !important;}',
        'html.site-booting #spinner{opacity:1 !important;}',
        'html.site-booting{background:#fff;}',
        /* loader dot follows the cached theme colour from the very first frame */
        '#spinner .spinner-grow,#spinner .spinner-border,#spinner .text-primary' +
        '{color:var(--theme-primary,#9aa0a6) !important;}',
        'body{transition:opacity .18s ease-in;}'
    ].join('');
    root.appendChild(style);

    var pending = { settings: false, cms: false, lang: false };
    var revealed = false;

    function reveal() {
        if (revealed) return;
        revealed = true;
        root.className = root.className.replace(/\bsite-booting\b/g, '').trim();
        document.dispatchEvent(new CustomEvent('site-boot:revealed'));
    }

    function done(name) {
        pending[name] = true;
        if (pending.settings && pending.cms && pending.lang) {
            /* one frame so the applied styles are committed before we show */
            if (window.requestAnimationFrame) window.requestAnimationFrame(reveal);
            else reveal();
        }
    }

    window.SiteBoot = { done: done, reveal: reveal, settings: settings };

    /* The window load event does not mean remote CMS settings are ready.
       Revealing there caused first-time visitors (with no local cache) to see
       the template colours before the saved theme arrived.  Each initializer
       calls done(), including its failure path, so normally this timer is
       never used; it only protects against a genuinely stalled request. */
    setTimeout(reveal, 10000);
})();
