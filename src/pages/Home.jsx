import React, { useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { DataContext } from '../App.jsx'
import {
  COLOR, PEER_META, TABS, OWN_TAB_PEERS, STYLE_LABELS, MARKET_LABELS, ASSET_TYPE_LABELS,
  ROW_COLS,
} from '../constants.js'
import { sortEtfs, getFailReason, useIsMobile } from '../utils.js'
import EtfRow from '../components/EtfRow.jsx'
import BenchmarkChart, { AC_DEFAULT_BENCH } from '../components/BenchmarkChart.jsx'
import SortBar, { PERIOD_KEYS as RETURN_KEYS } from '../components/SortBar.jsx'


function getPrimaryGate(etf) {
  const gates = etf.gates || {}
  for (const [key, val] of Object.entries(gates)) {
    if (key === 'G5' || key === 'G6') continue
    if (val && val.pass === false) return key
  }
  return 'other'
}

const SORT_OPTS = [
  { key: 'w1',    label: '1주' },
  { key: 'm1',    label: '1개월' },
  { key: 'm3',    label: '3개월' },
  { key: 'm6',    label: '6개월' },
  { key: 'm12',   label: '1년' },
  { key: 'm36',   label: '3년' },
  { key: 'm60',   label: '5년' },
  { key: 'dist',  label: '월분배' },
  { key: 'aum',   label: 'AUM' },
  { key: 'fee',   label: '보수' },
  { key: 'grade', label: '등급' },
]

const RETURN_LABELS = { w1: '1주수익률', m1: '1개월수익률',
                        m3: '3개월수익률', m6: '6개월수익률', m12: '1년수익률',
                        m36: '3년수익률', m60: '5년수익률' }

const AXIS_LABEL = {
  style: STYLE_LABELS,
  market: MARKET_LABELS,
  asset_type: ASSET_TYPE_LABELS,
}

const S = {
  noteBox: {
    fontSize: 11, color: COLOR.textDim, lineHeight: 1.5,
    background: COLOR.bgCard, border: `1px dashed ${COLOR.borderSoft}`,
    borderRadius: 7, padding: '7px 10px', margin: '8px 0 7px',
  },
}

function TableHeader({ aumLabel = 'AUM', showDist = false }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: ROW_COLS(showDist, true),
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
      {showDist && <span style={{ textAlign: 'right' }}>월분배</span>}
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
  const [sepOpen, setSepOpen] = useState(false)
  const [failOpen, setFailOpen] = useState(false)
  const [chartTickers, setChartTickers] = useState([])
  const [activeBenches, setActiveBenches] = useState(() => AC_DEFAULT_BENCH['domestic_equity'] ?? [])

  const tab = TABS.find(t => t.key === activeTab) || TABS[0]
  const axis = axisOverride || tab.axis

  useEffect(() => {
    setChip('__all__')
    setAxisOverride(null)
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

  // 탭에 속하는 종목. 신규상장도 asset_type/market/peer_group은 정상 분류돼 있으니
  // 자기 코호트 탭에 그대로 둔다. 메인/신규 구분은 아래에서 섹션으로만 나눈다.
  const inTab = useMemo(() => {
    if (!etfList.length) return []
    return etfList.filter(e =>
      tab.match(e) && (tab.special || !OWN_TAB_PEERS.includes(e.peer_group)))
  }, [etfList, tab])

  if (!data) return <div style={{ padding: 32, color: COLOR.textMuted }}>데이터 로딩 중…</div>

  const listed  = inTab.filter(e => e.final_class === '메인')
  const newEtfs = inTab.filter(e => e.final_class === '신규')
  const sepEtfs = inTab.filter(e => e.final_class === '별도_트랙')
  const failEtfs = inTab.filter(e => e.final_class === '탈락')
  // 메인+신규를 한 목록으로 합친다. 따로 떼어두면 w1/m1 수익률로 줄을 세울 때
  // 신규상장 종목이 기존 종목과 나란히 비교되지 않는다 (2026-08-06).
  const rankable = [...listed, ...newEtfs]

  // 2단 칩. 현재 축(성격/시장/자산유형)의 실제 값만 노출한다.
  const chipCounts = {}
  for (const e of rankable) {
    const k = e[axis]
    if (!k) continue
    chipCounts[k] = (chipCounts[k] || 0) + 1
  }
  const chipKeys = Object.keys(chipCounts).sort((a, b) => chipCounts[b] - chipCounts[a])
  const labelOf = (k) => (AXIS_LABEL[axis] || {})[k] || k

  const filtered = chip === '__all__' ? rankable : rankable.filter(e => e[axis] === chip)

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
  const returnKey = RETURN_KEYS.includes(effectiveSort) ? effectiveSort : null
  // 월분배는 수익률과 같은 기간 버튼을 쓴다. 기간이 아닌 정렬(AUM/보수/등급/월분배)일
  // 때는 1년을 기본으로 둔다.
  const periodKey = returnKey || 'm12'
  // 분배가 성격을 좌우하는 곳에서만 칸을 하나 더 낸다. 전 종목에 붙이면 표가 좁아진다.
  const showDist = tab.key === 'income' || effectiveSort === 'dist'
  const aumLabel = RETURN_LABELS[effectiveSort] || 'AUM'
  const chartTickerSet = new Set(chartTickers.map(t => t.ticker))

  // 한 줄 목록. 메인+신규가 섞여 있어도 고른 기준 하나로 줄을 세운다.
  const rows = sortEtfs(filtered, effectiveSort, sortDir, returnsMap, periodKey)
  const hasNewInRows = rows.some(e => e.final_class === '신규')
  // 지금 목록에 들어 있는 묶음들의 주의사항만 모은다.
  const notes = peerKeys
    .filter(pg => PEER_META[pg]?.note)
    .map(pg => [pg, PEER_META[pg].note])

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
    showDist,
    distVal: etf.dist?.[periodKey]?.monthly_pct,
    distInfo: etf.dist?.[periodKey],
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
          // 뱃지는 그 탭의 [전체] 칩과 같은 수여야 한다.
          // 전에는 자기 탭이 따로 있는 커버드콜과 기준 미달 종목까지 세어서
          // 해외주식이 273 이라고 해놓고 목록에는 239 만 나왔다.
          // 신규상장도 이제 이 탭 화면에 그대로 나오니 뱃지 수에도 포함한다.
          const n = etfList.filter(e =>
            (e.final_class === '메인' || e.final_class === '신규') && t.match(e) &&
            (t.special || !OWN_TAB_PEERS.includes(e.peer_group))).length
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
            {[['__all__', '전체', rankable.length], ...chipKeys.map(k => [k, labelOf(k), chipCounts[k]])]
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
        <SortBar
          opts={SORT_OPTS}
          active={effectiveSort}
          dir={sortDir}
          onSort={handleSort}
          isMobile={isMobile}
          gradeDisabled={!anyGradeable}
          returnsMap={returnsMap}
          padding="10px 16px 6px"
        />

        {/* ── 목록 ──
            [전체]는 말 그대로 전부다. 묶음별로 화면을 쪼개면 둘째 묶음의 1위가
            100줄 아래로 내려가서, 사용자 입장에서는 그냥 없는 종목이 된다.
            그래서 묶음으로 나누지 않고 한 줄 목록으로 세운다.
            등급은 여전히 같은 묶음 안에서만 매긴 값이라, 어느 묶음인지는
            종목마다 작은 글씨로 붙여 둔다. */}
        {rows.length === 0 && (
          <div style={{ padding: '28px 16px', textAlign: 'center', color: COLOR.textDim, fontSize: 13 }}>
            해당 조건에 맞는 종목이 없습니다
          </div>
        )}

        {rows.length > 0 && (
          <div style={{ padding: '0 16px', marginBottom: 14 }}>
            {/* 지금 목록에 섞여 있는 묶음들의 주의사항. 등급이 붙었다고
                그 묶음의 성질(환율 방어, 세금, 만기)이 사라지는 게 아니다.
                신규상장은 같은 목록 안에 섞여 있으니(2026-08-06), 등급 보류
                안내도 여기서 같이 띄운다. */}
            {(notes.length > 0 || hasNewInRows) && (
              <div style={S.noteBox}>
                {hasNewInRows && (
                  <div>상장한 지 1년이 안 된 종목(신규 배지)은 등급을 매기지 않습니다. 계산된 지표만 보여줍니다.</div>
                )}
                {notes.map(([pg, note], i) => (
                  <div key={pg} style={{ marginTop: (i || hasNewInRows) ? 5 : 0 }}>
                    <strong style={{ color: COLOR.textMuted }}>{PEER_META[pg].short}</strong> · {note}
                  </div>
                ))}
              </div>
            )}

            <div style={{
              display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
              gap: 8, margin: '2px 2px 6px',
            }}>
              <div style={{ fontSize: 13, fontWeight: 680, color: COLOR.text }}>
                {chip === '__all__' ? '전체' : labelOf(chip)}
              </div>
              <div style={{ fontSize: 11, color: COLOR.textDim }}>{rows.length}종</div>
            </div>

            <div style={{
              background: COLOR.bgCard, border: `1px solid ${COLOR.border}`,
              borderRadius: 8, overflow: 'hidden',
            }}>
              {!isMobile && <TableHeader aumLabel={aumLabel} showDist={showDist} />}
              {rows.map(etf => (
                <EtfRow {...rowProps(etf, false, etf.peer_group === 'kr_index')}
                  peerLabel={peerKeys.length > 1 ? (PEER_META[etf.peer_group]?.short) : null} />
              ))}
            </div>
          </div>
        )}

        {/* ── 레버리지·커버드콜 ── */}
        {sepEtfs.length > 0 && (
          <Tray
            title="레버리지·커버드콜"
            count={sepEtfs.length}
            tone="danger"
            open={sepOpen}
            onToggle={() => setSepOpen(o => !o)}
            note="하루 단위 목표를 좇는 구조라 오래 들고 있으면 손실이 쌓일 수 있습니다. 등급을 매기지 않습니다."
          >
            {!isMobile && <TableHeader aumLabel={aumLabel} showDist={showDist} />}
            {sortEtfs(sepEtfs, effectiveSort, sortDir, returnsMap, periodKey).map(etf => (
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
