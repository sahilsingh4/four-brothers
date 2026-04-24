import { useState, useEffect } from "react";

// Reactive online/offline state. `navigator.onLine === false` is the only
// reliable "definitely offline" signal from the browser; true can lie.
export const useNetworkStatus = () => {
  const [online, setOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine !== false
  );
  useEffect(() => {
    const onUp = () => setOnline(true);
    const onDown = () => setOnline(false);
    window.addEventListener("online", onUp);
    window.addEventListener("offline", onDown);
    return () => {
      window.removeEventListener("online", onUp);
      window.removeEventListener("offline", onDown);
    };
  }, []);
  return online;
};
