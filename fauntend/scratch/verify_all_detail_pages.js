const http = require('http');

const pages = [
  'service-root-canal.html',
  'service-gap-filling.html',
  'service-scaling.html',
  'service-crown-bridge.html',
  'service-extraction.html',
  'service-teeth-whitening.html',
  'service-dental-implants.html',
  'service-orthodontics.html',
  'service-pediatric.html',
  'service-dentures.html',
  'service-gum-treatment.html',
  'service-emergency.html'
];

http.get('http://127.0.0.1:9222/json/list', res => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', async () => {
    const wsUrl = JSON.parse(d)[0].webSocketDebuggerUrl;
    const ws = new WebSocket(wsUrl);
    ws.onopen = async () => {
      let id = 1;
      const send = (m, p = {}) => new Promise(r => {
        const i = id++;
        const h = e => {
          const res = JSON.parse(e.data);
          if (res.id === i) {
            ws.removeEventListener('message', h);
            r(res.result);
          }
        };
        ws.addEventListener('message', h);
        ws.send(JSON.stringify({ id: i, method: m, params: p }));
      });

      await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });

      console.log('Testing 12 service detail pages...');
      const results = [];

      for (const page of pages) {
        await send('Page.navigate', { url: `http://127.0.0.1:5173/${page}` });
        await new Promise(r => setTimeout(r, 600));

        // Test sticky position when scrolled to 800px
        const r = (await send('Runtime.evaluate', {
          expression: `
            window.scrollTo({ top: 800, behavior: 'instant' });
            (function() {
              const sidebar = document.querySelector('.service-detail-sidebar');
              const main = document.querySelector('.service-detail-main');
              const sRect = sidebar ? sidebar.getBoundingClientRect() : null;
              const images = Array.from(document.querySelectorAll('img')).map(img => ({
                src: img.src,
                naturalWidth: img.naturalWidth,
                loaded: img.complete && img.naturalWidth > 0
              }));
              const brokenImages = images.filter(i => !i.loaded);
              return {
                overflowX: document.documentElement.scrollWidth > window.innerWidth,
                sidebarTop: sRect ? Math.round(sRect.top) : null,
                sidebarSticky: sRect ? (Math.round(sRect.top) <= 100) : false,
                brokenImagesCount: brokenImages.length,
                brokenImages
              };
            })()
          `,
          returnByValue: true
        })).result.value;

        results.push({ page, ...r });
      }

      console.table(results.map(r => ({
        page: r.page,
        overflowX: r.overflowX,
        sidebarTop: r.sidebarTop,
        sidebarSticky: r.sidebarSticky,
        brokenImages: r.brokenImagesCount
      })));

      process.exit(0);
    };
  });
});
