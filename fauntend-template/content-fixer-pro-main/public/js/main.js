(function ($) {
    "use strict";

    // Spinner
    var spinner = function () {
        var hide = function () {
            if ($('#spinner').length > 0) $('#spinner').removeClass('show');
        };
        /* Keep the loader on screen until theme/fonts/content are attached, so
           the page never flashes unstyled or half-translated content. */
        if (window.SiteBoot && document.documentElement.classList.contains('site-booting')) {
            document.addEventListener('site-boot:revealed', function () { setTimeout(hide, 1); });
        } else {
            setTimeout(hide, 1);
        }
    };
    spinner();
    
    
    // Initiate the wowjs
    new WOW().init();


    // Sticky Navbar
    $(window).scroll(function () {
        if ($(this).scrollTop() > 300) {
            $('.sticky-top').addClass('shadow-sm').css('top', '0px');
        } else {
            $('.sticky-top').removeClass('shadow-sm').css('top', '-150px');
        }
    });
    
    
    // Back to top button
    $(window).scroll(function () {
        if ($(this).scrollTop() > 100) {
            $('.back-to-top').fadeIn('slow');
        } else {
            $('.back-to-top').fadeOut('slow');
        }
    });
    $('.back-to-top').click(function () {
        $('html, body').animate({scrollTop: 0}, 1500, 'easeInOutExpo');
        return false;
    });


    // Header carousel
    $(".header-carousel").owlCarousel({
        items: 1,
        autoplay: true,
        smartSpeed: 1000,
        loop: true,
        dots: false,
        nav : true,
        navText : [
            '<i class="bi bi-arrow-left"></i>',
            '<i class="bi bi-arrow-right"></i>'
        ]
    });


    // Facts counter
    $('[data-toggle="counter-up"]').counterUp({
        delay: 10,
        time: 2000
    });


    // Testimonials carousel
    $(".testimonial-carousel").owlCarousel({
        autoplay: false,
        smartSpeed: 1000,
        margin: 25,
        loop: true,
        center: true,
        dots: false,
        nav: true,
        navText : [
            '<i class="bi bi-chevron-left"></i>',
            '<i class="bi bi-chevron-right"></i>'
        ],
        responsive: {
            0:{
                items:1
            },
            768:{
                items:2
            },
            992:{
                items:3
            }
        }
    });







































        (function() {
        // premium toast notification
        function heroToast(msg, icon = '✨') {
            let toast = document.createElement('div');
            toast.innerHTML = `<span style="margin-right: 12px; font-size: 18px;">${icon}</span>${msg}`;
            toast.style.position = 'fixed';
            toast.style.bottom = '30px';
            toast.style.left = '50%';
            toast.style.transform = 'translateX(-50%) translateY(20px)';
            toast.style.backgroundColor = '#1e1c19';
            toast.style.color = '#fff3e6';
            toast.style.padding = '14px 28px';
            toast.style.borderRadius = '60px';
            toast.style.fontSize = '14px';
            toast.style.fontWeight = '500';
            toast.style.fontFamily = "'Inter', system-ui, sans-serif";
            toast.style.boxShadow = '0 20px 35px -8px rgba(0,0,0,0.25), 0 0 0 1px rgba(184,134,11,0.3)';
            toast.style.zIndex = '9999';
            toast.style.backdropFilter = 'blur(12px)';
            toast.style.background = 'rgba(0,0,0,0.85)';
            toast.style.border = '1px solid rgba(184,134,11,0.5)';
            toast.style.maxWidth = '85%';
            toast.style.textAlign = 'center';
            toast.style.letterSpacing = '0.3px';
            toast.style.transition = 'all 0.4s cubic-bezier(0.2, 0.9, 0.4, 1.2)';
            toast.style.opacity = '0';
            document.body.appendChild(toast);
            setTimeout(() => {
                toast.style.opacity = '1';
                toast.style.transform = 'translateX(-50%) translateY(0)';
            }, 20);
            setTimeout(() => {
                toast.style.opacity = '0';
                toast.style.transform = 'translateX(-50%) translateY(20px)';
                setTimeout(() => { if(toast.remove) toast.remove(); }, 400);
            }, 2700);
        }





  // # er jaygay contact 
        
        // Buttons events
const btnConsult = document.getElementById('heroBtn1');
const btnLibrary = document.getElementById('heroBtn2');

if (btnConsult) {
    btnConsult.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = 'contact.html';
    });
}

if (btnLibrary) {
    btnLibrary.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = 'contact.html';
    });
}
 // # er jaygay contact 





        // scroll reveal observer
        const revealEls = document.querySelectorAll('.hero35');
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('hero36');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.15, rootMargin: "0px 0px -20px 0px" });
        revealEls.forEach(el => observer.observe(el));
        
        window.addEventListener('load', () => {
            revealEls.forEach(el => {
                const rect = el.getBoundingClientRect();
                if (rect.top < window.innerHeight - 100) {
                    el.classList.add('hero36');
                    observer.unobserve(el);
                }
            });
        });

        // enhanced image interaction: 3D tilt effect on desktop (premium)
        const imgWrap = document.getElementById('heroImgWrap');
        if (imgWrap && window.innerWidth > 880) {
            document.addEventListener('mousemove', (e) => {
                const rect = imgWrap.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;
                const deltaX = (e.clientX - centerX) / 25;
                const deltaY = (e.clientY - centerY) / 25;
                const maxRotate = 8;
                const rotX = Math.min(maxRotate, Math.max(-maxRotate, deltaY));
                const rotY = Math.min(maxRotate, Math.max(-maxRotate, -deltaX));
                imgWrap.style.transform = `perspective(1000px) rotateX(${rotX * 0.6}deg) rotateY(${rotY * 0.6}deg) translateY(-4px)`;
                imgWrap.style.transition = 'transform 0.1s ease-out';
            });
            document.addEventListener('mouseleave', () => {
                imgWrap.style.transform = '';
                imgWrap.style.transition = 'transform 0.4s ease';
            });
        }
        
        // subtle particle effect on image click
        const imgInner = document.querySelector('.hero32');
        if (imgInner) {
            imgInner.addEventListener('click', () => {
                const ripple = document.createElement('div');
                ripple.style.position = 'absolute';
                ripple.style.width = '40px';
                ripple.style.height = '40px';
                ripple.style.borderRadius = '50%';
                ripple.style.background = 'rgba(184,134,11,0.4)';
                ripple.style.top = '50%';
                ripple.style.left = '50%';
                ripple.style.transform = 'translate(-50%, -50%) scale(0)';
                ripple.style.pointerEvents = 'none';
                ripple.style.animation = 'heroRipple 0.6s ease-out forwards';
                imgInner.style.position = 'relative';
                imgInner.appendChild(ripple);
                setTimeout(() => ripple.remove(), 600);
            });
        }
        const styleSheet = document.createElement('style');
        styleSheet.textContent = `@keyframes heroRipple {
            0% { transform: translate(-50%, -50%) scale(0); opacity: 0.7; }
            100% { transform: translate(-50%, -50%) scale(6); opacity: 0; }
        }`;
        document.head.appendChild(styleSheet);
    })();








































    
})(jQuery);

