#!/usr/bin/env python3
"""chart_prices.json → returns.json (1주/1개월/3M/6M/1Y/3Y/5Y)

구간 시작에 값이 없으면 그냥 있는 데서부터 계산하던 문제가 있었다.
그러면 상장 6개월짜리 ETF의 6개월 수익률이 "1Y" 로 표시되어
5년짜리와 한 줄에서 비교된다. 구간을 충분히 덮지 못하면 None 을 준다.
"""
import json, os

ROOT = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(ROOT, 'public', 'data')

with open(os.path.join(DATA, 'chart_prices.json')) as f:
    cp = json.load(f)

dates = cp['dates']
tickers_data = cp['tickers']
n = len(dates)

WINDOWS = {'w1': 5, 'm1': 21, 'm3': 63, 'm6': 126, 'm12': 252, 'm36': 756, 'm60': 1260}
MIN_COVERAGE = 0.9   # 구간의 90% 이상을 덮어야 그 기간 수익률로 인정

result = {}
dropped = {k: 0 for k in WINDOWS}

for ticker, closes in tickers_data.items():
    rec = {}
    for key, days in WINDOWS.items():
        si = max(0, n - days)
        span = n - si                      # 이 파일이 실제로 담고 있는 구간 길이
        first = next((i for i in range(si, n) if closes[i] and closes[i] > 0), None)
        end   = next((closes[i] for i in range(n - 1, si - 1, -1) if closes[i] and closes[i] > 0), None)
        if first is None or end is None:
            rec[key] = None
            continue
        if (n - first) / span < MIN_COVERAGE:
            rec[key] = None               # 상장이 늦어 이 기간을 못 채움
            dropped[key] += 1
            continue
        rec[key] = round((end / closes[first] - 1) * 100, 2)
    result[ticker] = rec

with open(os.path.join(DATA, 'returns.json'), 'w') as f:
    json.dump(result, f, separators=(',', ':'))

print(f'returns.json: {len(result)}종 × {len(WINDOWS)}구간')
print('기간 미달로 제외된 종목 수:', dropped)
