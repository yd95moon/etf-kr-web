import React, { useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { DataContext } from '../App.jsx'
import { ASSET_CLASS_META, COLOR } from '../constants.js'
import { sortEtfs, getFailReason, useIsMobile, fmtReturn } from '../utils.js'
import EtfRow from '../components/EtfRow.jsx'
import BenchmarkChart, { AC_DEFAULT_BENCH } from '../components/BenchmarkChart.jsx'

const COL_CHART = '32px 1fr 52px 90px 64px 36px'

function getPrimaryGate(etf) {
  const gates = etf.gates || {}
  for (const [key, val] of Object.entries(gates)) {
    if (key === 'G5') continue
    if (val && val.pass === false) return key
  }
  return 'other'
}

const SORT_OPTS = [
  { key: 'm3',    label: '3M' },
  { key: 'm6',    label: '6M' },
  { key: 'm12',   label: '1Y' },
  { key: 'aum',   label: 'AUM' },
  { key: 'fee',   label: '보수' },
  { key: 'grade', label: '등급' },
]

const RETURN_LABELS = { m3: '3M수익률', m6: '6M수익률', m12: '1Y수익률' }

function TableHeader({ aumLabel = 'AUM' }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: COL_CHART,
      padding: '6px 12px', gap: 8,
      fontSize: 11, fontWeight: 600,
      color: COLOR.textDim,
      borderBottom: `1px solid ${COLOR.border}`,
      textTransform: 'uppercase', letterSpacing: '0.04em',
    }}>
      <span></span>
      <span>종목명</span>
      <span>등급</span>
      <span style={{ textAlign: 'right' }}>{aumLabel}</span>
      <span style={{ textAlign: 'right' }}>보수</span>
      <span></span>
    </div>
  )
}

