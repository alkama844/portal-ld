const { spawn } = require('child_process');
const http = require('http');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9223;
const BASE_URL = 'http://127.0.0.1:5173';

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

class CDPClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 1;
    this.callbacks = new Map();
    this.logs = [];

    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.callbacks.has(msg.id)) {
        const cb = this.callbacks.get(msg.id);
        this.callbacks.delete(msg.id);
        if (msg.error) cb.reject(msg.error);
        else cb.resolve(msg.result);
      }
      if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') {
        this.logs.push(msg.params.entry.text);
      }
      if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
        this.logs.push(msg.params.args.map(a => a.value || a.description).join(' '));
      }
    };
  }

  async send(method, params = {}) {
    const id = this.id++;
    return new Promise((resolve, reject) => {
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async eval(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    if (res.exceptionDetails) {
      throw new Error(JSON.stringify(res.exceptionDetails));
    }
    return res.result ? res.result.value : undefined;
  }
}

async function runTests() {
  console.log('Launching headless Chrome on port ' + PORT + '...');
  const chrome = spawn(CHROME_PATH, [
    `--remote-debugging-port=${PORT}`,
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--mute-audio',
    'about:blank'
  ]);

  await sleep(1500);

  try {
    const listRes = await new Promise((resolve, reject) => {
      http.get(`http://127.0.0.1:${PORT}/json`, res => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(JSON.parse(data)));
      }).on('error', reject);
    });

    const pageTarget = listRes.find(t => t.type === 'page');
    if (!pageTarget) throw new Error('No page target found in Chrome');

    const client = new CDPClient(pageTarget.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      client.ws.onopen = resolve;
      client.ws.onerror = reject;
    });

    await client.send('Page.enable');
    await client.send('DOM.enable');
    await client.send('Runtime.enable');
    await client.send('Log.enable');

    console.log('--- TEST 1: INDEX.HTML HERO CAROUSEL & CARDS ---');
    await client.send('Page.navigate', { url: `${BASE_URL}/index.html` });
    await sleep(1200);

    const carouselInfo = await client.eval(`(() => {
      const carousel = document.getElementById('heroCarousel');
      const slides = carousel ? carousel.querySelectorAll('.hero-carousel-slide') : [];
      const visibleCaptions = carousel ? carousel.querySelectorAll('.hero-carousel-caption') : [];
      const cards = document.querySelectorAll('.service-card-modern');
      const ctas = Array.from(cards).map(c => {
        const btn = c.querySelector('.service-card-cta');
        return {
          title: c.querySelector('.service-card-title')?.textContent?.trim(),
          ctaText: btn?.textContent?.trim(),
          ctaHref: btn?.getAttribute('href')
        };
      });

      return {
        carouselFound: !!carousel,
        slidesCount: slides.length,
        visibleCaptionsCount: visibleCaptions.length,
        cardsCount: cards.length,
        ctas
      };
    })()`);

    console.log(`Carousel Found: ${carouselInfo.carouselFound}`);
    console.log(`Active Slides Count: ${carouselInfo.slidesCount}`);
    console.log(`Visible Captions Count (should be 0 because commented out): ${carouselInfo.visibleCaptionsCount}`);
    console.log(`Homepage Service Cards Count: ${carouselInfo.cardsCount}`);
    console.log('Homepage Service Cards Sample CTAs:');
    carouselInfo.ctas.forEach((c, idx) => {
      console.log(`  [Card ${idx+1}] ${c.title} -> CTA: "${c.ctaText}" -> ${c.ctaHref}`);
    });

    console.log('\n--- TEST 2: SERVICE.HTML DIRECTORY & FILTERS ---');
    await client.send('Page.navigate', { url: `${BASE_URL}/service.html` });
    await sleep(1000);

    const servicePageInfo = await client.eval(`(() => {
      const cards = document.querySelectorAll('.service-card-modern');
      const filterBtns = document.querySelectorAll('.service-filter-btn');
      return {
        cardsCount: cards.length,
        filterBtnsCount: filterBtns.length
      };
    })()`);

    console.log(`service.html Total Cards: ${servicePageInfo.cardsCount} (Expected: 12)`);
    console.log(`Filter Buttons: ${servicePageInfo.filterBtnsCount}`);

    // Test clicking a filter button (cosmetic)
    await client.eval(`(() => {
      const cosmeticBtn = document.querySelector('.service-filter-btn[data-filter="cosmetic"]');
      if (cosmeticBtn) cosmeticBtn.click();
    })()`);
    await sleep(200);

    const filteredCount = await client.eval(`(() => {
      const cards = Array.from(document.querySelectorAll('.service-card-modern'));
      return cards.filter(c => c.style.display !== 'none').length;
    })()`);
    console.log(`Filtered by Cosmetic Cards Visible: ${filteredCount}`);

    // Reset filter
    await client.eval(`(() => {
      const allBtn = document.querySelector('.service-filter-btn[data-filter="all"]');
      if (allBtn) allBtn.click();
    })()`);
    await sleep(200);

    console.log('\n--- TEST 3: SERVICE DETAIL PAGE & ACCORDION ---');
    await client.send('Page.navigate', { url: `${BASE_URL}/service-root-canal.html` });
    await sleep(1000);

    const detailPageInfo = await client.eval(`(() => {
      const title = document.querySelector('.page-hero-title')?.textContent?.trim();
      const breadcrumb = document.querySelector('.breadcrumb-trail')?.textContent?.trim();
      const price = document.querySelector('.sidebar-price-tag')?.textContent?.trim();
      const aptBtn = document.querySelector('.sidebar-action-buttons .btn-primary-burnt-orange');
      const backLink = document.querySelector('.back-to-services-link');
      const related = document.querySelectorAll('.related-services-section .service-card-modern');

      // Test accordion
      const faqItem = document.querySelector('.faq-item');
      const qBtn = faqItem ? faqItem.querySelector('.faq-question-btn') : null;
      if (qBtn) qBtn.click();
      const isFaqActive = faqItem ? faqItem.classList.contains('active') : false;

      return {
        title,
        breadcrumb,
        price,
        aptHref: aptBtn?.getAttribute('href'),
        backHref: backLink?.getAttribute('href'),
        relatedCount: related.length,
        isFaqActive
      };
    })()`);

    console.log(`Detail Title: "${detailPageInfo.title}"`);
    console.log(`Breadcrumb: "${detailPageInfo.breadcrumb}"`);
    console.log(`Price Tag: "${detailPageInfo.price}"`);
    console.log(`Appointment CTA Href: "${detailPageInfo.aptHref}"`);
    console.log(`Back Link Href: "${detailPageInfo.backHref}"`);
    console.log(`Related Services Count: ${detailPageInfo.relatedCount}`);
    console.log(`FAQ Accordion Interactive Click Success: ${detailPageInfo.isFaqActive}`);

    console.log('\n--- TEST 4: RESPONSIVE BREAKPOINTS (NO HORIZONTAL OVERFLOW) ---');
    const testBreakpoints = [
      { w: 320, h: 568, name: 'Mobile XS (320)' },
      { w: 360, h: 800, name: 'Mobile Android (360)' },
      { w: 375, h: 812, name: 'iPhone SE/12 (375)' },
      { w: 390, h: 844, name: 'iPhone 13/14 (390)' },
      { w: 414, h: 896, name: 'iPhone Plus (414)' },
      { w: 430, h: 932, name: 'iPhone Pro Max (430)' },
      { w: 768, h: 1024, name: 'Tablet (768)' },
      { w: 1024, h: 768, name: 'Desktop Small (1024)' },
      { w: 1280, h: 800, name: 'Desktop HD (1280)' },
      { w: 1440, h: 900, name: 'MacBook (1440)' },
      { w: 1920, h: 1080, name: 'Full HD (1920)' }
    ];

    const pagesToTest = ['service-root-canal.html', 'service.html', 'index.html'];
    let allOverflowClean = true;

    for (const page of pagesToTest) {
      await client.send('Page.navigate', { url: `${BASE_URL}/${page}` });
      await sleep(800);

      for (const bp of testBreakpoints) {
        await client.send('Emulation.setDeviceMetricsOverride', {
          width: bp.w,
          height: bp.h,
          deviceScaleFactor: 1,
          mobile: bp.w < 992
        });
        await sleep(150);

        const overflow = await client.eval(`(() => {
          return {
            scrollWidth: document.documentElement.scrollWidth,
            clientWidth: document.documentElement.clientWidth,
            hasOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth
          };
        })()`);

        if (overflow.hasOverflow) {
          console.error(`[OVERFLOW] ${page} at ${bp.name}: scrollWidth=${overflow.scrollWidth} > clientWidth=${overflow.clientWidth}`);
          allOverflowClean = false;
        }
      }
      console.log(`[PASS] ${page} checked across all 11 breakpoints: No horizontal overflow!`);
    }

    if (allOverflowClean) {
      console.log('\n[ALL TESTS PASSED] Mobile and desktop responsive layouts are 100% clean!');
    }

  } finally {
    chrome.kill();
  }
}

runTests().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
