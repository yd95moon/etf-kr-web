import { useState, useEffect } from 'react'
import { ASSET_CLASS_META, PEER_META, TABS, GATE_REASON_KO } from './constants.js'

export function buildEtfList(etfsMap) {
  return Object.values(etfsMap).map(etf => ({ ...etf }))
}

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 640)
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 640)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return isMobile
}

export function sortEtfs(etfs, mode, dir = 'desc', returnsMap = null, distPeriod = 'm12') {
  const gradeOrder = { A: 0, B: 1, C: 2, D: 3, E: 4 }
  const copy = [...etfs]
  if (mode === 'grade') {
    copy.sort((a, b) => {
      const ga = gradeOrder[a.composite_grade] ?? 5
      const gb = gradeOrder[b.composite_grade] ?? 5
      const sign = dir === 'asc' ? -1 : 1
      if (ga !== gb) return sign * (ga - gb)
      return (b.aum_억원 ?? 0) - (a.aum_억원 ?? 0)
    })
  } else if (mode === 'aum') {
    copy.sort((a, b) => dir === 'asc'
      ? (a.aum_억원 ?? 0) - (b.aum_억원 ?? 0)
      : (b.aum_억원 ?? 0) - (a.aum_억원 ?? 0)
    )
  } else if (mode === 'fee') {
    copy.sort((a, b) => dir === 'desc'
      ? (b.fee_pct ?? 0) - (a.fee_pct ?? 0)
      : (a.fee_pct ?? 999) - (b.fee_pct ?? 999)
    )
  } else if (mode === 'dist') {
    // 월평균 분배율. 자료가 없는 종목은 항상 뒤로 보낸다.
    copy.sort((a, b) => {
      const ra = a.dist?.[distPeriod]?.monthly_pct ?? null
      const rb = b.dist?.[distPeriod]?.monthly_pct ?? null
      if (ra === null && rb === null) return 0
      if (ra === null) return 1
      if (rb === null) return -1
      return dir === 'asc' ? ra - rb : rb - ra
    })
  } else if (['w1', 'm1', 'm3', 'm6', 'm12', 'm36', 'm60'].includes(mode)) {
    copy.sort((a, b) => {
      const ra = returnsMap?.[a.ticker]?.[mode] ?? null
      const rb = returnsMap?.[b.ticker]?.[mode] ?? null
      if (ra === null && rb === null) return 0
      if (ra === null) return 1
      if (rb === null) return -1
      return dir === 'asc' ? ra - rb : rb - ra
    })
  }
  return copy
}

export function fmtReturn(v) {
  if (v == null || isNaN(v)) return '—'
  return (v >= 0 ? '+' : '') + v.toFixed(1) + '%'
}

export function fmtAum(v) {
  if (v == null) return '—'
  return v.toLocaleString('ko-KR', { maximumFractionDigits: 0 }) + '억'
}

export function fmtFee(v) {
  if (v == null) return '—'
  return v.toFixed(2) + '%'
}

// 월평균 분배율. 0 은 '안 나눠줌'이라는 뜻이라 — 와 구분해서 보여준다.
export function fmtDist(v) {
  if (v == null || isNaN(v)) return '—'
  if (v === 0) return '0%'
  return v.toFixed(2) + '%'
}

// ── 종목 바깥 링크 ────────────────────────────────────────────────────────────

// 한국 종목의 국제표준코드(ISIN). "KR7" + 티커 + "00" + 검증숫자 로 만든다.
// 미래에셋 TIGER 사이트가 이 값으로 상품 페이지를 연다.
// 검증: 102110 -> KR7102110004, 360750 -> KR7360750004 (실제로 열어 확인)
export function krIsin(ticker) {
  const base = 'KR7' + ticker + '00'
  let num = ''
  for (const c of base) {
    num += /[A-Z]/.test(c) ? String(c.charCodeAt(0) - 55) : c
  }
  let sum = 0
  const rev = num.split('').reverse()
  for (let i = 0; i < rev.length; i++) {
    let d = parseInt(rev[i], 10)
    if (i % 2 === 0) d *= 2
    sum += d > 9 ? Math.floor(d / 10) + (d % 10) : d
  }
  return base + String((10 - (sum % 10)) % 10)
}

