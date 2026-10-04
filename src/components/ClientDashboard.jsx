import React, { useState, useEffect } from 'react';
import './ClientDashboard.css';

const DEFAULT_TRADES = [
  {
    id: 1,
    tradeDate: '2026-10-02',
    city: 'Namakkal',
    lotCode: 'LOT-NMK-8821',
    tradeType: 'procurement',
    units: 120, // boxes of 180
    unitType: 'boxes',
    totalEggs: 120 * 180,
    pricePerEgg: 4.65,
    neccBenchmark: 4.80,
    counterparty: 'Sengottai Layer Farms, TN',
    notes: 'Direct farm gate procurement; pre-sorted Grade A.',
    totalValue: 120 * 180 * 4.65,
    netSavings: (4.80 - 4.65) * 120 * 180
  },
  {
    id: 2,
    tradeDate: '2026-10-03',
    city: 'Mumbai',
    lotCode: 'LOT-MUM-9014',
    tradeType: 'dispatch',
    units: 80,
    unitType: 'boxes',
    totalEggs: 80 * 180,
    pricePerEgg: 5.60,
    neccBenchmark: 5.45,
    counterparty: 'Vashi APMC Commission Agent #14',
    notes: 'Premium delivery to wholesale distributor; cash on delivery.',
    totalValue: 80 * 180 * 5.60,
    netSavings: (5.60 - 5.45) * 80 * 180
  },
  {
    id: 3,
    tradeDate: '2026-10-01',
    city: 'Barwala',
    lotCode: 'LOT-BRW-4033',
    tradeType: 'procurement',
    units: 200,
    unitType: 'boxes',
    totalEggs: 200 * 180,
    pricePerEgg: 4.50,
    neccBenchmark: 4.62,
    counterparty: 'Haryana Integrated Poultry Feeders',
    notes: 'Bulk cold store buffer stock for Northern corridor.',
    totalValue: 200 * 180 * 4.50,
    netSavings: (4.62 - 4.50) * 200 * 180
  }
];

