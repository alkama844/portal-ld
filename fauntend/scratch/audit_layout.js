const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function auditPage(pageName, width = 1280, height = 900) {
  const PORT = 9200 + Math.floor(Math.random() * 500);
  const udir = path.join(process.env.TEMP, `chrome_audit_${PORT}`);
  console.log(`\n=================== AUDITING ${pageName} (${width}x${height}) on port ${PORT} ===================`);
  
  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${udir}`,
    '--no-sandbox',
    '--disable-gpu',
    `--window-size=${width},${height}`,
    `http://127.0.0.1:5173/${pageName}`
  ]);

  await sleep(2000);

  try {
    const listRes = await fetch(`http://127.0.0.1:${PORT}/json`);
    const tabs = await listRes.json();
    const target = tabs.find(t => t.url.includes(pageName)) || tabs[0];
    if (!target) {
      console.log('No tab found!');
      return;
    }

    const wsUrl = target.webSocketDebuggerUrl;
    const ws = new WebSocket(wsUrl);

    await new Promise((resolve, reject) => {
      ws.onopen = resolve;
      ws.onerror = reject;
      setTimeout(() => reject(new Error('WS timeout')), 3000);
    });

    let msgId = 1;
    function send(method, params = {}) {
      return new Promise((resolve, reject) => {
        const id = msgId++;
        const timer = setTimeout(() => reject(new Error(`Timeout ${method}`)), 6000);
        const onMsg = (event) => {
          const data = JSON.parse(event.data);
          if (data.id === id) {
            clearTimeout(timer);
            ws.removeEventListener('message', onMsg);
            if (data.error) reject(data.error);
            else resolve(data.result);
          }
        };
        ws.addEventListener('message', onMsg);
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    // Wait a moment for page to layout and images to load
    await sleep(1000);

    // Evaluate layout
    const res = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const els = Array.from(document.querySelectorAll('header.navbar-wrapper, .top-info-bar, section, footer.site-footer, .service-estimator-promo-banner, .services-grid-modern'));
          return els.map(el => {
            const rect = el.getBoundingClientRect();
            const cs = window.getComputedStyle(el);
            return {
              tag: el.tagName,
              cls: (el.className || '').toString().slice(0, 35),
              id: el.id,
              top: Math.round(rect.top + window.scrollY),
              bottom: Math.round(rect.bottom + window.scrollY),
              height: Math.round(rect.height),
              width: Math.round(rect.width),
              padTop: cs.paddingTop,
              padBottom: cs.paddingBottom,
              marTop: cs.marginTop,
              marBottom: cs.marginBottom,
              display: cs.display,
              visibility: cs.visibility,
              opacity: cs.opacity
            };
          });
        })()
      `,
      returnByValue: true
    });

    const items = res.result ? res.result.value : res.value;
    if (!items) {
      console.log('No items returned! res:', JSON.stringify(res));
      return;
    }
    
    console.log(`Found ${items.length} structural elements.`);
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      let gapFromPrev = '';
      if (i > 0) {
        const gap = it.top - items[i-1].bottom;
        gapFromPrev = ` [GAP from prev: ${gap}px]`;
      }
      console.log(`[${i}] <${it.tag} class="${it.cls}" id="${it.id}">: top=${it.top}, bot=${it.bottom}, h=${it.height}px, pad=${it.padTop}/${it.padBottom}, mar=${it.marTop}/${it.marBottom}, op=${it.opacity}${gapFromPrev}`);
    }

    // Also check for any element inside the document that has huge padding/margin or min-height
    const deepCheck = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const issues = [];
          document.querySelectorAll('*').forEach(el => {
            if (['SCRIPT', 'STYLE', 'LINK', 'META', 'HEAD', 'HTML', 'BODY'].includes(el.tagName)) return;
            const cs = window.getComputedStyle(el);
            const rect = el.getBoundingClientRect();
            const h = rect.height;
            const pt = parseFloat(cs.paddingTop) || 0;
            const pb = parseFloat(cs.paddingBottom) || 0;
            const mt = parseFloat(cs.marginTop) || 0;
            const mb = parseFloat(cs.marginBottom) || 0;
            const minH = parseFloat(cs.minHeight) || 0;
            
            if (pt > 80 || pb > 80 || mt > 60 || mb > 60 || minH > 400) {
              issues.push({
                tag: el.tagName,
                cls: (el.className || '').toString().slice(0, 40),
                id: el.id,
                rectH: Math.round(h),
                pt, pb, mt, mb, minH: cs.minHeight
              });
            }
          });
          return issues;
        })()
      `,
      returnByValue: true
    });

    const issues = deepCheck.result ? deepCheck.result.value : [];
    console.log(`\nLarge spacing elements (padding/margin > 80px or minHeight > 400px): ${issues.length}`);
    issues.forEach(iss => {
      console.log(`  - <${iss.tag} class="${iss.cls}" id="${iss.id}">: h=${iss.rectH}, pt=${iss.pt}, pb=${iss.pb}, mt=${iss.mt}, mb=${iss.mb}, minH=${iss.minH}`);
    });

    ws.close();
  } catch (err) {
    console.error('Audit error:', err.message);
  } finally {
    try { chromeProc.kill(); } catch (e) {}
    try { fs.rmSync(udir, { recursive: true, force: true }); } catch (e) {}
  }
}

async function run() {
  await auditPage('about.html', 1280, 900);
  await auditPage('about.html', 390, 844);
  await auditPage('service.html', 1280, 900);
  await auditPage('service.html', 390, 844);
}

run();
