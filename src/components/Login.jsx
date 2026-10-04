import React, { useState } from 'react';
import eggLogo from '../assets/egg_logo.svg';
import './Login.css';

const CLIENT_PERSONAS = [
  {
    email: 'trader@vashi-mandi.com',
    password: 'password123',
    name: 'Rajesh Gounder',
    role: 'Commercial Mandi Wholesaler',
    organization: 'Apex Poultry Logistics & Trading Co.',
    badge: '🏢 Mandi Trader'
  },
  {
    email: 'farmer@namakkal-poultry.com',
    password: 'password123',
    name: 'Sengottai Perumal',
    role: 'Layer Farm Producer (50k Birds)',
    organization: 'Namakkal Poultry Producers Consortium',
    badge: '🌾 Farm Producer'
  },
  {
    email: 'buyer@freshmart.in',
    password: 'password123',
    name: 'Ananya Rao',
    role: 'Procurement Director',
    organization: 'FreshMart Supermarkets India',
    badge: '🛒 Retail Buyer'
  },
  {
    email: 'admin@necc.com',
    password: 'admin123',
    name: 'NECC Administrator',
    role: 'Committee Executive & Analyst',
    organization: 'National Egg Coordination Committee',
    badge: '📊 NECC Executive'
  }
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
    }, 400);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    setTimeout(() => {
      setLoading(false);
      // Check if matches known persona
      const matched = CLIENT_PERSONAS.find(
        p => p.email.toLowerCase() === email.toLowerCase() && p.password === password
      );

      if (matched) {
        onLogin(matched);
      } else if (password.length >= 4) {
        // Allow custom client login
        const customUser = {
          email,
          name: email.split('@')[0],
          role: 'Registered Poultry Client',
          organization: 'Independent Trader / Farm'
        };
        onLogin(customUser);
      } else {
        setError('Please enter a valid email and password (min 4 characters).');
      }
    }, 600);
  };

  return (
    <div className="login-container">
      <div className="login-glass-card animate-in">
        <div className="login-header">
          <img src={eggLogo} alt="NECC Logo" className="login-logo" />
          <h2>NECC Client Portal</h2>
          <p>Sign in to access Mandi Trading, SARIMA Forecasting & Price Ledger</p>
        </div>

        {/* 1-Click Client Persona Quick Access */}
        <div style={{ marginBottom: '22px', background: 'rgba(26, 35, 126, 0.4)', padding: '14px', borderRadius: '16px', border: '1px solid rgba(255,215,0,0.2)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#FFD700', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
            ⚡ 1-Click Client Demo Sign In
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {CLIENT_PERSONAS.map(p => (
              <button
                key={p.email}
                type="button"
                onClick={() => handleQuickLogin(p)}
                style={{
                  padding: '8px 10px',
                  borderRadius: '10px',
                  background: 'rgba(13, 17, 55, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#ffffff',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: '0.78rem',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ fontWeight: 700, color: '#FFD700' }}>{p.badge}</div>
                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.7)' }}>{p.name.split(' ')[0]}</div>
              </button>
            ))}
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="login-error">{error}</div>}
          
          <div className="input-group">
            <label>Email Address</label>
            <input
              type="email"
              value={email}
              placeholder="e.g. trader@vashi-mandi.com"
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          
          <div className="input-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              placeholder="••••••••"
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          
          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Authenticating...' : 'Sign In as Client'}
          </button>
        </form>
      </div>
    </div>
  );
}
