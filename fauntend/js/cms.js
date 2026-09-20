/**
 * Lucky Dental Care — Real Backend-Connected CMS & Secure Edit Mode
 * 1. Public DOM hydration from GET /api/site-content
 * 2. Unobtrusive Admin Entry & Secure Backend Authentication
 * 3. In-browser Visual Edit Mode with explicit batch saving
 * 4. Image replacement & treatment management
 * ZERO secrets or passwords in client code.
 */

(function () {
  'use strict';

  let currentContent = {};
  const pendingChanges = new Map();
  let isEditModeActive = false;

  // --------------------------------------------------------------------------
  // 1. PUBLIC DOM HYDRATION
  // --------------------------------------------------------------------------
  async function hydratePublicContent() {
    try {
      const url = `${window.LUCKY_API_BASE_URL}/api/site-content`;
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data && data.content) {
        currentContent = data.content;
        applyContentToDOM(currentContent);
      }
    } catch (err) {
      console.warn('Lucky CMS: Backend content API unavailable, keeping bundled static text:', err.message);
    }
  }

  function applyContentToDOM(contentMap) {
    if (!contentMap || typeof contentMap !== 'object') return;

    // 1. Text elements with data-cms-key
    const textNodes = document.querySelectorAll('[data-cms-key]');
    textNodes.forEach((node) => {
      const key = node.getAttribute('data-cms-key');
      if (key && contentMap[key] !== undefined) {
        node.textContent = contentMap[key];
      }
    });

    // 2. Image elements with data-cms-img
    const imgNodes = document.querySelectorAll('[data-cms-img]');
    imgNodes.forEach((img) => {
      const key = img.getAttribute('data-cms-img');
      if (key && contentMap[key]) {
        img.setAttribute('src', contentMap[key]);
      }
    });

    // 3. Link elements with data-cms-href
    const linkNodes = document.querySelectorAll('[data-cms-href]');
    linkNodes.forEach((link) => {
      const key = link.getAttribute('data-cms-href');
      if (key && contentMap[key]) {
        link.setAttribute('href', contentMap[key]);
      }
    });
  }

  // --------------------------------------------------------------------------
  // 2. ADMIN AUTHENTICATION MODAL
  // --------------------------------------------------------------------------
  function openAdminLoginModal() {
    const modalId = 'luckyAdminLoginModal';
    let modal = document.getElementById(modalId);
    if (!modal) {
      modal = document.createElement('div');
      modal.id = modalId;
      modal.className = 'cms-modal-backdrop';
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div class="cms-modal-box cms-login-box">
        <div class="cms-modal-header">
          <h3><i class="fas fa-lock"></i> অ্যাডমিন লগইন (Lucky Dental Care)</h3>
          <button type="button" class="cms-close-btn" onclick="document.getElementById('${modalId}').classList.remove('active')">&times;</button>
        </div>
        <form id="cmsLoginForm" class="cms-modal-body">
          <p class="cms-login-desc">ওয়েবসাইট বিষয়বস্তু ও সেবা তালিকা সম্পাদনা করতে আপনার অ্যাডমিন ক্রেডেনশিয়াল প্রদান করুন।</p>
          <div class="cms-form-group">
            <label for="cmsAdminEmail">ইমেইল ঠিকানা</label>
            <input type="email" id="cmsAdminEmail" class="cms-input" placeholder="admin@clinic.com" required autocomplete="username">
          </div>
          <div class="cms-form-group">
            <label for="cmsAdminPassword">অ্যাডমিন পাসওয়ার্ড</label>
            <input type="password" id="cmsAdminPassword" class="cms-input" placeholder="••••••••" required autocomplete="current-password">
          </div>
          <div id="cmsLoginError" class="cms-error-msg" style="display:none;"></div>
          <div class="cms-modal-footer" style="padding-inline: 0; padding-bottom: 0;">
            <button type="button" class="btn-cms-secondary" onclick="document.getElementById('${modalId}').classList.remove('active')">বাতিল</button>
            <button type="submit" class="btn-cms-primary" id="cmsLoginSubmitBtn">
              <i class="fas fa-sign-in-alt"></i> লগইন করুন
            </button>
          </div>
        </form>
      </div>
    `;

    modal.classList.add('active');

    const form = document.getElementById('cmsLoginForm');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('cmsAdminEmail').value.trim();
      const password = document.getElementById('cmsAdminPassword').value;
      const errorBox = document.getElementById('cmsLoginError');
      const submitBtn = document.getElementById('cmsLoginSubmitBtn');

      errorBox.style.display = 'none';
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> যাচাই করা হচ্ছে...';

      try {
        const res = await fetch(`${window.LUCKY_API_BASE_URL}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ email, password })
        });

        const data = await res.json();

        if (res.ok) {
          if (data.token && window.LuckyAuth) {
            window.LuckyAuth.setToken(data.token);
          }
          modal.classList.remove('active');
          enableEditMode();
          if (window.showToast) window.showToast('অ্যাডমিন সম্পাদনা মোড সক্রিয় হয়েছে', 'success');
        } else {
          errorBox.textContent = data.error || 'ভুল ক্রেডেনশিয়াল। অনুগ্রহ করে পুনরায় চেষ্টা করুন।';
          errorBox.style.display = 'block';
        }
      } catch (err) {
        errorBox.textContent = 'সার্ভারের সাথে যোগাযোগ করা সম্ভব হয়নি। অনুগ্রহ করে backend চালু আছে কিনা নিশ্চিত করুন।';
        errorBox.style.display = 'block';
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> লগইন করুন';
      }
    });
  }

  // --------------------------------------------------------------------------
  // 3. EDIT MODE CONTROLS
  // --------------------------------------------------------------------------
  function enableEditMode() {
    isEditModeActive = true;
    document.body.classList.add('cms-edit-mode-active');

    // Create or show Admin Top Bar
    let topBar = document.getElementById('cmsAdminTopBar');
    if (!topBar) {
      topBar = document.createElement('div');
      topBar.id = 'cmsAdminTopBar';
      topBar.className = 'cms-admin-topbar';
      topBar.innerHTML = `
        <div class="cms-topbar-inner">
          <div class="cms-topbar-brand">
            <span class="cms-live-badge"><i class="fas fa-circle"></i> সম্পাদনা মোড</span>
            <span class="cms-change-counter" id="cmsChangeCounter">কোন পরিবর্তন নেই</span>
          </div>
          <div class="cms-topbar-actions">
            <button type="button" class="btn-cms-discard" id="cmsDiscardBtn" style="display:none;">
              <i class="fas fa-undo"></i> বাতিল
            </button>
            <button type="button" class="btn-cms-save" id="cmsSaveAllBtn" disabled>
              <i class="fas fa-save"></i> পরিবর্তন সংরক্ষণ করুন
            </button>
            <button type="button" class="btn-cms-logout" id="cmsLogoutBtn" title="লগআউট">
              <i class="fas fa-sign-out-alt"></i> প্রস্থান
            </button>
          </div>
        </div>
      `;
      document.body.prepend(topBar);

      document.getElementById('cmsSaveAllBtn')?.addEventListener('click', saveAllPendingChanges);
      document.getElementById('cmsDiscardBtn')?.addEventListener('click', discardPendingChanges);
      document.getElementById('cmsLogoutBtn')?.addEventListener('click', logoutAdmin);
    } else {
      topBar.style.display = 'block';
    }

    attachEditableListeners();

    if (window.LuckyEstimator && typeof window.LuckyEstimator.refresh === 'function') {
      window.LuckyEstimator.refresh();
    }
  }

  function disableEditMode() {
    isEditModeActive = false;
    document.body.classList.remove('cms-edit-mode-active');
    const topBar = document.getElementById('cmsAdminTopBar');
    if (topBar) topBar.style.display = 'none';

    document.querySelectorAll('.cms-edit-trigger').forEach((btn) => btn.remove());

    if (window.LuckyEstimator && typeof window.LuckyEstimator.refresh === 'function') {
      window.LuckyEstimator.refresh();
    }
  }

  function attachEditableListeners() {
    // 1. Text elements
    const editableTextNodes = document.querySelectorAll('[data-cms-key]');
    editableTextNodes.forEach((el) => {
      if (el.querySelector('.cms-edit-trigger')) return;

      el.classList.add('cms-editable-target');
      const trigger = document.createElement('button');
      trigger.type = 'button';
      trigger.className = 'cms-edit-trigger';
      trigger.title = 'লেখা সম্পাদনা করুন';
      trigger.innerHTML = '<i class="fas fa-pen"></i>';

      trigger.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        openTextEditorModal(el);
      });

      el.appendChild(trigger);
    });

    // 2. Image elements
    const editableImgNodes = document.querySelectorAll('[data-cms-img]');
    editableImgNodes.forEach((img) => {
      const parent = img.parentElement;
      if (parent && !parent.querySelector('.cms-img-trigger')) {
        parent.classList.add('cms-img-container-relative');
        const trigger = document.createElement('button');
        trigger.type = 'button';
        trigger.className = 'cms-edit-trigger cms-img-trigger';
        trigger.title = 'ছবি পরিবর্তন করুন';
        trigger.innerHTML = '<i class="fas fa-camera"></i> ছবি পরিবর্তন';

        trigger.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          openImageEditorModal(img);
        });

        parent.appendChild(trigger);
      }
    });
  }

  function openTextEditorModal(targetEl) {
    const key = targetEl.getAttribute('data-cms-key');
    const label = targetEl.getAttribute('data-cms-label') || key;
    const currentValue = targetEl.childNodes[0]?.nodeValue?.trim() || targetEl.textContent.replace('লেখা সম্পাদনা করুন', '').trim();
    const isMultiline = targetEl.tagName === 'P' || currentValue.length > 80;

    const modalId = 'luckyTextEditModal';
    let modal = document.getElementById(modalId);
    if (!modal) {
      modal = document.createElement('div');
      modal.id = modalId;
      modal.className = 'cms-modal-backdrop';
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div class="cms-modal-box">
        <div class="cms-modal-header">
          <h3><i class="fas fa-edit"></i> বিষয়বস্তু সম্পাদনা: <span style="font-size:0.85em;color:var(--brand-muted);">${label}</span></h3>
          <button type="button" class="cms-close-btn" onclick="document.getElementById('${modalId}').classList.remove('active')">&times;</button>
        </div>
        <div class="cms-modal-body">
          <div class="cms-form-group">
            <label>বাংলা বিষয়বস্তু</label>
            ${
              isMultiline
                ? `<textarea id="cmsModalTextInput" class="cms-input cms-textarea" rows="5">${currentValue}</textarea>`
                : `<input type="text" id="cmsModalTextInput" class="cms-input" value="${currentValue}">`
            }
          </div>
        </div>
        <div class="cms-modal-footer">
          <button type="button" class="btn-cms-secondary" onclick="document.getElementById('${modalId}').classList.remove('active')">বাতিল</button>
          <button type="button" class="btn-cms-primary" id="cmsModalTextSaveBtn">প্রয়োগ করুন</button>
        </div>
      </div>
    `;

    modal.classList.add('active');

    document.getElementById('cmsModalTextSaveBtn')?.addEventListener('click', () => {
      const newVal = document.getElementById('cmsModalTextInput').value.trim();
      if (newVal !== currentValue) {
        // Update DOM text directly without removing button
        const firstText = Array.from(targetEl.childNodes).find(n => n.nodeType === Node.TEXT_NODE);
        if (firstText) {
          firstText.nodeValue = newVal + ' ';
        } else {
          targetEl.childNodes[0].textContent = newVal;
        }

        pendingChanges.set(key, newVal);
        updatePendingCounter();
      }
      modal.classList.remove('active');
    });
  }

  function openImageEditorModal(imgEl) {
    const key = imgEl.getAttribute('data-cms-img');
    const currentSrc = imgEl.getAttribute('src');

    const modalId = 'luckyImgEditModal';
    let modal = document.getElementById(modalId);
    if (!modal) {
      modal = document.createElement('div');
      modal.id = modalId;
      modal.className = 'cms-modal-backdrop';
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div class="cms-modal-box">
        <div class="cms-modal-header">
          <h3><i class="fas fa-image"></i> ছবি পরিবর্তন করুন</h3>
          <button type="button" class="cms-close-btn" onclick="document.getElementById('${modalId}').classList.remove('active')">&times;</button>
        </div>
        <div class="cms-modal-body">
          <div class="cms-form-group">
            <label>ছবির পাথ বা URL</label>
            <input type="text" id="cmsImgPathInput" class="cms-input" value="${currentSrc}">
            <p style="font-size:0.8rem;color:var(--brand-muted);margin-top:5px;">উদা: lucky_image/image_front.jpg বা অনলাইন ছবির পূর্ণাঙ্গ লিঙ্ক</p>
          </div>
          <div class="cms-img-preview-box">
            <img id="cmsModalImgPreview" src="${currentSrc}" alt="Preview" style="max-height:160px;max-width:100%;border-radius:8px;object-fit:cover;">
          </div>
        </div>
        <div class="cms-modal-footer">
          <button type="button" class="btn-cms-secondary" onclick="document.getElementById('${modalId}').classList.remove('active')">বাতিল</button>
          <button type="button" class="btn-cms-primary" id="cmsModalImgSaveBtn">প্রয়োগ করুন</button>
        </div>
      </div>
    `;

    modal.classList.add('active');

    const input = document.getElementById('cmsImgPathInput');
    const preview = document.getElementById('cmsModalImgPreview');
    input.addEventListener('input', () => {
      preview.src = input.value.trim();
    });

    document.getElementById('cmsModalImgSaveBtn')?.addEventListener('click', () => {
      const newSrc = input.value.trim();
      if (newSrc && newSrc !== currentSrc) {
        imgEl.setAttribute('src', newSrc);
        pendingChanges.set(key, newSrc);
        updatePendingCounter();
      }
      modal.classList.remove('active');
    });
  }

  function updatePendingCounter() {
    const counter = document.getElementById('cmsChangeCounter');
    const saveBtn = document.getElementById('cmsSaveAllBtn');
    const discardBtn = document.getElementById('cmsDiscardBtn');

    if (!counter || !saveBtn) return;

    if (pendingChanges.size > 0) {
      counter.textContent = `${window.toBengaliNumerals ? window.toBengaliNumerals(pendingChanges.size) : pendingChanges.size}টি পরিবর্তন অপেক্ষমাণ`;
      counter.classList.add('has-changes');
      saveBtn.disabled = false;
      if (discardBtn) discardBtn.style.display = 'inline-flex';
    } else {
      counter.textContent = 'কোন পরিবর্তন নেই';
      counter.classList.remove('has-changes');
      saveBtn.disabled = true;
      if (discardBtn) discardBtn.style.display = 'none';
    }
  }

  async function saveAllPendingChanges() {
    if (pendingChanges.size === 0) return;

    const saveBtn = document.getElementById('cmsSaveAllBtn');
    const originalHtml = saveBtn.innerHTML;
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> সংরক্ষণ হচ্ছে...';

    const payload = {};
    pendingChanges.forEach((val, key) => {
      payload[key] = val;
    });

    const token = window.LuckyAuth?.getToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const res = await fetch(`${window.LUCKY_API_BASE_URL}/api/admin/site-content/batch`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ items: payload })
      });

      if (res.ok) {
        pendingChanges.clear();
        updatePendingCounter();
        if (window.showToast) window.showToast('সকল পরিবর্তন সফলভাবে সংরক্ষিত হয়েছে!', 'success');
      } else {
        const errData = await res.json();
        alert(errData.error || 'সংরক্ষণ ব্যর্থ হয়েছে');
      }
    } catch (err) {
      alert('সার্ভারের সাথে সংযোগ স্থাপন করা যায়নি।');
    } finally {
      saveBtn.disabled = pendingChanges.size === 0;
      saveBtn.innerHTML = originalHtml;
    }
  }

  function discardPendingChanges() {
    if (pendingChanges.size === 0) return;
    if (!confirm('আপনি কি অপেক্ষমাণ সকল পরিবর্তন বাতিল করতে চান?')) return;
    pendingChanges.clear();
    updatePendingCounter();
    applyContentToDOM(currentContent);
  }

  function logoutAdmin() {
    if (window.LuckyAuth) window.LuckyAuth.clearToken();
    try {
      fetch(`${window.LUCKY_API_BASE_URL}/api/auth/logout`, { method: 'POST', credentials: 'include' });
    } catch (e) {}
    disableEditMode();
    if (window.showToast) window.showToast('সফলভাবে লগআউট হয়েছে', 'info');
  }

  // --------------------------------------------------------------------------
  // 4. INITIALIZATION & SHORTCUTS
  // --------------------------------------------------------------------------
  function setupAdminTriggers() {
    // Keyboard shortcut: Ctrl + Shift + E
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'E' || e.key === 'e')) {
        e.preventDefault();
        if (isEditModeActive) {
          disableEditMode();
        } else if (window.LuckyAuth?.isAuthenticated()) {
          enableEditMode();
        } else {
          openAdminLoginModal();
        }
      }
    });

    // Discreet Footer Link
    const editLinks = document.querySelectorAll('.cms-admin-entry-link');
    editLinks.forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        if (isEditModeActive) {
          disableEditMode();
        } else if (window.LuckyAuth?.isAuthenticated()) {
          enableEditMode();
        } else {
          openAdminLoginModal();
        }
      });
    });

    // Auto-resume edit mode if already authenticated in this session
    if (window.LuckyAuth?.isAuthenticated()) {
      enableEditMode();
    }
  }

  // Expose API
  window.LuckyCMS = {
    get isEditMode() {
      return isEditModeActive;
    },
    openLogin: openAdminLoginModal,
    enableEdit: enableEditMode,
    disableEdit: disableEditMode,
    refresh: hydratePublicContent
  };

  // Init
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      hydratePublicContent();
      setupAdminTriggers();
    });
  } else {
    hydratePublicContent();
    setupAdminTriggers();
  }
})();
