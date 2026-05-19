// src/modules/pulse-farmer/components/AlertSetup.jsx
import React, { useState } from 'react';

const API_BASE = '/api/v1';

function formatRupees(amount) {
  if (amount == null || isNaN(amount)) return '—';
  return '₹' + Math.abs(Math.round(amount)).toLocaleString('en-IN');
}

export default function AlertSetup({ farmerId, commodityId, currentPrice, language }) {
  const [targetPrice, setTargetPrice] = useState(currentPrice ? Math.round(currentPrice * 1.1) : 0);
  const [alertType, setAlertType] = useState('price_reached');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    if (!targetPrice || !commodityId) return;
    try {
      setSubmitting(true);
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_BASE}/pulse/farmer-price-alert`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ commodityId, targetPrice, alertType })
      });
      const data = await res.json();
      if (data.success) setSuccess(true);
    } catch (err) {
      console.error('Failed to set alert:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div style={styles.card}>
        <div style={styles.successBanner}>
          <span style={styles.successIcon}>🔔</span>
          <span style={styles.successText}>
            {language === 'hi' ? 'अलर्ट सफलतापूर्वक सेट हो गया!' : 'Alert set successfully!'}
          </span>
        </div>
      </div>
    );
  }

  const alertTypes = [
    { key: 'price_reached', labelEn: 'Reaches target', labelHi: 'लक्ष्य तक पहुंचे' },
    { key: 'price_exceeded', labelEn: 'Exceeds target', labelHi: 'लक्ष्य से ऊपर जाए' },
    { key: 'price_below', labelEn: 'Falls below target', labelHi: 'लक्ष्य से नीचे गिरे' }
  ];

  return (
    <div style={styles.card}>
      <h3 style={styles.title}>
        🔔 {language === 'hi' ? 'भाव अलर्ट' : 'Price Alert'}
      </h3>

      <div style={styles.currentPriceRow}>
        <span style={styles.currentLabel}>
          {language === 'hi' ? 'वर्तमान भाव' : 'Current Price'}
        </span>
        <span style={styles.currentValue}>{formatRupees(currentPrice)}</span>
      </div>

      <div style={styles.fieldGroup}>
        <label style={styles.label}>
          {language === 'hi' ? 'लक्ष्य भाव' : 'Target Price'} (₹/{language === 'hi' ? 'क्विंटल' : 'quintal'})
        </label>
        <input
          type="number"
          value={targetPrice}
          onChange={e => setTargetPrice(Math.max(0, Number(e.target.value)))}
          style={styles.input}
          min="0"
          step="100"
        />
      </div>

      <div style={styles.fieldGroup}>
        <label style={styles.label}>
          {language === 'hi' ? 'अलर्ट जब भाव' : 'Alert when price'}
        </label>
        <div style={styles.typeButtons}>
          {alertTypes.map(at => (
            <button
              key={at.key}
              style={{
                ...styles.typeBtn,
                ...(alertType === at.key ? styles.typeBtnActive : {})
              }}
              onClick={() => setAlertType(at.key)}
            >
              {language === 'hi' ? at.labelHi : at.labelEn}
            </button>
          ))}
        </div>
      </div>

      <button
        style={{ ...styles.submitBtn, opacity: submitting ? 0.5 : 1 }}
        disabled={submitting}
        onClick={handleSubmit}
      >
        {submitting
          ? (language === 'hi' ? 'सेट हो रहा...' : 'Setting...')
          : (language === 'hi' ? 'अलर्ट सेट करें' : 'Set Alert')}
      </button>
    </div>
  );
}

const styles = {
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  title: { fontSize: 15, fontWeight: 700, color: '#333', margin: '0 0 12px 0' },
  currentPriceRow: { display: 'flex', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: '#f5f5f5', borderRadius: 8, marginBottom: 12 },
  currentLabel: { fontSize: 13, color: '#666' },
  currentValue: { fontSize: 15, fontWeight: 700, color: '#1b5e20' },
  fieldGroup: { marginBottom: 12 },
  label: { display: 'block', fontSize: 12, color: '#666', marginBottom: 6 },
  input: { width: '100%', padding: '10px 12px', border: '2px solid #e0e0e0', borderRadius: 8, fontSize: 16, fontWeight: 600, boxSizing: 'border-box' },
  typeButtons: { display: 'flex', gap: 6 },
  typeBtn: { flex: 1, padding: '8px 6px', border: '2px solid #e0e0e0', borderRadius: 8, backgroundColor: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer', color: '#666', textAlign: 'center' },
  typeBtnActive: { borderColor: '#2e7d32', backgroundColor: '#e8f5e9', color: '#2e7d32' },
  submitBtn: { width: '100%', marginTop: 4, padding: '12px 0', backgroundColor: '#2e7d32', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600 },
  successBanner: { display: 'flex', alignItems: 'center', gap: 10, padding: 12, backgroundColor: '#e8f5e9', borderRadius: 8 },
  successIcon: { fontSize: 24 },
  successText: { fontSize: 14, fontWeight: 600, color: '#2e7d32' }
};
