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

// ── 평가군 ────────────────────────────────────────────────────────────────────
// 등급은 이 단위 안에서만 매긴다. 성격이 다른 상품을 한 줄에 세우지 않기 위함.
export const PEER_META = {
  kr_index: {
    label: '국내주식 · 대표지수', short: '대표지수', order: 0, gradeable: false,
    note: '같은 지수를 따라가는 상품이라 우열을 매기지 않습니다. 보수·규모·괴리율로 비교하세요.',
  },
  kr_select: {
    label: '국내주식 · 섹터·테마·전략', short: '섹터·테마·전략', order: 1, gradeable: true,
  },
  us_equity: {
    label: '미국주식', short: '미국주식', order: 2, gradeable: true,
  },
  overseas_equity: {
    label: '해외주식 (미국 외)', short: '해외주식', order: 3, gradeable: true,
  },
  overseas_hedged: {
    label: '해외주식 · 환율 방어형', short: '환율 방어형', order: 4, gradeable: true,
    note: '환율이 오르든 내리든 영향을 줄이도록 만든 상품입니다. 환율로 인한 이익도 함께 줄어듭니다.',
  },
  bond: {
    label: '채권', short: '채권', order: 5, gradeable: true,
    note: '채권은 변동성 지표를 등급 계산에서 뺐습니다. 만기 길이를 되풀이 재는 중복 지표이기 때문입니다.',
  },
  cash: {
    label: '파킹형 (현금성)', short: '파킹형', order: 6, gradeable: false,
    note: '현금을 잠시 두는 용도라 우열을 매기지 않습니다. 금리와 보수만 보세요.',
  },
  etc: {
    label: '기타', short: '기타', order: 7, gradeable: false,
    note: '비교 대상이 부족하거나 성격이 달라 등급 없이 지표만 표시합니다.',
  },
  derivative: {
    label: '레버리지·커버드콜', short: '레버리지', order: 8, gradeable: false, tone: 'danger',
    note: '하루 단위 목표를 좇는 구조라 오래 들고 있으면 손실이 쌓일 수 있습니다. 등급을 매기지 않습니다.',
  },
}

// ── 상단 탭 ───────────────────────────────────────────────────────────────────
export const TABS = [
  { key: 'kr',   label: '국내주식',  axis: 'style',  bench: 'domestic_equity',
    match: e => e.asset_type === 'equity' && e.market === 'kr' },
  { key: 'ovs',  label: '해외주식',  axis: 'market', bench: 'overseas_equity', axisSwitch: true,
    match: e => e.asset_type === 'equity' && e.market !== 'kr' },
  { key: 'bond', label: '채권·현금', axis: 'style',  bench: 'bond',
    match: e => e.asset_type === 'bond' || e.asset_type === 'cash' },
  { key: 'alt',  label: '대체·기타', axis: 'style',  bench: 'other',
    match: e => ['mixed', 'commodity', 'realestate', 'currency'].includes(e.asset_type) },
  { key: 'new',  label: '신규 상장', axis: 'asset_type', bench: 'domestic_equity', isNew: true,
    match: () => true },
]

export const STYLE_LABELS = {
  broad_index: '대표지수', large_core: '대형·우량', sector: '섹터', theme: '테마',
  dividend: '배당·인컴', factor: '팩터·스타일', esg: 'ESG·기후', group: '그룹주',
  covered_call: '커버드콜', lev_inv: '레버리지·인버스',
  parking: '파킹형', govt_short: '국고채 단기', govt_mid: '국고채 중기',
  govt_long: '국고채 장기', credit: '종합·회사채',
  mixed: '자산배분·혼합', commodity: '원자재', reit: '리츠·인프라', currency: '통화',
}

export const MARKET_LABELS = {
  kr: '국내', us: '미국', cn: '중국', jp: '일본', in: '인도',
  eu: '유럽', global: '글로벌', vn: '베트남', etc_mkt: '기타 국가',
}

export const ASSET_TYPE_LABELS = {
  equity: '주식', bond: '채권', cash: '현금성', commodity: '원자재',
  realestate: '리츠·인프라', mixed: '자산배분·혼합', currency: '통화',
  derivative: '레버리지·인버스',
}

// 데이터 안의 값은 그대로 두고 화면 표시만 바꾼다.
// forward_cohort.py 가 "메인" 문자열을 직접 비교하므로 원본 값은 절대 바꾸지 않는다.
export const FINAL_CLASS_LABELS = {
  '메인': '일반',
  '신규': '신규 상장',
  '별도_트랙': '레버리지·커버드콜',
  '탈락': '기준 미달',
}

export const SIGNAL_LABELS = {
  T1: '모멘텀 (12-1개월)',
  T2: 'RSI (14일)',
  T3: '200일 이격도',
  T4: '52주 가격 위치',
  T5: '변동성 역수 (60일)',
}

export const GATE_LABELS = {
  G1: '순자산 기준',
  G2: '가격 이상 여부',
  G3: '자산군 분류 유효성',
  G4: '상장 경과 (참고)',
  G5: '레버리지·커버드콜 분리',
  G6: '보수 수준 (참고)',
}

export const GATE_REASON_KO = (gate, reason) => {
  if (gate === 'G1') return reason ? reason : '순자산 100억원 미만 또는 미확인'
  if (gate === 'G2') {
    if (reason === 'frozen_run_5')  return '가격 이상: 5일 이상 같은 값'
    if (reason === 'frozen_run_60') return '가격 이상: 60일 이상 같은 값 (거래정지 추정)'
    return reason || '가격 이상'
  }
  if (gate === 'G3') return '자산군 분류값 없음'
  if (gate === 'G4') {
    if (reason === 'predates_data_collection') return '데이터 수집 이전 상장'
    return reason || '상장 경과 참고'
  }
  if (gate === 'G5') return '레버리지·커버드콜로 분리'
  if (gate === 'G6') {
    if (reason && reason.startsWith('fee_')) {
      const m = reason.match(/fee_([\d.]+)_gt_median_([\d.]+)/)
      if (m) return `보수 ${m[1]}% — 같은 묶음 중앙값 ${parseFloat(m[2]).toFixed(2)}% 초과 (참고용, 제외 사유 아님)`
    }
    return reason || '보수 참고'
  }
  return reason || ''
}

// 구버전 호환. 검색 결과 묶음 등에서 아직 asset_class 를 쓰는 곳이 있다.
export const ASSET_CLASS_META = {
  domestic_equity:       { label: '국내주식',          order: 0, gradeable: true,  tone: 'normal' },
  domestic_equity_index: { label: '국내주식-대표지수', order: 1, gradeable: false, tone: 'gray' },
  overseas_equity:       { label: '해외주식',          order: 2, gradeable: true,  tone: 'normal' },
  bond:                  { label: '채권·현금',         order: 3, gradeable: true,  tone: 'normal' },
  other:                 { label: '기타',              order: 4, gradeable: false, tone: 'gray' },
  commodity:             { label: '원자재',            order: 5, gradeable: false, tone: 'gray' },
  realestate:            { label: '리츠·인프라',       order: 6, gradeable: false, tone: 'gray' },
  leverage_inverse:      { label: '레버리지·커버드콜', order: 7, gradeable: false, tone: 'danger' },
}
