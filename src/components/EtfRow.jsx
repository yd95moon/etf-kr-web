import React, { useState, useContext } from 'react'
import { ChevronDown, ChevronUp, Star, ExternalLink } from 'lucide-react'
import GradeChip from './GradeChip.jsx'
import { COLOR, SIGNAL_LABELS, GATE_LABELS, GATE_REASON_KO } from '../constants.js'
import { fmtAum, fmtFee } from '../utils.js'
import { WatchlistContext } from '../App.jsx'

const S = {
  row: {
    borderBottom: `1px solid ${COLOR.borderSoft}`,
    cursor: 'pointer',
    transition: 'background 0.1s',
  },
  panel: {
    background: COLOR.bgCardAlt,
    borderBottom: `1px solid ${COLOR.border}`,
    padding: '12px 16px',
  },
  sectionBtn: {
    display: 'flex', alignItems: 'center', gap: 4,
    background: 'none', border: 'none',
    color: COLOR.textMuted, cursor: 'pointer',
    fontSize: 12, fontWeight: 600,
    padding: '6px 0', marginTop: 8,
  },
  l1Row: {
    display: 'flex', alignItems: 'center',
    flexWrap: 'wrap', gap: 10, marginBottom: 6,
  },
  signalGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
    gap: 6, marginTop: 6,
  },
  signalCard: {
    background: COLOR.bg,
    border: `1px solid ${COLOR.border}`,
    borderRadius: 6, padding: '6px 10px',
  },
  gateGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: 6, marginTop: 6,
  },
  gateItem: {
    display: 'flex', gap: 6,
    alignItems: 'flex-start', fontSize: 12, padding: '4px 0',
  },
}

function StarBtn({ ticker }) {
  const { watchlist, toggleTicker } = useContext(WatchlistContext)
  const on = watchlist.includes(ticker)
  return (
    <button
      onClick={e => { e.stopPropagation(); toggleTicker(ticker) }}
      style={{
        background: 'none', border: 'none', cursor: 'pointer',
        padding: 2, color: on ? COLOR.star : COLOR.textDim,
        display: 'flex', alignItems: 'center',
      }}
      title={on ? '관심 해제' : '관심 추가'}
    >
      <Star size={15} fill={on ? COLOR.star : 'none'} />
    </button>
  )
}

function ChartBtn({ onClick, inChart, enabled = true }) {
  return (
    <button
      onClick={onClick}
      title={!enabled ? '가격 데이터 없음' : inChart ? '차트에서 제거' : '차트에 추가'}
      style={{
        padding: '3px 5px', borderRadius: 4,
        cursor: enabled ? 'pointer' : 'not-allowed',
        border: `1px solid ${inChart ? '#5a6a9a' : COLOR.border}`,
        background: inChart ? '#2a3050' : 'transparent',
        color: inChart ? COLOR.text : COLOR.textDim,
        fontSize: 14, fontWeight: 700, lineHeight: 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minWidth: 24, opacity: enabled ? 1 : 0.3,
      }}
    >
      {inChart ? '−' : '+'}
    </button>
  )
}

function PassiveTag() {
  return (
    <span style={{
      fontSize: 10, padding: '1px 5px', borderRadius: 3,
      background: '#1e3a5f33', color: '#93c5fd',
      border: '1px solid #93c5fd33',
      fontWeight: 500, flexShrink: 0, whiteSpace: 'nowrap',
    }}>지수추종</span>
  )
}

function NameLink({ ticker, name }) {
  return (
    <a
      href={`https://www.tradingview.com/symbols/KRX-${ticker}/`}
      target="_blank"
      rel="noopener noreferrer"
      onClick={e => e.stopPropagation()}
      style={{
        textDecoration: 'none', color: 'inherit',
        display: 'inline-flex', alignItems: 'center', gap: 3,
        overflow: 'hidden',
      }}
    >
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {name}
      </span>
      <ExternalLink size={10} style={{ color: COLOR.textDim, flexShrink: 0 }} />
    </a>
  )
}

