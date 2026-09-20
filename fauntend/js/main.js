/**
 * LUCKY DENTAL CARE — OFFICIAL CLIENT JAVASCRIPT
 * ESTD 1982 | 44 YEARS OF EXPERIENCE | SMILE FOR LIFE
 * Production vanilla JS for interactive components, gallery lightbox,
 * appointment modal, FAQ accordion, statistics counter, and mobile menu.
 */

document.addEventListener('DOMContentLoaded', function () {
  'use strict';

  // --------------------------------------------------------------------------
  // 1. STICKY NAVBAR & BACK TO TOP
  // --------------------------------------------------------------------------
  const navbar = document.querySelector('.navbar-wrapper');
  const backToTopBtn = document.getElementById('backToTopBtn');

  function handleScroll() {
    const scrollPos = window.scrollY;

    if (navbar) {
      if (scrollPos > 50) {
        navbar.classList.add('navbar-scrolled');
      } else {
        navbar.classList.remove('navbar-scrolled');
      }
    }

    if (backToTopBtn) {
      if (scrollPos > 400) {
        backToTopBtn.classList.add('visible');
      } else {
        backToTopBtn.classList.remove('visible');
      }
    }
  }

  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();

  if (backToTopBtn) {
    backToTopBtn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // --------------------------------------------------------------------------
  // 2. MOBILE NAVIGATION DRAWER
  // --------------------------------------------------------------------------
  const mobileToggle = document.getElementById('mobileMenuToggle');
  const mobileDrawer = document.getElementById('mobileDrawer');
  const drawerOverlay = document.getElementById('drawerOverlay');
  const drawerCloseBtn = document.getElementById('drawerCloseBtn');
  const drawerLinks = document.querySelectorAll('.drawer-link');

  function openDrawer() {
    if (mobileDrawer && drawerOverlay) {
      mobileDrawer.classList.add('active');
      drawerOverlay.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeDrawer() {
    if (mobileDrawer && drawerOverlay) {
      mobileDrawer.classList.remove('active');
      drawerOverlay.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  if (mobileToggle) {
    mobileToggle.addEventListener('click', openDrawer);
  }

  if (drawerCloseBtn) {
    drawerCloseBtn.addEventListener('click', closeDrawer);
  }

  if (drawerOverlay) {
    drawerOverlay.addEventListener('click', closeDrawer);
  }

  drawerLinks.forEach(function (link) {
    link.addEventListener('click', closeDrawer);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && mobileDrawer && mobileDrawer.classList.contains('active')) {
      closeDrawer();
    }
  });

  // --------------------------------------------------------------------------
  // 3. STATS NUMBER COUNTER ANIMATION (BENGALI NUMERALS)
  // --------------------------------------------------------------------------
  const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  function toBn(num) {
    return num.toString().replace(/\d/g, function(d) {
      return bnDigits[d];
    });
  }

  const statNumbers = document.querySelectorAll('.stat-number[data-target]');

  if ('IntersectionObserver' in window && statNumbers.length > 0) {
    const statsObserver = new IntersectionObserver(
      function (entries, observer) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            const el = entry.target;
            const target = parseInt(el.getAttribute('data-target'), 10);
            const prefix = el.getAttribute('data-prefix') || '';
            const suffix = el.getAttribute('data-suffix') || '';
            const duration = 1600;
            const startTime = performance.now();

            function updateCount(currentTime) {
              const elapsed = currentTime - startTime;
              const progress = Math.min(elapsed / duration, 1);
              const ease = 1 - Math.pow(1 - progress, 4);
              const current = Math.floor(ease * target);

              el.textContent = prefix + toBn(current) + suffix;

              if (progress < 1) {
                requestAnimationFrame(updateCount);
              } else {
                el.textContent = prefix + toBn(target) + suffix;
              }
            }

            requestAnimationFrame(updateCount);
            observer.unobserve(el);
          }
        });
      },
      { threshold: 0.25 }
    );

    statNumbers.forEach(function (stat) {
      statsObserver.observe(stat);
    });
  }

  // --------------------------------------------------------------------------
  // 4. GALLERY CATEGORY FILTER & LIGHTBOX
  // --------------------------------------------------------------------------
  const filterBtns = document.querySelectorAll('.filter-tab-btn');
  const allGalleryItems = document.querySelectorAll('.gallery-card, .gallery-tile');

  // Filter tabs
  filterBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      filterBtns.forEach(function (b) {
        b.classList.remove('active');
      });
      btn.classList.add('active');

      const filterVal = btn.getAttribute('data-filter');

      allGalleryItems.forEach(function (card) {
        const category = card.getAttribute('data-category');
        if (filterVal === 'all' || category === filterVal) {
          card.style.display = '';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });

  // Lightbox
  const lightboxModal = document.getElementById('lightboxModal');
  const lightboxImg = document.getElementById('lightboxImg');
  const lightboxTitle = document.getElementById('lightboxTitle');
  const lightboxCounter = document.getElementById('lightboxCounter');
  const lightboxClose = document.getElementById('lightboxClose');
  const lightboxPrev = document.getElementById('lightboxPrev');
  const lightboxNext = document.getElementById('lightboxNext');
  const lightboxZoom = document.getElementById('lightboxZoom');
  const imgWrapper = document.querySelector('.lightbox-img-wrapper');

  let currentGalleryIndex = 0;
  const galleryItems = [];

  allGalleryItems.forEach(function (card, index) {
    const img = card.querySelector('img');
    if (!img) return;

    const titleEl = card.querySelector('.gallery-caption-title, h4');
    const title = titleEl ? titleEl.textContent.trim() : '';

    const categoryEl = card.querySelector('.gallery-caption-category, p');
    const category = categoryEl ? categoryEl.textContent.trim() : '';

    galleryItems.push({
      src: img.getAttribute('src'),
      alt: img.getAttribute('alt') || '',
      title: title,
      category: category,
    });

    card.addEventListener('click', function () {
      openLightbox(index);
    });
  });

  function openLightbox(index) {
    if (!lightboxModal) return;
    currentGalleryIndex = index;
    updateLightbox();
    lightboxModal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    if (!lightboxModal) return;
    lightboxModal.classList.remove('active');
    if (imgWrapper) imgWrapper.classList.remove('zoomed');
    document.body.style.overflow = '';
  }

  function updateLightbox() {
    const item = galleryItems[currentGalleryIndex];
    if (!item) return;

    if (lightboxImg) {
      lightboxImg.src = item.src;
      lightboxImg.alt = item.alt;
    }
    if (lightboxTitle) {
      lightboxTitle.textContent = item.title;
    }
    if (lightboxCounter) {
      lightboxCounter.textContent = currentGalleryIndex + 1 + ' / ' + galleryItems.length;
    }
    if (imgWrapper) {
      imgWrapper.classList.remove('zoomed');
    }
  }

  function showNextImage() {
    currentGalleryIndex = (currentGalleryIndex + 1) % galleryItems.length;
    updateLightbox();
  }

  function showPrevImage() {
    currentGalleryIndex = (currentGalleryIndex - 1 + galleryItems.length) % galleryItems.length;
    updateLightbox();
  }

  if (lightboxClose) {
    lightboxClose.addEventListener('click', closeLightbox);
  }

  if (lightboxNext) {
    lightboxNext.addEventListener('click', function (e) {
      e.stopPropagation();
      showNextImage();
    });
  }

  if (lightboxPrev) {
    lightboxPrev.addEventListener('click', function (e) {
      e.stopPropagation();
      showPrevImage();
    });
  }

  if (lightboxZoom) {
    lightboxZoom.addEventListener('click', function (e) {
      e.stopPropagation();
      if (imgWrapper) {
        imgWrapper.classList.toggle('zoomed');
      }
    });
  }

  if (lightboxModal) {
    lightboxModal.addEventListener('click', function (e) {
      if (e.target === lightboxModal) {
        closeLightbox();
      }
    });
  }

  // Keyboard navigation for Lightbox
  document.addEventListener('keydown', function (e) {
    if (!lightboxModal || !lightboxModal.classList.contains('active')) return;

    if (e.key === 'Escape') {
      closeLightbox();
    } else if (e.key === 'ArrowRight') {
      showNextImage();
    } else if (e.key === 'ArrowLeft') {
      showPrevImage();
    }
  });

  // Touch swipe support for lightbox on mobile
  let touchStartX = 0;
  let touchEndX = 0;

  if (lightboxModal) {
    lightboxModal.addEventListener(
      'touchstart',
      function (e) {
        touchStartX = e.changedTouches[0].screenX;
      },
      { passive: true }
    );

    lightboxModal.addEventListener(
      'touchend',
      function (e) {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
      },
      { passive: true }
    );
  }

  function handleSwipe() {
    const swipeDist = touchEndX - touchStartX;
    if (Math.abs(swipeDist) > 50) {
      if (swipeDist < 0) {
        showNextImage(); // Swipe left
      } else {
        showPrevImage(); // Swipe right
      }
    }
  }

  // --------------------------------------------------------------------------
  // 5. FAQ ACCORDION
  // --------------------------------------------------------------------------
  const faqItems = document.querySelectorAll('.faq-item');

  faqItems.forEach(function (item) {
    const questionBtn = item.querySelector('.faq-question-btn');
    const answer = item.querySelector('.faq-answer');

    if (questionBtn && answer) {
      questionBtn.addEventListener('click', function () {
        const isActive = item.classList.contains('active');

        // Close all other items
        faqItems.forEach(function (otherItem) {
          if (otherItem !== item) {
            otherItem.classList.remove('active');
            const otherAnswer = otherItem.querySelector('.faq-answer');
            if (otherAnswer) otherAnswer.style.maxHeight = null;
            const otherBtn = otherItem.querySelector('.faq-question-btn');
            if (otherBtn) otherBtn.setAttribute('aria-expanded', 'false');
          }
        });

        // Toggle clicked item
        if (isActive) {
          item.classList.remove('active');
          answer.style.maxHeight = null;
          questionBtn.setAttribute('aria-expanded', 'false');
        } else {
          item.classList.add('active');
          answer.style.maxHeight = answer.scrollHeight + 'px';
          questionBtn.setAttribute('aria-expanded', 'true');
        }
      });
    }
  });

  // Open first FAQ item by default
  if (faqItems.length > 0) {
    const firstItem = faqItems[0];
    const firstBtn = firstItem.querySelector('.faq-question-btn');
    const firstAnswer = firstItem.querySelector('.faq-answer');
    if (firstBtn && firstAnswer) {
      firstItem.classList.add('active');
      firstAnswer.style.maxHeight = firstAnswer.scrollHeight + 'px';
      firstBtn.setAttribute('aria-expanded', 'true');
    }
  }

  // --------------------------------------------------------------------------
  // 6. APPOINTMENT MODAL & BOOKING FORM
  // --------------------------------------------------------------------------
  const appointmentModal = document.getElementById('appointmentModal');
  const appointmentOpenBtns = document.querySelectorAll('.open-appointment-modal');
  const appointmentCloseBtn = document.getElementById('appointmentModalClose');
  const appointmentForm = document.getElementById('appointmentForm');
  const serviceSelect = document.getElementById('serviceSelect');

  function openAppointmentModal(serviceName) {
    if (!appointmentModal) return;
    if (serviceSelect && serviceName) {
      for (let i = 0; i < serviceSelect.options.length; i++) {
        if (serviceSelect.options[i].text.includes(serviceName) || serviceSelect.options[i].value === serviceName) {
          serviceSelect.selectedIndex = i;
          break;
        }
      }
    }
    appointmentModal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeAppointmentModal() {
    if (!appointmentModal) return;
    appointmentModal.classList.remove('active');
    document.body.style.overflow = '';
  }

  appointmentOpenBtns.forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      const serviceName = btn.getAttribute('data-service') || '';
      openAppointmentModal(serviceName);
    });
  });

  if (appointmentCloseBtn) {
    appointmentCloseBtn.addEventListener('click', closeAppointmentModal);
  }

  if (appointmentModal) {
    appointmentModal.addEventListener('click', function (e) {
      if (e.target === appointmentModal) {
        closeAppointmentModal();
      }
    });
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && appointmentModal && appointmentModal.classList.contains('active')) {
      closeAppointmentModal();
    }
  });

  // Form submission handler
  if (appointmentForm) {
    appointmentForm.addEventListener('submit', function (e) {
      e.preventDefault();

      const name = document.getElementById('patientName').value.trim();
      const phone = document.getElementById('patientPhone').value.trim();
      const service = serviceSelect ? serviceSelect.value : '';
      const date = document.getElementById('preferredDate').value;
      const time = document.getElementById('preferredTime').value;
      const note = document.getElementById('patientNote').value.trim();

      if (!name || !phone) {
        alert('অনুগ্রহ করে আপনার নাম এবং মোবাইল নম্বর প্রদান করুন।');
        return;
      }

      // WhatsApp text composition
      let message = `*Lucky Dental Care - অ্যাপয়েন্টমেন্ট অনুরোধ*\n\n`;
      message += `👤 *রোগীর নাম:* ${name}\n`;
      message += `📱 *মোবাইল নম্বর:* ${phone}\n`;
      if (service) message += `🦷 *সেবার ধরন:* ${service}\n`;
      if (date) message += `📅 *পছন্দের তারিখ:* ${date}\n`;
      if (time) message += `⏰ *পছন্দের সময়:* ${time}\n`;
      if (note) message += `📝 *বিবরণ:* ${note}\n`;

      const encodedMsg = encodeURIComponent(message);
      const whatsappUrl = `https://wa.me/8801715917834?text=${encodedMsg}`;

      // Confirmation UI
      const modalBox = appointmentForm.closest('.modal-content-box');
      if (modalBox) {
        modalBox.innerHTML = `
          <div style="text-align: center; padding: 25px 10px;">
            <div style="width: 72px; height: 72px; background: #fdf2f4; color: #941324; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px auto; font-size: 2rem;">
              ✓
            </div>
            <h3 style="font-size: 1.6rem; color: #0f172a; margin-bottom: 12px;">ধন্যবাদ, ${name}!</h3>
            <p style="font-size: 1.05rem; color: #475569; line-height: 1.8; margin-bottom: 25px;">
              আপনার অ্যাপয়েন্টমেন্টের তথ্য প্রস্তুত করা হয়েছে। দ্রুততম কনফার্মেশনের জন্য সরাসরি হোয়াটসঅ্যাপে প্রেরণ করুন অথবা আমাদের নাম্বারে কল করুন।
            </p>
            <div style="display: flex; flex-direction: column; gap: 12px; max-width: 320px; margin: 0 auto;">
              <a href="${whatsappUrl}" target="_blank" rel="noopener noreferrer" class="btn-primary-red" style="width: 100%;">
                হোয়াটসঅ্যাপে নিশ্চিত করুন
              </a>
              <a href="tel:01715917834" class="btn-secondary-white" style="width: 100%;">
                সরাসরি কল করুন: ০১৭১৫-৯১৭৮৩৪
              </a>
              <button type="button" id="closeSuccessBtn" class="btn-outline-red" style="margin-top: 10px; width: 100%;">
                বন্ধ করুন
              </button>
            </div>
          </div>
        `;

        const closeSuccess = document.getElementById('closeSuccessBtn');
        if (closeSuccess) {
          closeSuccess.addEventListener('click', closeAppointmentModal);
        }
      }
    });
  }

  // --------------------------------------------------------------------------
  // 7. MULTI-PAGE ACTIVE NAVIGATION & PAGE TRANSITION
  // --------------------------------------------------------------------------
  document.body.classList.add('page-fade-in');

  function setActiveNavigation() {
    const pathname = window.location.pathname;
    let filename = pathname.substring(pathname.lastIndexOf('/') + 1) || 'index.html';
    if (!filename.includes('.html')) filename = 'index.html';

    const allNavLinks = document.querySelectorAll('.nav-link, .drawer-link');
    allNavLinks.forEach(function (link) {
      const href = link.getAttribute('href');
      if (!href) return;
      const cleanHref = href.split('?')[0].split('#')[0];
      if (cleanHref === filename || (filename === 'index.html' && (cleanHref === './' || cleanHref === 'index.html' || cleanHref === ''))) {
        link.classList.add('active');
      } else if (cleanHref.endsWith('.html')) {
        link.classList.remove('active');
      }
    });
  }

  setActiveNavigation();

  // Smooth subtle exit transition for internal multi-page links
  document.addEventListener('click', function (e) {
    const link = e.target.closest('a');
    if (!link) return;

    const href = link.getAttribute('href');
    const target = link.getAttribute('target');

    if (
      !href ||
      href.startsWith('#') ||
      href.startsWith('javascript:') ||
      href.startsWith('tel:') ||
      href.startsWith('mailto:') ||
      href.startsWith('https://wa.me') ||
      href.includes('google.com/maps') ||
      href.includes('facebook.com') ||
      target === '_blank' ||
      e.metaKey ||
      e.ctrlKey ||
      e.shiftKey ||
      e.altKey ||
      e.button !== 0
    ) {
      return;
    }

    if (href.endsWith('.html') || href === './' || href === '/') {
      e.preventDefault();
      document.body.classList.add('page-fading-out');
      setTimeout(function () {
        window.location.href = href;
      }, 160);
    }
  });
});

