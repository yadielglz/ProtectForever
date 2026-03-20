const DEVICE_MODEL_ORDER = {
  Apple: {
    'iPhone 7': 1, 'iPhone 7 Plus': 2, 'iPhone 8': 3, 'iPhone 8 Plus': 4,
    'iPhone X': 5, 'iPhone XR': 6, 'iPhone XS': 7, 'iPhone XS Max': 8,
    'iPhone 11': 9, 'iPhone 11 Pro': 10, 'iPhone 11 Pro Max': 11,
    'iPhone SE (2nd generation)': 12, 'iPhone SE (2020)': 12, 'iPhone SE 2nd gen': 12,
    'iPhone 12': 13, 'iPhone 12 mini': 14, 'iPhone 12 Pro': 15, 'iPhone 12 Pro Max': 16,
    'iPhone 13': 17, 'iPhone 13 mini': 18, 'iPhone 13 Pro': 19, 'iPhone 13 Pro Max': 20,
    'iPhone 14': 21, 'iPhone 14 Plus': 22, 'iPhone 14 Pro': 23, 'iPhone 14 Pro Max': 24,
    'iPhone 15': 25, 'iPhone 15 Plus': 26, 'iPhone 15 Pro': 27, 'iPhone 15 Pro Max': 28,
    'iPhone 16': 29, 'iPhone 16 Plus': 30, 'iPhone 16 Pro': 31, 'iPhone 16 Pro Max': 32,
    'iPhone 16e': 33, 'iPhone 17': 34, 'iPhone 17 Plus': 35, 'iPhone 17 Pro': 36, 'iPhone 17 Pro Max': 37,
  },
  Samsung: {
    'Galaxy S21': 1, 'Galaxy S21+': 2, 'Galaxy S21 Ultra': 3, 'Galaxy S22': 4, 'Galaxy S22+': 5,
    'Galaxy S22 Ultra': 6, 'Galaxy S23': 7, 'Galaxy S23+': 8, 'Galaxy S23 Ultra': 9,
    'Galaxy S24': 10, 'Galaxy S24+': 11, 'Galaxy S24 Ultra': 12,
    'Galaxy S25': 13, 'Galaxy S25+': 14, 'Galaxy S25 Ultra': 15,
    'Galaxy Note 20': 1, 'Galaxy Note 20 Ultra': 2,
    'Galaxy Z Fold 3': 1, 'Galaxy Z Fold 4': 2, 'Galaxy Z Fold 5': 3,
    'Galaxy Z Flip 3': 1, 'Galaxy Z Flip 4': 2, 'Galaxy Z Flip 5': 3,
  },
  Google: {
    'Pixel 6': 1, 'Pixel 6 Pro': 2, 'Pixel 6a': 3, 'Pixel 7': 4, 'Pixel 7 Pro': 5,
    'Pixel 7a': 6, 'Pixel 8': 7, 'Pixel 8 Pro': 8, 'Pixel 8a': 9,
  },
  Motorola: {
    'Moto G Power (2021)': 1, 'Moto G Stylus (2021)': 2, 'Moto G Power (2022)': 3,
    'Moto G Stylus (2022)': 4, 'Moto G Power (2023)': 5, 'Moto G Stylus (2023)': 6,
    'Moto G Power (2024)': 7, 'Moto G Stylus (2024)': 8,
    'Edge 30': 1, 'Edge 30 Pro': 2, 'Edge 40': 3, 'Edge 40 Pro': 4, 'Edge 50': 5, 'Edge 50 Pro': 6,
  },
  'T-Mobile': {
    'REVVL 6': 1, 'REVVL 6 Pro': 2, 'REVVL 6x': 3, 'REVVL 7': 4, 'REVVL 7 Pro': 5, 'REVVL 7x': 6,
  },
};

export function getField(item, possibleNames) {
  if (!item || typeof item !== 'object') return '';
  for (const name of possibleNames) {
    const v = item[name];
    if (v !== undefined && v !== null && String(v).trim()) return String(v).trim();
  }
  const keys = Object.keys(item).map((k) => ({ k, n: k.replace(/^\uFEFF/, '').toLowerCase().replace(/[^a-z0-9]/g, '') }));
  for (const name of possibleNames) {
    const target = String(name).toLowerCase().replace(/[^a-z0-9]/g, '');
    const m = keys.find((e) => e.n === target);
    if (m) {
      const v = item[m.k];
      if (v !== undefined && v !== null && String(v).trim()) return String(v).trim();
    }
  }
  return '';
}

export function isMdnVerified(entry, getFieldFn = getField) {
  const v = getFieldFn(entry, ['Available', 'AVAILABLE', 'available', 'Availability', 'In Stock', 'Status', 'status']);
  if (!v) return false;
  const n = v.toString().toLowerCase().trim();
  const yes = ['yes', 'y', 'true', '1', 'available', 'in stock', 'verified', '✅', '✓', '✔'];
  const no = ['no', 'n', 'false', '0', 'unavailable', 'out of stock', 'unverified', '❌', '✗', '×'];
  if (yes.some((x) => n === x || n.includes(x))) return true;
  if (no.some((x) => n === x || n.includes(x))) return false;
  return false;
}

