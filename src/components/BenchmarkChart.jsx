import React, { useMemo, useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { X } from 'lucide-react'
import { COLOR } from '../constants.js'

// External benchmark metadata (7 real indices/assets)
export const EXTERNAL_BENCH_META = {
  KS11:    { label: '코스피',    color: '#60a5fa' },
  KQ11:    { label: '코스닥',    color: '#34d399' },
  IXIC:    { label: '나스닥',    color: '#e879f9' },
  US500:   { label: 'S&P500',   color: '#fb923c' },
  DJI:     { label: '다우존스', color: '#94a3b8' },
  GOLD:    { label: '금',        color: '#fbbf24' },
  BTC_KRW: { label: '비트코인', color: '#f97316' },
}

const BENCH_ORDER = ['KS11', 'KQ11', 'IXIC', 'US500', 'DJI', 'GOLD', 'BTC_KRW']

// Default ON benches per asset class (reset on AC toggle)
export const AC_DEFAULT_BENCH = {
  domestic_equity:       ['KS11'],
  domestic_equity_index: ['KS11'],
  overseas_equity:       ['IXIC', 'US500'],
  commodity:             ['GOLD'],
  bond:                  [],
  realestate:            [],
  other:                 [],
  leverage_inverse:      [],
}

// Primary bench for ETF overlay spread calc
export const AC_PRIMARY_BENCH = {
  domestic_equity:       'KS11',
  domestic_equity_index: 'KS11',
  overseas_equity:       'US500',
  commodity:             'GOLD',
  bond:                  null,
  realestate:            null,
  other:                 null,
  leverage_inverse:      null,
}

const PERIODS = [
  { key: '3m', label: '3개월', days: 63   },
  { key: '1y', label: '1년',   days: 252  },
  { key: '3y', label: '3년',   days: 756  },
  { key: '5y', label: '5년',   days: 1260 },
]

export const CHART_PALETTE = [
  '#60a5fa', '#f472b6', '#34d399', '#a78bfa',
  '#fb923c', '#e879f9', '#22d3ee',
]

function fmtPct(v) {
  if (v == null || isNaN(v)) return '—'
  return (v >= 0 ? '+' : '') + v.toFixed(1) + '%'
}

// Tooltip: full human-readable date, e.g. "2026-04-01" -> "2026.4.1"
function fmtTooltipDate(dateStr) {
  const y = dateStr.slice(0, 4)
  const m = parseInt(dateStr.slice(5, 7), 10)
  const d = parseInt(dateStr.slice(8, 10), 10)
  return `${y}.${m}.${d}`
}

// X axis tick: month-level for short periods, year-level for long ones.
// Year boundaries (first tick or January) get a "YY년" prefix so the axis stays orientable.
function fmtAxisTick(dateStr, period, index) {
  const y = dateStr.slice(0, 4)
  const m = parseInt(dateStr.slice(5, 7), 10)
  if (period === '3y' || period === '5y') return y
  return (index === 0 || m === 1) ? `${y.slice(2)}년 ${m}월` : `${m}월`
}

// Align external benchmark {date: close} to ETF dates array using ffill
function alignBench(benchData, dates) {
  const result = new Array(dates.length)
  let lastVal = null
  for (let i = 0; i < dates.length; i++) {
    const v = benchData[dates[i]]
    if (v != null) lastVal = v
    result[i] = lastVal
  }
  return result
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: COLOR.bgCard, border: `1px solid ${COLOR.border}`,
      borderRadius: 6, padding: '8px 12px', fontSize: 12, minWidth: 160,
    }}>
      <div style={{ color: COLOR.textDim, marginBottom: 4, fontSize: 11 }}>{fmtTooltipDate(label)}</div>
      {payload.map(entry => (
        <div key={entry.dataKey} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <span style={{
            color: COLOR.textMuted, maxWidth: 150,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {entry.name}
          </span>
          <span style={{ color: entry.color, fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
            {fmtPct(entry.value)}
          </span>
        </div>
      ))}
    </div>
  )
}

function BenchToggles({ activeBenches, onToggle }) {
  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 6 }}>
      {BENCH_ORDER.map(key => {
        const meta = EXTERNAL_BENCH_META[key]
        const active = activeBenches.includes(key)
        return (
          <button
            key={key}
            onClick={() => onToggle(key)}
            style={{
              padding: '2px 8px', borderRadius: 10, fontSize: 11, cursor: 'pointer',
              border: `1px solid ${active ? meta.color + 'bb' : COLOR.borderSoft}`,
              background: active ? meta.color + '22' : 'transparent',
              color: active ? meta.color : COLOR.textDim,
              fontWeight: active ? 600 : 400,
              transition: 'all 0.1s',
            }}
          >
            {meta.label}
          </button>
        )
      })}
    </div>
  )
}

