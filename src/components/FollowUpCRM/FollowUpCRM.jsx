import { useMemo, useState } from 'react';
import { downloadCsv } from '../../utils/download';
import {
  buildModuleKpis,
  exportLeadsCsv,
  listLeads,
  rememberExport,
  removeLead,
  saveLead,
  updateLeadStage,
} from '../../utils/moduleStorage';
import { FilterChips, KpiGrid, QuickActionBar } from '../Shared/SharedWidgets';
import styles from './FollowUpCRM.module.css';

const STAGE_OPTIONS = ['new', 'contacted', 'quoted', 'waiting', 'won', 'lost'];
const FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'Overdue', value: 'overdue' },
  { label: 'Open', value: 'open' },
  { label: 'Won', value: 'won' },
];

const STAGE_LABELS = {
  new: 'New',
  contacted: 'Contacted',
  quoted: 'Quoted',
  waiting: 'Waiting',
  won: 'Won',
  lost: 'Lost',
};

const EMPTY_FORM = {
  customerName: '',
  phone: '',
  stage: 'new',
  priority: 'medium',
  nextAction: '',
  nextReminderAt: '',
  notes: '',
};

function toMs(iso) {
  if (!iso) return Number.POSITIVE_INFINITY;
  return new Date(iso).getTime();
}

function isOverdue(lead) {
  return lead.nextReminderAt && toMs(lead.nextReminderAt) < Date.now() && !['won', 'lost'].includes(lead.stage);
}

function formatStage(stage) {
  return STAGE_LABELS[stage] || stage;
}

