import styles from './SplashScreen.module.css';

export default function SplashScreen() {
  return (
    <div className={styles.splash}>
      <div className={styles.container}>
        <div className={styles.logo}>
          <img src="/logo.svg" alt="StoreView" className={styles.icon} />
        </div>
        <div className={styles.title}>StoreView</div>
        <div className={styles.subtitle}>Daily Outlook</div>
        <div className={styles.loader}>
          <div className={styles.spinner}></div>
        </div>
      </div>
    </div>
  );
}
