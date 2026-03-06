import { useState, useEffect, useCallback } from 'react';

export function useInactivityTimer({ timeoutMs, enabled, onTimeout }) {
  const [remainingMs, setRemainingMs] = useState(timeoutMs);
  const [lastActivity, setLastActivity] = useState(Date.now());

  const reset = useCallback(() => {
    setLastActivity(Date.now());
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(() => {
      const elapsed = Date.now() - lastActivity;
      const remaining = Math.max(0, timeoutMs - elapsed);
      setRemainingMs(remaining);

      if (remaining <= 0) {
        onTimeout();
      }
    }, 500);

    return () => clearInterval(interval);
  }, [enabled, lastActivity, timeoutMs, onTimeout]);

  return { remainingMs, reset };
}
