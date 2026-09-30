const fs = require('fs');

// We have the 12 services defined in scratch/generate_all_services.js
// Let's import or define the array
const services = [
  {
    slug: 'service-gap-filling.html',
    title: 'কসমেটিক দাঁতের ফাঁকা ফিলিং',
    shortTitle: 'দাঁতের ফাঁকা ফিলিং',
    categoryKey: 'cosmetic',
    categoryName: 'কসমেটিক ও স্মাইল',
    metaIcon: 'far fa-clock',
    metaText: '৪০ মিনিট • কসমেটিক',
    priceText: '৫,০০০ ৳',
    imgBefore: '/img/service-gap-filling-before.webp',
    imgAfter: '/img/service-gap-filling-after.webp',
    cardDesc: 'সামনের দাঁতের দৃশ্যমান ফাঁকা দূর করে প্রাকৃতিক রঙের দীর্ঘস্থায়ী ন্যানো-কম্পোজিট বন্ডিং ও স্মাইল মেকওভার।'
  },
  {
    slug: 'service-root-canal.html',
    title: 'ব্যথাহীন রুট ক্যানাল চিকিৎসা (RCT)',
    shortTitle: 'রুট ক্যানাল চিকিৎসা',
    categoryKey: 'restorative',
    categoryName: 'রিস্টোরেটিভ ও ফিলিং',
    metaIcon: 'far fa-clock',
    metaText: '৪৫ মিনিট • রিস্টোরেটিভ',
    priceText: '৮,০০০ ৳',
    imgBefore: '/img/service-root-canal-before.webp',
    imgAfter: '/img/service-root-canal-after.webp',
    cardDesc: 'ব্যথাহীন আধুনিক রোটারি পদ্ধতিতে ইনফেকশন দূর করে প্রাকৃতিক দাঁতকে না তুলেই আজীবন টিকিয়ে রাখার বিশ্বস্ত চিকিৎসা।'
  },
  {
    slug: 'service-crown.html',
    title: 'সিরামিক ডেন্টাল ক্রাউন ও ক্যাপ',
    shortTitle: 'ডেন্টাল ক্রাউন ও ক্যাপ',
    categoryKey: 'restorative',
    categoryName: 'রিস্টোরেটিভ ও ফিলিং',
    metaIcon: 'far fa-clock',
    metaText: '৪৫ মিনিট • স্থায়ী সুরক্ষা',
    priceText: '৮,০০০ ৳',
    imgBefore: '/img/service-crown-before.webp',
    imgAfter: '/img/service-crown-after.webp',
    cardDesc: 'দুর্বল ও ক্ষয়প্রাপ্ত দাঁতের সুরক্ষায় প্রাকৃতিক রঙের দীর্ঘস্থায়ী পোর্সেলিন ও প্রিমিয়াম জিরকোনিয়া ক্রাউন।'
  },
  {
    slug: 'service-scaling.html',
    title: 'দাঁতের স্কেলিং ও পলিশিং',
    shortTitle: 'স্কেলিং ও পলিশিং',
    categoryKey: 'general',
    categoryName: 'সাধারণ ও প্রতিরোধমূলক',
    metaIcon: 'fas fa-soap',
    metaText: 'হাইজিন • মাড়ি সুরক্ষা',
    priceText: '১,৯৯০ ৳',
    imgBefore: '/img/service-scaling-before.webp',
    imgAfter: '/img/service-scaling-after.webp',
    cardDesc: 'আল্ট্রাসনিক স্কেলারের সাহায্যে দাঁতের পাথর ও দাগ দূর করে মাড়িকে সুস্থ ও মুখের দুর্গন্ধমুক্ত রাখার সেবা।'
  },
  {
    slug: 'service-filling.html',
    title: 'ন্যানো-কম্পোজিট ডেন্টাল ফিলিং',
    shortTitle: 'ন্যানো ডেন্টাল ফিলিং',
    categoryKey: 'restorative',
    categoryName: 'রিস্টোরেটিভ ও ফিলিং',
    metaIcon: 'fas fa-tooth',
    metaText: 'রেস্টোরেশন • ন্যাচারাল লুক',
    priceText: '৩,০০০ ৳',
    imgBefore: '/img/service-filling-before.webp',
    imgAfter: '/img/service-filling-after.webp',
    cardDesc: 'দাঁতের ক্যাভিটি বা ক্ষয় রোধে প্রাকৃতিক দাঁতের রঙের সাথে হুবহু মেলানো দীর্ঘস্থায়ী কম্পোজিট ফিলিং।'
  },
  {
    slug: 'service-braces.html',
    title: 'মেটাল ও সিরামিক ব্রেসিস',
    shortTitle: 'মেটাল ও সিরামিক ব্রেসিস',
    categoryKey: 'surgery',
    categoryName: 'ইমপ্লান্ট ও অর্থোডন্টিক্স',
    metaIcon: 'far fa-clock',
    metaText: 'সহজ কিস্তি • অর্থোডন্টিক্স',
    priceText: '৫০,০০০ ৳',
    imgBefore: '/img/service-braces-before.webp',
    imgAfter: '/img/service-braces-after.webp',
    cardDesc: 'আঁকাবাঁকা ও উঁচুনিচু দাঁত সোজা করে আদর্শ ফেসিয়াল প্রোফাইল ও আত্মবিশ্বাসী হাসি অর্জনের চিকিৎসা।'
  },
  {
    slug: 'service-implants.html',
    title: 'স্থায়ী ডেন্টাল ইমপ্লান্ট',
    shortTitle: 'ডেন্টাল ইমপ্লান্ট',
    categoryKey: 'surgery',
    categoryName: 'ইমপ্লান্ট ও অর্থোডন্টিক্স',
    metaIcon: 'far fa-clock',
    metaText: '৬০ মিনিট • স্থায়ী দাঁত',
    priceText: '৬০,০০০ – ৮০,০০০ ৳',
    imgBefore: '/img/service-implants-before.webp',
    imgAfter: '/img/service-implants-after.webp',
    cardDesc: 'হারিয়ে যাওয়া দাঁতের সবচেয়ে আধুনিক সমাধান—আজীবন প্রাকৃতিক দাঁতের মতো শক্তি ও সৌন্দর্য প্রদানকারী ইমপ্লান্ট।'
  },
  {
    slug: 'service-veneers.html',
    title: 'ডিরেক্ট কম্পোজিট ভিনিয়ার্স',
    shortTitle: 'ডিরেক্ট ভিনিয়ার্স',
    categoryKey: 'cosmetic',
    categoryName: 'কসমেটিক ও স্মাইল',
    metaIcon: 'fas fa-gem',
    metaText: 'পোর্সেলিন লুক • পারফেক্ট হাসি',
    priceText: '৫,০০০ ৳',
    imgBefore: '/img/service-veneers-before.webp',
    imgAfter: '/img/service-veneers-after.webp',
    cardDesc: 'দাঁতের স্থায়ী দাগ ও অসমান আকার দূর করে কাঙ্ক্ষিত সেলিব্রিটি স্মাইল অর্জনের নান্দনিক চিকিৎসা।'
  },
  {
    slug: 'service-invisalign.html',
    title: 'ইনভিজালাইন ক্লিয়ার অ্যালাইনার',
    shortTitle: 'ক্লিয়ার অ্যালাইনার',
    categoryKey: 'cosmetic',
    categoryName: 'কসমেটিক ও স্মাইল',
    metaIcon: 'fas fa-eye-slash',
    metaText: 'সম্পূর্ণ অদৃশ্য • আরামদায়ক',
    priceText: '১,৮০,০০০ ৳',
    imgBefore: '/img/service-invisalign-before.webp',
    imgAfter: '/img/service-invisalign-after.webp',
    cardDesc: 'মেটাল তার ও ব্র্যাকেট ছাড়া দাঁত সোজা করার আধুনিকতম সম্পূর্ণ অদৃশ্য ও আরামদায়ক ডিজিটাল প্রযুক্তি।'
  },
  {
    slug: 'service-smile-design.html',
    title: 'ডিজিটাল স্মাইল ডিজাইন (DSD)',
    shortTitle: 'স্মাইল ডিজাইন (DSD)',
    categoryKey: 'cosmetic',
    categoryName: 'কসমেটিক ও স্মাইল',
    metaIcon: 'fas fa-camera',
    metaText: '৩ডি স্ক্যানিং • গোল্ডেন রেশিও',
    priceText: '২০,০০০ ৳',
    imgBefore: '/img/service-smile-design-before.webp',
    imgAfter: '/img/service-smile-design-after.webp',
    cardDesc: 'চিকিৎসার পূর্বেই ভবিষ্যৎ হাসির ৩ডি ডিজিটাল প্রিভিউ দেখে নিখুঁত গোল্ডেন রেশিওতে পারফেক্ট হাসি অর্জনের সেবা।'
  },
  {
    slug: 'service-whitening.html',
    title: 'লেজার টিথ হোয়াইটেনিং',
    shortTitle: 'লেজার টিথ হোয়াইটেনিং',
    categoryKey: 'cosmetic',
    categoryName: 'কসমেটিক ও স্মাইল',
    metaIcon: 'far fa-clock',
    metaText: '৩০ মিনিট • উজ্জ্বল সাদা হাসি',
    priceText: '১৫,০০০ ৳',
    imgBefore: '/img/service-whitening-before.webp',
    imgAfter: '/img/service-whitening-after.webp',
    cardDesc: 'অত্যাধুনিক ডেন্টাল লেজারের সাহায্যে এনামেলের ক্ষতি না করে মাত্র ৩০ মিনিটে দাঁতকে কয়েক শেড উজ্জ্বল করার সেবা।'
  },
  {
    slug: 'service-pediatric.html',
    title: 'শিশুদের ডেন্টাল কেয়ার',
    shortTitle: 'শিশুদের ডেন্টাল কেয়ার',
    categoryKey: 'general',
    categoryName: 'সাধারণ ও প্রতিরোধমূলক',
    metaIcon: 'fas fa-baby',
    metaText: 'পরম যত্ন • ভীতিহীন পরিবেশ',
    priceText: '১,০০০ ৳',
    imgBefore: '/img/service-pediatric-before.webp',
    imgAfter: '/img/service-pediatric-after.webp',
    cardDesc: 'ভীতিহীন ও শিশুবান্ধব পরিবেশে শিশুদের দুধদাঁতের সুরক্ষা, ফ্লোরাইড থেরাপি ও ক্যাভিটি নিরাময় সেবা।'
  }
];

