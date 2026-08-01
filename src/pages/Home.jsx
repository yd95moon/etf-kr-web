import React, { useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { DataContext } from '../App.jsx'
import {
  COLOR, PEER_META, TABS, OWN_TAB_PEERS, STYLE_LABELS, MARKET_LABELS, ASSET_TYPE_LABELS,
} from '../constants.js'
import { sortEtfs, getFailReason, useIsMobile } from '../utils.js'
import EtfRow from '../components/EtfRow.jsx'
import BenchmarkChart, { AC_DEFAULT_BENCH } from '../components/BenchmarkChart.jsx'

const COL_CHART = '32px 1fr 52px 90px 64px 36px'

function getPrimaryGate(etf) {
  const gates = etf.gates || {}
  for (const [key, val] of Object.entries(gates)) {
    if (key === 'G5' || key === 'G6') continue
    if (val && val.pass === false) return key
  }
  return 'other'
}

const SORT_OPTS = [
  { key: 'm3',    label: '3M' },
  { key: 'm6',    label: '6M' },
  { key: 'm12',   label: '1Y' },
  { key: 'm36',   label: '3Y' },
  { key: 'm60',   label: '5Y' },
  { key: 'aum',   label: 'AUM' },
  { key: 'fee',   label: '보수' },
  { key: 'grade', label: '등급' },
]

const RETURN_LABELS = { m3: '3M수익률', m6: '6M수익률', m12: '1Y수익률',
                        m36: '3Y수익률', m60: '5Y수익률' }

// [전체] 볼 때 평가군마다 먼저 보여줄 종목 수
const PREVIEW_N = 8

const AXIS_LABEL = {
  style: STYLE_LABELS,
  market: MARKET_LABELS,
  asset_type: ASSET_TYPE_LABELS,
}

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

function Tray({ title, count, tone, open, onToggle, children, note }) {
  const danger = tone === 'danger'
  return (
    <div style={{ padding: '0 16px', marginBottom: 12 }}>
      <div style={{
        background: danger ? '#2a1d1d' : '#1e2028',
        border: `1px solid ${danger ? COLOR.danger + '44' : COLOR.borderSoft}`,
        borderRadius: 8, overflow: 'hidden',
      }}>
        <button
          onClick={onToggle}
          style={{
            width: '100%', display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', gap: 8,
            padding: '10px 14px', background: 'none', border: 'none',
            cursor: 'pointer', color: danger ? COLOR.danger : COLOR.textMuted,
            fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
          }}
        >
          <span>{title} {count}종</span>
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        {open && (
          <>
            {note && (
              <div style={{
                padding: '6px 14px 8px', fontSize: 11, lineHeight: 1.5,
                color: danger ? COLOR.danger + 'cc' : COLOR.textDim,
                borderBottom: `1px solid ${COLOR.borderSoft}`,
              }}>{note}</div>
            )}
            {children}
          </>
        )}
      </div>
    </div>
  )
}

export default function Home() {
  const {
    data, etfList, activeTab, setActiveTab,
    prices, loadingPrices, returnsMap, benchmarks,
  } = useContext(DataContext)
  const isMobile = useIsMobile()

  // 기본 정렬은 3M 수익률. 등급은 forward 검증 전이라 기본 노출로 두지 않는다.
  const [sortMode, setSortMode] = useState('m3')
  const [sortDir, setSortDir] = useState('desc')
  const [chip, setChip] = useState('__all__')
  const [axisOverride, setAxisOverride] = useState(null)
  // [전체] 에서는 평가군마다 앞부분만 보여준다. 안 그러면 첫 묶음이 화면을 다 잡아먹어
  // 아래 묶음이 있는지조차 보이지 않는다.
  const [expanded, setExpanded] = useState({})
  const [sepOpen, setSepOpen] = useState(false)
  const [failOpen, setFailOpen] = useState(false)
  const [chartTickers, setChartTickers] = useState([])
  const [activeBenches, setActiveBenches] = useState(() => AC_DEFAULT_BENCH['domestic_equity'] ?? [])

  const tab = TABS.find(t => t.key === activeTab) || TABS[0]
  const axis = axisOverride || tab.axis

  useEffect(() => {
    setChip('__all__')
    setAxisOverride(null)
    setExpanded({})
    setSepOpen(false)
    setFailOpen(false)
    setChartTickers([])
    const t = TABS.find(x => x.key === activeTab) || TABS[0]
    setActiveBenches(AC_DEFAULT_BENCH[t.bench] ?? [])
  }, [activeTab])

  const toggleBench = useCallback((key) => {
    setActiveBenches(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])
  }, [])

  const handleSort = useCallback((mode) => {
    setSortMode(prev => {
      if (prev === mode) {
        setSortDir(d => (d === 'desc' ? 'asc' : 'desc'))
        return mode
      }
      setSortDir(mode === 'fee' ? 'asc' : 'desc')
      return mode
    })
  }, [])

  const toggleChart = useCallback((etf) => {
    setChartTickers(prev => prev.some(t => t.ticker === etf.ticker)
      ? prev.filter(t => t.ticker !== etf.ticker)
      : [...prev, { ticker: etf.ticker, name: etf.name }])
  }, [])

  const removeFromChart = useCallback((ticker) => {
    setChartTickers(prev => prev.filter(t => t.ticker !== ticker))
  }, [])

  // 탭에 속하는 종목. '신규 상장' 탭은 다른 탭에서 빼서 여기로만 모은다.
  const inTab = useMemo(() => {
    if (!etfList.length) return []
    if (tab.isNew) return etfList.filter(e => e.final_class === '신규')
    return etfList.filter(e =>
      e.final_class !== '신규' && tab.match(e) &&
      (tab.special || !OWN_TAB_PEERS.includes(e.peer_group)))
  }, [etfList, tab])

  if (!data) return <div style={{ padding: 32, color: COLOR.textMuted }}>데이터 로딩 중…</div>

  const listed  = inTab.filter(e => e.final_class === '메인' || e.final_class === '신규')
  const sepEtfs = inTab.filter(e => e.final_class === '별도_트랙')
  const failEtfs = inTab.filter(e => e.final_class === '탈락')

  // 2단 칩. 현재 축(성격/시장/자산유형)의 실제 값만 노출한다.
  const chipCounts = {}
  for (const e of listed) {
    const k = e[axis]
    if (!k) continue
    chipCounts[k] = (chipCounts[k] || 0) + 1
  }
  const chipKeys = Object.keys(chipCounts).sort((a, b) => chipCounts[b] - chipCounts[a])
  const labelOf = (k) => (AXIS_LABEL[axis] || {})[k] || k

  const filtered = chip === '__all__' ? listed : listed.filter(e => e[axis] === chip)

  // 섹션은 항상 평가군 단위. 등급을 매기는 비교 단위가 화면에 그대로 드러나야 한다.
  const peerBuckets = {}
  for (const e of filtered) {
    const pg = e.peer_group || 'etc'
    if (!peerBuckets[pg]) peerBuckets[pg] = []
    peerBuckets[pg].push(e)
  }
  const peerKeys = Object.keys(peerBuckets).sort(
    (a, b) => (PEER_META[a]?.order ?? 99) - (PEER_META[b]?.order ?? 99)
  )

  const anyGradeable = peerKeys.some(k => PEER_META[k]?.gradeable)
  const effectiveSort = (!anyGradeable && sortMode === 'grade') ? 'aum' : sortMode
  const returnKey = ['m3', 'm6', 'm12', 'm36', 'm60'].includes(effectiveSort) ? effectiveSort : null
  const aumLabel = RETURN_LABELS[effectiveSort] || 'AUM'
  const dirArrow = sortDir === 'desc' ? '↓' : '↑'
  const chartTickerSet = new Set(chartTickers.map(t => t.ticker))

  const failGroups = [
    { label: '순자산 미달', etfs: failEtfs.filter(e => getPrimaryGate(e) === 'G1') },
    { label: '가격 이상',   etfs: failEtfs.filter(e => getPrimaryGate(e) === 'G2') },
    { label: '기타',        etfs: failEtfs.filter(e => !['G1', 'G2'].includes(getPrimaryGate(e))) },
  ].filter(g => g.etfs.length > 0)

  const rowProps = (etf, dimmed = false, hidePassive = false) => ({
    key: etf.ticker,
    etf,
    showWarning: false,
    dimmed,
    isMobile,
    onChartToggle: toggleChart,
    inChart: chartTickerSet.has(etf.ticker),
    isPassive: !hidePassive && etf.style === 'broad_index',
    chartEnabled: !!prices?.tickers?.[etf.ticker],
    returnVal: returnKey ? returnsMap?.[etf.ticker]?.[returnKey] : undefined,
  })

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>

      {/* ── 1단 탭 ── */}
      <div style={{
        display: 'flex', gap: 6, overflowX: 'auto',
        padding: '10px 12px',
        borderBottom: `1px solid ${COLOR.border}`,
        scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch',
      }}>
        {TABS.map(t => {
          const active = t.key === activeTab
          const n = t.isNew
            ? etfList.filter(e => e.final_class === '신규').length
            : etfList.filter(e => e.final_class !== '신규' && t.match(e)).length
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              style={{
                flexShrink: 0,
                padding: isMobile ? '5px 10px' : '6px 14px',
                borderRadius: 6,
                border: `1px solid ${active ? '#5a6a9a' : COLOR.borderSoft}`,
                background: active ? '#2a3050' : 'transparent',
                color: active ? COLOR.text : COLOR.textMuted,
                cursor: 'pointer', fontFamily: 'inherit',
                fontSize: isMobile ? 12 : 13,
                fontWeight: active ? 700 : 400,
                whiteSpace: 'nowrap',
              }}
            >
              {t.label}
              <span style={{ marginLeft: 4, fontSize: 10, opacity: 0.6 }}>{n}</span>
            </button>
          )
        })}
      </div>

      <BenchmarkChart
        activeAC={tab.bench}
        chartTickers={chartTickers}
        onRemoveTicker={removeFromChart}
        prices={prices}
        loadingPrices={loadingPrices}
        benchmarks={benchmarks}
        activeBenches={activeBenches}
        onToggleBench={toggleBench}
      />

      <div style={{ padding: '0 0 32px' }}>

        {/* ── 보기 축 전환 (해외주식은 시장과 성격 두 축이 겹친다) ── */}
        {tab.axisSwitch && (
          <div style={{ display: 'flex', gap: 5, padding: '10px 16px 0' }}>
            {[['market', '시장별'], ['style', '성격별']].map(([k, l]) => (
              <button
                key={k}
                onClick={() => { setAxisOverride(k); setChip('__all__') }}
                style={{
                  padding: '4px 10px', borderRadius: 5, fontFamily: 'inherit',
                  border: `1px solid ${axis === k ? COLOR.border : COLOR.borderSoft}`,
                  background: axis === k ? COLOR.bgCard : 'transparent',
                  color: axis === k ? COLOR.text : COLOR.textDim,
                  fontSize: 11, cursor: 'pointer',
                }}
              >{l}</button>
            ))}
          </div>
        )}

        {/* ── 2단 칩 ── */}
        {chipKeys.length > 1 && (
          <div style={{
            display: 'flex', gap: 5, overflowX: 'auto',
            padding: '9px 16px 3px', scrollbarWidth: 'none',
          }}>
            {[['__all__', '전체', listed.length], ...chipKeys.map(k => [k, labelOf(k), chipCounts[k]])]
              .map(([k, l, n]) => (
                <button
                  key={k}
                  onClick={() => { setChip(k); setExpanded({}) }}
                  style={{
                    whiteSpace: 'nowrap', padding: '5px 10px', borderRadius: 6,
                    border: `1px solid ${chip === k ? COLOR.border : COLOR.borderSoft}`,
                    background: chip === k ? COLOR.bgCardAlt : COLOR.bgCard,
                    color: chip === k ? COLOR.text : COLOR.textMuted,
                    fontSize: 11.5, cursor: 'pointer', fontFamily: 'inherit',
                    fontWeight: chip === k ? 640 : 400,
                  }}
                >{l} {n}</button>
              ))}
          </div>
        )}

        {/* ── 상태 안내 ── */}
        <div style={{
          padding: '8px 16px', display: 'flex', flexWrap: 'wrap', gap: '4px 16px',
          fontSize: 11, color: COLOR.textDim,
          borderBottom: `1px solid ${COLOR.borderSoft}`,
        }}>
          <span>forward 검증 중 · 첫 채점 2026-09-26</span>
          {data?.meta?.generated_at && <span>데이터 기준: {data.meta.generated_at.slice(0, 10)}</span>}
          <span>등급(A~E)은 같은 평가군 안에서만 매긴 상대 순위입니다. 수익 예측이 아닙니다.</span>
        </div>

        {/* ── 정렬 ── */}
        <div style={{ display: 'flex', gap: 6, padding: '10px 16px 6px', flexWrap: 'wrap' }}>
          {SORT_OPTS.map(({ key, label }) => {
            const disabled = key === 'grade' && !anyGradeable
            const active = effectiveSort === key
            const isGradeBtn = key === 'grade'
            return (
              <button
                key={key}
                disabled={disabled}
                onClick={() => handleSort(key)}
                style={{
                  padding: '5px 12px', borderRadius: 6, fontFamily: 'inherit',
                  border: active
                    ? `1px solid ${isGradeBtn ? '#6b5a7a' : '#5a6a9a'}`
                    : `1px ${isGradeBtn ? 'dashed' : 'solid'} ${isGradeBtn ? '#4a3d5a' : COLOR.border}`,
                  background: active ? (isGradeBtn ? '#2a2035' : '#2a3050') : COLOR.bgCard,
                  color: disabled ? COLOR.textDim
                    : active ? (isGradeBtn ? '#c4a8d8' : COLOR.text)
                    : (isGradeBtn ? '#7a6a8a' : COLOR.textMuted),
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  fontSize: 12, fontWeight: active ? 600 : 400,
                  opacity: disabled ? 0.4 : 1,
                }}
              >
                {isGradeBtn
                  ? <span>등급 <span style={{ fontSize: 10, opacity: 0.75 }}>검증중</span></span>
                  : label}
                {active ? ` ${dirArrow}` : ''}
              </button>
            )
          })}
        </div>

        {/* ── 평가군별 섹션 ── */}
        {peerKeys.length === 0 && (
          <div style={{ padding: '28px 16px', textAlign: 'center', color: COLOR.textDim, fontSize: 13 }}>
            해당 조건에 맞는 종목이 없습니다
          </div>
        )}

        {peerKeys.map(pg => {
          const meta = PEER_META[pg] || { label: pg, gradeable: false }
          const rows = sortEtfs(peerBuckets[pg], effectiveSort, sortDir, returnsMap)
          const isNewSection = tab.isNew
          return (
            <div key={pg} style={{ padding: '0 16px', marginBottom: 14 }}>
              <div style={{
                display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
                gap: 8, margin: '10px 2px 6px',
              }}>
                <div style={{ fontSize: 13, fontWeight: 680, color: COLOR.text }}>
                  {meta.label}
                  <span style={{
                    marginLeft: 6, fontSize: 9.5, padding: '2px 6px', borderRadius: 4,
                    border: `1px ${meta.gradeable && !isNewSection ? 'solid' : 'dashed'} ${COLOR.borderSoft}`,
                    color: meta.gradeable && !isNewSection ? COLOR.textMuted : COLOR.textDim,
                    fontWeight: 500, verticalAlign: 1,
                  }}>
                    {isNewSection ? '등급 없음' : meta.gradeable ? '등급 있음' : '등급 없음'}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: COLOR.textDim }}>{rows.length}종</div>
              </div>

              {(isNewSection || !meta.gradeable) && (
                <div style={{
                  fontSize: 11, color: COLOR.textDim, lineHeight: 1.5,
                  background: COLOR.bgCard, border: `1px dashed ${COLOR.borderSoft}`,
                  borderRadius: 7, padding: '7px 10px', marginBottom: 7,
                }}>
                  {isNewSection
                    ? '상장한 지 1년이 안 돼 등급을 매기지 않습니다. 계산된 지표만 보여줍니다.'
                    : meta.note}
                </div>
              )}

              <div style={{
                background: COLOR.bgCard, border: `1px solid ${COLOR.border}`,
                borderRadius: 8, overflow: 'hidden',
              }}>
                {!isMobile && <TableHeader aumLabel={aumLabel} />}
                {(chip === '__all__' && !expanded[pg] ? rows.slice(0, PREVIEW_N) : rows)
                  .map(etf => <EtfRow {...rowProps(etf, false, pg === 'kr_index')} />)}
                {chip === '__all__' && !expanded[pg] && rows.length > PREVIEW_N && (
                  <button
                    onClick={() => setExpanded(p => ({ ...p, [pg]: true }))}
                    style={{
                      width: '100%', padding: '10px 0', border: 'none',
                      borderTop: `1px solid ${COLOR.borderSoft}`,
                      background: COLOR.bgCardAlt, color: COLOR.textMuted,
                      fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    나머지 {rows.length - PREVIEW_N}종 더 보기
                  </button>
                )}
              </div>
            </div>
          )
        })}

        {/* ── 레버리지·커버드콜 ── */}
        {sepEtfs.length > 0 && (
          <Tray
            title="레버리지·커버드콜"
            count={sepEtfs.length}
            tone="danger"
            open={sepOpen}
            onToggle={() => setSepOpen(o => !o)}
            note="하루 단위 목표를 좇는 구조라 오래 들고 있으면 손실이 쌓일 수 있습니다. 커버드콜은 분배금이 반영되지 않아 가격만으로는 성과를 알 수 없습니다. 등급을 매기지 않습니다."
          >
            {!isMobile && <TableHeader aumLabel={aumLabel} />}
            {sortEtfs(sepEtfs, effectiveSort, sortDir, returnsMap).map(etf => (
              <EtfRow {...rowProps(etf, true)} />
            ))}
          </Tray>
        )}

        {/* ── 기준 미달 ── */}
        {failEtfs.length > 0 && (
          <Tray
            title="기준 미달"
            count={failEtfs.length}
            open={failOpen}
            onToggle={() => setFailOpen(o => !o)}
          >
            <div style={{
              display: 'grid', gridTemplateColumns: '72px 1fr 1fr',
              padding: '6px 12px', gap: 8, fontSize: 11, fontWeight: 600,
              color: COLOR.textDim, borderBottom: `1px solid ${COLOR.borderSoft}`,
            }}>
              <span>티커</span><span>이름</span><span>제외 사유</span>
            </div>
            {failGroups.map(group => (
              <React.Fragment key={group.label}>
                <div style={{
                  padding: '4px 12px', fontSize: 10, fontWeight: 600, color: COLOR.textDim,
                  background: '#1a1c24', borderBottom: `1px solid ${COLOR.borderSoft}`,
                }}>
                  {group.label} {group.etfs.length}종
                </div>
                {group.etfs.map(etf => (
                  <div key={etf.ticker} style={{
                    display: 'grid', gridTemplateColumns: '72px 1fr 1fr',
                    padding: '7px 12px', gap: 8, fontSize: 12,
                    borderBottom: `1px solid ${COLOR.borderSoft}`, alignItems: 'center',
                  }}>
                    <span style={{ fontFamily: 'monospace', color: COLOR.textDim }}>{etf.ticker}</span>
                    <span style={{
                      color: COLOR.textMuted, overflow: 'hidden',
                      textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{etf.name}</span>
                    <span style={{ color: COLOR.textDim, fontSize: 11 }}>{getFailReason(etf)}</span>
                  </div>
                ))}
              </React.Fragment>
            ))}
          </Tray>
        )}
      </div>
    </div>
  )
}
