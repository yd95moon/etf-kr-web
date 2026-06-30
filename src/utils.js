import { useState, useEffect } from 'react'
import { ASSET_CLASS_META, GATE_REASON_KO } from './constants.js'

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

export function sortEtfs(etfs, mode) {
  const gradeOrder = { A: 0, B: 1, C: 2, D: 3, E: 4, null: 5, undefined: 5 }
  const copy = [...etfs]
  if (mode === 'grade') {
    copy.sort((a, b) => {
      const ga = gradeOrder[a.composite_grade] ?? 5
      const gb = gradeOrder[b.composite_grade] ?? 5
      if (ga !== gb) return ga - gb
      return (b.aum_억원 ?? 0) - (a.aum_억원 ?? 0)
    })
  } else if (mode === 'aum') {
    copy.sort((a, b) => (b.aum_억원 ?? 0) - (a.aum_억원 ?? 0))
  } else if (mode === 'fee') {
    copy.sort((a, b) => (a.fee_pct ?? 999) - (b.fee_pct ?? 999))
  }
  return copy
}

export function fmtAum(v) {
  if (v == null) return '—'
  return v.toLocaleString('ko-KR', { maximumFractionDigits: 0 }) + '억'
}

export function fmtFee(v) {
  if (v == null) return '—'
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
    return '[G5] 레버리지·인버스 별도트랙'
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
