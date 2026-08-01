import React, { useState, useContext } from 'react'
import { ChevronDown, ChevronUp, Star, ExternalLink, Search } from 'lucide-react'
import GradeChip from './GradeChip.jsx'
import {
  COLOR, SIGNAL_LABELS, GATE_LABELS, GATE_REASON_KO, ROW_COLS, BRAND_ISSUER,
} from '../constants.js'
import {
  fmtAum, fmtFee, fmtReturn, fmtDist, naverUrl, searchUrl, issuerLink,
} from '../utils.js'
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

function Tag({ text, fg, bg, bd, title }) {
  return (
    <span title={title} style={{
      fontSize: 10, padding: '1px 5px', borderRadius: 3,
      background: bg, color: fg, border: `1px solid ${bd}`,
      fontWeight: 500, flexShrink: 0, whiteSpace: 'nowrap',
    }}>{text}</span>
  )
}

// 종목 한 줄에 붙는 표시들. 등급이 없는 이유나 계좌 가능 여부처럼
// 실제 선택에 영향을 주는 것만 붙인다.
function Badges({ etf }) {
  const out = []
  if (etf.is_hedge) {
    out.push(<Tag key="h" text="환방어" fg="#fbbf24" bg="#3a352033" bd="#fbbf2433"
      title="환율이 오르든 내리든 영향을 줄이도록 만든 상품입니다" />)
  }
  if (etf.is_new) {
    out.push(<Tag key="n" text="신규" fg="#86efac" bg="#1e3a2f33" bd="#86efac33"
      title={`상장 후 관측 ${etf.obs_days ?? '-'} 거래일. 1년 미만이라 등급을 매기지 않습니다`} />)
  }
  if (etf.pension_eligible === false) {
    out.push(<Tag key="p" text="연금불가" fg="#fb923c" bg="#3a2a2033" bd="#fb923c33"
      title="연금저축·IRP 계좌에서는 담을 수 없습니다 (ISA는 가능)" />)
  }
  // 배당주는 "현금으로 주는지, 안에서 다시 굴리는지"가 성격을 가른다.
  // 이름만으로는 구분이 안 되므로 실제 분배 지급 기록으로 판정한다.
  if (etf.style === 'dividend') {
    const d = etf.dist?.m12
    if (d && d.pays > 0) {
      out.push(<Tag key="dv" text={`배당 연 ${d.annual_pct}%`} fg="#86efac" bg="#1e3a2f33" bd="#86efac33"
        title={`최근 12개월 ${d.pays}회 지급. 현금으로 받는 배당이라 일반 계좌에서는 15.4% 세금이 붙습니다`} />)
    } else if (d) {
      out.push(<Tag key="dv" text="재투자형" fg="#93c5fd" bg="#1e3a5f33" bd="#93c5fd33"
        title="분배금을 주지 않고 안에서 다시 굴립니다. 받을 때 내는 세금이 없는 대신 현금은 안 나옵니다" />)
    }
  }
  if (etf.disparity_pct != null && Math.abs(etf.disparity_pct) >= 1) {
    const v = etf.disparity_pct
    out.push(<Tag key="d" text={`괴리 ${v > 0 ? '+' : ''}${v.toFixed(1)}%`}
      fg="#f87171" bg="#3a202033" bd="#f8717133"
      title="시장 가격이 순자산가치에서 벗어난 정도입니다. 클수록 불리하게 체결될 수 있습니다" />)
  }
  if (!out.length) return null
  return <>{out}</>
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
      href={naverUrl(ticker)}
      title="네이버 금융에서 이 종목 보기 (순자산가치·구성종목·분배금)"
      target="_blank"
      rel="noopener noreferrer"
      onClick={e => e.stopPropagation()}
      style={{
        textDecoration: 'none', color: 'inherit',
        display: 'inline-flex', alignItems: 'center', gap: 3,
        overflow: 'hidden',
        // 이름이 길어도 옆 배지를 밀어내지 않게 한다.
        // minWidth 를 0 으로 두지 않으면 글자 길이만큼 자리를 차지해 배지를 덮는다.
        minWidth: 0, flexShrink: 1, maxWidth: '100%',
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
  returnVal,
  distVal,
  distInfo,
  showDist = false,
  peerLabel,
  indexTray = false,
}) {
  const [open, setOpen] = useState(false)
  const [showSignals, setShowSignals] = useState(false)
  const [showGates, setShowGates] = useState(false)

  const COL = ROW_COLS(showDist, !!onChartToggle)

  const rowBg = open ? COLOR.bgCardAlt : dimmed ? COLOR.bg : 'transparent'
  const gates = etf.gates || {}
  const signals = etf.signals || {}
  const grade = etf.grade_eligible ? etf.composite_grade : null

  const issuer = issuerLink(etf, BRAND_ISSUER)
  const hasReturn = returnVal !== undefined && returnVal !== null
  const rightDisplay = hasReturn ? fmtReturn(returnVal) : fmtAum(etf.aum_억원)
  const rightColor = hasReturn ? (returnVal >= 0 ? '#86efac' : COLOR.danger) : COLOR.textMuted

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
        {/* 운용사. 상품 페이지 주소를 확실히 아는 곳만 링크가 된다.
            나머지는 눌러도 헛걸음이라 글자로만 둔다. */}
        {issuer && (
          issuer.url ? (
            <a
              href={issuer.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              title={`${issuer.issuer}의 이 ETF 상품 페이지로 갑니다`}
              style={{
                fontSize: 12, color: '#93c5fd', textDecoration: 'none',
                display: 'inline-flex', alignItems: 'center', gap: 3,
                border: '1px solid #93c5fd44', borderRadius: 5, padding: '2px 7px',
              }}
            >
              {issuer.issuer}
              <ExternalLink size={10} style={{ flexShrink: 0 }} />
            </a>
          ) : (
            <span style={{ fontSize: 12, color: COLOR.textMuted }}>{issuer.issuer}</span>
          )
        )}

        {/* 운용사 공시, 투자설명서, 뉴스는 우리가 갖고 있지 않다. 검색으로 넘긴다.
            전 종목 동일하게 붙는다. */}
        <a
          href={searchUrl(etf.name)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          title="구글에서 이 ETF 자료 찾기 (운용사 공시, 투자설명서, 뉴스)"
          style={{
            fontSize: 12, color: COLOR.textMuted, textDecoration: 'none',
            display: 'inline-flex', alignItems: 'center', gap: 3,
            border: `1px solid ${COLOR.border}`, borderRadius: 5, padding: '2px 7px',
          }}
        >
          <Search size={11} style={{ flexShrink: 0 }} />
          구글 검색
        </a>
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
        fontSize: 11, color: COLOR.textDim, lineHeight: 1.55,
      }}>
        {distInfo && distInfo.pays > 0 ? (
          <>
            최근 {distInfo.months}개월 중 {distInfo.pays}회 지급 · 연 환산 {distInfo.annual_pct}%
            <br />
            수익률에는 분배금이 이미 들어 있습니다. 일반 계좌라면 분배금에 15.4% 세금이
            붙어 연 {distInfo.tax_drag_pct}%p 만큼 손에 덜 남습니다.
            {!distInfo.covered && ' · 상장 기간이 짧아 이 구간을 다 채우지 못했습니다'}
          </>
        ) : '환헤지·합성신용 미반영'}
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
                  flex: 1, fontSize: 14, fontWeight: 600, color: COLOR.text,
                  minWidth: 0, overflow: 'hidden', display: 'flex',
                }}>
                  <NameLink ticker={etf.ticker} name={etf.name} />
                </span>
                {isPassive && <PassiveTag />}
                <Badges etf={etf} />
                {!indexTray && <GradeChip grade={grade} />}
                {onChartToggle && (
                  <ChartBtn onClick={handleChartClick} inChart={inChart} enabled={chartEnabled} />
                )}
              </div>
              <div style={{ fontSize: 11, color: COLOR.textDim }}>
                <span style={{ fontFamily: 'monospace' }}>{etf.ticker}</span>
                {peerLabel && (
                  <>
                    <span style={{ margin: '0 4px', color: COLOR.borderSoft }}>·</span>
                    <span title="등급은 이 묶음 안에서만 매긴 순위입니다">{peerLabel}</span>
                  </>
                )}
                <span style={{ margin: '0 4px', color: COLOR.borderSoft }}>·</span>
                <span style={{ color: hasReturn ? rightColor : undefined }}>{rightDisplay}</span>
                {showDist && (
                  <>
                    <span style={{ margin: '0 4px', color: COLOR.borderSoft }}>·</span>
                    <span style={{ color: distVal ? '#93c5fd' : undefined }}>
                      월 {fmtDist(distVal)}
                    </span>
                  </>
                )}
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
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                {isPassive && <PassiveTag />}
                <Badges etf={etf} />
              </span>
            </div>
            <div style={{ fontSize: 11, color: COLOR.textDim, marginTop: 1 }}>
              <span style={{ fontFamily: 'monospace' }}>{etf.ticker}</span>
              {peerLabel && (
                <span title="등급은 이 묶음 안에서만 매긴 순위입니다"> · {peerLabel}</span>
              )}
            </div>
          </div>
          <span>{indexTray ? <PassiveTag /> : <GradeChip grade={grade} />}</span>
          <span style={{ fontSize: 12, color: rightColor, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
            {rightDisplay}
          </span>
          {showDist && (
            <span style={{
              fontSize: 12, textAlign: 'right', fontVariantNumeric: 'tabular-nums',
              color: distVal ? '#93c5fd' : COLOR.textDim,
            }}>
              {fmtDist(distVal)}
            </span>
          )}
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