export default function EtfRow({
  etf,
  showWarning = false,
  dimmed = false,
  isMobile = false,
  onChartToggle,
  inChart = false,
  isPassive = false,
  chartEnabled = true,
}) {
  const [open, setOpen] = useState(false)
  const [showSignals, setShowSignals] = useState(false)
  const [showGates, setShowGates] = useState(false)

  const COL = onChartToggle ? '32px 1fr 52px 90px 64px 36px' : '32px 1fr 52px 90px 64px'

  const rowBg = open ? COLOR.bgCardAlt : dimmed ? COLOR.bg : 'transparent'
  const gates = etf.gates || {}
  const signals = etf.signals || {}
  const grade = etf.grade_eligible ? etf.composite_grade : null

  const handleChartClick = onChartToggle
    ? e => { e.stopPropagation(); if (chartEnabled) onChartToggle(etf) }
    : null

  const panel = open && (
    <div style={S.panel}>
      {showWarning && (
        <div style={{
          marginBottom: 10, padding: '6px 10px',
          background: '#2a1d1d', border: `1px solid ${COLOR.danger}44`,
          borderRadius: 6, fontSize: 12, color: COLOR.danger,
        }}>
          ⚠️ 레버리지·인버스 상품: 장기보유 부적합. 일일 목표 추적으로 장기 복리 손실 발생 가능.
        </div>
      )}

      {isPassive && etf.grade_eligible && (
        <div style={{
          marginBottom: 8, padding: '5px 8px',
          background: '#1e3a5f22', borderRadius: 5, fontSize: 11,
          color: '#93c5fd',
        }}>
          지수추종 ETF는 등급(추세신호)보다 지수 추적·보수가 핵심입니다.
        </div>
      )}

      {/* L1: grade + AUM + fee */}
      <div style={S.l1Row}>
        <GradeChip grade={grade} />
        <span style={{ fontSize: 13, color: COLOR.textMuted }}>
          <strong style={{ color: COLOR.text }}>{fmtAum(etf.aum_억원)}</strong> AUM
        </span>
        <span style={{ fontSize: 13, color: COLOR.textMuted }}>
          보수 <strong style={{ color: COLOR.text }}>{fmtFee(etf.fee_pct)}</strong>
        </span>
      </div>

      {/* 신호 5개 */}
      {etf.grade_eligible && (
        <>
          <button style={S.sectionBtn} onClick={e => { e.stopPropagation(); setShowSignals(s => !s) }}>
            {showSignals ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            신호 5개
          </button>
          {showSignals && (
            <div style={S.signalGrid} onClick={e => e.stopPropagation()}>
              {Object.entries(signals).map(([key, sig]) => {
                if (!sig) return null
                return (
                  <div key={key} style={S.signalCard}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                      <span style={{ fontSize: 11, color: COLOR.textMuted, fontWeight: 600 }}>{key} {SIGNAL_LABELS[key]}</span>
                      <GradeChip grade={sig.grade} size="sm" />
                    </div>
                    <div style={{ display: 'flex', gap: 8, fontSize: 11, color: COLOR.textDim }}>
                      <span>raw: {sig.raw != null ? sig.raw.toFixed(2) : '—'}</span>
                      <span>{sig.percentile != null ? sig.percentile.toFixed(1) + '%ile' : '—'}</span>
                    </div>
                    {sig.null_reason && (
                      <div style={{ fontSize: 10, color: COLOR.textDim, marginTop: 2 }}>{sig.null_reason}</div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* 게이트 현황 */}
      <button style={S.sectionBtn} onClick={e => { e.stopPropagation(); setShowGates(g => !g) }}>
        {showGates ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        게이트 현황
      </button>
      {showGates && (
        <div style={S.gateGrid} onClick={e => e.stopPropagation()}>
          {['G1','G2','G3','G4','G5','G6'].map(key => {
            const val = gates[key]
            if (!val) return null
            let passed, text
            if (key === 'G5') {
              passed = !val.separate_track
              text = val.separate_track ? '레버리지·인버스 별도트랙' : '해당 없음'
            } else {
              passed = val.pass !== false
              text = val.pass === false
                ? GATE_REASON_KO(key, val.reason)
                : (val.reason ? GATE_REASON_KO(key, val.reason) : '통과')
            }
            return (
              <div key={key} style={S.gateItem}>
                <span style={{ color: passed ? '#86efac' : COLOR.danger, fontWeight: 700, fontSize: 13 }}>
                  {passed ? '✓' : '✗'}
                </span>
                <div>
                  <span style={{ fontSize: 12, color: COLOR.text, fontWeight: 600 }}>{key} {GATE_LABELS[key]}</span>
                  <div style={{ fontSize: 11, color: COLOR.textDim }}>{text}</div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* 패널 푸터: 빠진 항목 안내 1줄 */}
      <div style={{
        marginTop: 10, paddingTop: 8,
        borderTop: `1px solid ${COLOR.borderSoft}`,
        fontSize: 11, color: COLOR.textDim,
      }}>
        분배·환헤지·합성신용 미반영
      </div>
    </div>
  )

  // ── 모바일 카드 ──
  if (isMobile) {
    return (
      <>
        <div
          style={{ ...S.row, background: rowBg }}
          onMouseEnter={e => { if (!open) e.currentTarget.style.background = COLOR.bgCardAlt }}
          onMouseLeave={e => { if (!open) e.currentTarget.style.background = rowBg }}
          onClick={() => setOpen(o => !o)}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, padding: '10px 12px' }}>
            <div style={{ paddingTop: 1, flexShrink: 0 }}>
              <StarBtn ticker={etf.ticker} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                <span style={{
                  flex: 1, fontSize: 14, fontWeight: 600, color: COLOR.text, minWidth: 0,
                }}>
                  <NameLink ticker={etf.ticker} name={etf.name} />
                </span>
                {isPassive && <PassiveTag />}
                <GradeChip grade={grade} />
                {onChartToggle && (
                  <ChartBtn onClick={handleChartClick} inChart={inChart} enabled={chartEnabled} />
                )}
              </div>
              <div style={{ fontSize: 11, color: COLOR.textDim }}>
                <span style={{ fontFamily: 'monospace' }}>{etf.ticker}</span>
                <span style={{ margin: '0 4px', color: COLOR.borderSoft }}>·</span>
                <span>{fmtAum(etf.aum_억원)}</span>
                <span style={{ margin: '0 4px', color: COLOR.borderSoft }}>·</span>
                <span>{fmtFee(etf.fee_pct)}</span>
              </div>
            </div>
          </div>
        </div>
        {panel}
      </>
    )
  }

  // ── PC 테이블 행 ──
  return (
    <>
      <div
        style={{ ...S.row, background: rowBg }}
        onMouseEnter={e => { if (!open) e.currentTarget.style.background = COLOR.bgCardAlt }}
        onMouseLeave={e => { if (!open) e.currentTarget.style.background = rowBg }}
        onClick={() => setOpen(o => !o)}
      >
        <div style={{
          display: 'grid', gridTemplateColumns: COL,
          alignItems: 'center', padding: '8px 12px', gap: 8, minHeight: 44,
        }}>
          <StarBtn ticker={etf.ticker} />
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontSize: 13, fontWeight: 600, color: COLOR.text,
              display: 'flex', alignItems: 'center', gap: 5, overflow: 'hidden',
            }}>
              <NameLink ticker={etf.ticker} name={etf.name} />
              {isPassive && <PassiveTag />}
            </div>
            <div style={{ fontSize: 11, color: COLOR.textDim, fontFamily: 'monospace', marginTop: 1 }}>
              {etf.ticker}
            </div>
          </div>
          <span><GradeChip grade={grade} /></span>
          <span style={{ fontSize: 12, color: COLOR.textMuted, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
            {fmtAum(etf.aum_억원)}
          </span>
          <span style={{ fontSize: 12, color: COLOR.textMuted, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
            {fmtFee(etf.fee_pct)}
          </span>
          {onChartToggle && (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <ChartBtn onClick={handleChartClick} inChart={inChart} enabled={chartEnabled} />
            </div>
          )}
        </div>
      </div>
      {panel}
    </>
  )
}