export function getModelSortOrder(brand, model) {
  const norm = model.trim().replace(/\s+/g, ' ');
  if (DEVICE_MODEL_ORDER[brand]?.[norm]) return DEVICE_MODEL_ORDER[brand][norm];
  if (DEVICE_MODEL_ORDER[brand]) {
    const lower = norm.toLowerCase();
    for (const [k, v] of Object.entries(DEVICE_MODEL_ORDER[brand])) {
      if (k.toLowerCase() === lower) return v;
    }
  }
  if (brand === 'Apple' && model.toLowerCase().includes('iphone')) {
    const m = model.match(/iphone\s*(\d+)/i);
    if (m) {
      let o = parseInt(m[1], 10) * 100;
      if (model.toLowerCase().includes('pro max')) o += 3;
      else if (model.toLowerCase().includes('pro')) o += 2;
      else if (model.toLowerCase().includes('plus')) o += 1;
      else if (model.toLowerCase().includes('mini')) o -= 1;
      return o;
    }
  }
  if (brand === 'Samsung' && model.toLowerCase().includes('galaxy s')) {
    const m = model.match(/galaxy\s*s(\d+)/i);
    if (m) {
      let o = parseInt(m[1], 10) * 100;
      if (model.toLowerCase().includes('ultra')) o += 2;
      else if (model.includes('+') || model.toLowerCase().includes('plus')) o += 1;
      return o;
    }
  }
  const numM = model.match(/(\d+)/);
  return numM ? parseInt(numM[1], 10) : 0;
}

export function normalizeProtectRecord(row) {
  const by = (names) => getField(row, names);
  const deviceBrand = by(['Device Brand', 'DeviceBrand', 'Manufacturer', 'OEM']) || '';
  // Protection product brand (ZAGG, GoTo, etc.) — separate from the device brand
  const upcBrand = by(['Brand', 'Screen Brand', 'Protector Brand', 'Protection Brand', 'Vendor', 'Product Brand', 'BRAND']) || '';
  return {
    brand: deviceBrand || upcBrand || 'Unknown Brand',
    upcBrand: upcBrand || deviceBrand || '',
    model: by(['Device Model', 'Model', 'DeviceModel', 'MODEL', 'Device']) || 'Unknown Model',
    type: by(['Type', 'Protection Type', 'ProtectionType', 'TYPE', 'Protection']) || 'General',
    upc: by(['UPC', 'UPC Code', 'upc', 'UPCCode', 'UPC_CODE', 'BARCODE']),
    mdn: by(['MDN', 'mdn', 'MDN Number', 'mdn_number', 'phone']),
    available: by(['Available', 'AVAILABLE', 'available', 'Availability', 'In Stock', 'Status']),
  };
}

export function buildProtectCatalog(deviceData, getModelSortOrderFn = getModelSortOrder) {
  const grouped = new Map();
  (deviceData || []).forEach((row) => {
    const n = normalizeProtectRecord(row);
    const key = `${n.brand}|${n.model}`;
    if (!grouped.has(key)) grouped.set(key, { key, brand: n.brand, model: n.model, rows: [] });
    grouped.get(key).rows.push(n);
  });
  return Array.from(grouped.values())
    .sort((a, b) => {
      if (a.brand !== b.brand) return a.brand.localeCompare(b.brand);
      return getModelSortOrderFn(a.brand, b.model) - getModelSortOrderFn(a.brand, a.model);
    })
    .map((item) => ({ key: item.key, brand: item.brand, model: item.model, rows: item.rows }));
}

export function groupByProtectionType(options) {
  const groups = {};
  options.forEach((opt) => {
    // Use the protection product brand (ZAGG, GoTo, etc.) for grouping, not the device brand
    const upcBrand = opt.upcBrand || opt.brand || 'Unknown';
    const type = opt.type || 'General';
    const key = `${upcBrand}-${type}`;
    if (!groups[key]) {
      groups[key] = { brand: upcBrand, type, entries: [], mdns: new Set(), verifiedMdns: new Set() };
    }
    groups[key].entries.push(opt);
    if (opt.mdn) groups[key].mdns.add(opt.mdn);
    if (opt.mdn && isMdnVerified(opt)) groups[key].verifiedMdns.add(opt.mdn);
  });
  return Object.values(groups);
}

/** Split UPCs into verified vs unverified based on MDN verification status */
export function splitUpcsByVerification(entries) {
  const upcVerificationMap = new Map();
  entries.forEach((entry) => {
    const upc = entry.upc;
    if (!upc) return;
    const verified = isMdnVerified(entry);
    if (!upcVerificationMap.has(upc) || verified) {
      upcVerificationMap.set(upc, verified);
    }
  });
  const verifiedUpcs = [];
  const unverifiedUpcs = [];
  upcVerificationMap.forEach((verified, upc) => {
    if (verified) verifiedUpcs.push(upc);
    else unverifiedUpcs.push(upc);
  });
  return { verifiedUpcs, unverifiedUpcs };
}

export function formatPhoneNumber(phone) {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
}
