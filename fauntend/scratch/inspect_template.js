const fs = require('fs');
const content = fs.readFileSync('detail-template.htm', 'utf8');

// Find headings and their context
const hRegex = /<(h[2-4])[^>]*>([\s\S]*?)<\/\1>/gi;
let match;
while ((match = hRegex.exec(content)) !== null) {
  const tag = match[1];
  const title = match[2].replace(/<[^>]+>/g, '').trim();
  const startIdx = match.index;
  const afterText = content.substring(startIdx, startIdx + 600)
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  console.log(`\n=== [${tag}] ${title} ===`);
  console.log(afterText.substring(0, 250) + '...');
}
