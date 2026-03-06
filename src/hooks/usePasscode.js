import { useState, useCallback } from 'react';
import { CONFIG } from '../config';

export function usePasscode(onUnlock) {
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState(false);

  const verify = useCallback(() => {
    if (passcode === CONFIG.PASSCODE) {
      setPasscode('');
      setError(false);
      onUnlock();
    } else {
      setError(true);
      setPasscode('');
      setTimeout(() => setError(false), 2000);
    }
  }, [passcode, onUnlock]);

  const updatePasscode = useCallback((raw) => {
    const digits = raw.replace(/\D/g, '').slice(0, 4);
    setPasscode(digits);
    setError(false);
    if (digits.length === 4) {
      if (digits === CONFIG.PASSCODE) {
        setPasscode('');
        onUnlock();
      } else {
        setError(true);
        setPasscode('');
        setTimeout(() => setError(false), 2000);
      }
    }
  }, [onUnlock]);

  const clear = useCallback(() => {
    setPasscode('');
    setError(false);
  }, []);

  return { passcode, error, verify, updatePasscode, clear };
}
