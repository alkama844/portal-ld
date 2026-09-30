const { spawn } = require('child_process');
const http = require('http');

async function testFaq() {
  const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const chrome = spawn(CHROME_PATH, ['--remote-debugging-port=9225', '--headless=new', 'about:blank']);
  await new Promise(r => setTimeout(r, 1200));

  const list = await new Promise(res => {
    http.get('http://127.0.0.1:9225/json', r => {
      let d = ''; r.on('data', c => d += c); r.on('end', () => res(JSON.parse(d)));
    });
  });
  const ws = new WebSocket(list[0].webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);

  function evalJs(code) {
    return new Promise(r => {
      ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: `(() => { return ${code}; })()`, returnByValue: true } }));
      ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id === 1) r(m.result.value); };
    });
  }

  ws.send(JSON.stringify({ id: 2, method: 'Page.navigate', params: { url: 'http://127.0.0.1:5173/service-root-canal.html' } }));
  await new Promise(r => setTimeout(r, 1200));

  const initialStates = await evalJs('Array.from(document.querySelectorAll(".faq-item")).map(i => i.classList.contains("active"))');
  console.log('Initial FAQ states (item 1 active by default):', initialStates);

  // Click second FAQ item
  await evalJs('document.querySelectorAll(".faq-item")[1].querySelector(".faq-question-btn").click()');
  await new Promise(r => setTimeout(r, 200));

  const secondClickedStates = await evalJs('Array.from(document.querySelectorAll(".faq-item")).map(i => i.classList.contains("active"))');
  console.log('After clicking item 2 (item 2 should now be active, item 1 closed):', secondClickedStates);

  chrome.kill();
}
testFaq();