export default function BenchmarkChart({
  activeAC,
  chartTickers,
  onRemoveTicker,
  prices,
  loadingPrices,
  benchmarks,
  activeBenches,
  onToggleBench,
}) {
  const [period, setPeriod] = useState('1y')

  const hasAnything = activeBenches.length > 0 || chartTickers.length > 0

  const { chartData, etfLines, benchLines, xTicks, lastReturnMap, benchLastMap } = useMemo(() => {
    const empty = { chartData: [], etfLines: [], benchLines: [], xTicks: [], lastReturnMap: {}, benchLastMap: {} }
    if (!prices || !hasAnything) return empty

    const nDays    = PERIODS.find(p => p.key === period)?.days ?? 252
    const startIdx = Math.max(0, prices.dates.length - nDays)
    const slicedDates = prices.dates.slice(startIdx)

    // ETF lines
    const etfLns = chartTickers.map((etf, i) => ({
      key: etf.ticker, label: etf.name,
      color: CHART_PALETTE[i % CHART_PALETTE.length], isBench: false,
    }))

    // Benchmark lines (only active with data)
    const benchLns = activeBenches
      .filter(k => EXTERNAL_BENCH_META[k] && benchmarks?.benchmarks?.[k])
      .map(k => ({
        key: `bench_${k}`, label: EXTERNAL_BENCH_META[k].label,
        color: EXTERNAL_BENCH_META[k].color, isBench: true, benchKey: k,
      }))

    // ETF cumulative returns
    const etfReturns = {}
    for (const { key } of etfLns) {
      const closes = prices.tickers[key]
      if (!closes) continue
      const base = closes[startIdx]
      if (!base) continue
      etfReturns[key] = closes.slice(startIdx).map(c =>
        c != null ? +((c / base - 1) * 100).toFixed(2) : null
      )
    }

    // Benchmark cumulative returns (ffill to ETF dates)
    const benchReturns = {}
    for (const bln of benchLns) {
      const rawData = benchmarks.benchmarks[bln.benchKey]
      if (!rawData) continue
      const aligned = alignBench(rawData, prices.dates)
      const sliced  = aligned.slice(startIdx)
      const base    = sliced.find(v => v != null)
      if (!base) continue
      benchReturns[bln.key] = sliced.map(c =>
        c != null ? +((c / base - 1) * 100).toFixed(2) : null
      )
    }

    // Last returns for each line
    const lastReturnMap = {}
    for (const { key } of [...etfLns, ...benchLns]) {
      const arr = etfReturns[key] || benchReturns[key]
      if (!arr) continue
      for (let i = arr.length - 1; i >= 0; i--) {
        if (arr[i] != null) { lastReturnMap[key] = arr[i]; break }
      }
    }

    // Last bench returns keyed by bench symbol (for spread calc)
    const benchLastMap = {}
    for (const bln of benchLns) {
      const last = lastReturnMap[bln.key]
      if (last != null) benchLastMap[bln.benchKey] = last
    }

    const data = slicedDates.map((date, i) => {
      const row = { date }
      for (const { key } of etfLns) {
        if (etfReturns[key]) row[key] = etfReturns[key][i]
      }
      for (const { key } of benchLns) {
        if (benchReturns[key]) row[key] = benchReturns[key][i]
      }
      return row
    })

    // Pick evenly-spaced tick values so X labels never overlap regardless of period or screen width
    const MAX_TICKS = 6
    const xTicks = []
    if (data.length > 0) {
      const n = Math.min(MAX_TICKS, data.length)
      for (let i = 0; i < n; i++) {
        const idx = Math.round(i * (data.length - 1) / Math.max(n - 1, 1))
        const d = data[Math.min(idx, data.length - 1)].date
        if (!xTicks.includes(d)) xTicks.push(d)
      }
    }

    return { chartData: data, etfLines: etfLns, benchLines: benchLns, xTicks, lastReturnMap, benchLastMap }
  }, [prices, benchmarks, period, chartTickers, activeBenches, hasAnything])

  // Reference bench for spread: AC primary if active, else first active bench
  const primaryBench = AC_PRIMARY_BENCH[activeAC]
  const refBenchKey  = (primaryBench && activeBenches.includes(primaryBench))
    ? primaryBench
    : (activeBenches[0] ?? null)
  const refBenchLast = refBenchKey != null ? (benchLastMap[refBenchKey] ?? null) : null

  return (
    <div style={{ padding: '10px 16px 6px', borderBottom: `1px solid ${COLOR.borderSoft}` }}>

      {/* External benchmark toggles — always visible */}
      <BenchToggles activeBenches={activeBenches} onToggle={onToggleBench} />

      {!hasAnything ? (
        <div style={{ fontSize: 12, color: COLOR.textDim, textAlign: 'center', padding: '6px 0 2px' }}>
          지수를 켜거나 종목 [+]를 누르면 누적수익률 차트가 표시됩니다.
        </div>
      ) : (
        <>
          {/* Period presets + ETF overlay tags */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
            {PERIODS.map(p => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                style={{
                  padding: '3px 8px', borderRadius: 4, cursor: 'pointer', fontSize: 11,
                  border: `1px solid ${period === p.key ? '#5a6a9a' : COLOR.borderSoft}`,
                  background: period === p.key ? '#2a3050' : 'transparent',
                  color: period === p.key ? COLOR.text : COLOR.textDim,
                  fontWeight: period === p.key ? 600 : 400,
                }}
              >{p.label}</button>
            ))}

            {chartTickers.map((etf, i) => {
              const c = CHART_PALETTE[i % CHART_PALETTE.length]
              const etfLast = lastReturnMap[etf.ticker]
              const spread  = (refBenchLast != null && etfLast != null)
                ? etfLast - refBenchLast : null
              return (
                <span
                  key={etf.ticker}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 3,
                    padding: '2px 6px', borderRadius: 4, fontSize: 11,
                    background: c + '22', color: c, border: `1px solid ${c}44`,
                  }}
                >
                  <span style={{ maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {etf.name}
                  </span>
                  {spread != null && (
                    <span style={{ fontVariantNumeric: 'tabular-nums', opacity: 0.9, flexShrink: 0 }}>
                      {spread >= 0 ? '+' : ''}{spread.toFixed(1)}%p
                    </span>
                  )}
                  <button
                    onClick={() => onRemoveTicker(etf.ticker)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', display: 'flex', padding: 0 }}
                  >
                    <X size={10} />
                  </button>
                </span>
              )
            })}
          </div>

          {/* Chart */}
          {loadingPrices ? (
            <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLOR.textDim, fontSize: 12 }}>
              차트 데이터 로딩 중…
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <XAxis
                  dataKey="date"
                  ticks={xTicks}
                  tickFormatter={(d, i) => fmtAxisTick(d, period, i)}
                  tick={{ fontSize: 10, fill: COLOR.textDim }}
                  interval={0}
                  axisLine={false} tickLine={false}
                />
                <YAxis
                  tickFormatter={v => (v >= 0 ? '+' : '') + v.toFixed(0) + '%'}
                  tick={{ fontSize: 10, fill: COLOR.textDim }}
                  axisLine={false} tickLine={false}
                  width={44}
                />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={0} stroke={COLOR.border} strokeDasharray="3 3" />
                {benchLines.map(line => (
                  <Line
                    key={line.key} type="monotone"
                    dataKey={line.key} name={line.label}
                    stroke={line.color} strokeWidth={1.5}
                    dot={false} connectNulls strokeDasharray="5 3"
                  />
                ))}
                {etfLines.map(line => (
                  <Line
                    key={line.key} type="monotone"
                    dataKey={line.key} name={line.label}
                    stroke={line.color} strokeWidth={2}
                    dot={false} connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}

          <div style={{ fontSize: 10, color: COLOR.textDim, marginTop: 2, textAlign: 'right' }}>
            누적수익률(과거 실적), 미래수익 보장 아님.
          </div>
        </>
      )}
    </div>
  )
}
