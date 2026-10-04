import React from 'react';

export const DateSelector = ({ selectedDate, onDateChange }) => {
    return (
        <div className="filter-group">
            <label>Select Date</label>
            <input
                type="date"
                value={selectedDate}
                onChange={(e) => onDateChange(e.target.value)}
            />
        </div>
    );
};

export const RangeSelector = ({ range, onRangeChange }) => {
    return (
        <div className="filter-group">
            <label>Date Range</label>
            <div className="range-inputs">
                <input
                    type="date"
                    value={range.start}
                    onChange={(e) => onRangeChange({ ...range, start: e.target.value })}
                />
                <span>to</span>
                <input
                    type="date"
                    value={range.end}
                    onChange={(e) => onRangeChange({ ...range, end: e.target.value })}
                />
            </div>
        </div>
    );
};

export const SelectionBar = ({ selectedDate, onDateChange, range, onRangeChange, mode, setMode }) => {
    return (
        <div className="selection-bar glass-panel animate-in">
            <div className="mode-toggle">
                <button
                    className={mode === 'daily' ? 'active' : ''}
                    onClick={() => setMode('daily')}
                >
                    📊 Overview
                </button>
                <button
                    className={mode === 'trend' ? 'active' : ''}
                    onClick={() => setMode('trend')}
                >
                    📈 Trends
                </button>
                <button
                    className={mode === 'forecast' ? 'active' : ''}
                    onClick={() => setMode('forecast')}
                >
                    🔮 Forecast
                </button>
                <button
                    className={mode === 'market-analysis' ? 'active' : ''}
                    onClick={() => setMode('market-analysis')}
                >
                    🔗 Market Integration
                </button>
                <button
                    className={mode === 'risk-analysis' ? 'active' : ''}
                    onClick={() => setMode('risk-analysis')}
                >
                    ⚠️ Risk Index
                </button>
                <button
                    className={mode === 'client-portal' ? 'active' : ''}
                    onClick={() => setMode('client-portal')}
                    style={mode === 'client-portal' ? { background: 'linear-gradient(135deg, #FFD700 0%, #FFA000 100%)', color: '#0D1137', fontWeight: 800 } : { color: '#FFD700' }}
                >
                    💼 Client Hub & Entry
                </button>
            </div>

            {mode === 'daily' ? (
                <DateSelector selectedDate={selectedDate} onDateChange={onDateChange} />
            ) : mode === 'trend' ? (
                <RangeSelector range={range} onRangeChange={onRangeChange} />
            ) : mode === 'market-analysis' ? (
                <div className="filter-group">
                    <span className="forecast-mode-hint">🔗 Spatial Price Dispersion & Market Integration Assessment</span>
                </div>
            ) : mode === 'risk-analysis' ? (
                <div className="filter-group">
                    <span className="forecast-mode-hint">⚠️ Price Stability, Shock Detection & Risk Index</span>
                </div>
            ) : mode === 'client-portal' ? (
                <div className="filter-group">
                    <span className="forecast-mode-hint">💼 Client Trade Ledger, Database Entry & NECC Benchmark Comparison</span>
                </div>
            ) : (
                <div className="filter-group">
                    <span className="forecast-mode-hint">📅 12-month historical data analysis</span>
                </div>
            )}
        </div>
    );
};
