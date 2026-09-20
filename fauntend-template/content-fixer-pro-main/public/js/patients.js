/* Patient Gallery: public list (patient.html) + admin editor (patient2.html).
   Rows live in the CMS "patients" page:
   key "patient:<id>" -> { id, name, age, address, disease, note, photo, at }
   (or { deleted: true }). */
(function () {
    'use strict';

    var PAGE = 'patients';
    var isAdmin = /patient2\.html?$/i.test(window.location.pathname);
    var patients = [];
    var editingId = '';

    function api(path, options) {
        return fetch(path, Object.assign({ credentials: 'same-origin', cache: 'no-store' }, options || {}));
    }

    function esc(value) {
        return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    function load() {
        return api('/api/public/cms/content?page=' + PAGE + '&t=' + Date.now())
            .then(function (r) { return r.json(); })
            .then(function (data) {
                var list = [];
                ((data && data.items) || []).forEach(function (row) {
                    try {
                        var p = JSON.parse(row.value);
                        if (!p || p.deleted === true || !p.id) return;
                        list.push({
                            id: String(p.id),
                            name: String(p.name || ''),
                            age: String(p.age || ''),
                            address: String(p.address || ''),
                            disease: String(p.disease || ''),
                            note: String(p.note || ''),
                            photo: String(p.photo || ''),
                            at: String(p.at || '')
                        });
                    } catch (e) { /* skip malformed */ }
                });
                list.sort(function (a, b) { return a.at < b.at ? 1 : a.at > b.at ? -1 : 0; });
                patients = list;
                return list;
            })
            .catch(function () { patients = []; return patients; });
    }

    function save(items) {
        return api('/api/public/cms/save', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ page: PAGE, items: items })
        }).then(function (r) { return r.json(); });
    }

    function row(p) {
        return { key: 'patient:' + p.id, type: 'text', value: JSON.stringify(p) };
    }

    function cardHtml(p, i) {
        var photo = p.photo
            ? '<img src="' + esc(p.photo) + '" alt="' + esc(p.name || 'Patient') + '" loading="lazy">'
            : '<div class="pt-photo-empty"><i class="fas fa-user"></i></div>';
        var chips = '';
        if (p.age) chips += '<span class="pt-chip"><i class="fas fa-cake-candles"></i>' + esc(p.age) + '</span>';
        if (p.address) chips += '<span class="pt-chip"><i class="fas fa-location-dot"></i>' + esc(p.address) + '</span>';
        return '<article class="pt-card" data-id="' + esc(p.id) + '" style="--pt-i:' + (i % 9) + '">'
            + '<div class="pt-photo">' + photo + '</div>'
            + '<div class="pt-body">'
            + '<h3 class="pt-name">' + esc(p.name || 'রোগী') + '</h3>'
            + (chips ? '<div class="pt-chips">' + chips + '</div>' : '')
            + (p.disease ? '<div class="pt-disease">' + esc(p.disease) + '</div>' : '')
            + (p.note ? '<p class="pt-note">' + esc(p.note) + '</p>' : '')
            + '</div>'
            + (isAdmin
                ? '<div class="pt-actions">'
                  + '<button type="button" class="btn btn-sm btn-outline-primary" data-pt-edit>Edit</button>'
                  + '<button type="button" class="btn btn-sm btn-outline-danger" data-pt-delete>Delete</button>'
                  + '</div>'
                : '')
            + '</article>';
    }

    function filtered() {
        var box = document.getElementById('ptSearch');
        var q = box ? box.value.trim().toLowerCase() : '';
        if (!q) return patients;
        return patients.filter(function (p) {
            return [p.name, p.age, p.address, p.disease, p.note].join(' ').toLowerCase().indexOf(q) !== -1;
        });
    }

    function render() {
        var grid = document.getElementById('ptGrid');
        var empty = document.getElementById('ptEmpty');
        var count = document.getElementById('ptCount');
        if (!grid) return;
        var list = filtered();
        grid.innerHTML = list.map(cardHtml).join('');
        if (empty) empty.hidden = list.length > 0;
        if (count) count.textContent = list.length + ' জন রোগী';
    }

    function setStatus(message, isError) {
        var box = document.getElementById('ptStatus');
        if (!box) return;
        box.textContent = message || '';
        box.hidden = !message;
        box.className = 'pt-status ' + (isError ? 'is-error' : 'is-ok');
    }

    function field(id) {
        var el = document.getElementById(id);
        return el ? el.value.trim() : '';
    }

    function setField(id, value) {
        var el = document.getElementById(id);
        if (el) el.value = value || '';
    }

    function resetForm() {
        editingId = '';
        ['ptName', 'ptAge', 'ptAddress', 'ptDisease', 'ptNote'].forEach(function (id) { setField(id, ''); });
        var file = document.getElementById('ptPhoto');
        if (file) file.value = '';
        var preview = document.getElementById('ptPreview');
        if (preview) { preview.hidden = true; preview.removeAttribute('src'); }
        var submit = document.getElementById('ptSubmit');
        if (submit) submit.textContent = 'রোগী যুক্ত করুন';
        var cancel = document.getElementById('ptCancel');
        if (cancel) cancel.hidden = true;
    }

    function uploadPhoto() {
        var input = document.getElementById('ptPhoto');
        var file = input && input.files && input.files[0];
        if (!file) return Promise.resolve('');
        var data = new FormData();
        data.append('file', file);
        return api('/api/public/cms/upload', { method: 'POST', body: data })
            .then(function (r) { return r.json(); })
            .then(function (result) {
                if (!result || !result.ok) throw new Error((result && result.error) || 'upload failed');
                return result.url;
            });
    }

    function initAdmin() {
        var form = document.getElementById('ptForm');
        var grid = document.getElementById('ptGrid');
        if (!form || !grid) return;

        var photoInput = document.getElementById('ptPhoto');
        if (photoInput) {
            photoInput.addEventListener('change', function () {
                var preview = document.getElementById('ptPreview');
                var file = photoInput.files && photoInput.files[0];
                if (!preview) return;
                if (!file) { preview.hidden = true; return; }
                preview.src = URL.createObjectURL(file);
                preview.hidden = false;
            });
        }

        var cancel = document.getElementById('ptCancel');
        if (cancel) cancel.addEventListener('click', function () { resetForm(); setStatus(''); });

        form.addEventListener('submit', function (event) {
            event.preventDefault();
            var name = field('ptName');
            if (!name) { setStatus('রোগীর নাম লিখুন।', true); return; }

            var existing = patients.filter(function (p) { return p.id === editingId; })[0];
            setStatus('সেভ হচ্ছে...', false);
            uploadPhoto().then(function (url) {
                var patient = {
                    id: editingId || String(Date.now()) + Math.random().toString(36).slice(2, 7),
                    name: name.slice(0, 120),
                    age: field('ptAge').slice(0, 40),
                    address: field('ptAddress').slice(0, 200),
                    disease: field('ptDisease').slice(0, 200),
                    note: field('ptNote').slice(0, 2000),
                    photo: url || (existing ? existing.photo : ''),
                    at: existing ? existing.at : new Date().toISOString()
                };
                return save([row(patient)]).then(function (result) {
                    if (!result || !result.ok) throw new Error((result && result.error) || 'সেভ করা যায়নি');
                    if (existing) {
                        patients = patients.map(function (p) { return p.id === patient.id ? patient : p; });
                    } else {
                        patients.unshift(patient);
                    }
                    resetForm();
                    render();
                    setStatus('সেভ হয়েছে।', false);
                });
            }).catch(function (error) {
                setStatus(error && error.message ? error.message : 'সেভ করা যায়নি। আবার লগইন করুন।', true);
            });
        });

        grid.addEventListener('click', function (event) {
            var card = event.target.closest('.pt-card');
            if (!card) return;
            var id = card.getAttribute('data-id');
            var patient = patients.filter(function (p) { return p.id === id; })[0];
            if (!patient) return;

            if (event.target.closest('[data-pt-delete]')) {
                if (!window.confirm('এই রোগীর তথ্য মুছে ফেলতে চান?')) return;
                save([{ key: 'patient:' + id, type: 'text', value: JSON.stringify({ deleted: true }) }])
                    .then(function (result) {
                        if (!result || !result.ok) { setStatus((result && result.error) || 'মুছা যায়নি।', true); return; }
                        patients = patients.filter(function (p) { return p.id !== id; });
                        if (editingId === id) resetForm();
                        render();
                        setStatus('মুছে ফেলা হয়েছে।', false);
                    });
                return;
            }

            if (event.target.closest('[data-pt-edit]')) {
                editingId = id;
                setField('ptName', patient.name);
                setField('ptAge', patient.age);
                setField('ptAddress', patient.address);
                setField('ptDisease', patient.disease);
                setField('ptNote', patient.note);
                var preview = document.getElementById('ptPreview');
                if (preview) {
                    if (patient.photo) { preview.src = patient.photo; preview.hidden = false; }
                    else { preview.hidden = true; }
                }
                var submit = document.getElementById('ptSubmit');
                if (submit) submit.textContent = 'আপডেট করুন';
                var cancelBtn = document.getElementById('ptCancel');
                if (cancelBtn) cancelBtn.hidden = false;
                setStatus('');
                document.getElementById('ptForm').scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        });
    }

    function start() {
        var search = document.getElementById('ptSearch');
        if (search) search.addEventListener('input', render);
        render();
        load().then(function () {
            render();
            if (isAdmin) initAdmin();
        });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
    else start();
})();
