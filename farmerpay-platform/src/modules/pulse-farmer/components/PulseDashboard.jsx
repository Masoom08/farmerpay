// src/modules/pulse-farmer/components/PulseDashboard.jsx
import React, { useState, useEffect, useCallback } from 'react';
import PriceCard from './PriceCard';
import PriceTrendChart from './PriceTrendChart';
import MandiComparison from './MandiComparison';
import PriceRealisationSimulator from './PriceRealisationSimulator';
import TopupLoanCard from './TopupLoanCard';
import AlertSetup from './AlertSetup';
import SellRecommendation from './SellRecommendation';

const API_BASE = '/api/v1';

export default function PulseDashboard({ farmerId, activeCycleId, language = 'en' }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [selectedCommodity, setSelectedCommodity] = useState(null);
  const [selectedMandi, setSelectedMandi] = useState(null);
  const [activeTab, setActiveTab] = useState('prices'); // prices | realisation | topup

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'X-Language': language,
        'Content-Type': 'application/json'
      };

      // Parallel fetch: farmer's crops, nearby mandis, active loans, sell recommendations
      const [cropsRes, mandisRes, loansRes, recommendationsRes] = await Promise.all([
        fetch(`${API_BASE}/roots/cycles/${activeCycleId}/summary`, { headers }).catch(() => ({ ok: false })),
        fetch(`${API_BASE}/pulse/mandis?farmerId=${farmerId}`, { headers }),
        fetch(`${API_BASE}/dice/applications?status=active`, { headers }),
        fetch(`${API_BASE}/pulse/sell-recommendations/${farmerId}?cycleId=${activeCycleId}`, { headers })
      ]);

      const [crops, mandis, loans, recommendations] = await Promise.all([
        cropsRes.ok ? cropsRes.json() : { data: null },
        mandisRes.json(),
        loansRes.json(),
        recommendationsRes.json()
      ]);

      const primaryCommodity = crops.data?.commodity || null;
      const nearestMandi = mandis.data?.[0] || null;

      setSelectedCommodity(primaryCommodity);
      setSelectedMandi(nearestMandi);

      // Fetch price data for primary commodity + nearest mandi
      let priceData = null;
      let forecastData = null;
      if (primaryCommodity && nearestMandi) {
        const [priceRes, forecast7Res, forecast15Res, forecast30Res] = await Promise.all([
          fetch(`${API_BASE}/pulse/prices/latest?commodityId=${primaryCommodity.commodityId}&mandiId=${nearestMandi.mandiId}&days=30`, { headers }),
          fetch(`${API_BASE}/pulse/price-forecast/${primaryCommodity.commodityId}?mandiId=${nearestMandi.mandiId}&horizonDays=7`, { headers }),
          fetch(`${API_BASE}/pulse/price-forecast/${primaryCommodity.commodityId}?mandiId=${nearestMandi.mandiId}&horizonDays=15`, { headers }),
          fetch(`${API_BASE}/pulse/price-forecast/${primaryCommodity.commodityId}?mandiId=${nearestMandi.mandiId}&horizonDays=30`, { headers })
        ]);

        priceData = (await priceRes.json()).data;
        const f7 = (await forecast7Res.json()).data;
        const f15 = (await forecast15Res.json()).data;
        const f30 = (await forecast30Res.json()).data;
        forecastData = { day7: f7, day15: f15, day30: f30 };
      }

      // Fetch ROOTS cycle-level PULSE x DICE realisation if cycle is post-harvest
      let pulseRealisation = null;
      const cycleStatus = crops.data?.cycle?.status;
      if (activeCycleId && (cycleStatus === 'post_harvest' || cycleStatus === 'closed')) {
        const realRes = await fetch(`${API_BASE}/roots/cycles/${activeCycleId}/pulse-realisation`, { headers }).catch(() => null);
        if (realRes?.ok) pulseRealisation = (await realRes.json()).data;
      }

      setDashboardData({
        crops: crops.data,
        mandis: mandis.data,
        loans: loans.data,
        recommendations: recommendations.data,
        priceData,
        forecastData,
        pulseRealisation
      });
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, [farmerId, activeCycleId, language]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner} />
        <p style={styles.loadingText}>
          {language === 'hi' ? 'बाज़ार की जानकारी लोड हो रही है...' : 'Loading market intelligence...'}
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.errorContainer}>
        <p style={styles.errorText}>{error}</p>
        <button style={styles.retryButton} onClick={fetchDashboard}>
          {language === 'hi' ? 'पुनः प्रयास करें' : 'Retry'}
        </button>
      </div>
    );
  }

  const { priceData, forecastData, mandis, loans, recommendations } = dashboardData;
  const activeLoan = loans?.[0] || null;
  const todayPrice = Array.isArray(priceData)
    ? (priceData[0]?.modalPrice || priceData[0]?.closePrice || 0)
    : (priceData?.modalPrice || 0);

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.headerTitle}>
          {language === 'hi' ? '🌾 मंडी भाव' : '🌾 PULSE Market Prices'}
        </h1>
        <p style={styles.headerSubtitle}>
          {selectedCommodity?.commodityName} | {selectedMandi?.mandiName}
        </p>
      </div>

      {/* Tab Navigation */}
      <div style={styles.tabBar}>
        {[
          { key: 'prices', labelEn: 'Prices', labelHi: 'भाव' },
          { key: 'realisation', labelEn: 'Sell vs Store', labelHi: 'बेचें या रखें' },
          { key: 'topup', labelEn: 'Top-Up Loan', labelHi: 'टॉप-अप लोन' }
        ].map(tab => (
          <button
            key={tab.key}
            style={{
              ...styles.tab,
              ...(activeTab === tab.key ? styles.activeTab : {})
            }}
            onClick={() => setActiveTab(tab.key)}
          >
            {language === 'hi' ? tab.labelHi : tab.labelEn}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'prices' && (
        <div>
          {/* Price Forecast Cards */}
          {forecastData && (
            <PriceCard
              todayPrice={todayPrice}
              forecast7={forecastData.day7}
              forecast15={forecastData.day15}
              forecast30={forecastData.day30}
              commodity={selectedCommodity}
              mandi={selectedMandi}
              language={language}
            />
          )}

          {/* Price Trend Chart */}
          {priceData && (
            <PriceTrendChart
              priceHistory={Array.isArray(priceData) ? priceData : []}
              forecasts={forecastData}
              commodity={selectedCommodity}
              language={language}
            />
          )}

          {/* Mandi Comparison */}
          {mandis && mandis.length > 1 && (
            <MandiComparison
              mandis={mandis}
              commodityId={selectedCommodity?.commodityId}
              language={language}
            />
          )}

          {/* Price Alert Setup */}
          <AlertSetup
            farmerId={farmerId}
            commodityId={selectedCommodity?.commodityId}
            currentPrice={todayPrice}
            language={language}
          />

          {/* AI Sell Recommendation */}
          {recommendations && recommendations.length > 0 && (
            <SellRecommendation
              recommendation={recommendations[0]}
              language={language}
            />
          )}
        </div>
      )}

      {activeTab === 'realisation' && activeLoan && (
        <PriceRealisationSimulator
          farmerId={farmerId}
          loan={activeLoan}
          commodity={selectedCommodity}
          mandi={selectedMandi}
          todayPrice={todayPrice}
          forecasts={forecastData}
          language={language}
        />
      )}

      {activeTab === 'realisation' && !activeLoan && (
        <div style={styles.noLoanCard}>
          <p style={styles.noLoanText}>
            {language === 'hi'
              ? 'कोई सक्रिय फसल ऋण नहीं मिला। यह सुविधा सक्रिय ऋण वाले किसानों के लिए है।'
              : 'No active crop loan found. This feature is available for farmers with active loans.'}
          </p>
        </div>
      )}

      {activeTab === 'topup' && (
        <TopupLoanCard
          farmerId={farmerId}
          loan={activeLoan}
          commodity={selectedCommodity}
          forecasts={forecastData}
          todayPrice={todayPrice}
          language={language}
        />
      )}
    </div>
  );
}

