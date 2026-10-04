# NECC Egg Price Dashboard 🥚

A real-time egg price dashboard that fetches live data from the National Egg Coordination Committee (NECC) website.

![Dashboard Preview](https://img.shields.io/badge/Live%20Data-e2necc.com-FFD700)

## Features

- **📅 Daily Prices** - Real-time suggested prices from NECC
- **📊 Monthly Averages** - Historical monthly average prices
- **📈 Price Trends** - Interactive trend charts with historical data
- **🗺️ 34+ Cities** - Coverage of all major production centers
- **🎨 Modern UI** - Glassmorphism design with smooth animations
- **📱 Responsive** - Works on desktop and mobile

## Tech Stack

- **Frontend**: React + Vite
- **Backend**: Node.js + Express
- **Scraper**: Python (BeautifulSoup)
- **Styling**: Vanilla CSS with CSS Variables

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.8+
- pip (Python package manager)

### Installation

```bash
# Clone the repository
git clone https://github.com/PremPastagia/ncee.git
cd ncee

# Install Node dependencies
npm install

# Install Python dependencies
pip install requests beautifulsoup4
```

### Running the Application

You need to run both the API server and the frontend:

```bash
# Terminal 1 - Start the API server (port 3001)
npm run server

# Terminal 2 - Start the frontend (port 5173)
npm run dev
```

Then open http://localhost:5173 in your browser.

## Data Source

All price data is scraped in real-time from:
- **Website**: https://e2necc.com/home/eggprice
- **Data Types**: Daily Rate Sheet, Monthly Average Sheet
- **Date Range**: 2009 - Present

## API Endpoints

```
GET /api/egg-prices
  Query Parameters:
    - month: MM format (e.g., "01")
    - year: YYYY format (e.g., "2026")
    - type: "Daily Rate Sheet" or "Monthly Avg. Sheet"
```

## Project Structure

```
ncee/
├── src/
│   ├── App.jsx          # Main React component
│   ├── App.css          # Styles with glassmorphism
│   ├── components/
│   │   ├── Charts.jsx   # SVG chart components
│   │   ├── Filters.jsx  # Date/mode selectors
│   │   └── Tooltip.jsx  # Interactive tooltip
│   └── data/
│       └── mockData.js  # Static stats data
├── server.js            # Express API server
├── scrape_data.py       # Python scraper
└── package.json
```

## Screenshots

The dashboard features:
- Hero section with key statistics
- Interactive pie charts and bar graphs
- Real-time price table with 34+ cities
- Toggle between Daily and Monthly views

## License

MIT

## Disclaimer

The prices displayed are suggested by NECC and are not mandatory. They are published solely for reference and information of the trade and industry.