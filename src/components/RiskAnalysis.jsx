import React, { useState, useEffect } from 'react';
import {
  fullRiskAnalysis,
  classifyStability,
  mean as calcMean,
  stdDev as calcStdDev,
} from '../utils/riskAnalysis';
import { STATE_CATEGORIES, STATE_TO_CITY } from '../utils/marketAnalysis';
import {
  ShockTimeSeriesChart,
  ZScoreBarChart,
  RiskGauge,
  RollingCVChart,
  ComparativeRiskBars,
} from './RiskAnalysisCharts';
import './RiskAnalysis.css';

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
function generateHistorical(cityName, livePrices, months) {
  const today = new Date();
  const baseLive = livePrices.find(
    (p) => p.city?.toLowerCase().includes(cityName.toLowerCase())
  );
  const basePrice = baseLive ? baseLive.price : 5.5;
  const prices = [], dates = [];
  for (let m = months - 1; m >= 0; m--) {
    const monthDate = new Date(today.getFullYear(), today.getMonth() - m, 1);
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() - m + 1, 0).getDate();
    const seed = cityName.charCodeAt(0) + m * 7;
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(today.getFullYear(), today.getMonth() - m, d);
      const dayOfYear = Math.floor((date - new Date(date.getFullYear(), 0, 0)) / 86400000);
      const seasonal = 0.06 * Math.sin((dayOfYear / 365) * 2 * Math.PI - 1);
      const trend = 0.001 * (months - m);
      const weekly = 0.01 * Math.sin((d / 7) * 2 * Math.PI);
      const noise = 0.03 * Math.sin(seed + d * 0.7 + m * 3.1);
      const spike = (d % 29 === 0 && m % 2 === 0) ? 0.12 * Math.sin(seed + d) : 0;
      const price = basePrice * (1 + seasonal + trend + weekly + noise + spike);
      prices.push(Math.round(price * 100) / 100);
      dates.push(date.toISOString().split('T')[0]);
    }
  }
  return { prices, dates };
}

