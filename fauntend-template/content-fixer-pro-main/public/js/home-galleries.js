/* Home page previews: first 3 videos and first 3 patients from the CMS,
   with a "View More" button linking to the full gallery pages. */
(function () {
    'use strict';

    var LIMIT = 3;

    function api(path) {
        return fetch(path, { credentials: 'same-origin', cache: 'no-store' })
            .then(function (r) { return r.json(); })
            .catch(function () { return null; });
    }

    function esc(value) {
        return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    function load(page) {
        return api('/api/public/cms/content?page=' + page + '&t=' + Date.now()).then(function (data) {
            var list = [];
            ((data && data.items) || []).forEach(function (row) {
                try {
                    var p = JSON.parse(row.value);
                    if (!p || p.deleted === true || !p.id) return;
                    p.at = String(p.at || '');
                    list.push(p);
                } catch (e) { /* skip */ }
            });
            list.sort(function (a, b) { return a.at < b.at ? 1 : a.at > b.at ? -1 : 0; });
            return list;
        });
    }

    function toggleMore(id, show) {
        var el = document.getElementById(id);
        if (el) el.hidden = !show;
    }

    function renderVideos(list) {
        var grid = document.getElementById('homeVideoGrid');
        var empty = document.getElementById('homeVideoEmpty');
        if (!grid) return;
        var top = list.slice(0, LIMIT);
        grid.innerHTML = top.map(function (v) {
            var title = esc(v.title || 'Video');
            return '<div class="hg-video">'
                + '<div class="hg-frame"><iframe src="https://www.youtube.com/embed/' + esc(v.id) + '" title="' + title + '"'
                + ' loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"'
                + ' referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe></div>'
                + '<h3 class="hg-video-title">' + title + '</h3>'
                + '</div>';
        }).join('');
        if (empty) empty.hidden = top.length > 0;
        toggleMore('homeVideoMore', list.length > LIMIT);
    }

    function renderPatients(list) {
        var grid = document.getElementById('homePatientGrid');
        var empty = document.getElementById('homePatientEmpty');
        if (!grid) return;
        var top = list.slice(0, LIMIT);
        grid.innerHTML = top.map(function (p) {
            var photo = p.photo
                ? '<img src="' + esc(p.photo) + '" alt="' + esc(p.name || 'Patient') + '" loading="lazy">'
                : '<div class="hg-photo-empty"><i class="fas fa-user"></i></div>';
            var chips = '';
            if (p.age) chips += '<span class="hg-chip"><i class="fas fa-birthday-cake"></i>' + esc(p.age) + '</span>';
            if (p.address) chips += '<span class="hg-chip"><i class="fas fa-map-marker-alt"></i>' + esc(p.address) + '</span>';
            return '<article class="hg-patient">'
                + '<div class="hg-photo">' + photo + '</div>'
                + '<div class="hg-patient-body">'
                + '<h3 class="hg-patient-name">' + esc(p.name || 'রোগী') + '</h3>'
                + (chips ? '<div class="hg-chips">' + chips + '</div>' : '')
                + (p.disease ? '<div class="hg-disease">' + esc(p.disease) + '</div>' : '')
                + (p.note ? '<p class="hg-note">' + esc(p.note) + '</p>' : '')
                + '</div></article>';
        }).join('');
        if (empty) empty.hidden = top.length > 0;
        toggleMore('homePatientMore', list.length > LIMIT);
    }

    function start() {
        if (document.getElementById('homeVideoGrid')) load('videos').then(renderVideos);
        if (document.getElementById('homePatientGrid')) load('patients').then(renderPatients);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
    else start();
})();
