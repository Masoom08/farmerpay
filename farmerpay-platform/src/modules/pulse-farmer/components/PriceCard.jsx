// src/modules/pulse-farmer/components/PriceCard.jsx
import React from 'react';

function getTrendArrow(currentPrice, forecastPrice) {
  if (!forecastPrice || !currentPrice) return { arrow: '—', color: '#666' };
  const pctChange = ((forecastPrice - currentPrice) / currentPrice) * 100;
  if (pctChange > 10) return { arrow: '↑', color: '#2e7d32', label: `+${pctChange.toFixed(0)}%` };
  if (pctChange > 3) return { arrow: '↗', color: '#558b2f', label: `+${pctChange.toFixed(0)}%` };
  if (pctChange > -3) return { arrow: '→', color: '#f57f17', label: `${pctChange > 0 ? '+' : ''}${pctChange.toFixed(0)}%` };
  if (pctChange > -10) return { arrow: '↘', color: '#e65100', label: `${pctChange.toFixed(0)}%` };
  return { arrow: '↓', color: '#c62828', label: `${pctChange.toFixed(0)}%` };
}

function formatRupees(amount) {
  if (amount == null) return '—';
  return '₹' + Number(amount).toLocaleString('en-IN');
}

export default function PriceCard({ todayPrice, forecast7, forecast15, forecast30, commodity, mandi, language }) {
  const forecasts = [
    { days: 7, data: forecast7, labelEn: 'Next 7 Days', labelHi: 'अगले 7 दिन' },
    { days: 15, data: forecast15, labelEn: 'Next 15 Days', labelHi: 'अगले 15 दिन' },
    { days: 30, data: forecast30, labelEn: 'Next 30 Days', labelHi: 'अगले 30 दिन' }
  ];

  return (
    <div style={styles.card}>
      {/* Today's Price */}
      <div style={styles.todaySection}>
        <span style={styles.todayLabel}>
          {language === 'hi' ? 'आज का भाव' : "Today's Price"}
        </span>
        <span style={styles.todayPrice}>{formatRupees(todayPrice)}</span>
        <span style={styles.perUnit}>/{language === 'hi' ? 'क्विंटल' : 'quintal'}</span>
      </div>

      {/* MSP Indicator */}
      {commodity?.mspApplicable && (
        <div style={styles.mspBar}>
          <span style={styles.mspLabel}>MSP: {formatRupees(commodity.mspPrice)}</span>
          <span style={{
            ...styles.mspBadge,
            backgroundColor: todayPrice >= (commodity.mspPrice || 0) ? '#e8f5e9' : '#fbe9e7',
            color: todayPrice >= (commodity.mspPrice || 0) ? '#2e7d32' : '#c62828'
          }}>
            {todayPrice >= (commodity.mspPrice || 0)
              ? (language === 'hi' ? 'MSP से ऊपर' : 'Above MSP')
              : (language === 'hi' ? 'MSP से नीचे' : 'Below MSP')}
          </span>
        </div>
      )}

      {/* Forecast Rows */}
      <div style={styles.forecastGrid}>
        {forecasts.map(f => {
          const trend = getTrendArrow(todayPrice, f.data?.predictedPrice);
          return (
            <div key={f.days} style={styles.forecastRow}>
              <div style={styles.forecastLabel}>
                {language === 'hi' ? f.labelHi : f.labelEn}
              </div>
              <div style={styles.forecastPrice}>
                {formatRupees(f.data?.predictedPrice)}
              </div>
              <div style={{ ...styles.forecastTrend, color: trend.color }}>
                <span style={styles.arrow}>{trend.arrow}</span>
                <span style={styles.pctLabel}>{trend.label}</span>
              </div>
              <div style={styles.confidenceBar}>
                <div style={{
                  ...styles.confidenceFill,
                  width: `${f.data?.confidence || 0}%`,
                  backgroundColor: (f.data?.confidence || 0) > 70 ? '#4caf50' : (f.data?.confidence || 0) > 50 ? '#ff9800' : '#f44336'
                }} />
                <span style={styles.confidenceText}>
                  {f.data?.confidence ? `${f.data.confidence}%` : '—'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Best Mandi Recommendation */}
      {mandi && (
        <div style={styles.bestMandi}>
          <span style={styles.starIcon}>⭐</span>
          <div>
            <div style={styles.bestMandiLabel}>
              {language === 'hi' ? 'सबसे अच्छी मंडी' : 'Best Mandi'}
            </div>
            <div style={styles.bestMandiName}>{mandi.mandiName}</div>
            {mandi.distanceKm && (
              <div style={styles.bestMandiDistance}>
                {mandi.distanceKm} km | {language === 'hi' ? 'परिवहन' : 'Transport'}: {formatRupees(mandi.transportCost)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Volatility Warning */}
      {commodity?.volatilityClass === 'ultra_high' && (
        <div style={styles.volatilityWarning}>
          ⚠️ {language === 'hi'
            ? 'यह फसल बहुत अस्थिर है। कीमतें तेजी से बदल सकती हैं।'
            : 'This crop has ultra-high price volatility. Prices can change rapidly.'}
        </div>
      )}
    </div>
  );
}

const styles = {
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  todaySection: { textAlign: 'center', paddingBottom: 12, borderBottom: '1px solid #e8f5e9', marginBottom: 12 },
  todayLabel: { display: 'block', fontSize: 12, color: '#666', marginBottom: 4 },
  todayPrice: { fontSize: 32, fontWeight: 800, color: '#1b5e20' },
  perUnit: { fontSize: 14, color: '#666' },
  mspBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', backgroundColor: '#fafafa', borderRadius: 8, marginBottom: 12 },
  mspLabel: { fontSize: 12, color: '#666' },
  mspBadge: { fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 12 },
  forecastGrid: { display: 'flex', flexDirection: 'column', gap: 8 },
  forecastRow: { display: 'grid', gridTemplateColumns: '1fr auto auto 80px', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: '1px solid #f5f5f5' },
  forecastLabel: { fontSize: 13, color: '#333', fontWeight: 500 },
  forecastPrice: { fontSize: 15, fontWeight: 700, color: '#1b5e20', textAlign: 'right' },
  forecastTrend: { display: 'flex', alignItems: 'center', gap: 2 },
  arrow: { fontSize: 18, fontWeight: 700 },
  pctLabel: { fontSize: 12, fontWeight: 600 },
  confidenceBar: { position: 'relative', height: 6, backgroundColor: '#e0e0e0', borderRadius: 3, overflow: 'hidden' },
  confidenceFill: { position: 'absolute', top: 0, left: 0, height: '100%', borderRadius: 3, transition: 'width 0.3s' },
  confidenceText: { position: 'absolute', right: 0, top: -14, fontSize: 10, color: '#999' },
  bestMandi: { display: 'flex', gap: 10, alignItems: 'center', padding: 12, backgroundColor: '#e8f5e9', borderRadius: 8, marginTop: 12 },
  starIcon: { fontSize: 24 },
  bestMandiLabel: { fontSize: 11, color: '#666' },
  bestMandiName: { fontSize: 14, fontWeight: 700, color: '#1b5e20' },
  bestMandiDistance: { fontSize: 12, color: '#666' },
  volatilityWarning: { marginTop: 12, padding: 10, backgroundColor: '#fff3e0', borderRadius: 8, fontSize: 12, color: '#e65100', lineHeight: 1.4 }
};
