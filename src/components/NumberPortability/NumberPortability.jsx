import { useEffect, useMemo, useState, useCallback } from 'react';
import { fetchPortabilityRows } from '../../utils/portabilityData';
import styles from './NumberPortability.module.css';

export default function NumberPortability({ showToast, dataRefreshToken = 0 }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');

  const loadRows = useCallback(async (force = false, { silentSuccess = true } = {}) => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchPortabilityRows(force);
      setRows(data);
      if (!silentSuccess) {
        showToast('Number portability data loaded', 'success');
      }
    } catch {
      setError('Unable to load portability sheet right now.');
      showToast('Failed to load portability data', 'error');
    }
    setLoading(false);
  }, [showToast]);

  useEffect(() => {
    loadRows(false);
  }, [loadRows]);

  useEffect(() => {
    if (dataRefreshToken > 0) {
      loadRows(true);
    }
  }, [dataRefreshToken, loadRows]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((row) => {
      const hay = [
        row.carrier,
        row.network,
        row.account_number_type,
        row.pin_type,
        row.extra_requirements,
        row.port_center,
      ].join(' ').toLowerCase();
      return hay.includes(term);
    });
  }, [rows, query]);

  return (
    <section className={styles.section}>
      <header className={styles.header}>
        <h2>Number Portability</h2>
        <p>Live lookup from Google Sheets columns: carrier, network, account_number_type, pin_type, extra_requirements, port_center.</p>
      </header>

      <div className={styles.toolbar}>
        <input
          className={styles.input}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search carrier, network, account number type..."
        />
        <button type="button" className={styles.btn} onClick={() => loadRows(true, { silentSuccess: false })}>Refresh</button>
      </div>

      {loading ? (
        <div className={styles.empty}>Loading portability data...</div>
      ) : error ? (
        <div className={styles.empty}>{error}</div>
      ) : filtered.length === 0 ? (
        <div className={styles.empty}>No carriers match this search.</div>
      ) : (
        <>
          <div className={styles.resultMeta}>{filtered.length} carrier references</div>
          <div className={styles.cardList}>
            {filtered.map((row, idx) => (
              <article key={`${row.carrier}-${row.network}-${idx}`} className={styles.card}>
                <div className={styles.cardHeader}>
                  <div>
                    <h3>{row.carrier || '--'}</h3>
                    <p>{row.network || 'Network not listed'}</p>
                  </div>
                  <span className={styles.cardBadge}>{row.pin_type || 'PIN --'}</span>
                </div>
                <dl className={styles.cardDetails}>
                  <div>
                    <dt>Account #</dt>
                    <dd>{row.account_number_type || '--'}</dd>
                  </div>
                  <div>
                    <dt>Extra requirements</dt>
                    <dd>{row.extra_requirements || '--'}</dd>
                  </div>
                  <div>
                    <dt>Port center</dt>
                    <dd>{row.port_center || '--'}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Carrier</th>
                  <th>Network</th>
                  <th>Account Number Type</th>
                  <th>PIN Type</th>
                  <th>Extra Requirements</th>
                  <th>Port Center</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row, idx) => (
                  <tr key={`${row.carrier}-${row.network}-${idx}`}>
                    <td>{row.carrier || '--'}</td>
                    <td>{row.network || '--'}</td>
                    <td>{row.account_number_type || '--'}</td>
                    <td>{row.pin_type || '--'}</td>
                    <td>{row.extra_requirements || '--'}</td>
                    <td>{row.port_center || '--'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

