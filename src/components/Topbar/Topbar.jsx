import { useTimeDate } from '../../hooks/useTimeDate';
import { useWeather } from '../../hooks/useWeather';
import styles from './Topbar.module.css';

export default function Topbar({ remainingMs, weatherRefreshToken }) {
  const { time, date } = useTimeDate();
  const { temp, desc, location } = useWeather({ refreshToken: weatherRefreshToken });
  const seconds = Math.floor(remainingMs / 1000);
  const isWarning = remainingMs <= 10000 && remainingMs > 5000;
  const isCritical = remainingMs <= 5000;

  return (
    <header className={styles.topbar}>
      <div className={styles.left}>
        <div className={styles.clock}>
          <div className={styles.time}>{time}</div>
          <div className={styles.date}>{date}</div>
        </div>
      </div>
      <div className={styles.center}>
        <div className={styles.weather}>
          <span className={styles.temp}>{temp}°</span>
          <div className={styles.weatherMeta}>
            <span className={styles.weatherDesc}>{desc}</span>
            <span className={styles.weatherLocation}>{location}</span>
          </div>
        </div>
      </div>
      <div className={styles.right}>
        <div className={`${styles.timer} ${isWarning ? styles.warning : ''} ${isCritical ? styles.critical : ''}`}>
          <i className="fas fa-clock"></i>
          <span>{seconds}s</span>
        </div>
      </div>
    </header>
  );
}
