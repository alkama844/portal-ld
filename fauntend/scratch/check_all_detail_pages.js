const http = require('http');
const fs = require('fs');
const path = require('path');

const detailFiles = fs.readdirSync('fauntend').filter(f => f.startsWith('service-') && f.endsWith('.html'));
console.log('Detail files found:', detailFiles);

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

      for (const file of detailFiles) {
        await send('Page.navigate', { url: `http://127.0.0.1:5173/${file}` });
        await new Promise(r => setTimeout(r, 600));
        const res = await send('Runtime.evaluate', {
          expression: `
            (function() {
              const bodyChildren = Array.from(document.body.children).filter(el => {
                const s = window.getComputedStyle(el);
                return s.display !== 'none' && s.position !== 'fixed' && s.position !== 'absolute';
              });
              const heights = bodyChildren.map(el => ({
                tag: el.tagName,
                cls: el.className.slice(0, 30),
                h: Math.round(el.getBoundingClientRect().height)
              }));
              // Check for empty elements with height > 20px
              const emptyWithHeight = Array.from(document.querySelectorAll('*')).filter(el => {
                const r = el.getBoundingClientRect();
                const text = el.textContent.trim();
                const hasImgOrSvg = el.querySelector('img, svg, iframe, canvas, input, button');
                return r.height > 60 && !text && !hasImgOrSvg;
              }).map(el => ({ tag: el.tagName, cls: el.className, h: Math.round(el.getBoundingClientRect().height) }));

              return { file: "${file}", heights, emptyWithHeight };
            })()
          `,
          returnByValue: true
        });
        const val = res.result ? res.result.value : res.value;
        console.log(`\n--- ${file} ---`);
        console.log('Sections:', val ? val.heights : 'error');
        if (val && val.emptyWithHeight.length > 0) {
          console.warn('Empty elements with height:', val.emptyWithHeight);
        }
      }
      process.exit(0);
    };
  });
});
