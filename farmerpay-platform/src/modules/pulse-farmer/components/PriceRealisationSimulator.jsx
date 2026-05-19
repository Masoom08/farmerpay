// src/modules/pulse-farmer/components/PriceRealisationSimulator.jsx
import React, { useState, useEffect, useMemo } from 'react';

function formatRupees(amount) {
  if (amount == null || isNaN(amount)) return '—';
  const sign = amount < 0 ? '- ' : '';
  return sign + '₹' + Math.abs(Math.round(amount)).toLocaleString('en-IN');
}

function calculateScenario({
  quantity, currentPrice, predictedPrice, daysStored,
  storageCostPerQtlPerDay, loanOutstanding, interestRateAnnual,
  perishabilityFactor, transportCost, mandiCharges
}) {
  const effectiveQty = quantity * (1 - (perishabilityFactor * daysStored));
  const grossRealisation = predictedPrice * effectiveQty;
  const storageCost = storageCostPerQtlPerDay * quantity * daysStored;
  const interestAccrued = loanOutstanding * (interestRateAnnual / 100) * (daysStored / 365);
  const spoilageLoss = (quantity - effectiveQty) * predictedPrice;
  const netRealisation = grossRealisation - storageCost - interestAccrued - transportCost - mandiCharges;
  const surplusDeficit = netRealisation - loanOutstanding;
  const surplusDeficitPercent = loanOutstanding > 0 ? (surplusDeficit / loanOutstanding) * 100 : 0;

  return {
    effectiveQty: Math.round(effectiveQty * 100) / 100,
    grossRealisation: Math.round(grossRealisation),
    storageCost: Math.round(storageCost),
    interestAccrued: Math.round(interestAccrued),
    spoilageLoss: Math.round(spoilageLoss),
    transportCost: Math.round(transportCost),
    mandiCharges: Math.round(mandiCharges),
    netRealisation: Math.round(netRealisation),
    loanRepayment: Math.round(loanOutstanding),
    surplusDeficit: Math.round(surplusDeficit),
    surplusDeficitPercent: Math.round(surplusDeficitPercent)
  };
}

