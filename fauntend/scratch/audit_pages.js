const fs = require('fs');
const path = require('path');

const files = fs.readdirSync('.').filter(f => f.endsWith('.html'));
const templateKeywords = ['আফিয়া', 'আফিয়া', 'afiya', 'afia', 'কুষ্টিয়া এলাকায় চিকিৎসা'];

console.log('--- AUDITING HTML FILES FOR TEMPLATE LEFTOVERS ---');
let foundAny = false;
files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  templateKeywords.forEach(kw => {
    if (content.toLowerCase().includes(kw.toLowerCase())) {
      console.log(`[ALERT] Found "${kw}" in ${file}`);
      foundAny = true;
    }
  });
});
if (!foundAny) {
  console.log('[PASS] No old template business identity found in any generated or existing HTML files!');
}

console.log('\n--- VERIFYING SERVICE DETAIL PAGES & LINKS ---');
const serviceFiles = [
  'service-gap-filling.html',
  'service-root-canal.html',
  'service-crown.html',
  'service-scaling.html',
  'service-filling.html',
  'service-braces.html',
  'service-implants.html',
  'service-veneers.html',
  'service-invisalign.html',
  'service-smile-design.html',
  'service-whitening.html',
  'service-pediatric.html',
  'service-detail-template.html'
];

let allExist = true;
serviceFiles.forEach(sf => {
  if (fs.existsSync(sf)) {
    const size = fs.statSync(sf).size;
    console.log(`[OK] ${sf} exists (${size} bytes)`);
  } else {
    console.error(`[MISSING] ${sf}`);
    allExist = false;
  }
});

console.log('\n--- CHECKING IMAGES IN DETAIL & SERVICE PAGES ---');
const imageRegex = /src="(\/img\/[^"]+|\/lucky_image\/[^"]+)"/g;
let brokenImages = 0;
files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  let m;
  while ((m = imageRegex.exec(content)) !== null) {
    const relPath = m[1].replace(/^\//, '');
    if (!fs.existsSync(relPath)) {
      console.error(`[BROKEN IMAGE] In ${file}: ${m[1]} -> ${relPath} not found`);
      brokenImages++;
    }
  }
});
if (brokenImages === 0) {
  console.log('[PASS] All image references in HTML files exist locally!');
}
