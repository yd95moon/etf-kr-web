import React, { useMemo, useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { X } from 'lucide-react'
import { COLOR } from '../constants.js'

export const BENCHMARK_META = {
  domestic_equity: { ticker: '069500', label: 'KODEX 200' },
  overseas_equity: { ticker: '360750', label: 'TIGER 미국S&P500' },
  bond:            { ticker: '148070', label: 'KOSEF 국고채10년' },
}

const PERIODS = [
  { key: '3m', label: '3개월', days: 63  },
  { key: '1y', label: '1년',   days: 252 },
  { key: '3y', label: '3년',   days: 756 },
  { key: '5y', label: '5년',   days: 1260 },
]

// Overlay colors — benchmark uses COLOR.textMuted (dashed)
export const CHART_PALETTE = [
  '#60a5fa', '#f472b6', '#34d399', '#a78bfa',
  '#fb923c', '#e879f9', '#22d3ee',
]

function fmtPct(v) {
  if (v == null || isNaN(v)) return '—'
  return (v >= 0 ? '+' : '') + v.toFixed(1) + '%'
}

function fmtDateLabel(dateStr) {
  const y = dateStr.slice(2, 4)
  const m = parseInt(dateStr.slice(5, 7), 10)
  return `${y}.${m}`
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: COLOR.bgCard,
      border: `1px solid ${COLOR.border}`,
      borderRadius: 6, padding: '8px 12px',
      fontSize: 12, minWidth: 160,
    }}>
      <div style={{ color: COLOR.textDim, marginBottom: 4, fontSize: 11 }}>{label}</div>
      {payload.map(entry => (
        <div key={entry.dataKey} style={{
          display: 'flex', justifyContent: 'space-between', gap: 12,
        }}>
          <span style={{
            color: COLOR.textMuted, maxWidth: 150,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {entry.name}
          </span>
          <span style={{
            color: entry.color, fontVariantNumeric: 'tabular-nums', fontWeight: 600,
          }}>
            {fmtPct(entry.value)}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function BenchmarkChart({
  activeAC, chartTickers, onRemoveTicker, prices, loadingPrices,
}) {
  const [period, setPeriod] = useState('1y')

  const bench = BENCHMARK_META[activeAC]
  const hasBench = !!bench
  const hasAnything = hasBench || chartTickers.length > 0

  const { chartData, allLines, xInterval, lastReturnMap, benchLast } = useMemo(() => {
    if (!prices || !hasAnything) return { chartData: [], allLines: [], xInterval: 21, lastReturnMap: {}, benchLast: null }

    const nDays  = PERIODS.find(p => p.key === period)?.days ?? 252
    const startIdx = Math.max(0, prices.dates.length - nDays)
    const slicedDates = prices.dates.slice(startIdx)

    const lines = []
    if (bench) lines.push({ key: bench.ticker, label: bench.label, color: '#64748b', isBench: true })
    chartTickers.forEach((etf, i) => {
      lines.push({ key: etf.ticker, label: etf.name, color: CHART_PALETTE[i % CHART_PALETTE.length], isBench: false })
    })

    const returns = {}
    for (const { key } of lines) {
      const closes = prices.tickers[key]
      if (!closes) continue
      const base = closes[startIdx]
      if (!base) continue
      returns[key] = closes.slice(startIdx).map(c =>
        c != null ? +((c / base - 1) * 100).toFixed(2) : null
      )
    }

    const lastReturnMap = {}
    for (const { key } of lines) {
      const r = returns[key]
      if (r) {
        for (let i = r.length - 1; i >= 0; i--) {
          if (r[i] != null) { lastReturnMap[key] = r[i]; break }
        }
      }
    }
    const benchLast = bench ? (lastReturnMap[bench.ticker] ?? null) : null

    const xInt = { '5y': 63, '3y': 42, '1y': 21, '3m': 10 }[period] ?? 21

    const data = slicedDates.map((date, i) => {
      const row = { date: fmtDateLabel(date) }
      for (const { key } of lines) {
        if (returns[key]) row[key] = returns[key][i]
      }
      return row
    })

    return { chartData: data, allLines: lines, xInterval: xInt, lastReturnMap, benchLast }
  }, [prices, period, activeAC, chartTickers, bench, hasAnything])

  // Non-gradeable with no overlay → minimal notice
  if (!hasBench && chartTickers.length === 0) {
    return (
      <div style={{
        padding: '10px 16px',
        borderBottom: `1px solid ${COLOR.borderSoft}`,
        fontSize: 12, color: COLOR.textDim, textAlign: 'center',
      }}>
        [+]로 종목을 추가하면 누적수익률 차트가 표시됩니다.
      </div>
    )
  }

  return (
    <div style={{ padding: '10px 16px 6px', borderBottom: `1px solid ${COLOR.borderSoft}` }}>

      {/* Period presets + overlay tags */}
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
          const spread = (hasBench && benchLast != null && lastReturnMap[etf.ticker] != null)
            ? lastReturnMap[etf.ticker] - benchLast
            : null
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

      {/* Chart area */}
      {loadingPrices ? (
        <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLOR.textDim, fontSize: 12 }}>
          차트 데이터 로딩 중…
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: COLOR.textDim }}
              interval={xInterval - 1}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={v => (v >= 0 ? '+' : '') + v.toFixed(0) + '%'}
              tick={{ fontSize: 10, fill: COLOR.textDim }}
              axisLine={false}
              tickLine={false}
              width={44}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={0} stroke={COLOR.border} strokeDasharray="3 3" />
            {allLines.map(line => (
              <Line
                key={line.key}
                type="monotone"
                dataKey={line.key}
                name={line.label}
                stroke={line.color}
                strokeWidth={line.isBench ? 1.5 : 2}
                dot={false}
                connectNulls
                strokeDasharray={line.isBench ? '5 3' : undefined}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}

      {/* Caption */}
      <div style={{ fontSize: 10, color: COLOR.textDim, marginTop: 2, textAlign: 'right' }}>
        누적수익률(과거 실적), 미래수익 보장 아님.
        {bench && (
          <span style={{ marginLeft: 6 }}>
            <span style={{ color: '#64748b' }}>╌╌</span> {bench.label} (벤치마크)
          </span>
        )}
      </div>
    </div>
  )
}
