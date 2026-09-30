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
      await new Promise(r => setTimeout(r, 1200));

      const getY = async (y) => {
        const evalRes = await send('Runtime.evaluate', {
          expression: `
            window.scrollTo({ top: ${y}, behavior: 'instant' });
            (function() {
              const r = document.querySelector('.service-detail-sidebar').getBoundingClientRect();
              return { scrollY: window.scrollY, top: Math.round(r.top), bottom: Math.round(r.bottom), height: Math.round(r.height) };
            })()
          `,
          returnByValue: true
        });
        return evalRes.result.value;
      };

      console.log('Scroll 0:', await getY(0));
      console.log('Scroll 500:', await getY(500));
      console.log('Scroll 1000:', await getY(1000));
      console.log('Scroll 1500:', await getY(1500));
      console.log('Scroll 2000:', await getY(2000));
      process.exit(0);
    };
  });
});
