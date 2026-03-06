import { CONFIG } from '../config';
import { parseCSVData } from './dataLoader';

const PORT_CACHE_KEY = 'pf_portability_cache';
const PORT_CACHE_TTL_MS = 10 * 60 * 1000;

function toCsvExportUrl(url) {
  if (!url) return '';
  if (url.includes('/export?')) return url;
  const match = url.match(/\/spreadsheets\/d\/([^/]+)/i);
  const gidMatch = url.match(/[?&]gid=(\d+)/i);
  if (!match) return url;
  const sheetId = match[1];
  const gid = gidMatch ? gidMatch[1] : '0';
  return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
}

function normalizePortabilityRow(row) {
  const get = (names) => {
    for (const name of names) {
      if (row[name] !== undefined && row[name] !== null && String(row[name]).trim()) {
        return String(row[name]).trim();
      }
    }
    return '';
  };
  return {
    carrier: get(['carrier', 'Carrier']),
    network: get(['network', 'Network']),
    account_number_type: get(['account_number_type', 'account number type', 'Account Number Type']),
    pin_type: get(['pin_type', 'pin type', 'Pin Type']),
    extra_requirements: get(['extra_requirements', 'extra requirements', 'Extra Requirements']),
    port_center: get(['port_center', 'port center', 'Port Center']),
  };
}

function readCache() {
  try {
    const raw = localStorage.getItem(PORT_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.ts || Date.now() - parsed.ts > PORT_CACHE_TTL_MS) return null;
    return parsed.rows || null;
  } catch {
    return null;
  }
}

function writeCache(rows) {
  try {
    localStorage.setItem(PORT_CACHE_KEY, JSON.stringify({ ts: Date.now(), rows }));
  } catch {
    // ignore cache failures
  }
}

export async function fetchPortabilityRows(force = false) {
  if (!force) {
    const cached = readCache();
    if (cached) return cached;
  }

  const targetUrl = toCsvExportUrl(CONFIG.PORTABILITY_SHEETS_URL);
  let response;
  try {
    response = await fetch(targetUrl);
  } catch {
    for (const proxy of CONFIG.CORS_PROXIES) {
      try {
        response = await fetch(proxy + encodeURIComponent(targetUrl));
        if (response?.ok) break;
      } catch {
        continue;
      }
    }
  }

  if (!response?.ok) {
    throw new Error('Failed to fetch portability data');
  }

  const csvText = await response.text();
  const rawRows = parseCSVData(csvText);
  const rows = rawRows
    .map(normalizePortabilityRow)
    .filter((row) => row.carrier || row.network || row.port_center);

  writeCache(rows);
  return rows;
}

