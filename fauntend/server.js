const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 5173;
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json'
};

function writeNoCacheHeaders(res, statusCode, contentType) {
  res.writeHead(statusCode, {
    'Content-Type': contentType,
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0',
    Pragma: 'no-cache',
    Expires: '0'
  });
}

const server = http.createServer((req, res) => {
  let reqUrl = decodeURI(req.url.split('?')[0]);
  if (reqUrl === '/') reqUrl = '/index.html';

  let filePath = path.join(__dirname, reqUrl);

  // Support clean URLs (e.g. /service-root-canal -> /service-root-canal.html)
  if (!path.extname(filePath) && fs.existsSync(filePath + '.html')) {
    filePath = filePath + '.html';
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      const notFoundPath = path.join(__dirname, '404.html');
      fs.readFile(notFoundPath, (err404, data404) => {
        if (!err404) {
          writeNoCacheHeaders(res, 404, 'text/html; charset=utf-8');
          res.end(data404);
        } else {
          writeNoCacheHeaders(res, 404, 'text/html; charset=utf-8');
          res.end('<h1>404 Not Found - Lucky Dental Care</h1>');
        }
      });
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    writeNoCacheHeaders(res, 200, contentType);
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Lucky Dental Care server listening on http://127.0.0.1:${PORT}`);
});
