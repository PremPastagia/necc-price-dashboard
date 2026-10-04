import React, { useState, useEffect, useMemo } from 'react';
import {
  fullMarketAnalysis,
  STATE_CATEGORIES,
  STATE_TO_CITY,
  mean,
  variance,
  stdDev,
  coefficientOfVariation,
} from '../utils/marketAnalysis';
import {
  DualTimeSeriesChart,
  VarianceComparisonChart,
  DispersionTimeline,
  ScatterRegressionPlot,
  CorrelationGauge,
} from './MarketAnalysisCharts';
import './MarketAnalysis.css';

/**
 * Static version of historical price generation (for chart props)
 * This is deterministic — same inputs always give same outputs.
 */
/**
 * Extract actual NECC prices from history data for a given city
 */
function extractRealPrices(cityName, historyData) {
  const prices = [];
  const dates = [];
  if (!historyData || !Array.isArray(historyData)) return { prices, dates };

  historyData.forEach(monthData => {
    if (!monthData.data || !Array.isArray(monthData.data)) return;
    const cityData = monthData.data.find(
      c => c.city && c.city.toLowerCase().includes(cityName.toLowerCase())
    );
    if (cityData && cityData.dailyPrices) {
      cityData.dailyPrices.forEach(dp => {
        prices.push(dp.price);
        dates.push(dp.date);
      });
    }
  });

  return { prices, dates };
}

/**
 * Fallback: generate synthetic prices when real data isn't available
 */
function generateHistoricalPricesStatic(cityName, livePrices, months) {
  const today = new Date();
  const baseLive = livePrices.find(
    (p) => p.city.toLowerCase().includes(cityName.toLowerCase())
  );
  const basePrice = baseLive ? baseLive.price : 5.5;
  const prices = [];
  const dates = [];
  for (let m = months - 1; m >= 0; m--) {
    const monthDate = new Date(today.getFullYear(), today.getMonth() - m, 1);
    const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
    const seed = cityName.charCodeAt(0) + m * 7;
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(monthDate.getFullYear(), monthDate.getMonth(), d);
      const dayOfYear = Math.floor((date - new Date(date.getFullYear(), 0, 0)) / 86400000);
      const seasonal = 0.06 * Math.sin((dayOfYear / 365) * 2 * Math.PI - 1);
      const trend = 0.001 * (months - m);
      const weekly = 0.01 * Math.sin((d / 7) * 2 * Math.PI);
      const noise = 0.03 * Math.sin(seed + d * 0.7 + m * 3.1);
      const price = basePrice * (1 + seasonal + trend + weekly + noise);
      prices.push(Math.round(price * 100) / 100);
      dates.push(date.toISOString().split('T')[0]);
    }
  }
  return { prices, dates };
}

/**
 * MarketAnalysis — full dashboard section for Spatial Price Dispersion
 * and Market Integration between a selected producer and consumer state.
 * Now uses actual NECC historical data when available.
 */
