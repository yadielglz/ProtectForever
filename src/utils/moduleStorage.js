const STORAGE_KEY = 'pf_module_data';
const SCHEMA_VERSION = 4;

function nowIso() {
  return new Date().toISOString();
}

function makeId(prefix) {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function defaultStore() {
  return {
    schemaVersion: SCHEMA_VERSION,
    appointments: [],
    leads: [],
    salesEntries: [],
    activity: [],
    sync: {
      lastExportTs: null,
    },
  };
}

function migrateStore(raw) {
  if (!raw || typeof raw !== 'object') return defaultStore();
  const base = defaultStore();
  const version = Number(raw.schemaVersion) || 0;
  const merged = {
    ...base,
    ...raw,
  };

  if (!Array.isArray(merged.appointments)) merged.appointments = [];
  if (!Array.isArray(merged.leads)) merged.leads = [];
  if (!Array.isArray(merged.salesEntries)) merged.salesEntries = [];
  if (!Array.isArray(merged.activity)) merged.activity = [];
  if (!merged.sync || typeof merged.sync !== 'object') merged.sync = { lastExportTs: null };

  if (version < 1) {
    merged.schemaVersion = 1;
  }
  if (version < 2) {
    merged.salesEntries = merged.salesEntries || [];
    merged.schemaVersion = 2;
  }
  if (version < 3) {
    merged.salesEntries = (merged.salesEntries || []).map((entry) => ({
      ...entry,
      linesSold: Number(entry.linesSold) || 0,
      btsSold: Number(entry.btsSold) || 0,
      hasAccessory: Boolean(entry.hasAccessory),
    }));
    merged.schemaVersion = 3;
  }
  if (version < 4) {
    merged.salesEntries = (merged.salesEntries || []).map((entry) => ({
      ...entry,
      voiceLines: Number(entry.voiceLines ?? entry.linesSold) || 0,
      btsSold: Number(entry.btsSold) || 0,
      accessoriesTotal: Number(entry.accessoriesTotal ?? (entry.hasAccessory ? (Number(entry.units) || 1) : 0)) || 0,
    }));
    merged.schemaVersion = 4;
  }
  merged.schemaVersion = SCHEMA_VERSION;
  return merged;
}

export function readModuleStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultStore();
    return migrateStore(JSON.parse(raw));
  } catch {
    return defaultStore();
  }
}

export function writeModuleStore(next) {
  const migrated = migrateStore(next);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
  return migrated;
}

export function logModuleActivity(type, payload = {}) {
  const store = readModuleStore();
  const entry = {
    id: makeId('evt'),
    type,
    payload,
    ts: nowIso(),
  };
  store.activity.unshift(entry);
  store.activity = store.activity.slice(0, 300);
  writeModuleStore(store);
  return entry;
}

export function listAppointments() {
  return readModuleStore().appointments;
}

export function saveAppointment(input) {
  const store = readModuleStore();
  const stamp = nowIso();
  const historyEntry = {
    id: makeId('ah'),
    action: input.id ? 'updated' : 'created',
    note: input.notes || '',
    ts: stamp,
  };

  if (input.id) {
    store.appointments = store.appointments.map((a) => {
      if (a.id !== input.id) return a;
      return {
        ...a,
        ...input,
        updatedAt: stamp,
        history: [historyEntry, ...(a.history || [])],
      };
    });
  } else {
    store.appointments.unshift({
      id: makeId('appt'),
      customerName: input.customerName || '',
      phone: input.phone || '',
      reason: input.reason || '',
      date: input.date || '',
      timeSlot: input.timeSlot || '',
      assignedRep: input.assignedRep || '',
      notes: input.notes || '',
      status: input.status || 'scheduled',
      createdAt: stamp,
      updatedAt: stamp,
      history: [historyEntry],
    });
  }
  writeModuleStore(store);
  logModuleActivity('appointment_saved', { id: input.id || null, status: input.status || 'scheduled' });
}

export function updateAppointmentStatus(id, status) {
  const store = readModuleStore();
  const stamp = nowIso();
  store.appointments = store.appointments.map((a) => {
    if (a.id !== id) return a;
    return {
      ...a,
      status,
      updatedAt: stamp,
      history: [{ id: makeId('ah'), action: `status:${status}`, ts: stamp }, ...(a.history || [])],
    };
  });
  writeModuleStore(store);
  logModuleActivity('appointment_status', { id, status });
}

export function removeAppointment(id) {
  const store = readModuleStore();
  store.appointments = store.appointments.filter((a) => a.id !== id);
  writeModuleStore(store);
  logModuleActivity('appointment_deleted', { id });
}

export function listLeads() {
  return readModuleStore().leads;
}

export function saveLead(input) {
  const store = readModuleStore();
  const stamp = nowIso();
  const historyEntry = {
    id: makeId('lh'),
    action: input.id ? 'updated' : 'created',
    note: input.notes || '',
    ts: stamp,
  };

  if (input.id) {
    store.leads = store.leads.map((lead) => {
      if (lead.id !== input.id) return lead;
      return {
        ...lead,
        ...input,
        updatedAt: stamp,
        history: [historyEntry, ...(lead.history || [])],
      };
    });
  } else {
    store.leads.unshift({
      id: makeId('lead'),
      customerName: input.customerName || '',
      phone: input.phone || '',
      stage: input.stage || 'new',
      priority: input.priority || 'medium',
      nextAction: input.nextAction || '',
      nextReminderAt: input.nextReminderAt || '',
      notes: input.notes || '',
      createdAt: stamp,
      updatedAt: stamp,
      history: [historyEntry],
    });
  }
  writeModuleStore(store);
  logModuleActivity('lead_saved', { id: input.id || null, stage: input.stage || 'new' });
}

