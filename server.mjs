import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('.', import.meta.url));
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.png': 'image/png', '.md': 'text/plain; charset=utf-8', '.mp4': 'video/mp4' };
const port = Number(process.env.PORT || 4186);
http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    const pathname = decodeURIComponent(url.pathname);
    const file = path.resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
    if (!file.startsWith(root) || !['GET', 'HEAD'].includes(req.method)) {
      res.writeHead(403); res.end(); return;
    }
    const bytes = await readFile(file);
    const headers = { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store', 'Content-Length': bytes.length };
    if (path.extname(file) === '.mp4') {
      headers['Accept-Ranges'] = 'bytes';
      if (req.headers.range && req.method === 'GET') {
        const match = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
        let start = 0, end = bytes.length - 1;
        if (match && (match[1] || match[2])) {
          start = match[1] ? Number(match[1]) : Math.max(0, bytes.length - Number(match[2]));
          end = match[1] && match[2] ? Math.min(Number(match[2]), end) : end;
        }
        if (!match || (!match[1] && !match[2]) || !Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= bytes.length) {
          res.writeHead(416, { 'Content-Range': `bytes */${bytes.length}` }); res.end(); return;
        }
        res.writeHead(206, { ...headers, 'Content-Length': end - start + 1, 'Content-Range': `bytes ${start}-${end}/${bytes.length}` });
        res.end(bytes.subarray(start, end + 1)); return;
      }
    }
    res.writeHead(200, headers);
    res.end(req.method === 'HEAD' ? undefined : bytes);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('页面不存在');
  }
}).listen(port, '127.0.0.1', () => console.log(`广垦沉香大屏 http://127.0.0.1:${port}/`));
