import React, { useState } from 'react';
import eggLogo from '../assets/egg_logo.svg';
import './Login.css';

const CLIENT_PERSONAS = [
  {
    email: 'farmer@namakkal-poultry.com',
    password: 'password123',
    name: 'Sengottai Perumal',
    role: 'Layer Farm Producer (50k Birds)',
    organization: 'Namakkal Poultry Producers Consortium',
    badge: '🌾 Layer Producer',
    desc: 'Farm-gate price optimization & SARIMA holding signals'
  },
  {
    email: 'trader@vashi-mandi.com',
    password: 'password123',
    name: 'Rajesh Gounder',
    role: 'Commercial Mandi Wholesaler',
    organization: 'Apex Poultry Logistics & Trading Co.',
    badge: '🏢 Mandi Wholesaler',
    desc: 'Bulk lot booking, trade database & spatial arbitrage'
  },
  {
    email: 'buyer@freshmart.in',
    password: 'password123',
    name: 'Ananya Rao',
    role: 'Procurement Director',
    organization: 'FreshMart Supermarkets India',
    badge: '🛒 Retail Buyer',
    desc: 'Contract benchmark auditing & delivery rate variance'
  },
  {
    email: 'admin@necc.com',
    password: 'admin123',
    name: 'NECC Administrator',
    role: 'Committee Executive & Analyst',
    organization: 'National Egg Coordination Committee',
    badge: '📊 NECC Executive',
    desc: 'National price stabilization & market integration'
  }
];

const PREVIEW_TICKERS = [
  { city: 'Delhi', price: '₹5.20', change: '+1.4%', up: true },
  { city: 'Namakkal', price: '₹4.85', change: '-0.8%', up: false },
  { city: 'Mumbai', price: '₹5.60', change: '+2.1%', up: true },
  { city: 'Barwala', price: '₹4.92', change: '+0.5%', up: true },
  { city: 'Hyderabad', price: '₹4.80', change: '0.0%', up: true },
  { city: 'Kolkata', price: '₹5.45', change: '+1.6%', up: true }
];

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleQuickLogin = (persona) => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onLogin(persona);
    }, 350);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    setTimeout(() => {
      setLoading(false);
      const matched = CLIENT_PERSONAS.find(
        (p) => p.email.toLowerCase() === email.toLowerCase() && p.password === password
      );

      if (matched) {
        onLogin(matched);
      } else if (password.length >= 4) {
        const customUser = {
          email,
          name: email.split('@')[0],
          role: 'Registered Poultry Client',
          organization: 'Independent Mandi Trader / Farm',
          badge: '👤 Client'
        };
        onLogin(customUser);
      } else {
        setError('Please enter a valid email and password (minimum 4 characters).');
      }
    }, 500);
  };

  return (
    <div className="login-terminal-wrapper">
      {/* Top mini-ticker */}
      <div className="login-ticker-tape">
        <span className="ticker-label">LIVE MANDI QUOTES</span>
        <div className="ticker-items">
          {PREVIEW_TICKERS.map((t, i) => (
            <span key={i} className="ticker-item">
              <strong className="ticker-city">{t.city}:</strong> {t.price}
              <span className={`ticker-delta ${t.up ? 'delta-up' : 'delta-down'}`}>
                {t.up ? '▲' : '▼'} {t.change}
              </span>
            </span>
          ))}
        </div>
      </div>

      <div className="login-split-container">
        {/* Left column: Institutional Terminal Presentation */}
        <div className="login-showcase-pane">
          <div className="showcase-brand">
            <img src={eggLogo} alt="NECC" className="showcase-logo" />
            <div>
              <h1 className="showcase-title">
                NECC <span className="highlight-gold">COMMODITY TERMINAL</span>
              </h1>
              <p className="showcase-tagline">
                Institutional Mandi Intelligence, Econometric Forecasting & Client Trade Execution
              </p>
            </div>
          </div>

          <div className="showcase-features">
            <div className="feature-item">
              <div className="feature-icon">⚡</div>
              <div>
                <h4>Official NECC Benchmark Parity</h4>
                <p>Real-time daily rates across 29 major Indian mandis with instant spread computation.</p>
              </div>
            </div>

            <div className="feature-item">
              <div className="feature-icon">⚖️</div>
              <div>
                <h4>Spatial Arbitrage Discovery</h4>
                <p>Calculate transport net margin between production belts (Namakkal/Barwala) and metro demand.</p>
              </div>
            </div>

            <div className="feature-item">
              <div className="feature-icon">🔮</div>
              <div>
                <h4>SARIMA Econometric Advisory</h4>
                <p>Actionable BUY / HOLD / DISPATCH signals projected with 95% confidence intervals.</p>
              </div>
            </div>

            <div className="feature-item">
              <div className="feature-icon">📁</div>
              <div>
                <h4>Client Trade Ledger Database</h4>
                <p>Log transactions offline-first in your private browser database with 1-click CSV export.</p>
              </div>
            </div>
          </div>

          <div className="showcase-footer-stat">
            <div className="mini-stat">
              <span className="stat-num">29 Mandis</span>
              <span className="stat-desc">Daily Coverage</span>
            </div>
            <div className="mini-stat">
              <span className="stat-num">₹149.11 B</span>
              <span className="stat-desc">National Annual Sector</span>
            </div>
            <div className="mini-stat">
              <span className="stat-num">95% CI</span>
              <span className="stat-desc">SARIMA Precision</span>
            </div>
          </div>
        </div>

        {/* Right column: Access / Login Card */}
        <div className="login-card-pane">
          <div className="terminal-card">
            <div className="card-header">
              <div className="terminal-badge">SECURE CLIENT ACCESS</div>
              <h2>Sign In to Workstation</h2>
              <p>Select a verified demo persona below or sign in with custom credentials</p>
            </div>

            {/* 1-Click Persona Switcher */}
            <div className="persona-selection-box">
              <div className="persona-box-title">
                <span>⚡ 1-CLICK DEMO PERSONAS</span>
                <span className="instant-tag">INSTANT ACCESS</span>
              </div>
              <div className="persona-grid">
                {CLIENT_PERSONAS.map((p) => (
                  <button
                    key={p.email}
                    type="button"
                    className="persona-btn"
                    onClick={() => handleQuickLogin(p)}
                    disabled={loading}
                  >
                    <div className="p-header">
                      <span className="p-badge">{p.badge}</span>
                      <span className="p-name">{p.name}</span>
                    </div>
                    <div className="p-desc">{p.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="divider-line">
              <span>OR ENTER CREDENTIALS</span>
            </div>

            <form onSubmit={handleSubmit} className="terminal-form">
              {error && <div className="terminal-error">{error}</div>}

              <div className="form-field">
                <label>Commercial Email Address</label>
                <input
                  type="email"
                  value={email}
                  placeholder="e.g. trader@vashi-mandi.com"
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-field">
                <label>Terminal Password</label>
                <input
                  type="password"
                  value={password}
                  placeholder="••••••••"
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="terminal-submit-btn" disabled={loading}>
                {loading ? 'Authenticating Terminal...' : 'Launch Client Terminal →'}
              </button>
            </form>

            <div className="terminal-security-note">
              🔒 End-to-end encrypted session | Trade records stored locally on client device
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
