// src/modules/pulse-farmer/components/TopupLoanApplication.jsx
import React, { useState } from 'react';

function formatRupees(amount) {
  if (amount == null) return '—';
  return '₹' + Math.abs(Math.round(amount)).toLocaleString('en-IN');
}

export default function TopupLoanApplication({
  eligibility, warehouse, commodity, quantity, grade, language, loading, onSubmit, onBack
}) {
  const [requestedAmount, setRequestedAmount] = useState(eligibility?.maxLoanAmount || 0);
  const [tenure, setTenure] = useState(90);
  const [warehouseReceiptNumber, setWarehouseReceiptNumber] = useState('');
  const [consent, setConsent] = useState(false);

  const monthlyInterest = Math.round(requestedAmount * (eligibility?.effectiveRate / 100) / 12);
  const totalRepayable = Math.round(requestedAmount + (requestedAmount * (eligibility?.effectiveRate / 100) * (tenure / 365)));

  const handleSubmit = () => {
    if (!consent || !warehouseReceiptNumber) return;
    onSubmit({ requestedAmount, tenure, warehouseReceiptNumber });
  };

  return (
    <div>
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={onBack}>← {language === 'hi' ? 'वापस' : 'Back'}</button>
        <h3 style={styles.title}>{language === 'hi' ? '📝 लोन आवेदन' : '📝 Loan Application'}</h3>
      </div>

      <div style={styles.card}>
        {/* Summary */}
        <div style={styles.summarySection}>
          <div style={styles.summaryRow}>
            <span>{language === 'hi' ? 'फसल' : 'Crop'}</span>
            <span style={styles.summaryVal}>{commodity?.commodityName} (Grade {grade})</span>
          </div>
          <div style={styles.summaryRow}>
            <span>{language === 'hi' ? 'मात्रा' : 'Quantity'}</span>
            <span style={styles.summaryVal}>{quantity} {language === 'hi' ? 'क्विंटल' : 'Quintals'}</span>
          </div>
          <div style={styles.summaryRow}>
            <span>{language === 'hi' ? 'गोदाम' : 'Warehouse'}</span>
            <span style={styles.summaryVal}>{warehouse?.name}</span>
          </div>
          <div style={styles.summaryRow}>
            <span>{language === 'hi' ? 'भंडारण दर' : 'Storage Rate'}</span>
            <span style={styles.summaryVal}>{formatRupees(warehouse?.storageRate)}/{language === 'hi' ? 'क्विंटल/दिन' : 'qtl/day'}</span>
          </div>
        </div>

        {/* Loan Amount Slider */}
        <div style={styles.fieldGroup}>
          <label style={styles.label}>
            {language === 'hi' ? 'लोन राशि' : 'Loan Amount'}: <strong>{formatRupees(requestedAmount)}</strong>
          </label>
          <input
            type="range"
            min={10000}
            max={eligibility?.maxLoanAmount || 100000}
            step={1000}
            value={requestedAmount}
            onChange={e => setRequestedAmount(Number(e.target.value))}
            style={styles.slider}
          />
          <div style={styles.sliderLabels}>
            <span>{formatRupees(10000)}</span>
            <span>{formatRupees(eligibility?.maxLoanAmount)}</span>
          </div>
        </div>

        {/* Tenure Selection */}
        <div style={styles.fieldGroup}>
          <label style={styles.label}>{language === 'hi' ? 'अवधि' : 'Tenure'}</label>
          <div style={styles.tenureButtons}>
            {[30, 60, 90, 120, 180].map(t => (
              <button
                key={t}
                style={{
                  ...styles.tenureBtn,
                  ...(tenure === t ? styles.tenureBtnActive : {})
                }}
                onClick={() => setTenure(t)}
              >
                {t} {language === 'hi' ? 'दिन' : 'days'}
              </button>
            ))}
          </div>
        </div>

        {/* Warehouse Receipt */}
        <div style={styles.fieldGroup}>
          <label style={styles.label}>
            {language === 'hi' ? 'गोदाम रसीद नंबर (eNWR)' : 'Warehouse Receipt No. (eNWR)'}
          </label>
          <input
            type="text"
            value={warehouseReceiptNumber}
            onChange={e => setWarehouseReceiptNumber(e.target.value)}
            placeholder="eNWR-2026-XXXXXXXX"
            style={styles.textInput}
          />
        </div>

        {/* Loan Summary */}
        <div style={styles.loanSummary}>
          <div style={styles.summaryRow}>
            <span>{language === 'hi' ? 'ब्याज दर (प्रभावी)' : 'Interest Rate (Effective)'}</span>
            <span style={styles.summaryVal}>{eligibility?.effectiveRate}% p.a.</span>
          </div>
          <div style={styles.summaryRow}>
            <span>{language === 'hi' ? 'मासिक ब्याज (अनुमानित)' : 'Monthly Interest (Est.)'}</span>
            <span style={styles.summaryVal}>{formatRupees(monthlyInterest)}</span>
          </div>
          <div style={{ ...styles.summaryRow, fontWeight: 700 }}>
            <span>{language === 'hi' ? 'कुल चुकौती' : 'Total Repayable'}</span>
            <span style={{ ...styles.summaryVal, color: '#1b5e20', fontSize: 16 }}>{formatRupees(totalRepayable)}</span>
          </div>
        </div>

        {/* Consent */}
        <label style={styles.consentLabel}>
          <input
            type="checkbox"
            checked={consent}
            onChange={e => setConsent(e.target.checked)}
          />
          <span style={styles.consentText}>
            {language === 'hi'
              ? 'मैं सहमत हूं कि मेरी उपज गिरवी रखी जाएगी और बिक्री पर स्वचालित रूप से लोन चुकता होगा।'
              : 'I agree that my produce will be hypothecated and the loan will auto-repay upon sale.'}
          </span>
        </label>

        {/* Submit */}
        <button
          style={{
            ...styles.submitBtn,
            opacity: (!consent || !warehouseReceiptNumber || loading) ? 0.5 : 1
          }}
          disabled={!consent || !warehouseReceiptNumber || loading}
          onClick={handleSubmit}
        >
          {loading
            ? (language === 'hi' ? 'प्रसंस्करण...' : 'Processing...')
            : (language === 'hi' ? 'आवेदन जमा करें' : 'Submit Application')}
        </button>
      </div>
    </div>
  );
}