const RiskAnalysis = ({ livePrices = [], loading = false, historyData = null, historyLoading = false }) => {
  const [producerState, setProducerState] = useState('namakkal');
  const [consumerState, setConsumerState] = useState('delhi');
  const [months, setMonths] = useState(6);
  const [threshold, setThreshold] = useState(10);
  const [report, setReport] = useState(null);
  const [computing, setComputing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [usingRealData, setUsingRealData] = useState(false);

  useEffect(() => {
    if (livePrices.length === 0) return;
    setComputing(true);
    const timer = setTimeout(() => {
      const pCity = STATE_TO_CITY[producerState] || 'Namakkal';
      const cCity = STATE_TO_CITY[consumerState] || 'Delhi';

      let pData, cData;

      // Try actual NECC data first
      if (historyData && Array.isArray(historyData) && historyData.length > 0) {
        pData = extractRealPrices(pCity, historyData);
        cData = extractRealPrices(cCity, historyData);

        if (pData.prices.length > 10 && cData.prices.length > 10) {
          setUsingRealData(true);
        } else {
          pData = generateHistorical(pCity, livePrices, months);
          cData = generateHistorical(cCity, livePrices, months);
          setUsingRealData(false);
        }
      } else {
        pData = generateHistorical(pCity, livePrices, months);
        cData = generateHistorical(cCity, livePrices, months);
        setUsingRealData(false);
      }

      const pLabel = STATE_CATEGORIES.producers.find(s => s.id === producerState)?.label || pCity;
      const cLabel = STATE_CATEGORIES.consumers.find(s => s.id === consumerState)?.label || cCity;
      const r = fullRiskAnalysis(
        { label: pLabel, prices: pData.prices, dates: pData.dates },
        { label: cLabel, prices: cData.prices, dates: cData.dates },
        threshold,
      );
      r.state1.prices = pData.prices;
      r.state1.dates = pData.dates;
      r.state2.prices = cData.prices;
      r.state2.dates = cData.dates;
      setReport(r);
      setComputing(false);
    }, 250);
    return () => clearTimeout(timer);
  }, [producerState, consumerState, months, threshold, livePrices, historyData]);

  const tabs = [
    { id: 'overview', label: '🏠 Overview' },
    { id: 'stability', label: '⚖️ Stability' },
    { id: 'shocks', label: '⚡ Shock Detection' },
    { id: 'risk', label: '🎯 Risk Indices' },
  ];

  return (
    <div className="ra-section">
      <div className="ra-header">
        <div className="ra-header-icon">⚠️</div>
        <div>
          <h3 className="ra-title">Price Stability, Shock Detection &amp; Risk Analysis</h3>
          <p className="ra-subtitle">
            Evaluate price volatility, detect abnormal price movements using %ΔP and Z-Score methods,
            and quantify risk through Volatility-Based and Downside Risk indices.
          </p>
          {historyLoading && (
            <p style={{ color: '#FFD700', fontSize: '0.85rem', marginTop: '6px' }}>
              ⚡ Fetching 6 months of actual NECC data for risk analysis...
            </p>
          )}
          {!historyLoading && (
            <p style={{ color: usingRealData ? '#4CAF50' : '#FF9800', fontSize: '0.8rem', marginTop: '6px' }}>
              {usingRealData ? '✅ Using actual NECC scraped data' : '⚠️ Using price-seeded model (history loading...)'}
            </p>
          )}
        </div>
      </div>

      <div className="ra-selectors">
        <div className="ra-sel-group">
          <div className="ra-sel-badge" style={{ background: 'rgba(0,229,255,0.12)', color: '#00E5FF', borderColor: 'rgba(0,229,255,0.2)' }}>🏭 Producer</div>
          <select id="ra-producer" value={producerState} onChange={e => setProducerState(e.target.value)} className="ra-select">
            {STATE_CATEGORIES.producers.map(s => (<option key={s.id} value={s.id}>{s.label} — {s.description}</option>))}
          </select>
        </div>
        <div className="ra-vs"><span>VS</span></div>
        <div className="ra-sel-group">
          <div className="ra-sel-badge" style={{ background: 'rgba(255,109,0,0.12)', color: '#FF6D00', borderColor: 'rgba(255,109,0,0.2)' }}>🏙️ Consumer</div>
          <select id="ra-consumer" value={consumerState} onChange={e => setConsumerState(e.target.value)} className="ra-select">
            {STATE_CATEGORIES.consumers.map(s => (<option key={s.id} value={s.id}>{s.label} — {s.description}</option>))}
          </select>
        </div>
        <div className="ra-sel-group ra-narrow">
          <div className="ra-sel-badge" style={{ background: 'rgba(255,215,0,0.12)', color: '#FFD700', borderColor: 'rgba(255,215,0,0.2)' }}>📅 Duration</div>
          <div className="ra-dur-btns">
            {[3, 6, 9, 12].map(m => (<button key={m} className={`ra-dur-btn ${months === m ? 'active' : ''}`} onClick={() => setMonths(m)}>{m}M</button>))}
          </div>
        </div>
        <div className="ra-sel-group ra-narrow">
          <div className="ra-sel-badge" style={{ background: 'rgba(244,67,54,0.12)', color: '#F44336', borderColor: 'rgba(244,67,54,0.2)' }}>🎚️ Shock ±%</div>
          <div className="ra-dur-btns">
            {[5, 10, 15, 20].map(t => (<button key={t} className={`ra-dur-btn ${threshold === t ? 'active' : ''}`} onClick={() => setThreshold(t)}>±{t}%</button>))}
          </div>
        </div>
      </div>

      {(computing || loading) && (<div className="ra-loading"><div className="loading-spinner" /><p>Running risk analysis...</p></div>)}

      {report && !computing && (
        <>
          <div className="ra-tabs">
            {tabs.map(t => (<button key={t.id} className={`ra-tab ${activeTab === t.id ? 'active' : ''}`} onClick={() => setActiveTab(t.id)}>{t.label}</button>))}
          </div>

          {activeTab === 'overview' && (
            <div className="ra-tab-content">
              <div className="ra-banner-row">
                {[report.state1, report.state2].map((s, idx) => (
                  <div key={idx} className="ra-stability-banner" style={{ borderColor: s.stability.color }}>
                    <div className="ra-stab-icon">{s.stability.icon}</div>
                    <div><div className="ra-stab-label">{s.label}</div><div className="ra-stab-level" style={{ color: s.stability.color }}>{s.stability.level}</div></div>
                    <div className="ra-stab-cv">CV: {s.cv.toFixed(2)}%</div>
                  </div>
                ))}
              </div>
              <div className="ra-summary-grid">
                {[report.state1, report.state2].map((s, idx) => (
                  <div key={idx} className="ra-summary-card" style={{ borderTop: `3px solid ${idx === 0 ? '#00E5FF' : '#FF6D00'}` }}>
                    <div className="ra-card-head"><span>{idx === 0 ? '🏭' : '🏙️'}</span><span className="ra-card-name">{s.label}</span></div>
                    <div className="ra-stat-rows">
                      <div className="ra-stat-row"><span>Mean (μ)</span><span className="ra-val">₹{s.mean.toFixed(3)}</span></div>
                      <div className="ra-stat-row"><span>Variance (σ²)</span><span className="ra-val">{s.variance.toFixed(4)}</span></div>
                      <div className="ra-stat-row"><span>Std Dev (σ)</span><span className="ra-val">₹{s.stdDev.toFixed(4)}</span></div>
                      <div className="ra-stat-row"><span>CV (%)</span><span className="ra-val">{s.cv.toFixed(2)}%</span></div>
                      <div className="ra-stat-row"><span>% Shocks</span><span className="ra-val" style={{ color: s.shockSummary.pctShockCount > 0 ? '#FF9800' : '#4CAF50' }}>{s.shockSummary.pctShockCount}</span></div>
                      <div className="ra-stat-row"><span>Moderate Z-Shocks</span><span className="ra-val" style={{ color: s.shockSummary.moderateZ > 0 ? '#FF9800' : '#4CAF50' }}>{s.shockSummary.moderateZ}</span></div>
                      <div className="ra-stat-row"><span>Severe Z-Shocks</span><span className="ra-val" style={{ color: s.shockSummary.severeZ > 0 ? '#F44336' : '#4CAF50' }}>{s.shockSummary.severeZ}</span></div>
                      <div className="ra-stat-row"><span>Volatility Risk</span><span className="ra-val" style={{ color: s.volRisk.color }}>{s.volRisk.level}</span></div>
                      <div className="ra-stat-row"><span>Downside Risk</span><span className="ra-val" style={{ color: s.dsRisk.color }}>{s.dsRisk.level}</span></div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="ra-chart-panel">
                <h4 className="ra-chart-title">📊 Comparative Risk Metrics</h4>
                <ComparativeRiskBars report1={report.state1} report2={report.state2} width={860} height={320} />
              </div>
            </div>
          )}

          {activeTab === 'stability' && (
            <div className="ra-tab-content">
              <div className="ra-dual-charts">
                <div className="ra-chart-panel">
                  <h4 className="ra-chart-title">🏭 {report.state1.label} — Price Timeline</h4>
                  <ShockTimeSeriesChart prices={report.state1.prices} dates={report.state1.dates} zShocks={report.state1.zShocks} pctShocks={report.state1.pctShocks} label={report.state1.label} accentColor="#00E5FF" />
                </div>
                <div className="ra-chart-panel">
                  <h4 className="ra-chart-title">🏙️ {report.state2.label} — Price Timeline</h4>
                  <ShockTimeSeriesChart prices={report.state2.prices} dates={report.state2.dates} zShocks={report.state2.zShocks} pctShocks={report.state2.pctShocks} label={report.state2.label} accentColor="#FF6D00" />
                </div>
              </div>
              <div className="ra-chart-panel">
                <h4 className="ra-chart-title">📈 Rolling 14-Day Coefficient of Variation (%)</h4>
                <RollingCVChart rolling1={report.state1.rollingCV} rolling2={report.state2.rollingCV} label1={report.state1.label} label2={report.state2.label} />
              </div>
            </div>
          )}

          {activeTab === 'shocks' && (
            <div className="ra-tab-content">
              <div className="ra-method-cards">
                <div className="ra-method-card">
                  <div className="ra-method-head"><span className="ra-method-badge pct-badge">% Change</span><span className="ra-method-formula">%ΔP = (P<sub>t</sub> − P<sub>t−1</sub>) / P<sub>t−1</sub> × 100</span></div>
                  <div className="ra-method-desc">Shocks detected when |%ΔP| exceeds ±{threshold}%.</div>
                  <div className="ra-shock-counts">
                    <div><span style={{ color: '#00E5FF' }}>{report.state1.label}:</span> <strong>{report.state1.shockSummary.pctShockCount}</strong> shocks</div>
                    <div><span style={{ color: '#FF6D00' }}>{report.state2.label}:</span> <strong>{report.state2.shockSummary.pctShockCount}</strong> shocks</div>
                  </div>
                </div>
                <div className="ra-method-card">
                  <div className="ra-method-head"><span className="ra-method-badge z-badge">Z-Score</span><span className="ra-method-formula">Z<sub>t</sub> = (P<sub>t</sub> − μ) / σ</span></div>
                  <div className="ra-method-desc">|Z| &gt; 2 → Moderate shock. |Z| &gt; 3 → Severe shock.</div>
                  <div className="ra-shock-counts">
                    <div><span style={{ color: '#00E5FF' }}>{report.state1.label}:</span> <strong style={{ color: '#FF9800' }}>{report.state1.shockSummary.moderateZ}</strong> mod + <strong style={{ color: '#F44336' }}>{report.state1.shockSummary.severeZ}</strong> severe</div>
                    <div><span style={{ color: '#FF6D00' }}>{report.state2.label}:</span> <strong style={{ color: '#FF9800' }}>{report.state2.shockSummary.moderateZ}</strong> mod + <strong style={{ color: '#F44336' }}>{report.state2.shockSummary.severeZ}</strong> severe</div>
                  </div>
                </div>
              </div>
              <div className="ra-chart-panel">
                <h4 className="ra-chart-title">📊 {report.state1.label} — Z-Score Distribution</h4>
                <ZScoreBarChart zShocks={report.state1.zShocks} label={report.state1.label} />
              </div>
              <div className="ra-chart-panel" style={{ marginTop: 18 }}>
                <h4 className="ra-chart-title">📊 {report.state2.label} — Z-Score Distribution</h4>
                <ZScoreBarChart zShocks={report.state2.zShocks} label={report.state2.label} />
              </div>
              <div className="ra-chart-panel" style={{ marginTop: 18 }}>
                <h4 className="ra-chart-title">📋 Recent Shock Events (all methods combined)</h4>
                <div className="ra-shock-table-wrap">
                  <table className="ra-shock-table">
                    <thead><tr><th>State</th><th>Date</th><th>Price (₹)</th><th>Type</th><th>Value</th><th>Severity</th></tr></thead>
                    <tbody>
                      {[
                        ...report.state1.zShocks.filter(s => s.severity !== 'normal').map(s => ({ ...s, state: report.state1.label, type: 'Z-Score', val: `Z=${s.zScore.toFixed(2)}` })),
                        ...report.state1.pctShocks.filter(s => s.isShock).map(s => ({ ...s, state: report.state1.label, type: '%Change', val: `${s.pctChange.toFixed(2)}%`, severity: Math.abs(s.pctChange) > 20 ? 'severe' : 'moderate' })),
                        ...report.state2.zShocks.filter(s => s.severity !== 'normal').map(s => ({ ...s, state: report.state2.label, type: 'Z-Score', val: `Z=${s.zScore.toFixed(2)}` })),
                        ...report.state2.pctShocks.filter(s => s.isShock).map(s => ({ ...s, state: report.state2.label, type: '%Change', val: `${s.pctChange.toFixed(2)}%`, severity: Math.abs(s.pctChange) > 20 ? 'severe' : 'moderate' })),
                      ].sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 20).map((ev, i) => (
                        <tr key={i}>
                          <td>{ev.state}</td><td>{ev.date}</td><td>₹{ev.price?.toFixed(2)}</td>
                          <td><span className={`ra-type-tag ${ev.type === 'Z-Score' ? 'z-tag' : 'pct-tag'}`}>{ev.type}</span></td>
                          <td>{ev.val}</td>
                          <td><span className={`ra-sev-tag sev-${ev.severity}`}>{ev.severity}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'risk' && (
            <div className="ra-tab-content">
              <div className="ra-risk-gauges-row">
                {[report.state1, report.state2].map((s, idx) => (
                  <div key={idx} className="ra-gauge-card">
                    <div className="ra-gauge-label">{s.label}</div>
                    <div className="ra-gauge-pair">
                      <RiskGauge value={s.volRisk.normalisedRisk} maxVal={25} label="Volatility Risk" color={s.volRisk.color} size={160} />
                      <RiskGauge value={s.dsRisk.downsideRisk} maxVal={25} label="Downside Risk" color={s.dsRisk.color} size={160} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="ra-formula-cards">
                <div className="ra-formula-card">
                  <div className="ra-formula-badge" style={{ background: 'rgba(0,229,255,0.1)', color: '#00E5FF' }}>Volatility-Based</div>
                  <div className="ra-formula-text">Risk = σ / μ</div>
                  <div className="ra-formula-desc">Measures overall market instability as the ratio of standard deviation to mean price.</div>
                  <div className="ra-formula-results">
                    <div className="ra-formula-row"><span>{report.state1.label}:</span><span style={{ color: report.state1.volRisk.color, fontWeight: 700 }}>{report.state1.volRisk.normalisedRisk.toFixed(3)}% — {report.state1.volRisk.level}</span></div>
                    <div className="ra-formula-row"><span>{report.state2.label}:</span><span style={{ color: report.state2.volRisk.color, fontWeight: 700 }}>{report.state2.volRisk.normalisedRisk.toFixed(3)}% — {report.state2.volRisk.level}</span></div>
                  </div>
                </div>
                <div className="ra-formula-card">
                  <div className="ra-formula-badge" style={{ background: 'rgba(244,67,54,0.1)', color: '#F44336' }}>Downside Risk</div>
                  <div className="ra-formula-text">DD = √(Σ min(P<sub>t</sub>−μ, 0)² / n)</div>
                  <div className="ra-formula-desc">Considers only negative deviations below the mean. Critical for supply chain cost planning.</div>
                  <div className="ra-formula-results">
                    <div className="ra-formula-row"><span>{report.state1.label}:</span><span style={{ color: report.state1.dsRisk.color, fontWeight: 700 }}>{report.state1.dsRisk.downsideRisk.toFixed(3)}% — {report.state1.dsRisk.level}</span></div>
                    <div className="ra-formula-row"><span>{report.state2.label}:</span><span style={{ color: report.state2.dsRisk.color, fontWeight: 700 }}>{report.state2.dsRisk.downsideRisk.toFixed(3)}% — {report.state2.dsRisk.level}</span></div>
                  </div>
                </div>
              </div>
              <div className="ra-chart-panel" style={{ marginTop: 18 }}>
                <h4 className="ra-chart-title">📋 Risk Interpretation</h4>
                <div className="ra-interpret-grid">
                  <div className="ra-interpret-item"><div className="ra-interp-dot" style={{ color: report.state1.volRisk.color }}>●</div><div><strong>{report.state1.label} Volatility:</strong> CV = {report.state1.cv.toFixed(2)}%, Risk Index = {report.state1.volRisk.normalisedRisk.toFixed(2)}%.</div></div>
                  <div className="ra-interpret-item"><div className="ra-interp-dot" style={{ color: report.state2.volRisk.color }}>●</div><div><strong>{report.state2.label} Volatility:</strong> CV = {report.state2.cv.toFixed(2)}%, Risk Index = {report.state2.volRisk.normalisedRisk.toFixed(2)}%.</div></div>
                  <div className="ra-interpret-item"><div className="ra-interp-dot" style={{ color: '#FFD700' }}>●</div><div><strong>Downside Risk:</strong> Producer DD = {report.state1.dsRisk.downsideRisk.toFixed(2)}% vs Consumer DD = {report.state2.dsRisk.downsideRisk.toFixed(2)}%.</div></div>
                  <div className="ra-interpret-item"><div className="ra-interp-dot" style={{ color: '#F44336' }}>●</div><div><strong>Shock Frequency:</strong> Producer = {report.state1.shockSummary.total}, Consumer = {report.state2.shockSummary.total} total shocks.</div></div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default RiskAnalysis;
