/* Shared CMS helpers: stable element keys + applying saved content. */
(function () {
    'use strict';

    function pageName() {
        var file = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
        file = file.replace(/\.html?$/, '') || 'index';
        return file.replace(/2$/, '');
    }

    function cmsHash(input) {
        var hash = 5381;
        for (var i = 0; i < input.length; i++) hash = ((hash * 33) ^ input.charCodeAt(i)) >>> 0;
        return 'c' + hash.toString(36);
    }

    /* Stable key: the permanent data-cms-id stamped into the HTML. Falls back to
       a positional path only for elements that were never stamped. */
    function keyFor(element) {
        var stable = element.getAttribute && element.getAttribute('data-cms-id');
        if (stable) return stable;
        var parts = [];
        var node = element;
        while (node && node !== document.body) {
            var parent = node.parentElement;
            if (!parent) break;
            var index = 0;
            for (var i = 0; i < parent.children.length; i++) {
                if (parent.children[i] === node) break;
                if (parent.children[i].tagName === node.tagName) index++;
            }
            parts.unshift(node.tagName.toLowerCase() + ':' + index);
            node = parent;
        }
        return parts.join('/');
    }

    function elementForKey(key) {
        if (key.indexOf('/') === -1 && key.indexOf(':') === -1) {
            return document.querySelector('[data-cms-id="' + key + '"]');
        }
        /* Legacy positional key: the stamped ids were derived from exactly these
           keys, so an old saved row still finds its original element. */
        var mapped = document.querySelector('[data-cms-id="' + cmsHash(pageName() + '|' + key) + '"]');
        if (mapped) return mapped;
        var node = document.body;
        var parts = key.split('/');
        for (var p = 0; p < parts.length; p++) {
            var bits = parts[p].split(':');
            var tag = bits[0].toUpperCase();
            var wanted = parseInt(bits[1], 10);
            var found = null;
            var seen = 0;
            for (var i = 0; i < node.children.length; i++) {
                if (node.children[i].tagName === tag) {
                    if (seen === wanted) { found = node.children[i]; break; }
                    seen++;
                }
            }
            if (!found) return null;
            node = found;
        }
        return node === document.body ? null : node;
    }

    function applyItem(item) {
        /* Never apply an empty saved value — it would blank the element on
           every page load and make it impossible to edit again. */
        if (!item || typeof item.value !== 'string' || !item.value.trim()) return false;
        var element = elementForKey(item.content_key);
        if (!element) return false;
        /* Never override content inside a region marked data-cms-ignore
           (e.g. the Video Gallery upload form) — leave its original markup. */
        if (element.closest('[data-cms-ignore]')) return false;
        if (item.content_type === 'src') {
            element.removeAttribute('srcset');
            element.setAttribute('src', item.value);
        } else if (item.content_type === 'bg') {
            element.style.backgroundImage = 'url("' + item.value + '")';
        } else if (item.content_type === 'placeholder') {
            element.setAttribute('placeholder', item.value);
        } else if (item.content_type === 'html') {
            element.innerHTML = item.value;
        } else {
            element.textContent = item.value;
        }
        return true;
    }

    /* No localStorage copy of the content: a stale cache used to repaint old
       text over freshly saved content. The server is the only source. */
    function clearOldCache() {
        try { window.localStorage.removeItem('cms:' + pageName()); } catch (e) { /* ignore */ }
    }

    function applyAll(items) {
        items.forEach(function (item) {
            if (applyItem(item)) {
                var element = elementForKey(item.content_key);
                /* Saved content must never be re-worded by the translator. */
                if (element) element.setAttribute('data-cms-applied', '1');
            }
        });
        window.SiteCMS.items = items;
        if (items.length && typeof window.switchSiteLanguage === 'function') {
            window.switchSiteLanguage(document.documentElement.lang === 'bn' ? 'bn' : 'en');
        }
    }

    function load() {
        return fetch('/api/public/cms/content?page=' + encodeURIComponent(pageName()) + '&t=' + Date.now(), { credentials: 'same-origin', cache: 'no-store' })
            .then(function (response) { return response.json(); })
            .catch(function () { return { items: [] }; });
    }

    window.SiteCMS = {
        pageName: pageName,
        keyFor: keyFor,
        elementForKey: elementForKey,
        applyItem: applyItem,
        load: load
    };

    clearOldCache();

    load().then(function (data) {
        var items = (data && data.items) || [];
        var run = function () {
            applyAll(items);
            window.SiteCMS.loaded = true;
            document.dispatchEvent(new CustomEvent('cms:loaded', { detail: data }));
            if (window.SiteBoot) window.SiteBoot.done('cms');
        };
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
        else run();
    });
})();

