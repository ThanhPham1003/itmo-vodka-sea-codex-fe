import { createServer } from 'node:http';
import { readFile, realpath } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export function createAppServer({ root = fileURLToPath(new URL('../', import.meta.url)), backend = process.env.BACKEND_ORIGIN || 'http://127.0.0.1:8080' } = {}) {
  const types = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.svg':'image/svg+xml', '.woff2':'font/woff2' };
  return createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/backend/health') {
      if (req.method !== 'GET') { res.writeHead(405).end(); return; }
      try {
        const response = await fetch(new URL('/health', backend), { signal: AbortSignal.timeout(5000), redirect: 'error', headers: { 'Accept':'application/json' } });
        const json = await response.json();
        res.writeHead(response.status, { 'Content-Type':'application/json', 'Cache-Control':'no-store', 'X-Request-ID':response.headers.get('X-Request-ID') || '' });
        res.end(JSON.stringify(json));
      } catch {
        res.writeHead(503, { 'Content-Type':'application/json', 'Cache-Control':'no-store' });
        res.end(JSON.stringify({ code:503, message:'Không thể kết nối backend. Kiểm tra BACKEND_ORIGIN và tiến trình Go.', data:null }));
      }
      return;
    }
    if (!['GET','HEAD'].includes(req.method)) { res.writeHead(405).end(); return; }
    let file;
    try {
      const path = decodeURIComponent(url.pathname);
      if (path !== '/' && !path.startsWith('/src/') && !path.startsWith('/assets/')) { res.writeHead(404).end(); return; }
      file = await realpath(resolve(root, '.' + (path === '/' ? '/index.html' : path)));
      if (!file.startsWith(resolve(root) + sep)) { res.writeHead(403).end(); return; }
      const body = await readFile(file);
      res.writeHead(200, { 'Content-Type':types[extname(file)] || 'application/octet-stream', 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff' });
      res.end(req.method === 'HEAD' ? undefined : body);
    } catch { res.writeHead(404).end('Not found'); }
  });
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 5173);
  createAppServer().listen(port, '127.0.0.1', () => console.log(`Folio: http://127.0.0.1:${port}`));
}
