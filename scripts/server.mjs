import { createServer } from 'node:http';
import { readFile, realpath } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { realpathSync } from 'node:fs';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

export function createAppServer({ root = process.env.STATIC_ROOT || fileURLToPath(new URL('../', import.meta.url)), backend = process.env.BACKEND_ORIGIN || 'http://127.0.0.1:8080', proxyTimeoutMs = 30000 } = {}) {
  const staticRoot = realpathSync(resolve(root));
  const upstream = new URL(backend);
  if (!['http:','https:'].includes(upstream.protocol) || upstream.username || upstream.password || upstream.pathname !== '/' || upstream.search || upstream.hash) throw new Error('BACKEND_ORIGIN must be an HTTP(S) origin without credentials, path or query.');
  const types = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.svg':'image/svg+xml', '.woff2':'font/woff2' };
  return createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/login' || url.pathname === '/signup') {
      if (!['GET','HEAD'].includes(req.method)) { res.writeHead(405).end(); return; }
      res.writeHead(302, { Location:'/' + url.search + '#' + url.pathname, 'Cache-Control':'no-store' });
      res.end();
      return;
    }
    const health = url.pathname === '/backend/health';
    if (health || url.pathname.startsWith('/api/v1/')) {
      const jsonError = (status, message) => { res.writeHead(status, { 'Content-Type':'application/json', 'Cache-Control':'no-store' }); res.end(JSON.stringify({code:status,message,data:null})); };
      if (health && req.method !== 'GET' || !['GET','HEAD','POST','PUT','PATCH','DELETE','OPTIONS'].includes(req.method)) { jsonError(405,'Method not allowed'); return; }
      if (req.headers['content-encoding'] && req.headers['content-encoding'] !== 'identity') { jsonError(415,'Unsupported request encoding'); return; }
      const controller = new AbortController();
      const abort = () => controller.abort();
      req.once('aborted', abort);
      const close = () => { if (!res.writableEnded) controller.abort(); };
      res.once('close', close);
      try {
        const headers = new Headers();
        const allow = health ? ['accept','x-request-id'] : ['accept','authorization','content-type','x-request-id','if-match','range'];
        for (const name of allow) if (req.headers[name]) headers.set(name,req.headers[name]);
        headers.set('Accept-Encoding','identity');
        const hasBody = !['GET','HEAD'].includes(req.method);
        const response = await fetch(new URL(health ? '/health' : url.pathname + url.search, upstream), {
          method:req.method, headers, signal:AbortSignal.any([controller.signal,AbortSignal.timeout(health ? Math.min(proxyTimeoutMs,5000) : url.pathname === '/api/v1/assistant/chat' ? Math.max(proxyTimeoutMs,65000) : proxyTimeoutMs)]),
          redirect:'manual', ...(hasBody ? {body:req,duplex:'half'} : {})
        });
        // Never follow redirects carrying credentials to another service.
        if (response.status >= 300 && response.status < 400) { await response.body?.cancel(); jsonError(502,'Backend returned an unexpected redirect'); return; }
        const outgoing = { 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff' };
        for (const name of ['content-type','content-security-policy','x-request-id','content-disposition','content-range','accept-ranges','www-authenticate','retry-after','etag']) {
          const value=response.headers.get(name); if(value)outgoing[name]=value;
        }
        res.writeHead(response.status,outgoing);
        if (!response.body || req.method === 'HEAD') res.end();
        else await pipeline(Readable.fromWeb(response.body),res);
      } catch {
        if (!res.headersSent && !res.destroyed) jsonError(503,'Không thể kết nối backend. Kiểm tra BACKEND_ORIGIN và tiến trình Go.');
        else if (!res.destroyed) res.destroy();
      } finally { req.off('aborted',abort); res.off('close',close); }
      return;
    }
    if (!['GET','HEAD'].includes(req.method)) { res.writeHead(405).end(); return; }
    let file;
    try {
      const path = decodeURIComponent(url.pathname);
      if (path !== '/' && !path.startsWith('/src/') && !path.startsWith('/assets/')) { res.writeHead(404).end(); return; }
      file = await realpath(resolve(staticRoot, '.' + (path === '/' ? '/index.html' : path)));
      if (!file.startsWith(staticRoot + sep)) { res.writeHead(403).end(); return; }
      const body = await readFile(file);
      res.writeHead(200, { 'Content-Type':types[extname(file)] || 'application/octet-stream', 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff' });
      res.end(req.method === 'HEAD' ? undefined : body);
    } catch { res.writeHead(404).end('Not found'); }
  });
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 5173);
  const host = process.env.HOST || '127.0.0.1';
  const server = createAppServer();
  server.listen(port, host, () => console.log(`DocSense AI: http://${host}:${port}`));
  for (const signal of ['SIGTERM','SIGINT']) process.once(signal,()=>{server.close();setTimeout(()=>process.exit(0),5000).unref();});
}
