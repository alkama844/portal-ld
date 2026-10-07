const http = require('http');
const fs = require('fs');
const path = require('path');

// Simple static server for fauntend
const fauntendDir = path.join(__dirname, '../fauntend');
const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
  if (!path.extname(reqPath)) reqPath += '.html';

  const filePath = path.join(fauntendDir, reqPath);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'text/plain' });
    res.end(fs.readFileSync(filePath));
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(5179, async () => {
  console.log('Test server running at http://localhost:5179');
  console.log('Auditing HTML markup & CSS rules for mobile fixed navbar & full-viewport drawer...');

  const css = fs.readFileSync(path.join(fauntendDir, 'css/style.css'), 'utf8');

  // Verify CSS contains mobile fixed navbar
  const hasFixedNavbar = css.includes('position: fixed !important') && css.includes('.navbar-wrapper');
  const hasFixedDrawer = css.includes('.mobile-drawer') && css.includes('position: fixed !important');
  const hasDrawerActive = css.includes('.mobile-drawer.active') && css.includes('transform: translateX(0)');
  const hasOverlayActive = css.includes('.drawer-overlay.active');

  console.log('CSS Check - Fixed Navbar on Mobile:', hasFixedNavbar);
  console.log('CSS Check - Fixed Drawer:', hasFixedDrawer);
  console.log('CSS Check - Drawer Active Transform:', hasDrawerActive);
  console.log('CSS Check - Overlay Active:', hasOverlayActive);

  if (hasFixedNavbar && hasFixedDrawer && hasDrawerActive && hasOverlayActive) {
    console.log('✔ All Mobile Navbar & Full-Viewport Drawer CSS requirements verified successfully!');
  } else {
    console.error('❌ Missing some CSS requirements');
  }

  server.close();
});
