import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

function InitialSiteLoader() {
  const [mounted, setMounted] = useState(true);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    let minimumElapsed = false;
    let pageLoaded = document.readyState === 'complete';
    let finishing = false;
    let removeTimer;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const revealSite = () => {
      if (finishing || !minimumElapsed || !pageLoaded) return;

      finishing = true;
      setLeaving(true);
      window.clearTimeout(maximumTimer);

      removeTimer = window.setTimeout(() => {
        document.body.style.overflow = previousOverflow;
        setMounted(false);
      }, 350);
    };

    const handleWindowLoad = () => {
      pageLoaded = true;
      revealSite();
    };

    const minimumTimer = window.setTimeout(() => {
      minimumElapsed = true;
      revealSite();
    }, 550);

    // Do not let a slow third-party widget keep the loading screen open forever.
    const maximumTimer = window.setTimeout(() => {
      minimumElapsed = true;
      pageLoaded = true;
      revealSite();
    }, 5000);

    if (pageLoaded) {
      window.requestAnimationFrame(revealSite);
    } else {
      window.addEventListener('load', handleWindowLoad, { once: true });
    }

    return () => {
      window.removeEventListener('load', handleWindowLoad);
      window.clearTimeout(minimumTimer);
      window.clearTimeout(maximumTimer);
      window.clearTimeout(removeTimer);
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  if (!mounted) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading Ni Bin Guy website"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2147483647,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '18px',
        padding: '24px',
        background: '#000',
        color: '#fff',
        opacity: leaving ? 0 : 1,
        visibility: leaving ? 'hidden' : 'visible',
        transition: 'opacity 350ms ease, visibility 350ms ease',
      }}
    >
      <style>{`
        @keyframes ni-bin-guy-loader-spin {
          to { transform: rotate(360deg); }
        }

        @media (prefers-reduced-motion: reduce) {
          .ni-bin-guy-loader-spinner { animation: none !important; }
        }
      `}</style>

      <img
        src="/logo.png"
        alt=""
        width="180"
        height="180"
        style={{
          width: 'min(180px, 48vw)',
          height: 'auto',
          borderRadius: '18px',
          boxShadow: '0 18px 50px rgba(0, 0, 0, 0.45)',
        }}
      />

      <div
        className="ni-bin-guy-loader-spinner"
        aria-hidden="true"
        style={{
          width: '34px',
          height: '34px',
          border: '3px solid rgba(255, 255, 255, 0.22)',
          borderTopColor: '#4ade80',
          borderRadius: '50%',
          animation: 'ni-bin-guy-loader-spin 800ms linear infinite',
        }}
      />

      <p style={{ margin: 0, fontSize: '15px', fontWeight: 700, letterSpacing: '0.02em' }}>
        Loading Ni Bin Guy…
      </p>
    </div>
  );
}

const showInitialLoader = window.location.pathname === '/';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      {showInitialLoader ? <InitialSiteLoader /> : null}
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
