const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '../fauntend');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

files.forEach(f => {
  const content = fs.readFileSync(path.join(dir, f), 'utf8');
  const scripts = [];
  const matches = content.match(/<script[^>]+src=["']([^"']+)["']/g) || [];
  matches.forEach(m => {
    const src = m.match(/src=["']([^"']+)["']/)[1];
    scripts.push(src);
  });
  console.log(f + ': ' + scripts.join(', '));
});
