import React, { useContext, useState, useMemo, useCallback } from 'react'
import { Star } from 'lucide-react'
import { DataContext, WatchlistContext } from '../App.jsx'
import { PEER_META, COLOR, ROW_COLS } from '../constants.js'
import { buildEtfList, sortEtfs, useIsMobile, fmtFee } from '../utils.js'
import EtfRow from '../components/EtfRow.jsx'
import BenchmarkChart from '../components/BenchmarkChart.jsx'

// 관심 페이지는 "고르는" 곳이 아니라 "고른 것끼리 재보는" 곳이다.
// 그래서 처음부터 시장 기준선 세 개를 켜 둔다.
// 코스피(국내) · 나스닥(해외 성장) · 금(주식과 다르게 움직이는 것).
const DEFAULT_BENCH = ['KS11', 'IXIC', 'GOLD']

// 수익률 정렬로 인정되는 키. utils.js sortEtfs 의 목록과 반드시 같아야 한다.
const RETURN_KEYS = ['w1', 'm1', 'm3', 'm6', 'm12', 'm36', 'm60']

const SORT_OPTS = [
  { key: 'w1',   label: '1주' },
  { key: 'm1',   label: '1개월' },
  { key: 'm3',   label: '3개월' },
  { key: 'm6',   label: '6개월' },
  { key: 'm12',  label: '1년' },
  { key: 'm36',  label: '3년' },
  { key: 'm60',  label: '5년' },
  { key: 'dist', label: '월분배' },
  { key: 'aum',  label: 'AUM' },
  { key: 'fee',  label: '보수' },
]
const RETURN_LABELS = { w1: '1주수익률', m1: '1개월수익률',
                        m3: '3개월수익률', m6: '6개월수익률', m12: '1년수익률',
                        m36: '3년수익률', m60: '5년수익률' }

// 두 종목이 얼마나 같이 움직였나. 1에 가까울수록 사실상 같은 상품이다.
const CORR_DAYS = 252
const SAME_THRESHOLD = 0.95

function dailyReturns(closes, n) {
  const s = closes.slice(-n)
  const out = []
  for (let i = 1; i < s.length; i++) {
    const a = s[i - 1], b = s[i]
    out.push(a && b && a > 0 ? b / a - 1 : null)
  }
  return out
}

function corr(x, y) {
  const pairs = []
  for (let i = 0; i < Math.min(x.length, y.length); i++) {
    if (x[i] != null && y[i] != null) pairs.push([x[i], y[i]])
  }
  if (pairs.length < 120) return null
  const n = pairs.length
  const mx = pairs.reduce((s, p) => s + p[0], 0) / n
  const my = pairs.reduce((s, p) => s + p[1], 0) / n
  let num = 0, dx = 0, dy = 0
  for (const [a, b] of pairs) {
    num += (a - mx) * (b - my); dx += (a - mx) ** 2; dy += (b - my) ** 2
  }
  const den = Math.sqrt(dx * dy)
  return den ? num / den : null
}

// 보수 차이가 10년 뒤 얼마가 되는지. 1,000만원을 넣었다고 놓고 계산한다.
// 수익률은 가정하지 않고 보수만 비교하므로 "덜 떼이는 금액"의 최소치다.
function feeGapWon(feeA, feeB, years = 10, principal = 10000000) {
  if (feeA == null || feeB == null) return null
  const diff = Math.abs(feeA - feeB) / 100
  return Math.round(principal * (1 - Math.pow(1 - diff, years)))
}

const fmtFee3 = (v) => (v == null ? '—' : v.toFixed(3) + '%')

function Empty() {
  return (
    <div style={{ padding: '64px 24px', textAlign: 'center' }}>
      <Star size={40} style={{ color: COLOR.textDim, marginBottom: 16 }} />
      <div style={{ fontSize: 16, color: COLOR.textMuted, marginBottom: 8 }}>관심 ETF가 없습니다</div>
      <div style={{ fontSize: 13, color: COLOR.textDim }}>
        목록에서 ★를 눌러 담으면 여기서 한 화면에 놓고 비교할 수 있습니다.
      </div>
    </div>
  )
}

