# Developer README - NECC Egg Price Dashboard

This document provides technical details for developers working on the NECC Egg Price Dashboard.

## 🚀 Quick Start

### Frontend (React + Vite)
```bash
npm install
npm run dev
```
Port: `http://localhost:5173`

### Backend (Node.js/Express)
```bash
npm run server
```
Port: `http://localhost:3001`

### Python Dependencies
```bash
pip install -r requirements.txt
```

---

## 📂 Directory Structure

| Directory / File | Description |
| :--- | :--- |
| `src/` | **Frontend Source** |
| `src/App.jsx` | Main application logic, state management, and routing. |
| `src/components/` | Reusable React components (Charts, Filters, etc.). |
| `src/utils/` | Utility functions, including the JS forecasting engine. |
| `api/` | **Production Backend** (Vercel Serverless Functions in Python). |
| `api/egg-prices.py` | Primary scraper endpoint for live data. |
| `api/forecast-sarima.py`| Advanced forecasting using SARIMA. |
| `public/` | Static assets (logos, icons). |
| `server.js` | **Local Development Backend** (Express). Spawns Python scripts. |
| `scrape_data.py` | Standalone Python scraper used by `server.js`. |
| `sarima_forecast.py` | Standalone SARIMA forecasting script. |
| `vercel.json` | Deployment configuration for Vercel. |
| `ARCHITECTURE.md` | In-depth technical architecture and mermaid diagrams. |

---

## ⚙️ How it Works

### 1. Data Flow (Local)
1. **Frontend**: `App.jsx` makes a fetch request to `http://localhost:3001/api/egg-prices`.
2. **Backend**: `server.js` (Express) receives the request and spawns a child process: `python3 scrape_data.py --month MM --year YYYY`.
3. **Scraper**: `scrape_data.py` uses `BeautifulSoup` to parse `e2necc.com`.
4. **Response**: JSON result is passed back to `server.js` via `stdout`, then sent to the Frontend.

### 2. Data Flow (Production/Vercel)
1. **Frontend**: Requests `/api/egg-prices`.
2. **Backend**: Vercel routes this to `api/egg-prices.py`.
3. **Scraper**: The Python script executes directly within the serverless environment.
4. **Response**: JSON returned to the client.

### 3. Forecasting Engines
- **Client-Side (JS)**: Located in `src/utils/forecasting.js`. Used for instant, interactive forecasts (WMA, Seasonal).
- **Server-Side (Python)**: Located in `api/forecast-sarima.py` and `sarima_forecast.py`. Used for more complex statistical modeling (SARIMA).

---

## 🛠️ Key Scripts

- `python scrape_data.py`: CLI tool to test scraper logic.
- `python sarima_forecast.py`: CLI tool to test SARIMA model output.
- `npm run build`: Bundles the React app for production.

---

## 📝 Contribution Notes
- **Styling**: We use Vanilla CSS with CSS Variables in `src/App.css` and `src/index.css`. Please follow the glassmorphism aesthetic.
- **Charts**: Custom SVG charts are preferred over heavy libraries. Check `src/components/Charts.jsx`.
- **Proxy**: Vite is configured to proxy `/api` requests to port `3001` during development.
