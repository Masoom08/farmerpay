/**
 * MandiComparison.jsx
 * Displays top nearby mandis sorted by net price (modal price - transport cost).
 * Fetches the latest price for each mandi, highlights the best option.
 * Mobile-first, inline styles, bilingual (en/hi).
 *
 * Props:
 *   mandis      {Array}   List of mandi objects from PULSE API.
 *   commodityId {string}  Commodity to fetch prices for.
 *   language    {'en'|'hi'}
 */

import React, { useState, useEffect, useCallback } from 'react';
import { t } from '../utils/translations';

const API_BASE = '/api/v1';

/* ─── helpers ─────────────────────────────────────────────────── */

function authHeaders() {
  const token = (typeof localStorage !== 'undefined' && localStorage.getItem('auth_token')) || '';
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

function formatRupees(amount) {
  if (amount == null || isNaN(amount)) return '—';
  return '₹' + Math.round(amount).toLocaleString('en-IN');
}

/* ─── sub-components ──────────────────────────────────────────── */

function MandiCard({ mandi, isTop, language }) {
  const {
    mandiName,
    name,
    distanceKm,
    modalPrice,
    transportCostPerQtl = 0,
    netPrice,
  } = mandi;

  const displayName    = mandiName || name || '—';
  const displayPrice   = modalPrice   != null ? formatRupees(modalPrice)         : '—';
  const displayTransport = transportCostPerQtl != null ? formatRupees(transportCostPerQtl) : '—';
  const displayNet     = netPrice     != null ? formatRupees(netPrice)            : '—';
  const displayDist    = distanceKm   != null ? `${distanceKm} km`               : '—';

  return (
    <div style={{
      ...styles.mandiCard,
      ...(isTop ? styles.mandiCardTop : {}),
    }}>
      {isTop && (
        <div style={styles.bestBadge}>
          {language === 'hi' ? 'सर्वश्रेष्ठ' : 'BEST'}
        </div>
      )}

      {/* mandi name + distance */}
      <div style={styles.cardHeader}>
        <span style={{ ...styles.mandiName, ...(isTop ? styles.mandiNameTop : {}) }}>
          {displayName}
        </span>
        <span style={{ ...styles.distanceBadge, ...(isTop ? styles.distanceBadgeTop : {}) }}>
          📍 {displayDist}
        </span>
      </div>

      {/* price rows */}
      <div style={styles.priceGrid}>
        <div style={styles.priceRow}>
          <span style={styles.priceRowLabel}>
            {language === 'hi' ? 'मंडी भाव' : 'Modal Price'}
          </span>
          <span style={styles.priceRowValue}>{displayPrice}</span>
        </div>
        <div style={styles.priceRow}>
          <span style={styles.priceRowLabel}>{t('transport', language)}</span>
          <span style={{ ...styles.priceRowValue, color: '#e65100' }}>
            -{displayTransport}
          </span>
        </div>
        <div style={styles.divider} />
        <div style={styles.priceRow}>
          <span style={{ ...styles.priceRowLabel, fontWeight: 700, color: '#1b5e20' }}>
            {language === 'hi' ? 'शुद्ध भाव' : 'Net Price'}
          </span>
          <span style={{
            ...styles.priceRowValue,
            fontWeight: 800,
            fontSize: 16,
            color: isTop ? '#1b5e20' : '#2e7d32',
          }}>
            {displayNet}
          </span>
        </div>
      </div>

      <div style={styles.perQuintal}>
        {t('perQuintal', language)}
      </div>
    </div>
  );
}

/* ─── main component ──────────────────────────────────────────── */

export default function MandiComparison({ mandis = [], commodityId, language = 'en' }) {
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState(null);
  const [enrichedMandis, setEnrichedMandis] = useState([]);

  const fetchPrices = useCallback(async () => {
    if (!commodityId || mandis.length === 0) {
      setEnrichedMandis([]);
      return;
    }
    try {
      setLoading(true);
      setError(null);

      /* Fetch latest price for each mandi in parallel (cap at 6 mandis) */
      const subset = mandis.slice(0, 6);
      const results = await Promise.allSettled(
        subset.map((mandi) => {
          const mandiId = mandi.mandiId || mandi.id;
          return fetch(
            `${API_BASE}/pulse/prices/latest?commodityId=${commodityId}&mandiId=${mandiId}&days=1`,
            { headers: authHeaders() }
          )
            .then((r) => r.json())
            .then((res) => {
              const modalPrice = res?.data?.modalPrice
                ?? res?.data?.prices?.[0]?.modalPrice
                ?? null;
              const transportCost = mandi.transportCostPerQtl ?? 0;
              const netPrice = modalPrice != null ? modalPrice - transportCost : null;
              return {
                ...mandi,
                modalPrice,
                netPrice,
                transportCostPerQtl: transportCost,
              };
            });
        })
      );

      const enriched = results
        .map((r) => (r.status === 'fulfilled' ? r.value : null))
        .filter(Boolean);

      /* Sort by net price descending (best first) */
      enriched.sort((a, b) => {
        if (a.netPrice == null) return 1;
        if (b.netPrice == null) return -1;
        return b.netPrice - a.netPrice;
      });

      setEnrichedMandis(enriched);
    } catch (err) {
      setError(err.message || 'Failed to load mandi prices');
    } finally {
      setLoading(false);
    }
  }, [mandis, commodityId]);

  useEffect(() => { fetchPrices(); }, [fetchPrices]);

  /* ── render ── */

  if (loading) {
    return (
      <div style={styles.card}>
        <h3 style={styles.sectionTitle}>{t('mandiComparison', language)}</h3>
        <div style={styles.loadingRow}>
          <div style={styles.spinner} />
          <span style={styles.loadingText}>
            {language === 'hi' ? 'मंडी भाव लोड हो रहा है...' : 'Loading mandi prices…'}
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.card}>
        <h3 style={styles.sectionTitle}>{t('mandiComparison', language)}</h3>
        <p style={styles.errorText}>{error}</p>
        <button style={styles.retryBtn} onClick={fetchPrices}>
          {t('retry', language)}
        </button>
      </div>
    );
  }

  if (enrichedMandis.length === 0) {
    return (
      <div style={styles.card}>
        <h3 style={styles.sectionTitle}>{t('mandiComparison', language)}</h3>
        <p style={styles.emptyText}>
          {language === 'hi'
            ? 'कोई मंडी डेटा उपलब्ध नहीं।'
            : 'No mandi data available.'}
        </p>
      </div>
    );
  }

  return (
    <div style={styles.card}>
      <div style={styles.cardHeaderRow}>
        <h3 style={styles.sectionTitle}>{t('mandiComparison', language)}</h3>
        <span style={styles.countBadge}>
          {enrichedMandis.length} {language === 'hi' ? 'मंडियां' : 'mandis'}
        </span>
      </div>

      <p style={styles.sortNote}>
        {language === 'hi'
          ? 'शुद्ध भाव के अनुसार क्रमबद्ध (परिवहन लागत घटाने के बाद)'
          : 'Sorted by net price after deducting transport cost'}
      </p>

      <div style={styles.mandiList}>
        {enrichedMandis.map((mandi, idx) => (
          <MandiCard
            key={mandi.mandiId || mandi.id || idx}
            mandi={mandi}
            isTop={idx === 0}
            language={language}
          />
        ))}
      </div>
    </div>
  );
}

