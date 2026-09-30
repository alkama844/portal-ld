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

      const checkViewport = async (width, height) => {
        await send('Emulation.setDeviceMetricsOverride', {
          width,
          height,
          deviceScaleFactor: 1,
          mobile: width < 600
        });
        await send('Page.navigate', { url: 'http://127.0.0.1:5173/service-root-canal.html' });
        await new Promise(r => setTimeout(r, 1000));
        const res = await send('Runtime.evaluate', {
          expression: `
            ({
              viewportWidth: window.innerWidth,
              scrollWidth: document.documentElement.scrollWidth,
              hasHorizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
              sidebarWidth: document.querySelector('.service-detail-sidebar').offsetWidth,
              mainWidth: document.querySelector('.service-detail-main').offsetWidth
            })
          `,
          returnByValue: true
        });
        return res.result.value;
      };

      console.log('320px:', await checkViewport(320, 700));
      console.log('390px:', await checkViewport(390, 844));
      console.log('768px:', await checkViewport(768, 1024));
      console.log('1280px:', await checkViewport(1280, 800));

      process.exit(0);
    };
  });
});
