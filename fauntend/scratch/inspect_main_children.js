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
          Array.from(document.querySelector('.service-detail-main').children).map((c, i) => {
            const r = c.getBoundingClientRect();
            const s = window.getComputedStyle(c);
            return {
              idx: i,
              tag: c.tagName,
              cls: c.className,
              top: Math.round(r.top + window.scrollY),
              bottom: Math.round(r.bottom + window.scrollY),
              height: Math.round(r.height),
              marginTop: s.marginTop,
              marginBottom: s.marginBottom,
              opacity: s.opacity,
              display: s.display,
              textSnippet: c.textContent.trim().slice(0, 40)
            };
          })
        `,
        returnByValue: true
      });
      console.table(res.result.value);
      process.exit(0);
    };
  });
});
