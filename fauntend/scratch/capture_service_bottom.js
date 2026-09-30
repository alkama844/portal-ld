const http = require('http');
const fs = require('fs');

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

      await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
      await send('Page.navigate', { url: 'http://127.0.0.1:5173/service.html' });
      await new Promise(r => setTimeout(r, 1200));

      // Scroll to absolute bottom
      await send('Runtime.evaluate', {
        expression: `
          window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' });
        `
      });
      await new Promise(r => setTimeout(r, 600));

      const shot = await send('Page.captureScreenshot', { format: 'png' });
      const outPath = 'C:/Users/Rc/.gemini/antigravity-ide/brain/ce093d78-ab2b-4744-b259-d909e78ce288/service_bottom_very_end.png';
      fs.writeFileSync(outPath, Buffer.from(shot.data, 'base64'));
      console.log('Saved to', outPath);
      process.exit(0);
    };
  });
});
