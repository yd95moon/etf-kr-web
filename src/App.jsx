import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react'
import { HashRouter, Routes, Route, Link, useNavigate } from 'react-router-dom'
import { Search, Star, X } from 'lucide-react'
import { COLOR, ASSET_CLASS_META } from './constants.js'
import { buildEtfList, searchEtfs, groupByAssetClass } from './utils.js'
import GradeChip from './components/GradeChip.jsx'
import Home from './pages/Home.jsx'
import Watchlist from './pages/Watchlist.jsx'

export const DataContext = createContext({
  data: null, etfList: [],
  activeAC: 'domestic_equity', setActiveAC: () => {},
  prices: null, loadingPrices: true,
  subClassMap: {}, returnsMap: {},
  benchmarks: null,
})
export const WatchlistContext = createContext({ watchlist: [], toggleTicker: () => {} })

const STORAGE_KEY = 'etfkr_watchlist'

// ── SearchOverlay ─────────────────────────────────────────────────────────────
function SearchOverlay({ etfList, onClose }) {
  const [query, setQuery] = useState('')
  const inputRef = useRef(null)
  const navigate = useNavigate()
  const { setActiveAC } = useContext(DataContext)

  useEffect(() => {
    inputRef.current?.focus()
    const onKey = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const results = searchEtfs(etfList, query)
  const groups = groupByAssetClass(results)

  const goto = (ac) => {
    setActiveAC(ac)
    navigate('/')
    onClose()
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.72)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        paddingTop: 80,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        width: '100%', maxWidth: 600,
        background: COLOR.bgCard,
        border: `1px solid ${COLOR.border}`,
        borderRadius: 12, overflow: 'hidden',
        margin: '0 16px',
        maxHeight: 'calc(100vh - 120px)',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 16px',
          borderBottom: `1px solid ${COLOR.borderSoft}`,
        }}>
          <Search size={16} style={{ color: COLOR.textDim, flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="종목명 또는 티커 입력…"
            style={{
              flex: 1, background: 'none', border: 'none', outline: 'none',
              color: COLOR.text, fontSize: 15,
            }}
          />
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: COLOR.textDim, display: 'flex' }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1 }}>
          {query.trim() === '' && (
            <div style={{ padding: '24px', textAlign: 'center', color: COLOR.textDim, fontSize: 13 }}>
              종목명 또는 티커를 입력하세요
            </div>
          )}
          {query.trim() !== '' && results.length === 0 && (
            <div style={{ padding: '24px', textAlign: 'center', color: COLOR.textDim, fontSize: 13 }}>
              검색 결과 없음
            </div>
          )}
          {groups.map(([ac, etfs]) => {
            const meta = ASSET_CLASS_META[ac]
            return (
              <div key={ac}>
                <div style={{
                  padding: '6px 14px', fontSize: 11, fontWeight: 700,
                  color: COLOR.textDim, background: COLOR.bg,
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                }}>
                  {meta?.label || ac}
                </div>
                {etfs.map(etf => (
                  <SearchRow key={etf.ticker} etf={etf} onGoto={() => goto(etf.asset_class)} />
                ))}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function SearchRow({ etf, onGoto }) {
  const { watchlist, toggleTicker } = useContext(WatchlistContext)
  const on = watchlist.includes(etf.ticker)

  return (
    <div
      onClick={onGoto}
      style={{
        display: 'grid',
        gridTemplateColumns: '28px 68px 1fr 52px',
        alignItems: 'center', gap: 8, padding: '8px 14px',
        cursor: 'pointer',
        borderBottom: `1px solid ${COLOR.borderSoft}`,
      }}
      onMouseEnter={e => e.currentTarget.style.background = COLOR.bgCardAlt}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <button
        onClick={e => { e.stopPropagation(); toggleTicker(etf.ticker) }}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: on ? COLOR.star : COLOR.textDim, display: 'flex' }}
      >
        <Star size={14} fill={on ? COLOR.star : 'none'} />
      </button>
      <span style={{ fontFamily: 'monospace', fontSize: 12, color: COLOR.textMuted }}>{etf.ticker}</span>
      <span style={{ fontSize: 13, color: COLOR.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{etf.name}</span>
      <span><GradeChip grade={etf.grade_eligible ? etf.composite_grade : null} size="sm" /></span>
    </div>
  )
}

// ── Navbar ─────────────────────────────────────────────────────────────────────
function Navbar({ onSearchOpen, watchlistCount }) {
  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 100,
      background: COLOR.bg,
      borderBottom: `1px solid ${COLOR.border}`,
      display: 'flex', alignItems: 'center',
      padding: '0 16px', height: 52, gap: 8,
    }}>
      <Link to="/" style={{ textDecoration: 'none', fontWeight: 700, fontSize: 16, color: COLOR.text, letterSpacing: '-0.01em' }}>
        한국 ETF
      </Link>
      <div style={{ flex: 1 }} />
      <button
        onClick={onSearchOpen}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: COLOR.textMuted, display: 'flex', alignItems: 'center',
          padding: '6px 8px', borderRadius: 6,
        }}
        title="검색"
      >
        <Search size={18} />
      </button>
      <Link
        to="/watchlist"
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          textDecoration: 'none', color: COLOR.textMuted,
          padding: '5px 10px', borderRadius: 6, fontSize: 13,
          border: `1px solid ${COLOR.borderSoft}`,
        }}
      >
        <Star size={14} style={{ color: watchlistCount > 0 ? COLOR.star : COLOR.textDim }} fill={watchlistCount > 0 ? COLOR.star : 'none'} />
        {watchlistCount > 0 && <span style={{ color: COLOR.star, fontWeight: 600 }}>{watchlistCount}</span>}
        <span>관심</span>
      </Link>
    </nav>
  )
}

