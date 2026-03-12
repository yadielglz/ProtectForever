import styles from './SplashScreen.module.css';

export default function SplashScreen() {
  return (
    <div className={styles.splash}>
      <div className={styles.container}>
        <div className={styles.logo}>
          <img src="/logo.svg" alt="ProtectForever" className={styles.icon} />
        </div>
        <div className={styles.title}>ProtectForever</div>
        <div className={styles.subtitle}>Unified workspace</div>
        <div className={styles.loader}>
          <div className={styles.spinner}></div>
        </div>
      </div>
    </div>
  );
}
