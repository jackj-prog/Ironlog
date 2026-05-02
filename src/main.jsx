import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

const rootElement = document.getElementById('root');

createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

function assetUrl(path) {
  return new URL(path, window.location.href).toString();
}

async function warmOfflineCache() {
  if (!('caches' in window)) return;

  const coreAssets = [
    assetUrl(import.meta.env.BASE_URL),
    assetUrl(`${import.meta.env.BASE_URL}manifest.webmanifest`),
    assetUrl(`${import.meta.env.BASE_URL}icons/favicon.svg`),
    assetUrl(`${import.meta.env.BASE_URL}icons/apple-touch-icon.svg`),
    assetUrl(`${import.meta.env.BASE_URL}icons/app-icon.svg`),
  ];

  const loadedAssets = Array.from(document.querySelectorAll('script[src], link[rel="stylesheet"][href]')).map(
    (element) => element.src || element.href,
  );

  const cache = await caches.open('ironlog-v1');
  await Promise.allSettled([...new Set([...coreAssets, ...loadedAssets])].map((url) => cache.add(url)));
}

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}service-worker.js`).then(warmOfflineCache).catch(() => {});
  });
}
