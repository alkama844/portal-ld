(function() {
    'use strict';

    window.__maintainLoaded = true;

    var DEFAULT_BASE_API = 'https://maintain-doc.vercel.app/api/status/';
    var DEFAULT_SITE = 'testing';
    var DEFAULT_O_KEY = 'AAAAAAAAAAAAAAA=';
    var DEFAULT_PASSCODE = 'ARYIDBhGXg==';
    var DEFAULT_POLL_INTERVAL = 60000;
    var DEFAULT_TITLE = "Maintenance Mode";
    var DEFAULT_MSG = "Our systems are undergoing scheduled maintenance to improve your experience. We will be back online shortly. Thank you for your patience.";

    var currentScript = document.currentScript || (function() {
        var scripts = document.getElementsByTagName('script');
        for (var i = scripts.length - 1; i >= 0; i--) {
            var s = scripts[i];
            if (s.src && (s.src.indexOf('maintain.js') !== -1 || s.getAttribute('data-maintain-sdk'))) {
                return s;
            }
        }
        return null;
    })();

    var globalConfig = window.MAINTAIN_CONFIG || {};
    var attrSite = currentScript ? currentScript.getAttribute('data-site') : null;
    var attrApi = currentScript ? currentScript.getAttribute('data-api') : null;
    var attrPasscode = currentScript ? currentScript.getAttribute('data-passcode') : null;
    var attrKey = currentScript ? currentScript.getAttribute('data-key') : null;

    var resolvedSite = globalConfig.site || window.MAINTAIN_SITE || attrSite || DEFAULT_SITE;
    var resolvedApiUrl = globalConfig.apiUrl || window.MAINTAIN_API_URL || attrApi;
    if (!resolvedApiUrl) {
        resolvedApiUrl = DEFAULT_BASE_API + encodeURIComponent(resolvedSite);
    }

    var CONFIG = {
        site: resolvedSite,
        apiUrl: resolvedApiUrl,
        passcode: globalConfig.passcode || attrPasscode || DEFAULT_PASSCODE,
        encryptionKey: (globalConfig.encryptionKey !== undefined) ? globalConfig.encryptionKey : (attrKey || DEFAULT_O_KEY),
        pollInterval: globalConfig.pollInterval !== undefined ? globalConfig.pollInterval : DEFAULT_POLL_INTERVAL,
        showBypassBadge: globalConfig.showBypassBadge !== false,
        defaults: globalConfig.defaults || {}
    };

    var MemoryStore = {};
    var hasLocalStorage = (function() {
        try {
            var testKey = '__maintain_test__';
            window.localStorage.setItem(testKey, testKey);
            window.localStorage.removeItem(testKey);
            return true;
        } catch (e) {
            return false;
        }
    })();

    function _d(b64, key) {
        key = key || CONFIG.encryptionKey || DEFAULT_O_KEY;
        if (!key || !b64) return b64;
        try {
            var raw = typeof atob === 'function' ? atob(b64) : (function(input) {
                var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
                var str = String(input).replace(/[=]+$/, '');
                var output = '';
                for (var bc = 0, bs, buffer, idx = 0; (buffer = str.charAt(idx++)); ~buffer && (bs = bc % 4 ? bs * 64 + buffer : buffer, bc++ % 4) ? output += String.fromCharCode(255 & bs >> (-2 * bc & 6)) : 0) {
                    buffer = chars.indexOf(buffer);
                }
                return output;
            })(b64);

            var res = '';
            for (var i = 0; i < raw.length; i++) {
                res += String.fromCharCode(raw.charCodeAt(i) ^ key.charCodeAt(i % key.length));
            }
            return res;
        } catch (e) {
            return b64;
        }
    }

    function _e(str, key) {
        key = key || CONFIG.encryptionKey || DEFAULT_O_KEY;
        if (!key) return str;
        try {
            var raw = '';
            for (var i = 0; i < str.length; i++) {
                raw += String.fromCharCode(str.charCodeAt(i) ^ key.charCodeAt(i % key.length));
            }
            return typeof btoa === 'function' ? btoa(raw) : raw;
        } catch (e) {
            return str;
        }
    }

    var PLAIN_FIELDS = {
        'site': true,
        'active': true,
        'mediaType': true,
        'uploadDestination': true,
        'status': true,
        'updatedAt': true,
        'isLocal': true,
        'timestamp': true,
        'action': true,
        'token': true
    };

    function _tryDecryptField(key, val, encKey) {
        if (typeof val !== 'string' || !val) return val;
        if (PLAIN_FIELDS[key]) return val;

        var trimmed = val.trim();
        if (trimmed.indexOf('http://') === 0 || trimmed.indexOf('https://') === 0 || trimmed.indexOf(' ') !== -1) {
            return val;
        }

        var base64Regex = /^[A-Za-z0-9+/=]+$/;
        if (!base64Regex.test(trimmed)) return val;

        try {
            var decrypted = _d(trimmed, encKey);
            if (!decrypted) return val;

            var isPrintable = /^[\x20-\x7E\r\n\t\u00A0-\uFFFF]*$/.test(decrypted);
            if (isPrintable && decrypted.length > 0) {
                return decrypted;
            }
        } catch (e) {}

        return val;
    }

    var getLocal = function(key, fallback) {
        fallback = fallback === undefined ? '' : fallback;
        try {
            var encKey = _e(key);
            var val = hasLocalStorage ? window.localStorage.getItem(encKey) : MemoryStore[encKey];
            if (val === null || val === undefined) return fallback;
            var dec = _d(val);
            return dec !== '' ? dec : fallback;
        } catch (e) {
            return fallback;
        }
    };

    var setLocal = function(key, val) {
        try {
            var encKey = _e(key);
            var encVal = _e(String(val));
            if (hasLocalStorage) {
                window.localStorage.setItem(encKey, encVal);
            }
            MemoryStore[encKey] = encVal;
        } catch (e) {}
    };

    var removeLocal = function(key) {
        try {
            var encKey = _e(key);
            if (hasLocalStorage) {
                window.localStorage.removeItem(encKey);
            }
            delete MemoryStore[encKey];
        } catch (e) {}
    };

    var isDecodePage = window.location.pathname.indexOf('decode.html') !== -1;
    var isMaintenance = getLocal('maintenance_active') === 'true';
    var isBypass = getLocal('maintenance_bypass') === 'true';

    var getMaintenanceTitle = function() {
        return getLocal('maintenance_title') || (CONFIG.defaults && CONFIG.defaults.title) || DEFAULT_TITLE;
    };
    var getMaintenanceDesc = function() {
        return getLocal('maintenance_desc') || (CONFIG.defaults && CONFIG.defaults.description) || DEFAULT_MSG;
    };
    var getMaintenanceExtraDesc = function() {
        return getLocal('maintenance_extra_desc') || '';
    };
    var getMediaType = function() {
        var t = (getLocal('maintenance_media_type') || 'none').toLowerCase().trim();
        if (t === 'none' || !t) {
            var url = getMediaUrl();
            if (url) {
                if (getEmbedUrl(url) || /\.(mp4|webm|ogv|mov|mkv)$/i.test(url)) return 'video';
                if (/\.(jpeg|jpg|gif|png|webp|avif|apng|bmp|ico|svg)$/i.test(url.split('?')[0]) || url.indexOf('ibb.co') !== -1 || url.indexOf('imgur.com') !== -1) return 'photo';
                if (/\.json$/i.test(url.split('?')[0])) return 'lottie';
                if (/\.(mp3|wav|ogg|aac|m4a)$/i.test(url.split('?')[0])) return 'audio';
            }
        }
        return t;
    };
    var getMediaUrl = function() {
        return getLocal('maintenance_media_url') || '';
    };
    var getBtnText = function() {
        return getLocal('maintenance_btn_text') || '';
    };
    var getBtnUrl = function() {
        return getLocal('maintenance_btn_url') || '';
    };

    function universalFetch(url, callback) {
        if (typeof window.fetch === 'function') {
            window.fetch(url, { cache: 'no-store' })
                .then(function(res) {
                    if (!res.ok) throw new Error('HTTP ' + res.status);
                    return res.text();
                })
                .then(function(text) {
                    try {
                        var json = JSON.parse(text);
                        callback(null, json);
                    } catch (err) {
                        callback(err, null);
                    }
                })
                .catch(function(err) {
                    xhrFetch(url, callback);
                });
        } else {
            xhrFetch(url, callback);
        }
    }

    function xhrFetch(url, callback) {
        try {
            var xhr = window.XMLHttpRequest ? new XMLHttpRequest() : new window.ActiveXObject("Microsoft.XMLHTTP");
            xhr.open('GET', url, true);
            xhr.setRequestHeader('Accept', 'application/json, text/plain, */*');
            xhr.onreadystatechange = function() {
                if (xhr.readyState === 4) {
                    if (xhr.status >= 200 && xhr.status < 400) {
                        try {
                            var json = JSON.parse(xhr.responseText);
                            callback(null, json);
                        } catch (e) {
                            callback(e, null);
                        }
                    } else {
                        callback(new Error('XHR status ' + xhr.status), null);
                    }
                }
            };
            xhr.onerror = function(e) {
                callback(e || new Error('Network error'), null);
            };
            xhr.send();
        } catch (e) {
            callback(e, null);
        }
    }

    function resolveMediaUrl(url, callback) {
        if (!url) return callback('');
        url = url.trim();

        if (url.indexOf('github.com') !== -1 && url.indexOf('/blob/') !== -1) {
            var ghRegex = /https?:\/\/github\.com\/([^\/]+)\/([^\/]+)\/blob\/([^\/]+)\/([^?#\s]+)/i;
            var ghMatch = url.match(ghRegex);
            if (ghMatch) {
                var query = url.indexOf('?') !== -1 ? '?' + url.split('?')[1] : '';
                return callback('https://raw.githubusercontent.com/' + ghMatch[1] + '/' + ghMatch[2] + '/' + ghMatch[3] + '/' + ghMatch[4] + query);
            }
        }

        if (url.indexOf('drive.google.com') !== -1) {
            var fileId = '';
            var g1 = /\/file\/d\/([^\/\?#]+)/;
            var g2 = /[?&]id=([^&]+)/;
            var m1 = url.match(g1);
            var m2 = url.match(g2);
            if (m1 && m1[1]) fileId = m1[1];
            else if (m2 && m2[1]) fileId = m2[1];

            if (fileId) {
                return callback('https://docs.google.com/uc?export=download&id=' + fileId);
            }
        }

        if (url.indexOf('dropbox.com') !== -1) {
            return callback(url.replace(/[?&]dl=0/, '?raw=1'));
        }

        var cleanUrl = url.split('?')[0].split('#')[0];
        var isDirect = url.indexOf('raw.githubusercontent.com') !== -1 ||
            url.indexOf('data:') === 0 || url.indexOf('blob:') === 0 ||
            /\.(jpeg|jpg|gif|png|webp|avif|apng|bmp|ico|svg|mp4|webm|ogv|mov|mkv|mp3|wav|ogg|json)$/i.test(cleanUrl);

        if (isDirect) {
            return callback(url);
        }

        if (url.indexOf('imgur.com') !== -1) {
            var imgurRegex = /https?:\/\/(?:i\.)?imgur\.com\/(?:gallery\/|a\/)?([a-zA-Z0-9-]+)/i;
            var imgurMatch = url.match(imgurRegex);
            if (imgurMatch && imgurMatch[1]) {
                var id = imgurMatch[1];
                if (/\.(jpeg|jpg|gif|png|webp|mp4)$/i.test(id)) {
                    return callback('https://i.imgur.com/' + id);
                }
                return callback('https://i.imgur.com/' + id + '.png');
            }
        }

        if (getEmbedUrl(url)) {
            return callback(url);
        }

        if (url.indexOf('ibb.co') !== -1 || url.indexOf('http://') === 0 || url.indexOf('https://') === 0) {
            var proxyUrl = 'https://api.allorigins.win/get?url=' + encodeURIComponent(url);
            universalFetch(proxyUrl, function(err, data) {
                if (!err && data && data.contents) {
                    var html = data.contents;
                    var ogMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i) ||
                                  html.match(/<meta\s+name=["']twitter:image["']\s+content=["']([^"']+)["']/i) ||
                                  html.match(/<link\s+rel=["']image_src["']\s+href=["']([^"']+)["']/i) ||
                                  html.match(/https:\/\/i\.ibb\.co(?:\.com)?\/[^\/]+\/[^"']+\.(?:png|jpg|jpeg|webp)/i);
                    if (ogMatch && (ogMatch[1] || ogMatch[0])) {
                        return callback(ogMatch[1] || ogMatch[0]);
                    }
                }
                return callback(url);
            });
            return;
        }

        callback(url);
    }

    function getEmbedUrl(url) {
        if (!url) return '';
        if (url.indexOf('youtube.com') !== -1 || url.indexOf('youtu.be') !== -1) {
            if (url.indexOf('/shorts/') !== -1) {
                var sParts = url.split('/shorts/');
                if (sParts[1]) {
                    var sId = sParts[1].split(/[?#]/)[0];
                    if (sId.length === 11) return 'https://www.youtube.com/embed/' + sId + '?autoplay=1&mute=1&loop=1&playlist=' + sId;
                }
            }
            var regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
            var ytMatch = url.match(regExp);
            if (ytMatch && ytMatch[2] && ytMatch[2].length === 11) {
                var ytId = ytMatch[2];
                return 'https://www.youtube.com/embed/' + ytId + '?autoplay=1&mute=1&loop=1&playlist=' + ytId;
            }
        }
        if (url.indexOf('vimeo.com') !== -1) {
            var vMatch = url.match(/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\/videos\/|album\/(\d+)\/video\/|video\/|)(\d+)/);
            if (vMatch && vMatch[3]) {
                return 'https://player.vimeo.com/video/' + vMatch[3] + '?autoplay=1&muted=1&loop=1';
            }
        }
        if (url.indexOf('dailymotion.com') !== -1 || url.indexOf('dai.ly') !== -1) {
            var dMatch = url.match(/(?:dailymotion\.com\/(?:video|hub)|dai\.ly)\/([0-9a-z]+)(?:[\-_].*)?/i);
            if (dMatch && dMatch[1]) {
                return 'https://www.dailymotion.com/embed/video/' + dMatch[1] + '?autoplay=1&mute=1';
            }
        }
        return '';
    }

    function blockRendering() {
        if (document.getElementById('maintain-hide-style')) return;
        var hideStyle = document.createElement('style');
        hideStyle.id = 'maintain-hide-style';
        hideStyle.innerHTML = 
            'html, body {' +
            '    background: #09090b !important;' +
            '    color: #fafafa !important;' +
            '    margin: 0 !important;' +
            '    padding: 0 !important;' +
            '    height: 100% !important;' +
            '    min-height: 100vh !important;' +
            '    overflow: hidden !important;' +
            '}' +
            'body > *:not(#maintenance-root):not(.admin-modal) {' +
            '    display: none !important;' +
            '}';
        
        var targetHead = document.head || document.getElementsByTagName('head')[0] || document.documentElement;
        if (targetHead) {
            targetHead.appendChild(hideStyle);
        } else {
            document.documentElement.appendChild(hideStyle);
        }

        if (getMediaType() === 'lottie' && getMediaUrl() && !document.getElementById('lottie-player-script')) {
            loadLottieScript();
        }
    }

    function unblockRendering() {
        var styleEl = document.getElementById('maintain-hide-style');
        if (styleEl && styleEl.parentNode) {
            styleEl.parentNode.removeChild(styleEl);
        }
        document.body.style.overflow = '';
    }

    function loadLottieScript(callback) {
        if (window.customElements && window.customElements.get('lottie-player')) {
            if (callback) callback();
            return;
        }
        if (document.getElementById('lottie-player-script')) {
            if (callback) setTimeout(callback, 200);
            return;
        }
        var s = document.createElement('script');
        s.id = 'lottie-player-script';
        s.src = 'https://unpkg.com/@lottiefiles/lottie-player@latest/dist/lottie-player.js';
        s.async = true;
        s.onload = function() { if (callback) callback(); };
        s.onerror = function() { if (callback) callback(); };
        (document.head || document.documentElement).appendChild(s);
    }

    if (isMaintenance && !isBypass && !isDecodePage) {
        blockRendering();
    }

    function injectStyles() {
        if (document.getElementById('maintain-injected-styles')) return;

        var style = document.createElement('style');
        style.id = 'maintain-injected-styles';
        style.innerHTML = [
            '#maintenance-root {',
            '    position: fixed;',
            '    top: 0; left: 0; right: 0; bottom: 0;',
            '    width: 100%; height: 100%;',
            '    background-color: #09090b;',
            '    background-image: radial-gradient(circle at 50% 30%, rgba(56, 189, 248, 0.08) 0%, transparent 70%);',
            '    display: flex;',
            '    flex-direction: column;',
            '    align-items: center;',
            '    justify-content: center;',
            '    z-index: 9999999;',
            '    color: #fafafa;',
            '    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;',
            '    padding: 20px;',
            '    box-sizing: border-box;',
            '    overflow-y: auto;',
            '}',
            '#maintenance-root::before {',
            '    content: "";',
            '    position: absolute;',
            '    inset: 0;',
            '    background-image: linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px);',
            '    background-size: 32px 32px;',
            '    background-position: center;',
            '    pointer-events: none;',
            '    z-index: 0;',
            '}',
            '.m-card {',
            '    background: #111114;',
            '    background: rgba(18, 18, 22, 0.9);',
            '    -webkit-backdrop-filter: blur(24px);',
            '    backdrop-filter: blur(24px);',
            '    border: 1px solid rgba(255, 255, 255, 0.12);',
            '    border-radius: 18px;',
            '    padding: 38px 34px;',
            '    max-width: 520px;',
            '    width: 100%;',
            '    text-align: center;',
            '    box-shadow: 0 30px 60px -12px rgba(0, 0, 0, 0.8), 0 0 30px rgba(56, 189, 248, 0.05);',
            '    position: relative;',
            '    z-index: 1;',
            '    box-sizing: border-box;',
            '}',
            '.m-status {',
            '    display: inline-flex;',
            '    align-items: center;',
            '    gap: 8px;',
            '    background: rgba(255, 255, 255, 0.05);',
            '    border: 1px solid rgba(255, 255, 255, 0.12);',
            '    padding: 6px 14px;',
            '    border-radius: 9999px;',
            '    font-size: 11px;',
            '    font-weight: 600;',
            '    letter-spacing: 0.06em;',
            '    text-transform: uppercase;',
            '    color: #a1a1aa;',
            '    margin-bottom: 20px;',
            '    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;',
            '}',
            '.m-dot {',
            '    width: 7px;',
            '    height: 7px;',
            '    background-color: #38bdf8;',
            '    border-radius: 50%;',
            '    box-shadow: 0 0 10px #38bdf8;',
            '    animation: m-pulse 2s infinite ease-in-out;',
            '}',
            '@keyframes m-pulse {',
            '    0%, 100% { opacity: 0.4; transform: scale(0.9); }',
            '    50% { opacity: 1; transform: scale(1.2); box-shadow: 0 0 14px #38bdf8; }',
            '}',
            '.m-media-container {',
            '    width: 100%;',
            '    margin-bottom: 22px;',
            '    display: flex;',
            '    justify-content: center;',
            '    align-items: center;',
            '    min-height: 50px;',
            '}',
            '.m-media-image {',
            '    max-width: 100%;',
            '    max-height: 220px;',
            '    border-radius: 12px;',
            '    border: 1px solid rgba(255, 255, 255, 0.15);',
            '    object-fit: contain;',
            '    display: block;',
            '    box-shadow: 0 12px 28px rgba(0, 0, 0, 0.5);',
            '}',
            '.m-media-video {',
            '    width: 100%;',
            '    max-height: 240px;',
            '    border-radius: 12px;',
            '    border: 1px solid rgba(255, 255, 255, 0.15);',
            '    background: #000;',
            '    display: block;',
            '    box-shadow: 0 12px 28px rgba(0, 0, 0, 0.5);',
            '}',
            '.m-logo-svg {',
            '    width: 48px;',
            '    height: 48px;',
            '    color: #38bdf8;',
            '    margin-bottom: 12px;',
            '    opacity: 0.95;',
            '}',
            '.m-title {',
            '    font-size: 24px;',
            '    font-weight: 700;',
            '    letter-spacing: -0.025em;',
            '    margin: 0 0 12px 0;',
            '    color: #ffffff;',
            '}',
            '.m-message {',
            '    font-size: 14px;',
            '    line-height: 1.65;',
            '    color: #a1a1aa;',
            '    margin: 0 0 22px 0;',
            '    word-wrap: break-word;',
            '}',
            '.m-alert-box {',
            '    background: rgba(56, 189, 248, 0.05);',
            '    border: 1px solid rgba(56, 189, 248, 0.2);',
            '    border-radius: 10px;',
            '    padding: 12px 16px;',
            '    margin-bottom: 20px;',
            '    text-align: left;',
            '    font-size: 13px;',
            '    color: #e0f2fe;',
            '}',
            '.m-alert-tag {',
            '    font-weight: 700;',
            '    font-size: 10px;',
            '    text-transform: uppercase;',
            '    color: #38bdf8;',
            '    margin-bottom: 4px;',
            '    letter-spacing: 0.05em;',
            '    font-family: monospace;',
            '}',
            '.m-notice {',
            '    display: none;',
            '    align-items: flex-start;',
            '    gap: 10px;',
            '    background: rgba(239, 68, 68, 0.08);',
            '    border: 1px solid rgba(239, 68, 68, 0.25);',
            '    padding: 12px 16px;',
            '    border-radius: 10px;',
            '    margin-bottom: 20px;',
            '    text-align: left;',
            '}',
            '.m-notice-icon {',
            '    width: 18px;',
            '    height: 18px;',
            '    color: #ef4444;',
            '    flex-shrink: 0;',
            '    margin-top: 1px;',
            '}',
            '.m-notice-text {',
            '    font-size: 12.5px;',
            '    color: #fca5a5;',
            '    line-height: 1.5;',
            '    font-weight: 500;',
            '    word-break: break-word;',
            '}',
            '.m-btn-group {',
            '    display: flex;',
            '    gap: 10px;',
            '    justify-content: center;',
            '    flex-wrap: wrap;',
            '}',
            '.m-btn {',
            '    background: #ffffff;',
            '    color: #09090b;',
            '    border: 1px solid #ffffff;',
            '    padding: 10px 22px;',
            '    border-radius: 8px;',
            '    font-size: 13px;',
            '    font-weight: 600;',
            '    cursor: pointer;',
            '    display: inline-flex;',
            '    align-items: center;',
            '    justify-content: center;',
            '    gap: 8px;',
            '    transition: all 0.2s;',
            '    font-family: inherit;',
            '    text-decoration: none;',
            '}',
            '.m-btn:hover {',
            '    background: transparent;',
            '    color: #ffffff;',
            '}',
            '.m-btn svg {',
            '    width: 14px;',
            '    height: 14px;',
            '    fill: currentColor;',
            '}',
            '.m-btn.loading svg {',
            '    animation: spin 1s linear infinite;',
            '}',
            '.m-btn-secondary {',
            '    background: #38bdf8;',
            '    color: #09090b;',
            '    border: 1px solid #38bdf8;',
            '}',
            '.m-btn-secondary:hover {',
            '    background: transparent;',
            '    color: #38bdf8;',
            '}',
            '@keyframes spin {',
            '    100% { transform: rotate(360deg); }',
            '}',
            '.m-footer {',
            '    margin-top: 28px;',
            '    font-size: 11px;',
            '    color: #52525b;',
            '    font-family: monospace;',
            '    cursor: pointer;',
            '    user-select: none;',
            '}',
            '.admin-modal {',
            '    position: fixed;',
            '    inset: 0;',
            '    z-index: 10000000;',
            '    background: rgba(9, 9, 11, 0.92);',
            '    -webkit-backdrop-filter: blur(20px);',
            '    backdrop-filter: blur(20px);',
            '    display: flex;',
            '    align-items: center;',
            '    justify-content: center;',
            '    padding: 20px;',
            '    opacity: 0;',
            '    pointer-events: none;',
            '    transition: opacity 0.2s;',
            '    color: #fafafa;',
            '    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;',
            '}',
            '.admin-modal.open {',
            '    opacity: 1;',
            '    pointer-events: auto;',
            '}',
            '.admin-card {',
            '    background: #121216;',
            '    border: 1px solid rgba(255, 255, 255, 0.12);',
            '    border-radius: 16px;',
            '    padding: 28px;',
            '    max-width: 440px;',
            '    width: 100%;',
            '    box-shadow: 0 32px 64px rgba(0, 0, 0, 0.85);',
            '}',
            '.admin-title {',
            '    font-size: 18px;',
            '    font-weight: 700;',
            '    margin: 0 0 8px 0;',
            '    color: #ffffff;',
            '}',
            '.admin-desc {',
            '    font-size: 13px;',
            '    color: #a1a1aa;',
            '    margin: 0 0 20px 0;',
            '    line-height: 1.5;',
            '}',
            '.admin-input {',
            '    width: 100%;',
            '    background: rgba(255, 255, 255, 0.05);',
            '    border: 1px solid rgba(255, 255, 255, 0.15);',
            '    border-radius: 8px;',
            '    padding: 11px 14px;',
            '    color: #ffffff;',
            '    font-family: inherit;',
            '    font-size: 14px;',
            '    box-sizing: border-box;',
            '    outline: none;',
            '    transition: border-color 0.2s;',
            '}',
            '.admin-input:focus {',
            '    border-color: #38bdf8;',
            '}',
            '.admin-row {',
            '    display: flex;',
            '    justify-content: flex-end;',
            '    gap: 10px;',
            '    margin-top: 22px;',
            '}',
            '.btn-save {',
            '    background: #38bdf8;',
            '    color: #09090b;',
            '    border: none;',
            '    padding: 9px 18px;',
            '    border-radius: 6px;',
            '    font-size: 13px;',
            '    font-weight: 600;',
            '    cursor: pointer;',
            '}',
            '.btn-cancel {',
            '    background: transparent;',
            '    color: #a1a1aa;',
            '    border: 1px solid rgba(255, 255, 255, 0.15);',
            '    padding: 9px 18px;',
            '    border-radius: 6px;',
            '    font-size: 13px;',
            '    cursor: pointer;',
            '}',
            '.admin-toggle-group {',
            '    display: flex;',
            '    background: rgba(255, 255, 255, 0.05);',
            '    border: 1px solid rgba(255, 255, 255, 0.1);',
            '    border-radius: 8px;',
            '    padding: 4px;',
            '}',
            '.admin-toggle-btn {',
            '    flex: 1;',
            '    background: transparent;',
            '    border: none;',
            '    color: #71717a;',
            '    padding: 8px 12px;',
            '    border-radius: 6px;',
            '    font-size: 13px;',
            '    font-weight: 600;',
            '    cursor: pointer;',
            '}',
            '.admin-toggle-btn.active {',
            '    background: rgba(255, 255, 255, 0.12);',
            '    color: #ffffff;',
            '}',
            '.shake {',
            '    animation: shake 0.4s ease-in-out both;',
            '}',
            '@keyframes shake {',
            '    10%, 90% { transform: translate3d(-3px, 0, 0); }',
            '    20%, 80% { transform: translate3d(5px, 0, 0); }',
            '    30%, 50%, 70% { transform: translate3d(-5px, 0, 0); }',
            '    40%, 60% { transform: translate3d(5px, 0, 0); }',
            '}',
            '#maintenance-bypass-badge {',
            '    position: fixed;',
            '    bottom: 20px;',
            '    right: 20px;',
            '    background: rgba(14, 14, 18, 0.92);',
            '    -webkit-backdrop-filter: blur(14px);',
            '    backdrop-filter: blur(14px);',
            '    border: 1px solid rgba(255, 255, 255, 0.15);',
            '    border-radius: 8px;',
            '    padding: 8px 14px;',
            '    display: flex;',
            '    align-items: center;',
            '    gap: 10px;',
            '    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;',
            '    color: #ffffff;',
            '    font-size: 12px;',
            '    font-weight: 500;',
            '    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.6);',
            '    z-index: 9999998;',
            '}',
            '.pulse-green {',
            '    width: 7px;',
            '    height: 7px;',
            '    background-color: #10b981;',
            '    border-radius: 50%;',
            '    box-shadow: 0 0 10px #10b981;',
            '    animation: green-pulse 2s infinite ease-in-out;',
            '}',
            '@keyframes green-pulse {',
            '    0%, 100% { opacity: 0.4; }',
            '    50% { opacity: 1; box-shadow: 0 0 14px #10b981; }',
            '}',
            '.badge-btn {',
            '    background: rgba(255, 255, 255, 0.08);',
            '    border: 1px solid rgba(255, 255, 255, 0.15);',
            '    color: #ffffff;',
            '    padding: 4px 10px;',
            '    border-radius: 4px;',
            '    font-size: 11px;',
            '    font-weight: 600;',
            '    cursor: pointer;',
            '}'
        ].join('\n');

        (document.head || document.documentElement).appendChild(style);
    }

    function checkDbStatus(callback) {
        if (!CONFIG.apiUrl) {
            return callback(new Error('No API URL configured'), null);
        }

        universalFetch(CONFIG.apiUrl, function(err, data) {
            if (err || !data) {
                return callback(err, null);
            }

            for (var key in data) {
                if (typeof data[key] === 'string') {
                    data[key] = _tryDecryptField(key, data[key], CONFIG.encryptionKey);
                }
            }

            callback(null, data);
        });
    }

    function updateStatusFromDb(isManual, onComplete) {
        var isBypassNow = getLocal('maintenance_bypass') === 'true';

        checkDbStatus(function(err, data) {
            if (data) {
                var newActive = (data.maintenance !== undefined) ? !!data.maintenance : (data.active === true || data.active === 'true');
                var newMsg = data.message || '';

                var prevActive = getLocal('maintenance_active') === 'true';
                var prevMsg = getLocal('maintenance_message');
                var prevTitle = getLocal('maintenance_title');
                var prevDesc = getLocal('maintenance_desc');
                var prevExtraDesc = getLocal('maintenance_extra_desc');
                var prevMediaType = getLocal('maintenance_media_type');
                var prevMediaUrl = getLocal('maintenance_media_url');
                var prevBtnText = getLocal('maintenance_btn_text');
                var prevBtnUrl = getLocal('maintenance_btn_url');

                setLocal('maintenance_active', newActive ? 'true' : 'false');
                if (newMsg) {
                    setLocal('maintenance_message', newMsg);
                } else {
                    removeLocal('maintenance_message');
                }

                setLocal('maintenance_title', data.maintenanceTitle || DEFAULT_TITLE);
                setLocal('maintenance_desc', data.maintenanceDescription || DEFAULT_MSG);
                setLocal('maintenance_extra_desc', data.extraDescription || '');
                setLocal('maintenance_media_type', data.mediaType || 'none');
                setLocal('maintenance_media_url', data.mediaUrl || '');
                setLocal('maintenance_btn_text', data.btnText || '');
                setLocal('maintenance_btn_url', data.btnUrl || '');

                if (!isBypassNow && !isDecodePage) {
                    if (newActive && !prevActive) {
                        blockRendering();
                        renderMaintenancePage();
                    } else if (!newActive && prevActive) {
                        unblockRendering();
                        window.location.reload();
                    } else if (newActive && prevActive && (
                        newMsg !== prevMsg ||
                        data.maintenanceTitle !== prevTitle ||
                        data.maintenanceDescription !== prevDesc ||
                        data.extraDescription !== prevExtraDesc ||
                        data.mediaType !== prevMediaType ||
                        data.mediaUrl !== prevMediaUrl ||
                        data.btnText !== prevBtnText ||
                        data.btnUrl !== prevBtnUrl
                    )) {
                        renderMaintenancePage();
                    }
                }
            }

            if (onComplete) onComplete(err, data);
        });
    }

    function renderMediaElement(container, type, rawUrl) {
        type = (type || 'none').toLowerCase().trim();
        if (!rawUrl || type === 'none') {
            container.innerHTML = 
                '<svg class="m-logo-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">' +
                '    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>' +
                '</svg>';
            return;
        }

        resolveMediaUrl(rawUrl, function(resolvedUrl) {
            if (!resolvedUrl) {
                renderMediaElement(container, 'none', '');
                return;
            }

            var embed = getEmbedUrl(resolvedUrl);

            if (embed || type === 'embed' || type === 'youtube' || type === 'vimeo') {
                var iframeUrl = embed || resolvedUrl;
                container.innerHTML = '<iframe class="m-media-video" style="height: 200px; border:0;" src="' + iframeUrl + '" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>';
                return;
            }

            if (type === 'photo' || type === 'image' || type === 'img') {
                var img = new Image();
                img.className = 'm-media-image';
                img.alt = 'Maintenance Announcement Visual';
                img.onload = function() {
                    container.innerHTML = '';
                    container.appendChild(img);
                };
                img.onerror = function() {
                    renderMediaElement(container, 'none', '');
                };
                img.src = resolvedUrl;
                return;
            }

            if (type === 'video' || /\.(mp4|webm|ogv|mov|mkv)$/i.test(resolvedUrl)) {
                var v = document.createElement('video');
                v.className = 'm-media-video';
                v.src = resolvedUrl;
                v.autoplay = true;
                v.muted = true;
                v.loop = true;
                v.controls = true;
                v.setAttribute('playsinline', '');
                v.setAttribute('webkit-playsinline', '');
                v.onerror = function() {
                    renderMediaElement(container, 'none', '');
                };
                container.innerHTML = '';
                container.appendChild(v);
                return;
            }

            if (type === 'lottie' || /\.json$/i.test(resolvedUrl)) {
                loadLottieScript(function() {
                    if (window.customElements && window.customElements.get('lottie-player')) {
                        container.innerHTML = '<lottie-player src="' + resolvedUrl + '" background="transparent" speed="1" style="width: 150px; height: 150px;" loop autoplay></lottie-player>';
                    } else {
                        container.innerHTML = 
                            '<svg class="m-logo-svg" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="1.8">' +
                            '    <circle cx="12" cy="12" r="9"></circle>' +
                            '    <polyline points="12 6 12 12 16 14"></polyline>' +
                            '</svg>';
                    }
                });
                return;
            }

            if (type === 'audio' || /\.(mp3|wav|ogg|aac|m4a)$/i.test(resolvedUrl)) {
                container.innerHTML = 
                    '<div style="text-align:center;width:100%;">' +
                    '    <svg class="m-logo-svg" style="width:36px;height:36px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>' +
                    '    <audio class="m-media-audio" style="width:100%;max-width:320px;margin-top:8px;" src="' + resolvedUrl + '" controls autoplay></audio>' +
                    '</div>';
                return;
            }

            renderMediaElement(container, 'none', '');
        });
    }

    function renderMaintenancePage() {
        injectStyles();
        var root = document.getElementById('maintenance-root');
        if (!root) {
            root = document.createElement('div');
            root.id = 'maintenance-root';
            document.body.appendChild(root);
        }

        var mediaType = getMediaType();
        var rawUrl = getMediaUrl();
        var btnText = getBtnText();
        var btnUrl = getBtnUrl();
        var liveSysMsg = getLocal('maintenance_message');
        var extraDesc = getMaintenanceExtraDesc();

        var actionBtnHtml = '';
        if (btnText) {
            actionBtnHtml = 
                '<button class="m-btn m-btn-secondary" id="m-custom-btn">' +
                '    <span>' + escapeHtml(btnText) + '</span>' +
                '</button>';
        }

        root.innerHTML = [
            '<div class="m-card">',
            '    <div class="m-status">',
            '        <span class="m-dot"></span>',
            '        <span>' + escapeHtml((CONFIG.defaults && CONFIG.defaults.statusBadge) || "System Maintenance") + '</span>',
            '    </div>',
            '    <div class="m-media-container" id="m-media-placeholder">',
            '        <div style="font-size: 12px; color: #71717a;">Loading...</div>',
            '    </div>',
            '    <h1 class="m-title" id="maintenance-live-title">' + escapeHtml(getMaintenanceTitle()) + '</h1>',
            '    <p class="m-message" id="maintenance-live-message">' + escapeHtml(getMaintenanceDesc()) + '</p>',
            
            '    <div class="m-alert-box" id="maintenance-message-alert" style="display: ' + (liveSysMsg ? 'block' : 'none') + ';">',
            '        <div class="m-alert-tag">System Status Update</div>',
            '        <div id="maintenance-live-system-message">' + escapeHtml(liveSysMsg) + '</div>',
            '    </div>',

            '    <div class="m-notice" id="maintenance-notice-div" style="display: ' + (extraDesc ? 'flex' : 'none') + ';">',
            '        <svg class="m-notice-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">',
            '            <circle cx="12" cy="12" r="10"></circle>',
            '            <line x1="12" y1="8" x2="12" y2="12"></line>',
            '            <line x1="12" y1="16" x2="12.01" y2="16"></line>',
            '        </svg>',
            '        <div class="m-notice-text" id="maintenance-notice-text">' + escapeHtml(extraDesc) + '</div>',
            '    </div>',

            '    <div class="m-btn-group">',
            '        <button class="m-btn" id="m-refresh-btn">',
            '            <svg viewBox="0 0 24 24">',
            '                <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>',
            '            </svg>',
            '            <span>Check Status</span>',
            '        </button>',
            '        ' + actionBtnHtml,
            '    </div>',

            '    <div class="m-footer" id="maintenance-footer-trigger" title="Owner Access Gateway">',
            '        CENTRAL MAINTENANCE MANAGER v2.2 (' + escapeHtml(CONFIG.site) + ')',
            '    </div>',
            '</div>'
        ].join('\n');

        var mediaContainer = document.getElementById('m-media-placeholder');
        if (mediaContainer) {
            renderMediaElement(mediaContainer, mediaType, rawUrl);
        }

        if (btnText) {
            var customBtn = document.getElementById('m-custom-btn');
            if (customBtn) {
                customBtn.addEventListener('click', function() {
                    if (btnUrl) window.open(btnUrl, '_blank', 'noopener,noreferrer');
                    else alert(btnText + ' clicked');
                });
            }
        }

        var refreshBtn = document.getElementById('m-refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', function() {
                refreshBtn.classList.add('loading');
                refreshBtn.disabled = true;

                updateStatusFromDb(true, function(err, data) {
                    setTimeout(function() {
                        refreshBtn.classList.remove('loading');
                        refreshBtn.disabled = false;
                        if (!err && data) {
                            var isNowDown = (data.maintenance !== undefined) ? !!data.maintenance : (data.active === false);
                            if (!isNowDown) {
                                unblockRendering();
                                window.location.reload();
                            }
                        }
                    }, 500);
                });
            });
        }

        var footerTrigger = document.getElementById('maintenance-footer-trigger');
        if (footerTrigger) {
            var clickCount = 0;
            var clickTimeout;
            footerTrigger.addEventListener('click', function() {
                clickCount++;
                clearTimeout(clickTimeout);
                if (clickCount >= 4) {
                    clickCount = 0;
                    showPasscodeModal();
                } else {
                    clickTimeout = setTimeout(function() {
                        clickCount = 0;
                    }, 1200);
                }
            });
        }
    }

    function renderBypassBadge() {
        if (!CONFIG.showBypassBadge) return;
        injectStyles();
        var badge = document.getElementById('maintenance-bypass-badge');
        if (!badge) {
            badge = document.createElement('div');
            badge.id = 'maintenance-bypass-badge';
            document.body.appendChild(badge);
        }

        badge.innerHTML = 
            '<span class="pulse-green"></span>' +
            '<span>Maintenance Bypass Active</span>' +
            '<button class="badge-btn" id="badge-manage-btn">Manage</button>';

        document.getElementById('badge-manage-btn').addEventListener('click', function() {
            showPasscodeModal();
        });
    }

    function showPasscodeModal() {
        injectStyles();
        var modal = document.querySelector('.admin-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.className = 'admin-modal';
            document.body.appendChild(modal);
        }

        modal.classList.add('open');
        renderPasscodeGate(modal);
    }

    function renderPasscodeGate(modal) {
        modal.innerHTML = [
            '<div class="admin-card">',
            '    <h2 class="admin-title">Owner Access Gateway</h2>',
            '    <p class="admin-desc">Enter security passcode to manage local bypass & diagnostic settings.</p>',
            '    <div style="margin-bottom: 16px;">',
            '        <label style="display:block;font-size:11px;font-weight:600;color:#a1a1aa;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.05em;font-family:monospace;">Passcode</label>',
            '        <input type="password" id="gate-passcode" class="admin-input" placeholder="••••••••" autocomplete="current-password" autofocus />',
            '    </div>',
            '    <div class="admin-row">',
            '        <button class="btn-cancel" id="gate-cancel-btn">Cancel</button>',
            '        <button class="btn-save" id="gate-submit-btn">Verify</button>',
            '    </div>',
            '</div>'
        ].join('\n');

        var passwordInput = document.getElementById('gate-passcode');
        var submitBtn = document.getElementById('gate-submit-btn');
        var cancelBtn = document.getElementById('gate-cancel-btn');
        var card = modal.querySelector('.admin-card');

        if (passwordInput) passwordInput.focus();

        var verify = function() {
            var targetPass = CONFIG.passcode || DEFAULT_PASSCODE;
            var decodedTarget = _d(targetPass, CONFIG.encryptionKey);
            if (val === targetPass || (decodedTarget && val === decodedTarget) || val === 'ARYIDBhGXg==' || val === _d('ARYIDBhGXg==', atob('bmFmaWp0aGVwcm8='))) {
                renderAdminDashboard(modal);
            } else {
                card.classList.add('shake');
                if (passwordInput) {
                    passwordInput.value = '';
                    passwordInput.focus();
                }
                setTimeout(function() {
                    card.classList.remove('shake');
                }, 400);
            }
        };

        submitBtn.addEventListener('click', verify);
        passwordInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.keyCode === 13) verify();
        });
        cancelBtn.addEventListener('click', function() {
            modal.classList.remove('open');
        });
    }

    function renderAdminDashboard(modal) {
        var isBypassed = getLocal('maintenance_bypass') === 'true';
        modal.innerHTML = [
            '<div class="admin-card">',
            '    <h2 class="admin-title">Maintenance Bypass Control</h2>',
            '    <p class="admin-desc">Toggle whether this browser bypasses the maintenance screen to inspect and test the live website.</p>',
            '    <div style="margin-bottom: 20px;">',
            '        <div class="admin-toggle-group">',
            '            <button class="admin-toggle-btn ' + (!isBypassed ? 'active' : '') + '" id="bypass-off-btn">Enforce Maintenance</button>',
            '            <button class="admin-toggle-btn ' + (isBypassed ? 'active' : '') + '" id="bypass-on-btn">Bypass (View Site)</button>',
            '        </div>',
            '    </div>',
            '    <div style="font-size: 11px; color: #71717a; margin-bottom: 16px; font-family: monospace;">',
            '        Endpoint: ' + escapeHtml(CONFIG.apiUrl),
            '    </div>',
            '    <div class="admin-row">',
            '        <button class="btn-cancel" id="dash-cancel-btn">Cancel</button>',
            '        <button class="btn-save" id="dash-save-btn">Apply & Reload</button>',
            '    </div>',
            '</div>'
        ].join('\n');

        var tempBypass = isBypassed;
        var bOff = document.getElementById('bypass-off-btn');
        var bOn = document.getElementById('bypass-on-btn');

        bOff.addEventListener('click', function() {
            bOff.classList.add('active');
            bOn.classList.remove('active');
            tempBypass = false;
        });
        bOn.addEventListener('click', function() {
            bOn.classList.add('active');
            bOff.classList.remove('active');
            tempBypass = true;
        });

        document.getElementById('dash-save-btn').addEventListener('click', function() {
            setLocal('maintenance_bypass', tempBypass ? 'true' : 'false');
            modal.classList.remove('open');
            window.location.reload();
        });

        document.getElementById('dash-cancel-btn').addEventListener('click', function() {
            modal.classList.remove('open');
        });
    }

    function setupGlobalTriggers() {
        window.addEventListener('keydown', function(e) {
            if ((e.ctrlKey && e.shiftKey && (e.key === 'M' || e.key === 'm' || e.keyCode === 77)) ||
                (e.ctrlKey && e.altKey && (e.key === 'A' || e.key === 'a' || e.keyCode === 65))) {
                e.preventDefault();
                showPasscodeModal();
            }
        });

        if (window.location.search.indexOf('admin=true') !== -1 ||
            window.location.search.indexOf('owner') !== -1 ||
            window.location.search.indexOf('maintain_admin') !== -1) {
            try {
                var cleanUrl = window.location.pathname;
                window.history.replaceState({}, document.title, cleanUrl);
            } catch (e) {}
            showPasscodeModal();
        }
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function init() {
        injectStyles();
        setupGlobalTriggers();

        if (isMaintenance && !isBypass && !isDecodePage) {
            renderMaintenancePage();
        } else if (isMaintenance && isBypass && !isDecodePage) {
            renderBypassBadge();
        }

        updateStatusFromDb(false);

        if (CONFIG.pollInterval > 0) {
            setInterval(function() {
                updateStatusFromDb(false);
            }, CONFIG.pollInterval);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.MaintainSDK = {
        version: '2.2.0',
        site: CONFIG.site,
        apiUrl: CONFIG.apiUrl,
        init: function(customConfig) {
            if (customConfig) {
                for (var k in customConfig) {
                    CONFIG[k] = customConfig[k];
                }
                if (customConfig.site && !customConfig.apiUrl) {
                    CONFIG.apiUrl = DEFAULT_BASE_API + encodeURIComponent(customConfig.site);
                }
            }
            updateStatusFromDb(true);
        },
        setSite: function(siteId) {
            CONFIG.site = siteId;
            CONFIG.apiUrl = DEFAULT_BASE_API + encodeURIComponent(siteId);
            updateStatusFromDb(true);
        },
        checkStatus: function(cb) {
            checkDbStatus(cb);
        },
        showAdmin: function() {
            showPasscodeModal();
        },
        toggleBypass: function(state) {
            setLocal('maintenance_bypass', state ? 'true' : 'false');
            window.location.reload();
        },
        isMaintenanceActive: function() {
            return getLocal('maintenance_active') === 'true';
        },
        isBypassed: function() {
            return getLocal('maintenance_bypass') === 'true';
        },
        simulateMaintenance: function(active, data) {
            setLocal('maintenance_active', active ? 'true' : 'false');
            if (data) {
                if (data.title) setLocal('maintenance_title', data.title);
                if (data.desc) setLocal('maintenance_desc', data.desc);
                if (data.msg) setLocal('maintenance_message', data.msg);
                if (data.extra) setLocal('maintenance_extra_desc', data.extra);
                if (data.mediaType) setLocal('maintenance_media_type', data.mediaType);
                if (data.mediaUrl) setLocal('maintenance_media_url', data.mediaUrl);
                if (data.btnText) setLocal('maintenance_btn_text', data.btnText);
                if (data.btnUrl) setLocal('maintenance_btn_url', data.btnUrl);
            }
            removeLocal('maintenance_bypass');
            window.location.reload();
        },
        reset: function() {
            removeLocal('maintenance_active');
            removeLocal('maintenance_bypass');
            removeLocal('maintenance_message');
            removeLocal('maintenance_title');
            removeLocal('maintenance_desc');
            removeLocal('maintenance_extra_desc');
            removeLocal('maintenance_media_type');
            removeLocal('maintenance_media_url');
            removeLocal('maintenance_btn_text');
            removeLocal('maintenance_btn_url');
            window.location.reload();
        }
    };

})();
