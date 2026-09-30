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

      await send('Page.navigate', { url: 'http://127.0.0.1:5173/' });
      await new Promise(r => setTimeout(r, 1200));

      const r1 = await send('Runtime.evaluate', {
        expression: `
          new Promise(async (resolve) => {
            try {
              window.LUCKY_API_BASE_URL = 'http://127.0.0.1:9999';
              window.LuckyCMS.openLogin();
              await new Promise(r => setTimeout(r, 100));
              const backdrop = document.getElementById('luckyAdminLoginBackdrop');
              const passInput = document.getElementById('cmsAdminPassword');
              const form = document.getElementById('cmsLoginForm');
              const errorBox = document.getElementById('cmsLoginError');
              passInput.value = 'anypass';
              form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
              await new Promise(r => setTimeout(r, 1200));
              resolve({
                modalActive: backdrop ? backdrop.classList.contains('active') : false,
                errorText: errorBox ? errorBox.textContent.trim() : null,
                errorDisplay: errorBox ? errorBox.style.display : null
              });
            } catch (err) {
              resolve({ error: err.message });
            }
          })
        `,
        awaitPromise: true,
        returnByValue: true
      });
      console.log('Test 1 - Network Error:', r1.result.value);

      const r2 = await send('Runtime.evaluate', {
        expression: `
          new Promise(async (resolve) => {
            try {
              const results = {};
              const errorBox = document.getElementById('cmsLoginError');
              const form = document.getElementById('cmsLoginForm');
              const passInput = document.getElementById('cmsAdminPassword');

              const testStatus = async (status) => {
                const origFetch = window.fetch;
                window.fetch = async () => ({
                  ok: false,
                  status: status,
                  json: async () => ({ message: 'Status error' })
                });
                passInput.value = 'testpass';
                form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
                await new Promise(r => setTimeout(r, 150));
                const text = errorBox.textContent.trim();
                window.fetch = origFetch;
                return text;
              };

              results['401'] = await testStatus(401);
              results['403'] = await testStatus(403);
              results['404'] = await testStatus(404);
              results['422'] = await testStatus(422);
              results['500'] = await testStatus(500);

              resolve(results);
            } catch (err) {
              resolve({ error: err.message });
            }
          })
        `,
        awaitPromise: true,
        returnByValue: true
      });
      console.log('Test 2 - Status Mappings:', r2.result.value);

      const r3 = await send('Runtime.evaluate', {
        expression: `
          new Promise(async (resolve) => {
            try {
              const origFetch = window.fetch;
              window.fetch = async (url) => {
                if (url.includes('/api/auth/login')) {
                  return {
                    ok: true,
                    status: 200,
                    json: async () => ({
                      token: 'mock-jwt-token-12345',
                      user: { email: 'admin@luckydentalcare.com', role: 'admin' }
                    })
                  };
                }
                return { ok: true, json: async () => ({}) };
              };

              const form = document.getElementById('cmsLoginForm');
              const passInput = document.getElementById('cmsAdminPassword');
              passInput.value = 'correct-password';
              form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
              await new Promise(r => setTimeout(r, 500));
              window.fetch = origFetch;

              const dock = document.getElementById('cmsFloatingDock');
              const editableElements = document.querySelectorAll('[contenteditable="true"]');
              resolve({
                dockExists: !!dock,
                editModeActive: document.body.classList.contains('cms-edit-mode-active'),
                editableCount: editableElements.length
              });
            } catch (err) {
              resolve({ error: err.message });
            }
          })
        `,
        awaitPromise: true,
        returnByValue: true
      });
      console.log('Test 3 - Success Flow:', r3.result.value);

      process.exit(0);
    };
  });
});
