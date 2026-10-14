import { useEffect, useState, useRef } from 'react';
type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};
export function usePwa(canUpdate: () => boolean) {
  const allowed = useRef(canUpdate);
  allowed.current = canUpdate;
  const [offline, setOffline] = useState(!navigator.onLine);
  const [install, setInstall] = useState<InstallEvent | null>(null);
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  const [standalone, setStandalone] = useState(
    window.matchMedia('(display-mode: standalone)').matches
  );
  useEffect(() => {
    const online = () => setOffline(!navigator.onLine);
    const prompt = (event: Event) => {
      event.preventDefault();
      setInstall(event as InstallEvent);
    };
    const installed = () => {
      setInstall(null);
      setStandalone(true);
    };
    window.addEventListener('online', online);
    window.addEventListener('offline', online);
    window.addEventListener('beforeinstallprompt', prompt);
    window.addEventListener('appinstalled', installed);
    let stopped = false;
    if (import.meta.env.PROD && 'serviceWorker' in navigator) {
      void navigator.serviceWorker
        .register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL })
        .then((reg) => {
          if (stopped) return;
          if (reg.waiting) setWaiting(reg.waiting);
          reg.addEventListener('updatefound', () => {
            const worker = reg.installing;
            worker?.addEventListener('statechange', () => {
              if (worker.state === 'installed' && navigator.serviceWorker.controller)
                setWaiting(worker);
            });
          });
        })
        .catch(() => {});
    }
    return () => {
      stopped = true;
      window.removeEventListener('online', online);
      window.removeEventListener('offline', online);
      window.removeEventListener('beforeinstallprompt', prompt);
      window.removeEventListener('appinstalled', installed);
    };
  }, []);
  return {
    offline,
    standalone,
    canInstall: Boolean(install),
    hasUpdate: Boolean(waiting),
    install: async () => {
      await install?.prompt();
      if (install) {
        const result = await install.userChoice;
        if (result.outcome === 'accepted') setInstall(null);
      }
    },
    applyUpdate: () => {
      if (!waiting || !allowed.current()) return;
      navigator.serviceWorker.addEventListener(
        'controllerchange',
        () => {
          setWaiting(null);
          if (allowed.current()) window.location.reload();
        },
        { once: true }
      );
      waiting.postMessage({ type: 'ACTIVATE_UPDATE' });
    },
  };
}
export type Pwa = ReturnType<typeof usePwa>;
