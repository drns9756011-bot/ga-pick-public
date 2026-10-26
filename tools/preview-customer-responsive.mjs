import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, sep, extname } from 'node:path';

const root = fileURLToPath(new URL('../public/', import.meta.url));
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ico': 'image/x-icon' };
const publicApis = new Set(['/api/home-cases','/api/brand-packages','/api/subscription-products']);
const server = createServer(async (request, response) => {
  try {
    if (!['GET','HEAD'].includes(request.method)) { response.writeHead(405).end(); return; }
    const url = new URL(request.url, 'http://127.0.0.1');
    if (url.pathname.startsWith('/api/')) {
      if (!publicApis.has(url.pathname)) { response.writeHead(404, { 'Content-Type': 'application/json' }).end('{"ok":false}'); return; }
      const result = await fetch(`https://ga-pick.com${url.pathname}${url.search}`, { signal: AbortSignal.timeout(15000) });
      response.writeHead(result.status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      response.end(await result.text()); return;
    }
    let target = resolve(root, `.${decodeURIComponent(url.pathname)}`);
    if (target !== resolve(root) && !target.startsWith(resolve(root) + sep)) { response.writeHead(403).end(); return; }
    if ((await stat(target)).isDirectory()) target = resolve(target, 'index.html');
    const bytes = await readFile(target);
    response.writeHead(200, { 'Content-Type': types[extname(target)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    response.end(request.method === 'HEAD' ? undefined : bytes);
  } catch { response.writeHead(404).end('Not found'); }
});
server.listen(0, '127.0.0.1', () => console.log(`Read-only customer preview: http://127.0.0.1:${server.address().port}`));
for (const signal of ['SIGINT','SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)));
