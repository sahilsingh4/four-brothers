import { useEffect, useState } from "react";
import { Download } from "lucide-react";

// Captures the browser's beforeinstallprompt event so we can offer the user a
// one-tap "Install app" button that adds 4 Brothers to their phone home screen
// (Android Chrome, Edge desktop, etc). Hidden when:
//  - The app is already running standalone (already installed)
//  - The browser hasn't fired the event yet (Safari iOS doesn't — users there
//    install via Share → Add to Home Screen)
//  - The user already dismissed it once this session
//
// We also listen for `appinstalled` to clear the button immediately on success.
const DISMISS_KEY = "fbt:install-dismissed";

export const InstallAppButton = ({ compact = false }) => {
  const [deferred, setDeferred] = useState(null);
  // Detect already-running-standalone at init time so we don't paint a flash
  // of the button on iOS where it's already installed.
  const [installed, setInstalled] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.matchMedia("(display-mode: standalone)").matches
        || window.navigator.standalone === true;
    } catch { return false; }
  });
  const [dismissed, setDismissed] = useState(() => {
    try { return !!sessionStorage.getItem(DISMISS_KEY); } catch { return false; }
  });

  useEffect(() => {
    const onBeforeInstall = (e) => {
      e.preventDefault();
      setDeferred(e);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed || dismissed || !deferred) return null;

  const handleClick = async () => {
    try {
      deferred.prompt();
      const choice = await deferred.userChoice;
      // Whether accepted or dismissed, we shouldn't pester this session again.
      try { sessionStorage.setItem(DISMISS_KEY, "1"); } catch { /* noop */ }
      setDismissed(true);
      if (choice?.outcome === "accepted") setInstalled(true);
    } catch (err) {
      console.warn("Install prompt failed:", err);
    } finally {
      setDeferred(null);
    }
  };

  if (compact) {
    return (
      <button
        type="button"
        onClick={handleClick}
        className="btn-ghost"
        title="Install 4 Brothers as an app on your home screen"
        style={{ fontSize: 11, padding: "4px 10px", display: "inline-flex", alignItems: "center", gap: 4 }}
      >
        <Download size={12} /> Install app
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="btn-primary"
      style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12 }}
    >
      <Download size={14} /> Install 4 Brothers app
    </button>
  );
};
