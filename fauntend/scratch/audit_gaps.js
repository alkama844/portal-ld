const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9222;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

class CDPClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 1;
    this.callbacks = new Map();

    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.callbacks.has(msg.id)) {
        const cb = this.callbacks.get(msg.id);
        this.callbacks.delete(msg.id);
        if (msg.error) cb.reject(msg.error);
        else cb.resolve(msg.result);
      }
    };
  }

  async ready() {
    if (this.ws.readyState === WebSocket.OPEN) return;
    return new Promise((resolve, reject) => {
      this.ws.onopen = () => resolve();
      this.ws.onerror = (err) => reject(err);
    });
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.id++;
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    this.ws.close();
  }
}

async function runAudit() {
  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    '--no-sandbox',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--window-size=1280,900'
  ]);

  await sleep(1500);

  try {
    const listRes = await fetch(`http://127.0.0.1:${PORT}/json`);
    const tabs = await listRes.json();
    const wsUrl = tabs[0].webSocketDebuggerUrl;
    const client = new CDPClient(wsUrl);
    await client.ready();

    await client.send('Page.enable');
    await client.send('Runtime.enable');
    await client.send('DOM.enable');

    const testPages = ['about.html', 'service.html', 'service-root-canal.html'];

    for (const page of testPages) {
      console.log(`\n=================== AUDITING ${page} ===================`);
      await client.send('Page.navigate', { url: `http://127.0.0.1:5173/${page}` });
      await sleep(1500);

      // Evaluate sections and gaps
      const layoutData = await client.send('Runtime.evaluate', {
        expression: `
          (() => {
            const sections = Array.from(document.querySelectorAll('header, section, footer, aside, .service-estimator-promo-banner, .services-grid-modern, .service-detail-layout, .service-detail-main, .service-detail-sidebar'));
            return sections.map(el => {
              const rect = el.getBoundingClientRect();
              const style = window.getComputedStyle(el);
              return {
                tag: el.tagName,
                id: el.id,
                className: el.className,
                top: Math.round(rect.top + window.scrollY),
                bottom: Math.round(rect.bottom + window.scrollY),
                height: Math.round(rect.height),
                paddingTop: style.paddingTop,
                paddingBottom: style.paddingBottom,
                marginTop: style.marginTop,
                marginBottom: style.marginBottom,
                display: style.display,
                position: style.position
              };
            });
          })()
        `,
        returnByValue: true
      });

      console.log('Sections layout:');
      const data = layoutData.result.value;
      for (let i = 0; i < data.length; i++) {
        const item = data[i];
        console.log(`[${i}] ${item.tag}.${item.className.slice(0, 30)} (id=${item.id}): top=${item.top}px, height=${item.height}px, pad=${item.paddingTop}/${item.paddingBottom}, mar=${item.marginTop}/${item.marginBottom}, pos=${item.position}`);
        if (i > 0 && data[i-1].bottom < item.top) {
          const gap = item.top - data[i-1].bottom;
          if (gap > 20) {
            console.log(`   >>> GAP BETWEEN [${i-1}] AND [${i}]: ${gap}px`);
          }
        }
      }

      // Capture screenshot
      const shot = await client.send('Page.captureScreenshot', { format: 'png' });
      const outPath = path.join(__dirname, `audit_${page.replace('.html', '')}.png`);
      fs.writeFileSync(outPath, Buffer.from(shot.data, 'base64'));
      console.log(`Saved screenshot to ${outPath}`);
    }

    client.close();
  } catch (err) {
    console.error('Audit error:', err);
  } finally {
    chromeProc.kill();
  }
}

runAudit();