// Local English / Bangla controls — fully local, with no translator branding.
(function localSiteControls() {
    var translations = {
        'Loading...': 'লোড হচ্ছে...', "Dr. Selim's": 'ডা. সেলিমের', 'Cardiac Surgery Services': 'কার্ডিয়াক সার্জারি সেবাসমূহ',
        Home: 'হোম', About: 'পরিচিতি', Services: 'সেবাসমূহ', Gallery: 'গ্যালারি', Contact: 'যোগাযোগ',
        'Video Gallery': 'ভিডিও গ্যালারি', 'Patient Gallery': 'রোগীদের গ্যালারি',
        'Book Appointment': 'অ্যাপয়েন্টমেন্ট নিন', 'Book consultation': 'পরামর্শের সময় নিন',
        'Call for appointment / WhatsApp': 'অ্যাপয়েন্টমেন্ট / হোয়াটসঅ্যাপের জন্য কল করুন',
        'About Us': 'আমাদের সম্পর্কে', 'Contact Us': 'যোগাযোগ করুন', 'Our Services': 'আমাদের সেবাসমূহ',
        'Online Appointment': 'অনলাইন অ্যাপয়েন্টমেন্ট', 'Quick Links': 'দ্রুত লিংক',
        'Surgical Services': 'সার্জিক্যাল সেবাসমূহ', 'Cardiac Services': 'কার্ডিয়াক সেবাসমূহ',
        'Chamber Information': 'চেম্বারের তথ্য', Chamber: 'চেম্বার', Appointment: 'অ্যাপয়েন্টমেন্ট',
        'Our Cardiac Services': 'আমাদের কার্ডিয়াক সেবাসমূহ', 'Our Gallery': 'আমাদের গ্যালারি',
        'About Me': 'আমার সম্পর্কে', 'Core Expertise': 'মূল দক্ষতা',
        'Education & Qualification': 'শিক্ষা ও যোগ্যতা', 'Education & Qualification & Advanced Training': 'শিক্ষা, যোগ্যতা ও উচ্চতর প্রশিক্ষণ',
        'Professional Journey': 'পেশাগত যাত্রা', 'Experience & Advanced Training': 'অভিজ্ঞতা ও উচ্চতর প্রশিক্ষণ',
        'Accepting new patients': 'নতুন রোগী দেখা হচ্ছে', "Bangladesh's 1st MICS VSD Closure": 'বাংলাদেশে প্রথম MICS VSD ক্লোজার',
        "Bangladesh's 1st MICS VSD Closure Surgery": 'বাংলাদেশে প্রথম MICS VSD ক্লোজার সার্জারি',
        'Minimally Invasive Cardiac Surgery By': 'মিনিমালি ইনভেসিভ কার্ডিয়াক সার্জারি',
        'Prof. Dr. Md. Rokonujjaman (Selim)': 'প্রফেসর ডা. মো. রোকনুজ্জামান (সেলিম)',
        'Professor Dr. Md. Rokonujjaman (Selim)': 'প্রফেসর ডা. মো. রোকনুজ্জামান (সেলিম)',
        'Professor & Senior Consultant Cardiac Surgeon at Ibrahim Cardiac Hospital & Research Institute — pioneer of MICS VSD closure in Bangladesh. Precise, minimally invasive, patient-safety first.': 'ইব্রাহিম কার্ডিয়াক হাসপাতাল অ্যান্ড রিসার্চ ইনস্টিটিউটের প্রফেসর ও সিনিয়র কনসালট্যান্ট কার্ডিয়াক সার্জন—বাংলাদেশে MICS VSD ক্লোজারের পথিকৃৎ। নিখুঁত, স্বল্প আক্রমণাত্মক চিকিৎসায় রোগীর নিরাপত্তাই প্রথম।',
        'VSD Closure — 1st in Bangladesh': 'VSD ক্লোজার — বাংলাদেশে প্রথম',
        'Fellow, American College of Surgeons (USA)': 'ফেলো, আমেরিকান কলেজ অব সার্জনস (USA)',
        'International fellowships (Korea • Malaysia • India)': 'আন্তর্জাতিক ফেলোশিপ (কোরিয়া • মালয়েশিয়া • ভারত)',
        'Minimally Invasive Cardiac Surgeon': 'মিনিমালি ইনভেসিভ কার্ডিয়াক সার্জন',
        'Minimally Invasive Cardiac Surgery (MICS)': 'মিনিমালি ইনভেসিভ কার্ডিয়াক সার্জারি (MICS)',
        'Coronary Artery Surgery': 'করোনারি আর্টারি সার্জারি', 'Valve Repair & Replacement': 'ভালভ মেরামত ও প্রতিস্থাপন',
        'Congenital Cardiac Surgery': 'জন্মগত হৃদ্‌রোগের সার্জারি', 'Adult & Pediatric Cardiac Surgery': 'প্রাপ্তবয়স্ক ও শিশু কার্ডিয়াক সার্জারি',
        'MICS VSD Closure': 'MICS VSD ক্লোজার', 'MICS ASD Closure': 'MICS ASD ক্লোজার',
        'Atrial Myxoma Excision': 'এট্রিয়াল মিক্সোমা অপসারণ', 'Post-operative Cardiac ICU Care': 'অপারেশন-পরবর্তী কার্ডিয়াক ICU সেবা',
        'Bachelor of Medicine & Surgery': 'ব্যাচেলর অব মেডিসিন অ্যান্ড সার্জারি', 'Cardiovascular & Thoracic Surgery': 'কার্ডিওভাসকুলার ও থোরাসিক সার্জারি',
        'Medical Registration': 'মেডিকেল নিবন্ধন', 'Registered Medical Practitioner': 'নিবন্ধিত চিকিৎসক',
        'Cardiovascular Surgery': 'কার্ডিওভাসকুলার সার্জারি', 'Fellowships & Professional Membership': 'ফেলোশিপ ও পেশাগত সদস্যপদ',
        'Specialized Training & Workshop': 'বিশেষায়িত প্রশিক্ষণ ও কর্মশালা', 'Career & Training Milestones': 'কর্মজীবন ও প্রশিক্ষণের মাইলফলক',
        Graduation: 'স্নাতক', Fellowship: 'ফেলোশিপ', 'Clinical Fellowship': 'ক্লিনিক্যাল ফেলোশিপ',
        'Registrar / Clinical Fellow': 'রেজিস্ট্রার / ক্লিনিক্যাল ফেলো', 'Research Publication': 'গবেষণা প্রকাশনা',
        'Comparative Clinical Study': 'তুলনামূলক ক্লিনিক্যাল গবেষণা', 'Degrees & Training': 'ডিগ্রি ও প্রশিক্ষণ',
        'Advanced Expertise': 'উচ্চতর দক্ষতা', 'Current Position': 'বর্তমান পদ', 'Professional Affiliation': 'পেশাগত সংযুক্তি',
        'Special Interests': 'বিশেষ আগ্রহ', Consultation: 'পরামর্শ', 'By Appointment': 'অ্যাপয়েন্টমেন্ট সাপেক্ষে',
        'Saturday - Thursday': 'শনিবার - বৃহস্পতিবার', 'Appointment & Consultation': 'অ্যাপয়েন্টমেন্ট ও পরামর্শ',
        'Phone / WhatsApp': 'ফোন / হোয়াটসঅ্যাপ', Phone: 'ফোন', Email: 'ইমেইল', Facebook: 'ফেসবুক', WhatsApp: 'হোয়াটসঅ্যাপ',
        'Call Now': 'এখনই কল করুন', 'Email Us': 'ইমেইল করুন', 'Follow on Facebook': 'ফেসবুকে অনুসরণ করুন',
        'Practice Locations': 'চেম্বারের স্থান', 'Book Online Appointment': 'অনলাইনে অ্যাপয়েন্টমেন্ট নিন',
        'Call for appointment / consultation': 'অ্যাপয়েন্টমেন্ট / পরামর্শের জন্য কল করুন',
        'Internationally Trained Cardiac Surgeon': 'আন্তর্জাতিকভাবে প্রশিক্ষিত কার্ডিয়াক সার্জন',
        'Our Signature': 'আমাদের বিশেষত্ব', 'MICS Cardiac Surgery': 'MICS কার্ডিয়াক সার্জারি',
        'Read More': 'আরও পড়ুন', 'Show Less': 'সংক্ষিপ্ত করুন', 'Learn More': 'আরও জানুন',
        'View Details': 'বিস্তারিত দেখুন', 'View Gallery': 'গ্যালারি দেখুন', 'Send Message': 'বার্তা পাঠান',
        'Full Name': 'পূর্ণ নাম', 'Your Name': 'আপনার নাম', 'Email Address': 'ইমেইল ঠিকানা',
        'Phone Number': 'ফোন নম্বর', Subject: 'বিষয়', Message: 'বার্তা', 'Your Message': 'আপনার বার্তা',
        'All Right Reserved.': 'সর্বস্বত্ব সংরক্ষিত।', 'Designed By': 'ডিজাইন করেছেন',
        'Professor & Senior Consultant, Cardiac Surgeon': 'প্রফেসর ও সিনিয়র কনসালট্যান্ট, কার্ডিয়াক সার্জন',
        'Professor & Senior Consultant, Cardiac Surgery': 'প্রফেসর ও সিনিয়র কনসালট্যান্ট, কার্ডিয়াক সার্জারি',
        'Department of Cardiac Surgery': 'কার্ডিয়াক সার্জারি বিভাগ',
        'Department of Cardiac Surgery, Ibrahim Cardiac Hospital & Research Institute': 'কার্ডিয়াক সার্জারি বিভাগ, ইব্রাহিম কার্ডিয়াক হাসপাতাল অ্যান্ড রিসার্চ ইনস্টিটিউট',
        'Ibrahim Cardiac Hospital & Research Institute, Dhaka': 'ইব্রাহিম কার্ডিয়াক হাসপাতাল অ্যান্ড রিসার্চ ইনস্টিটিউট, ঢাকা',
        'Aortic Valve Replacement': 'এওর্টিক ভালভ প্রতিস্থাপন', 'Mitral Valve Repair & Replacement': 'মাইট্রাল ভালভ মেরামত ও প্রতিস্থাপন',
        'PDA Ligation / Division': 'PDA লাইগেশন / ডিভিশন', 'Cardiac ICU Follow-up': 'কার্ডিয়াক ICU ফলো-আপ',
        'Conventional Cardiac Surgery': 'প্রচলিত কার্ডিয়াক সার্জারি', 'Full Sternotomy': 'পূর্ণ স্টার্নোটমি',
        'General Anaesthesia': 'জেনারেল অ্যানেস্থেশিয়া', 'Longer Recovery': 'দীর্ঘতর সুস্থতার সময়',
        'Patient Safety': 'রোগীর নিরাপত্তা', 'Second Opinion': 'দ্বিতীয় মতামত', 'Follow-up Care': 'ফলো-আপ সেবা',
        'Theme color': 'থিমের রং', 'Choose a color': 'একটি রং বেছে নিন', 'Reset color': 'মূল রং ফিরিয়ে আনুন', 'Close settings': 'সেটিংস বন্ধ করুন', 'Open theme settings': 'থিম সেটিংস খুলুন'
    };
    var phraseTranslations = [
        ['Professor & Senior Consultant', 'প্রফেসর ও সিনিয়র কনসালট্যান্ট'],
        ['Cardiac Surgeon', 'কার্ডিয়াক সার্জন'], ['Cardiac Surgery', 'কার্ডিয়াক সার্জারি'],
        ['Research Institute', 'রিসার্চ ইনস্টিটিউট'], ['Bangladesh', 'বাংলাদেশ'],
        ['Appointment', 'অ্যাপয়েন্টমেন্ট'], ['Consultation', 'পরামর্শ'], ['Services', 'সেবাসমূহ'],
        ['Surgery', 'সার্জারি'], ['Training', 'প্রশিক্ষণ'], ['Research', 'গবেষণা'],
        ['Contact', 'যোগাযোগ'], ['Hospital', 'হাসপাতাল'], ['Dhaka', 'ঢাকা']
    ];
    var originals = new WeakMap();
    var externalDictionary = {};
    var normalizedDictionary = {};
    var reverseDictionary = {};

    function normalizeText(value) {
        return String(value || '').replace(/\s+/g, ' ').trim().toLocaleLowerCase('en');
    }

    function indexDictionary() {
        normalizedDictionary = {};
        reverseDictionary = {};
        Object.keys(translations).forEach(function (english) {
            normalizedDictionary[normalizeText(english)] = translations[english];
            reverseDictionary[normalizeText(translations[english])] = english;
        });
        Object.keys(externalDictionary).forEach(function (english) {
            normalizedDictionary[normalizeText(english)] = externalDictionary[english];
            reverseDictionary[normalizeText(externalDictionary[english])] = english;
        });
    }

    function translatedText(source, language) {
        var trimmed = source.trim();
        if (!trimmed) return source;
        var normalized = normalizeText(trimmed);
        var translated;
        if (language === 'en') {
            translated = reverseDictionary[normalized];
        } else {
            translated = externalDictionary[trimmed] || translations[trimmed] || normalizedDictionary[normalized];
        }
        if (!translated && language === 'bn') {
            translated = trimmed;
            phraseTranslations.forEach(function (pair) { translated = translated.split(pair[0]).join(pair[1]); });
        }
        if (!translated) translated = trimmed;
        return source.replace(trimmed, translated);
    }

    function translatePage(language) {
        var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        var node;
        while ((node = walker.nextNode())) {
            if (!node.parentElement || node.parentElement.closest('script, style, noscript, .theme-settings')) continue;
            /* Text saved from the editor is final — leave it exactly as saved. */
            if (node.parentElement.closest('[data-cms-applied]')) continue;
            var source = originals.get(node);
            if (source === undefined) { source = node.nodeValue; originals.set(node, source); }
            /* English = exactly what the page was written/saved with. Never
               "un-translate" wording back through the dictionary: that silently
               rewrote hand-written text. Only Bangla mode uses the dictionary. */
            if (language === 'en') {
                if (node.nodeValue !== source) node.nodeValue = source;
                continue;
            }
            node.nodeValue = translatedText(source, language);
        }
        document.querySelectorAll('[placeholder], [title], [aria-label], [alt], input[value], button[value]').forEach(function (element) {
            ['placeholder', 'title', 'aria-label', 'alt', 'value'].forEach(function (attribute) {
                var value = element.getAttribute(attribute);
                if (!value) return;
                var key = 'orig' + attribute.replace(/-/g, '').charAt(0).toUpperCase() + attribute.replace(/-/g, '').slice(1);
                if (!element.dataset[key]) element.dataset[key] = value;
                var original = element.dataset[key];
                element.setAttribute(attribute, language === 'en' ? original : translatedText(original, language).trim());
            });
        });
    }

    function applyLanguage(language) {
        var value = language === 'bn' ? 'bn' : 'en';
        document.documentElement.lang = value;
        document.body.classList.toggle('lang-bn', value === 'bn');
        document.querySelectorAll('.language-switcher button').forEach(function (button) {
            var active = button.getAttribute('data-language') === value;
            button.classList.toggle('active', active);
            button.setAttribute('aria-pressed', active ? 'true' : 'false');
        });
        translatePage(value);
        try { localStorage.setItem('site-language', value); } catch (error) { /* storage may be unavailable */ }
    }

    var THEME_COLOR = '#4338CA';
    function applyThemeColor(color) {
        /* Never override a colour already restored by theme-boot.js / the CMS
           settings — that is what caused the initial colour flash. */
        var existing = document.documentElement.style.getPropertyValue('--theme-primary');
        if (existing && existing.trim()) return;
        document.documentElement.style.setProperty('--theme-primary', color);
        document.documentElement.style.setProperty('--bs-primary', color);
    }

    window.switchSiteLanguage = applyLanguage;
    indexDictionary();
    var savedLanguage = 'en';
    try { savedLanguage = localStorage.getItem('site-language') || 'en'; } catch (error) { /* use defaults */ }
    applyThemeColor(THEME_COLOR);
    applyLanguage(savedLanguage);
    if (savedLanguage !== 'bn' && window.SiteBoot) window.SiteBoot.done('lang');

    // Full-site Bangla dictionary (pre-translated, served locally).
    fetch('/js/bn-dictionary.json')
        .then(function (response) { return response.json(); })
        .then(function (data) {
            externalDictionary = data || {};
            indexDictionary();
            applyLanguage(document.documentElement.lang === 'bn' ? 'bn' : 'en');
            if (window.SiteBoot) window.SiteBoot.done('lang');
        })
        .catch(function () { if (window.SiteBoot) window.SiteBoot.done('lang'); });
})();
