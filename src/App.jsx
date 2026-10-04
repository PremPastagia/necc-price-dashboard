import React, { useState, useEffect } from 'react';
import './App.css';
import {
  stats2025,
  productionTrend,
  stateProduction,
  speciesDistribution,
  generatePriceTrend
} from './data/mockData';
import { TrendLine, PieChart, BarChart } from './components/Charts';
import { SelectionBar } from './components/Filters';
import { ForecastChart } from './components/ForecastChart';
import { ForecastControls } from './components/ForecastControls';
import MarketAnalysis from './components/MarketAnalysis';
import RiskAnalysis from './components/RiskAnalysis';
import Login from './components/Login';
import ClientDashboard from './components/ClientDashboard';
import { generateForecast, movingAverage } from './utils/forecasting';
import eggLogo from './assets/egg_logo.svg';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem('isLoggedIn') === 'true';
  });
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('currentUser');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });
  const [mode, setMode] = useState('daily'); // 'daily', 'trend', 'forecast', 'market-analysis', 'risk-analysis', 'client-portal'
  const [sheetType, setSheetType] = useState('daily'); // 'daily' or 'monthly'
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const monthStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [range, setRange] = useState({ start: monthStart, end: todayStr });
  const [currentTrend, setCurrentTrend] = useState([]);
  const [livePrices, setLivePrices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [trendLoading, setTrendLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Forecast state
  const [forecastDays, setForecastDays] = useState(5);
  const [forecastModel, setForecastModel] = useState('sarima');
  const [selectedCity, setSelectedCity] = useState('all');
  const [historicalData, setHistoricalData] = useState([]);
  const [forecastResult, setForecastResult] = useState({ forecast: [], metrics: {} });
  const [forecastLoading, setForecastLoading] = useState(false);
  const [availableCities, setAvailableCities] = useState([]);

  // Full daily data cache (used by Trends, Forecast, Market, Risk)
  const [fullDailyData, setFullDailyData] = useState(null);
  const [historyData, setHistoryData] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Filter prices based on search
  const filteredPrices = livePrices.filter(p =>
    p.city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate price stats
  const priceStats = livePrices.length > 0 ? {
    min: Math.min(...livePrices.map(p => p.price)),
    max: Math.max(...livePrices.map(p => p.price)),
    avg: (livePrices.reduce((sum, p) => sum + p.price, 0) / livePrices.length).toFixed(2),
    minCity: livePrices.find(p => p.price === Math.min(...livePrices.map(x => x.price)))?.city,
    maxCity: livePrices.find(p => p.price === Math.max(...livePrices.map(x => x.price)))?.city
  } : null;

  // ──────────────────────────────────────────────
  // FETCH 1: Basic live prices for price table
  // ──────────────────────────────────────────────
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const dateObj = new Date(selectedDate);
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const year = String(dateObj.getFullYear());
        const type = sheetType === 'monthly' ? 'Monthly Avg. Sheet' : 'Daily Rate Sheet';

        const response = await fetch(`/api/egg-prices?month=${month}&year=${year}&type=${encodeURIComponent(type)}`);
        const data = await response.json();
        if (Array.isArray(data)) {
          setLivePrices(data.map(d => ({
            city: d.city,
            price: d.price,
            avg: d.avg,
            tray30: d.price * 30,
            box180: d.price * 180
          })));
          setAvailableCities(data.map(d => d.city));
        }
      } catch (err) {
        console.error("Failed to fetch live data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedDate, sheetType]);

  // ──────────────────────────────────────────────
  // FETCH 2: Full daily data for Date Range (Trends tab)
  // ──────────────────────────────────────────────
  useEffect(() => {
    if (mode !== 'trend') return;
    const fetchFullData = async () => {
      setTrendLoading(true);
      try {
        const start = new Date(range.start);
        const end = new Date(range.end);
        
        let current = new Date(start.getFullYear(), start.getMonth(), 1);
        const endLimit = new Date(end.getFullYear(), end.getMonth(), 1);
        
        const promises = [];
        // Loop through every month within the range
        while (current <= endLimit) {
          const month = String(current.getMonth() + 1).padStart(2, '0');
          const year = String(current.getFullYear());
          promises.push(
            fetch(`/api/egg-prices?month=${month}&year=${year}&type=Daily+Rate+Sheet&format=full`).then(r => r.json())
          );
          current.setMonth(current.getMonth() + 1);
        }
        
        const responses = await Promise.all(promises);
        
        const dayMap = {};
        responses.forEach(data => {
            if (Array.isArray(data)) {
              data.forEach(city => {
                if (city.dailyPrices) {
                  city.dailyPrices.forEach(dp => {
                    const dpDate = new Date(dp.date);
                    // Filter dates strictly between range.start and range.end
                    if (dpDate >= start && dpDate <= end) {
                        if (!dayMap[dp.date]) dayMap[dp.date] = [];
                        dayMap[dp.date].push(dp.price);
                    }
                  });
                }
              });
            }
        });
        
        const trendData = Object.entries(dayMap)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, prices]) => ({
              date,
              price: (prices.reduce((s, p) => s + p, 0) / prices.length).toFixed(2)
            }));
            
        setCurrentTrend(trendData);
      } catch (err) {
        console.error("Failed to fetch full daily data:", err);
      } finally {
        setTrendLoading(false);
      }
    };
    fetchFullData();
  }, [mode, range]);

  // ──────────────────────────────────────────────
  // FETCH 3: Multi-month history (Forecast, Market Analysis, Risk Analysis)
  // ──────────────────────────────────────────────
  useEffect(() => {
    if (!['forecast', 'market-analysis', 'risk-analysis'].includes(mode)) return;
    if (historyData) return; // Already fetched

    const fetchHistory = async () => {
      setHistoryLoading(true);
      try {
        const response = await fetch(`/api/egg-prices-history?months=6`);
        const data = await response.json();
        if (Array.isArray(data)) {
          setHistoryData(data);
        }
      } catch (err) {
        console.error("Failed to fetch history:", err);
      } finally {
        setHistoryLoading(false);
      }
    };
    fetchHistory();
  }, [mode]);

  // ──────────────────────────────────────────────
  // PROCESS: Build forecast from actual NECC historical data
  // ──────────────────────────────────────────────
  useEffect(() => {
    if (mode !== 'forecast' || !historyData) return;

    const runForecast = async () => {
      setForecastLoading(true);

      try {
        // Extract daily prices for selected city (or average all cities)
        const historicalPrices = [];

        historyData.forEach(monthData => {
          if (!monthData.data || !Array.isArray(monthData.data)) return;

          monthData.data.forEach(city => {
            if (!city.dailyPrices) return;
            if (selectedCity !== 'all' && city.city !== selectedCity) return;

            city.dailyPrices.forEach(dp => {
              historicalPrices.push({ date: dp.date, price: dp.price, city: city.city });
            });
          });
        });

        // If "all cities", average prices per day
        let processedData;
        if (selectedCity === 'all') {
          const dayMap = {};
          historicalPrices.forEach(hp => {
            if (!dayMap[hp.date]) dayMap[hp.date] = [];
            dayMap[hp.date].push(hp.price);
          });
          processedData = Object.entries(dayMap)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, prices]) => ({
              date,
              price: parseFloat((prices.reduce((s, p) => s + p, 0) / prices.length).toFixed(2))
            }));
        } else {
          processedData = historicalPrices
            .filter(hp => hp.city === selectedCity)
            .sort((a, b) => a.date.localeCompare(b.date))
            .map(hp => ({ date: hp.date, price: typeof hp.price === 'number' ? hp.price : parseFloat(hp.price) }));
        }

        setHistoricalData(processedData);

        if (processedData.length < 3) {
          setForecastLoading(false);
          return;
        }

        // ── SARIMA: Call Python backend ──
        if (forecastModel === 'sarima') {
          try {
            const response = await fetch('/api/forecast-sarima', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                prices: processedData.map(d => d.price),
                dates: processedData.map(d => d.date),
                forecastDays: forecastDays
              })
            });
            const sarimaResult = await response.json();

            if (sarimaResult.error || sarimaResult.fallback) {
              // Fallback to JS seasonal model
              console.warn('SARIMA fallback:', sarimaResult.error);
              const fallback = generateForecast(
                processedData.map(d => ({ date: d.date, price: d.price.toFixed(2) })),
                forecastDays, 'seasonal'
              );
              setForecastResult(fallback);
            } else {
              setForecastResult(sarimaResult);
            }
          } catch (apiErr) {
            console.error('SARIMA API error:', apiErr);
            // Fallback
            const fallback = generateForecast(
              processedData.map(d => ({ date: d.date, price: d.price.toFixed(2) })),
              forecastDays, 'seasonal'
            );
            setForecastResult(fallback);
          }
        } else {
          // ── JS Models (seasonal, wma, ets) ──
          const result = generateForecast(
            processedData.map(d => ({ date: d.date, price: d.price.toFixed(2) })),
            forecastDays, forecastModel
          );
          setForecastResult(result);
        }
      } catch (err) {
        console.error("Failed to process forecast data:", err);
      } finally {
        setForecastLoading(false);
      }
    };

    runForecast();
  }, [mode, historyData, selectedCity, forecastDays, forecastModel]);

  const handleLogin = (userData) => {
    localStorage.setItem('isLoggedIn', 'true');
    if (userData) {
      localStorage.setItem('currentUser', JSON.stringify(userData));
      setCurrentUser(userData);
    }
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('currentUser');
    setCurrentUser(null);
    setIsLoggedIn(false);
  };

  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="app-container">
      {/* Header */}
      <header className="main-header animate-in">
        <div className="logo">
          <img src={eggLogo} alt="NECC Logo" className="logo-img" />
          <span className="logo-text">NECC <span className="highlight">EGGPRICE</span></span>
        </div>
        <nav>
          <button
            className={`nav-mode-btn ${mode === 'client-portal' ? 'active' : ''}`}
            onClick={() => { setMode('client-portal'); document.getElementById('stats')?.scrollIntoView({ behavior: 'smooth' }); }}
            style={{
              background: mode === 'client-portal' ? 'linear-gradient(135deg, #FFD700 0%, #FFA000 100%)' : 'rgba(255,255,255,0.08)',
              color: mode === 'client-portal' ? '#0D1137' : '#FFD700',
              border: '1px solid rgba(255,215,0,0.35)',
              padding: '6px 14px',
              borderRadius: '20px',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              boxShadow: mode === 'client-portal' ? '0 0 15px rgba(255,215,0,0.4)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            💼 Client Trade Hub
          </button>
          <a href="#stats" onClick={() => setMode('daily')}>Statistics</a>
          <a href="#insights" onClick={() => setMode('market-analysis')}>Insights</a>
          <a href="#prices">Live Prices</a>
          {currentUser && (
            <span style={{ fontSize: '0.8rem', color: '#FFD700', background: 'rgba(255,215,0,0.1)', padding: '5px 12px', borderRadius: '20px', border: '1px solid rgba(255,215,0,0.25)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span>👤</span>
              <strong>{currentUser.name}</strong>
              <span style={{ opacity: 0.7, fontSize: '0.75rem' }}>({currentUser.badge || currentUser.role})</span>
            </span>
          )}
          <button className="cta-btn" onClick={handleLogout}>Logout</button>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="hero-section section-container">
        <div className="hero-content animate-in">
          <h1 className="floating">Revolutionizing <span className="gradient-text">Poultry Insights</span></h1>
          <p className="hero-subtitle">Providing transparent, data-driven decision making for the Indian poultry sector since 1982.</p>

          <div className="hero-stats">
            <div className="stat-card glass-card">
              <span className="stat-value">{stats2025.totalProduction} B</span>
              <span className="stat-label">Total Production (24-25)</span>
            </div>
            <div className="stat-card glass-card">
              <span className="stat-value">{stats2025.globalRank}</span>
              <span className="stat-label">Global Rank (FAO)</span>
            </div>
            <div className="stat-card glass-card">
              <span className="stat-value">{stats2025.perCapita}</span>
              <span className="stat-label">Per Capita Availability</span>
            </div>
          </div>
        </div>
      </section>

      {/* Selection Section */}
      <section className="selection-section section-container" id="stats">
        <h2 className="section-title">Market Intelligence</h2>
        <SelectionBar
          mode={mode}
          setMode={setMode}
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          range={range}
          onRangeChange={setRange}
        />

        <div className="visual-grid animate-in">
          {mode === 'client-portal' ? (
            <div className="visual-card glass-card span-2" style={{ padding: '0', background: 'transparent', border: 'none' }}>
              <ClientDashboard livePrices={livePrices} availableCities={availableCities} user={currentUser} />
            </div>
          ) : mode === 'daily' ? (
            <>
              <div className="visual-card glass-card">
                <h3>State-wise Contribution</h3>
                <div className="pie-container">
                  <PieChart data={stateProduction} />
                  <div className="legend">
                    {stateProduction.slice(0, 5).map(s => (
                      <div key={s.name} className="legend-item">
                        <span className="dot" style={{ backgroundColor: s.color }}></span>
                        <span>{s.name} ({s.percentage}%)</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="visual-card glass-card">
                <h3>Production Growth (Billion No.)</h3>
                <BarChart data={productionTrend} />
              </div>
            </>
          ) : mode === 'trend' ? (
            <div className="visual-card glass-card span-2">
              <h3>Price Trend Timeline — Actual NECC Daily Prices (₹ per Egg) {trendLoading && <span className="loader-small">⚡ Fetching from NECC...</span>}</h3>
              <div className="trend-container">
                {trendLoading ? (
                  <div style={{ textAlign: 'center', padding: '80px', color: 'var(--text-dim)' }}>
                    <div className="loading-spinner" style={{ margin: '0 auto 20px' }}></div>
                    Fetching actual daily prices from NECC for this month...
                  </div>
                ) : (
                  <TrendLine data={currentTrend} color="var(--primary)" width={800} height={300} />
                )}
              </div>
              {!trendLoading && currentTrend.length > 0 && (
                <div className="forecast-description" style={{ marginTop: '20px' }}>
                  <p>
                    <strong>📊 Data Source:</strong> Average daily egg prices across all production & consumption centres, 
                    scraped from NECC (e2necc.com). Showing {currentTrend.length} days of actual price data.
                  </p>
                </div>
              )}
            </div>
          ) : mode === 'market-analysis' ? (
            <div className="visual-card glass-card span-2">
              <MarketAnalysis 
                livePrices={livePrices} 
                loading={loading} 
                historyData={historyData}
                historyLoading={historyLoading}
              />
            </div>
          ) : mode === 'risk-analysis' ? (
            <div className="visual-card glass-card span-2">
              <RiskAnalysis 
                livePrices={livePrices} 
                loading={loading}
                historyData={historyData}
                historyLoading={historyLoading}
              />
            </div>
          ) : (
            <div className="visual-card glass-card span-2 forecast-section">
              <h3>
                <span className="forecast-title-icon">🔮</span>
                Price Prediction — Based on Actual NECC Data
                {(forecastLoading || historyLoading) && <span className="loader-small">⚡ {historyLoading ? 'Fetching 6 months of NECC data...' : 'Building forecast model...'}</span>}
              </h3>

              <ForecastControls
                forecastDays={forecastDays}
                setForecastDays={setForecastDays}
                selectedCity={selectedCity}
                setSelectedCity={setSelectedCity}
                cities={availableCities}
                metrics={forecastResult.metrics}
                model={forecastModel}
                setModel={setForecastModel}
              />

              <div className="forecast-chart-container">
                {(forecastLoading || historyLoading) ? (
                  <div className="forecast-loading">
                    <div className="loading-spinner"></div>
                    <p>{historyLoading ? 'Fetching 6 months of actual NECC price data...' : forecastModel === 'sarima' ? '🔬 Running SARIMA model via Python statsmodels...' : 'Analyzing historical data and generating predictions...'}</p>
                  </div>
                ) : (
                  <ForecastChart
                    historicalData={historicalData}
                    forecastData={forecastResult.forecast}
                    width={900}
                    height={350}
                  />
                )}
              </div>

              <div className="forecast-description">
                <p>
                  <strong>📊 Model:</strong> This forecast uses
                  {forecastModel === 'sarima' ? ' SARIMA (Seasonal AutoRegressive Integrated Moving Average) via Python statsmodels' :
                    forecastModel === 'seasonal' ? ' Seasonal Decomposition' :
                    forecastModel === 'wma' ? ' Weighted Moving Average' :
                      ' Exponential Smoothing'} on <strong>actual NECC price data</strong> from the last 6 months
                  to predict the next {forecastDays} days of egg prices. The shaded area represents the 95% confidence interval.
                </p>
                {forecastResult.diagnostics && (
                  <p style={{ marginTop: '10px', fontSize: '0.85rem', color: 'var(--text-dim)' }}>
                    <strong>📐 Diagnostics:</strong> {forecastResult.diagnostics.model} | 
                    AIC: {forecastResult.diagnostics.aic} | 
                    BIC: {forecastResult.diagnostics.bic} | 
                    R²: {forecastResult.diagnostics.rSquared} | 
                    Data points: {forecastResult.diagnostics.dataPoints} | 
                    Seasonal period: {forecastResult.diagnostics.seasonalPeriod} days
                    {forecastResult.diagnostics.ljungBoxPValue !== null && ` | Ljung-Box p: ${forecastResult.diagnostics.ljungBoxPValue}`}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Price Board */}
      <section className="price-section section-container" id="prices">
        <div className="price-header">
          <h2 className="section-title">
            {sheetType === 'monthly' ? 'Monthly Average Prices' : 'Daily Suggested Prices'}
            {loading && <span className="loader-small">⚡ Fetching...</span>}
          </h2>
          <div className="sheet-toggle">
            <button
              className={`toggle-btn ${sheetType === 'daily' ? 'active' : ''}`}
              onClick={() => setSheetType('daily')}
            >
              📅 Daily
            </button>
            <button
              className={`toggle-btn ${sheetType === 'monthly' ? 'active' : ''}`}
              onClick={() => setSheetType('monthly')}
            >
              📊 Monthly Avg
            </button>
          </div>
        </div>
        <div className="search-bar">
          <input
            type="text"
            placeholder="🔍 Search city..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          <span className="result-count">{filteredPrices.length} cities</span>
        </div>

        {priceStats && (
          <div className="quick-stats">
            <div className="quick-stat lowest">
              <span className="qs-label">📉 Lowest</span>
              <span className="qs-value">₹{priceStats.min.toFixed(2)}</span>
              <span className="qs-city">{priceStats.minCity}</span>
            </div>
            <div className="quick-stat average">
              <span className="qs-label">📊 Average</span>
              <span className="qs-value">₹{priceStats.avg}</span>
              <span className="qs-city">All Cities</span>
            </div>
            <div className="quick-stat highest">
              <span className="qs-label">📈 Highest</span>
              <span className="qs-value">₹{priceStats.max.toFixed(2)}</span>
              <span className="qs-city">{priceStats.maxCity}</span>
            </div>
          </div>
        )}

        <div className="price-table-container glass-panel animate-in">
          <table className="price-table">
            <thead>
              <tr>
                <th>Production Center</th>
                <th>{sheetType === 'monthly' ? 'Monthly Avg (1 Pc)' : 'Price (1 Pc)'}</th>
                <th>Tray (30 Pc)</th>
                <th>Box (180 Pc)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '40px' }}>⚡ Loading live data from NECC...</td></tr>
              ) : filteredPrices.length > 0 ? (
                filteredPrices.map(p => (
                  <tr key={p.city}>
                    <td>{p.city}</td>
                    <td className="price-primary">₹ {p.price.toFixed(2)}</td>
                    <td>₹ {p.tray30.toFixed(2)}</td>
                    <td>₹ {p.box180.toFixed(0)}</td>
                    <td><span className={`tag-${sheetType === 'monthly' ? 'monthly' : 'up'}`}>● {sheetType === 'monthly' ? 'Avg' : 'Live'}</span></td>
                  </tr>
                ))
              ) : livePrices.length > 0 ? (
                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '40px' }}>No cities match "{searchQuery}"</td></tr>
              ) : (
                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '40px' }}>Select a date to fetch live prices</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Species Distribution */}
      <section className="insights-section section-container" id="insights">
        <div className="split-view">
          <div className="insight-text">
            <h2>Species-wise Contribution</h2>
            <p>A detailed breakdown of egg production across various fowl and duck species in the 2024-25 fiscal year.</p>
            <div className="species-list">
              {speciesDistribution.map(s => (
                <div key={s.name} className="species-item">
                  <span className="s-name">{s.name}</span>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${s.percentage}%` }}></div>
                  </div>
                  <span className="s-val">{s.percentage}%</span>
                </div>
              ))}
            </div>
          </div>
          <div className="insight-visual floating">
            <div className="egg-3d">🥚</div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="main-footer section-container">
        <p className="disclaimer">
          <strong>Disclaimer:</strong> The daily egg prices suggested by NECC are merely suggestive and not mandatory.
          They are published solely for the reference and information of the trade and industry.
        </p>
        <div className="footer-bottom">
          <span>&copy; 2026 NECC Dashboard. Live data from e2necc.com.</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
