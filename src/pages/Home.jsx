import React, { useContext, useState, useEffect, useCallback } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { DataContext } from '../App.jsx'
import { ASSET_CLASS_META, COLOR } from '../constants.js'
import { sortEtfs, getFailReason, useIsMobile } from '../utils.js'
import EtfRow from '../components/EtfRow.jsx'
import BenchmarkChart from '../components/BenchmarkChart.jsx'

const COL_CHART = '32px 1fr 52px 90px 64px 36px'

function TableHeader() {
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
      <span style={{ textAlign: 'right' }}>AUM</span>
      <span style={{ textAlign: 'right' }}>보수</span>
      <span></span>
    </div>
  )
}

export default function Home() {
  const { data, etfList, activeAC, setActiveAC, prices, loadingPrices, subClassMap } = useContext(DataContext)
  const isMobile = useIsMobile()
  const [sortMode, setSortMode] = useState('grade')
  const [sepOpen, setSepOpen] = useState(false)
  const [failOpen, setFailOpen] = useState(false)
  const [chartTickers, setChartTickers] = useState([]) // [{ticker, name}]

  useEffect(() => {
    setSepOpen(false)
    setFailOpen(false)
    setChartTickers([])
  }, [activeAC])

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

  if (!data) return <div style={{ padding: 32, color: COLOR.textMuted }}>데이터 로딩 중…</div>

  const meta = ASSET_CLASS_META[activeAC] || {}
  const isDanger = meta.tone === 'danger'
  const isGray = meta.tone === 'gray'

  const classEtfs = etfList.filter(e => e.asset_class === activeAC)
  const mainEtfs  = classEtfs.filter(e => e.final_class === '메인')
  const sepEtfs   = classEtfs.filter(e => e.final_class === '별도_트랙')
  const failEtfs  = classEtfs.filter(e => e.final_class === '탈락')

  const effectiveSort = (!meta.gradeable && sortMode === 'grade') ? 'aum' : sortMode

  const showSepAsMain = mainEtfs.length === 0 && sepEtfs.length > 0
  const displayMain = sortEtfs(showSepAsMain ? sepEtfs : mainEtfs, effectiveSort)
  const traySep = showSepAsMain ? [] : sortEtfs(sepEtfs, effectiveSort)

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
          {meta.gradeable && (
            <span>등급은 같은 자산군 안에서의 상대 위치(백분위 5분위)입니다. 미래수익 보장 아님.</span>
          )}
        </div>

        {/* ── 정렬 버튼 ── */}
        <div style={{ display: 'flex', gap: 8, padding: '10px 16px 12px' }}>
          {['grade', 'aum', 'fee'].map(mode => {
            const labels = { grade: '등급', aum: 'AUM', fee: '보수' }
            const disabled = mode === 'grade' && !meta.gradeable
            const active = effectiveSort === mode
            return (
              <button
                key={mode}
                disabled={disabled}
                onClick={() => setSortMode(mode)}
                style={{
                  padding: '5px 14px', borderRadius: 6,
                  border: `1px solid ${active ? '#5a6a9a' : COLOR.border}`,
                  background: active ? '#2a3050' : COLOR.bgCard,
                  color: disabled ? COLOR.textDim : active ? COLOR.text : COLOR.textMuted,
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  fontSize: 12, fontWeight: active ? 600 : 400,
                  opacity: disabled ? 0.4 : 1,
                }}
              >{labels[mode]}</button>
            )
          })}
        </div>

        {/* ── 메인 테이블 ── */}
        <div style={{ padding: '0 16px', marginBottom: 12 }}>
          <div style={{
            background: COLOR.bgCard,
            border: `1px solid ${isDanger ? COLOR.danger + '44' : COLOR.border}`,
            borderRadius: 8, overflow: 'hidden',
          }}>
            {!isMobile && <TableHeader />}
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
                />
              ))
            )}
          </div>
        </div>

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
                  {!isMobile && <TableHeader />}
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
                    />
                  ))}
                </>
              )}
            </div>
          </div>
        )}

        {/* ── 탈락 트레이 ── */}
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
                  fontSize: 13, fontWeight: 600,
                }}
              >
                <span>탈락 {failEtfs.length}종</span>
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
                    <span>탈락 사유</span>
                  </div>
                  {failEtfs.map(etf => (
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
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
