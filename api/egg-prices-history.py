from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import json
import datetime
import concurrent.futures
import requests
from bs4 import BeautifulSoup


def scrape_necc(month="01", year="2026", report_type="Daily Rate Sheet"):
    url = "https://e2necc.com/home/eggprice"
    payload = {
        "ddlMonth": month,
        "ddlYear": year,
        "rblReportType": report_type,
        "__EVENTTARGET": "",
        "__EVENTARGUMENT": "",
    }
    
    try:
        s = requests.Session()
        r1 = s.get(url, timeout=10)
        soup1 = BeautifulSoup(r1.text, 'html.parser')
        
        for hidden in soup1.find_all("input", type="hidden"):
            payload[hidden.get("name")] = hidden.get("value")
            
        response = s.post(url, data=payload, timeout=15)
        soup = BeautifulSoup(response.text, 'html.parser')
        
        tables = soup.find_all('table')
        data = []
        for table in tables:
            rows = table.find_all('tr')
            for row in rows:
                cols = row.find_all(['td', 'th'])
                cols_text = [ele.text.strip() for ele in cols]
                if cols_text:
                    data.append(cols_text)
        return data
    except Exception as e:
        return {"error": str(e)}


def clean_data_full(raw_data, month, year):
    if isinstance(raw_data, dict) and "error" in raw_data:
        return []

    if not isinstance(raw_data, list):
        return []

    cities_data = []
    for row in raw_data:
        if len(row) > 30 and row[0] not in ["Name Of Zone / Day", "NECC SUGGESTED EGG PRICES"]:
            city = row[0].replace("(CC)", "").replace("(OD)", "").replace("(WB)", "").strip()
            
            daily_prices = []
            for day_idx in range(1, 32):
                if day_idx < len(row):
                    val = row[day_idx]
                    if val not in ["-", "", " "]:
                        try:
                            daily_prices.append({
                                "day": day_idx,
                                "date": f"{year}-{month}-{str(day_idx).zfill(2)}",
                                "price": round(float(val) / 100, 2)
                            })
                        except ValueError:
                            pass
            
            avg_price = 0
            try:
                if row[-1] not in ["-", ""]:
                    avg_price = round(float(row[-1]) / 100, 2)
            except ValueError:
                pass
            
            latest_price = daily_prices[-1]["price"] if daily_prices else avg_price
            
            cities_data.append({
                "city": city,
                "price": latest_price,
                "avg": avg_price,
                "dailyPrices": daily_prices
            })
    return cities_data


def fetch_month_data(m, y, report_type):
    try:
        raw_data = scrape_necc(m, y, report_type)
        if isinstance(raw_data, dict) and "error" in raw_data:
            return {"month": m, "year": y, "data": [], "error": raw_data["error"]}
            
        cleaned_data = clean_data_full(raw_data, m, y)
        return {"month": m, "year": y, "data": cleaned_data}
    except Exception as e:
        return {"month": m, "year": y, "data": [], "error": str(e)}


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed_path = urlparse(self.path)
        query_params = parse_qs(parsed_path.query)
        
        months_str = query_params.get('months', ['6'])[0]
        try:
            num_months = int(months_str)
        except ValueError:
            num_months = 6
            
        year_str = query_params.get('year', [None])[0]
        report_type = query_params.get('type', ['Daily Rate Sheet'])[0]
        
        now = datetime.datetime.now()
        start_year = int(year_str) if year_str else now.year
        
        tasks_args = []
        for i in range(num_months - 1, -1, -1):
            target_month = now.month - i
            target_year = start_year
            
            while target_month <= 0:
                target_month += 12
                target_year -= 1
            
            while target_month > 12:
                target_month -= 12
                target_year += 1
                
            m = str(target_month).zfill(2)
            y = str(target_year)
            tasks_args.append((m, y, report_type))
            
        all_months = []
        with concurrent.futures.ThreadPoolExecutor(max_workers=6) as executor:
            futures = [executor.submit(fetch_month_data, m, y, report_type) for (m, y, report_type) in tasks_args]
            for future in futures:
                all_months.append(future.result())

        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(all_months).encode('utf-8'))
        return