export default function Watchlist() {
  const { data, prices, loadingPrices, returnsMap, benchmarks } = useContext(DataContext)
  const { watchlist } = useContext(WatchlistContext)
  const isMobile = useIsMobile()

  const [sortMode, setSortMode] = useState('m12')
  const [sortDir, setSortDir] = useState('desc')
  const [activeBenches, setActiveBenches] = useState(DEFAULT_BENCH)
  // 차트에서 잠깐 빼둔 종목. 관심 목록에서 지우는 것과는 다르다.
  const [hidden, setHidden] = useState([])

  const toggleBench = useCallback((key) => {
    setActiveBenches(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])
  }, [])

  // 행의 [+/−]로 하나씩 켜고 끈다. 차트 칩의 X와 같은 목록(hidden)을 뒤집어 쓴다.
  const toggleChart = useCallback((etf) => {
    setHidden(prev => prev.includes(etf.ticker)
      ? prev.filter(t => t !== etf.ticker)
      : [...prev, etf.ticker])
  }, [])

  const handleSort = useCallback((mode) => {
    setSortMode(prev => {
      if (prev === mode) { setSortDir(d => (d === 'desc' ? 'asc' : 'desc')); return mode }
      setSortDir(mode === 'fee' ? 'asc' : 'desc')
      return mode
    })
  }, [])

  const watchEtfs = useMemo(() => {
    if (!data) return []
    return buildEtfList(data.etfs).filter(e => watchlist.includes(e.ticker))
  }, [data, watchlist])

  // 겹치는 종목 찾기. 관심 목록에 사실상 같은 상품이 여러 개 있으면
  // 나눠 담은 줄 알지만 실제로는 한 곳에 몰아넣은 것이다.
  const overlaps = useMemo(() => {
    if (!prices?.tickers || watchEtfs.length < 2) return []
    const rets = {}
    for (const e of watchEtfs) {
      const c = prices.tickers[e.ticker]
      if (c) rets[e.ticker] = dailyReturns(c, CORR_DAYS)
    }
    const out = []
    const ks = Object.keys(rets)
    for (let i = 0; i < ks.length; i++) {
      for (let j = i + 1; j < ks.length; j++) {
        const c = corr(rets[ks[i]], rets[ks[j]])
        if (c != null && c >= SAME_THRESHOLD) {
          out.push({
            a: watchEtfs.find(e => e.ticker === ks[i]),
            b: watchEtfs.find(e => e.ticker === ks[j]),
            c,
          })
        }
      }
    }
    return out.sort((p, q) => q.c - p.c)
  }, [prices, watchEtfs])

  if (!data) return <div style={{ padding: 32, color: COLOR.textMuted }}>데이터 로딩 중…</div>
  if (watchlist.length === 0) return <Empty />

  const returnKey = RETURN_KEYS.includes(sortMode) ? sortMode : null
  const periodKey = returnKey || 'm12'
  const showDist = sortMode === 'dist' || watchEtfs.some(e => e.peer_group === 'income')
  const rows = sortEtfs(watchEtfs, sortMode, sortDir, returnsMap, periodKey)
  const dirArrow = sortDir === 'desc' ? '↓' : '↑'
  const peers = [...new Set(watchEtfs.map(e => e.peer_group))]

  const chartTickers = watchEtfs
    .filter(e => !hidden.includes(e.ticker))
    .map(e => ({ ticker: e.ticker, name: e.name }))

  const fees = watchEtfs.map(e => e.fee_pct).filter(v => v != null)
  const feeAvg = fees.length ? fees.reduce((s, v) => s + v, 0) / fees.length : null
  const feeMin = fees.length ? Math.min(...fees) : null
  const feeMax = fees.length ? Math.max(...fees) : null

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: '14px 16px 8px' }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: COLOR.text }}>
          <Star size={16} style={{ color: COLOR.star, marginRight: 6, verticalAlign: -2 }} />
          관심 ETF
        </h1>
        <span style={{ fontSize: 12, color: COLOR.textDim }}>{watchEtfs.length}종</span>
      </div>

      {/* 담은 종목이 처음부터 전부 차트에 올라가 있다. 고른 것끼리 재보는 곳이므로
          하나씩 더할 이유가 없다. 코스피·나스닥·금이 기본 기준선이다. */}
      <BenchmarkChart
        activeAC="watchlist"
        chartTickers={chartTickers}
        onRemoveTicker={(t) => setHidden(prev => [...prev, t])}
        prices={prices}
        loadingPrices={loadingPrices}
        benchmarks={benchmarks}
        activeBenches={activeBenches}
        onToggleBench={toggleBench}
      />

      {hidden.length > 0 && (
        <div style={{ padding: '6px 16px 0' }}>
          <button
            onClick={() => setHidden([])}
            style={{
              padding: '4px 10px', borderRadius: 6, fontFamily: 'inherit',
              border: `1px solid ${COLOR.borderSoft}`, background: COLOR.bgCard,
              color: COLOR.textMuted, fontSize: 11, cursor: 'pointer',
            }}
          >
            차트에서 뺀 {hidden.length}종 다시 넣기
          </button>
        </div>
      )}

      {/* ── 한눈 요약 ── */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: '4px 16px',
        padding: '10px 16px', fontSize: 11, color: COLOR.textDim,
        borderBottom: `1px solid ${COLOR.borderSoft}`,
      }}>
        {feeAvg != null && (
          <span>평균 보수 <strong style={{ color: COLOR.textMuted }}>{fmtFee(feeAvg)}</strong>
            {' '}(가장 싼 {fmtFee(feeMin)} ~ 가장 비싼 {fmtFee(feeMax)})</span>
        )}
        <span>묶음 {peers.length}개</span>
        <span>등급(A~E)은 같은 묶음 안에서만 매긴 상대 순위입니다.</span>
      </div>

      {/* ── 겹침 진단 ──
          나눠 담았다고 생각하지만 실제로는 같은 것을 두 번 산 경우를 짚어준다.
          판단은 이름이 아니라 최근 1년 가격이 얼마나 같이 움직였는지로 한다. */}
      {overlaps.length > 0 && (
        <div style={{ padding: '10px 16px 0' }}>
          <div style={{
            background: '#2a2620', border: '1px solid #fbbf2444',
            borderRadius: 8, padding: '10px 12px',
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#fbbf24', marginBottom: 6 }}>
              거의 같이 움직이는 짝이 {overlaps.length}개 있습니다
            </div>
            <div style={{ fontSize: 11, color: COLOR.textDim, lineHeight: 1.5, marginBottom: 8 }}>
              최근 1년 가격이 {Math.round(SAME_THRESHOLD * 100)}% 이상 같이 움직였습니다.
              나눠 담은 것 같아도 실제로는 한 곳에 몰아넣은 것에 가깝습니다.
              같은 값이면 보수가 싼 쪽이 유리합니다.
            </div>
            {overlaps.slice(0, 5).map(({ a, b, c }) => {
              const cheap = (a.fee_pct ?? 9) <= (b.fee_pct ?? 9) ? a : b
              const pricey = cheap === a ? b : a
              const gap = feeGapWon(a.fee_pct, b.fee_pct)
              return (
                <div key={a.ticker + b.ticker} style={{
                  fontSize: 11.5, color: COLOR.textMuted, lineHeight: 1.6,
                  paddingTop: 6, borderTop: `1px solid ${COLOR.borderSoft}`,
                }}>
                  <strong style={{ color: COLOR.text }}>{a.name}</strong>
                  {' ↔ '}
                  <strong style={{ color: COLOR.text }}>{b.name}</strong>
                  <span style={{ color: '#fbbf24' }}> ({(c * 100).toFixed(0)}%)</span>
                  <div style={{ color: COLOR.textDim }}>
                    {/* 여기서는 보수를 소수점 셋째 자리까지 쓴다.
                        둘째 자리에서 반올림하면 0.008% 와 0.010% 가 둘 다
                        '0.01%' 로 보여 비교가 되지 않는다. */}
                    보수 {fmtFee3(cheap.fee_pct)} ({cheap.name.split(' ')[0]})
                    {' vs '}
                    {fmtFee3(pricey.fee_pct)} ({pricey.name.split(' ')[0]})
                    {gap != null && gap >= 10000
                      ? ` · 1,000만원 10년이면 ${gap.toLocaleString('ko-KR')}원 차이`
                      : ' · 보수 차이는 거의 없음'}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── 정렬 ── */}
      <div style={{ display: 'flex', gap: 6, padding: '12px 16px 6px', flexWrap: 'wrap' }}>
        {SORT_OPTS.map(({ key, label }) => {
          const active = sortMode === key
          const btn = (
            <button
              key={key}
              onClick={() => handleSort(key)}
              style={{
                padding: '5px 12px', borderRadius: 6, fontFamily: 'inherit',
                border: `1px solid ${active ? '#5a6a9a' : COLOR.border}`,
                background: active ? '#2a3050' : COLOR.bgCard,
                color: active ? COLOR.text : COLOR.textMuted,
                fontSize: 12, fontWeight: active ? 600 : 400, cursor: 'pointer',
              }}
            >
              {label}{active ? ` ${dirArrow}` : ''}
            </button>
          )
          // 좁은 화면에서는 기간(1주~5년)과 성격(월분배·AUM·보수)을 줄로 나눈다.
          if (isMobile && key === 'dist') {
            return (
              <React.Fragment key={key}>
                <div style={{ flexBasis: '100%', height: 0 }} />
                {btn}
              </React.Fragment>
            )
          }
          return btn
        })}
      </div>

      {/* ── 한 줄 목록 ── */}
      <div style={{ padding: '0 16px 32px' }}>
        <div style={{
          background: COLOR.bgCard, border: `1px solid ${COLOR.border}`,
          borderRadius: 8, overflow: 'hidden',
        }}>
          {!isMobile && (
            <div style={{
              display: 'grid', gridTemplateColumns: ROW_COLS(showDist, true),
              padding: '6px 12px', gap: 8,
              fontSize: 11, fontWeight: 600, color: COLOR.textDim,
              borderBottom: `1px solid ${COLOR.border}`,
              textTransform: 'uppercase', letterSpacing: '0.04em',
            }}>
              <span></span>
              <span>종목명</span>
              <span>등급</span>
              <span style={{ textAlign: 'right' }}>{RETURN_LABELS[sortMode] || 'AUM'}</span>
              {showDist && <span style={{ textAlign: 'right' }}>월분배</span>}
              <span style={{ textAlign: 'right' }}>보수</span>
              <span></span>
            </div>
          )}
          {rows.map(etf => (
            <EtfRow
              key={etf.ticker}
              etf={etf}
              isMobile={isMobile}
              isPassive={etf.style === 'broad_index'}
              indexTray={etf.peer_group === 'kr_index'}
              returnVal={returnKey ? returnsMap?.[etf.ticker]?.[returnKey] : undefined}
              showDist={showDist}
              distVal={etf.dist?.[periodKey]?.monthly_pct}
              distInfo={etf.dist?.[periodKey]}
              peerLabel={peers.length > 1 ? PEER_META[etf.peer_group]?.short : null}
              onChartToggle={toggleChart}
              inChart={!hidden.includes(etf.ticker)}
              chartEnabled={!!prices?.tickers?.[etf.ticker]}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
