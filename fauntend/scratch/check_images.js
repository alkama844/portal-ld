const fs = require('fs');
const path = require('path');

const dir = 'c:/Users/Rc/Downloads/Compressed/patient-portal/fauntend';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

const imgRefs = {};
files.forEach(f => {
  const content = fs.readFileSync(path.join(dir, f), 'utf8');
  const regex = /(src|href)\s*=\s*["']([^"']+\.(?:jpg|jpeg|png|webp|svg|ico))["']/gi;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const src = match[2];
    if (!imgRefs[src]) imgRefs[src] = [];
    if (!imgRefs[src].includes(f)) imgRefs[src].push(f);
  }
});

console.log('Image references across HTML files:');
for (const [img, fileList] of Object.entries(imgRefs)) {
  // Check if file actually exists
  let localPath = img;
  if (localPath.startsWith('/')) localPath = '.' + localPath;
  const exists = fs.existsSync(path.join(dir, localPath));
  console.log(`[${exists ? 'EXISTS' : 'MISSING'}] ${img} -> in ${fileList.length} files: ${fileList.join(', ')}`);
}
