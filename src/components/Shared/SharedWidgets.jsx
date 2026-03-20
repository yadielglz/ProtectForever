import styles from './SharedWidgets.module.css';

export function KpiGrid({ items }) {
  return (
    <div className={styles.kpiGrid}>
      {items.map((item) => (
        <article key={item.label} className={styles.kpiCard}>
          <div className={styles.kpiLabel}>{item.label}</div>
          <div className={styles.kpiValue}>{item.value}</div>
        </article>
      ))}
    </div>
  );
}

export function FilterChips({ options, active, onChange }) {
  return (
    <div className={styles.filterBar}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className={`${styles.chip} ${active === opt.value ? styles.chipActive : ''}`}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function QuickActionBar({ actions }) {
  return (
    <div className={styles.actionBar}>
      {actions.map((a) => (
        <button
          key={a.label}
          type="button"
          onClick={a.onClick}
          className={`${styles.actionBtn} ${a.primary ? styles.actionBtnPrimary : ''}`}
        >
          {a.icon && <i className={`fas ${a.icon}`}></i>} {a.label}
        </button>
      ))}
    </div>
  );
}
