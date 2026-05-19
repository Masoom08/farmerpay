// src/modules/pulse-farmer/components/SellRecommendation.jsx
import React from 'react';

function formatRupees(amount) {
  if (amount == null || isNaN(amount)) return '—';
  return '₹' + Math.abs(Math.round(amount)).toLocaleString('en-IN');
}

export default function SellRecommendation({ recommendation, language }) {
  if (!recommendation) return null;

  const {
    recommendedTiming, recommendedPrice, rationale,
    mandiOptions, optimalStrategy, topupEligible, topupMaxAmount
  } = recommendation;

  const mandiList = Array.isArray(mandiOptions) ? mandiOptions : [];

  const strategyLabels = {
    sell_now: { en: 'Sell Now', hi: 'अभी बेचें', color: '#1565c0', icon: '🏪' },
    store_15d: { en: 'Store 15 Days', hi: '15 दिन रखें', color: '#e65100', icon: '📦' },
    store_30d: { en: 'Store 30 Days', hi: '30 दिन रखें', color: '#6a1b9a', icon: '🏭' }
  };

  const strategy = strategyLabels[optimalStrategy] || strategyLabels.sell_now;

  return (
    <div style={styles.card}>
      <h3 style={styles.title}>
        🤖 {language === 'hi' ? 'AI सिफारिश' : 'AI Recommendation'}
      </h3>

      {/* Strategy Badge */}
      <div style={{ ...styles.strategyBadge, backgroundColor: strategy.color }}>
        <span style={styles.strategyIcon}>{strategy.icon}</span>
        <div>
          <div style={styles.strategyLabel}>
            {language === 'hi' ? strategy.hi : strategy.en}
          </div>
          {recommendedPrice && (
            <div style={styles.strategyPrice}>
              @ {formatRupees(recommendedPrice)}/{language === 'hi' ? 'क्विंटल' : 'quintal'}
            </div>
          )}
        </div>
      </div>

      {/* Timing */}
      {recommendedTiming && (
        <div style={styles.timingRow}>
          <span style={styles.timingLabel}>⏰ {language === 'hi' ? 'समय' : 'Timing'}</span>
          <span style={styles.timingValue}>{recommendedTiming}</span>
        </div>
      )}

      {/* Rationale */}
      {rationale && (
        <div style={styles.rationale}>
          <div style={styles.rationaleLabel}>
            {language === 'hi' ? 'यह सिफारिश क्यों:' : 'Why this recommendation:'}
          </div>
          <p style={styles.rationaleText}>{rationale}</p>
        </div>
      )}

      {/* Mandi Options */}
      {mandiList.length > 0 && (
        <div style={styles.mandiSection}>
          <h4 style={styles.mandiTitle}>
            {language === 'hi' ? 'मंडी विकल्प' : 'Mandi Options'}
          </h4>
          {mandiList.map((m, i) => (
            <div key={i} style={{ ...styles.mandiRow, ...(i === 0 ? styles.mandiRowTop : {}) }}>
              <div>
                <div style={styles.mandiName}>{m.mandiName}</div>
                {m.distanceKm && (
                  <div style={styles.mandiDistance}>{m.distanceKm} km</div>
                )}
              </div>
              <div style={styles.mandiPriceGroup}>
                <div style={styles.mandiPrice}>{formatRupees(m.netPrice || m.expectedPrice)}</div>
                {m.transportCost && (
                  <div style={styles.mandiTransport}>
                    -{formatRupees(m.transportCost)} {language === 'hi' ? 'परिवहन' : 'transport'}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Top-up Eligibility Note */}
      {topupEligible && (
        <div style={styles.topupNote}>
          <span style={styles.topupIcon}>💡</span>
          <span style={styles.topupText}>
            {language === 'hi'
              ? `टॉप-अप लोन पात्र: अधिकतम ${formatRupees(topupMaxAmount)}`
              : `Top-up loan eligible: up to ${formatRupees(topupMaxAmount)}`}
          </span>
        </div>
      )}
    </div>
  );
}

const styles = {
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  title: { fontSize: 15, fontWeight: 700, color: '#333', margin: '0 0 12px 0' },
  strategyBadge: { display: 'flex', alignItems: 'center', gap: 12, padding: 14, borderRadius: 10, color: '#fff', marginBottom: 12 },
  strategyIcon: { fontSize: 28 },
  strategyLabel: { fontSize: 16, fontWeight: 700 },
  strategyPrice: { fontSize: 13, opacity: 0.9, marginTop: 2 },
  timingRow: { display: 'flex', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: '#f5f5f5', borderRadius: 8, marginBottom: 12 },
  timingLabel: { fontSize: 13, color: '#666' },
  timingValue: { fontSize: 13, fontWeight: 600, color: '#333' },
  rationale: { padding: 12, backgroundColor: '#e8f5e9', borderRadius: 8, marginBottom: 12 },
  rationaleLabel: { fontSize: 11, fontWeight: 600, color: '#2e7d32', marginBottom: 4 },
  rationaleText: { fontSize: 13, color: '#333', lineHeight: 1.5, margin: 0 },
  mandiSection: { marginBottom: 12 },
  mandiTitle: { fontSize: 13, fontWeight: 600, color: '#666', margin: '0 0 8px 0' },
  mandiRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f0f0f0' },
  mandiRowTop: { borderLeft: '3px solid #2e7d32', paddingLeft: 8 },
  mandiName: { fontSize: 13, fontWeight: 600, color: '#333' },
  mandiDistance: { fontSize: 11, color: '#999' },
  mandiPriceGroup: { textAlign: 'right' },
  mandiPrice: { fontSize: 14, fontWeight: 700, color: '#1b5e20' },
  mandiTransport: { fontSize: 10, color: '#e53935' },
  topupNote: { display: 'flex', alignItems: 'center', gap: 8, padding: 10, backgroundColor: '#e3f2fd', borderRadius: 8 },
  topupIcon: { fontSize: 18 },
  topupText: { fontSize: 12, fontWeight: 600, color: '#1565c0' }
};
