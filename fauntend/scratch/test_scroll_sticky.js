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
      for (const y of [0, 500, 1000, 1500, 2000]) {
        const res = await send('Runtime.evaluate', {
          expression: `
            window.scrollTo(0, ${y});
            document.documentElement.scrollTop = ${y};
            document.body.scrollTop = ${y};
            const sb = document.querySelector('.service-detail-sidebar');
            const r = sb ? sb.getBoundingClientRect() : null;
            ({
              scrollY: window.scrollY || document.documentElement.scrollTop,
              rectTop: r ? Math.round(r.top) : null,
              rectBottom: r ? Math.round(r.bottom) : null
            })
          `,
          returnByValue: true
        });
        console.log(res.value);
      }
      process.exit(0);
    };
  });
});
