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
      const rootImgs = (await send('Runtime.evaluate', {
        expression: `
          Array.from(document.querySelectorAll('img')).map(i => ({
            src: i.src,
            naturalWidth: i.naturalWidth,
            complete: i.complete,
            loading: i.loading
          }))
        `,
        returnByValue: true
      })).result.value;
      console.log('Images on service-root-canal.html:');
      console.table(rootImgs);

      await send('Page.navigate', { url: 'http://127.0.0.1:5173/service-crown-bridge.html' });
      await new Promise(r => setTimeout(r, 1000));
      const crownStructure = (await send('Runtime.evaluate', {
        expression: `
          ({
            sections: Array.from(document.querySelectorAll('section')).map(s => s.className),
            hasSidebar: !!document.querySelector('.service-detail-sidebar'),
            hasLayout: !!document.querySelector('.service-detail-layout'),
            bodyClasses: document.body.className
          })
        `,
        returnByValue: true
      })).result.value;
      console.log('service-crown-bridge.html structure:', crownStructure);

      process.exit(0);
    };
  });
});
