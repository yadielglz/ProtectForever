import { useState, useEffect, useCallback } from 'react';
import { CONFIG } from '../config';
import { readPreference } from '../utils/preferences';

const WEATHER_LABELS = {
  0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
  45: 'Fog', 48: 'Fog', 51: 'Light drizzle', 53: 'Drizzle', 55: 'Dense drizzle',
  61: 'Light rain', 63: 'Rain', 65: 'Heavy rain', 71: 'Snow',
  80: 'Showers', 95: 'Thunderstorms'
};

function getWeatherLabel(code) {
  return WEATHER_LABELS[code] || 'Weather';
}

function getStoredZip() {
  const stored = readPreference('weatherZip', CONFIG.WEATHER_DEFAULT_ZIP || '');
  return stored?.trim() || CONFIG.WEATHER_DEFAULT_ZIP || '';
}

function getWeatherUnit() {
  return readPreference('weatherUnit', 'fahrenheit') || 'fahrenheit';
}

function getCurrentPosition(options) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Location unavailable'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}

export function useWeather({ refreshToken = 0 } = {}) {
  const [temp, setTemp] = useState('--');
  const [desc, setDesc] = useState('--');
  const [location, setLocation] = useState('--');
  const [loading, setLoading] = useState(true);

  const fetchByCoords = useCallback(async (lat, lon) => {
    const unit = getWeatherUnit();
    const params = new URLSearchParams({
      latitude: lat,
      longitude: lon,
      current: 'temperature_2m,weather_code',
      timezone: 'auto',
      temperature_unit: unit === 'celsius' ? 'celsius' : 'fahrenheit',
    });
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
    if (!res.ok) throw new Error('Weather fetch failed');
    const data = await res.json();
    const curr = data?.current;
    if (curr) {
      setTemp(Math.round(curr.temperature_2m));
      setDesc(getWeatherLabel(curr.weather_code));
    }
  }, []);

  const fetchByZip = useCallback(async (zip) => {
    const geoRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(zip)}&count=1&format=json`
    );
    if (!geoRes.ok) throw new Error('Geo lookup failed');
    const geoData = await geoRes.json();
    const first = geoData?.results?.[0];
    if (!first) throw new Error('ZIP not found');
    const { latitude, longitude, name, admin1 } = first;
    setLocation(`${name || zip}${admin1 ? ', ' + admin1 : ''}`);
    await fetchByCoords(latitude, longitude);
  }, [fetchByCoords]);

  const fetchReverseGeocode = useCallback(async (lat, lon) => {
    const res = await fetch(
      `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${lat}&longitude=${lon}&count=1&format=json`
    );
    if (!res.ok) return;
    const data = await res.json();
    const first = data?.results?.[0];
    if (first) {
      setLocation(`${first.name || 'Current location'}${first.admin1 ? ', ' + first.admin1 : ''}`);
    }
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    const zip = getStoredZip();
    try {
      if (zip) {
        await fetchByZip(zip);
      } else if (navigator.geolocation) {
        const pos = await getCurrentPosition({ enableHighAccuracy: true, timeout: 8000 });
        const { latitude, longitude } = pos.coords;
        await fetchByCoords(latitude, longitude);
        await fetchReverseGeocode(latitude, longitude);
      } else {
        setDesc('Location unavailable');
        setLocation('--');
        setTemp('--');
      }
    } catch {
      if (!zip && navigator.geolocation) {
        setDesc('Location denied');
      } else {
        setDesc('Weather unavailable');
      }
      setLocation(zip || '--');
      setTemp('--');
    }
    setLoading(false);
  }, [fetchByCoords, fetchByZip, fetchReverseGeocode]);

  useEffect(() => {
    refresh();
  }, [refresh, refreshToken]);

  return { temp, desc, location, loading, refresh };
}
