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

      console.log('Testing CMS modal error handling...');

      // Test 1: Simulate network error during login
      const netErrResult = await send('Runtime.evaluate', {
        expression: `
          (async function() {
            // Point API URL to unreachable local port to force network error
            window.LuckyDentalCMS.setApiBase('http://127.0.0.1:9999');
            window.LuckyDentalCMS.openLoginModal();
            const passInput = document.getElementById('cmsPasswordInput');
            const submitBtn = document.getElementById('cmsLoginSubmit');
            const alertBox = document.getElementById('cmsLoginAlert');
            passInput.value = 'anypass';
            
            // Click submit
            submitBtn.click();
            
            // Wait for network fail
            await new Promise(r => setTimeout(r, 800));
            return {
              modalVisible: document.getElementById('cmsLoginModal').style.display !== 'none',
              alertText: alertBox.textContent.trim(),
              alertDisplay: alertBox.style.display
            };
          })()
        `,
        awaitPromise: true,
        returnByValue: true
      });
      console.log('Test 1 - Network Error Result:', netErrResult.result.value);

      // Test 2: Test status code mappings (401, 403, 404, 500)
      const statusTestsResult = await send('Runtime.evaluate', {
        expression: `
          (async function() {
            const results = {};
            const alertBox = document.getElementById('cmsLoginAlert');
            const submitBtn = document.getElementById('cmsLoginSubmit');
            const passInput = document.getElementById('cmsPasswordInput');

            // Mock fetch to return specific status codes
            const testStatus = async (status) => {
              const origFetch = window.fetch;
              window.fetch = async () => ({
                ok: false,
                status: status,
                json: async () => ({ message: 'Status error' })
              });
              passInput.value = 'testpass';
              submitBtn.click();
              await new Promise(r => setTimeout(r, 100));
              const text = alertBox.textContent.trim();
              window.fetch = origFetch;
              return text;
            };

            results['401'] = await testStatus(401);
            results['403'] = await testStatus(403);
            results['404'] = await testStatus(404);
            results['422'] = await testStatus(422);
            results['500'] = await testStatus(500);

            return results;
          })()
        `,
        awaitPromise: true,
        returnByValue: true
      });
      console.log('Test 2 - Status Code Messages:', statusTestsResult.result.value);

      // Test 3: Successful admin login flow
      const successTestResult = await send('Runtime.evaluate', {
        expression: `
          (async function() {
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

            const submitBtn = document.getElementById('cmsLoginSubmit');
            const passInput = document.getElementById('cmsPasswordInput');
            passInput.value = 'correct-password';
            submitBtn.click();
            await new Promise(r => setTimeout(r, 300));
            window.fetch = origFetch;

            const adminBar = document.getElementById('cmsAdminBar');
            const editableElements = document.querySelectorAll('[data-cms-editable]');
            return {
              barDisplay: adminBar ? adminBar.style.display : null,
              activeMode: document.body.classList.contains('cms-edit-active'),
              editableCount: editableElements.length
            };
          })()
        `,
        awaitPromise: true,
        returnByValue: true
      });
      console.log('Test 3 - Success Flow Result:', successTestResult.result.value);

      process.exit(0);
    };
  });
});
