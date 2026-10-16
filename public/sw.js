/* Nimble Nasties service worker: the app keeps working offline at the table.
 * - The page is network-first, so a deploy shows up on the next load; on a slow or
 *   missing connection the cached shell answers after NETWORK_WAIT.
 * - Hashed build assets never change, so they are cache-first. Each fresh page
 *   prunes the assets it no longer references, fonts its stylesheet dropped included.
 * - Other files on this origin come from cache and refresh in the background.
 * - Requests to other origins (Nimble Nexus imports) are never touched.
 * - Lookups ignore Vary: module scripts and fonts are requested with an Origin header
 *   the precached copies lack, so a server sending `Vary: Origin` would otherwise
 *   leave the app blank offline. These files are the same for every requester. */
const CACHE = 'nimble-nasties-v2';
const SHELL = '/';
const NETWORK_WAIT = 3000;
const STATIC = ['/manifest.webmanifest', '/favicon.ico', '/favicon-32.png', '/nimble-nasties-logo.webp', '/nimble-nasties-icon.webp', '/powered-by-nimble-black.webp', '/powered-by-nimble-white.webp'];

const assetUrls = (html) => [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((m) => m[1]);
const addQuietly = (cache, urls) => Promise.all(urls.map((url) => cache.add(url).catch(() => undefined)));
/** Font files a stylesheet references, as paths; `pattern` narrows them. */
const fontUrls = (css, text, pattern = /url\(["']?([^)"']+\.woff2?)["']?\)/g) => [...text.matchAll(pattern)].map((m) => new URL(m[1], new URL(css, self.location.origin)).pathname);

async function precache() {
  const cache = await caches.open(CACHE);
  const response = await fetch(SHELL, { cache: 'no-cache' });
  if (!response.ok) return;
  await cache.put(SHELL, response.clone());
  const assets = assetUrls(await response.text());
  await addQuietly(cache, [...assets, ...STATIC]);
  // Fonts are referenced from the stylesheet (Latin and Latin Extended only, see src/fonts.css).
  for (const css of assets.filter((url) => url.endsWith('.css'))) {
    const text = (await (await cache.match(css, MATCH))?.text()) ?? '';
    await addQuietly(cache, fontUrls(css, text));
  }
}

async function prune(cache, html) {
  const assets = assetUrls(html);
  const live = new Set(assets);
  // Fonts are live while the new stylesheet names them; if it can't be read, keep them all.
  let fontsKnown = true;
  for (const css of assets.filter((url) => url.endsWith('.css'))) {
    const response = await cacheFirst(new Request(css)).catch(() => null);
    if (!response?.ok) fontsKnown = false;
    else for (const font of fontUrls(css, await response.text())) live.add(font);
  }
  for (const request of await cache.keys()) {
    const { pathname } = new URL(request.url);
    if (!pathname.startsWith('/assets/') || live.has(pathname) || (!fontsKnown && /\.woff2?$/.test(pathname))) continue;
    await cache.delete(request);
  }
}

async function page(event) {
  const cache = await caches.open(CACHE);
  const network = fetch(event.request).then(async (response) => {
    if (response.ok && new URL(response.url).pathname === SHELL) {
      await cache.put(SHELL, response.clone());
      await prune(cache, await response.clone().text());
    }
    return response;
  });
  event.waitUntil(network.catch(() => undefined));
  const cached = await cache.match(SHELL);
  if (!cached) return network;
  const slow = new Promise((resolve) => setTimeout(() => resolve(cached), NETWORK_WAIT));
  return Promise.race([network.catch(() => cached), slow]);
}

const MATCH = { ignoreVary: true };

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request, MATCH);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) await cache.put(request, response.clone());
  return response;
}

async function staleWhileRevalidate(event) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(event.request, MATCH);
  const network = fetch(event.request).then(async (response) => {
    if (response.ok) await cache.put(event.request, response.clone());
    return response;
  });
  event.waitUntil(network.catch(() => undefined));
  return cached ?? network;
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    precache()
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (request.mode === 'navigate') event.respondWith(page(event));
  else if (url.pathname.startsWith('/assets/')) event.respondWith(cacheFirst(request));
  else event.respondWith(staleWhileRevalidate(event));
});
