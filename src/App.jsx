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

const MODULES = [
  {
    id: 'protect',
    label: 'Protect',
    icon: 'fa-shield',
    description: 'Lookup device protection options and verified inventory.',
    component: ProtectApp,
  },
  {
    id: 'appointments',
    label: 'Appointments',
    icon: 'fa-calendar-check',
    description: 'Manage appointments and service flow for the day.',
    component: AppointmentBoard,
  },
  {
    id: 'crm',
    label: 'CRM',
    icon: 'fa-users',
    description: 'Track lead follow-up, reminders, and outcomes.',
    component: FollowUpCRM,
  },
  {
    id: 'sales',
    label: 'Sales',
    icon: 'fa-chart-line',
    description: 'Capture daily sales totals and supporting notes.',
    component: SalesTracker,
  },
  {
    id: 'portability',
    label: 'Portability',
    icon: 'fa-sim-card',
    description: 'Reference number portability requirements by carrier.',
    component: NumberPortability,
  },
];

function App() {
  const [showSplash, setShowSplash] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [toast, setToast] = useState(null);
  const [activeModule, setActiveModule] = useState('protect');
  const activeModuleConfig = MODULES.find((module) => module.id === activeModule) || MODULES[0];
  const ActiveModuleComponent = activeModuleConfig.component;

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
            <Topbar remainingMs={remainingMs} />

            <div className="workspace-bar">
              <div className="workspace-brand">
                <div className="workspace-badge">PF</div>
                <div className="workspace-copy">
                  <span className="workspace-kicker">Unified workspace</span>
                  <h1>{CONFIG.APP_NAME}</h1>
                  <p>{activeModuleConfig.description}</p>
                </div>
              </div>

              <div className="workspace-actions">
                <div className="workspace-active">
                  <span>Active page</span>
                  <strong>{activeModuleConfig.label}</strong>
                </div>
                <button className="workspace-settingsBtn" type="button" onClick={() => setShowSettings(true)}>
                  <i className="fas fa-sliders-h"></i>
                  <span>Settings</span>
                </button>
              </div>
            </div>

            <nav className="module-tabs" aria-label="Primary">
              {MODULES.map((module) => (
                <button
                  key={module.id}
                  type="button"
                  className={`module-tab ${activeModule === module.id ? 'active' : ''}`}
                  aria-selected={activeModule === module.id}
                  onClick={() => setActiveModule(module.id)}
                >
                  <i className={`fas ${module.icon}`}></i>
                  <span>{module.label}</span>
                </button>
              ))}
            </nav>

            <main className="main-content" role="main">
              <div className="page-shell">
                <ActiveModuleComponent key={activeModuleConfig.id} showToast={showToast} />
              </div>
            </main>
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
