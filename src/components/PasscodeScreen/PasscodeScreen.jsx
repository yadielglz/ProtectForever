import { useRef, useEffect } from 'react';
import { usePasscode } from '../../hooks/usePasscode';
import { useTimeDate } from '../../hooks/useTimeDate';
import styles from './PasscodeScreen.module.css';

export default function PasscodeScreen({ onUnlock, visible }) {
  const inputRef = useRef(null);
  const { passcode, error, verify, updatePasscode } = usePasscode(onUnlock);
  const { time, passcodeDate } = useTimeDate();

  useEffect(() => {
    if (visible && inputRef.current) {
      const timer = setTimeout(() => inputRef.current?.focus(), 300);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  const handleInput = (e) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 4);
    e.target.value = raw;
    updatePasscode(raw);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') verify();
  };

  if (!visible) return null;

  return (
    <div className={styles.screen}>
      <div className={styles.container}>
        <div className={styles.hero}>
          <div className={styles.clock}>
            <div className={styles.time}>{time}</div>
            <div className={styles.date}>{passcodeDate}</div>
          </div>
          <div className={styles.welcome}>
            <h1 className={styles.title}>Welcome back</h1>
            <p className={styles.subtitle}>Enter your passcode to continue</p>
          </div>
        </div>

        <div className={styles.panel}>
          <div className={styles.dots}>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className={`${styles.dot} ${i < passcode.length ? styles.filled : ''}`} />
            ))}
          </div>
          {error && (
            <div className={styles.error}>
              <i className="fas fa-exclamation-circle"></i>
              <span>Invalid code</span>
            </div>
          )}
          <input
            ref={inputRef}
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={4}
            autoComplete="one-time-code"
            className={styles.input}
            aria-label="Enter passcode"
            value={passcode}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
          />
          <p className={styles.footnote}>Staff access only.</p>
        </div>
      </div>
    </div>
  );
}
