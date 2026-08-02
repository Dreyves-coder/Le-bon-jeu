import { useEffect, useState } from 'react';

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true;
}

export default function InstallPwaButton() {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [installed, setInstalled] = useState(isStandalone);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const isIos = /iphone|ipad|ipod/i.test(window.navigator.userAgent);

  useEffect(() => {
    function handlePrompt(event) {
      event.preventDefault();
      setInstallPrompt(event);
    }

    function handleInstalled() {
      setInstalled(true);
      setInstallPrompt(null);
    }

    window.addEventListener('beforeinstallprompt', handlePrompt);
    window.addEventListener('appinstalled', handleInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handlePrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  if (installed || (!installPrompt && !isIos)) return null;

  async function install() {
    if (installPrompt) {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === 'accepted') setInstalled(true);
      setInstallPrompt(null);
      return;
    }
    setShowIosHelp((visible) => !visible);
  }

  return (
    <div className="pwa-install">
      <button type="button" className="pwa-install-button" onClick={install}>
        Installer Mahana Win
      </button>
      {showIosHelp ? (
        <p>Sur iPad, touchez Partager puis &laquo; Sur l&apos;&#233;cran d&apos;accueil &raquo;.</p>
      ) : null}
    </div>
  );
}