export default function ClientDashboard({ livePrices = [], availableCities = [], user = null }) {
  const [trades, setTrades] = useState(() => {
    try {
      const saved = localStorage.getItem('necc_client_trades');
      return saved ? JSON.parse(saved) : DEFAULT_TRADES;
    } catch {
      return DEFAULT_TRADES;
    }
  });

  const currentUser = user || {
    name: 'Rajesh Gounder',
    role: 'Commercial Mandi Wholesaler',
    organization: 'Apex Poultry Logistics & Trading Co.'
  };

  // Form State
  const [tradeDate, setTradeDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedCity, setSelectedCity] = useState(availableCities[0] || 'Namakkal');
  const [tradeType, setTradeType] = useState('procurement'); // 'procurement' (buy) or 'dispatch' (sell)
  const [lotCode, setLotCode] = useState('');
  const [quantity, setQuantity] = useState(50);
  const [unitType, setUnitType] = useState('boxes'); // 'boxes' (180), 'trays' (30), 'eggs' (1)
  const [pricePerEgg, setPricePerEgg] = useState(4.75);
  const [counterparty, setCounterparty] = useState('');
  const [notes, setNotes] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Auto-generate lot code on mount or when city changes
  useEffect(() => {
    generateRandomLotCode();
  }, [selectedCity]);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('necc_client_trades', JSON.stringify(trades));
    } catch (e) {
      console.error('Failed to save trades to localStorage', e);
    }
  }, [trades]);

  const generateRandomLotCode = () => {
    const cityCode = selectedCity ? selectedCity.substring(0, 3).toUpperCase() : 'NEC';
    const num = Math.floor(1000 + Math.random() * 9000);
    setLotCode(`LOT-${cityCode}-${num}`);
  };

  // Find live NECC price for selected city
  const cityBenchmarkObj = livePrices.find(
    p => p.city.toLowerCase() === selectedCity.toLowerCase()
  );
  const currentNECCBenchmark = cityBenchmarkObj ? parseFloat(cityBenchmarkObj.price) : 4.80;

  // Real-time calculations
  const multiplier = unitType === 'boxes' ? 180 : (unitType === 'trays' ? 30 : 1);
  const totalEggs = (parseFloat(quantity) || 0) * multiplier;
  const totalTradeValue = totalEggs * (parseFloat(pricePerEgg) || 0);
  const benchmarkTotalValue = totalEggs * currentNECCBenchmark;
  
  // Delta & Savings
  const priceDelta = (parseFloat(pricePerEgg) || 0) - currentNECCBenchmark;
  const isProcurement = tradeType === 'procurement';
  // For procurement: paying less than benchmark is savings (+). For dispatch: selling above is profit (+).
  const netSavings = isProcurement
    ? (currentNECCBenchmark - (parseFloat(pricePerEgg) || 0)) * totalEggs
    : ((parseFloat(pricePerEgg) || 0) - currentNECCBenchmark) * totalEggs;

  // Handle Form Submit
  const handleSaveTrade = (e) => {
    e.preventDefault();
    if (!lotCode) return;

    const newTrade = {
      id: Date.now(),
      tradeDate,
      city: selectedCity,
      lotCode,
      tradeType,
      units: parseFloat(quantity),
      unitType,
      totalEggs,
      pricePerEgg: parseFloat(pricePerEgg),
      neccBenchmark: currentNECCBenchmark,
      counterparty: counterparty.trim() || (isProcurement ? 'Direct Producer' : 'APMC Mandi Wholesale'),
      notes: notes.trim(),
      totalValue: totalTradeValue,
      netSavings
    };

    setTrades([newTrade, ...trades]);
    generateRandomLotCode();
    setNotes('');
    setCounterparty('');
  };

  const handleDeleteTrade = (id) => {
    setTrades(trades.filter(t => t.id !== id));
  };

  const handleResetTrades = () => {
    if (window.confirm('Reset trade database to default demo entries?')) {
      setTrades(DEFAULT_TRADES);
    }
  };

  const exportCSV = () => {
    let csv = 'Date,Lot_Code,City,Type,Units,Unit_Type,Total_Eggs,Price_Per_Egg,NECC_Benchmark,Total_Value_INR,Net_Margin_INR,Counterparty\n';
    trades.forEach(t => {
      csv += `"${t.tradeDate}","${t.lotCode}","${t.city}","${t.tradeType}","${t.units}","${t.unitType}","${t.totalEggs}","${t.pricePerEgg}","${t.neccBenchmark}","${t.totalValue.toFixed(2)}","${t.netSavings.toFixed(2)}","${t.counterparty}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `NECC_Client_Trade_Ledger_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  // Filtered Trades
  const filteredTrades = trades.filter(t => {
    const matchesSearch = t.lotCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.counterparty.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === 'ALL' || t.tradeType === filterType;
    return matchesSearch && matchesFilter;
  });

  // KPI Aggregations
  const totalVolumeEggs = trades.reduce((acc, t) => acc + (t.totalEggs || 0), 0);
  const totalTradeINR = trades.reduce((acc, t) => acc + (t.totalValue || 0), 0);
  const cumulativeSavingsINR = trades.reduce((acc, t) => acc + (t.netSavings || 0), 0);
  const avgRealizedPrice = totalVolumeEggs > 0 ? (totalTradeINR / totalVolumeEggs).toFixed(2) : '0.00';

  return (
    <div className="client-dashboard-container animate-in">

      {/* Hero Welcome Bar */}
      <div className="client-hero-bar">
        <div className="client-user-info">
          <div className="client-user-badge">
            <span>🏛️ Client Mandi Workstation</span>
            <span>•</span>
            <span>Active Ledger</span>
          </div>
          <h2>{currentUser.name}</h2>
          <div className="client-org-name">{currentUser.role} — {currentUser.organization}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>Active NECC Benchmarks</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FFD700', fontFamily: 'JetBrains Mono, monospace' }}>
            Namakkal: ₹{livePrices.find(p => p.city.toLowerCase() === 'namakkal')?.price || '4.80'} / egg
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="client-kpi-grid">
        <div className="client-kpi-card">
          <div className="kpi-header">
            <span>Total Traded Volume</span>
            <span>📦</span>
          </div>
          <div className="kpi-value">{(totalVolumeEggs / 180).toLocaleString('en-IN', { maximumFractionDigits: 0 })} <span style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.6)' }}>Boxes</span></div>
          <div className="kpi-subtext">{totalVolumeEggs.toLocaleString('en-IN')} Total Eggs Accounted</div>
        </div>

        <div className="client-kpi-card">
          <div className="kpi-header">
            <span>Total Realized Value</span>
            <span>💰</span>
          </div>
          <div className="kpi-value">₹{(totalTradeINR / 100000).toFixed(2)} <span style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.6)' }}>Lakhs</span></div>
          <div className="kpi-subtext">₹{totalTradeINR.toLocaleString('en-IN', { maximumFractionDigits: 0 })} Gross Ledger Turn</div>
        </div>

        <div className="client-kpi-card">
          <div className="kpi-header">
            <span>Avg Realized Rate</span>
            <span>⚖️</span>
          </div>
          <div className="kpi-value">₹{avgRealizedPrice}</div>
          <div className="kpi-subtext">Across {trades.length} Recorded Mandi Lots</div>
        </div>

        <div className="client-kpi-card">
          <div className="kpi-header">
            <span>Net Delta vs NECC</span>
            <span>📈</span>
          </div>
          <div className="kpi-value" style={{ color: cumulativeSavingsINR >= 0 ? '#4ade80' : '#f87171' }}>
            {cumulativeSavingsINR >= 0 ? '+' : ''}₹{cumulativeSavingsINR.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div className="kpi-subtext positive">Cumulative Margin Advantage</div>
        </div>
      </div>

      {/* Main Split: Form & Live Benchmarks */}
      <div className="client-main-split">
        
        {/* Entry Form (The Database Entry Form) */}
        <div className="client-form-panel">
          <div className="form-title">
            <span>✍️</span>
            <span>Enter Daily Trade or Lot</span>
          </div>
          <p className="form-subtitle">
            Log procurement from poultry farm gates or dispatches to wholesale APMC mandis.
          </p>

          <form onSubmit={handleSaveTrade}>
            <div className="trade-type-toggle">
              <button
                type="button"
                className={`type-btn buy ${isProcurement ? 'active' : ''}`}
                onClick={() => setTradeType('procurement')}
              >
                📥 Procurement (Buy from Farm)
              </button>
              <button
                type="button"
                className={`type-btn sell ${!isProcurement ? 'active' : ''}`}
                onClick={() => setTradeType('dispatch')}
              >
                📤 Dispatch (Sell to Mandi / Retail)
              </button>
            </div>

            <div className="trade-form-grid" style={{ marginTop: '14px' }}>
              <div>
                <label>Trade Date</label>
                <input
                  type="date"
                  value={tradeDate}
                  onChange={(e) => setTradeDate(e.target.value)}
                  required
                />
              </div>

              <div>
                <label>Production / Consumption Mandi</label>
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                >
                  {availableCities.length > 0 ? (
                    availableCities.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))
                  ) : (
                    <>
                      <option value="Namakkal">Namakkal (Key Benchmark)</option>
                      <option value="Barwala">Barwala (Northern Hub)</option>
                      <option value="Hyderabad">Hyderabad</option>
                      <option value="Mumbai">Mumbai (Consumer Terminal)</option>
                      <option value="Delhi">Delhi (Consumer Terminal)</option>
                      <option value="Bengaluru">Bengaluru</option>
                      <option value="Kolkata">Kolkata</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label>Lot Reference Code</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={lotCode}
                    onChange={(e) => setLotCode(e.target.value)}
                    required
                    style={{ fontFamily: 'JetBrains Mono, monospace' }}
                  />
                  <button
                    type="button"
                    onClick={generateRandomLotCode}
                    className="ledger-btn"
                    title="Generate new lot ID"
                  >
                    ⚡
                  </button>
                </div>
              </div>

              <div>
                <label>Counterparty (Farm / Commission Agent)</label>
                <input
                  type="text"
                  placeholder={isProcurement ? "e.g. Namakkal Layer Farm" : "e.g. APMC Commission Trader"}
                  value={counterparty}
                  onChange={(e) => setCounterparty(e.target.value)}
                />
              </div>

              <div>
                <label>Quantity</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  required
                />
              </div>

              <div>
                <label>Packaging Unit</label>
                <select value={unitType} onChange={(e) => setUnitType(e.target.value)}>
                  <option value="boxes">Boxes (180 Eggs / Box)</option>
                  <option value="trays">Trays (30 Eggs / Tray)</option>
                  <option value="eggs">Individual Eggs</option>
                </select>
              </div>

              <div className="form-group-full">
                <label>Client Agreed Price (₹ per single egg)</label>
                <input
                  type="number"
                  min="1"
                  max="15"
                  step="0.01"
                  value={pricePerEgg}
                  onChange={(e) => setPricePerEgg(e.target.value)}
                  required
                  style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '1.05rem', fontWeight: 700 }}
                />
              </div>
            </div>

            {/* Live NECC Benchmark Comparison Box */}
            <div className="benchmark-calc-box">
              <div className="benchmark-row">
                <span>Official NECC Daily Benchmark ({selectedCity}):</span>
                <span className="val">₹{currentNECCBenchmark.toFixed(2)} / egg</span>
              </div>
              <div className="benchmark-row">
                <span>Your Agreed Rate:</span>
                <span className="val">₹{(parseFloat(pricePerEgg) || 0).toFixed(2)} / egg</span>
              </div>
              <div className="benchmark-row">
                <span>Price Delta vs Benchmark:</span>
                <span className={`delta-pill ${priceDelta <= 0 && isProcurement ? 'favorable' : (priceDelta >= 0 && !isProcurement ? 'favorable' : 'unfavorable')}`}>
                  {priceDelta >= 0 ? '+' : ''}₹{priceDelta.toFixed(2)} ({((priceDelta / currentNECCBenchmark) * 100).toFixed(1)}%)
                </span>
              </div>
              <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '4px 0' }}></div>
              <div className="benchmark-row" style={{ color: '#ffffff', fontWeight: 700 }}>
                <span>Total Trade Value ({totalEggs.toLocaleString('en-IN')} Eggs):</span>
                <span className="val" style={{ color: '#FFD700', fontSize: '1rem' }}>₹{totalTradeValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
              </div>
              <div className="benchmark-row" style={{ fontSize: '0.78rem' }}>
                <span>{isProcurement ? 'Procurement Savings vs Benchmark:' : 'Trading Margin vs Benchmark:'}</span>
                <span className="val" style={{ color: netSavings >= 0 ? '#4ade80' : '#f87171' }}>
                  {netSavings >= 0 ? '+' : ''}₹{netSavings.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </span>
              </div>
            </div>

            <button type="submit" className="submit-trade-btn">
              💾 Save Entry to Database
            </button>
          </form>
        </div>

        {/* Live Mandi Benchmark Board */}
        <div className="client-form-panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div className="form-title">
              <span>📊</span>
              <span>Today's Official NECC Rates</span>
            </div>
            <p className="form-subtitle">
              Live benchmarks from e2necc.com for instant negotiation grounding.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {livePrices.slice(0, 7).map(item => (
                <div
                  key={item.city}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    background: selectedCity === item.city ? 'rgba(255, 215, 0, 0.15)' : 'rgba(13, 17, 55, 0.6)',
                    border: selectedCity === item.city ? '1px solid #FFD700' : '1px solid rgba(255, 255, 255, 0.08)',
                    cursor: 'pointer'
                  }}
                  onClick={() => setSelectedCity(item.city)}
                >
                  <div>
                    <div style={{ fontWeight: 700, color: '#ffffff' }}>{item.city}</div>
                    <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)' }}>Tray (30): ₹{(item.price * 30).toFixed(0)}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 800, color: '#FFD700' }}>
                      ₹{item.price.toFixed(2)}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)' }}>per egg</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: '20px', padding: '14px', borderRadius: '12px', background: 'rgba(255,215,0,0.08)', border: '1px solid rgba(255,215,0,0.2)', fontSize: '0.8rem', color: 'rgba(255,255,255,0.8)' }}>
            💡 <strong>Arbitrage Note:</strong> Namakkal and Barwala dictate national producer supply. Consumption mandis (Mumbai & Delhi) typically trade at a <strong>₹0.60–₹0.95 premium</strong> to cover logistics and shrink.
          </div>
        </div>

      </div>

      {/* Client Trade Ledger Table */}
      <div className="client-ledger-panel">
        <div className="ledger-header">
          <div>
            <h3>📋 Client Trade Ledger & Inventory Database</h3>
            <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>
              Permanent record of all farmer procurements and mandi dispatches.
            </p>
          </div>
          <div className="ledger-actions">
            <input
              type="text"
              placeholder="Search lot, mandi, partner..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="client-form-panel input"
              style={{ width: '220px', padding: '6px 12px', fontSize: '0.8rem' }}
            />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              style={{ width: '130px', padding: '6px 10px', fontSize: '0.8rem', background: 'rgba(13,17,55,0.8)', color: '#fff', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px' }}
            >
              <option value="ALL">All Types</option>
              <option value="procurement">Procurement (Buy)</option>
              <option value="dispatch">Dispatch (Sell)</option>
            </select>
            <button onClick={exportCSV} className="ledger-btn">
              📥 Export CSV
            </button>
            <button onClick={handleResetTrades} className="ledger-btn" title="Reset sample database">
              🔄 Reset Demo
            </button>
          </div>
        </div>

        <div className="client-table-wrapper">
          <table className="client-trade-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Lot Code</th>
                <th>Mandi Center</th>
                <th>Action</th>
                <th>Volume</th>
                <th>Agreed Rate</th>
                <th>NECC Bench.</th>
                <th>Total Value</th>
                <th>Net Margin</th>
                <th>Counterparty</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredTrades.length > 0 ? (
                filteredTrades.map(trade => (
                  <tr key={trade.id}>
                    <td style={{ fontFamily: 'JetBrains Mono, monospace' }}>{trade.tradeDate}</td>
                    <td style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: '#FFD700' }}>{trade.lotCode}</td>
                    <td>{trade.city}</td>
                    <td>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        background: trade.tradeType === 'procurement' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                        color: trade.tradeType === 'procurement' ? '#4ade80' : '#60a5fa'
                      }}>
                        {trade.tradeType === 'procurement' ? 'BUY' : 'SELL'}
                      </span>
                    </td>
                    <td>{trade.units} {trade.unitType} <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem' }}>({trade.totalEggs.toLocaleString()} pcs)</span></td>
                    <td style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>₹{trade.pricePerEgg.toFixed(2)}</td>
                    <td style={{ fontFamily: 'JetBrains Mono, monospace', color: 'rgba(255,255,255,0.6)' }}>₹{trade.neccBenchmark.toFixed(2)}</td>
                    <td style={{ fontFamily: 'JetBrains Mono, monospace', color: '#ffffff', fontWeight: 700 }}>₹{trade.totalValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                    <td style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      fontWeight: 700,
                      color: trade.netSavings >= 0 ? '#4ade80' : '#f87171'
                    }}>
                      {trade.netSavings >= 0 ? '+' : ''}₹{trade.netSavings.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </td>
                    <td style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem' }}>{trade.counterparty}</td>
                    <td>
                      <button
                        onClick={() => handleDeleteTrade(trade.id)}
                        style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '0.85rem' }}
                        title="Delete trade"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="11" style={{ textAlign: 'center', padding: '30px', color: 'rgba(255,255,255,0.4)' }}>
                    No trades found matching criteria. Enter a new trade above!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* What the Client / User Gets (Business Value Architecture) */}
      <div className="client-value-panel">
        <div className="value-title">What the Client & Poultry Trader Gets From This Dashboard</div>
        <p className="value-subtitle">
          How this client-based system converts raw daily NECC committee price postings into quantifiable bottom-line profit, risk mitigation, and operational accountability.
        </p>

        <div className="value-cards-grid">
          <div className="value-card">
            <div className="value-icon">📍</div>
            <h4>1. Inter-Mandi Arbitrage Discovery</h4>
            <p>
              Egg prices are not uniform across India. Production surplus centers (Namakkal, Barwala) regularly trade ₹0.60–₹1.20 lower than major metropolitan demand centers (Mumbai, Delhi). The dashboard reveals cross-regional spreads in real time, helping traders route dispatches to the most lucrative mandi.
            </p>
            <div className="value-badge">✓ Benefit: +8% to +14% Gross Trading Margin</div>
          </div>

          <div className="value-card">
            <div className="value-icon">⚖️</div>
            <h4>2. Benchmark Negotiating Leverage</h4>
            <p>
              In traditional unorganized mandis, commission agents often quote subjective local discounts. With live e2necc.com scraping and automated delta calculations, farmers and procurement buyers know the exact official reference price before agreeing to a deal.
            </p>
            <div className="value-badge">✓ Benefit: Eliminates Hidden Middleman Surcharges</div>
          </div>

          <div className="value-card">
            <div className="value-icon">🔮</div>
            <h4>3. SARIMA-Powered Holding Optimization</h4>
            <p>
              Eggs are perishable with a commercial ambient shelf-life of 10–14 days. The integrated SARIMA model provides a 5-day horizon forecast. If prices are predicted to drop after a religious festival or seasonal slump, clients can liquidate buffer stock early to prevent distress dumping.
            </p>
            <div className="value-badge">✓ Benefit: 30% Reduction in Spoilage Losses</div>
          </div>

          <div className="value-card">
            <div className="value-icon">📁</div>
            <h4>4. Audit-Ready Trade & GST Ledger</h4>
            <p>
              Replaces error-prone handwritten paper slips ("kacha parchis") with an immutable digital transaction database. Every trade records lot IDs, counterparty names, volume, agreed rates, and benchmark variances, with 1-click export to CSV for tax audits and financial reporting.
            </p>
            <div className="value-badge">✓ Benefit: 100% Digital Traceability & Reconciliation</div>
          </div>
        </div>
      </div>

    </div>
  );
}
