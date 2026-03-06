import { CONFIG } from '../config';

function parseCSVLine(line) {
  const values = [];
  let current = '';
  let insideQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') insideQuotes = !insideQuotes;
    else if (char === ',' && !insideQuotes) {
      values.push(current.trim());
      current = '';
    } else current += char;
  }
  values.push(current.trim());
  return values;
}

export function parseCSVData(csvText) {
  const lines = csvText.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length === 0) return [];
  const headers = parseCSVLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseCSVLine(line);
    const row = {};
    headers.forEach((h, i) => {
      row[h] = (values[i] || '').trim();
    });
    return row;
  }).filter((row) => Object.values(row).some((v) => v));
}

export async function fetchProtectData(force = false) {
  const cached = getCachedData();
  if (cached && isCacheValid() && !force) {
    return cached;
  }
  let response;
  try {
    response = await fetch(CONFIG.GOOGLE_SHEETS_URL);
  } catch {
    for (const proxy of CONFIG.CORS_PROXIES) {
      try {
        response = await fetch(proxy + encodeURIComponent(CONFIG.GOOGLE_SHEETS_URL));
        if (response?.ok) break;
      } catch {
        continue;
      }
    }
  }
  if (!response?.ok) throw new Error('Failed to fetch data');
  const csvText = await response.text();
  const data = parseCSVData(csvText);
  cacheData(data);
  return data;
}

function getCachedData() {
  try {
    const raw = localStorage.getItem(CONFIG.CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function isCacheValid() {
  try {
    const map = JSON.parse(localStorage.getItem('lastDataUpdates') || '{}');
    const entry = map.protect;
    if (!entry) return false;
    return Date.now() - entry.ts < CONFIG.CACHE_DURATION;
  } catch {
    return false;
  }
}

function cacheData(data) {
  try {
    localStorage.setItem(CONFIG.CACHE_KEY, JSON.stringify(data));
    const map = JSON.parse(localStorage.getItem('lastDataUpdates') || '{}');
    map.protect = { ts: Date.now(), source: 'Google Sheets' };
    localStorage.setItem('lastDataUpdates', JSON.stringify(map));
  } catch (e) {
    console.error('Failed to cache', e);
  }
}

export function getFallbackData() {
  return [
    { Brand: 'Samsung', Model: 'Galaxy S24', UPC: '123456789012', MDN: '5551234567', Protection: 'Premium', Available: 'Yes' },
    { Brand: 'Apple', Model: 'iPhone 15', UPC: '234567890123', MDN: '5552345678', Protection: 'AppleCare+', Available: 'Yes' },
  ];
}