const MarketAnalysis = ({ livePrices = [], loading = false, historyData = null, historyLoading = false }) => {
  const [producerState, setProducerState] = useState('namakkal');
  const [consumerState, setConsumerState] = useState('delhi');
  const [monthsToAnalyze, setMonthsToAnalyze] = useState(6);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [usingRealData, setUsingRealData] = useState(false);

  useEffect(() => {
    if (livePrices.length === 0) return;
    setGenerating(true);
    const timer = setTimeout(() => {
      const producerCity = STATE_TO_CITY[producerState] || 'Namakkal';
      const consumerCity = STATE_TO_CITY[consumerState] || 'Delhi';

      let producer, consumer;

      // Try to use actual NECC data first
      if (historyData && Array.isArray(historyData) && historyData.length > 0) {
        producer = extractRealPrices(producerCity, historyData);
        consumer = extractRealPrices(consumerCity, historyData);

        if (producer.prices.length > 10 && consumer.prices.length > 10) {
          setUsingRealData(true);
        } else {
          // Fallback to synthetic if real data is sparse
          producer = generateHistoricalPricesStatic(producerCity, livePrices, monthsToAnalyze);
          consumer = generateHistoricalPricesStatic(consumerCity, livePrices, monthsToAnalyze);
          setUsingRealData(false);
        }
      } else {
        producer = generateHistoricalPricesStatic(producerCity, livePrices, monthsToAnalyze);
        consumer = generateHistoricalPricesStatic(consumerCity, livePrices, monthsToAnalyze);
        setUsingRealData(false);
      }

      const producerLabel =
        STATE_CATEGORIES.producers.find((s) => s.id === producerState)?.label ||
        producerCity;
      const consumerLabel =
        STATE_CATEGORIES.consumers.find((s) => s.id === consumerState)?.label ||
        consumerCity;
      const result = fullMarketAnalysis(
        { label: producerLabel, prices: producer.prices, dates: producer.dates },
        { label: consumerLabel, prices: consumer.prices, dates: consumer.dates }
      );
      setAnalysisResult(result);
      setGenerating(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [producerState, consumerState, monthsToAnalyze, livePrices, historyData]);

  const producerLabel =
    STATE_CATEGORIES.producers.find((s) => s.id === producerState)?.label || '';
  const consumerLabel =
    STATE_CATEGORIES.consumers.find((s) => s.id === consumerState)?.label || '';

  return (
    <div className="market-analysis-section">
      {/* Header */}
      <div className="ma-header">
        <div className="ma-header-icon">📊</div>
        <div>
          <h3 className="ma-title">Spatial Price Dispersion &amp; Market Integration</h3>
          <p className="ma-subtitle">
            Evaluate price volatility, co-movement, and transmission efficiency between producing and consuming regions.
          </p>
          {historyLoading && (
            <p style={{ color: '#FFD700', fontSize: '0.85rem', marginTop: '6px' }}>
              ⚡ Fetching 6 months of actual NECC data for analysis...
            </p>
          )}
          {!historyLoading && (
            <p style={{ color: usingRealData ? '#4CAF50' : '#FF9800', fontSize: '0.8rem', marginTop: '6px' }}>
              {usingRealData ? '✅ Using actual NECC scraped data' : '⚠️ Using price-seeded model (history loading...)'}
            </p>
          )}
        </div>
      </div>

      {/* State Selectors */}
      <div className="ma-selectors">
        <div className="ma-selector-group">
          <div className="ma-sel-badge producer-badge">🏭 Producer State</div>
          <select
            id="ma-producer-select"
            value={producerState}
            onChange={(e) => setProducerState(e.target.value)}
            className="ma-select"
          >
            {STATE_CATEGORIES.producers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label} — {s.description}
              </option>
            ))}
          </select>
        </div>
        <div className="ma-vs-divider">
          <span className="ma-vs-text">VS</span>
        </div>
        <div className="ma-selector-group">
          <div className="ma-sel-badge consumer-badge">🏙️ Consumer State</div>
          <select
            id="ma-consumer-select"
            value={consumerState}
            onChange={(e) => setConsumerState(e.target.value)}
            className="ma-select"
          >
            {STATE_CATEGORIES.consumers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label} — {s.description}
              </option>
            ))}
          </select>
        </div>
        <div className="ma-selector-group duration-group">
          <div className="ma-sel-badge duration-badge">📅 Duration</div>
          <div className="ma-duration-btns">
            {[3, 6, 9, 12].map((m) => (
              <button
                key={m}
                id={`ma-duration-${m}`}
                className={`ma-dur-btn ${monthsToAnalyze === m ? 'active' : ''}`}
                onClick={() => setMonthsToAnalyze(m)}
              >
                {m}M
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Loading State */}
      {(generating || loading) && (
        <div className="ma-loading">
          <div className="loading-spinner"></div>
          <p>Computing statistical analysis...</p>
        </div>
      )}

      {/* Results */}
      {analysisResult && !generating && (
        <div className="ma-results">
          {/* Integration Summary Banner */}
          <div
            className="ma-integration-banner"
            style={{ borderColor: analysisResult.integration.color }}
          >
            <div className="ma-banner-left">
              <div
                className="ma-banner-level"
                style={{ color: analysisResult.integration.color }}
              >
                {analysisResult.integration.level} Integration
              </div>
              <div className="ma-banner-desc">{analysisResult.integration.description}</div>
            </div>
            <div className="ma-banner-right">
              <div className="ma-banner-stat">
                <span className="ma-banner-stat-label">Correlation (r)</span>
                <span
                  className="ma-banner-stat-value"
                  style={{ color: analysisResult.integration.color }}
                >
                  {analysisResult.correlation.toFixed(4)}
                </span>
              </div>
              <div className="ma-banner-stat">
                <span className="ma-banner-stat-label">R²</span>
                <span className="ma-banner-stat-value">
                  {analysisResult.regression.rSquared.toFixed(4)}
                </span>
              </div>
              <div className="ma-banner-stat">
                <span className="ma-banner-stat-label">n (days)</span>
                <span className="ma-banner-stat-value">{analysisResult.n}</span>
              </div>
            </div>
          </div>

          {/* Statistical Summary Cards */}
          <div className="ma-stats-grid">
            <div className="ma-stat-card producer-card">
              <div className="ma-stat-card-header">
                <span className="ma-stat-icon">🏭</span>
                <span className="ma-stat-title">{analysisResult.state1Stats.label}</span>
              </div>
              <div className="ma-stat-rows">
                <div className="ma-stat-row"><span>Mean (μ)</span><span className="ma-stat-val">₹{analysisResult.state1Stats.mean.toFixed(3)}</span></div>
                <div className="ma-stat-row"><span>Variance (σ²)</span><span className="ma-stat-val">{analysisResult.state1Stats.variance.toFixed(4)}</span></div>
                <div className="ma-stat-row"><span>Std Dev (σ)</span><span className="ma-stat-val">₹{analysisResult.state1Stats.stdDev.toFixed(4)}</span></div>
                <div className="ma-stat-row"><span>CV (%)</span><span className="ma-stat-val">{analysisResult.state1Stats.cv.toFixed(2)}%</span></div>
              </div>
            </div>
            <div className="ma-stat-card dispersion-card">
              <div className="ma-stat-card-header">
                <span className="ma-stat-icon">⚡</span>
                <span className="ma-stat-title">Price Dispersion |P₁−P₂|</span>
              </div>
              <div className="ma-stat-rows">
                <div className="ma-stat-row"><span>Mean Δ</span><span className="ma-stat-val">₹{analysisResult.dispersion.mean.toFixed(3)}</span></div>
                <div className="ma-stat-row"><span>Max Δ</span><span className="ma-stat-val">₹{analysisResult.dispersion.max.toFixed(3)}</span></div>
                <div className="ma-stat-row"><span>Variance</span><span className="ma-stat-val">{analysisResult.dispersion.variance.toFixed(4)}</span></div>
                <div className="ma-stat-row"><span>CV (%)</span><span className="ma-stat-val">{analysisResult.dispersion.cv.toFixed(2)}%</span></div>
              </div>
            </div>
            <div className="ma-stat-card consumer-card">
              <div className="ma-stat-card-header">
                <span className="ma-stat-icon">🏙️</span>
                <span className="ma-stat-title">{analysisResult.state2Stats.label}</span>
              </div>
              <div className="ma-stat-rows">
                <div className="ma-stat-row"><span>Mean (μ)</span><span className="ma-stat-val">₹{analysisResult.state2Stats.mean.toFixed(3)}</span></div>
                <div className="ma-stat-row"><span>Variance (σ²)</span><span className="ma-stat-val">{analysisResult.state2Stats.variance.toFixed(4)}</span></div>
                <div className="ma-stat-row"><span>Std Dev (σ)</span><span className="ma-stat-val">₹{analysisResult.state2Stats.stdDev.toFixed(4)}</span></div>
                <div className="ma-stat-row"><span>CV (%)</span><span className="ma-stat-val">{analysisResult.state2Stats.cv.toFixed(2)}%</span></div>
              </div>
            </div>
          </div>

          {/* Charts Row 1 */}
          <div className="ma-charts-row">
            <div className="ma-chart-panel ma-chart-wide">
              <h4 className="ma-chart-title">📈 Price Comparison Time Series</h4>
              <DualTimeSeriesChart
                dates={analysisResult.dates}
                prices1={generateHistoricalPricesStatic(STATE_TO_CITY[producerState], livePrices, monthsToAnalyze).prices.slice(0, analysisResult.n)}
                prices2={generateHistoricalPricesStatic(STATE_TO_CITY[consumerState], livePrices, monthsToAnalyze).prices.slice(0, analysisResult.n)}
                label1={producerLabel}
                label2={consumerLabel}
              />
            </div>
            <div className="ma-chart-panel ma-chart-narrow">
              <h4 className="ma-chart-title">🎯 Correlation Gauge</h4>
              <CorrelationGauge r={analysisResult.correlation} size={200} />
              <div className="ma-regression-eq">
                <div className="ma-eq-label">Regression Model</div>
                <div className="ma-eq-formula">{analysisResult.regression.equation}</div>
                <div className="ma-eq-detail">
                  <span>β (Slope) = {analysisResult.regression.beta.toFixed(4)}</span>
                  <span>α (Intercept) = {analysisResult.regression.alpha.toFixed(4)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Charts Row 2 */}
          <div className="ma-charts-row">
            <div className="ma-chart-panel ma-chart-wide">
              <h4 className="ma-chart-title">📊 Inter-Market Price Dispersion |P₁ − P₂| Over Time</h4>
              <DispersionTimeline dispersion={analysisResult.dispersion.values} dates={analysisResult.dates} />
            </div>
            <div className="ma-chart-panel ma-chart-narrow">
              <h4 className="ma-chart-title">📉 Variance Comparison</h4>
              <VarianceComparisonChart stats1={analysisResult.state1Stats} stats2={analysisResult.state2Stats} width={380} height={260} />
            </div>
          </div>

          {/* Charts Row 3 */}
          <div className="ma-charts-row scatter-row">
            <div className="ma-chart-panel ma-chart-mid">
              <h4 className="ma-chart-title">🔬 Price Transmission Scatter (P₁ vs P₂)</h4>
              <ScatterRegressionPlot
                prices1={generateHistoricalPricesStatic(STATE_TO_CITY[producerState], livePrices, monthsToAnalyze).prices.slice(0, analysisResult.n)}
                prices2={generateHistoricalPricesStatic(STATE_TO_CITY[consumerState], livePrices, monthsToAnalyze).prices.slice(0, analysisResult.n)}
                regression={analysisResult.regression}
                label1={producerLabel}
                label2={consumerLabel}
                width={500}
                height={380}
              />
            </div>
            <div className="ma-chart-panel ma-interpretation">
              <h4 className="ma-chart-title">📋 Analysis Interpretation</h4>
              <div className="ma-interpret-content">
                <div className="ma-interpret-item">
                  <div className="ma-interpret-icon" style={{ color: analysisResult.integration.color }}>●</div>
                  <div>
                    <strong>Market Integration:</strong> {analysisResult.integration.level} (r = {analysisResult.correlation.toFixed(4)}).
                    {analysisResult.correlation > 0.8 ? ' Price movements are highly synchronized.' : analysisResult.correlation > 0.5 ? ' Prices show moderate co-movement.' : ' Markets appear to operate independently.'}
                  </div>
                </div>
                <div className="ma-interpret-item">
                  <div className="ma-interpret-icon" style={{ color: '#00E5FF' }}>●</div>
                  <div>
                    <strong>Price Transmission (β = {analysisResult.regression.beta.toFixed(3)}):</strong>
                    {analysisResult.regression.beta > 0.9 ? ' Nearly full pass-through – a ₹1 change in producer price leads to ≈₹' + analysisResult.regression.beta.toFixed(2) + ' change at consumer end.' : analysisResult.regression.beta > 0.5 ? ' Partial transmission – about ' + (analysisResult.regression.beta * 100).toFixed(0) + '% of producer price changes are transmitted.' : ' Low transmission – consumer prices are weakly influenced by producer prices.'}
                  </div>
                </div>
                <div className="ma-interpret-item">
                  <div className="ma-interpret-icon" style={{ color: '#FFD700' }}>●</div>
                  <div>
                    <strong>Price Volatility:</strong> Producer CV = {analysisResult.state1Stats.cv.toFixed(2)}%, Consumer CV = {analysisResult.state2Stats.cv.toFixed(2)}%.
                    {analysisResult.state2Stats.cv > analysisResult.state1Stats.cv ? ' Consumer market shows higher relative volatility.' : ' Producer market shows higher relative volatility.'}
                  </div>
                </div>
                <div className="ma-interpret-item">
                  <div className="ma-interpret-icon" style={{ color: '#FF6D00' }}>●</div>
                  <div>
                    <strong>Spatial Dispersion:</strong> Average price gap |P₁−P₂| = ₹{analysisResult.dispersion.mean.toFixed(3)} with CV = {analysisResult.dispersion.cv.toFixed(1)}%.
                    {analysisResult.dispersion.cv < 20 ? ' Relatively stable price differential.' : ' Significant variability in price gaps, suggesting periodic disruptions.'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MarketAnalysis;
