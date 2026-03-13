import { useMemo, useState } from 'react';
import { downloadCsv } from '../../utils/download';
import {
  buildModuleKpis,
  exportAppointmentsCsv,
  listAppointments,
  rememberExport,
  removeAppointment,
  saveAppointment,
  updateAppointmentStatus,
} from '../../utils/moduleStorage';
import { FilterChips, KpiGrid, QuickActionBar } from '../Shared/SharedWidgets';
import styles from './AppointmentBoard.module.css';

const STATUS_FLOW = ['scheduled', 'arrived', 'in_service', 'completed'];
const FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'Today', value: 'today' },
  { label: 'Open', value: 'open' },
  { label: 'Completed', value: 'completed' },
];

const STATUS_LABELS = {
  scheduled: 'Scheduled',
  arrived: 'Arrived',
  in_service: 'In Service',
  completed: 'Completed',
  no_show: 'No Show',
  cancelled: 'Cancelled',
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function formatStatus(status) {
  return STATUS_LABELS[status] || status;
}

const EMPTY_FORM = {
  customerName: '',
  phone: '',
  reason: '',
  date: todayIso(),
  timeSlot: '',
  assignedRep: '',
  notes: '',
  status: 'scheduled',
};

export default function AppointmentBoard({ showToast, showConfirm }) {
  const [appointments, setAppointments] = useState(() => listAppointments());
  const [filter, setFilter] = useState('all');
  const [viewMode, setViewMode] = useState('daily');
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const kpis = useMemo(() => buildModuleKpis(), [appointments]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    const now = new Date();
    const weekAhead = new Date(now);
    weekAhead.setDate(now.getDate() + 7);
    return appointments.filter((a) => {
      const apptDateMs = a.date ? new Date(`${a.date}T00:00:00`).getTime() : 0;
      if (viewMode === 'daily' && a.date !== todayIso()) return false;
      if (viewMode === 'weekly') {
        const start = new Date(`${todayIso()}T00:00:00`).getTime();
        const end = weekAhead.getTime();
        if (apptDateMs < start || apptDateMs > end) return false;
      }
      if (filter === 'today' && a.date !== todayIso()) return false;
      if (filter === 'open' && ['completed', 'cancelled', 'no_show'].includes(a.status)) return false;
      if (filter === 'completed' && a.status !== 'completed') return false;
      if (!term) return true;
      const haystack = `${a.customerName} ${a.phone} ${a.reason} ${a.assignedRep}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [appointments, filter, search, viewMode]);

  const refresh = () => setAppointments(listAppointments());

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setFormOpen(true);
  };

  const openEdit = (appt) => {
    setForm({
      id: appt.id,
      customerName: appt.customerName || '',
      phone: appt.phone || '',
      reason: appt.reason || '',
      date: appt.date || todayIso(),
      timeSlot: appt.timeSlot || '',
      assignedRep: appt.assignedRep || '',
      notes: appt.notes || '',
      status: appt.status || 'scheduled',
    });
    setFormOpen(true);
  };

  const closeEditor = () => {
    setFormOpen(false);
    setForm(EMPTY_FORM);
  };

  const onSave = (e) => {
    e.preventDefault();
    if (!form.customerName.trim() || !form.date || !form.timeSlot) {
      showToast('Name, date, and time are required', 'warning');
      return;
    }
    saveAppointment(form);
    refresh();
    showToast(form.id ? 'Appointment updated' : 'Appointment created', 'success');
    closeEditor();
  };

  const onDelete = (id) => {
    const performDelete = () => {
      removeAppointment(id);
      refresh();
      showToast('Appointment removed', 'success');
    };
    if (!showConfirm) {
      performDelete();
      return;
    }
    showConfirm({
      title: 'Delete appointment?',
      message: 'This appointment will be removed from the board and local history.',
      confirmLabel: 'Delete',
      tone: 'danger',
      onConfirm: performDelete,
    });
  };

  const moveStatus = (appt) => {
    const idx = STATUS_FLOW.indexOf(appt.status);
    const next = idx >= 0 && idx < STATUS_FLOW.length - 1 ? STATUS_FLOW[idx + 1] : appt.status;
    updateAppointmentStatus(appt.id, next);
    refresh();
    showToast(`Status set to ${next}`, 'success');
  };

  const exportCsv = () => {
    downloadCsv(`appointments_${todayIso()}.csv`, exportAppointmentsCsv());
    rememberExport();
    showToast('Appointments CSV exported', 'success');
  };

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <h2>Appointment Board</h2>
        <p>Manage walk-ins, scheduled visits, and service flow from one board.</p>
      </div>

      <KpiGrid
        items={[
          { label: 'Today', value: kpis.apptsToday },
          { label: 'Completed', value: kpis.completedAppts },
          { label: 'Events', value: kpis.events },
        ]}
      />

      <QuickActionBar
        actions={[
          { label: 'New Appointment', icon: 'fa-plus', primary: true, onClick: openCreate },
          { label: 'Export CSV', icon: 'fa-file-export', onClick: exportCsv },
        ]}
      />

      <FilterChips options={FILTERS} active={filter} onChange={setFilter} />

      <div className={styles.toolbar}>
        <select className={styles.select} value={viewMode} onChange={(e) => setViewMode(e.target.value)}>
          <option value="daily">Daily board</option>
          <option value="weekly">Weekly board</option>
          <option value="all">All upcoming</option>
        </select>
        <input
          className={styles.input}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search customer, phone, reason..."
        />
      </div>

      <div className={styles.list}>
        {visible.length === 0 ? (
          <div className={styles.empty}>No appointments match this filter.</div>
        ) : (
          visible
            .slice()
            .sort((a, b) => `${a.date} ${a.timeSlot}`.localeCompare(`${b.date} ${b.timeSlot}`))
            .map((appt) => (
              <article key={appt.id} className={styles.card}>
                <div className={styles.cardTop}>
                  <div>
                    <div className={styles.title}>{appt.customerName}</div>
                    <div className={styles.meta}>
                      {appt.date} at {appt.timeSlot} · {appt.reason || 'General visit'}
                    </div>
                    <div className={styles.meta}>Rep: {appt.assignedRep || '--'} · {appt.phone || '--'}</div>
                  </div>
                  <span className={`${styles.status} ${styles[appt.status] || ''}`}>{formatStatus(appt.status)}</span>
                </div>
                <div className={styles.actions}>
                  <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => openEdit(appt)}>Edit</button>
                  <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => moveStatus(appt)}>Advance status</button>
                  <a className={`${styles.btn} ${styles.btnGhost} ${!appt.phone ? styles.btnDisabled : ''}`} href={appt.phone ? `tel:${appt.phone}` : undefined}>Call</a>
                  <a className={`${styles.btn} ${styles.btnGhost} ${!appt.phone ? styles.btnDisabled : ''}`} href={appt.phone ? `sms:${appt.phone}` : undefined}>Text</a>
                  <button type="button" className={`${styles.btn} ${styles.btnDanger}`} onClick={() => onDelete(appt.id)}>Delete</button>
                </div>
              </article>
            ))
        )}
      </div>

      {formOpen && (
        <div className={styles.overlay} onClick={closeEditor}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3>{form.id ? 'Edit Appointment' : 'New Appointment'}</h3>
            <form className={styles.form} onSubmit={onSave}>
              <label className={styles.field}>
                <span>Customer name</span>
                <input className={styles.input} placeholder="Customer name" value={form.customerName} onChange={(e) => setForm((f) => ({ ...f, customerName: e.target.value }))} />
              </label>
              <label className={styles.field}>
                <span>Phone</span>
                <input className={styles.input} placeholder="Phone" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
              </label>
              <label className={styles.field}>
                <span>Reason</span>
                <input className={styles.input} placeholder="Reason" value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} />
              </label>
              <label className={styles.field}>
                <span>Date</span>
                <input className={styles.input} type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
              </label>
              <label className={styles.field}>
                <span>Time slot</span>
                <input className={styles.input} placeholder="Time slot (e.g. 2:30 PM)" value={form.timeSlot} onChange={(e) => setForm((f) => ({ ...f, timeSlot: e.target.value }))} />
              </label>
              <label className={styles.field}>
                <span>Assigned rep</span>
                <input className={styles.input} placeholder="Assigned rep" value={form.assignedRep} onChange={(e) => setForm((f) => ({ ...f, assignedRep: e.target.value }))} />
              </label>
              <label className={styles.field}>
                <span>Status</span>
                <select className={styles.select} value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                <option value="scheduled">scheduled</option>
                <option value="arrived">arrived</option>
                <option value="in_service">in_service</option>
                <option value="completed">completed</option>
                <option value="no_show">no_show</option>
                <option value="cancelled">cancelled</option>
                </select>
              </label>
              <label className={`${styles.field} ${styles.fullWidth}`}>
                <span>Notes</span>
                <textarea className={styles.input} placeholder="Notes" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
              </label>
              <div className={styles.formActions}>
                <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={closeEditor}>Cancel</button>
                <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`}>Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

