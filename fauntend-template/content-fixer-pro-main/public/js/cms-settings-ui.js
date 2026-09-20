/* Admin "Settings" button on the *2.html pages: change site fonts and theme
   colour, save once and every page (including the main .html files) updates. */
(function () {
    'use strict';

    var style = document.createElement('style');
    style.textContent = [
        '#stgBtn{position:fixed;left:18px;bottom:18px;z-index:100000;display:none;align-items:center;gap:8px;border:0;border-radius:14px;padding:12px 16px;background:#111827;color:#fff;font-family:system-ui,sans-serif;font-size:14px;font-weight:600;cursor:pointer;box-shadow:0 12px 30px rgba(0,0,0,.3);}',
        '#stgPanel{position:fixed;left:0;top:0;bottom:0;width:360px;max-width:92vw;z-index:100003;background:#fff;color:#111827;font-family:system-ui,sans-serif;box-shadow:0 0 40px rgba(0,0,0,.28);transform:translateX(-102%);transition:transform .25s ease;display:flex;flex-direction:column;}',
        '#stgPanel.open{transform:translateX(0);}',
        '#stgPanel header{display:flex;align-items:center;justify-content:space-between;padding:16px 18px;background:#111827;color:#fff;}',
        '#stgPanel header h4{margin:0;font-size:16px;}',
        '#stgPanel .stg-x{border:0;background:#374151;color:#fff;width:30px;height:30px;border-radius:8px;cursor:pointer;}',
        '#stgTabs{display:flex;border-bottom:1px solid #e5e7eb;}',
        '#stgTabs button{flex:1;border:0;background:#f9fafb;padding:11px;font-size:14px;font-weight:600;color:#6b7280;cursor:pointer;}',
        '#stgTabs button.active{background:#fff;color:#111827;box-shadow:inset 0 -3px 0 #4338CA;}',
        '.stg-body{flex:1;overflow:auto;padding:16px 18px;}',
        '.stg-field{margin-bottom:16px;}',
        '.stg-field label{display:block;font-size:13px;font-weight:600;margin-bottom:6px;color:#374151;}',
        '.stg-field select,.stg-field input{width:100%;padding:9px 10px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;background:#fff;}',
        '.stg-preview{margin-top:8px;padding:10px 12px;border:1px dashed #d1d5db;border-radius:8px;font-size:16px;line-height:1.6;}',
        '.stg-colors{display:grid;grid-template-columns:repeat(6,1fr);gap:9px;}',
        '.stg-color{position:relative;height:40px;border:0;border-radius:9px;cursor:pointer;box-shadow:0 0 0 1px rgba(0,0,0,.12);}',
        '.stg-color.active{box-shadow:0 0 0 3px #111827;}',
        '.stg-foot{padding:14px 18px;border-top:1px solid #e5e7eb;display:flex;gap:10px;}',
        '.stg-foot button{flex:1;border:0;border-radius:9px;padding:11px;font-weight:700;font-size:14px;cursor:pointer;}',
        '#stgSave{background:#22c55e;color:#04240f;}#stgSave[disabled]{opacity:.6;cursor:not-allowed;}',
        '#stgReset{background:#f3f4f6;color:#111827;}',
        '.stg-note{font-size:12px;color:#6b7280;margin:0 0 14px;}'
    ].join('\n');
    document.head.appendChild(style);

    function toast(message) {
        var element = document.createElement('div');
        element.className = 'cms-toast';
        element.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);bottom:90px;z-index:100005;background:#111827;color:#fff;padding:10px 18px;border-radius:999px;font-family:system-ui,sans-serif;font-size:14px;';
        element.textContent = message;
        document.body.appendChild(element);
        setTimeout(function () { element.remove(); }, 2800);
    }

    var button = document.createElement('button');
    button.id = 'stgBtn';
    button.type = 'button';
    button.innerHTML = '<i class="fa fa-cog"></i> সেটিংস';
    document.body.appendChild(button);

    var panel = document.createElement('div');
    panel.id = 'stgPanel';
    panel.innerHTML =
        '<header><h4>সাইট সেটিংস</h4><button type="button" class="stg-x">&times;</button></header>' +
        '<div id="stgTabs"><button type="button" data-tab="font" class="active">ফন্ট</button>' +
        '<button type="button" data-tab="color">থিম কালার</button>' +
        '<button type="button" data-tab="footer">ফুটার</button>' +
        '<button type="button" data-tab="achv">অ্যাচিভমেন্ট</button></div>' +
        '<div class="stg-body" data-pane="font">' +
        '<p class="stg-note">১০০+ বাংলা ও ইংরেজি ফন্ট। বাছাই করলেই সাথে সাথে প্রিভিউ দেখা যাবে, সেভ করলে সব পেইজে (মূল ফাইলেও) বসে যাবে।</p>' +
        '<div class="stg-field"><label>বডি / সাধারণ লেখা</label><select id="stgFontBody"></select>' +
        '<div class="stg-preview" id="stgPrevBody">Aa Bb Cc 123 — বাংলা লেখার নমুনা</div></div>' +
        '<div class="stg-field"><label>হেডিং / শিরোনাম</label><select id="stgFontHeading"></select>' +
        '<div class="stg-preview" id="stgPrevHeading">Heading — শিরোনাম</div></div>' +
        '<div class="stg-field"><label>বাংলা ভাষার ফন্ট (Bangla mode)</label><select id="stgFontBn"></select>' +
        '<div class="stg-preview" id="stgPrevBn">আমাদের হৃদরোগ চিকিৎসা সেবা</div></div>' +
        '</div>' +
        '<div class="stg-body" data-pane="color" style="display:none">' +
        '<p class="stg-note">৪০টি থিম কালার। সেভ করলে ওয়েবসাইটের সব পেইজের থিম কালার বদলে যাবে।</p>' +
        '<div class="stg-colors" id="stgColors"></div>' +
        '<div class="stg-field" style="margin-top:16px"><label>কাস্টম কালার</label><input type="color" id="stgCustom" value="#083F43"></div>' +
        '</div>' +
        '<div class="stg-body" data-pane="footer" style="display:none">' +
        '<p class="stg-note">ফুটারের ব্যাকগ্রাউন্ড ও সব লেখার কালার একসাথে বদলান। বাছাই করলেই লাইভ প্রিভিউ।</p>' +
        '<div class="stg-field"><label>ফুটার ব্যাকগ্রাউন্ড কালার</label><input type="color" id="stgFooterBg" value="#212529">' +
        '<div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap">' +
        ['#111827', '#212529', '#083F43', '#0F172A', '#1E293B', '#312E81', '#4A044E', '#7F1D1D'].map(function (c) {
            return '<button type="button" class="stg-color" data-fbg="' + c + '" style="background:' + c + ';width:34px;height:34px"></button>';
        }).join('') + '</div></div>' +
        '<div class="stg-field"><label>ফুটার টেক্সট কালার (সব লেখা)</label><input type="color" id="stgFooterText" value="#FFFFFF">' +
        '<div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap">' +
        ['#FFFFFF', '#F1F5F9', '#FDE68A', '#BBF7D0', '#BAE6FD', '#FECACA', '#000000', '#334155'].map(function (c) {
            return '<button type="button" class="stg-color" data-ftext="' + c + '" style="background:' + c + ';width:34px;height:34px"></button>';
        }).join('') + '</div></div>' +
        '</div>' +
        '<div class="stg-body" data-pane="achv" style="display:none">' +
        '<p class="stg-note">হোম পেইজের "Our Achievements" সেকশনের নিজস্ব কালার — থিম কালার বদলালেও এটি আলাদা থাকবে।</p>' +
        '<div class="stg-field"><label>সেকশন ব্যাকগ্রাউন্ড কালার</label><input type="color" id="stgAchvBg" value="#083F43">' +
        '<div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap">' +
        ['#083F43', '#0F172A', '#111827', '#1E293B', '#312E81', '#4A044E', '#7F1D1D', '#052E16'].map(function (c) {
            return '<button type="button" class="stg-color" data-abg="' + c + '" style="background:' + c + ';width:34px;height:34px"></button>';
        }).join('') + '</div></div>' +
        '<div class="stg-field"><label>অ্যাকসেন্ট কালার (নাম্বার লাইন / লেবেল)</label><input type="color" id="stgAchvAccent" value="#E7C374">' +
        '<div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap">' +
        ['#E7C374', '#FDE68A', '#7FD4D4', '#93C5FD', '#F9A8D4', '#86EFAC', '#FCA5A5', '#FFFFFF'].map(function (c) {
            return '<button type="button" class="stg-color" data-aacc="' + c + '" style="background:' + c + ';width:34px;height:34px"></button>';
        }).join('') + '</div></div>' +
        '<div class="stg-field"><label>টেক্সট কালার (শিরোনাম ও সংখ্যা)</label><input type="color" id="stgAchvText" value="#FFFFFF">' +
        '<div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap">' +
        ['#FFFFFF', '#F1F5F9', '#FDE68A', '#BAE6FD', '#111827'].map(function (c) {
            return '<button type="button" class="stg-color" data-atext="' + c + '" style="background:' + c + ';width:34px;height:34px"></button>';
        }).join('') + '</div></div>' +
        '</div>' +
        '<div class="stg-foot"><button type="button" id="stgReset">রিসেট</button><button type="button" id="stgSave">সেভ করুন</button></div>';
    document.body.appendChild(panel);

    var draft = {};

    function fonts() { return (window.SiteFonts && window.SiteFonts.list) || []; }
    function themes() { return (window.SiteFonts && window.SiteFonts.themes) || []; }

    function fillSelect(select) {
        var html = '<option value="">— ডিফল্ট —</option>';
        var list = fonts();
        var bangla = list.filter(function (f) { return f.bn; });
        var latin = list.filter(function (f) { return !f.bn; });
        html += '<optgroup label="বাংলা ফন্ট">';
        bangla.forEach(function (f) { html += '<option value="' + f.name + '">' + f.name + '</option>'; });
        html += '</optgroup><optgroup label="English / Latin">';
        latin.forEach(function (f) { html += '<option value="' + f.name + '">' + f.name + '</option>'; });
        html += '</optgroup>';
        select.innerHTML = html;
    }

    var bodySelect = panel.querySelector('#stgFontBody');
    var headingSelect = panel.querySelector('#stgFontHeading');
    var bnSelect = panel.querySelector('#stgFontBn');
    [bodySelect, headingSelect, bnSelect].forEach(fillSelect);

    var colors = panel.querySelector('#stgColors');
    themes().forEach(function (theme) {
        var swatch = document.createElement('button');
        swatch.type = 'button';
        swatch.className = 'stg-color';
        swatch.style.background = theme.color;
        swatch.title = theme.name + ' (' + theme.color + ')';
        swatch.setAttribute('data-color', theme.color);
        colors.appendChild(swatch);
    });

    function markColor(value) {
        colors.querySelectorAll('.stg-color').forEach(function (swatch) {
            swatch.classList.toggle('active', swatch.getAttribute('data-color').toLowerCase() === (value || '').toLowerCase());
        });
    }

    function previewFont(box, name) {
        var font = window.SiteSettings.findFont(name);
        if (!font) { box.style.fontFamily = ''; return; }
        window.SiteSettings.ensureFont(font);
        box.style.fontFamily = font.family + ',sans-serif';
    }

    function pushDraft() {
        window.SiteSettings.apply(draft);
        previewFont(panel.querySelector('#stgPrevBody'), draft.fontBody);
        previewFont(panel.querySelector('#stgPrevHeading'), draft.fontHeading);
        previewFont(panel.querySelector('#stgPrevBn'), draft.fontBn);
        markColor(draft.theme);
    }

    function syncForm() {
        bodySelect.value = draft.fontBody || '';
        headingSelect.value = draft.fontHeading || '';
        bnSelect.value = draft.fontBn || '';
        if (draft.theme) panel.querySelector('#stgCustom').value = draft.theme;
        if (draft.footerBg) panel.querySelector('#stgFooterBg').value = draft.footerBg;
        if (draft.footerText) panel.querySelector('#stgFooterText').value = draft.footerText;
        if (draft.achvBg) panel.querySelector('#stgAchvBg').value = draft.achvBg;
        if (draft.achvAccent) panel.querySelector('#stgAchvAccent').value = draft.achvAccent;
        if (draft.achvText) panel.querySelector('#stgAchvText').value = draft.achvText;
        pushDraft();
    }

    bodySelect.addEventListener('change', function () { draft.fontBody = bodySelect.value; pushDraft(); });
    headingSelect.addEventListener('change', function () { draft.fontHeading = headingSelect.value; pushDraft(); });
    bnSelect.addEventListener('change', function () { draft.fontBn = bnSelect.value; pushDraft(); });
    colors.addEventListener('click', function (event) {
        var swatch = event.target.closest('.stg-color');
        if (!swatch) return;
        draft.theme = swatch.getAttribute('data-color');
        panel.querySelector('#stgCustom').value = draft.theme;
        pushDraft();
    });
    panel.querySelector('#stgCustom').addEventListener('input', function (event) {
        draft.theme = event.target.value;
        pushDraft();
    });

    panel.querySelector('#stgFooterBg').addEventListener('input', function (event) {
        draft.footerBg = event.target.value;
        pushDraft();
    });
    panel.querySelector('#stgFooterText').addEventListener('input', function (event) {
        draft.footerText = event.target.value;
        pushDraft();
    });
    panel.querySelectorAll('[data-fbg]').forEach(function (swatch) {
        swatch.addEventListener('click', function () {
            draft.footerBg = swatch.getAttribute('data-fbg');
            panel.querySelector('#stgFooterBg').value = draft.footerBg;
            pushDraft();
        });
    });
    panel.querySelectorAll('[data-ftext]').forEach(function (swatch) {
        swatch.addEventListener('click', function () {
            draft.footerText = swatch.getAttribute('data-ftext');
            panel.querySelector('#stgFooterText').value = draft.footerText;
            pushDraft();
        });
    });

    /* "Our Achievements" section colours — kept apart from the theme colour. */
    [['#stgAchvBg', 'achvBg', 'data-abg'],
     ['#stgAchvAccent', 'achvAccent', 'data-aacc'],
     ['#stgAchvText', 'achvText', 'data-atext']].forEach(function (row) {
        var input = panel.querySelector(row[0]);
        input.addEventListener('input', function (event) {
            draft[row[1]] = event.target.value;
            pushDraft();
        });
        panel.querySelectorAll('[' + row[2] + ']').forEach(function (swatch) {
            swatch.addEventListener('click', function () {
                draft[row[1]] = swatch.getAttribute(row[2]);
                input.value = draft[row[1]];
                pushDraft();
            });
        });
    });


    panel.querySelector('#stgTabs').addEventListener('click', function (event) {
        var tab = event.target.closest('button[data-tab]');
        if (!tab) return;
        panel.querySelectorAll('#stgTabs button').forEach(function (item) { item.classList.toggle('active', item === tab); });
        panel.querySelectorAll('.stg-body').forEach(function (pane) {
            pane.style.display = pane.getAttribute('data-pane') === tab.getAttribute('data-tab') ? '' : 'none';
        });
    });

    function open() {
        draft = Object.assign({}, window.SiteSettings.current);
        syncForm();
        panel.classList.add('open');
    }
    function close() {
        panel.classList.remove('open');
        window.SiteSettings.apply(window.SiteSettings.current);
    }

    button.addEventListener('click', open);
    panel.querySelector('.stg-x').addEventListener('click', close);

    panel.querySelector('#stgReset').addEventListener('click', function () {
        draft = {
            theme: '', fontBody: '', fontHeading: '', fontBn: '', footerBg: '', footerText: '',
            achvBg: '', achvAccent: '', achvText: ''
        };
        syncForm();
    });

    var saveButton = panel.querySelector('#stgSave');
    saveButton.addEventListener('click', function () {
        var payload = {
            theme: draft.theme || '',
            fontBody: draft.fontBody || '',
            fontHeading: draft.fontHeading || '',
            fontBn: draft.fontBn || '',
            footerBg: draft.footerBg || '',
            footerText: draft.footerText || '',
            achvBg: draft.achvBg || '',
            achvAccent: draft.achvAccent || '',
            achvText: draft.achvText || ''
        };
        saveButton.disabled = true;
        fetch('/api/public/cms/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ settings: payload })
        })
            .then(function (response) {
                return response.json().then(function (data) {
                    if (!response.ok || !data.ok) throw new Error(data.error || ('server ' + response.status));
                    return data;
                });
            })
            .then(function () {
                window.SiteSettings.apply(payload);
                window.SiteSettings.cache(payload);
                toast('সেভ হয়েছে — মূল ওয়েবসাইটেও বদলে গেছে');
                close();
            })
            .catch(function (error) { toast('সেভ করা যায়নি: ' + (error && error.message ? error.message : 'unknown')); })
            .then(function () { saveButton.disabled = false; });
    });

    /* Show the button only for a logged-in admin (same session as the editor). */
    function reveal() { button.style.display = 'flex'; }
    document.addEventListener('cms:loaded', function (event) {
        if (event.detail && event.detail.authed) reveal();
    });
    /* The editor also logs in without re-firing cms:loaded — watch its toolbar. */
    setInterval(function () {
        var bar = document.getElementById('cmsBar');
        if (bar && bar.style.display === 'flex') reveal();
    }, 700);
})();
