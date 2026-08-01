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
  } else if (['m3', 'm6', 'm12', 'm36', 'm60'].includes(mode)) {
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
