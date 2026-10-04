import sys
import json
import warnings
import pandas as pd
from datetime import datetime
import os

warnings.filterwarnings('ignore', category=UserWarning, module='openpyxl')

def process_data(file_path, month, year, fmt):
    try:
        if not os.path.exists(file_path):
            print(json.dumps({"error": f"File not found: {file_path}"}))
            return

        try:
            # It might be named .xlsx but actually be a csv
            if file_path.endswith('.csv'):
                df = pd.read_csv(file_path)
            else:
                try:
                    df = pd.read_excel(file_path)
                except Exception:
                    df = pd.read_csv(file_path)
        except Exception as err:
            print(json.dumps({"error": f"Failed to read file: {err}"}))
            return
            
        df.columns = [str(c).lower().strip() for c in df.columns]
        
        date_col = next((c for c in df.columns if 'date' in c or 'day' in c or 'time' in c), None)
        city_col = next((c for c in df.columns if 'city' in c or 'zone' in c or 'center' in c or 'place' in c), None)
        price_col = next((c for c in df.columns if 'price' in c or 'rate' in c or 'value' in c), None)
        
        # Support wide format (Date, City1, City2...) if city not found
        if date_col and not city_col:
            id_vars = [date_col]
            value_vars = [c for c in df.columns if c != date_col]
            df = pd.melt(df, id_vars=id_vars, value_vars=value_vars, var_name='city', value_name='price')
            city_col = 'city'
            price_col = 'price'
            
        if not date_col or not city_col or not price_col:
            print(json.dumps({"error": f"Could not map columns. Found: {list(df.columns)}"}))
            return
            
        # Parse dates
        df[date_col] = pd.to_datetime(df[date_col], errors='coerce')
        df = df.dropna(subset=[date_col])
        
        target_m = int(month)
        target_y = int(year)
        
        # Filter for requested month and year
        df_filtered = df[(df[date_col].dt.month == target_m) & (df[date_col].dt.year == target_y)].copy()
        
        cities = df_filtered[city_col].unique()
        result = []
        
        for city in cities:
            if pd.isna(city): continue
            city_data = df_filtered[df_filtered[city_col] == city].sort_values(date_col)
            clean_city = str(city).replace("(CC)", "").replace("(OD)", "").replace("(WB)", "").strip()
            
            # Ensure price is numeric, replacing '-' with NaN
            if city_data[price_col].dtype == object:
                city_data[price_col] = city_data[price_col].replace('-', pd.NA)
            city_data[price_col] = pd.to_numeric(city_data[price_col], errors='coerce')
            city_data = city_data.dropna(subset=[price_col])
            
            # The CSV values are per 100 eggs (e.g. 204.00), so divide by 100
            prices = (city_data[price_col].astype(float) / 100).tolist()
            dates = city_data[date_col].dt.strftime('%Y-%m-%d').tolist()
            days = city_data[date_col].dt.day.tolist()
            
            if not prices: continue
                
            avg_price = round(sum(prices) / len(prices), 2)
            latest_price = round(prices[-1], 2)
            
            if fmt == "full":
                daily_prices = [{"day": d, "date": dt, "price": round(p, 2)} for d, dt, p in zip(days, dates, prices)]
                result.append({"city": clean_city, "price": latest_price, "avg": avg_price, "dailyPrices": daily_prices})
            else:
                result.append({"city": clean_city, "price": latest_price, "avg": avg_price})
                
        print(json.dumps(result))
        
    except Exception as e:
        print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    file_path = sys.argv[1] if len(sys.argv) > 1 else "data/egg_prices_timeseries_final.csv"
    m = sys.argv[2] if len(sys.argv) > 2 else "03"
    y = sys.argv[3] if len(sys.argv) > 3 else "2026"
    t = sys.argv[4] if len(sys.argv) > 4 else "Daily Rate Sheet"
    fmt = sys.argv[5] if len(sys.argv) > 5 else "simple"
    
    process_data(file_path, m, y, fmt)
