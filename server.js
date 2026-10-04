import express from 'express';
import cors from 'cors';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

// Simple in-memory cache to avoid re-scraping the same month
const cache = {};

function runScraper(month, year, type, format) {
    const cacheKey = `${month}-${year}-${type}-${format}`;
    if (cache[cacheKey] && (Date.now() - cache[cacheKey].time < 300000)) {
        // 5-minute cache
        return Promise.resolve(cache[cacheKey].data);
    }

    return new Promise((resolve, reject) => {
        const args = ['read_local_data.py', 'data/egg_prices_timeseries_final.csv', month, year, type];
        if (format === 'full') args.push('full');

        const pythonProcess = spawn('python3', args);
        let dataString = '';
        let errorString = '';

        pythonProcess.stdout.on('data', (data) => {
            dataString += data.toString();
        });
        pythonProcess.stderr.on('data', (data) => {
            errorString += data.toString();
        });
        pythonProcess.on('close', (code) => {
            if (code !== 0) {
                return reject(new Error(errorString || 'Scraper failed'));
            }
            try {
                const jsonData = JSON.parse(dataString);
                cache[cacheKey] = { data: jsonData, time: Date.now() };
                resolve(jsonData);
            } catch (e) {
                reject(new Error('Failed to parse scraper output'));
            }
        });
    });
}

// Single month endpoint
app.get('/api/egg-prices', async (req, res) => {
    const { month, year, type, format } = req.query;
    console.log(`Fetching data for: ${month || '01'}/${year || '2026'} (${type || 'Daily Rate Sheet'}) [${format || 'simple'}]`);

    try {
        const data = await runScraper(
            month || '01',
            year || '2026',
            type || 'Daily Rate Sheet',
            format || 'simple'
        );
        res.json(data);
    } catch (err) {
        console.error('Scraper error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// Multi-month endpoint for historical data (Forecast, Market Analysis, Risk Analysis)
app.get('/api/egg-prices-history', async (req, res) => {
    const { months, year, type } = req.query;
    const numMonths = parseInt(months) || 6;
    const now = new Date();
    const startYear = parseInt(year) || now.getFullYear();

    console.log(`Fetching ${numMonths} months of historical data...`);

    try {
        const results = [];
        const promises = [];

        for (let i = numMonths - 1; i >= 0; i--) {
            const d = new Date(startYear, now.getMonth() - i, 1);
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const y = String(d.getFullYear());
            promises.push(
                runScraper(m, y, type || 'Daily Rate Sheet', 'full')
                    .then(data => ({ month: m, year: y, data }))
                    .catch(err => ({ month: m, year: y, data: [], error: err.message }))
            );
        }

        const allMonths = await Promise.all(promises);
        res.json(allMonths);
    } catch (err) {
        console.error('History fetch error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// SARIMA Forecast endpoint — runs Python statsmodels SARIMA
app.post('/api/forecast-sarima', express.json(), (req, res) => {
    const { prices, dates, forecastDays } = req.body;
    console.log(`Running SARIMA forecast: ${prices?.length} data points, ${forecastDays} days ahead`);

    const pythonProcess = spawn('python3', ['sarima_forecast.py']);
    let dataString = '';
    let errorString = '';

    // Send data via stdin
    pythonProcess.stdin.write(JSON.stringify({ prices, dates, forecastDays }));
    pythonProcess.stdin.end();

    pythonProcess.stdout.on('data', (data) => {
        dataString += data.toString();
    });
    pythonProcess.stderr.on('data', (data) => {
        errorString += data.toString();
    });
    pythonProcess.on('close', (code) => {
        if (code !== 0) {
            console.error('SARIMA error:', errorString);
            return res.status(500).json({ error: errorString || 'SARIMA failed', fallback: true });
        }
        try {
            const jsonData = JSON.parse(dataString);
            res.json(jsonData);
        } catch (e) {
            res.status(500).json({ error: 'Failed to parse SARIMA output', fallback: true });
        }
    });
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, 'dist')));

app.get(/(.*)/, (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(port, () => {
    console.log(`🥚 NECC API Server running at http://localhost:${port}`);
});
