import React, { useState, useContext } from 'react'
import { ChevronDown, ChevronUp, Star } from 'lucide-react'
import GradeChip from './GradeChip.jsx'
import { COLOR, GRADE_COLOR, SIGNAL_LABELS, GATE_LABELS, GATE_REASON_KO } from '../constants.js'
import { fmtAum, fmtFee } from '../utils.js'
import { WatchlistContext } from '../App.jsx'

const S = {
  row: {
    borderBottom: `1px solid ${COLOR.borderSoft}`,
    cursor: 'pointer',
    transition: 'background 0.1s',
  },
  rowCells: {
    display: 'grid',
    gridTemplateColumns: '32px 72px 1fr 52px 90px 64px',
    alignItems: 'center',
    padding: '8px 12px',
    gap: 8,
    minHeight: 40,
  },
  panel: {
    background: COLOR.bgCardAlt,
    borderBottom: `1px solid ${COLOR.border}`,
    padding: '12px 16px',
  },
  sectionBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    background: 'none',
    border: 'none',
    color: COLOR.textMuted,
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 600,
    padding: '6px 0',
    marginTop: 8,
  },
  l1Row: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 6,
  },
  signalGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
    gap: 6,
    marginTop: 6,
  },
  signalCard: {
    background: COLOR.bg,
    border: `1px solid ${COLOR.border}`,
    borderRadius: 6,
    padding: '6px 10px',
  },
  gateGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: 6,
    marginTop: 6,
  },
  gateItem: {
    display: 'flex',
    gap: 6,
    alignItems: 'flex-start',
    fontSize: 12,
    padding: '4px 0',
  },
  specLabel: {
    marginTop: 10,
    fontSize: 11,
    color: COLOR.textDim,
    lineHeight: 1.4,
    borderTop: `1px solid ${COLOR.borderSoft}`,
    paddingTop: 8,
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

export default function EtfRow({ etf, showWarning = false, dimmed = false }) {
  const [open, setOpen] = useState(false)
  const [showSignals, setShowSignals] = useState(false)
  const [showGates, setShowGates] = useState(false)

  const rowBg = open
    ? COLOR.bgCardAlt
    : dimmed
    ? COLOR.bg
    : 'transparent'

  const gates = etf.gates || {}
  const signals = etf.signals || {}

  return (
    <>
      <div
        style={{ ...S.row, background: rowBg }}
        onMouseEnter={e => { if (!open) e.currentTarget.style.background = COLOR.bgCardAlt }}
        onMouseLeave={e => { if (!open) e.currentTarget.style.background = rowBg }}
        onClick={() => setOpen(o => !o)}
      >
        <div style={S.rowCells}>
          <StarBtn ticker={etf.ticker} />
          <span style={{ fontFamily: 'monospace', fontSize: 12, color: COLOR.textMuted }}>{etf.ticker}</span>
          <span style={{ fontSize: 13, color: COLOR.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {etf.name}
          </span>
          <span>
            <GradeChip grade={etf.grade_eligible ? etf.composite_grade : null} />
          </span>
          <span style={{ fontSize: 12, color: COLOR.textMuted, textAlign: 'right' }}>{fmtAum(etf.aum_억원)}</span>
          <span style={{ fontSize: 12, color: COLOR.textMuted, textAlign: 'right' }}>{fmtFee(etf.fee_pct)}</span>
        </div>
      </div>

      {open && (
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

          {/* L1: always visible */}
          <div style={S.l1Row}>
            <GradeChip grade={etf.grade_eligible ? etf.composite_grade : null} />
            <span style={{ fontSize: 13, color: COLOR.textMuted }}>
              <strong style={{ color: COLOR.text }}>{fmtAum(etf.aum_억원)}</strong> AUM
            </span>
            <span style={{ fontSize: 13, color: COLOR.textMuted }}>
              보수 <strong style={{ color: COLOR.text }}>{fmtFee(etf.fee_pct)}</strong>
            </span>
          </div>
          <div style={{ fontSize: 11, color: COLOR.textDim, lineHeight: 1.4 }}>
            {etf.spec_label}
          </div>

          {/* Signals section */}
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
                    const label = SIGNAL_LABELS[key] || key
                    const pct = sig.percentile != null ? sig.percentile.toFixed(1) + '%ile' : '—'
                    return (
                      <div key={key} style={S.signalCard}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                          <span style={{ fontSize: 11, color: COLOR.textMuted, fontWeight: 600 }}>{key} {label}</span>
                          <GradeChip grade={sig.grade} size="sm" />
                        </div>
                        <div style={{ display: 'flex', gap: 8, fontSize: 11, color: COLOR.textDim }}>
                          <span>raw: {sig.raw != null ? sig.raw.toFixed(2) : '—'}</span>
                          <span>{pct}</span>
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

          {/* Gates section */}
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

          {/* Footer spec label */}
          <div style={S.specLabel}>{etf.spec_label}</div>
        </div>
      )}
    </>
  )
}