const styles = {
  header: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 },
  backBtn: { padding: '6px 12px', border: '1px solid #ccc', borderRadius: 8, backgroundColor: '#fff', fontSize: 13, cursor: 'pointer', color: '#333' },
  title: { fontSize: 16, fontWeight: 700, color: '#333', margin: 0 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  summarySection: { padding: 12, backgroundColor: '#f5f5f5', borderRadius: 8, marginBottom: 16 },
  summaryRow: { display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13, color: '#555' },
  summaryVal: { fontWeight: 600, color: '#333' },
  fieldGroup: { marginBottom: 16 },
  label: { display: 'block', fontSize: 13, color: '#666', marginBottom: 8 },
  slider: { width: '100%', accentColor: '#2e7d32' },
  sliderLabels: { display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#999', marginTop: 4 },
  tenureButtons: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  tenureBtn: { padding: '8px 14px', border: '2px solid #e0e0e0', borderRadius: 8, backgroundColor: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#666' },
  tenureBtnActive: { borderColor: '#2e7d32', backgroundColor: '#e8f5e9', color: '#2e7d32' },
  textInput: { width: '100%', padding: '10px 12px', border: '2px solid #e0e0e0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' },
  loanSummary: { padding: 12, backgroundColor: '#e8f5e9', borderRadius: 8, marginBottom: 16 },
  consentLabel: { display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 16, cursor: 'pointer' },
  consentText: { fontSize: 12, color: '#555', lineHeight: 1.4 },
  submitBtn: { width: '100%', padding: '14px 0', backgroundColor: '#1b5e20', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 15, fontWeight: 700, transition: 'opacity 0.2s' }
};
