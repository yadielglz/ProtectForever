export function readPreference(key, fallback = '') {
  try {
    const value = localStorage.getItem(key);
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

export function writePreference(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore storage failures
  }
}

export function removePreference(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore storage failures
  }
}

export function readJsonPreference(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
