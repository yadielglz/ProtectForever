import { useState, useEffect, useCallback } from 'react';
import { fetchProtectData, getFallbackData } from '../utils/dataLoader';
import { buildProtectCatalog } from '../utils/protectLogic';

export function useProtectData() {
  const [flatDeviceList, setFlatDeviceList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastSource, setLastSource] = useState('--');

  const load = useCallback(async (force = false) => {
    setLoading(true);
    setError(null);
    try {
      const raw = await fetchProtectData(force);
      const catalog = buildProtectCatalog(raw);
      setFlatDeviceList(catalog);
      const map = JSON.parse(localStorage.getItem('lastDataUpdates') || '{}');
      setLastSource(map.protect?.source || 'Google Sheets');
    } catch (err) {
      const fallback = getFallbackData();
      const catalog = buildProtectCatalog(fallback);
      setFlatDeviceList(catalog);
      setLastSource('Offline fallback');
      setError('Using offline data');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { flatDeviceList, loading, error, lastSource, refresh: () => load(true) };
}