/* ─── styles ──────────────────────────────────────────────────── */

const styles = {
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: '14px 14px 10px',
    marginBottom: 12,
    boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
    border: '1px solid #e8f5e9',
  },
  cardHeaderRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  sectionTitle: {
    margin: '0 0 2px',
    fontSize: 14,
    fontWeight: 700,
    color: '#1b5e20',
  },
  countBadge: {
    backgroundColor: '#e8f5e9',
    color: '#2e7d32',
    fontSize: 11,
    padding: '2px 8px',
    borderRadius: 12,
    fontWeight: 600,
  },
  sortNote: {
    margin: '0 0 12px',
    fontSize: 11,
    color: '#9e9e9e',
  },

  /* mandi card */
  mandiList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  mandiCard: {
    position: 'relative',
    backgroundColor: '#f9fbe7',
    border: '1px solid #e8f5e9',
    borderRadius: 12,
    padding: '12px 12px 8px',
  },
  mandiCardTop: {
    backgroundColor: '#e8f5e9',
    border: '2px solid #2e7d32',
  },
  bestBadge: {
    position: 'absolute',
    top: -1,
    right: 10,
    backgroundColor: '#2e7d32',
    color: '#fff',
    fontSize: 10,
    fontWeight: 700,
    padding: '2px 8px',
    borderRadius: '0 0 8px 8px',
    letterSpacing: 0.6,
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  mandiName: {
    fontSize: 14,
    fontWeight: 600,
    color: '#37474f',
    flex: 1,
    marginRight: 8,
  },
  mandiNameTop: {
    color: '#1b5e20',
    fontWeight: 700,
  },
  distanceBadge: {
    backgroundColor: '#eceff1',
    color: '#546e7a',
    fontSize: 11,
    padding: '2px 8px',
    borderRadius: 12,
    fontWeight: 500,
    whiteSpace: 'nowrap',
  },
  distanceBadgeTop: {
    backgroundColor: '#c8e6c9',
    color: '#1b5e20',
  },

  /* price grid */
  priceGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  priceRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceRowLabel: {
    fontSize: 12,
    color: '#546e7a',
  },
  priceRowValue: {
    fontSize: 13,
    fontWeight: 600,
    color: '#37474f',
  },
  divider: {
    height: 1,
    backgroundColor: '#e8f5e9',
    margin: '2px 0',
  },
  perQuintal: {
    marginTop: 4,
    fontSize: 10,
    color: '#9e9e9e',
    textAlign: 'right',
  },

  /* loading / error / empty */
  loadingRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '12px 0',
  },
  spinner: {
    width: 20,
    height: 20,
    border: '3px solid #c8e6c9',
    borderTopColor: '#2e7d32',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
    flexShrink: 0,
  },
  loadingText: {
    fontSize: 13,
    color: '#558b2f',
  },
  errorText: {
    fontSize: 13,
    color: '#c62828',
    margin: '4px 0 8px',
  },
  retryBtn: {
    backgroundColor: '#1b5e20',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '8px 20px',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
  emptyText: {
    fontSize: 13,
    color: '#9e9e9e',
    textAlign: 'center',
    padding: '16px 0',
    margin: 0,
  },
};
