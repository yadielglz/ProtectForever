import { useState, useEffect } from 'react';
import { CONFIG } from './config';
import { useInactivityTimer } from './hooks/useInactivityTimer';
import SplashScreen from './components/SplashScreen/SplashScreen';
import PasscodeScreen from './components/PasscodeScreen/PasscodeScreen';
import Topbar from './components/Topbar/Topbar';
import ProtectApp from './components/ProtectApp/ProtectApp';
import Settings from './components/Settings/Settings';
import Toast from './components/Toast/Toast';

function App() {
  const [showSplash, setShowSplash] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [toast, setToast] = useState(null);

  const lockApp = () => {
    setIsAuthenticated(false);
  };

  const { remainingMs, reset: resetInactivity } = useInactivityTimer({
    timeoutMs: CONFIG.INACTIVITY_TIMEOUT,
    enabled: isAuthenticated,
    onTimeout: lockApp,
  });

  useEffect(() => {
    const hasLoaded = localStorage.getItem('appHasLoaded');
    if (!hasLoaded) {
      setShowSplash(true);
      const t = setTimeout(() => {
        setShowSplash(false);
        localStorage.setItem('appHasLoaded', 'true');
      }, 3000);
      return () => clearTimeout(t);
    }
  }, []);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleUnlock = () => {
    setIsAuthenticated(true);
    resetInactivity();
  };

  if (showSplash) {
    return <SplashScreen />;
  }

  return (
    <>
      {!isAuthenticated ? (
        <PasscodeScreen onUnlock={handleUnlock} visible={!showSplash} />
      ) : (
        <div className="main-app" onMouseDown={resetInactivity} onTouchStart={resetInactivity} onKeyDown={resetInactivity}>
          <div className="app-shell">
            <aside className="app-rail" aria-label="Primary">
              <div className="rail-brand">
                <div className="brand-badge">
                  <i className="fas fa-store"></i>
                </div>
                <div className="brand-text">StoreView</div>
              </div>
              <div className="rail-nav" role="tablist">
                <button className="rail-item active" aria-selected="true">
                  <i className="fas fa-shield"></i>
                  <span className="nav-label">Protect</span>
                </button>
              </div>
              <div className="rail-footer">
                <button className="rail-item rail-settings" type="button" onClick={() => setShowSettings(true)}>
                  <i className="fas fa-ellipsis"></i>
                  <span className="nav-label">More</span>
                </button>
              </div>
            </aside>
            <div className="app-body">
              <Topbar remainingMs={remainingMs} />
              <main className="main-content" role="main">
                <ProtectApp showToast={showToast} />
              </main>
            </div>
          </div>
        </div>
      )}

      {showSettings && (
        <Settings
          onClose={() => setShowSettings(false)}
          remainingMs={remainingMs}
          showToast={showToast}
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} />}
    </>
  );
}

export default App;