const styles = {
  container: { maxWidth: 480, margin: '0 auto', padding: 16, fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', backgroundColor: '#f8faf8' },
  header: { textAlign: 'center', marginBottom: 16, padding: 16, backgroundColor: '#1b5e20', borderRadius: 12, color: '#fff' },
  headerTitle: { fontSize: 20, fontWeight: 700, margin: 0 },
  headerSubtitle: { fontSize: 14, opacity: 0.9, margin: '4px 0 0 0' },
  tabBar: { display: 'flex', gap: 4, marginBottom: 16, backgroundColor: '#e8f5e9', borderRadius: 8, padding: 4 },
  tab: { flex: 1, padding: '10px 8px', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer', backgroundColor: 'transparent', color: '#2e7d32', transition: 'all 0.2s' },
  activeTab: { backgroundColor: '#fff', color: '#1b5e20', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  loadingContainer: { textAlign: 'center', padding: 60 },
  spinner: { width: 40, height: 40, border: '4px solid #e8f5e9', borderTop: '4px solid #2e7d32', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' },
  loadingText: { color: '#666', fontSize: 14 },
  errorContainer: { textAlign: 'center', padding: 40 },
  errorText: { color: '#d32f2f', marginBottom: 12 },
  retryButton: { padding: '10px 24px', backgroundColor: '#2e7d32', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14 },
  noLoanCard: { padding: 24, backgroundColor: '#fff3e0', borderRadius: 12, textAlign: 'center' },
  noLoanText: { color: '#e65100', fontSize: 14 }
};
