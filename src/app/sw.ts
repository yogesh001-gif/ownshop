/// <reference lib="webworker" />
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist';
import { CacheFirst, ExpirationPlugin, NetworkOnly, Serwist, StaleWhileRevalidate } from 'serwist';

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const sensitiveCacheNames = ['apis', 'pages', 'pages-rsc', 'pages-rsc-prefetch', 'next-data', 'others'];

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => Promise.all(
      cacheNames
        .filter((cacheName) => sensitiveCacheNames.some((name) => cacheName.includes(name)))
        .map((cacheName) => caches.delete(cacheName)),
    )),
  );
});

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  // Do not cache API responses or authenticated pages. Only public static assets
  // are cached, so a shared device cannot reveal a previous user's business data.
  runtimeCaching: [
    {
      matcher: ({ sameOrigin, url }) => sameOrigin && url.pathname.startsWith('/_next/static/'),
      handler: new CacheFirst({
        cacheName: 'next-static-assets',
        plugins: [new ExpirationPlugin({ maxEntries: 96, maxAgeSeconds: 24 * 60 * 60 })],
      }),
    },
    {
      matcher: ({ sameOrigin, url }) => sameOrigin && /\.(?:png|svg|ico|webp|woff2?)$/i.test(url.pathname),
      handler: new StaleWhileRevalidate({
        cacheName: 'public-static-assets',
        plugins: [new ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 30 * 24 * 60 * 60 })],
      }),
    },
    { matcher: /.*/i, method: 'GET', handler: new NetworkOnly() },
  ],
});

serwist.addEventListeners();
