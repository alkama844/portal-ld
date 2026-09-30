const fs = require('fs');

const testFiles = [
  'index.html',
  'service.html',
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

let totalLinksChecked = 0;
let brokenLinks = 0;

testFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const hrefRegex = /href="([^"#?]+)(?:[#?][^"]*)?"/g;
  let m;
  while ((m = hrefRegex.exec(content)) !== null) {
    const rawHref = m[1];
    if (rawHref.startsWith('tel:') || rawHref.startsWith('mailto:') || rawHref.startsWith('http://') || rawHref.startsWith('https://')) {
      continue;
    }
    totalLinksChecked++;
    let target = rawHref;
    if (target.startsWith('/')) target = target.substring(1);
    if (target === '' || target === '/') target = 'index.html';
    
    // Check if file exists as-is or with .html
    let exists = fs.existsSync(target);
    if (!exists && !target.endsWith('.html')) {
      exists = fs.existsSync(target + '.html');
    }

    if (!exists) {
      console.error(`[BROKEN LINK] in ${file}: "${rawHref}" target not found`);
      brokenLinks++;
    }
  }
});

console.log(`Total internal links checked: ${totalLinksChecked}`);
if (brokenLinks === 0) {
  console.log('[PASS] 100% of internal links successfully resolve to valid pages!');
} else {
  console.error(`[FAIL] ${brokenLinks} broken links found.`);
}
