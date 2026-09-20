/* Visual editor for the *2.html pages: pencil icons on text, images and backgrounds. */
(function () {
    'use strict';

    var pending = {};
    var authed = false;

    var style = document.createElement('style');
    style.textContent = [
        '.cms-editable{outline:1px dashed rgba(67,56,202,.55);outline-offset:2px;cursor:text;}',
        '.cms-editable.cms-img{cursor:pointer;}',
        '.cms-editable.cms-hover{outline:2px solid #4338CA;background:rgba(67,56,202,.06);}',
        '.cms-editable.cms-changed{outline:2px solid #16a34a;}',
        '[contenteditable="true"]{outline:2px solid #f59e0b !important;cursor:text;caret-color:#111827;}',
        '#cmsPencil{position:absolute;z-index:99999;width:30px;height:30px;border:0;border-radius:50%;background:#4338CA;color:#fff;display:none;align-items:center;justify-content:center;box-shadow:0 6px 18px rgba(0,0,0,.25);cursor:pointer;font-size:13px;pointer-events:auto;}',
        '#cmsBar{position:fixed;right:18px;bottom:18px;z-index:100000;background:#111827;color:#fff;border-radius:14px;padding:12px 14px;display:flex;gap:10px;align-items:center;font-family:system-ui,sans-serif;font-size:14px;box-shadow:0 12px 30px rgba(0,0,0,.3);}',
        '#cmsBar button{border:0;border-radius:8px;padding:8px 14px;font-weight:600;cursor:pointer;}',
        '#cmsSave{background:#22c55e;color:#04240f;}#cmsSave[disabled]{opacity:.5;cursor:not-allowed;}',
        '#cmsLogout{background:#374151;color:#fff;}',
        '#cmsLogin{position:fixed;inset:0;z-index:100001;background:rgba(15,23,42,.92);display:flex;align-items:center;justify-content:center;font-family:system-ui,sans-serif;}',
        '#cmsLogin form{background:#fff;padding:26px;border-radius:16px;width:320px;display:flex;flex-direction:column;gap:12px;}',
        '#cmsLogin input{padding:10px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:15px;}',
        '#cmsLogin button{background:#4338CA;color:#fff;border:0;padding:11px;border-radius:8px;font-weight:600;cursor:pointer;}',
        '#cmsLogin .cms-err{color:#dc2626;font-size:13px;min-height:16px;}',
        '.cms-toast{position:fixed;left:50%;transform:translateX(-50%);bottom:90px;z-index:100002;background:#111827;color:#fff;padding:10px 18px;border-radius:999px;font-family:system-ui,sans-serif;font-size:14px;}'
    ].join('\n');
    document.head.appendChild(style);

    function toast(message) {
        var element = document.createElement('div');
        element.className = 'cms-toast';
        element.textContent = message;
        document.body.appendChild(element);
        setTimeout(function () { element.remove(); }, 2600);
    }

    var SKIP = 'script,style,noscript,svg,iframe,head';
    var INLINE = { A: 1, SPAN: 1, STRONG: 1, EM: 1, B: 1, I: 1, SMALL: 1, BR: 1, U: 1, SUP: 1, SUB: 1, MARK: 1, CODE: 1 };

    function inUi(element) {
        /* .owl-item.cloned / .slick-cloned are duplicates the carousel creates at
           runtime. Editing a clone saved a key that pointed at a different element
           on the next load, which made text appear to change on its own. */
        return !!(element.closest && element.closest('#cmsBar, #cmsLogin, #cmsPencil, #stgBtn, #stgPanel, [data-cms-ignore], .owl-item.cloned, .slick-cloned'));
    }

    function directText(element) {
        var text = '';
        for (var i = 0; i < element.childNodes.length; i++) {
            var node = element.childNodes[i];
            if (node.nodeType === 3) text += node.nodeValue;
        }
        return text.trim();
    }

    /* Returns 'text' (leaf), 'html' (text + inline children), or null. */
    function textMode(element) {
        if (inUi(element)) return null;
        if (element.matches(SKIP)) return null;
        if (element.isContentEditable) return null;
        var hasElementChild = element.children.length > 0;
        if (!hasElementChild) {
            return (element.textContent || '').trim().length > 0 ? 'text' : null;
        }
        if (!directText(element)) return null;
        for (var i = 0; i < element.children.length; i++) {
            if (!INLINE[element.children[i].tagName]) return null;
        }
        return 'html';
    }

    function bgUrl(element) {
        var value = element.style && element.style.backgroundImage;
        if (value && value.indexOf('url(') === 0) return value;
        return '';
    }

    function markEditables() {
        var all = document.body.querySelectorAll('*');
        for (var i = 0; i < all.length; i++) {
            var element = all[i];
            if (inUi(element)) continue;
            if (element.tagName === 'IMG') {
                element.classList.add('cms-editable', 'cms-img');
                element.setAttribute('data-cms-mode', 'src');
                continue;
            }
            if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                if (element.getAttribute('placeholder')) {
                    element.classList.add('cms-editable');
                    element.setAttribute('data-cms-mode', 'placeholder');
                }
                continue;
            }
            if (bgUrl(element)) {
                element.classList.add('cms-editable', 'cms-img');
                element.setAttribute('data-cms-mode', 'bg');
                continue;
            }
            var mode = textMode(element);
            if (mode) {
                element.classList.add('cms-editable');
                element.setAttribute('data-cms-mode', mode);
            }
        }
    }

    var pencil = document.createElement('button');
    pencil.id = 'cmsPencil';
    pencil.type = 'button';
    pencil.title = 'এডিট করুন';
    pencil.innerHTML = '<i class="fa fa-pen"></i>';
    document.body.appendChild(pencil);

    var current = null;

    function showPencil(element) {
        if (current && current !== element) current.classList.remove('cms-hover');
        current = element;
        element.classList.add('cms-hover');
        var rect = element.getBoundingClientRect();
        pencil.style.display = 'flex';
        pencil.style.top = (window.scrollY + Math.max(rect.top, 4) - 10) + 'px';
        pencil.style.left = (window.scrollX + Math.min(rect.right, window.innerWidth - 36) - 14) + 'px';
    }

    document.addEventListener('mouseover', function (event) {
        if (!authed) return;
        var target = event.target;
        if (!target || !target.closest) return;
        if (target.closest('#cmsPencil')) return;
        var element = target.closest('.cms-editable');
        if (element) showPencil(element);
    });

    function markChanged(element, type, value) {
        var key = window.SiteCMS.keyFor(element);
        /* Empty values must never be queued/saved: a blank saved entry wipes
           the element on every load and it can never be edited again. */
        if (typeof value !== 'string' || !value.trim()) {
            delete pending[key];
            element.classList.remove('cms-changed');
            updateBar();
            toast('ফাঁকা লেখা সেভ করা যাবে না');
            return;
        }
        pending[key] = { key: key, type: type, value: value };
        element.classList.add('cms-changed');
        updateBar();
    }

    var fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);
    var imageTarget = null;

    fileInput.addEventListener('change', function () {
        var file = fileInput.files && fileInput.files[0];
        if (!file || !imageTarget) return;
        var target = imageTarget;
        var mode = target.getAttribute('data-cms-mode') === 'bg' ? 'bg' : 'src';
        var data = new FormData();
        data.append('file', file);
        toast('ছবি আপলোড হচ্ছে...');
        fetch('/api/public/cms/upload', { method: 'POST', body: data, credentials: 'same-origin' })
            .then(function (response) { return response.json(); })
            .then(function (result) {
                if (!result.ok) throw new Error(result.error || 'upload failed');
                if (mode === 'bg') {
                    target.style.backgroundImage = 'url("' + result.url + '")';
                } else {
                    target.removeAttribute('srcset');
                    target.setAttribute('src', result.url);
                }
                markChanged(target, mode, result.url);
                toast('ছবি যুক্ত হয়েছে — এখন সেভ করুন');
            })
            .catch(function () { toast('ছবি আপলোড ব্যর্থ হয়েছে'); });
        fileInput.value = '';
    });

    function editPlaceholder(element) {
        var value = window.prompt('প্লেসহোল্ডার লেখা', element.getAttribute('placeholder') || '');
        if (value === null) return;
        element.setAttribute('placeholder', value);
        markChanged(element, 'placeholder', value);
    }

    function isInvisible(value) {
        return !value || value === 'transparent' || value === 'rgba(0, 0, 0, 0)';
    }

    function startTextEdit(element) {
        if (element.getAttribute('contenteditable') === 'true') return;
        var mode = element.getAttribute('data-cms-mode') === 'html' ? 'html' : 'text';
        var before = mode === 'html' ? element.innerHTML : (element.textContent || '');

        /* Gradient/transparent text (background-clip:text) is invisible while
           editing — force a readable color and restore styles afterwards. */
        var computed = window.getComputedStyle(element);
        var fill = computed.webkitTextFillColor || computed.getPropertyValue('-webkit-text-fill-color');
        var invisible = isInvisible(computed.color) || isInvisible(fill);
        var saved = null;
        if (invisible) {
            saved = {
                color: element.style.color,
                backgroundImage: element.style.backgroundImage,
                fill: element.style.getPropertyValue('-webkit-text-fill-color'),
                textShadow: element.style.textShadow,
            };
            var bg = computed.backgroundColor;
            var darkBg = !isInvisible(bg) && (function () {
                var m = bg.match(/rgba?\(([^)]+)\)/);
                if (!m) return false;
                var p = m[1].split(',').map(parseFloat);
                return (p[0] * 0.299 + p[1] * 0.587 + p[2] * 0.114) < 140;
            })();
            var ink = darkBg ? '#ffffff' : '#111827';
            element.style.backgroundImage = 'none';
            element.style.setProperty('-webkit-text-fill-color', ink);
            element.style.color = ink;
            element.style.textShadow = 'none';
            element.style.caretColor = ink;
        }

        element.setAttribute('contenteditable', 'true');
        element.setAttribute('spellcheck', 'false');
        try { element.focus({ preventScroll: true }); } catch (e) { element.focus(); }

        var onInput = function () {
            var after = mode === 'html' ? element.innerHTML : (element.textContent || '');
            if (after !== before) markChanged(element, mode, after);
        };
        var finish = function () {
            element.removeAttribute('contenteditable');
            if (saved) {
                element.style.color = saved.color;
                element.style.backgroundImage = saved.backgroundImage;
                element.style.setProperty('-webkit-text-fill-color', saved.fill);
                element.style.textShadow = saved.textShadow;
                element.style.caretColor = '';
            }
            element.removeEventListener('blur', finish);
            element.removeEventListener('input', onInput);
            onInput();
        };
        element.addEventListener('input', onInput);
        element.addEventListener('blur', finish);
    }

    function activate(target) {
        if (!target) return;
        var mode = target.getAttribute('data-cms-mode');
        if (mode === 'src' || mode === 'bg') { imageTarget = target; fileInput.click(); return; }
        if (mode === 'placeholder') { editPlaceholder(target); return; }
        startTextEdit(target);
    }

    pencil.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        activate(current);
    });

    document.addEventListener('click', function (event) {
        if (!authed) return;
        var target = event.target;
        if (!target || !target.closest) return;
        if (target.closest('#cmsBar, #cmsLogin, #cmsPencil, [data-cms-ignore]')) return;

        /* Already editing: let the browser place the caret normally. */
        if (target.isContentEditable) {
            event.preventDefault();
            return;
        }
        var element = target.closest('.cms-editable');
        if (!element) return;
        event.preventDefault();
        event.stopPropagation();
        activate(element);
    }, true);

    /* Block navigation while in edit mode. */
    document.addEventListener('submit', function (event) { if (authed && !event.target.closest('#cmsLogin, [data-cms-ignore]')) event.preventDefault(); }, true);

    var bar = document.createElement('div');
    bar.id = 'cmsBar';
    bar.innerHTML = '<span id="cmsCount">০ পরিবর্তন</span><button type="button" id="cmsSave" disabled>সেভ করুন</button><button type="button" id="cmsLogout">লগ আউট</button>';
    document.body.appendChild(bar);
    var saveBtn = bar.querySelector('#cmsSave');
    var countLabel = bar.querySelector('#cmsCount');

    function updateBar() {
        var count = Object.keys(pending).length;
        countLabel.textContent = count + ' পরিবর্তন';
        saveBtn.disabled = count === 0;
    }

    saveBtn.addEventListener('click', function () {
        if (document.activeElement && document.activeElement.isContentEditable) document.activeElement.blur();
        var items = Object.keys(pending).map(function (key) { return pending[key]; });
        if (!items.length) return;
        saveBtn.disabled = true;
        fetch('/api/public/cms/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ page: window.SiteCMS.pageName(), items: items })
        })
            .then(function (response) {
                return response.text().then(function (body) {
                    var data;
                    try { data = JSON.parse(body); } catch (e) { data = null; }
                    if (!data) throw new Error('server ' + response.status);
                    if (!response.ok || !data.ok) throw new Error(data.error || ('server ' + response.status));
                    return data;
                });
            })
            .then(function () {
                pending = {};
                document.querySelectorAll('.cms-changed').forEach(function (element) { element.classList.remove('cms-changed'); });
                updateBar();
                toast('সেভ হয়েছে — মূল পেইজেও আপডেট হয়ে গেছে');
            })
            .catch(function (error) { saveBtn.disabled = false; toast('সেভ করা যায়নি: ' + (error && error.message ? error.message : 'unknown')); });
    });

    bar.querySelector('#cmsLogout').addEventListener('click', function () {
        fetch('/api/public/cms/logout', { method: 'POST', credentials: 'same-origin' })
            .then(function () { window.location.reload(); });
    });

    window.addEventListener('beforeunload', function (event) {
        if (authed && Object.keys(pending).length) { event.preventDefault(); event.returnValue = ''; }
    });

    function showLogin() {
        var overlay = document.createElement('div');
        overlay.id = 'cmsLogin';
        overlay.innerHTML = '<form><h3 style="margin:0 0 6px;font-size:18px;color:#111827;">অ্যাডমিন লগইন</h3>'
            + '<input name="username" placeholder="ইউজারনেম" autocomplete="username" required>'
            + '<input name="password" type="password" placeholder="পাসওয়ার্ড" autocomplete="current-password" required>'
            + '<div class="cms-err"></div><button type="submit">লগইন</button></form>';
        document.body.appendChild(overlay);
        overlay.querySelector('form').addEventListener('submit', function (event) {
            event.preventDefault();
            event.stopPropagation();
            var form = event.currentTarget;
            fetch('/api/public/cms/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({ username: form.username.value, password: form.password.value })
            })
                .then(function (response) { return response.json(); })
                .then(function (result) {
                    if (!result.ok) throw new Error(result.error || 'login failed');
                    overlay.remove();
                    start();
                })
                .catch(function () { overlay.querySelector('.cms-err').textContent = 'ভুল ইউজারনেম বা পাসওয়ার্ড'; });
        });
    }

    function start() {
        authed = true;
        markEditables();
        bar.style.display = 'flex';
        updateBar();
        /* Catch content injected later (carousels, animations). */
        setInterval(markEditables, 2500);
        toast('এডিট মোড চালু — যেকোনো লেখা বা ছবিতে ক্লিক করুন');
    }

    bar.style.display = 'none';
    document.addEventListener('cms:loaded', function (event) {
        if (event.detail && event.detail.authed) start();
        else showLogin();
    });
})();
