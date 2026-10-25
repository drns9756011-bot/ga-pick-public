// Local-only integration fixture. All records and credentials exist in memory.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import { onRequest as publicRequest } from '../functions/api/[[path]].js';
import { onRequest as adminRequest } from '../../ga-pick-admin/functions/api/[[path]].js';
const db = new DatabaseSync(':memory:');
db.exec(`CREATE TABLE approved_sellers(seller_id TEXT PRIMARY KEY,status TEXT,manager TEXT,branch TEXT,channel TEXT);
 CREATE TABLE seller_sessions(token_hash TEXT,seller_id TEXT,expires_at TEXT,created_at TEXT);`);
db.prepare('INSERT INTO approved_sellers VALUES(?,?,?,?,?)').run('preview-seller', 'approved', '테스트 매니저', '강남점', 'LG전자');
db.prepare('INSERT INTO seller_sessions VALUES(?,?,?,?)').run(createHash('sha256').update('preview-session').digest('hex'), 'preview-seller', new Date(Date.now() + 3600000).toISOString(), new Date().toISOString());
const DB = { prepare(sql) { let values = []; return {
 bind(...args) { values = args; return this; },
 async run() { return { meta: { changes: db.prepare(sql).run(...values).changes } }; },
 async first() { return db.prepare(sql).get(...values) || null; },
 async all() { return { results: db.prepare(sql).all(...values) }; },
}; }, async batch(statements) { db.exec('BEGIN'); try { const results = []; for (const s of statements) results.push(await s.run()); db.exec('COMMIT'); return results; } catch (e) { db.exec('ROLLBACK'); throw e; } } };
const env = { DB, ADMIN_API_TOKEN: 'preview-only', CUSTOMER_PHONE_KEY: Buffer.alloc(32, 9).toString('base64') };
const base = new URL('../../ga-pick-admin/', import.meta.url);
const types = { js: 'text/javascript', css: 'text/css', woff2: 'font/woff2', html: 'text/html' };
createServer(async (req, res) => {
 try {
  const url = new URL(req.url, 'http://127.0.0.1:65146');
  if (url.pathname.startsWith('/api/assigned-leads') || url.pathname.startsWith('/api/lead-payments')) {
   const chunks = []; let size = 0;
   for await (const chunk of req) { size += chunk.length; if (size > 140000) { res.writeHead(413).end(); return; } chunks.push(chunk); }
   const request = new Request(url, { method: req.method, headers: req.headers, ...(['GET','HEAD'].includes(req.method) ? {} : { body: Buffer.concat(chunks) }) });
   const handler = req.headers['x-seller-session'] ? publicRequest : adminRequest;
   const result = await handler({ env, request, params: { path: url.pathname.slice(5).split('/') } });
   res.writeHead(result.status, Object.fromEntries(result.headers)); res.end(await result.text()); return;
  }
  if (['/db-checkout','/db-checkout/checkout.css','/db-checkout/checkout.js','/assets/pickquote-official-logo-navy.png'].includes(url.pathname)) {
   const file = url.pathname === '/db-checkout' ? '/db-checkout/index.html' : url.pathname;
   const bytes = await readFile(new URL(`../../ga-pick-partner/public${file}`, import.meta.url));
   res.writeHead(200, { 'Content-Type': file.endsWith('.png') ? 'image/png' : `${types[file.split('.').pop()]}; charset=utf-8`, 'Cache-Control':'no-store' });
   res.end(file.endsWith('.html') ? bytes.toString().replace('</head>', "<script>sessionStorage.setItem('pickquoteSellerSessionToken','preview-session')</script></head>") : bytes); return;
  }
  if (url.pathname === '/seller-preview') {
   res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
   res.end(`<!doctype html><html lang="ko"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>로컬 테스트 · 배정 고객</title><link rel="stylesheet" href="/lead-workspace.css"><script>sessionStorage.setItem('pickquoteSellerSessionToken','preview-session');addEventListener('DOMContentLoaded',()=>document.dispatchEvent(new Event('seller-leads-open')));</script><script defer src="/lead-workspace.js" data-role="seller"></script></head><body class="lead-admin-body"><nav class="lead-admin-nav"><strong>픽견적 파트너 · 로컬 테스트</strong></nav><main><section id="leadWorkspace"></section></main></body></html>`); return;
  }
  const paths = ['/lead-workspace.js', '/lead-workspace.css', '/vendor/xlsx.full.min.js', '/assets/suit-variable.woff2'];
  const file = url.pathname === '/' ? 'lead-customers/index.html' : paths.includes(url.pathname) ? url.pathname.slice(1) : null;
  if (!file) { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'Content-Type': `${types[file.split('.').pop()]}; charset=utf-8`, 'Cache-Control': 'no-store' }); res.end(await readFile(new URL(file, base)));
 } catch { res.writeHead(500).end('Preview error'); }
}).listen(65146, '127.0.0.1', () => console.log('Local-only fixture http://127.0.0.1:65146 (admin token: preview-only)'));
