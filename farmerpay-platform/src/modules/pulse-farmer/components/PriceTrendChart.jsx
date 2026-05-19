// src/modules/pulse-farmer/components/PriceTrendChart.jsx
import React, { useRef, useEffect } from 'react';

export default function PriceTrendChart({ priceHistory, forecasts, commodity, language }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !priceHistory || priceHistory.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Combine historical prices and forecast points
    const historicalPrices = priceHistory
      .slice()
      .reverse()
      .map(p => p.modalPrice || p.closePrice || 0);

    const forecastPrices = [];
    if (forecasts?.day7?.predictedPrice) forecastPrices.push(forecasts.day7.predictedPrice);
    if (forecasts?.day15?.predictedPrice) forecastPrices.push(forecasts.day15.predictedPrice);
    if (forecasts?.day30?.predictedPrice) forecastPrices.push(forecasts.day30.predictedPrice);

    const allPrices = [...historicalPrices, ...forecastPrices];
    const minPrice = Math.min(...allPrices) * 0.95;
    const maxPrice = Math.max(...allPrices) * 1.05;
    const range = maxPrice - minPrice || 1;

    const padding = { top: 20, bottom: 30, left: 10, right: 10 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;
    const totalPoints = allPrices.length;
    const stepX = chartW / (totalPoints - 1 || 1);

    // Clear
    ctx.clearRect(0, 0, width, height);

    // Draw grid lines
    ctx.strokeStyle = '#f0f0f0';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
    }

    // Draw historical line
    ctx.beginPath();
    ctx.strokeStyle = '#2e7d32';
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    historicalPrices.forEach((price, i) => {
      const x = padding.left + i * stepX;
      const y = padding.top + chartH - ((price - minPrice) / range) * chartH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Draw gradient fill under historical line
    const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
    gradient.addColorStop(0, 'rgba(46, 125, 50, 0.15)');
    gradient.addColorStop(1, 'rgba(46, 125, 50, 0.0)');
    ctx.lineTo(padding.left + (historicalPrices.length - 1) * stepX, height - padding.bottom);
    ctx.lineTo(padding.left, height - padding.bottom);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Draw forecast line (dashed)
    if (forecastPrices.length > 0) {
      ctx.beginPath();
      ctx.setLineDash([5, 3]);
      ctx.strokeStyle = '#ff9800';
      ctx.lineWidth = 2;
      const startIdx = historicalPrices.length - 1;
      const startX = padding.left + startIdx * stepX;
      const startY = padding.top + chartH - ((historicalPrices[startIdx] - minPrice) / range) * chartH;
      ctx.moveTo(startX, startY);

      forecastPrices.forEach((price, i) => {
        const x = padding.left + (startIdx + 1 + i) * stepX;
        const y = padding.top + chartH - ((price - minPrice) / range) * chartH;
        ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw forecast dots
      forecastPrices.forEach((price, i) => {
        const x = padding.left + (startIdx + 1 + i) * stepX;
        const y = padding.top + chartH - ((price - minPrice) / range) * chartH;
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#ff9800';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });
    }

    // Labels
    ctx.fillStyle = '#666';
    ctx.font = '10px -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`₹${Math.round(maxPrice)}`, padding.left, padding.top - 5);
    ctx.fillText(`₹${Math.round(minPrice)}`, padding.left, height - padding.bottom + 14);

    // Legend
    ctx.textAlign = 'right';
    ctx.fillStyle = '#2e7d32';
    ctx.fillText(language === 'hi' ? 'वास्तविक ━' : 'Actual ━', width - padding.right, height - 6);
    ctx.fillStyle = '#ff9800';
    ctx.fillText(language === 'hi' ? 'अनुमान ╌╌' : 'Forecast ╌╌', width - padding.right - 80, height - 6);

  }, [priceHistory, forecasts, language]);

  return (
    <div style={styles.chartContainer}>
      <h3 style={styles.chartTitle}>
        {language === 'hi' ? 'भाव का रुझान' : 'Price Trend'}
      </h3>
      <canvas ref={canvasRef} style={styles.canvas} />
    </div>
  );
}

const styles = {
  chartContainer: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  chartTitle: { fontSize: 14, fontWeight: 600, color: '#333', marginBottom: 12, marginTop: 0 },
  canvas: { width: '100%', height: 200, display: 'block' }
};