export default function Home() {
  const { data, etfList, activeAC, setActiveAC, prices, loadingPrices, subClassMap, returnsMap, benchmarks } = useContext(DataContext)
  const isMobile = useIsMobile()
  // 기본 정렬: 3M 수익률. 등급은 forward n=1·측정 전이라 기본 노출 부적절 (검증 완료 후 grade로 복귀 여지)
  const [sortMode, setSortMode] = useState('m3')
  const [sortDir, setSortDir] = useState('desc')
  const [sepOpen, setSepOpen] = useState(false)
  const [failOpen, setFailOpen] = useState(false)
  const [indexOpen, setIndexOpen] = useState(false)
  const [chartTickers, setChartTickers] = useState([])
  const [activeBenches, setActiveBenches] = useState(() => AC_DEFAULT_BENCH['domestic_equity'])

  useEffect(() => {
    setSepOpen(false)
    setFailOpen(false)
    setIndexOpen(false)
    setChartTickers([])
    setActiveBenches(AC_DEFAULT_BENCH[activeAC] ?? [])
  }, [activeAC])

  const toggleBench = useCallback((key) => {
    setActiveBenches(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    )
  }, [])

  const handleSort = useCallback((mode) => {
    setSortMode(prev => {
      if (prev === mode) {
        setSortDir(d => d === 'desc' ? 'asc' : 'desc')
        return mode
      }
      setSortDir(mode === 'fee' ? 'asc' : 'desc')
      return mode
    })
  }, [])

  const toggleChart = useCallback((etf) => {
    setChartTickers(prev =>
      prev.some(t => t.ticker === etf.ticker)
        ? prev.filter(t => t.ticker !== etf.ticker)
        : [...prev, { ticker: etf.ticker, name: etf.name }]
    )
  }, [])

  const removeFromChart = useCallback((ticker) => {
    setChartTickers(prev => prev.filter(t => t.ticker !== ticker))
  }, [])

  // KS11 1Y return for index tray spread — must be before early return (Hook rules)
  const ks11Return12 = useMemo(() => {
    const ks11 = benchmarks?.benchmarks?.KS11
    const dates = prices?.dates
    if (!ks11 || !dates || dates.length < 252) return null
    const startDate = dates[dates.length - 252]
    const endDate   = dates[dates.length - 1]
    const keys = Object.keys(ks11).sort()
    const findVal = (target) => {
      let last = null
      for (const k of keys) { if (k <= target) last = ks11[k]; else break }
      return last
    }
    const sv = findVal(startDate)
    const ev = findVal(endDate)
    if (!sv || !ev) return null
    return (ev / sv - 1) * 100
  }, [benchmarks, prices])

  if (!data) return <div style={{ padding: 32, color: COLOR.textMuted }}>데이터 로딩 중…</div>

  const meta = ASSET_CLASS_META[activeAC] || {}
  const isDanger = meta.tone === 'danger'
  const isGray = meta.tone === 'gray'

  const classEtfs = etfList.filter(e => e.asset_class === activeAC)
  const allMainEtfs = classEtfs.filter(e => e.final_class === '메인')
  const sepEtfs     = classEtfs.filter(e => e.final_class === '별도_트랙')
  const failEtfs    = classEtfs.filter(e => e.final_class === '탈락')
  const failG6    = failEtfs.filter(e => getPrimaryGate(e) === 'G6')
  const failG1    = failEtfs.filter(e => getPrimaryGate(e) === 'G1')
  const failData  = failEtfs.filter(e => ['G2', 'G3'].includes(getPrimaryGate(e)))
  const failOther = failEtfs.filter(e => !['G6', 'G1', 'G2', 'G3'].includes(getPrimaryGate(e)))

  const isIndexETF = (e) => activeAC === 'domestic_equity' && subClassMap?.[e.ticker] === 'index'
  const mainEtfs      = allMainEtfs.filter(e => !isIndexETF(e))
  const mainIndexEtfs = allMainEtfs.filter(e => isIndexETF(e))

  const effectiveSort = (!meta.gradeable && sortMode === 'grade') ? 'aum' : sortMode

  const showSepAsMain = mainEtfs.length === 0 && sepEtfs.length > 0
  const displayMain  = sortEtfs(showSepAsMain ? sepEtfs : mainEtfs, effectiveSort, sortDir, returnsMap)
  const traySep      = showSepAsMain ? [] : sortEtfs(sepEtfs, effectiveSort, sortDir, returnsMap)
  const displayIndex = sortEtfs(mainIndexEtfs, 'aum', 'desc', returnsMap)

  const returnKey = ['m3', 'm6', 'm12'].includes(effectiveSort) ? effectiveSort : null
  const aumLabel  = RETURN_LABELS[effectiveSort] || 'AUM'
  const dirArrow  = sortDir === 'desc' ? '↓' : '↑'

  const indexBenchDiff = (etf) => {
    if (ks11Return12 == null) return undefined
    const r = returnsMap?.[etf.ticker]?.m12
    return r != null ? r - ks11Return12 : undefined
  }

  const classes = Object.entries(ASSET_CLASS_META).sort((a, b) => a[1].order - b[1].order)

  const chartTickerSet = new Set(chartTickers.map(t => t.ticker))

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>

      {/* ── 자산군 토글 바 ── */}
      <div style={{
        display: 'flex', gap: 6, overflowX: 'auto',
        padding: '10px 12px',
        borderBottom: `1px solid ${COLOR.border}`,
        scrollbarWidth: 'none',
        WebkitOverflowScrolling: 'touch',
      }}>
        {classes.map(([ac, m]) => {
          const active = ac === activeAC
          const danger = m.tone === 'danger'
          return (
            <button
              key={ac}
              onClick={() => setActiveAC(ac)}
              style={{
                flexShrink: 0,
                padding: isMobile ? '5px 10px' : '6px 14px',
                borderRadius: 6,
                border: `1px solid ${active ? (danger ? COLOR.danger : '#5a6a9a') : COLOR.borderSoft}`,
                background: active ? (danger ? '#2a1d1d' : '#2a3050') : 'transparent',
                color: active ? (danger ? COLOR.danger : COLOR.text) : COLOR.textMuted,
                cursor: 'pointer',
                fontSize: isMobile ? 12 : 13,
                fontWeight: active ? 700 : 400,
                whiteSpace: 'nowrap',
                transition: 'all 0.1s',
              }}
            >
              {m.label}
            </button>
          )
        })}
      </div>

      {/* ── 차트 (벤치마크 + 종목 비교) ── */}
      <BenchmarkChart
        activeAC={activeAC}
        chartTickers={chartTickers}
        onRemoveTicker={removeFromChart}
        prices={prices}
        loadingPrices={loadingPrices}
        benchmarks={benchmarks}
        activeBenches={activeBenches}
        onToggleBench={toggleBench}
      />

      <div style={{ padding: '0 0 32px' }}>

        {/* ── 자산군 안내 배너 ── */}
        {(isDanger || isGray) && (
          <div style={{
            padding: '8px 16px',
            background: isDanger ? '#2a1d1d' : '#1e2028',
            borderBottom: `1px solid ${isDanger ? COLOR.danger + '44' : COLOR.borderSoft}`,
            fontSize: 12,
            color: isDanger ? COLOR.danger : COLOR.textDim,
          }}>
            {isDanger
              ? '⚠️ 레버리지·인버스 상품은 일일 목표 추적 구조로 장기 보유 시 복리 손실이 발생할 수 있습니다. 별도 관리 자산군으로, 등급을 부여하지 않습니다.'
              : '30종 미만 자산군으로 등급을 부여하지 않습니다. AUM·보수 수치만 제공합니다.'}
          </div>
        )}

        {/* ── 상태 / 등급 안내 ── */}
        <div style={{
          padding: '8px 16px',
          display: 'flex', flexWrap: 'wrap', gap: '4px 16px',
          fontSize: 11, color: COLOR.textDim,
          borderBottom: `1px solid ${COLOR.borderSoft}`,
        }}>
          <span>forward n=1 · 측정 전 · 첫 채점 2026-09-26</span>
          {data?.meta?.generated_at && (
            <span>데이터 기준: {data.meta.generated_at.slice(0, 10)}</span>
          )}
          {meta.gradeable && (
            <span>등급(A~E) · 같은 자산군 안에서 최근 추세·과열도·이동평균 거리·52주 위치·변동성 등 5개 기술 지표를 동일 비중으로 합산해 매긴 상대 순위. 수익 예측이 아닌 현재 신호 강도를 나타내며, 유효성은 검증 중(첫 채점 2026-09-26).</span>
          )}
        </div>

        {/* ── 정렬 버튼 ── */}
        <div style={{ display: 'flex', gap: 6, padding: '10px 16px 6px', flexWrap: 'wrap' }}>
          {SORT_OPTS.map(({ key, label }) => {
            const disabled = key === 'grade' && !meta.gradeable
            const active = effectiveSort === key
            const isGradeBtn = key === 'grade'
            return (
              <button
                key={key}
                disabled={disabled}
                onClick={() => handleSort(key)}
                style={{
                  padding: '5px 12px', borderRadius: 6,
                  border: active
                    ? `1px solid ${isGradeBtn ? '#6b5a7a' : '#5a6a9a'}`
                    : `1px ${isGradeBtn ? 'dashed' : 'solid'} ${isGradeBtn ? '#4a3d5a' : COLOR.border}`,
                  background: active ? (isGradeBtn ? '#2a2035' : '#2a3050') : COLOR.bgCard,
                  color: disabled ? COLOR.textDim : active ? (isGradeBtn ? '#c4a8d8' : COLOR.text) : (isGradeBtn ? '#7a6a8a' : COLOR.textMuted),
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  fontSize: 12, fontWeight: active ? 600 : 400,
                  opacity: disabled ? 0.4 : 1,
                }}
              >
                {isGradeBtn ? (
                  <span>등급 <span style={{ fontSize: 10, opacity: 0.75 }}>검증중</span></span>
                ) : label}
                {active ? ` ${dirArrow}` : ''}
              </button>
            )
          })}
        </div>

        {/* ── 등급 정렬 시 검증 안내 ── */}
        {effectiveSort === 'grade' && meta.gradeable && (
          <div style={{
            margin: '0 16px 10px',
            padding: '7px 12px',
            background: '#1e1a28',
            border: '1px dashed #6b5a7a',
            borderRadius: 6,
            fontSize: 11, color: '#a090b8',
            lineHeight: 1.5,
          }}>
            등급은 forward 검증 중입니다 (n=1, 첫 채점 2026-09-26). 24개월 후 유효성 미달 시 폐기 예정.
          </div>
        )}

        {/* ── 메인 테이블 ── */}
        <div style={{ padding: '0 16px', marginBottom: 12 }}>
          <div style={{
            background: COLOR.bgCard,
            border: `1px solid ${isDanger ? COLOR.danger + '44' : COLOR.border}`,
            borderRadius: 8, overflow: 'hidden',
          }}>
            {!isMobile && <TableHeader aumLabel={aumLabel} />}
            {displayMain.length === 0 ? (
              <div style={{ padding: '24px 16px', textAlign: 'center', color: COLOR.textDim }}>
                메인 종목 없음
              </div>
            ) : (
              displayMain.map(etf => (
                <EtfRow
                  key={etf.ticker}
                  etf={etf}
                  showWarning={isDanger}
                  dimmed={false}
                  isMobile={isMobile}
                  onChartToggle={toggleChart}
                  inChart={chartTickerSet.has(etf.ticker)}
                  isPassive={subClassMap?.[etf.ticker] === 'index'}
                  chartEnabled={!!prices?.tickers?.[etf.ticker]}
                  returnVal={returnKey ? returnsMap?.[etf.ticker]?.[returnKey] : undefined}
                />
              ))
            )}
          </div>
        </div>

        {/* ── 지수추종 트레이 (국내주식형만) ── */}
        {displayIndex.length > 0 && (
          <div style={{ padding: '0 16px', marginBottom: 12 }}>
            <div style={{
              background: '#1e2a38',
              border: `1px solid #93c5fd33`,
              borderRadius: 8, overflow: 'hidden',
            }}>
              <button
                onClick={() => setIndexOpen(o => !o)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px', background: 'none', border: 'none',
                  cursor: 'pointer', color: '#93c5fd',
                  fontSize: 13, fontWeight: 600,
                }}
              >
                <span>지수추종 ETF {displayIndex.length}종</span>
                {indexOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              {indexOpen && (
                <>
                  <div style={{
                    padding: '6px 14px 8px',
                    fontSize: 11, color: '#93c5fd99',
                    borderBottom: `1px solid #93c5fd22`,
                  }}>
                    같은 지수를 추종해 등급 비교 의미가 작음. 벤치 추적·보수 중심으로 보세요.
                    {ks11Return12 != null && ' (우측: 1Y 코스피 대비)'}
                  </div>
                  {!isMobile && <TableHeader aumLabel={ks11Return12 != null ? '1Y코스피대비' : 'AUM'} />}
                  {displayIndex.map(etf => (
                    <EtfRow
                      key={etf.ticker}
                      etf={etf}
                      showWarning={false}
                      dimmed
                      isMobile={isMobile}
                      onChartToggle={toggleChart}
                      inChart={chartTickerSet.has(etf.ticker)}
                      isPassive
                      chartEnabled={!!prices?.tickers?.[etf.ticker]}
                      returnVal={indexBenchDiff(etf)}
                      indexTray
                    />
                  ))}
                </>
              )}
            </div>
          </div>
        )}

        {/* ── 별도트랙 트레이 ── */}
        {traySep.length > 0 && (
          <div style={{ padding: '0 16px', marginBottom: 12 }}>
            <div style={{
              background: '#22242e',
              border: `1px solid ${COLOR.borderSoft}`,
              borderRadius: 8, overflow: 'hidden',
            }}>
              <button
                onClick={() => setSepOpen(o => !o)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px', background: 'none', border: 'none',
                  cursor: 'pointer', color: COLOR.textMuted,
                  fontSize: 13, fontWeight: 600,
                }}
              >
                <span>⚠️ 별도트랙 {traySep.length}종</span>
                {sepOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              {sepOpen && (
                <>
                  {!isMobile && <TableHeader aumLabel={aumLabel} />}
                  {traySep.map(etf => (
                    <EtfRow
                      key={etf.ticker}
                      etf={etf}
                      showWarning={false}
                      dimmed
                      isMobile={isMobile}
                      onChartToggle={toggleChart}
                      inChart={chartTickerSet.has(etf.ticker)}
                      isPassive={subClassMap?.[etf.ticker] === 'index'}
                      chartEnabled={!!prices?.tickers?.[etf.ticker]}
                      returnVal={returnKey ? returnsMap?.[etf.ticker]?.[returnKey] : undefined}
                    />
                  ))}
                </>
              )}
            </div>
          </div>
        )}

        {/* ── 메인 제외 트레이 ── */}
        {failEtfs.length > 0 && (
          <div style={{ padding: '0 16px', marginBottom: 12 }}>
            <div style={{
              background: '#1e2028',
              border: `1px solid ${COLOR.borderSoft}`,
              borderRadius: 8, overflow: 'hidden',
            }}>
              <button
                onClick={() => setFailOpen(o => !o)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px', background: 'none', border: 'none',
                  cursor: 'pointer', color: COLOR.textDim,
                  fontSize: 13, fontWeight: 600, gap: 8,
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span>메인 제외 {failEtfs.length}종</span>
                  {failG6.length > 0 && <span style={{ fontSize: 11, fontWeight: 400 }}>보수초과 {failG6.length}</span>}
                  {failG1.length > 0 && <span style={{ fontSize: 11, fontWeight: 400 }}>AUM미달 {failG1.length}</span>}
                  {failData.length > 0 && <span style={{ fontSize: 11, fontWeight: 400 }}>데이터부족 {failData.length}</span>}
                  {failOther.length > 0 && <span style={{ fontSize: 11, fontWeight: 400 }}>기타 {failOther.length}</span>}
                </span>
                {failOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              {failOpen && (
                <div>
                  <div style={{
                    display: 'grid', gridTemplateColumns: '72px 1fr 1fr',
                    padding: '6px 12px', gap: 8,
                    fontSize: 11, fontWeight: 600, color: COLOR.textDim,
                    borderBottom: `1px solid ${COLOR.borderSoft}`,
                    textTransform: 'uppercase',
                  }}>
                    <span>티커</span>
                    <span>이름</span>
                    <span>제외 사유</span>
                  </div>
                  {[
                    { label: '보수 중앙값 초과', etfs: failG6 },
                    { label: 'AUM 미달',       etfs: failG1 },
                    { label: '데이터 부족',    etfs: failData },
                    { label: '기타',           etfs: failOther },
                  ].filter(g => g.etfs.length > 0).map(group => (
                    <React.Fragment key={group.label}>
                      <div style={{
                        padding: '4px 12px',
                        fontSize: 10, fontWeight: 600, color: COLOR.textDim,
                        background: '#1a1c24',
                        borderBottom: `1px solid ${COLOR.borderSoft}`,
                        letterSpacing: '0.04em', textTransform: 'uppercase',
                      }}>
                        {group.label} {group.etfs.length}종
                      </div>
                      {group.etfs.map(etf => (
                        <div key={etf.ticker} style={{
                          display: 'grid', gridTemplateColumns: '72px 1fr 1fr',
                          padding: '7px 12px', gap: 8, fontSize: 12,
                          borderBottom: `1px solid ${COLOR.borderSoft}`,
                          alignItems: 'center',
                        }}>
                          <span style={{ fontFamily: 'monospace', color: COLOR.textDim }}>{etf.ticker}</span>
                          <span style={{ color: COLOR.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{etf.name}</span>
                          <span style={{ color: COLOR.textDim, fontSize: 11 }}>{getFailReason(etf)}</span>
                        </div>
                      ))}
                    </React.Fragment>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
