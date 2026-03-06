import { useState, useEffect } from 'react';
import { CONFIG } from '../../config';
import styles from './Settings.module.css';

const HELPDESK_STORES = [
  { label: 'Store 697D - Poinciana', tel: '8634963870' },
  { label: 'Store 769D - Haines City', tel: '8638667500' },
  { label: 'Store 367E - Lake Wales', tel: '7278077813' },
  { label: 'Store 5733 - Havendale', tel: '8635942400' },
  { label: 'Store 5383 - Davenport', tel: '8638660700' },
  { label: 'Store 2OSP - Bellalago', tel: '4073434630' },
];
const HELPDESK_SUPPORT = [
  { label: 'Customer Service', tel: '8009378997' },
  { label: 'Retail Sales Support Line', tel: '8883108369' },
];

export default function Settings({ onClose, remainingMs, showToast }) {
  const [zip, setZip] = useState(() => localStorage.getItem('weatherZip') || CONFIG.WEATHER_DEFAULT_ZIP);
  const [dataSource, setDataSource] = useState('--');
  const [dataUpdated, setDataUpdated] = useState('--');

  useEffect(() => {
    const map = JSON.parse(localStorage.getItem('lastDataUpdates') || '{}');
    const e = map.protect;
    if (e) {
      setDataSource(e.source || '--');
      setDataUpdated(formatTimeAgo(e.ts));
    }
  }, []);

  const seconds = Math.floor(remainingMs / 1000);
  const percent = Math.max(0, Math.min(100, (remainingMs / CONFIG.INACTIVITY_TIMEOUT) * 100));

  const saveZip = () => {
    const v = zip.trim();
    if (!v) {
      showToast('Please enter a ZIP', 'warning');
      return;
    }
    localStorage.setItem('weatherZip', v);
    showToast('ZIP saved', 'success');
  };

  const setWeatherUnit = (unit) => {
    localStorage.setItem('weatherUnit', unit);
    showToast(`Units set to ${unit === 'celsius' ? '°C' : '°F'}`, 'success');
    window.location.reload();
  };

  const refreshData = () => {
    localStorage.removeItem(CONFIG.CACHE_KEY);
    showToast('Data will refresh on next load', 'success');
    window.location.reload();
  };

  const clearCache = () => {
    if ('caches' in window) {
      caches.keys().then((names) => names.forEach((n) => caches.delete(n)));
    }
    localStorage.removeItem(CONFIG.CACHE_KEY);
    showToast('Cache cleared. Reloading...', 'success');
    setTimeout(() => window.location.reload(), 1000);
  };

  const reloadApp = () => window.location.reload();

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <header className={styles.header}>
          <button type="button" className={styles.backBtn} onClick={onClose} aria-label="Close">
            <i className="fas fa-arrow-left"></i>
          </button>
          <h3>More</h3>
        </header>

        <div className={styles.content}>
          <div className={styles.timerCard}>
            <div className={styles.timerMeta}>
              <i className="fas fa-lock"></i>
              <div>
                <div className={styles.timerLabel}>Session timer</div>
                <div className={styles.timerSub}>Auto-lock countdown</div>
              </div>
            </div>
            <div className={styles.timerValue}>{seconds}s</div>
            <div className={styles.timerBar}>
              <div className={styles.timerProgress} style={{ width: `${percent}%` }} />
            </div>
          </div>

          <Collapsible title="Data sources" icon="fa-database">
            <div className={styles.option}>
              <div className={styles.optionLabel}>
                <i className="fas fa-shield-alt"></i>
                <div>
                  <div>Protect data</div>
                  <div className={styles.optionSub}>{dataSource}</div>
                </div>
              </div>
              <div className={styles.optionMeta}>Last updated: {dataUpdated}</div>
            </div>
          </Collapsible>

          <Collapsible title="Maintenance" icon="fa-tools">
            <button className={styles.menuBtn} onClick={refreshData}>
              <i className="fas fa-sync-alt"></i>
              <span>Refresh Data</span>
            </button>
            <button className={styles.menuBtn} onClick={clearCache}>
              <i className="fas fa-trash-alt"></i>
              <span>Clear All Cache & Reload</span>
            </button>
            <button className={styles.menuBtn} onClick={reloadApp}>
              <i className="fas fa-redo"></i>
              <span>Reload App</span>
            </button>
          </Collapsible>

          <Collapsible title="Weather" icon="fa-cloud-sun">
            <div className={styles.option}>
              <div className={styles.optionLabel}>
                <i className="fas fa-map-marker-alt"></i>
                <div>
                  <div>ZIP fallback</div>
                  <div className={styles.optionSub}>Used if location is blocked</div>
                </div>
              </div>
              <div className={styles.inputRow}>
                <input
                  type="text"
                  value={zip}
                  onChange={(e) => setZip(e.target.value)}
                  placeholder="e.g. 10001"
                  inputMode="numeric"
                />
                <button type="button" onClick={saveZip}>Save</button>
              </div>
            </div>
            <div className={styles.option}>
              <div className={styles.optionLabel}>
                <i className="fas fa-thermometer-half"></i>
                <div>
                  <div>Units</div>
                  <div className={styles.optionSub}>°F or °C</div>
                </div>
              </div>
              <div className={styles.unitToggle}>
                <button
                  type="button"
                  onClick={() => setWeatherUnit('fahrenheit')}
                  className={localStorage.getItem('weatherUnit') !== 'celsius' ? styles.active : ''}
                >
                  °F
                </button>
                <button
                  type="button"
                  onClick={() => setWeatherUnit('celsius')}
                  className={localStorage.getItem('weatherUnit') === 'celsius' ? styles.active : ''}
                >
                  °C
                </button>
              </div>
            </div>
          </Collapsible>

          <Collapsible title="Help Desk" icon="fa-headset">
            <div className={styles.helpSection}>
              <h4>Stores</h4>
              {HELPDESK_STORES.map((s) => (
                <div key={s.tel} className={styles.helpCard}>
                  <span>{s.label}</span>
                  <a href={`tel:${s.tel}`}>{formatPhone(s.tel)}</a>
                </div>
              ))}
            </div>
            <div className={styles.helpSection}>
              <h4>Support</h4>
              {HELPDESK_SUPPORT.map((s) => (
                <div key={s.tel} className={styles.helpCard}>
                  <span>{s.label}</span>
                  <a href={`tel:${s.tel}`}>{formatPhone(s.tel)}</a>
                </div>
              ))}
            </div>
          </Collapsible>
        </div>

        <footer className={styles.footer}>
          <div className={styles.version}>
            <i className="fas fa-info-circle"></i>
            <span>Version {CONFIG.APP_VERSION}</span>
          </div>
          <div className={styles.copyright}>Copyright © Glz Technical Services</div>
          <a href="mailto:glz.hqz@pm.me" className={styles.contact}>
            <i className="fas fa-envelope"></i>
            <span>glz.hqz@pm.me</span>
          </a>
        </footer>
      </div>
    </div>
  );
}

function Collapsible({ title, icon, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={styles.collapsible}>
      <button
        type="button"
        className={styles.collapseHeader}
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <span><i className={`fas ${icon}`}></i> {title}</span>
        <i className={`fas fa-chevron-down ${open ? styles.open : ''}`}></i>
      </button>
      {open && <div className={styles.collapseBody}>{children}</div>}
    </div>
  );
}

function formatTimeAgo(ts) {
  const diff = Date.now() - ts;
  if (diff < 60000) return 'just now';
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m} min${m === 1 ? '' : 's'} ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr${h === 1 ? '' : 's'} ago`;
  const d = Math.floor(h / 24);
  return `${d} day${d === 1 ? '' : 's'} ago`;
}

function formatPhone(tel) {
  const n = tel.replace(/\D/g, '');
  if (n.length === 10) return `(${n.slice(0, 3)}) ${n.slice(3, 6)}-${n.slice(6)}`;
  return tel;
}
