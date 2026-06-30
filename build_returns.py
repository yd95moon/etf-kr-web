#!/usr/bin/env python3
"""Precompute 3M/6M/1Y returns from chart_prices.json → public/data/returns.json"""
import json, os

ROOT = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(ROOT, 'public', 'data')

with open(os.path.join(DATA, 'chart_prices.json')) as f:
    cp = json.load(f)

dates = cp['dates']
tickers_data = cp['tickers']
n = len(dates)

WINDOWS = {'m3': 63, 'm6': 126, 'm12': 252}
result = {}

for ticker, closes in tickers_data.items():
    rec = {}
    for key, days in WINDOWS.items():
        si = max(0, n - days)
        base = next((closes[i] for i in range(si, n) if closes[i] and closes[i] > 0), None)
        end  = next((closes[i] for i in range(n - 1, si - 1, -1) if closes[i] and closes[i] > 0), None)
        rec[key] = round((end / base - 1) * 100, 2) if base and end else None
    result[ticker] = rec

out = os.path.join(DATA, 'returns.json')
with open(out, 'w') as f:
    json.dump(result, f, separators=(',', ':'))

print(f'returns.json written: {len(result)} tickers')
