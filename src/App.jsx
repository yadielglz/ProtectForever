import { useState, useEffect } from 'react';
import { CONFIG } from './config';
import { useInactivityTimer } from './hooks/useInactivityTimer';
import SplashScreen from './components/SplashScreen/SplashScreen';
import PasscodeScreen from './components/PasscodeScreen/PasscodeScreen';
import Topbar from './components/Topbar/Topbar';
import ProtectApp from './components/ProtectApp/ProtectApp';
import AppointmentBoard from './components/AppointmentBoard/AppointmentBoard';
import FollowUpCRM from './components/FollowUpCRM/FollowUpCRM';
import SalesTracker from './components/SalesTracker/SalesTracker';
import NumberPortability from './components/NumberPortability/NumberPortability';
import Settings from './components/Settings/Settings';
import Toast from './components/Toast/Toast';

function App() {
  const [showSplash, setShowSplash] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [toast, setToast] = useState(null);
  const [activeModule, setActiveModule] = useState('protect');

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
                <div className="brand-text">Home</div>
              </div>
              <div className="rail-nav" role="tablist">
                <button
                  className={`rail-item ${activeModule === 'protect' ? 'active' : ''}`}
                  aria-selected={activeModule === 'protect'}
                  onClick={() => setActiveModule('protect')}
                >
                  <i className="fas fa-shield"></i>
                  <span className="nav-label">Protect</span>
                </button>
                <button
                  className={`rail-item ${activeModule === 'appointments' ? 'active' : ''}`}
                  aria-selected={activeModule === 'appointments'}
                  onClick={() => setActiveModule('appointments')}
                >
                  <i className="fas fa-calendar-check"></i>
                  <span className="nav-label">Appts</span>
                </button>
                <button
                  className={`rail-item ${activeModule === 'crm' ? 'active' : ''}`}
                  aria-selected={activeModule === 'crm'}
                  onClick={() => setActiveModule('crm')}
                >
                  <i className="fas fa-users"></i>
                  <span className="nav-label">CRM</span>
                </button>
                <button
                  className={`rail-item ${activeModule === 'sales' ? 'active' : ''}`}
                  aria-selected={activeModule === 'sales'}
                  onClick={() => setActiveModule('sales')}
                >
                  <i className="fas fa-chart-line"></i>
                  <span className="nav-label">Sales</span>
                </button>
                <button
                  className={`rail-item ${activeModule === 'portability' ? 'active' : ''}`}
                  aria-selected={activeModule === 'portability'}
                  onClick={() => setActiveModule('portability')}
                >
                  <i className="fas fa-sim-card"></i>
                  <span className="nav-label">Port</span>
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
                {activeModule === 'protect' && <ProtectApp showToast={showToast} />}
                {activeModule === 'appointments' && <AppointmentBoard showToast={showToast} />}
                {activeModule === 'crm' && <FollowUpCRM showToast={showToast} />}
                {activeModule === 'sales' && <SalesTracker showToast={showToast} />}
                {activeModule === 'portability' && <NumberPortability showToast={showToast} />}
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