export function updateLeadStage(id, stage) {
  const store = readModuleStore();
  const stamp = nowIso();
  store.leads = store.leads.map((lead) => {
    if (lead.id !== id) return lead;
    return {
      ...lead,
      stage,
      updatedAt: stamp,
      history: [{ id: makeId('lh'), action: `stage:${stage}`, ts: stamp }, ...(lead.history || [])],
    };
  });
  writeModuleStore(store);
  logModuleActivity('lead_stage', { id, stage });
}

export function removeLead(id) {
  const store = readModuleStore();
  store.leads = store.leads.filter((lead) => lead.id !== id);
  writeModuleStore(store);
  logModuleActivity('lead_deleted', { id });
}

export function buildModuleKpis() {
  const store = readModuleStore();
  const now = Date.now();
  const todayKey = new Date().toISOString().slice(0, 10);
  const apptsToday = store.appointments.filter((a) => a.date === todayKey).length;
  const overdueLeads = store.leads.filter((lead) => {
    if (!lead.nextReminderAt) return false;
    return new Date(lead.nextReminderAt).getTime() < now && !['won', 'lost'].includes(lead.stage);
  }).length;
  const completedAppts = store.appointments.filter((a) => a.status === 'completed').length;
  const wonLeads = store.leads.filter((lead) => lead.stage === 'won').length;
  const salesToday = store.salesEntries.filter((s) => s.date === todayKey).length;
  const totalLinesSold = store.salesEntries.reduce((sum, s) => sum + (Number(s.voiceLines ?? s.linesSold) || 0), 0);
  const totalBtsSold = store.salesEntries.reduce((sum, s) => sum + (Number(s.btsSold) || 0), 0);
  const accessoriesTotalSold = store.salesEntries.reduce((sum, s) => sum + (Number(s.accessoriesTotal) || 0), 0);
  return {
    apptsToday,
    overdueLeads,
    completedAppts,
    wonLeads,
    salesToday,
    totalLinesSold,
    totalBtsSold,
    accessoriesTotalSold,
    events: store.activity.length,
  };
}

function toCsvRow(values) {
  return values
    .map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`)
    .join(',');
}

export function exportAppointmentsCsv() {
  const rows = listAppointments();
  const header = toCsvRow(['id', 'customerName', 'phone', 'reason', 'date', 'timeSlot', 'assignedRep', 'status', 'notes', 'updatedAt']);
  const body = rows.map((r) => toCsvRow([r.id, r.customerName, r.phone, r.reason, r.date, r.timeSlot, r.assignedRep, r.status, r.notes, r.updatedAt]));
  return [header, ...body].join('\n');
}

export function exportLeadsCsv() {
  const rows = listLeads();
  const header = toCsvRow(['id', 'customerName', 'phone', 'stage', 'priority', 'nextAction', 'nextReminderAt', 'notes', 'updatedAt']);
  const body = rows.map((r) => toCsvRow([r.id, r.customerName, r.phone, r.stage, r.priority, r.nextAction, r.nextReminderAt, r.notes, r.updatedAt]));
  return [header, ...body].join('\n');
}

export function listSalesEntries() {
  return readModuleStore().salesEntries;
}

export function saveSalesEntry(input) {
  const store = readModuleStore();
  const stamp = nowIso();
  if (input.id) {
    store.salesEntries = store.salesEntries.map((entry) => {
      if (entry.id !== input.id) return entry;
      return {
        ...entry,
        ...input,
        updatedAt: stamp,
      };
    });
  } else {
    store.salesEntries.unshift({
      id: makeId('sale'),
      date: input.date || stamp.slice(0, 10),
      rep: input.rep || '',
      voiceLines: Number(input.voiceLines ?? input.linesSold) || 0,
      btsSold: Number(input.btsSold) || 0,
      accessoriesTotal: Number(input.accessoriesTotal) || 0,
      notes: input.notes || '',
      createdAt: stamp,
      updatedAt: stamp,
    });
  }
  writeModuleStore(store);
  logModuleActivity('sales_saved', { id: input.id || null, voiceLines: Number(input.voiceLines ?? input.linesSold) || 0 });
}

export function removeSalesEntry(id) {
  const store = readModuleStore();
  store.salesEntries = store.salesEntries.filter((entry) => entry.id !== id);
  writeModuleStore(store);
  logModuleActivity('sales_deleted', { id });
}

export function exportSalesCsv() {
  const rows = listSalesEntries();
  const header = toCsvRow(['id', 'date', 'rep', 'voiceLines', 'btsSold', 'accessoriesTotal', 'notes', 'updatedAt']);
  const body = rows.map((r) => toCsvRow([r.id, r.date, r.rep, r.voiceLines ?? r.linesSold, r.btsSold, r.accessoriesTotal, r.notes, r.updatedAt]));
  return [header, ...body].join('\n');
}

export function rememberExport() {
  const store = readModuleStore();
  store.sync.lastExportTs = nowIso();
  writeModuleStore(store);
}

export function getSyncInfo() {
  return readModuleStore().sync;
}

export function exportModuleSnapshot() {
  return JSON.stringify(readModuleStore(), null, 2);
}

