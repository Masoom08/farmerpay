// src/modules/pulse-farmer/components/TopupLoanCard.jsx
import React, { useState, useEffect, useCallback } from 'react';
import WarehouseSelector from './WarehouseSelector';
import TopupLoanApplication from './TopupLoanApplication';

const API_BASE = '/api/v1';

function formatRupees(amount) {
  if (amount == null || isNaN(amount)) return '—';
  return '₹' + Math.abs(Math.round(amount)).toLocaleString('en-IN');
}

export default function TopupLoanCard({ farmerId, loan, commodity, forecasts, todayPrice, language }) {
  const [step, setStep] = useState('info'); // info | warehouse | apply | success
  const [eligibility, setEligibility] = useState(null);
  const [selectedWarehouse, setSelectedWarehouse] = useState(null);
  const [quantity, setQuantity] = useState(10);
  const [grade, setGrade] = useState('B');
  const [loading, setLoading] = useState(false);
  const [topupResult, setTopupResult] = useState(null);

  // Calculate eligibility client-side
  useEffect(() => {
    if (!todayPrice || !commodity) return;
    const produceValue = todayPrice * quantity;
    const maxLTV = 0.70;
    const maxLoan = produceValue * maxLTV;
    const baseRate = loan?.interestRate || 7;
    const subventionRate = 3; // GoI interest subvention for KCC
    const effectiveRate = Math.max(baseRate - subventionRate, 4);

    // Check if storing is likely profitable
    const price30d = forecasts?.day30?.predictedPrice || todayPrice;
    const priceGainPercent = ((price30d - todayPrice) / todayPrice) * 100;
    const eligible = priceGainPercent > 2 && loan && commodity?.shelfLifeDays > 30;

    setEligibility({
      eligible,
      produceValue: Math.round(produceValue),
      maxLoanAmount: Math.round(maxLoan),
      ltvRatio: maxLTV,
      interestRate: baseRate,
      subventionApplicable: true,
      effectiveRate,
      priceGainPercent: Math.round(priceGainPercent),
      expectedGain: Math.round((price30d - todayPrice) * quantity),
      shelfLifeDays: commodity?.shelfLifeDays || 90,
      perishabilityIndex: commodity?.perishabilityIndex || 3
    });
  }, [todayPrice, quantity, commodity, forecasts, loan]);

  const handleApply = useCallback(async (applicationData) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_BASE}/dice/postharvest-topup/apply`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          parentLoanApplicationId: loan.applicationId,
          commodityId: commodity.commodityId,
          produceQuantityQuintals: quantity,
          produceGrade: grade,
          warehouseId: selectedWarehouse.warehouseId,
          warehouseReceiptNumber: applicationData.warehouseReceiptNumber,
          requestedLoanAmount: applicationData.requestedAmount,
          requestedTenureDays: applicationData.tenure
        })
      });
      const result = await res.json();
      if (result.success) {
        setTopupResult(result.data);
        setStep('success');
      }
    } catch (err) {
      console.error('Top-up application failed:', err);
    } finally {
      setLoading(false);
    }
  }, [loan, commodity, quantity, grade, selectedWarehouse]);

  if (!loan) {
    return (
      <div style={styles.card}>
        <p style={styles.noLoanText}>
          {language === 'hi'
            ? 'टॉप-अप लोन के लिए सक्रिय फसल ऋण आवश्यक है।'
            : 'An active crop loan is required for post-harvest top-up.'}
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Step: Info — Eligibility Display */}
      {step === 'info' && (
        <div>
          {/* What is a Post-Harvest Top-Up */}
          <div style={styles.infoCard}>
            <h3 style={styles.infoTitle}>
              {language === 'hi' ? '🏦 फसल गिरवी टॉप-अप लोन' : '🏦 Post-Harvest Top-Up Loan'}
            </h3>
            <p style={styles.infoText}>
              {language === 'hi'
                ? 'अपनी उपज को गोदाम में रखें, उसके बदले तुरंत लोन पाएं, और बेहतर भाव मिलने पर बेचें। मजबूरी में सस्ते भाव पर बेचने की ज़रूरत नहीं!'
                : 'Store your produce in a registered warehouse, get instant loan against it, and sell when prices are better. No need for distress selling at low prices!'}
            </p>
            <div style={styles.benefitsList}>
              {[
                { en: 'Up to 70% of produce value as loan', hi: 'उपज मूल्य का 70% तक लोन' },
                { en: 'Interest subvention under KCC norms', hi: 'KCC नियमों के तहत ब्याज छूट' },
                { en: 'Auto-repay when you sell', hi: 'बेचने पर स्वतः चुकौती' },
                { en: 'eNWR-backed — safe & transparent', hi: 'eNWR समर्थित — सुरक्षित और पारदर्शी' }
              ].map((b, i) => (
                <div key={i} style={styles.benefitRow}>
                  <span style={styles.checkIcon}>✓</span>
                  <span style={styles.benefitText}>{language === 'hi' ? b.hi : b.en}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Eligibility Calculator */}
          {eligibility && (
            <div style={styles.eligibilityCard}>
              <h4 style={styles.eligibilityTitle}>
                {language === 'hi' ? '📋 पात्रता जांच' : '📋 Eligibility Check'}
              </h4>

              <div style={styles.inputRow}>
                <label style={styles.inputLabel}>
                  {language === 'hi' ? 'मात्रा (क्विंटल)' : 'Quantity (Quintals)'}
                </label>
                <input
                  type="number"
                  value={quantity}
                  onChange={e => setQuantity(Math.max(1, Number(e.target.value)))}
                  style={styles.input}
                  min="1"
                />
              </div>

              <div style={styles.inputRow}>
                <label style={styles.inputLabel}>
                  {language === 'hi' ? 'ग्रेड' : 'Grade'}
                </label>
                <div style={styles.gradeButtons}>
                  {['A', 'B', 'C'].map(g => (
                    <button
                      key={g}
                      style={{
                        ...styles.gradeBtn,
                        ...(grade === g ? styles.gradeBtnActive : {})
                      }}
                      onClick={() => setGrade(g)}
                    >
                      Grade {g}
                    </button>
                  ))}
                </div>
              </div>

              {/* Eligibility Results */}
              <div style={styles.eligibilityResults}>
                <div style={styles.eligRow}>
                  <span>{language === 'hi' ? 'उपज मूल्य' : 'Produce Value'}</span>
                  <span style={styles.eligVal}>{formatRupees(eligibility.produceValue)}</span>
                </div>
                <div style={styles.eligRow}>
                  <span>{language === 'hi' ? 'अधिकतम लोन' : 'Max Loan (70% LTV)'}</span>
                  <span style={{ ...styles.eligVal, fontSize: 18, color: '#1b5e20' }}>
                    {formatRupees(eligibility.maxLoanAmount)}
                  </span>
                </div>
                <div style={styles.eligRow}>
                  <span>{language === 'hi' ? 'ब्याज दर' : 'Interest Rate'}</span>
                  <span style={styles.eligVal}>
                    {eligibility.effectiveRate}% p.a.
                    {eligibility.subventionApplicable && (
                      <span style={styles.subventionBadge}>
                        {language === 'hi' ? 'छूट' : 'Subvention'}
                      </span>
                    )}
                  </span>
                </div>
                <div style={styles.eligRow}>
                  <span>{language === 'hi' ? '30 दिन में अपेक्षित लाभ' : 'Expected Gain (30 days)'}</span>
                  <span style={{ ...styles.eligVal, color: eligibility.priceGainPercent > 0 ? '#2e7d32' : '#c62828' }}>
                    {eligibility.priceGainPercent > 0 ? '+' : ''}{eligibility.priceGainPercent}% ({formatRupees(eligibility.expectedGain)})
                  </span>
                </div>
                <div style={styles.eligRow}>
                  <span>{language === 'hi' ? 'शेल्फ लाइफ' : 'Shelf Life'}</span>
                  <span style={styles.eligVal}>{eligibility.shelfLifeDays} {language === 'hi' ? 'दिन' : 'days'}</span>
                </div>
              </div>

              {/* Status Badge */}
              <div style={{
                ...styles.statusBadge,
                backgroundColor: eligibility.eligible ? '#e8f5e9' : '#fff3e0',
                color: eligibility.eligible ? '#2e7d32' : '#e65100'
              }}>
                {eligibility.eligible
                  ? (language === 'hi' ? '✅ आप पात्र हैं! टॉप-अप लोन के लिए आवेदन करें।' : '✅ You are eligible! Apply for a top-up loan.')
                  : (language === 'hi' ? '⚠️ अभी पात्र नहीं। कीमतें स्थिर होने पर पुनः जांचें।' : '⚠️ Not eligible now. Check again when price outlook improves.')}
              </div>

              {eligibility.eligible && (
                <button
                  style={styles.applyButton}
                  onClick={() => setStep('warehouse')}
                >
                  {language === 'hi' ? 'गोदाम चुनें →' : 'Select Warehouse →'}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Step: Warehouse Selection */}
      {step === 'warehouse' && (
        <WarehouseSelector
          farmerId={farmerId}
          commodity={commodity}
          language={language}
          onSelect={(wh) => {
            setSelectedWarehouse(wh);
            setStep('apply');
          }}
          onBack={() => setStep('info')}
        />
      )}

      {/* Step: Application Form */}
      {step === 'apply' && (
        <TopupLoanApplication
          eligibility={eligibility}
          warehouse={selectedWarehouse}
          commodity={commodity}
          quantity={quantity}
          grade={grade}
          language={language}
          loading={loading}
          onSubmit={handleApply}
          onBack={() => setStep('warehouse')}
        />
      )}

      {/* Step: Success */}
      {step === 'success' && topupResult && (
        <div style={styles.successCard}>
          <div style={styles.successIcon}>🎉</div>
          <h3 style={styles.successTitle}>
            {language === 'hi' ? 'आवेदन सफल!' : 'Application Submitted!'}
          </h3>
          <p style={styles.successText}>
            {language === 'hi'
              ? `आपका टॉप-अप लोन आवेदन ${formatRupees(topupResult.maxEligible)} के लिए जमा हो गया है। बैंक अधिकारी 24 घंटे में संपर्क करेंगे।`
              : `Your top-up loan application for ${formatRupees(topupResult.maxEligible)} has been submitted. A bank officer will contact you within 24 hours.`}
          </p>
          <div style={styles.successDetails}>
            <div style={styles.eligRow}>
              <span>{language === 'hi' ? 'आवेदन ID' : 'Application ID'}</span>
              <span style={styles.eligVal}>{topupResult.topupUuid?.slice(0, 8).toUpperCase()}</span>
            </div>
            <div style={styles.eligRow}>
              <span>{language === 'hi' ? 'स्थिति' : 'Status'}</span>
              <span style={{ ...styles.eligVal, color: '#ff9800' }}>
                {language === 'hi' ? 'समीक्षाधीन' : 'Under Review'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16 },
  noLoanText: { color: '#e65100', fontSize: 14, textAlign: 'center' },
  infoCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  infoTitle: { fontSize: 16, fontWeight: 700, color: '#1b5e20', margin: '0 0 8px 0' },
  infoText: { fontSize: 13, color: '#555', lineHeight: 1.5, margin: '0 0 12px 0' },
  benefitsList: { display: 'flex', flexDirection: 'column', gap: 6 },
  benefitRow: { display: 'flex', alignItems: 'center', gap: 8 },
  checkIcon: { width: 20, height: 20, borderRadius: '50%', backgroundColor: '#e8f5e9', color: '#2e7d32', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 },
  benefitText: { fontSize: 13, color: '#333' },
  eligibilityCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  eligibilityTitle: { fontSize: 15, fontWeight: 700, color: '#333', margin: '0 0 12px 0' },
  inputRow: { marginBottom: 12 },
  inputLabel: { fontSize: 12, color: '#666', display: 'block', marginBottom: 6 },
  input: { width: '100%', padding: '10px 12px', border: '2px solid #e0e0e0', borderRadius: 8, fontSize: 16, fontWeight: 600, boxSizing: 'border-box' },
  gradeButtons: { display: 'flex', gap: 8 },
  gradeBtn: { flex: 1, padding: '8px 0', border: '2px solid #e0e0e0', borderRadius: 8, backgroundColor: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#666' },
  gradeBtnActive: { borderColor: '#2e7d32', backgroundColor: '#e8f5e9', color: '#2e7d32' },
  eligibilityResults: { marginTop: 16, padding: 12, backgroundColor: '#fafafa', borderRadius: 8 },
  eligRow: { display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13, color: '#555' },
  eligVal: { fontWeight: 700, color: '#333' },
  subventionBadge: { fontSize: 10, backgroundColor: '#e8f5e9', color: '#2e7d32', padding: '1px 6px', borderRadius: 8, marginLeft: 6 },
  statusBadge: { marginTop: 12, padding: 12, borderRadius: 8, fontSize: 13, fontWeight: 600, textAlign: 'center' },
  applyButton: { width: '100%', marginTop: 12, padding: '14px 0', backgroundColor: '#2e7d32', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 15, fontWeight: 700 },
  successCard: { backgroundColor: '#fff', borderRadius: 12, padding: 24, textAlign: 'center', boxShadow: '0 4px 16px rgba(46, 125, 50, 0.15)' },
  successIcon: { fontSize: 48, marginBottom: 8 },
  successTitle: { fontSize: 18, fontWeight: 700, color: '#1b5e20', margin: '0 0 8px 0' },
  successText: { fontSize: 13, color: '#555', lineHeight: 1.5, marginBottom: 16 },
  successDetails: { padding: 12, backgroundColor: '#f5f5f5', borderRadius: 8, textAlign: 'left' }
};
