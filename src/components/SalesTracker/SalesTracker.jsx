import { useMemo, useState } from 'react';
import { downloadCsv } from '../../utils/download';
import {
  buildModuleKpis,
  exportSalesCsv,
  listSalesEntries,
  removeSalesEntry,
  rememberExport,
  saveSalesEntry,
} from '../../utils/moduleStorage';
import { FilterChips, KpiGrid, QuickActionBar } from '../Shared/SharedWidgets';
import styles from './SalesTracker.module.css';

const FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'Today', value: 'today' },
  { label: 'Voice Lines > 0', value: 'voice' },
  { label: 'BTS > 0', value: 'bts' },
  { label: 'Accessories > 0', value: 'accessories' },
];

const EMPTY_SALE = {
  date: new Date().toISOString().slice(0, 10),
  rep: '',
  voiceLines: 0,
  btsSold: 0,
  accessoriesTotal: 0,
  notes: '',
};

export default function SalesTracker({ showToast, showConfirm }) {
  const [rows, setRows] = useState(() => listSalesEntries());
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_SALE);

  const kpis = useMemo(() => buildModuleKpis(), [rows]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    const today = new Date().toISOString().slice(0, 10);
    return rows.filter((entry) => {
      if (filter === 'today' && entry.date !== today) return false;
      if (filter === 'voice' && !(Number(entry.voiceLines ?? entry.linesSold) > 0)) return false;
      if (filter === 'bts' && !(Number(entry.btsSold) > 0)) return false;
      if (filter === 'accessories' && !(Number(entry.accessoriesTotal) > 0)) return false;
      if (!term) return true;
      const hay = `${entry.rep} ${entry.notes} ${entry.voiceLines ?? entry.linesSold} ${entry.btsSold} ${entry.accessoriesTotal}`.toLowerCase();
      return hay.includes(term);
    });
  }, [rows, filter, search]);

  const refresh = () => setRows(listSalesEntries());

  const onSaveSale = (e) => {
    e.preventDefault();
    if (!form.date || !form.rep.trim()) {
      showToast('Date and rep are required', 'warning');
      return;
    }
    saveSalesEntry(form);
    refresh();
    setForm(EMPTY_SALE);
    setFormOpen(false);
    showToast('Sale saved', 'success');
  };

  const onDeleteSale = (id) => {
    const performDelete = () => {
      removeSalesEntry(id);
      refresh();
      showToast('Sale deleted', 'success');
    };
    if (!showConfirm) {
      performDelete();
      return;
    }
    showConfirm({
      title: 'Delete sale entry?',
      message: 'This daily sales record will be removed from the tracker.',
      confirmLabel: 'Delete',
      tone: 'danger',
      onConfirm: performDelete,
    });
  };

  const onExportSales = () => {
    const date = new Date().toISOString().slice(0, 10);
    downloadCsv(`sales_${date}.csv`, exportSalesCsv());
    rememberExport();
    showToast('Sales CSV exported', 'success');
  };

  return (
    <section className={styles.section}>
      <header className={styles.header}>
        <h2>Sales Tracker</h2>
        <p>Track daily sales and open the Number Portability reference from one place.</p>
      </header>

      <KpiGrid
        items={[
          { label: 'Total Lines Sold', value: kpis.totalLinesSold || 0 },
          { label: 'Total BTS Sold', value: kpis.totalBtsSold || 0 },
          { label: 'Accessories Total', value: kpis.accessoriesTotalSold || 0 },
        ]}
      />

      <QuickActionBar
        actions={[
          { label: 'Add Sale', icon: 'fa-plus', primary: true, onClick: () => setFormOpen(true) },
          { label: 'Export Sales CSV', icon: 'fa-file-export', onClick: onExportSales },
        ]}
      />

      <FilterChips options={FILTERS} active={filter} onChange={setFilter} />

      <div className={styles.toolbar}>
        <input
          className={styles.input}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search rep or notes..."
        />
      </div>

      <div className={styles.list}>
        {visible.length === 0 ? (
          <div className={styles.empty}>No sales match this filter.</div>
        ) : (
          visible
            .slice()
            .sort((a, b) => `${b.date}`.localeCompare(`${a.date}`))
            .map((entry) => (
              <article key={entry.id} className={styles.card}>
                <div className={styles.topRow}>
                  <div className={styles.title}>{entry.rep}</div>
                  <div className={styles.title}>{entry.date}</div>
                </div>
                <div className={styles.meta}>
                  Voice Lines: {Number(entry.voiceLines ?? entry.linesSold) || 0} · BTS: {Number(entry.btsSold) || 0} · Accessories: {Number(entry.accessoriesTotal) || 0}
                </div>
                <div className={styles.meta}>{entry.notes || 'No notes'}</div>
                <div className={styles.actions}>
                  <button type="button" className={`${styles.btn} ${styles.btnDanger}`} onClick={() => onDeleteSale(entry.id)}>Delete</button>
                </div>
              </article>
            ))
        )}
      </div>

      {formOpen && (
        <div className={styles.overlay} onClick={() => setFormOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3>Add Sale</h3>
            <form className={styles.form} onSubmit={onSaveSale}>
              <label className={styles.field}>
                <span>Date</span>
                <input className={styles.input} type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
              </label>
              <label className={styles.field}>
                <span>Rep</span>
                <input className={styles.input} value={form.rep} onChange={(e) => setForm((f) => ({ ...f, rep: e.target.value }))} placeholder="Rep name" />
              </label>
              <label className={styles.field}>
                <span>Voice Lines</span>
                <input className={styles.input} type="number" min="0" value={form.voiceLines} onChange={(e) => setForm((f) => ({ ...f, voiceLines: e.target.value }))} />
              </label>
              <label className={styles.field}>
                <span>BTS</span>
                <input className={styles.input} type="number" min="0" value={form.btsSold} onChange={(e) => setForm((f) => ({ ...f, btsSold: e.target.value }))} />
              </label>
              <label className={styles.field}>
                <span>Accessories (Total)</span>
                <input className={styles.input} type="number" min="0" value={form.accessoriesTotal} onChange={(e) => setForm((f) => ({ ...f, accessoriesTotal: e.target.value }))} />
              </label>
              <label className={`${styles.field} ${styles.fullWidth}`}>
                <span>Notes</span>
                <textarea className={styles.input} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Optional notes" />
              </label>
              <div className={styles.formActions}>
                <button type="button" className={styles.btn} onClick={() => setFormOpen(false)}>Cancel</button>
                <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`}>Save Sale</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

