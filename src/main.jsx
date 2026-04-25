import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Register the service worker. Only in production builds — dev's HMR fights
// with SW caching and produces confusing stale UI. Failure to register is
// silent (we don't want a fatal error if the browser blocks SW for any reason).
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.warn("SW register failed:", err);
    });
  });
}
