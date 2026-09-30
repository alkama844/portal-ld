// Node 22 native WebSocket

async function testTheme() {
  const targetsRes = await fetch('http://127.0.0.1:9222/json');
  const targets = await targetsRes.json();
  const page = targets.find(t => t.type === 'page' && t.url.includes('127.0.0.1:5173'));
  if (!page) {
    console.error('No page found on 5173');
    return;
  }

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise(res => ws.addEventListener('open', res));

  let id = 1;
  function send(method, params = {}) {
    return new Promise((resolve) => {
      const msgId = id++;
      const handler = (evt) => {
        const parsed = JSON.parse(evt.data);
        if (parsed.id === msgId) {
          ws.removeEventListener('message', handler);
          resolve(parsed.result);
        }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  }

  // Check initial brand color
  const eval1 = await send('Runtime.evaluate', {
    expression: `(() => {
      const root = getComputedStyle(document.documentElement);
      return {
        brandPrimary: root.getPropertyValue('--brand-primary').trim(),
        brandRed: root.getPropertyValue('--brand-red').trim(),
        brandDark: root.getPropertyValue('--brand-primary-dark').trim(),
        brandRgb: root.getPropertyValue('--brand-primary-rgb').trim()
      };
    })()`,
    returnByValue: true
  });
  console.log('Initial CSS variables on page:', eval1.result.value);

  // Apply Orion Blue (#1e3a8a) via LuckyTheme.applyColor
  const eval2 = await send('Runtime.evaluate', {
    expression: `(() => {
      window.LuckyTheme.applyColor('#1e3a8a');
      const root = getComputedStyle(document.documentElement);
      return {
        brandPrimary: root.getPropertyValue('--brand-primary').trim(),
        brandRed: root.getPropertyValue('--brand-red').trim(),
        brandDark: root.getPropertyValue('--brand-primary-dark').trim(),
        brandRgb: root.getPropertyValue('--brand-primary-rgb').trim()
      };
    })()`,
    returnByValue: true
  });
  console.log('After switching to Orion Blue (#1e3a8a):', eval2.result.value);

  // Apply Burnt Orange (#c2410c) back
  const eval3 = await send('Runtime.evaluate', {
    expression: `(() => {
      window.LuckyTheme.applyColor('#c2410c');
      const root = getComputedStyle(document.documentElement);
      return {
        brandPrimary: root.getPropertyValue('--brand-primary').trim(),
        brandRed: root.getPropertyValue('--brand-red').trim(),
        brandDark: root.getPropertyValue('--brand-primary-dark').trim(),
        brandRgb: root.getPropertyValue('--brand-primary-rgb').trim()
      };
    })()`,
    returnByValue: true
  });
  console.log('After switching back to Lucky Orange (#c2410c):', eval3.result.value);

  ws.close();
}

testTheme().catch(console.error);
