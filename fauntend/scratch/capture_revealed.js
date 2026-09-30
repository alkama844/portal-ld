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
      // Force all revealed
      await send('Runtime.evaluate', {
        expression: `document.querySelectorAll('[data-reveal]').forEach(el => el.classList.add('is-revealed'));`
      });

      // Capture screenshots from top to bottom
      const totalHeight = 4600;
      for (let y = 0; y < totalHeight; y += 700) {
        await send('Runtime.evaluate', { expression: `window.scrollTo(0, ${y});` });
        await new Promise(r => setTimeout(r, 200));
        const shot = await send('Page.captureScreenshot', { format: 'png' });
        require('fs').writeFileSync(`fauntend/scratch/revealed_y${y}.png`, Buffer.from(shot.data, 'base64'));
      }
      console.log('Screenshots captured!');
      process.exit(0);
    };
  });
});