function renderCard(item) {
  return `        <!-- ${item.title} -->
        <div class="service-card-modern tdc-service-card-item" data-category="${item.categoryKey}" data-reveal="fade-up">
          <div class="service-card-media">
            <img class="service-card-img-before" width="1024" height="731" src="${item.imgBefore}" alt="${item.title} পূর্বে" loading="lazy">
            <img class="service-card-img-after" width="1024" height="731" src="${item.imgAfter}" alt="${item.title} পরে" loading="lazy">
            <span class="service-card-badge">Before / After</span>
            <span class="service-card-category-pill">${item.categoryName}</span>
          </div>
          <div class="service-card-body">
            <div class="service-card-meta">
              <span><i class="${item.metaIcon}"></i> ${item.metaText}</span>
            </div>
            <h3 class="service-card-title">${item.title}</h3>
            <p class="service-card-desc">${item.cardDesc}</p>
            <div class="service-card-footer">
              <div class="service-price">
                <span class="service-price-label">চিকিৎসা খরচ শুরু</span>
                <span class="service-price-value">${item.priceText}</span>
              </div>
              <a href="/${item.slug}" class="service-card-cta">
                বিস্তারিত দেখুন <i class="fas fa-arrow-right"></i>
              </a>
            </div>
          </div>
        </div>`;
}

