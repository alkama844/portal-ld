const fs = require('fs');
const path = require('path');

const fauntendDir = path.resolve(__dirname, '../fauntend');
const maintainDir = path.join(fauntendDir, 'maintaindoc');

if (!fs.existsSync(maintainDir)) {
  fs.mkdirSync(maintainDir, { recursive: true });
}

// Copy maintain files if not already there
const srcConfig = path.join(__dirname, 'maintain-doc/maintain.config.js');
const srcJs = path.join(__dirname, 'maintain-doc/maintain.js');
const destConfig = path.join(maintainDir, 'maintain.config.js');
const destJs = path.join(maintainDir, 'maintain.js');

if (fs.existsSync(srcConfig)) {
  let cfg = fs.readFileSync(srcConfig, 'utf8');
  cfg = cfg.replace(/site:\s*["'][^"']+["']/, 'site: "luckydental"');
  cfg = cfg.replace(/encryptionKey:\s*["'][^"']+["']/, 'encryptionKey: "nafijthepro"');
  fs.writeFileSync(destConfig, cfg, 'utf8');
  console.log('Created fauntend/maintaindoc/maintain.config.js with site: luckydental');
}

if (fs.existsSync(srcJs)) {
  fs.copyFileSync(srcJs, destJs);
  console.log('Copied fauntend/maintaindoc/maintain.js');
}

const htmlFiles = fs.readdirSync(fauntendDir).filter(f => f.endsWith('.html'));

console.log(`Found ${htmlFiles.length} HTML files in fauntend:`);

const scriptTags = `    <!-- MaintainDoc Universal Maintenance SDK (by Nafij) -->
    <script src="maintaindoc/maintain.config.js"></script>
    <script src="maintaindoc/maintain.js"></script>`;

htmlFiles.forEach(file => {
  const filePath = path.join(fauntendDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Check if already injected
  if (content.includes('maintaindoc/maintain.js') && content.includes('maintaindoc/maintain.config.js')) {
    console.log(`- ${file}: Already injected.`);
    return;
  }

  // Remove any legacy maintain scripts if present
  content = content.replace(/(?:<!--.*?MaintainDoc.*?-->\s*)?<script[^>]*maintain\.config\.js[^>]*><\/script>\s*<script[^>]*maintain\.js[^>]*><\/script>/gi, '');
  content = content.replace(/<script[^>]*maintain\.js[^>]*><\/script>/gi, '');

  if (content.includes('</head>')) {
    content = content.replace('</head>', `${scriptTags}\n</head>`);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✔ Injected into ${file}`);
  } else {
    console.warn(`⚠ No </head> tag found in ${file}`);
  }
});

console.log('MaintainDoc injection complete.');
