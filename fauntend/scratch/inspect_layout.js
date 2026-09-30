const http = require('http');

async function getWsUrl() {
  return new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9222/json/list', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json[0].webSocketDebuggerUrl);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

// Simple CDP client using native WebSocket (Node 20+) or http evaluate
async function main() {
  const wsUrl = await getWsUrl();
  console.log('WS URL:', wsUrl);
  const WebSocket = global.WebSocket || require('ws');
  const ws = new WebSocket(wsUrl);

  let msgId = 1;
  const callbacks = new Map();

  ws.addEventListener('open', async () => {
    function send(method, params = {}) {
      return new Promise((resolve, reject) => {
        const id = msgId++;
        callbacks.set(id, { resolve, reject });
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    ws.addEventListener('message', (event) => {
      const msg = JSON.parse(event.data);
      if (callbacks.has(msg.id)) {
        const { resolve, reject } = callbacks.get(msg.id);
        callbacks.delete(msg.id);
        if (msg.error) reject(msg.error);
        else resolve(msg.result);
      }
    });

    await send('Page.enable');
    await send('Runtime.enable');

    for (const width of [1280, 390]) {
      await send('Emulation.setDeviceMetricsOverride', {
        width,
        height: 900,
        deviceScaleFactor: 1,
        mobile: width < 600
      });

      for (const page of ['service-root-canal.html', 'service.html']) {
        console.log(`\n=================== [${width}px] INSPECTING ${page} ===================`);
        await send('Page.navigate', { url: `http://127.0.0.1:5173/${page}` });
        await new Promise(r => setTimeout(r, 1200));

        const evalRes = await send('Runtime.evaluate', {
          expression: `
            (function() {
              const res = [];
              const sel = 'section, .service-detail-section, .service-detail-layout, .service-detail-main, .service-detail-sidebar, .service-detail-media-showcase, .detail-media-viewer, .related-services-section, .appointment-cta-banner, .site-footer';
              document.querySelectorAll(sel).forEach(el => {
                const rect = el.getBoundingClientRect();
                res.push({
                  tag: el.tagName,
                  class: el.className.slice(0, 30),
                  top: Math.round(rect.top + window.scrollY),
                  height: Math.round(rect.height)
                });
              });
              // Check horizontal overflow
              const docWidth = document.documentElement.scrollWidth;
              const winWidth = window.innerWidth;
              return { elements: res, hasOverflow: docWidth > winWidth, docWidth, winWidth };
            })()
          `,
          returnByValue: true
        });
        console.table(evalRes.result.value.elements);
        console.log('Horizontal overflow?', evalRes.result.value.hasOverflow, { docWidth: evalRes.result.value.docWidth, winWidth: evalRes.result.value.winWidth });

        // Capture full scroll sequence
        for (const scrollY of [0, 800, 1800, 2800, 3600]) {
          await send('Runtime.evaluate', { expression: `window.scrollTo(0, ${scrollY});` });
          await new Promise(r => setTimeout(r, 200));
          const shot = await send('Page.captureScreenshot', { format: 'png' });
          require('fs').writeFileSync(`fauntend/scratch/shot_${page.replace('.html','')}_${width}_y${scrollY}.png`, Buffer.from(shot.data, 'base64'));
        }
      }
    }

    ws.close();
    process.exit(0);
  });
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
