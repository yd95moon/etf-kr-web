export const COLOR = {
  bg: '#1a1d27',
  bgCard: '#252934',
  bgCardAlt: '#2a2e3a',
  border: '#3a3f4d',
  borderSoft: '#2e323d',
  text: '#e8ecf1',
  textMuted: '#9ba3b3',
  textDim: '#6b7280',
  star: '#fbbf24',
  danger: '#ff3b30',
}

export const GRADE_COLOR = {
  A: '#fbbf24',
  B: '#86efac',
  C: '#94a3b8',
  D: '#fb923c',
  E: '#6b7280',
}

export const ASSET_CLASS_META = {
  domestic_equity:  { label: '국내주식형',       order: 0, gradeable: true,  tone: 'normal' },
  overseas_equity:  { label: '해외주식형',       order: 1, gradeable: true,  tone: 'normal' },
  bond:             { label: '채권형',           order: 2, gradeable: true,  tone: 'normal' },
  other:            { label: '기타',             order: 3, gradeable: false, tone: 'gray'   },
  commodity:        { label: '원자재',           order: 4, gradeable: false, tone: 'gray'   },
  realestate:       { label: '부동산',           order: 5, gradeable: false, tone: 'gray'   },
  leverage_inverse: { label: '레버리지·인버스', order: 6, gradeable: false, tone: 'danger' },
}

export const SIGNAL_LABELS = {
  T1: '모멘텀',
  T2: '변동성',
  T3: '추세 일관성',
  T4: '낙폭 회복',
  T5: '거래량 활성도',
}

export const GATE_LABELS = {
  G1: 'AUM 기준',
  G2: '가격 이상',
  G3: '가격 데이터 충분성',
  G4: '신규 상장 유예',
  G5: '별도트랙 분류',
  G6: '보수 기준',
}

export const GATE_REASON_KO = (gate, reason) => {
  if (gate === 'G1') return reason ? reason : 'AUM 100억원 미만 또는 미확인'
  if (gate === 'G2') {
    if (reason === 'frozen_run_5')  return '가격 이상: 5일 이상 동결'
    if (reason === 'frozen_run_60') return '가격 이상: 60일 이상 동결 (거래정지 추정)'
    return reason || '가격 이상'
  }
  if (gate === 'G3') return '가격 데이터 부족 (5년 미만)'
  if (gate === 'G4') {
    if (reason === 'predates_data_collection') return '데이터 수집 전 상장 (G4 통과)'
    return reason || '신규 상장 유예'
  }
  if (gate === 'G5') return '레버리지·인버스 별도트랙'
  if (gate === 'G6') {
    // e.g. "fee_0.45_gt_median_0.3350"
    if (reason && reason.startsWith('fee_')) {
      const m = reason.match(/fee_([\d.]+)_gt_median_([\d.]+)/)
      if (m) return `보수 ${m[1]}% — 자산군 중앙값 ${parseFloat(m[2]).toFixed(2)}% 초과`
    }
    return reason || '보수 기준 초과'
  }
  return reason || ''
}
