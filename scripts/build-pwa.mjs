import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const base = process.env.BASE_PATH || '/bolchefitness/';
if (!base.startsWith('/') || !base.endsWith('/'))
  throw new Error('BASE_PATH precisa começar e terminar com /.');
const manifest = {
  id: base,
  name: 'Bolchefitness',
  short_name: 'Bolchefitness',
  description:
    'Grátis e de código aberto para bolcheviques fitness. Fichas, séries e histórico offline.',
  lang: 'pt-BR',
  start_url: base,
  scope: base,
  display: 'standalone',
  background_color: '#100C0D',
  theme_color: '#100C0D',
  icons: [
    { src: `${base}icons/icon-192.png`, sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: `${base}icons/icon-512.png`, sizes: '512x512', type: 'image/png', purpose: 'any' },
    {
      src: `${base}icons/maskable-512.png`,
      sizes: '512x512',
      type: 'image/png',
      purpose: 'maskable',
    },
  ],
};
await writeFile('dist/manifest.webmanifest', JSON.stringify(manifest, null, 2));
async function walk(dir) {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const name = `${dir}/${entry.name}`;
    if (entry.isDirectory()) files.push(...(await walk(name)));
    else if (entry.name !== 'sw.js') files.push(name);
  }
  return files;
}
const files = await walk('dist');
const hash = createHash('sha256');
for (const f of files.sort()) hash.update(await readFile(f));
const version = hash.digest('hex').slice(0, 16);
const urls = [base, ...files.map((f) => base + f.slice(5))];
await writeFile(
  'dist/sw.js',
  `
const BASE=${JSON.stringify(base)};
const CACHE='bolchefitness-'+BASE+'-${version}';
const URLS=${JSON.stringify(urls)};
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(URLS))));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 const keys=await caches.keys();await Promise.all(keys.filter(k=>k.startsWith('bolchefitness-'+BASE+'-')&&k!==CACHE).map(k=>caches.delete(k)));
 await self.clients.claim();
})()));
self.addEventListener('message',event=>{if(event.data?.type==='ACTIVATE_UPDATE')self.skipWaiting();});
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||url.origin!==self.location.origin||!url.pathname.startsWith(BASE))return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  if(event.request.mode==='navigate')return (await cache.match(BASE+'index.html'))||fetch(event.request);
  return (await cache.match(event.request,{ignoreSearch:true,ignoreVary:true}))||fetch(event.request);
 })());
});
`
);
console.log(`PWA: ${urls.length} recursos locais em precache; versão ${version}`);
