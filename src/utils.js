import { ASSET_CLASS_META, GATE_REASON_KO } from './constants.js'

/**
 * Build a flat array of ETF objects from the raw JSON etfs map.
 * Injects asset_class = leverage_inverse for is_leverage|is_inverse ETFs
 * that have been classified as such.
 */
export function buildEtfList(etfsMap) {
  return Object.values(etfsMap).map(etf => {
    // normalise asset_class for leverage/inverse
    let asset_class = etf.asset_class
    if (etf.is_leverage || etf.is_inverse) {
      asset_class = 'leverage_inverse'
    }
    return { ...etf, asset_class }
  })
}

/** Sort ETFs by grade→AUM, AUM, or fee */
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

/** Format AUM in 억원 with commas */
export function fmtAum(v) {
  if (v == null) return '—'
  return v.toLocaleString('ko-KR', { maximumFractionDigits: 0 }) + '억'
}

/** Format fee */
export function fmtFee(v) {
  if (v == null) return '—'
  return v.toFixed(2) + '%'
}

/** Get first failed gate reason string for a single ETF (for 탈락 display) */
export function getFailReason(etf) {
  const gates = etf.gates || {}
  for (const [key, val] of Object.entries(gates)) {
    if (key === 'G5') continue // G5 is separate_track, not a fail
    if (val && val.pass === false) {
      return `[${key}] ${GATE_REASON_KO(key, val.reason)}`
    }
  }
  // check G5 separate track
  if (gates.G5 && gates.G5.separate_track === true) {
    return '[G5] 레버리지·인버스 별도트랙'
  }
  return '사유 미확인'
}

/** Group an array of ETFs by asset_class, ordered by ASSET_CLASS_META.order */
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

/** Simple text search: name or ticker contains query (case-insensitive) */
export function searchEtfs(etfs, query) {
  const q = query.trim().toLowerCase()
  if (!q) return []
  return etfs.filter(e =>
    e.ticker.toLowerCase().includes(q) ||
    (e.name && e.name.toLowerCase().includes(q))
  )
}
