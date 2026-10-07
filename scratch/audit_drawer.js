const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '../fauntend');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html') && f !== 'service-div.html' && f !== 'estimate.html');

let allOk = true;
files.forEach(f => {
  const c = fs.readFileSync(path.join(dir, f), 'utf8');
  const hasToggle = c.includes('id="mobileMenuToggle"') || c.includes('class="mobile-toggle-btn"');
  const hasDrawer = c.includes('id="mobileDrawer"');
  const hasOverlay = c.includes('id="drawerOverlay"');
  const hasClose = c.includes('id="drawerCloseBtn"');
  const ok = hasToggle && hasDrawer && hasOverlay && hasClose;
  if (!ok) allOk = false;
  console.log(`${f} -> Toggle: ${hasToggle} | Drawer: ${hasDrawer} | Overlay: ${hasOverlay} | Close: ${hasClose} [${ok ? 'OK' : 'FAIL'}]`);
});

console.log(`\nOverall Drawer Elements Status: ${allOk ? 'ALL PASS' : 'SOME MISSING'}`);
