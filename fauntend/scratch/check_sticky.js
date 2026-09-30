const http = require('http');

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
      await send('Page.navigate', { url: 'http://127.0.0.1:5173/service-root-canal.html' });
      await new Promise(r => setTimeout(r, 1000));
      const res = await send('Runtime.evaluate', {
        expression: `
          (function() {
            let el = document.querySelector('.service-detail-sidebar');
            const ancestors = [];
            while (el && el !== document.body) {
              const s = window.getComputedStyle(el);
              ancestors.push({
                tag: el.tagName,
                cls: el.className,
                overflow: s.overflow,
                overflowX: s.overflowX,
                overflowY: s.overflowY,
                transform: s.transform,
                position: s.position,
                height: s.height
              });
              el = el.parentElement;
            }
            const bodyS = window.getComputedStyle(document.body);
            ancestors.push({ tag: 'BODY', cls: '', overflow: bodyS.overflow, overflowX: bodyS.overflowX, overflowY: bodyS.overflowY, transform: bodyS.transform, position: bodyS.position, height: bodyS.height });
            const htmlS = window.getComputedStyle(document.documentElement);
            ancestors.push({ tag: 'HTML', cls: '', overflow: htmlS.overflow, overflowX: htmlS.overflowX, overflowY: htmlS.overflowY, transform: htmlS.transform, position: htmlS.position, height: htmlS.height });
            return ancestors;
          })()
        `,
        returnByValue: true
      });
      console.table(res.result.value);
      process.exit(0);
    };
  });
});
