/* Video Gallery: shared loader (video.html) + admin editor (video2.html).
   Videos are stored as small JSON rows in the CMS "videos" page:
   key "video:<youtubeId>" -> { "id", "title", "at" } (or { "deleted": true }). */
(function () {
    'use strict';

    var PAGE = 'videos';
    var isAdmin = /2\.html?$/i.test(window.location.pathname);
    var videos = [];

    function api(path, options) {
        return fetch(path, Object.assign({ credentials: 'same-origin', cache: 'no-store' }, options || {}));
    }

    function parseId(input) {
        var raw = String(input || '').trim();
        if (!raw) return null;
        if (/^[A-Za-z0-9_-]{11}$/.test(raw)) return raw;
        var url;
        try {
            url = new URL(raw.indexOf('http') === 0 ? raw : 'https://' + raw);
        } catch (e) {
            return null;
        }
        var host = url.hostname.replace(/^www\./, '');
        var id = '';
        if (host === 'youtu.be') {
            id = url.pathname.split('/')[1] || '';
        } else if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
            if (url.pathname === '/watch') id = url.searchParams.get('v') || '';
            else {
                var parts = url.pathname.split('/').filter(Boolean);
                if (parts[0] === 'shorts' || parts[0] === 'embed' || parts[0] === 'live' || parts[0] === 'v') id = parts[1] || '';
            }
        }
        return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
    }

    function load() {
        return api('/api/public/cms/content?page=' + PAGE + '&t=' + Date.now())
            .then(function (response) { return response.json(); })
            .then(function (data) {
                var list = [];
                ((data && data.items) || []).forEach(function (row) {
                    try {
                        var parsed = JSON.parse(row.value);
                        if (!parsed || parsed.deleted === true || !parsed.id) return;
                        list.push({ id: String(parsed.id), title: String(parsed.title || ''), at: String(parsed.at || '') });
                    } catch (e) { /* skip malformed */ }
                });
                list.sort(function (a, b) { return a.at < b.at ? 1 : a.at > b.at ? -1 : 0; });
                videos = list;
                return list;
            })
            .catch(function () { videos = []; return videos; });
    }

    function save(items) {
        return api('/api/public/cms/save', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ page: PAGE, items: items })
        }).then(function (response) { return response.json(); });
    }

    function escapeHtml(value) {
        return String(value || '').replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    function render() {
        var grid = document.getElementById('videoGrid');
        var empty = document.getElementById('videoEmpty');
        if (!grid) return;
        if (empty) empty.hidden = videos.length > 0;
        grid.innerHTML = videos.map(function (video) {
            var title = escapeHtml(video.title || 'Video');
            return '<div class="video-item" data-id="' + escapeHtml(video.id) + '">' +
                '<div class="video-frame">' +
                '<iframe src="https://www.youtube.com/embed/' + escapeHtml(video.id) + '" title="' + title + '"' +
                ' loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"' +
                ' referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>' +
                '</div>' +
                '<h3 class="video-title">' + title + '</h3>' +
                (isAdmin
                    ? '<div class="video-actions">' +
                      '<button type="button" class="btn btn-sm btn-outline-primary" data-video-edit>Edit Title</button>' +
                      '<button type="button" class="btn btn-sm btn-outline-danger" data-video-delete>Delete</button>' +
                      '</div>'
                    : '') +
                '</div>';
        }).join('');
    }

    function setStatus(message, isError) {
        var box = document.getElementById('videoStatus');
        if (!box) return;
        box.textContent = message || '';
        box.hidden = !message;
        box.className = 'video-status ' + (isError ? 'is-error' : 'is-ok');
    }

    function row(video) {
        return { key: 'video:' + video.id, type: 'text', value: JSON.stringify(video) };
    }

    function initAdmin() {
        var form = document.getElementById('videoAddForm');
        var grid = document.getElementById('videoGrid');
        if (!form || !grid) return;

        form.addEventListener('submit', function (event) {
            event.preventDefault();
            var linkInput = document.getElementById('videoLink');
            var titleInput = document.getElementById('videoTitle');
            var id = parseId(linkInput.value);
            if (!id) {
                setStatus('Invalid YouTube link. Paste a watch, youtu.be, shorts or embed URL.', true);
                return;
            }
            if (videos.some(function (video) { return video.id === id; })) {
                setStatus('Already added.', true);
                return;
            }
            var video = { id: id, title: (titleInput.value || '').trim().slice(0, 200) || 'Video', at: new Date().toISOString() };
            setStatus('Saving...', false);
            save([row(video)]).then(function (result) {
                if (!result || !result.ok) {
                    setStatus((result && result.error) || 'Could not save. Please log in again.', true);
                    return;
                }
                videos.unshift(video);
                render();
                linkInput.value = '';
                titleInput.value = '';
                setStatus('Video added.', false);
            }).catch(function () { setStatus('Could not save the video.', true); });
        });

        grid.addEventListener('click', function (event) {
            var item = event.target.closest('.video-item');
            if (!item) return;
            var id = item.getAttribute('data-id');
            var video = videos.filter(function (v) { return v.id === id; })[0];
            if (!video) return;

            if (event.target.closest('[data-video-delete]')) {
                if (!window.confirm('Delete this video?')) return;
                save([{ key: 'video:' + id, type: 'text', value: JSON.stringify({ deleted: true }) }]).then(function (result) {
                    if (!result || !result.ok) { setStatus((result && result.error) || 'Could not delete.', true); return; }
                    videos = videos.filter(function (v) { return v.id !== id; });
                    render();
                    setStatus('Video deleted.', false);
                });
                return;
            }

            if (event.target.closest('[data-video-edit]')) {
                var next = window.prompt('Video title:', video.title || '');
                if (next === null) return;
                var updated = { id: video.id, title: next.trim().slice(0, 200) || 'Video', at: video.at };
                save([row(updated)]).then(function (result) {
                    if (!result || !result.ok) { setStatus((result && result.error) || 'Could not save the title.', true); return; }
                    video.title = updated.title;
                    render();
                    setStatus('Title updated.', false);
                });
            }
        });
    }

    function start() {
        render();
        load().then(function () {
            render();
            if (isAdmin) initAdmin();
        });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
    else start();
})();