export default function FollowUpCRM({ showToast, showConfirm }) {
  const [leads, setLeads] = useState(() => listLeads());
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const kpis = useMemo(() => buildModuleKpis(), [leads]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return leads.filter((lead) => {
      if (filter === 'overdue' && !isOverdue(lead)) return false;
      if (filter === 'open' && ['won', 'lost'].includes(lead.stage)) return false;
      if (filter === 'won' && lead.stage !== 'won') return false;
      if (!term) return true;
      const haystack = `${lead.customerName} ${lead.phone} ${lead.nextAction} ${lead.notes}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [filter, leads, search]);

  const refresh = () => setLeads(listLeads());

  const openNew = () => {
    setForm(EMPTY_FORM);
    setFormOpen(true);
  };

  const openEdit = (lead) => {
    setForm({
      id: lead.id,
      customerName: lead.customerName || '',
      phone: lead.phone || '',
      stage: lead.stage || 'new',
      priority: lead.priority || 'medium',
      nextAction: lead.nextAction || '',
      nextReminderAt: lead.nextReminderAt || '',
      notes: lead.notes || '',
    });
    setFormOpen(true);
  };

  const onSave = (e) => {
    e.preventDefault();
    if (!form.customerName.trim()) {
      showToast('Customer name is required', 'warning');
      return;
    }
    saveLead(form);
    refresh();
    showToast(form.id ? 'Lead updated' : 'Lead added', 'success');
    setFormOpen(false);
  };

  const moveStage = (lead) => {
    const idx = STAGE_OPTIONS.indexOf(lead.stage);
    const next = idx >= 0 && idx < STAGE_OPTIONS.length - 1 ? STAGE_OPTIONS[idx + 1] : lead.stage;
    updateLeadStage(lead.id, next);
    refresh();
    showToast(`Stage set to ${next}`, 'success');
  };

  const logOutcome = (lead, channel) => {
    const stamp = new Date().toLocaleString();
    const line = `[${stamp}] ${channel}: completed`;
    saveLead({
      ...lead,
      notes: lead.notes ? `${lead.notes}\n${line}` : line,
    });
    refresh();
    showToast(`${channel} outcome logged`, 'success');
  };

  const exportCsv = () => {
    const date = new Date().toISOString().slice(0, 10);
    downloadCsv(`leads_${date}.csv`, exportLeadsCsv());
    rememberExport();
    showToast('Leads CSV exported', 'success');
  };

  const handleDeleteLead = (id) => {
    const performDelete = () => {
      removeLead(id);
      refresh();
      showToast('Lead removed', 'success');
    };
    if (!showConfirm) {
      performDelete();
      return;
    }
    showConfirm({
      title: 'Delete lead?',
      message: 'This lead and its follow-up history will be removed from local storage.',
      confirmLabel: 'Delete',
      tone: 'danger',
      onConfirm: performDelete,
    });
  };

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <h2>Follow Up CRM</h2>
        <p>Track leads, reminders, and outcomes without leaving the app.</p>
      </div>

      <KpiGrid
        items={[
          { label: 'Overdue', value: kpis.overdueLeads },
          { label: 'Won', value: kpis.wonLeads },
          { label: 'Events', value: kpis.events },
        ]}
      />

      <QuickActionBar
        actions={[
          { label: 'New Lead', icon: 'fa-user-plus', primary: true, onClick: openNew },
          { label: 'Export CSV', icon: 'fa-file-export', onClick: exportCsv },
        ]}
      />

      <FilterChips options={FILTERS} active={filter} onChange={setFilter} />

      <div className={styles.toolbar}>
        <input
          className={styles.input}
          placeholder="Search customer, phone, action..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className={styles.grid}>
        {visible.length === 0 ? (
          <div className={styles.empty}>No leads found for this filter.</div>
        ) : (
          visible
            .slice()
            .sort((a, b) => toMs(a.nextReminderAt) - toMs(b.nextReminderAt))
            .map((lead) => (
              <article key={lead.id} className={styles.card}>
                <div className={styles.leadTop}>
                  <div className={styles.name}>{lead.customerName}</div>
                  <span className={`${styles.tag} ${styles[lead.stage] || ''}`}>{formatStage(lead.stage)}</span>
                </div>
                <div className={styles.meta}>Priority: {lead.priority} · {lead.phone || '--'}</div>
                <div className={`${styles.meta} ${isOverdue(lead) ? styles.overdue : ''}`}>
                  Reminder: {lead.nextReminderAt ? new Date(lead.nextReminderAt).toLocaleString() : 'Not set'}
                </div>
                <div className={styles.meta}>Next action: {lead.nextAction || '--'}</div>
                <div className={styles.actions}>
                  <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => openEdit(lead)}>Edit</button>
                  <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => moveStage(lead)}>Advance stage</button>
                  <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={() => logOutcome(lead, 'call')}>Log Call</button>
                  <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={() => logOutcome(lead, 'text')}>Log Text</button>
                  <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={() => logOutcome(lead, 'visit')}>Log Visit</button>
                  <a className={`${styles.btn} ${styles.btnGhost} ${!lead.phone ? styles.btnDisabled : ''}`} href={lead.phone ? `tel:${lead.phone}` : undefined}>Call</a>
                  <a className={`${styles.btn} ${styles.btnGhost} ${!lead.phone ? styles.btnDisabled : ''}`} href={lead.phone ? `sms:${lead.phone}` : undefined}>Text</a>
                  <button
                    type="button"
                    className={`${styles.btn} ${styles.btnDanger}`}
                    onClick={() => handleDeleteLead(lead.id)}
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))
        )}
      </div>

      {formOpen && (
        <div className={styles.overlay} onClick={() => setFormOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3>{form.id ? 'Edit Lead' : 'New Lead'}</h3>
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
                <span>Stage</span>
                <select className={styles.select} value={form.stage} onChange={(e) => setForm((f) => ({ ...f, stage: e.target.value }))}>
                {STAGE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
              <label className={styles.field}>
                <span>Priority</span>
                <select className={styles.select} value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}>
                <option value="low">low</option>
                <option value="medium">medium</option>
                <option value="high">high</option>
                </select>
              </label>
              <label className={styles.field}>
                <span>Next action</span>
                <input className={styles.input} placeholder="Next action" value={form.nextAction} onChange={(e) => setForm((f) => ({ ...f, nextAction: e.target.value }))} />
              </label>
              <label className={styles.field}>
                <span>Reminder date/time</span>
                <input className={styles.input} type="datetime-local" value={form.nextReminderAt} onChange={(e) => setForm((f) => ({ ...f, nextReminderAt: e.target.value }))} />
              </label>
              <label className={`${styles.field} ${styles.fullWidth}`}>
                <span>Notes and outcomes</span>
                <textarea className={styles.input} placeholder="Notes and outcomes" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
              </label>
              <div className={styles.formActions}>
                <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => setFormOpen(false)}>Cancel</button>
                <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`}>Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

