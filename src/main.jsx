import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

const rootElement = document.getElementById('root');

if (rootElement) {
  createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
} else {
  document.body.innerHTML = '<main style="min-height:100vh;background:#080d16;color:white;font-family:system-ui;padding:24px"><h1>IronLog launch error</h1><p>Root element missing.</p></main>';
}
