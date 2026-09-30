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

      const res = await send('Runtime.evaluate', {
        expression: `
          (function() {
            return {
              htmlScrollHeight: document.documentElement.scrollHeight,
              htmlClientHeight: document.documentElement.clientHeight,
              bodyScrollHeight: document.body.scrollHeight,
              bodyClientHeight: document.body.clientHeight,
              scrollingElement: document.scrollingElement ? document.scrollingElement.tagName : 'null',
              htmlOverflow: window.getComputedStyle(document.documentElement).overflow,
              htmlOverflowY: window.getComputedStyle(document.documentElement).overflowY,
              htmlOverflowX: window.getComputedStyle(document.documentElement).overflowX,
              bodyOverflow: window.getComputedStyle(document.body).overflow,
              bodyOverflowY: window.getComputedStyle(document.body).overflowY,
              bodyOverflowX: window.getComputedStyle(document.body).overflowX
            };
          })()
        `,
        returnByValue: true
      });
      console.log('Scroll state:', res.result.value);

      // Now test scrolling
      const scrollRes = await send('Runtime.evaluate', {
        expression: `
          (function() {
            window.scrollTo({ top: 500, behavior: 'instant' });
            return {
              windowScrollY: window.scrollY,
              htmlScrollTop: document.documentElement.scrollTop,
              bodyScrollTop: document.body.scrollTop
            };
          })()
        `,
        returnByValue: true
      });
      console.log('After scroll to 500:', scrollRes.result.value);
      process.exit(0);
    };
  });
});
