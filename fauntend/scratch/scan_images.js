const fs = require('fs');
const path = require('path');

const dir = 'fauntend';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

const imageUsage = {};

files.forEach(file => {
  const content = fs.readFileSync(path.join(dir, file), 'utf8');
  const imgRegex = /src=["']([^"']+\.(?:jpg|jpeg|png|webp|svg|avif))["']/gi;
  let match;
  while ((match = imgRegex.exec(content)) !== null) {
    const src = match[1];
    if (!imageUsage[src]) imageUsage[src] = [];
    if (!imageUsage[src].includes(file)) imageUsage[src].push(file);
  }

  // Also check background images
  const bgRegex = /url\(["']?([^"')]+\.(?:jpg|jpeg|png|webp|svg|avif))["']?\)/gi;
  while ((match = bgRegex.exec(content)) !== null) {
    const src = match[1];
    if (!imageUsage[src]) imageUsage[src] = [];
    if (!imageUsage[src].includes(file)) imageUsage[src].push(file);
  }
});

console.log(JSON.stringify(imageUsage, null, 2));