// 종목명 클릭 시 갈 곳. 티커만 있으면 전 종목이 되고 손볼 일이 없다.
// 순자산가치, 구성종목, 분배금 이력, 괴리율이 한 화면에 있다.
export function naverUrl(ticker) {
  return `https://m.stock.naver.com/domestic/stock/${ticker}/total`
}

// 운용사 공시, 투자설명서, 뉴스처럼 우리가 갖고 있지 않은 자료를 찾을 때.
// 전 종목 동일하게 동작하고, 결과가 0건인 빈 화면이 뜰 일이 없다.
export function searchUrl(name) {
  return `https://www.google.com/search?q=${encodeURIComponent(name + ' ETF')}`
}

// ETF 이름 첫 낱말이 브랜드다. 브랜드로 운용사와 링크를 찾는다.
// detail 이 있는 브랜드만 그 ETF 페이지로 바로 가고, 나머지는 운용사 사이트로 간다.
export function issuerLink(etf, BRAND_ISSUER) {
  const brand = (etf.name || '').split(' ')[0]
  const m = BRAND_ISSUER[brand]
  if (!m) return null
  // 숫자가 아닌 글자가 섞인 새 티커는 ISIN 규칙을 확인하지 못했다.
  // 확인 못 한 주소를 만들어 보내느니 링크 없이 이름만 보여준다.
  const plainTicker = /^\d{6}$/.test(etf.ticker)
  const canDetail = !!m.detail && (!m.needsIsin || plainTicker)
  return {
    issuer: m.issuer,
    url: canDetail ? m.detail(krIsin(etf.ticker), etf.ticker) : null,
  }
}

export function getFailReason(etf) {
  const gates = etf.gates || {}
  for (const [key, val] of Object.entries(gates)) {
    if (key === 'G5') continue
    if (val && val.pass === false) {
      return `[${key}] ${GATE_REASON_KO(key, val.reason)}`
    }
  }
  if (gates.G5 && gates.G5.separate_track === true) {
    return '[G5] 레버리지·커버드콜로 분리'
  }
  return '사유 미확인'
}

export function groupByAssetClass(etfs) {
  const groups = {}
  for (const etf of etfs) {
    const ac = etf.asset_class
    if (!groups[ac]) groups[ac] = []
    groups[ac].push(etf)
  }
  return Object.entries(groups).sort(([a], [b]) => {
    const oa = ASSET_CLASS_META[a]?.order ?? 99
    const ob = ASSET_CLASS_META[b]?.order ?? 99
    return oa - ob
  })
}

export function searchEtfs(etfs, query) {
  const q = query.trim().toLowerCase()
  if (!q) return []
  return etfs.filter(e =>
    e.ticker.toLowerCase().includes(q) ||
    (e.name && e.name.toLowerCase().includes(q))
  )
}

// 평가군 단위 묶음. 등급을 매기는 비교 단위가 곧 화면의 묶음이 되도록 맞춘다.
export function groupByPeer(etfs) {
  const groups = {}
  for (const etf of etfs) {
    const pg = etf.peer_group || 'etc'
    if (!groups[pg]) groups[pg] = []
    groups[pg].push(etf)
  }
  return Object.entries(groups).sort(([a], [b]) =>
    (PEER_META[a]?.order ?? 99) - (PEER_META[b]?.order ?? 99)
  )
}

// 검색 결과에서 해당 종목이 있는 탭으로 보내기 위한 매핑
export function peerToTab(peer) {
  if (peer === 'kr_index' || peer === 'kr_select') return 'kr'
  if (peer === 'us_equity' || peer === 'overseas_equity' || peer === 'overseas_hedged') return 'ovs'
  if (peer === 'bond' || peer === 'cash') return 'bond'
  return TABS.some(t => t.key === 'alt') ? 'alt' : 'kr'
}
