import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useProtectData } from '../../hooks/useProtectData';
import {
  groupByProtectionType,
  formatPhoneNumber,
  isMdnVerified,
  splitUpcsByVerification,
} from '../../utils/protectLogic';
import styles from './ProtectApp.module.css';

export default function ProtectApp({ showToast, dataRefreshToken = 0 }) {
  const { flatDeviceList, loading, refresh } = useProtectData();
  const [search, setSearch] = useState('');
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [expandedBrands, setExpandedBrands] = useState(new Set());

  const toggleBrand = useCallback((brand) => {
    setExpandedBrands((prev) => {
      const next = new Set(prev);
      if (next.has(brand)) next.delete(brand);
      else next.add(brand);
      return next;
    });
  }, []);

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return flatDeviceList;
    return flatDeviceList.filter((item) => {
      const haystack = [item.brand, item.model, ...item.rows.map((r) => `${r.type} ${r.upc} ${r.mdn}`)].join(' ').toLowerCase();
      return haystack.includes(term);
    });
  }, [flatDeviceList, search]);

  const byBrand = useMemo(() => {
    const map = new Map();
    filtered.forEach((item) => {
      const list = map.get(item.brand) || [];
      list.push(item);
      map.set(item.brand, list);
    });
    return Array.from(map.entries()).map(([brand, devices]) => ({ brand, devices }));
  }, [filtered]);

  const openDevice = useCallback((device) => {
    setSelectedDevice(device);
    setSheetOpen(true);
  }, []);

  const closeSheet = useCallback(() => {
    setSheetOpen(false);
    setSelectedDevice(null);
  }, []);

  const handleRefresh = useCallback(async () => {
    closeSheet();
    await refresh();
    showToast('Data refreshed', 'success');
  }, [closeSheet, refresh, showToast]);

  const handleNewSearch = useCallback(() => {
    closeSheet();
    setSearch('');
  }, [closeSheet]);

  const copyToClipboard = useCallback(async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(`${label} copied`, 'success');
    } catch {
      showToast('Failed to copy', 'error');
    }
  }, [showToast]);

  useEffect(() => {
    if (dataRefreshToken > 0) {
      refresh();
    }
  }, [dataRefreshToken, refresh]);

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <h2>Protection Catalog</h2>
        <p>Expand a brand to see models, then tap &quot;Get info&quot; for UPCs and MDNs.</p>
      </div>
      <div className={styles.searchWrap}>
        <div className={styles.searchBox}>
          <i className="fas fa-search"></i>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search brand or model..."
            aria-label="Search devices"
            autoComplete="off"
          />
          {search && (
            <button
              type="button"
              className={styles.clearBtn}
              onClick={() => setSearch('')}
              aria-label="Clear search"
            >
              <i className="fas fa-times"></i>
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <span>Loading devices...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className={styles.empty}>
          <i className="fas fa-search"></i>
          <span className={styles.emptyTitle}>No devices found</span>
          <span className={styles.emptyMsg}>Try a different search term</span>
        </div>
      ) : (
        <div className={styles.brandList}>
          {byBrand.map(({ brand, devices }) => {
            const isExpanded = expandedBrands.has(brand);
            return (
              <div key={brand} className={styles.brandSection}>
                <button
                  type="button"
                  className={`${styles.brandHeader} ${isExpanded ? styles.expanded : ''}`}
                  onClick={() => toggleBrand(brand)}
                  aria-expanded={isExpanded}
                >
                  <i className="fas fa-chevron-right"></i>
                  <span>{brand}</span>
                  <span className={styles.brandCount}>{devices.length}</span>
                </button>
                {isExpanded && (
                  <div className={styles.modelList}>
                    {devices.map((item) => (
                      <div key={item.key} className={styles.modelRow}>
                        <span className={styles.modelName}>{item.model}</span>
                        <button
                          type="button"
                          className={styles.getInfoBtn}
                          onClick={() => openDevice(item)}
                        >
                          <i className="fas fa-info-circle"></i>
                          <span>Get info</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {sheetOpen && selectedDevice && (
        <DetailSheet
          device={selectedDevice}
          onClose={closeSheet}
          onRefresh={handleRefresh}
          onNewSearch={handleNewSearch}
          copyToClipboard={copyToClipboard}
          showToast={showToast}
        />
      )}
    </section>
  );
}

function DetailSheet({ device, onClose, onRefresh, onNewSearch, copyToClipboard, showToast }) {
  const hasVerifiedMdns = device.rows?.some((r) => r.mdn && isMdnVerified(r));
  const groups = groupByProtectionType(device.rows);

  return (
    <div className={styles.sheet} aria-hidden="false">
      <div className={styles.backdrop} onClick={onClose} />
      <div className={styles.panel}>
        <header className={styles.sheetHeader}>
          <div>
            <h3>{device.brand} {device.model}</h3>
            <p className={styles.sheetSubtitle}>
              {hasVerifiedMdns ? 'MDN verified · Ready for activation' : 'Verify MDN in sheet'}
            </p>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <i className="fas fa-times"></i>
          </button>
        </header>
        <div className={styles.sheetBody}>
          {groups.length === 0 ? (
            <div className={styles.noOptions}>No options found for this device.</div>
          ) : (
            groups.map((group) => (
              <OptionCard
                key={`${group.brand}-${group.type}`}
                group={group}
                copyToClipboard={copyToClipboard}
              />
            ))
          )}
        </div>
        <footer className={styles.sheetFooter}>
          <button type="button" className={styles.footerBtnSecondary} onClick={onRefresh}>
            <i className="fas fa-sync-alt"></i>
            <span>Refresh data</span>
          </button>
          <button type="button" className={styles.footerBtnPrimary} onClick={onNewSearch}>
            <i className="fas fa-search"></i>
            <span>Search again</span>
          </button>
        </footer>
      </div>
    </div>
  );
}

function OptionCard({ group, copyToClipboard }) {
  const { verifiedUpcs, unverifiedUpcs } = splitUpcsByVerification(group.entries);
  const allUpcs = [...verifiedUpcs, ...unverifiedUpcs];
  const verifiedMdns = Array.from(group.verifiedMdns);

  const upcCopyLabel = `${group.brand} ${group.type} UPC`;

  const copyAllUpcs = () => {
    copyToClipboard(allUpcs.join(', '), `${allUpcs.length} ${group.brand} ${group.type} UPC${allUpcs.length !== 1 ? 's' : ''}`);
  };

  const copyAllMdns = () => {
    copyToClipboard(verifiedMdns.join(', '), `${verifiedMdns.length} MDN${verifiedMdns.length !== 1 ? 's' : ''}`);
  };

  return (
    <div className={styles.optionCard}>
      <div className={styles.optionHead}>
        <span className={styles.optionType}>{group.brand} · {group.type}</span>
      </div>

      {/* UPC Codes Section */}
      <div className={styles.valueSection}>
        <div className={styles.sectionHeader}>
          <i className="fas fa-barcode"></i>
          <span>UPC Codes</span>
          <span className={styles.sectionBadge}>{allUpcs.length}</span>
        </div>
        <div className={styles.valueList}>
          {verifiedUpcs.map((upc) => (
            <ValueRow
              key={upc}
              value={upc}
              label={upcCopyLabel}
              verified
              onCopy={copyToClipboard}
              productBrand={group.brand}
              productType={group.type}
            />
          ))}
          {unverifiedUpcs.map((upc) => (
            <ValueRow
              key={upc}
              value={upc}
              label={upcCopyLabel}
              verified={false}
              onCopy={copyToClipboard}
              productBrand={group.brand}
              productType={group.type}
            />
          ))}
        </div>
        {allUpcs.length > 1 && (
          <button type="button" className={styles.copyAllBtn} onClick={copyAllUpcs}>
            <i className="fas fa-copy"></i> Copy all {allUpcs.length} UPCs
          </button>
        )}
        {(verifiedUpcs.length > 0 && unverifiedUpcs.length > 0) && (
          <div className={styles.legend}>
            <span className={styles.legendItem}><i className="fas fa-check-circle"></i> Verified</span>
            <span className={styles.legendItem}><i className="fas fa-exclamation-circle"></i> Unverified</span>
          </div>
        )}
      </div>

      {/* MDN - Hold to reveal (CPNI compliance: not visible until actionable) */}
      {verifiedMdns.length > 0 && (
        <HoldToRevealMdn
          mdns={verifiedMdns}
          productLabel={`${group.brand} ${group.type}`}
          copyToClipboard={copyToClipboard}
          copyAllMdns={copyAllMdns}
        />
      )}
    </div>
  );
}

const HOLD_MS = 650;

function HoldToRevealMdn({ mdns, productLabel, copyToClipboard, copyAllMdns }) {
  const [revealed, setRevealed] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const holdRef = useRef(null);
  const startRef = useRef(null);

  const startHold = useCallback(() => {
    setHoldProgress(0);
    startRef.current = performance.now();
    holdRef.current = requestAnimationFrame(function animate(now) {
      const elapsed = now - startRef.current;
      const pct = Math.min(100, (elapsed / HOLD_MS) * 100);
      setHoldProgress(pct);
      if (pct >= 100) {
        setRevealed(true);
        return;
      }
      holdRef.current = requestAnimationFrame(animate);
    });
  }, []);

  const cancelHold = useCallback(() => {
    if (holdRef.current) {
      cancelAnimationFrame(holdRef.current);
      holdRef.current = null;
    }
    setHoldProgress(0);
  }, []);

  const closeModal = useCallback(() => setRevealed(false), []);

  const preventClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <>
      <div className={styles.valueSection}>
        <button
          type="button"
          className={`${styles.holdToRevealBtn} ${holdProgress > 0 ? styles.holding : ''}`}
          onPointerDown={startHold}
          onPointerUp={cancelHold}
          onPointerLeave={cancelHold}
          onPointerCancel={cancelHold}
          onClick={preventClick}
        >
          <i className="fas fa-phone-alt"></i>
          <span>Hold to reveal MDN{mdns.length !== 1 ? 's' : ''}</span>
          <span className={styles.holdBadge}>{mdns.length}</span>
          {holdProgress > 0 && holdProgress < 100 && (
            <span className={styles.holdProgress} style={{ width: `${holdProgress}%` }} aria-hidden />
          )}
        </button>
      </div>

      {revealed && (
        <MdnRevealModal
          mdns={mdns}
          productLabel={productLabel}
          onClose={closeModal}
          copyToClipboard={copyToClipboard}
          copyAllMdns={copyAllMdns}
        />
      )}
    </>
  );
}

function MdnRevealModal({ mdns, productLabel, onClose, copyToClipboard, copyAllMdns }) {
  return (
    <div className={styles.mdnModalOverlay} onClick={onClose}>
      <div className={styles.mdnModal} onClick={(e) => e.stopPropagation()}>
        <header className={styles.mdnModalHeader}>
          <div>
            <h4>Verified MDN{mdns.length !== 1 ? 's' : ''}</h4>
            <p className={styles.mdnModalProduct}>{productLabel}</p>
            <p className={styles.mdnModalNote}>
              <i className="fas fa-shield-alt"></i> CPNI – handle with care
            </p>
          </div>
          <button type="button" className={styles.mdnModalClose} onClick={onClose} aria-label="Close">
            <i className="fas fa-times"></i>
          </button>
        </header>
        <div className={styles.mdnModalBody}>
          {mdns.map((mdn) => (
            <div key={mdn} className={styles.mdnModalRow}>
              <code>{formatPhoneNumber(mdn)}</code>
              <button type="button" onClick={() => copyToClipboard(mdn, 'MDN')} aria-label="Copy MDN">
                <i className="fas fa-copy"></i>
              </button>
            </div>
          ))}
        </div>
        {mdns.length > 1 && (
          <footer className={styles.mdnModalFooter}>
            <button type="button" className={styles.copyAllBtn} onClick={copyAllMdns}>
              <i className="fas fa-copy"></i> Copy all {mdns.length} MDNs
            </button>
          </footer>
        )}
      </div>
    </div>
  );
}

function ValueRow({ value, rawValue, label, verified, onCopy, productBrand, productType }) {
  const toCopy = rawValue ?? value;
  return (
    <div className={`${styles.valueRow} ${verified ? styles.verified : styles.unverified}`}>
      <div className={styles.valueRowLeft}>
        {(productBrand || productType) && (
          <div className={styles.upcLabels}>
            {productBrand && <span className={styles.brandPill}>{productBrand}</span>}
            {productType && <span className={`${styles.typePill} ${styles[`type_${productType.toLowerCase()}`] || ''}`}>{productType}</span>}
          </div>
        )}
        <code>{value}</code>
      </div>
      <div className={styles.valueRowActions}>
        {verified ? (
          <span className={styles.verifiedBadge} title="Verified"><i className="fas fa-check-circle"></i></span>
        ) : (
          <span className={styles.unverifiedBadge} title="Unverified"><i className="fas fa-exclamation-circle"></i></span>
        )}
        <button type="button" onClick={() => onCopy(toCopy, label)} aria-label={`Copy ${label}`}>
          <i className="fas fa-copy"></i>
        </button>
      </div>
    </div>
  );
}