// ── SpecFooter — 하단 고정, 풀 라벨 1회만 ──────────────────────────────────────
function SpecFooter({ label }) {
  return (
    <footer style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
      background: '#0f1117',
      borderTop: `1px solid ${COLOR.borderSoft}`,
      padding: '5px 16px',
      fontSize: 10, color: COLOR.textDim,
      textAlign: 'center', lineHeight: 1.5,
    }}>
      ⚠️ {label}
    </footer>
  )
}

// ── AppShell ──────────────────────────────────────────────────────────────────
function AppShell() {
  const [data, setData] = useState(null)
  const [etfList, setEtfList] = useState([])
  const [activeAC, setActiveAC] = useState('domestic_equity')
  const [watchlist, setWatchlist] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? JSON.parse(raw) : []
    } catch { return [] }
  })
  const [searchOpen, setSearchOpen] = useState(false)
  const [prices, setPrices] = useState(null)
  const [loadingPrices, setLoadingPrices] = useState(true)
  const [subClassMap, setSubClassMap] = useState({})
  const [returnsMap, setReturnsMap] = useState({})
  const [benchmarks, setBenchmarks] = useState(null)

  useEffect(() => {
    fetch('./data/etf_v1.json')
      .then(r => r.json())
      .then(d => {
        setData(d)
        setEtfList(buildEtfList(d.etfs))
      })
      .catch(err => console.error('ETF data load failed:', err))

    fetch('./data/chart_prices.json')
      .then(r => r.json())
      .then(d => { setPrices(d); setLoadingPrices(false) })
      .catch(() => setLoadingPrices(false))

    fetch('./data/sub_class_map.json')
      .then(r => r.json())
      .then(d => setSubClassMap(d))
      .catch(() => {})

    fetch('./data/returns.json')
      .then(r => r.json())
      .then(d => setReturnsMap(d))
      .catch(() => {})

    fetch('./data/benchmarks.json')
      .then(r => r.json())
      .then(d => setBenchmarks(d))
      .catch(() => {})
  }, [])

  const toggleTicker = useCallback((ticker) => {
    setWatchlist(prev => {
      const next = prev.includes(ticker) ? prev.filter(t => t !== ticker) : [...prev, ticker]
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch {}
      return next
    })
  }, [])

  const specLabel = data?.meta?.spec_label || '확률적 가설·미래보장X·forward n=1 측정전·24개월후 d<0.3시 폐기·분배/환헤지/합성신용 미반영'

  return (
    <DataContext.Provider value={{ data, etfList, activeAC, setActiveAC, prices, loadingPrices, subClassMap, returnsMap, benchmarks }}>
      <WatchlistContext.Provider value={{ watchlist, toggleTicker }}>
        <div style={{ minHeight: '100vh', background: COLOR.bg }}>
          <Navbar onSearchOpen={() => setSearchOpen(true)} watchlistCount={watchlist.length} />
          <main style={{ paddingBottom: 44 }}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/watchlist" element={<Watchlist />} />
            </Routes>
          </main>
          <SpecFooter label={specLabel} />
          {searchOpen && (
            <SearchOverlay etfList={etfList} onClose={() => setSearchOpen(false)} />
          )}
        </div>
      </WatchlistContext.Provider>
    </DataContext.Provider>
  )
}

// ── App root ──────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <HashRouter>
      <AppShell />
    </HashRouter>
  )
}
