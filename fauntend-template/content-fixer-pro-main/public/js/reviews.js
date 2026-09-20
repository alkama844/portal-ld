/* Public patient reviews: list + submit form (homepage). */
(function () {
    'use strict';

    var list, empty, form, starsWrap, starInput, photoInput, photoName, status, submitBtn, avgWrap;
    var moreWrap, moreBtn;
    var allReviews = [];
    var shown = 0;
    var PAGE_SIZE = 6;
    var TOKEN_KEY = 'rvTokens';

    function tokens() {
        try { return JSON.parse(localStorage.getItem(TOKEN_KEY) || '{}') || {}; }
        catch (e) { return {}; }
    }

    function saveToken(id, token) {
        try {
            var map = tokens();
            map[id] = token;
            localStorage.setItem(TOKEN_KEY, JSON.stringify(map));
        } catch (e) { /* storage unavailable */ }
    }

    function dropToken(id) {
        try {
            var map = tokens();
            delete map[id];
            localStorage.setItem(TOKEN_KEY, JSON.stringify(map));
        } catch (e) { /* storage unavailable */ }
    }

    function isAdminPage() {
        return /2\.html$/i.test(location.pathname) || /(^|\/)index2$/i.test(location.pathname);
    }

    function escapeHtml(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function starHtml(count) {
        var html = '';
        for (var i = 1; i <= 5; i++) {
            html += '<i class="fas fa-star' + (i <= count ? '' : ' rv-star-off') + '"></i>';
        }
        return html;
    }

    function initials(name) {
        var trimmed = (name || '').trim();
        return trimmed ? trimmed.charAt(0).toUpperCase() : '★';
    }

    function dateLabel(iso) {
        if (!iso) return '';
        var date = new Date(iso);
        if (isNaN(date.getTime())) return '';
        return date.toLocaleDateString('bn-BD', { year: 'numeric', month: 'long', day: 'numeric' });
    }

    function cardHtml(review, index) {
        var photo = review.photo
            ? '<img class="rv-avatar" src="' + escapeHtml(review.photo) + '" alt="' + escapeHtml(review.name) + '">'
            : '<span class="rv-avatar rv-avatar--letter">' + escapeHtml(initials(review.name)) + '</span>';
        var name = (review.name || '').trim() || 'একজন রোগী';
        return '<div class="col-md-6 col-lg-4" style="--rv-i:' + (index % 6) + '">'
            + '<article class="rv-card">'
            + '<span class="rv-quote-mark"><i class="fas fa-quote-right"></i></span>'
            + '<div class="rv-card-top">' + photo
            + '<div class="rv-meta"><div class="rv-name">' + escapeHtml(name) + '</div>'
            + '<div class="rv-date">' + escapeHtml(dateLabel(review.at)) + '</div></div>'
            + '<span class="rv-badge">' + escapeHtml(String(review.stars || 0)) + '.0</span>'
            + '</div>'
            + (isAdminPage() || tokens()[review.id]
                ? '<button type="button" class="rv-delete" data-id="' + escapeHtml(review.id) + '" title="' + (isAdminPage() ? 'এই রিভিউ মুছুন' : 'আপনার রিভিউ মুছুন') + '" aria-label="Delete review"><i class="fas fa-trash-can"></i></button>'
                : '')

            + '<div class="rv-stars">' + starHtml(review.stars) + '</div>'
            + '<p class="rv-text">' + escapeHtml(review.text) + '</p>'
            + '</article></div>';
    }

    function paint() {
        var slice = allReviews.slice(0, shown);
        list.innerHTML = slice.map(function (r, i) { return cardHtml(r, i); }).join('');
        if (moreWrap) {
            var remaining = allReviews.length - shown;
            moreWrap.style.display = remaining > 0 ? 'block' : 'none';
            if (moreBtn && remaining > 0) {
                moreBtn.querySelector('span').textContent = 'View More (' + remaining + ')';
            }
        }
    }

    function render(reviews) {
        if (!list) return;
        // Newest first.
        reviews.sort(function (a, b) {
            return String(b.at || '').localeCompare(String(a.at || ''));
        });
        allReviews = reviews;
        if (!reviews.length) {
            list.innerHTML = '';
            if (empty) empty.style.display = 'block';
            if (avgWrap) avgWrap.style.display = 'none';
            if (moreWrap) moreWrap.style.display = 'none';
            return;
        }
        if (empty) empty.style.display = 'none';
        shown = Math.min(Math.max(shown || PAGE_SIZE, PAGE_SIZE), reviews.length);
        paint();
        var total = reviews.reduce(function (sum, review) { return sum + (review.stars || 0); }, 0);
        var average = Math.round((total / reviews.length) * 10) / 10;
        if (avgWrap) {
            avgWrap.style.display = 'flex';
            avgWrap.innerHTML = '<span class="rv-avg-value">' + average.toFixed(1) + '</span>'
                + '<span class="rv-stars">' + starHtml(Math.round(average)) + '</span>'
                + '<span class="rv-avg-count">' + reviews.length + ' টি রিভিউ</span>';
        }
    }

    function load() {
        fetch('/api/public/reviews?t=' + Date.now(), { cache: 'no-store' })
            .then(function (response) { return response.json(); })
            .then(function (data) { render((data && data.reviews) || []); })
            .catch(function () { render([]); });
    }

    function setStars(value) {
        starInput.value = String(value);
        var buttons = starsWrap.querySelectorAll('button');
        for (var i = 0; i < buttons.length; i++) {
            buttons[i].classList.toggle('is-on', i < value);
        }
    }

    function bind() {
        list = document.getElementById('rvList');
        empty = document.getElementById('rvEmpty');
        form = document.getElementById('rvForm');
        avgWrap = document.getElementById('rvAverage');
        moreWrap = document.getElementById('rvMoreWrap');
        moreBtn = document.getElementById('rvMoreBtn');

        if (moreBtn) {
            moreBtn.addEventListener('click', function () {
                shown = Math.min(shown + PAGE_SIZE, allReviews.length);
                paint();
            });
        }

        if (list) {
            list.addEventListener('click', function (event) {
                var btn = event.target.closest('.rv-delete');
                if (!btn) return;
                var id = btn.getAttribute('data-id');
                var token = tokens()[id];
                var admin = isAdminPage();
                if (!token && !admin) return;
                if (!window.confirm(admin ? 'এই রিভিউটি মুছে ফেলতে চান?' : 'আপনার রিভিউটি মুছে ফেলতে চান?')) return;
                btn.disabled = true;
                fetch('/api/public/reviews', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'same-origin',
                    body: JSON.stringify({ id: id, token: token || '' })
                })
                    .then(function (response) { return response.json(); })
                    .then(function (result) {
                        if (!result || !result.ok) throw new Error((result && result.error) || 'failed');
                        dropToken(id);
                        load();
                    })
                    .catch(function () {
                        btn.disabled = false;
                        window.alert('রিভিউ মুছা যায়নি।');
                    });
            });
        }

        var openBtn = document.getElementById('rvOpenBtn');
        var formCard = document.getElementById('rvFormCard');
        if (openBtn && formCard) {
            openBtn.addEventListener('click', function () {
                var isOpen = !formCard.hasAttribute('hidden');
                if (isOpen) {
                    formCard.setAttribute('hidden', '');
                    openBtn.setAttribute('aria-expanded', 'false');
                    openBtn.querySelector('span').textContent = 'Write a Review';
                } else {
                    formCard.removeAttribute('hidden');
                    openBtn.setAttribute('aria-expanded', 'true');
                    openBtn.querySelector('span').textContent = 'Close Form';
                    formCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    var ta = formCard.querySelector('textarea[name="text"]');
                    if (ta) setTimeout(function () { ta.focus(); }, 350);
                }
            });
        }

        if (!form) { load(); return; }

        starsWrap = form.querySelector('.rv-star-picker');
        starInput = form.querySelector('input[name="stars"]');
        photoInput = form.querySelector('input[name="photo"]');
        photoName = form.querySelector('.rv-photo-name');
        status = form.querySelector('.rv-status');
        submitBtn = form.querySelector('button[type="submit"]');

        starsWrap.addEventListener('click', function (event) {
            var button = event.target.closest('button');
            if (!button) return;
            event.preventDefault();
            setStars(Number(button.getAttribute('data-value')));
        });
        setStars(5);

        photoInput.addEventListener('change', function () {
            var file = photoInput.files && photoInput.files[0];
            photoName.textContent = file ? file.name : 'ছবি না দিলেও চলবে';
        });

        form.addEventListener('submit', function (event) {
            event.preventDefault();
            event.stopPropagation();
            status.className = 'rv-status';
            status.textContent = '';

            var text = form.querySelector('textarea[name="text"]').value.trim();
            if (text.length < 3) {
                status.className = 'rv-status is-error';
                status.textContent = 'অনুগ্রহ করে আপনার অভিজ্ঞতা লিখুন।';
                return;
            }

            var data = new FormData(form);
            submitBtn.disabled = true;
            submitBtn.textContent = 'পাঠানো হচ্ছে...';
            fetch('/api/public/reviews', { method: 'POST', body: data })
                .then(function (response) { return response.json(); })
                .then(function (result) {
                    if (!result || !result.ok) throw new Error((result && result.error) || 'failed');
                    if (result.token && result.review && result.review.id) saveToken(result.review.id, result.token);
                    form.reset();
                    setStars(5);
                    photoName.textContent = 'ছবি না দিলেও চলবে';
                    status.className = 'rv-status is-ok';
                    status.textContent = 'ধন্যবাদ! আপনার রিভিউ প্রকাশিত হয়েছে।';
                    load();
                })
                .catch(function (error) {
                    status.className = 'rv-status is-error';
                    status.textContent = error && error.message ? error.message : 'রিভিউ পাঠানো যায়নি।';
                })
                .then(function () {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'রিভিউ পাঠান';
                });
        }, true);

        load();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
    else bind();
})();
