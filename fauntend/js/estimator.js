/**
 * Lucky Dental Care — Dental Treatment Price Estimator
 * Real-time instant sum calculation, multi-select service selector,
 * Bengali formatting, medical disclaimers, and secure admin price management.
 */

(function () {
  'use strict';

  // Fallback treatment dataset if API is offline
  const FALLBACK_TREATMENTS = [
    {
      _id: 't-1',
      name: 'দাঁত পরিষ্কার ও স্কেলিং (সম্পূর্ণ মুখ)',
      category: 'সাধারণ ডেন্টাল সেবা',
      price: 1000,
      description: 'আল্ট্রাসনিক স্কেলারের সাহায্যে দাঁতের পাথর, প্লাক ও দাগ দূরীকরণ',
      active: true
    },
    {
      _id: 't-2',
      name: 'দাঁতের স্থায়ী ফিলিং (কম্পোজিট / লেজার)',
      category: 'সাধারণ ডেন্টাল সেবা',
      price: 1200,
      description: 'দাঁতের স্বাভাবিক রঙের সাথে মিলিয়ে নান্দনিক ও টেকসই ফিলিং',
      active: true
    },
    {
      _id: 't-3',
      name: 'রুট ক্যানাল চিকিৎসা (প্রতি দাঁত)',
      category: 'সার্জারি ও রুট ক্যানাল',
      price: 3500,
      description: 'ব্যথাহীন আধুনিক প্রযুক্তিতে স্নায়ু পরিষ্কার ও জীবাণুমুক্তকরণ',
      active: true
    },
    {
      _id: 't-4',
      name: 'দাঁতের পোরসেলিন ক্যাপ ও ক্রাউন',
      category: 'কসমেটিক ও ক্রাউন',
      price: 3000,
      description: 'উচ্চমানের দীর্ঘস্থায়ী ধাতব-পোরসেলিন ডেন্টাল ক্যাপ',
      active: true
    },
    {
      _id: 't-5',
      name: 'জিরকোনিয়া প্রিমিয়াম ক্রাউন (সিরামিক)',
      category: 'কসমেটিক ও ক্রাউন',
      price: 6000,
      description: 'প্রাকৃতিক দাঁতের নিখুঁত প্রতিচ্ছবি ও সর্বোচ্চ স্থায়িত্ব',
      active: true
    },
    {
      _id: 't-6',
      name: 'সহজ দাঁত তোলা (এক্সট্রাকশন)',
      category: 'সাধারণ ডেন্টাল সেবা',
      price: 800,
      description: 'জীবাণুমুক্ত পরিবেশে নিরাপদ ও ব্যথাহীন দাঁত অপসারণ',
      active: true
    },
    {
      _id: 't-7',
      name: 'আক্কেল দাঁত সার্জিক্যাল অপারেশন',
      category: 'সার্জারি ও রুট ক্যানাল',
      price: 4500,
      description: 'মাড়ির ভেতরে আটকে থাকা আঁকা-বাঁকা দাঁতের মাইনর সার্জারি',
      active: true
    },
    {
      _id: 't-8',
      name: 'দাঁত সাদা ও উজ্জ্বলকরণ (ব্লিচিং)',
      category: 'কসমেটিক ডেন্টিস্ট্রি',
      price: 5000,
      description: 'কসমেটিক স্মাইল ব্রাইটেনিং ট্রিটমেন্ট',
      active: true
    }
  ];

  let treatmentsList = [];
  const selectedTreatments = new Map();

  async function fetchTreatments() {
    try {
      const apiUrl = `${window.LUCKY_API_BASE_URL}/api/price-estimator`;
      const res = await fetch(apiUrl, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data && Array.isArray(data.items) && data.items.length > 0) {
        treatmentsList = data.items;
      } else {
        treatmentsList = FALLBACK_TREATMENTS;
      }
    } catch (err) {
      console.warn('API unavailable, using bundled treatments dataset:', err.message);
      treatmentsList = FALLBACK_TREATMENTS;
    }
    renderEstimator();
  }

  function renderEstimator() {
    const listContainer = document.getElementById('estimatorTreatmentsList');
    if (!listContainer) return;

    listContainer.innerHTML = '';

    treatmentsList.forEach((item) => {
      const isChecked = selectedTreatments.has(item._id || item.name);

      const card = document.createElement('label');
      card.className = `estimator-option-card ${isChecked ? 'selected' : ''}`;
      card.setAttribute('data-id', item._id || item.name);

      card.innerHTML = `
        <div class="estimator-option-main">
          <div class="estimator-checkbox-custom">
            <input type="checkbox" class="treatment-checkbox" value="${item._id || item.name}" ${isChecked ? 'checked' : ''}>
            <span class="checkbox-tick"><i class="fas fa-check"></i></span>
          </div>
          <div class="estimator-option-info">
            <span class="estimator-option-cat">${item.category || 'সাধারণ সেবা'}</span>
            <h4 class="estimator-option-name">${item.name}</h4>
            ${item.description ? `<p class="estimator-option-desc">${item.description}</p>` : ''}
          </div>
        </div>
        <div class="estimator-option-price-box">
          <span class="estimator-price-tag">${window.formatBDT ? window.formatBDT(item.price) : `৳ ${item.price}`}</span>
          ${window.LuckyCMS && window.LuckyCMS.isEditMode ? `
            <div class="estimator-admin-actions" onclick="event.preventDefault(); event.stopPropagation();">
              <button type="button" class="btn-cms-icon edit-price-btn" title="সম্পাদনা করুন" data-id="${item._id}"><i class="fas fa-edit"></i></button>
              <button type="button" class="btn-cms-icon delete-price-btn" title="মুছে ফেলুন" data-id="${item._id}"><i class="fas fa-trash-alt"></i></button>
            </div>
          ` : ''}
        </div>
      `;

      // Event listener for toggle
      const checkbox = card.querySelector('.treatment-checkbox');
      checkbox.addEventListener('change', function () {
        if (this.checked) {
          selectedTreatments.set(item._id || item.name, item);
          card.classList.add('selected');
        } else {
          selectedTreatments.delete(item._id || item.name);
          card.classList.remove('selected');
        }
        updateCalculationDisplay();
      });

      // Admin button listeners
      const editBtn = card.querySelector('.edit-price-btn');
      if (editBtn) {
        editBtn.addEventListener('click', () => openEditPriceModal(item));
      }
      const deleteBtn = card.querySelector('.delete-price-btn');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', () => confirmDeletePrice(item));
      }

      listContainer.appendChild(card);
    });

    updateCalculationDisplay();
    renderAdminEstimatorControls();
  }

  function updateCalculationDisplay() {
    const summaryList = document.getElementById('estimatorSelectedList');
    const emptyState = document.getElementById('estimatorEmptyState');
    const totalBox = document.getElementById('estimatorTotalBox');
    const totalAmount = document.getElementById('estimatorTotalAmount');
    const countBadge = document.getElementById('estimatorSelectedCount');
    const proceedBtn = document.getElementById('estimatorProceedBtn');

    if (!summaryList || !totalAmount) return;

    if (selectedTreatments.size === 0) {
      if (emptyState) emptyState.style.display = 'block';
      if (totalBox) totalBox.style.display = 'none';
      summaryList.innerHTML = '';
      if (countBadge) countBadge.textContent = '০';
      if (proceedBtn) proceedBtn.style.display = 'none';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';
    if (totalBox) totalBox.style.display = 'flex';
    if (proceedBtn) proceedBtn.style.display = 'inline-flex';

    let total = 0;
    summaryList.innerHTML = '';

    selectedTreatments.forEach((item) => {
      total += Number(item.price) || 0;
      const row = document.createElement('div');
      row.className = 'estimator-summary-row';
      row.innerHTML = `
        <span class="summary-name"><i class="fas fa-check-circle"></i> ${item.name}</span>
        <span class="summary-val">${window.formatBDT ? window.formatBDT(item.price) : `৳ ${item.price}`}</span>
      `;
      summaryList.appendChild(row);
    });

    totalAmount.textContent = window.formatBDT ? window.formatBDT(total) : `৳ ${total}`;
    if (countBadge) countBadge.textContent = window.toBengaliNumerals ? window.toBengaliNumerals(selectedTreatments.size) : selectedTreatments.size;

    if (proceedBtn) {
      proceedBtn.onclick = function () {
        const selectedNames = Array.from(selectedTreatments.values()).map(i => i.name).join(', ');
        try {
          sessionStorage.setItem('lucky_estimated_services', selectedNames);
          sessionStorage.setItem('lucky_estimated_total', total.toString());
        } catch (e) {}
        window.location.href = `appointment.html?services=${encodeURIComponent(selectedNames)}&cost=${total}`;
      };
    }
  }

  // Admin Price Controls
  function renderAdminEstimatorControls() {
    const container = document.getElementById('estimatorAdminToolbar');
    if (!container) return;

    if (window.LuckyCMS && window.LuckyCMS.isEditMode) {
      container.style.display = 'flex';
      container.innerHTML = `
        <button type="button" class="btn-admin-add-price" id="btnAddNewPriceItem">
          <i class="fas fa-plus-circle"></i> নতুন সেবা ও মূল্য যোগ করুন
        </button>
      `;
      document.getElementById('btnAddNewPriceItem')?.addEventListener('click', () => openEditPriceModal(null));
    } else {
      container.style.display = 'none';
    }
  }

  function openEditPriceModal(item) {
    const isNew = !item;
    const modalId = 'luckyPriceModal';
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
          <h3><i class="fas ${isNew ? 'fa-plus-circle' : 'fa-edit'}"></i> ${isNew ? 'নতুন সেবা যোগ করুন' : 'সেবা ও মূল্য সম্পাদনা'}</h3>
          <button type="button" class="cms-close-btn" onclick="document.getElementById('${modalId}').classList.remove('active')">&times;</button>
        </div>
        <div class="cms-modal-body">
          <div class="cms-form-group">
            <label>সেবার নাম *</label>
            <input type="text" id="priceItemName" value="${item ? item.name : ''}" placeholder="উদা: দাঁত স্কেলিং ও পলিশিং" class="cms-input">
          </div>
          <div class="cms-form-group">
            <label>আনুমানিক মূল্য (টাকা) *</label>
            <input type="number" id="priceItemPrice" value="${item ? item.price : ''}" placeholder="1200" min="0" class="cms-input">
          </div>
          <div class="cms-form-group">
            <label>ক্যাটাগরি</label>
            <select id="priceItemCategory" class="cms-input">
              <option value="সাধারণ ডেন্টাল সেবা" ${item && item.category === 'সাধারণ ডেন্টাল সেবা' ? 'selected' : ''}>সাধারণ ডেন্টাল সেবা</option>
              <option value="সার্জারি ও রুট ক্যানাল" ${item && item.category === 'সার্জারি ও রুট ক্যানাল' ? 'selected' : ''}>সার্জারি ও রুট ক্যানাল</option>
              <option value="কসমেটিক ও ক্রাউন" ${item && item.category === 'কসমেটিক ও ক্রাউন' ? 'selected' : ''}>কসমেটিক ও ক্রাউন</option>
              <option value="কসমেটিক ডেন্টিস্ট্রি" ${item && item.category === 'কসমেটিক ডেন্টিস্ট্রি' ? 'selected' : ''}>কসমেটিক ডেন্টিস্ট্রি</option>
            </select>
          </div>
          <div class="cms-form-group">
            <label>সংক্ষিপ্ত বিবরণ</label>
            <input type="text" id="priceItemDesc" value="${item && item.description ? item.description : ''}" placeholder="চিকিৎসা সংক্রান্ত এক লাইনের তথ্য" class="cms-input">
          </div>
        </div>
        <div class="cms-modal-footer">
          <button type="button" class="btn-cms-secondary" onclick="document.getElementById('${modalId}').classList.remove('active')">বাতিল</button>
          <button type="button" class="btn-cms-primary" id="savePriceItemBtn">সংরক্ষণ করুন</button>
        </div>
      </div>
    `;

    modal.classList.add('active');

    document.getElementById('savePriceItemBtn')?.addEventListener('click', async () => {
      const name = document.getElementById('priceItemName').value.trim();
      const price = Number(document.getElementById('priceItemPrice').value);
      const category = document.getElementById('priceItemCategory').value;
      const description = document.getElementById('priceItemDesc').value.trim();

      if (!name) {
        alert('সেবার নাম প্রদান করুন');
        return;
      }
      if (isNaN(price) || price < 0) {
        alert('সঠিক ইতিবাচক মূল্য প্রদান করুন');
        return;
      }

      const token = window.LuckyAuth?.getToken();
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      try {
        let res;
        if (isNew) {
          res = await fetch(`${window.LUCKY_API_BASE_URL}/api/admin/price-estimator`, {
            method: 'POST',
            headers,
            credentials: 'include',
            body: JSON.stringify({ name, price, category, description, active: true })
          });
        } else {
          res = await fetch(`${window.LUCKY_API_BASE_URL}/api/admin/price-estimator/${item._id}`, {
            method: 'PATCH',
            headers,
            credentials: 'include',
            body: JSON.stringify({ name, price, category, description })
          });
        }

        if (res.ok) {
          modal.classList.remove('active');
          if (window.showToast) window.showToast('মূল্য তালিকা আপডেট করা হয়েছে', 'success');
          await fetchTreatments();
        } else {
          const err = await res.json();
          alert(err.error || 'সংরক্ষণ ব্যর্থ হয়েছে');
        }
      } catch (e) {
        alert('সার্ভারের সাথে যোগাযোগ করা সম্ভব হয়নি');
      }
    });
  }

  async function confirmDeletePrice(item) {
    if (!confirm(`আপনি কি নিশ্চিত যে "${item.name}" সেবাটি মূল্য তালিকা থেকে মুছে ফেলতে চান?`)) {
      return;
    }

    const token = window.LuckyAuth?.getToken();
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const res = await fetch(`${window.LUCKY_API_BASE_URL}/api/admin/price-estimator/${item._id}`, {
        method: 'DELETE',
        headers,
        credentials: 'include'
      });
      if (res.ok) {
        if (window.showToast) window.showToast('সেবাটি সফলভাবে মুছে ফেলা হয়েছে', 'info');
        selectedTreatments.delete(item._id || item.name);
        await fetchTreatments();
      } else {
        alert('ডিলিট করা সম্ভব হয়নি');
      }
    } catch (e) {
      alert('সার্ভার ত্রুটি');
    }
  }

  // Public Interface
  window.LuckyEstimator = {
    init: function () {
      fetchTreatments();
    },
    refresh: function () {
      renderEstimator();
    }
  };

  // Auto-init if DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fetchTreatments);
  } else {
    fetchTreatments();
  }
})();
