/* Applies the site-wide font + theme colour saved from the admin settings panel.
   Loaded on every page (main pages and *2.html editor pages). */
(function () {
    'use strict';

    var API = '/api/public/cms/settings';
    var CACHE = 'site:settings:v1';
    var DEFAULTS = {
        theme: '', fontBody: '', fontHeading: '', fontBn: '', footerBg: '', footerText: '',
        /* "Our Achievements" section — its own colours, independent of the theme. */
        achvBg: '', achvAccent: '', achvText: ''
    };
    var loaded = {};

    function catalogue() {
        return (window.SiteFonts && window.SiteFonts.list) || [];
    }

    function findFont(name) {
        if (!name) return null;
        var list = catalogue();
        for (var i = 0; i < list.length; i++) if (list[i].name === name) return list[i];
        return null;
    }

    function addLink(href) {
        if (!href || loaded[href]) return;
        loaded[href] = true;
        var link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        (document.head || document.documentElement).appendChild(link);
    }

    /* Makes sure the webfont files for a catalogue entry are downloaded. */
    function ensureFont(font) {
        if (!font) return;
        if (font.src === 'g') {
            var base = font.name.replace(/ /g, '+');
            addLink('https://fonts.googleapis.com/css2?family=' + base + '&display=swap');
            addLink('https://fonts.googleapis.com/css2?family=' + base + ':wght@700&display=swap');
        } else if (font.src === 'm') {
            addLink('https://fonts.maateen.me/' + font.slug + '/font.css');
        }
    }

    function stack(font, fallback) {
        if (!font) return '';
        var tail = font.bn
            ? '"Noto Sans Bengali","Hind Siliguri","SolaimanLipi",sans-serif'
            : (fallback || 'sans-serif');
        return font.src === 'sys' ? font.family : font.family + ',' + tail;
    }

    function styleTag() {
        var tag = document.getElementById('siteSettingsStyle');
        if (!tag) {
            tag = document.createElement('style');
            tag.id = 'siteSettingsStyle';
            (document.head || document.documentElement).appendChild(tag);
        }
        /* Always keep it last so it beats css/style.css. */
        (document.head || document.documentElement).appendChild(tag);
        return tag;
    }

    var HEADINGS = 'h1,h2,h3,h4,h5,h6,.display-1,.display-2,.display-3,.display-4,.display-5,.display-6,.section-title,.navbar-brand,.font-playfair';
    var BODY_SEL = 'body,p,li,td,th,dd,dt,label,small,blockquote,figcaption,.btn,button,input,textarea,select,.nav-link,.navbar,.font-work-sans,.card,.form-control';

    function prefix(selectors, pre) {
        return selectors.split(',').map(function (part) { return pre + ' ' + part.trim(); }).join(',');
    }

    function css(settings) {
        var body = findFont(settings.fontBody);
        var heading = findFont(settings.fontHeading);
        var bn = findFont(settings.fontBn);
        ensureFont(body); ensureFont(heading); ensureFont(bn);

        var out = [];
        if (body) {
            out.push(':root{--site-font-body:' + stack(body, '"Work Sans",sans-serif') + ';}');
            out.push(BODY_SEL + '{font-family:var(--site-font-body) !important;}');
        }
        if (heading) {
            out.push(':root{--site-font-heading:' + stack(heading, '"Playfair Display",serif') + ';}');
            out.push(HEADINGS + '{font-family:var(--site-font-heading) !important;}');
        }
        if (bn) {
            out.push(':root{--site-font-bn:' + stack(bn) + ';}');
            out.push(prefix(BODY_SEL + ',' + HEADINGS + ',a,span', '.lang-bn') +
                ',.lang-bn{font-family:var(--site-font-bn) !important;}');
        }
        if (settings.theme) {
            var rgb = hexToRgb(settings.theme);
            var hsl = rgb ? rgbToHsl(rgb) : null;
            var dark = hsl ? rgbToHex(hslToRgb(hsl[0], hsl[1], Math.max(0.12, hsl[2] - 0.1))) : settings.theme;
            var light = hsl ? rgbToHex(hslToRgb(hsl[0], hsl[1], Math.min(0.94, hsl[2] + 0.12))) : settings.theme;
            out.push(':root{--theme-primary:' + settings.theme + ';--bs-primary:' + settings.theme +
                ';--theme-primary-dark:' + dark + ';--theme-primary-light:' + light + ';}');

            /* Hover / focus / active states always follow the theme colour. */
            out.push([
                'a:hover,a:focus,a.text-primary:hover,.text-primary:hover{color:var(--theme-primary-dark) !important;}',
                '.btn-primary,.bg-primary{background-color:var(--theme-primary) !important;border-color:var(--theme-primary) !important;}',
                '.btn-primary:hover,.btn-primary:focus,.btn-primary:active,.btn-primary.active,.btn-check:checked+.btn-primary',
                '{background-color:var(--theme-primary-dark) !important;border-color:var(--theme-primary-dark) !important;color:#fff !important;}',
                '.btn-outline-primary{color:var(--theme-primary) !important;border-color:var(--theme-primary) !important;}',
                '.btn-outline-primary:hover,.btn-outline-primary:focus,.btn-outline-primary:active',
                '{background-color:var(--theme-primary) !important;border-color:var(--theme-primary) !important;color:#fff !important;}',
                '.btn-primary:focus,.btn-outline-primary:focus,.form-control:focus,.form-select:focus',
                '{box-shadow:0 0 0 .2rem color-mix(in srgb, var(--theme-primary) 30%, transparent) !important;}',
                '.form-control:focus,.form-select:focus{border-color:var(--theme-primary) !important;}',
                '.navbar-light .navbar-nav .nav-link:hover,.navbar-light .navbar-nav .nav-link.active{color:var(--theme-primary) !important;}',
                '.dropdown-item:hover,.dropdown-item:focus,.dropdown-item.active{background-color:var(--theme-primary) !important;color:#fff !important;}',
                '.page-link{color:var(--theme-primary) !important;}',
                '.page-item.active .page-link,.page-link:hover{background-color:var(--theme-primary) !important;border-color:var(--theme-primary) !important;color:#fff !important;}',
                '.back-to-top:hover,.btn-square:hover,.btn-lg-square:hover{background-color:var(--theme-primary-dark) !important;border-color:var(--theme-primary-dark) !important;}'
            ].join(''));
        }

        /* Footer colours (main footer + copyright strip). */
        if (settings.footerBg) {
            out.push('.footer,.site-copyright{background-color:' + settings.footerBg + ' !important;border-color:rgba(255,255,255,.12) !important;}');
        }
        if (settings.footerText) {
            out.push([
                '.footer,.footer p,.footer h1,.footer h2,.footer h3,.footer h4,.footer h5,.footer h6,',
                '.footer a,.footer span,.footer li,.footer small,.footer i,.footer .text-white,.footer .text-white-50,',
                '.site-copyright,.site-copyright a,.site-copyright span,.site-copyright div,.site-copyright .text-white,.site-copyright .text-white-50',
                '{color:' + settings.footerText + ' !important;}'
            ].join(''));
        }

        /* "Our Achievements" section colours — saved on their own, so this block
           no longer follows the site theme once a colour is chosen. */
        if (settings.achvBg) {
            var abg = settings.achvBg;
            var argb = hexToRgb(abg);
            var ahsl = argb ? rgbToHsl(argb) : null;
            var adark = ahsl ? rgbToHex(hslToRgb(ahsl[0], ahsl[1], Math.max(0.05, ahsl[2] - 0.18))) : abg;
            out.push('.achv2-section{background:' +
                'radial-gradient(1100px 420px at 85% -10%,color-mix(in srgb,' + abg + ' 65%,transparent),transparent 60%),' +
                'linear-gradient(180deg,' + adark + ' 0%,' + abg + ' 55%,' + adark + ' 100%) !important;}');
            out.push('.achv2-glow-1{background:' + abg + ' !important;}');
        }
        if (settings.achvAccent) {
            out.push('.achv2-section{--achv2-gold:' + settings.achvAccent + ' !important;--achv2-gold-2:' + settings.achvAccent + ' !important;}');
            out.push('.achv2-glow-2{background:' + settings.achvAccent + ' !important;}');
        }
        if (settings.achvText) {
            out.push('.achv2-title,.achv2-number{color:' + settings.achvText + ' !important;}');
            out.push('.achv2-sub{color:color-mix(in srgb,' + settings.achvText + ' 70%,transparent) !important;}');
        }


        /* Page loader always follows the theme colour. */
        out.push('#spinner .spinner-grow,#spinner .spinner-border,#spinner .text-primary{color:var(--theme-primary) !important;background-color:currentColor;}');
        out.push('#spinner .spinner-border{background-color:transparent !important;border-color:currentColor;border-right-color:transparent;}');

        /* Never let a custom font replace icon glyphs. */
        out.push('.fa,.fas,.far,.fal,.fad,[class*="fa-"]:not(.fab){font-family:"Font Awesome 6 Free","Font Awesome 5 Free" !important;}');
        out.push('.fab,[class*="fa-"].fab{font-family:"Font Awesome 6 Brands","Font Awesome 5 Brands" !important;}');
        out.push('[class^="bi-"],[class*=" bi-"]{font-family:bootstrap-icons !important;}');
        return out.join('\n');
    }

    /* ---------- Brand colour harmonisation -------------------------------
       The template hard-codes a teal palette in css/style.css and in inline
       styles. Those values are re-mapped to the chosen theme colour so that
       buttons, navbar, gradients and section backgrounds all match. */

    /* Original brand colours, lowercase hex. */
    var BRAND = ['#083f43', '#0a5a60', '#12787f', '#063033', '#0d6266',
        '#eef6f6', '#f4fafa', '#e6f2f2', '#083f67', '#4338ca', '#3d3220', '#6b4f1a', '#4d5d5e', '#536365', '#172b4d', '#dfecea', '#e8ecf7'];
    var BRAND_RGB = [[8, 63, 67], [10, 90, 96], [18, 120, 127], [6, 48, 51]];

    function hexToRgb(hex) {
        hex = String(hex).trim().replace('#', '');
        if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
        if (!/^[0-9a-f]{6}$/i.test(hex)) return null;
        return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
    }

    function rgbToHsl(rgb) {
        var r = rgb[0] / 255, g = rgb[1] / 255, b = rgb[2] / 255;
        var max = Math.max(r, g, b), min = Math.min(r, g, b);
        var h = 0, s = 0, l = (max + min) / 2, d = max - min;
        if (d) {
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            if (max === r) h = ((g - b) / d + (g < b ? 6 : 0));
            else if (max === g) h = (b - r) / d + 2;
            else h = (r - g) / d + 4;
            h /= 6;
        }
        return [h, s, l];
    }

    function hslToRgb(h, s, l) {
        function f(p, q, t) {
            if (t < 0) t += 1; if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        }
        if (!s) { var v = Math.round(l * 255); return [v, v, v]; }
        var q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
        return [Math.round(f(p, q, h + 1 / 3) * 255), Math.round(f(p, q, h) * 255), Math.round(f(p, q, h - 1 / 3) * 255)];
    }

    function rgbToHex(rgb) {
        return '#' + rgb.map(function (v) {
            return ('0' + Math.max(0, Math.min(255, v)).toString(16)).slice(-2);
        }).join('');
    }

    /* Every solid brand colour becomes EXACTLY the chosen theme colour, so
       buttons, navbar, gradients and icons never mix different tones.
       Only the very light wash backgrounds keep their lightness (otherwise the
       dark body text on them would be unreadable) and adopt the theme hue. */
    function retint(originalRgb, themeHsl) {
        var o = rgbToHsl(originalRgb);
        if (o[2] >= 0.82) {
            /* light wash: same tone, theme hue */
            return hslToRgb(themeHsl[0], Math.max(0.15, Math.min(0.4, themeHsl[1])), o[2]);
        }
        /* everything else: the exact theme colour */
        return hslToRgb(themeHsl[0], themeHsl[1], themeHsl[2]);
    }


    function buildMap(theme) {
        var base = hexToRgb(theme);
        if (!base) return null;
        var hsl = rgbToHsl(base);
        var map = [];
        BRAND.forEach(function (hex) {
            var rgb = hexToRgb(hex);
            if (!rgb) return;
            map.push({ re: new RegExp(hex, 'gi'), to: rgbToHex(retint(rgb, hsl)) });
        });
        /* Browsers serialise hex colours as rgb()/rgba(), so match those too. */
        BRAND.map(hexToRgb).concat(BRAND_RGB).forEach(function (rgb) {
            if (!rgb) return;
            var out = retint(rgb, hsl);
            map.push({
                re: new RegExp('(rgba?)\\(\\s*' + rgb[0] + '\\s*,\\s*' + rgb[1] + '\\s*,\\s*' + rgb[2] + '\\s*([,)])', 'gi'),
                to: '$1(' + out[0] + ', ' + out[1] + ', ' + out[2] + '$2',
            });
        });

        return map;
    }

    function swap(value, map) {
        var out = value;
        for (var i = 0; i < map.length; i++) out = out.replace(map[i].re, map[i].to);
        return out;
    }

    /* Remembers the untouched declaration text so previews can be reverted. */
    var originals = new WeakMap();

    function recolorDeclaration(decl, map) {
        var original = originals.get(decl);
        if (original === undefined) {
            original = decl.cssText || '';
            if (!/#[0-9a-f]{3,6}|rgba?\(/i.test(original)) { originals.set(decl, ''); return; }
            originals.set(decl, original);
        }
        if (!original) return;
        var next = map ? swap(original, map) : original;
        if (next !== decl.cssText) {
            try { decl.cssText = next; } catch (e) { /* readonly sheet */ }
        }
    }


    function walkRules(rules, map) {
        for (var i = 0; i < rules.length; i++) {
            var rule = rules[i];
            if (rule.style) recolorDeclaration(rule.style, map);
            if (rule.cssRules) walkRules(rule.cssRules, map);
        }
    }

    function recolorSheets(map) {
        var sheets = document.styleSheets;
        for (var i = 0; i < sheets.length; i++) {
            var sheet = sheets[i];
            if (sheet.ownerNode && sheet.ownerNode.id === 'siteSettingsStyle') continue;
            var rules;
            try { rules = sheet.cssRules; } catch (e) { continue; } /* cross-origin */
            if (rules) walkRules(rules, map);
        }
    }

    var inlineOriginals = new WeakMap();

    function recolorInline(map) {
        var nodes = document.querySelectorAll('[style]');
        for (var i = 0; i < nodes.length; i++) {
            var node = nodes[i];
            /* <html> carries --theme-primary / --bs-primary set by apply() and
               theme-boot.js. Rewriting it from a stale captured "original"
               reverted the theme every time the footer (or any other setting)
               was applied — that coupling is exactly what we must avoid. */
            if (node === document.documentElement) continue;
            /* The settings panel's own colour swatches are UI chrome, never
               brand content — leave their inline colours untouched. */
            if (node.closest && node.closest('#stgPanel')) continue;
            var original = inlineOriginals.get(node);
            if (original === undefined) {
                original = node.getAttribute('style') || '';
                if (!/#[0-9a-f]{3,6}|rgba?\(/i.test(original)) { inlineOriginals.set(node, ''); continue; }
                inlineOriginals.set(node, original);
            }
            if (!original) continue;
            var next = map ? swap(original, map) : original;
            if (next !== node.getAttribute('style')) node.setAttribute('style', next);
        }
    }

    function recolor(theme) {
        var map = theme ? buildMap(theme) : null;
        try { recolorSheets(map); } catch (e) { /* ignore */ }
        try { recolorInline(map); } catch (e) { /* ignore */ }
    }

    /* Stylesheets can still be loading and carousels/animations clone nodes
       after the first pass, so repeat it briefly — this is what makes a newly
       picked colour show up everywhere straight away instead of after reload. */
    function recolorRepeatedly(theme) {
        recolor(theme);
        if (window.requestAnimationFrame) window.requestAnimationFrame(function () { recolor(theme); });
        [60, 250, 700, 1600].forEach(function (delay) {
            setTimeout(function () { recolor(current.theme); }, delay);
        });
    }

    /* Keep newly inserted markup / stylesheets in the theme colour too. */
    var observerTimer = null;
    function watchDom() {
        if (!window.MutationObserver || watchDom.on) return;
        watchDom.on = true;
        new MutationObserver(function () {
            if (observerTimer) return;
            observerTimer = setTimeout(function () { observerTimer = null; recolor(current.theme); }, 120);
        }).observe(document.documentElement, { childList: true, subtree: true, attributeFilter: ['style'] });
    }

    function apply(settings) {
        /* Merge instead of replace: a partial update (e.g. only footer colours)
           must never wipe the theme, and vice versa. Explicit empty strings in
           the incoming object still clear a key, so panel reset keeps working. */
        current = Object.assign({}, DEFAULTS, current, settings || {});
        styleTag().textContent = css(current);
        if (current.theme) {
            document.documentElement.style.setProperty('--theme-primary', current.theme);
            document.documentElement.style.setProperty('--bs-primary', current.theme);
        } else {
            document.documentElement.style.removeProperty('--theme-primary');
            document.documentElement.style.removeProperty('--bs-primary');
        }
        window.SiteSettings.current = current;
        recolorRepeatedly(current.theme);
        watchDom();
    }



    var current = Object.assign({}, DEFAULTS);

    function readCache() {
        try { return JSON.parse(window.localStorage.getItem(CACHE) || 'null'); } catch (e) { return null; }
    }

    function writeCache(settings) {
        try { window.localStorage.setItem(CACHE, JSON.stringify(settings || {})); } catch (e) { /* quota */ }
    }

    function load() {
        return fetch(API + '?t=' + Date.now(), { credentials: 'same-origin', cache: 'no-store' })
            .then(function (response) { return response.json(); })
            .then(function (data) {
                var settings = (data && data.settings) || {};
                apply(settings);
                writeCache(settings);
                document.dispatchEvent(new CustomEvent('site-settings:loaded', { detail: settings }));
                if (window.SiteBoot) window.SiteBoot.done('settings');
                return settings;
            })
            .catch(function () {
                if (window.SiteBoot) window.SiteBoot.done('settings');
                return current;
            });
    }

    window.SiteSettings = {
        apply: apply,
        preview: apply,
        load: load,
        ensureFont: ensureFont,
        findFont: findFont,
        cache: writeCache,
        current: current,
        defaults: DEFAULTS
    };

    var cached = readCache();
    if (cached) apply(cached);
    load();
    /* main.js re-sets the theme variable when it runs — re-apply after it. */
    var reapply = function () { apply(window.SiteSettings.current); };
    document.addEventListener('DOMContentLoaded', reapply);
    window.addEventListener('load', reapply);
    setTimeout(reapply, 400);
    setTimeout(reapply, 1500);
})();
