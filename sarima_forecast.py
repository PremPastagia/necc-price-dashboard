"""
SARIMA Forecasting Model for NECC Egg Price Data
SARIMA(p,d,q)(P,D,Q,s) — Seasonal AutoRegressive Integrated Moving Average

This script receives historical daily egg prices (JSON via stdin or argv)
and outputs SARIMA forecasts with confidence intervals.
"""
import json
import sys
import warnings
import numpy as np

warnings.filterwarnings("ignore")

def run_sarima_forecast(prices, dates, forecast_days=5, seasonal_period=7):
    """
    Run SARIMA(1,1,1)(1,1,0,s) on the given price series.
    
    Parameters:
    - prices: list of floats (historical daily prices)
    - dates: list of date strings
    - forecast_days: how many days ahead to forecast
    - seasonal_period: s parameter (7 = weekly seasonality)
    
    Returns dict with forecast array and model diagnostics.
    """
    try:
        from statsmodels.tsa.statespace.sarimax import SARIMAX
        
        y = np.array(prices, dtype=float)
        n = len(y)
        
        if n < 14:
            return {"error": "Need at least 14 data points for SARIMA", "fallback": True}
        
        # Auto-select seasonal period
        if n >= 60:
            s = 30  # Monthly seasonality if enough data
        elif n >= 14:
            s = 7   # Weekly seasonality
        else:
            s = 1   # No seasonality
        
        # SARIMA order selection based on data length
        # SARIMA(p,d,q)(P,D,Q,s)
        if n >= 60:
            order = (1, 1, 1)
            seasonal_order = (1, 1, 0, s)
        elif n >= 30:
            order = (1, 1, 1)
            seasonal_order = (1, 0, 0, s)
        else:
            order = (1, 1, 0)
            seasonal_order = (0, 0, 0, 0)
        
        # Fit SARIMA model
        model = SARIMAX(
            y,
            order=order,
            seasonal_order=seasonal_order,
            enforce_stationarity=False,
            enforce_invertibility=False,
            simple_differencing=False
        )
        
        results = model.fit(disp=False, maxiter=200)
        
        # Generate forecasts
        forecast_result = results.get_forecast(steps=forecast_days)
        forecast_mean = np.array(forecast_result.predicted_mean).flatten()
        conf_int_raw = forecast_result.conf_int(alpha=0.05)  # 95% confidence
        conf_int_arr = np.array(conf_int_raw)
        
        # Build forecast array
        from datetime import datetime, timedelta
        last_date = datetime.strptime(dates[-1], "%Y-%m-%d") if dates else datetime.now()
        
        forecast = []
        for i in range(forecast_days):
            fd = last_date + timedelta(days=i + 1)
            pred = float(forecast_mean[i])
            lower = float(conf_int_arr[i, 0])
            upper = float(conf_int_arr[i, 1])
            
            forecast.append({
                "date": fd.strftime("%Y-%m-%d"),
                "predicted": round(max(0, pred), 2),
                "lower": round(max(0, lower), 2),
                "upper": round(max(0, upper), 2),
                "isForecast": True
            })
        
        # Model diagnostics
        aic = round(results.aic, 2)
        bic = round(results.bic, 2)
        
        # Residual analysis
        residuals = results.resid
        mean_residual = round(float(np.mean(residuals)), 4)
        std_residual = round(float(np.std(residuals)), 4)
        
        # Ljung-Box test for residual autocorrelation
        try:
            from statsmodels.stats.diagnostic import acorr_ljungbox
            lb_result = acorr_ljungbox(residuals, lags=[min(10, max(1, n//5))], return_df=True)
            lb_pvalue = round(float(lb_result['lb_pvalue'].values[0]), 4)
        except Exception:
            lb_pvalue = None
        
        # Price trend
        slope = float(forecast_mean[-1] - forecast_mean[0]) / max(1, forecast_days)
        trend = "rising" if slope > 0.01 else "falling" if slope < -0.01 else "stable"
        
        # Volatility
        price_mean = float(np.mean(y))
        price_std = float(np.std(y))
        volatility = round((price_std / price_mean) * 100, 1) if price_mean > 0 else 0
        
        # R-squared approximation using in-sample fit
        fitted = np.array(results.fittedvalues).flatten()
        y_tail = y[1:len(fitted)+1] if len(fitted) < len(y) else y[1:]
        f_tail = fitted[1:] if len(fitted) > 1 else fitted
        min_len = min(len(y_tail), len(f_tail))
        ss_res = float(np.sum((y_tail[:min_len] - f_tail[:min_len]) ** 2))
        ss_tot = float(np.sum((y_tail[:min_len] - np.mean(y_tail[:min_len])) ** 2))
        r_squared = round(max(0, 1 - ss_res / ss_tot), 4) if ss_tot > 0 else 0
        
        return {
            "forecast": forecast,
            "metrics": {
                "trend": trend,
                "slopePerDay": round(slope, 4),
                "volatility": volatility,
                "confidence": round(r_squared * 100, 0),
                "avgPrice": round(price_mean, 2),
                "predictedTomorrow": forecast[0]["predicted"] if forecast else 0,
                "predictedEnd": forecast[-1]["predicted"] if forecast else 0
            },
            "diagnostics": {
                "model": f"SARIMA{order}x{seasonal_order}",
                "aic": aic,
                "bic": bic,
                "meanResidual": mean_residual,
                "stdResidual": std_residual,
                "ljungBoxPValue": lb_pvalue,
                "rSquared": r_squared,
                "dataPoints": n,
                "seasonalPeriod": s
            }
        }
        
    except Exception as e:
        return {"error": str(e), "fallback": True}


if __name__ == "__main__":
    # Read input from stdin (JSON: {prices: [], dates: [], forecastDays: N})
    try:
        input_data = json.loads(sys.stdin.read())
        prices = input_data.get("prices", [])
        dates = input_data.get("dates", [])
        forecast_days = input_data.get("forecastDays", 5)
        
        result = run_sarima_forecast(prices, dates, forecast_days)
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": str(e), "fallback": True}))
