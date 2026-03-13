import { CONFIG } from '../config';
import { removePreference } from './preferences';

export const PORTABILITY_CACHE_KEY = 'pf_portability_cache';

export function clearDataCaches() {
  removePreference(CONFIG.CACHE_KEY);
  removePreference('lastDataUpdates');
  removePreference(PORTABILITY_CACHE_KEY);
}