// 1. UPDATE service.html
const allCardsHtml = `      <div class="services-grid-modern">
${services.map(renderCard).join('\n\n')}
      </div>`;

let serviceContent = fs.readFileSync('service.html', 'utf8');

// Replace the old grid
const startMarker = '<div class="tdc-dental-section-wrapper">';
const endMarker = '<!-- Estimator Promo Banner -->';

const startIndex = serviceContent.indexOf(startMarker);
const endIndex = serviceContent.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
  serviceContent = serviceContent.substring(0, startIndex) + allCardsHtml + '\n\n      ' + serviceContent.substring(endIndex);
  
  // Also update estimator banner gradient to burnt-orange
  serviceContent = serviceContent.replace(
    'linear-gradient(135deg, #941324 0%, #cb0437 100%)',
    'linear-gradient(135deg, #9a3412 0%, #c2410c 100%)'
  );
  serviceContent = serviceContent.replace(
    'rgba(148, 19, 36, 0.22)',
    'rgba(194, 65, 12, 0.25)'
  );
  serviceContent = serviceContent.replace(
    'color: #941324;',
    'color: var(--brand-primary);'
  );

  fs.writeFileSync('service.html', serviceContent, 'utf8');
  console.log('service.html successfully updated with 12 modern service cards and burnt-orange theme!');
} else {
  console.error('Could not find markers in service.html');
}

// 2. UPDATE index.html (Homepage preview: show first 6 services)
let indexContent = fs.readFileSync('index.html', 'utf8');

const previewCardsHtml = `        <div class="services-grid-modern">
${services.slice(0, 6).map(renderCard).join('\n\n')}
        </div>`;

const indexStartMarker = '<div class="tdc-dental-section-wrapper">';
const indexEndMarker = '<div style="text-align: center; margin-top: 36px;" data-reveal="fade-up">';

const iStartIndex = indexContent.indexOf(indexStartMarker);
const iEndIndex = indexContent.indexOf(indexEndMarker);

if (iStartIndex !== -1 && iEndIndex !== -1) {
  indexContent = indexContent.substring(0, iStartIndex) + previewCardsHtml + '\n\n        ' + indexContent.substring(iEndIndex);
  
  // Also update the "সকল ডেন্টাল সেবা বিস্তারিত দেখুন" button style
  indexContent = indexContent.replace(
    '<a href="/service" class="btn-primary-red" style="padding: 13px 32px; font-size: 1.02rem;">',
    '<a href="/service" class="btn-primary-red" style="padding: 13px 32px; font-size: 1.02rem; background: var(--brand-primary); box-shadow: 0 4px 14px rgba(194, 65, 12, 0.25);">'
  );

  fs.writeFileSync('index.html', indexContent, 'utf8');
  console.log('index.html successfully updated with 6 modern preview cards!');
} else {
  console.error('Could not find markers in index.html');
}