export default function PriceRealisationSimulator({
  farmerId, loan, commodity, mandi, todayPrice, forecasts, language
}) {
  const [quantity, setQuantity] = useState(10); // quintals
  const [transportCost, setTransportCost] = useState(500);
  const [storageCost, setStorageCost] = useState(3); // per quintal per day
  const [expandedScenario, setExpandedScenario] = useState(null);

  const loanOutstanding = (loan?.principalOutstanding || 0) + (loan?.interestOutstanding || 0);
  const interestRate = loan?.interestRate || 7;
  const perishFactor = (commodity?.storageFactor || 0.001); // daily loss rate
  const mandiCharges = todayPrice * quantity * 0.015; // ~1.5% mandi cess

  const scenarios = useMemo(() => {
    const base = {
      quantity, loanOutstanding, interestRateAnnual: interestRate,
      perishabilityFactor: perishFactor,
      transportCost, mandiCharges,
      storageCostPerQtlPerDay: storageCost
    };

    const sellNow = calculateScenario({
      ...base, currentPrice: todayPrice, predictedPrice: todayPrice, daysStored: 0
    });

    const store15 = calculateScenario({
      ...base, currentPrice: todayPrice,
      predictedPrice: forecasts?.day15?.predictedPrice || todayPrice,
      daysStored: 15
    });

    const store30 = calculateScenario({
      ...base, currentPrice: todayPrice,
      predictedPrice: forecasts?.day30?.predictedPrice || todayPrice,
      daysStored: 30
    });

    return { sellNow, store15, store30 };
  }, [quantity, todayPrice, loanOutstanding, interestRate, perishFactor, transportCost, storageCost, mandiCharges, forecasts]);

  // Determine optimal strategy
  const optimal = useMemo(() => {
    const nets = [
      { key: 'sellNow', net: scenarios.sellNow.netRealisation, confidence: 100 },
      { key: 'store15', net: scenarios.store15.netRealisation, confidence: forecasts?.day15?.confidence || 50 },
      { key: 'store30', net: scenarios.store30.netRealisation, confidence: forecasts?.day30?.confidence || 40 }
    ];
    // Weight by confidence: adjusted_net = net * (confidence/100)
    const weighted = nets.map(n => ({ ...n, weighted: n.net * (n.confidence / 100) }));
    weighted.sort((a, b) => b.weighted - a.weighted);
    return weighted[0];
  }, [scenarios, forecasts]);

  const scenarioCards = [
    {
      key: 'sellNow',
      titleEn: 'Sell NOW',
      titleHi: 'अभी बेचें',
      icon: '🏪',
      data: scenarios.sellNow,
      price: todayPrice,
      confidence: 100,
      days: 0,
      color: '#1565c0'
    },
    {
      key: 'store15',
      titleEn: 'Store 15 Days',
      titleHi: '15 दिन रखें',
      icon: '📦',
      data: scenarios.store15,
      price: forecasts?.day15?.predictedPrice,
      confidence: forecasts?.day15?.confidence,
      days: 15,
      color: '#e65100'
    },
    {
      key: 'store30',
      titleEn: 'Store 30 Days',
      titleHi: '30 दिन रखें',
      icon: '🏭',
      data: scenarios.store30,
      price: forecasts?.day30?.predictedPrice,
      confidence: forecasts?.day30?.confidence,
      days: 30,
      color: '#6a1b9a'
    }
  ];

  return (
    <div>
      {/* Loan Position Banner */}
      <div style={styles.loanBanner}>
        <div style={styles.loanBannerRow}>
          <span style={styles.loanLabel}>
            {language === 'hi' ? 'बकाया ऋण' : 'Loan Outstanding'}
          </span>
          <span style={styles.loanAmount}>{formatRupees(loanOutstanding)}</span>
        </div>
        <div style={styles.loanBannerRow}>
          <span style={styles.loanSubLabel}>
            {loan?.productName || 'Crop Loan'} | {interestRate}% p.a.
          </span>
          {loan?.nextEmiDate && (
            <span style={styles.loanSubLabel}>
              {language === 'hi' ? 'अगली EMI:' : 'Next EMI:'} {loan.nextEmiDate}
            </span>
          )}
        </div>
      </div>

      {/* Quantity Input */}
      <div style={styles.inputSection}>
        <label style={styles.inputLabel}>
          {language === 'hi' ? 'उपज मात्रा (क्विंटल)' : 'Produce Quantity (Quintals)'}
        </label>
        <input
          type="number"
          value={quantity}
          onChange={e => setQuantity(Math.max(1, Number(e.target.value)))}
          style={styles.input}
          min="1"
          step="0.5"
        />
      </div>

      {/* Scenario Cards */}
      {scenarioCards.map(sc => {
        const isOptimal = sc.key === optimal.key;
        const isExpanded = expandedScenario === sc.key;
        const surplus = sc.data.surplusDeficit;

        return (
          <div
            key={sc.key}
            style={{
              ...styles.scenarioCard,
              borderLeft: `4px solid ${sc.color}`,
              ...(isOptimal ? styles.optimalCard : {})
            }}
            onClick={() => setExpandedScenario(isExpanded ? null : sc.key)}
          >
            {isOptimal && (
              <div style={styles.optimalBadge}>
                ✅ {language === 'hi' ? 'सर्वश्रेष्ठ विकल्प' : 'RECOMMENDED'}
              </div>
            )}

            <div style={styles.scenarioHeader}>
              <span style={styles.scenarioIcon}>{sc.icon}</span>
              <div style={styles.scenarioTitleGroup}>
                <span style={styles.scenarioTitle}>
                  {language === 'hi' ? sc.titleHi : sc.titleEn}
                </span>
                <span style={styles.scenarioPrice}>
                  @ {formatRupees(sc.price)}/qtl
                  {sc.confidence < 100 && (
                    <span style={styles.confidenceSmall}> ({sc.confidence}% {language === 'hi' ? 'विश्वास' : 'confidence'})</span>
                  )}
                </span>
              </div>
              <div style={styles.scenarioNetGroup}>
                <span style={{
                  ...styles.scenarioNet,
                  color: surplus >= 0 ? '#2e7d32' : '#c62828'
                }}>
                  {formatRupees(surplus)}
                </span>
                <span style={{
                  ...styles.scenarioNetLabel,
                  color: surplus >= 0 ? '#4caf50' : '#e53935'
                }}>
                  {surplus >= 0
                    ? (language === 'hi' ? 'अधिशेष' : 'Surplus')
                    : (language === 'hi' ? 'घाटा' : 'Deficit')}
                </span>
              </div>
            </div>

            {/* Expanded Breakdown */}
            {isExpanded && (
              <div style={styles.breakdown}>
                <div style={styles.breakdownRow}>
                  <span>{language === 'hi' ? 'सकल प्राप्ति' : 'Gross Realisation'}</span>
                  <span style={styles.breakdownVal}>{formatRupees(sc.data.grossRealisation)}</span>
                </div>
                {sc.days > 0 && (
                  <>
                    <div style={styles.breakdownRow}>
                      <span>{language === 'hi' ? 'भंडारण लागत' : `Storage Cost (${sc.days} days)`}</span>
                      <span style={styles.breakdownValNeg}>- {formatRupees(sc.data.storageCost)}</span>
                    </div>
                    <div style={styles.breakdownRow}>
                      <span>{language === 'hi' ? 'ब्याज' : `Interest (${sc.days} days)`}</span>
                      <span style={styles.breakdownValNeg}>- {formatRupees(sc.data.interestAccrued)}</span>
                    </div>
                    <div style={styles.breakdownRow}>
                      <span>{language === 'hi' ? 'खराबी हानि' : 'Spoilage Loss'}</span>
                      <span style={styles.breakdownValNeg}>- {formatRupees(sc.data.spoilageLoss)}</span>
                    </div>
                  </>
                )}
                <div style={styles.breakdownRow}>
                  <span>{language === 'hi' ? 'परिवहन' : 'Transport'}</span>
                  <span style={styles.breakdownValNeg}>- {formatRupees(sc.data.transportCost)}</span>
                </div>
                <div style={styles.breakdownRow}>
                  <span>{language === 'hi' ? 'मंडी शुल्क' : 'Mandi Charges'}</span>
                  <span style={styles.breakdownValNeg}>- {formatRupees(sc.data.mandiCharges)}</span>
                </div>
                <div style={{ ...styles.breakdownRow, ...styles.breakdownTotal }}>
                  <span style={styles.breakdownTotalLabel}>
                    {language === 'hi' ? 'शुद्ध प्राप्ति' : 'Net Realisation'}
                  </span>
                  <span style={styles.breakdownTotalVal}>{formatRupees(sc.data.netRealisation)}</span>
                </div>
                <div style={{ ...styles.breakdownRow, ...styles.breakdownLoan }}>
                  <span>{language === 'hi' ? 'ऋण चुकौती' : 'Loan Repayment'}</span>
                  <span style={styles.breakdownValNeg}>- {formatRupees(sc.data.loanRepayment)}</span>
                </div>
                <div style={{
                  ...styles.breakdownRow, ...styles.breakdownFinal,
                  backgroundColor: surplus >= 0 ? '#e8f5e9' : '#fbe9e7'
                }}>
                  <span style={styles.breakdownFinalLabel}>
                    {surplus >= 0
                      ? (language === 'hi' ? 'आपकी जेब में' : 'In Your Pocket')
                      : (language === 'hi' ? 'कम पड़ेगा' : 'Shortfall')}
                  </span>
                  <span style={{
                    ...styles.breakdownFinalVal,
                    color: surplus >= 0 ? '#2e7d32' : '#c62828'
                  }}>
                    {formatRupees(surplus)} ({sc.data.surplusDeficitPercent}%)
                  </span>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Comparison Summary */}
      <div style={styles.comparisonSummary}>
        <h4 style={styles.comparisonTitle}>
          {language === 'hi' ? '📊 तुलना सारांश' : '📊 Quick Comparison'}
        </h4>
        <table style={styles.compTable}>
          <thead>
            <tr>
              <th style={styles.compTh}></th>
              <th style={styles.compTh}>{language === 'hi' ? 'अभी' : 'Now'}</th>
              <th style={styles.compTh}>15 {language === 'hi' ? 'दिन' : 'Days'}</th>
              <th style={styles.compTh}>30 {language === 'hi' ? 'दिन' : 'Days'}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={styles.compTd}>{language === 'hi' ? 'भाव' : 'Price'}</td>
              <td style={styles.compTdVal}>{formatRupees(todayPrice)}</td>
              <td style={styles.compTdVal}>{formatRupees(forecasts?.day15?.predictedPrice)}</td>
              <td style={styles.compTdVal}>{formatRupees(forecasts?.day30?.predictedPrice)}</td>
            </tr>
            <tr>
              <td style={styles.compTd}>{language === 'hi' ? 'खर्चे' : 'Costs'}</td>
              <td style={styles.compTdVal}>{formatRupees(scenarios.sellNow.transportCost + scenarios.sellNow.mandiCharges)}</td>
              <td style={styles.compTdVal}>{formatRupees(scenarios.store15.storageCost + scenarios.store15.interestAccrued + scenarios.store15.spoilageLoss + scenarios.store15.transportCost + scenarios.store15.mandiCharges)}</td>
              <td style={styles.compTdVal}>{formatRupees(scenarios.store30.storageCost + scenarios.store30.interestAccrued + scenarios.store30.spoilageLoss + scenarios.store30.transportCost + scenarios.store30.mandiCharges)}</td>
            </tr>
            <tr style={{ fontWeight: 700 }}>
              <td style={styles.compTd}>{language === 'hi' ? 'हाथ में' : 'Net'}</td>
              <td style={{ ...styles.compTdVal, color: scenarios.sellNow.surplusDeficit >= 0 ? '#2e7d32' : '#c62828' }}>{formatRupees(scenarios.sellNow.surplusDeficit)}</td>
              <td style={{ ...styles.compTdVal, color: scenarios.store15.surplusDeficit >= 0 ? '#2e7d32' : '#c62828' }}>{formatRupees(scenarios.store15.surplusDeficit)}</td>
              <td style={{ ...styles.compTdVal, color: scenarios.store30.surplusDeficit >= 0 ? '#2e7d32' : '#c62828' }}>{formatRupees(scenarios.store30.surplusDeficit)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* DICE Top-Up CTA — show if storing is better than selling */}
      {(scenarios.store15.netRealisation > scenarios.sellNow.netRealisation ||
        scenarios.store30.netRealisation > scenarios.sellNow.netRealisation) && (
        <div style={styles.topupCta}>
          <div style={styles.topupCtaIcon}>💡</div>
          <div>
            <p style={styles.topupCtaTitle}>
              {language === 'hi' ? 'रखें और ज़्यादा कमाएं!' : 'Store & Earn More!'}
            </p>
            <p style={styles.topupCtaText}>
              {language === 'hi'
                ? `रखने पर ${formatRupees(Math.max(scenarios.store15.surplusDeficit, scenarios.store30.surplusDeficit) - scenarios.sellNow.surplusDeficit)} अधिक मिलेगा। फसल गिरवी रख कर टॉप-अप लोन लें ताकि बेहतर भाव तक इंतज़ार कर सकें।`
                : `Storing could earn you ${formatRupees(Math.max(scenarios.store15.surplusDeficit, scenarios.store30.surplusDeficit) - scenarios.sellNow.surplusDeficit)} more. Get a top-up loan against your produce to wait for better prices.`}
            </p>
            <button
              style={styles.topupCtaButton}
              onClick={() => {/* navigate to topup tab */}}
            >
              {language === 'hi' ? 'टॉप-अप लोन देखें →' : 'View Top-Up Loan →'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  loanBanner: { backgroundColor: '#1565c0', borderRadius: 12, padding: 16, marginBottom: 16, color: '#fff' },
  loanBannerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  loanLabel: { fontSize: 13, opacity: 0.9 },
  loanAmount: { fontSize: 24, fontWeight: 800 },
  loanSubLabel: { fontSize: 11, opacity: 0.7, marginTop: 4 },
  inputSection: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  inputLabel: { fontSize: 13, color: '#666', display: 'block', marginBottom: 8 },
  input: { width: '100%', padding: '10px 12px', border: '2px solid #e0e0e0', borderRadius: 8, fontSize: 16, fontWeight: 600, boxSizing: 'border-box' },
  scenarioCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', cursor: 'pointer', transition: 'all 0.2s' },
  optimalCard: { boxShadow: '0 4px 16px rgba(46, 125, 50, 0.2)', border: '1px solid #c8e6c9' },
  optimalBadge: { fontSize: 11, fontWeight: 700, color: '#2e7d32', backgroundColor: '#e8f5e9', display: 'inline-block', padding: '2px 10px', borderRadius: 12, marginBottom: 8 },
  scenarioHeader: { display: 'flex', alignItems: 'center', gap: 12 },
  scenarioIcon: { fontSize: 28 },
  scenarioTitleGroup: { flex: 1 },
  scenarioTitle: { display: 'block', fontSize: 15, fontWeight: 700, color: '#333' },
  scenarioPrice: { display: 'block', fontSize: 12, color: '#666' },
  confidenceSmall: { fontSize: 10, color: '#999' },
  scenarioNetGroup: { textAlign: 'right' },
  scenarioNet: { display: 'block', fontSize: 18, fontWeight: 800 },
  scenarioNetLabel: { fontSize: 11, fontWeight: 600 },
  breakdown: { marginTop: 12, paddingTop: 12, borderTop: '1px solid #f0f0f0' },
  breakdownRow: { display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13, color: '#555' },
  breakdownVal: { fontWeight: 600, color: '#333' },
  breakdownValNeg: { fontWeight: 600, color: '#e53935' },
  breakdownTotal: { borderTop: '1px dashed #ccc', paddingTop: 8, marginTop: 4 },
  breakdownTotalLabel: { fontWeight: 700, color: '#333' },
  breakdownTotalVal: { fontWeight: 800, color: '#1b5e20', fontSize: 15 },
  breakdownLoan: { marginTop: 4 },
  breakdownFinal: { marginTop: 8, padding: '10px 12px', borderRadius: 8 },
  breakdownFinalLabel: { fontWeight: 700, fontSize: 14 },
  breakdownFinalVal: { fontWeight: 800, fontSize: 16 },
  comparisonSummary: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  comparisonTitle: { fontSize: 14, fontWeight: 600, margin: '0 0 12px 0' },
  compTable: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  compTh: { textAlign: 'center', padding: '6px 4px', borderBottom: '2px solid #e0e0e0', fontSize: 12, color: '#666' },
  compTd: { padding: '8px 4px', borderBottom: '1px solid #f0f0f0', color: '#333' },
  compTdVal: { textAlign: 'center', padding: '8px 4px', borderBottom: '1px solid #f0f0f0', fontWeight: 600 },
  topupCta: { display: 'flex', gap: 12, padding: 16, backgroundColor: '#e8f5e9', borderRadius: 12, marginBottom: 16, border: '1px solid #a5d6a7' },
  topupCtaIcon: { fontSize: 32 },
  topupCtaTitle: { fontSize: 15, fontWeight: 700, color: '#1b5e20', margin: '0 0 4px 0' },
  topupCtaText: { fontSize: 13, color: '#333', margin: '0 0 8px 0', lineHeight: 1.4 },
  topupCtaButton: { padding: '8px 20px', backgroundColor: '#2e7d32', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }
};
