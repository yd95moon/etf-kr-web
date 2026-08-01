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
    label: '국내주식 · 대표지수', short: '대표지수', order: 5, gradeable: false,
    note: '같은 지수를 따라가는 상품이라 우열을 매기지 않습니다. 보수·규모·괴리율로 비교하세요.',
  },
  kr_select: {
    label: '국내주식 · 업종·전략', short: '업종·전략', order: 0, gradeable: true,
  },
  us_equity: {
    label: '미국주식', short: '미국주식', order: 1, gradeable: true,
  },
  overseas_equity: {
    label: '해외주식 (미국 외)', short: '해외주식', order: 2, gradeable: true,
  },
  overseas_hedged: {
    label: '해외주식 · 환율 방어형', short: '환율 방어형', order: 3, gradeable: true,
    note: '환율이 오르든 내리든 영향을 줄이도록 만든 상품입니다. 환율로 인한 이익도 함께 줄어듭니다.',
  },
  bond: {
    label: '채권', short: '채권', order: 4, gradeable: true,
    note: '채권은 변동성 지표를 등급 계산에서 뺐습니다. 만기 길이를 되풀이 재는 중복 지표이기 때문입니다. 참고로 30년 국고채는 값이 연 12~18% 폭으로 흔들립니다. 만기가 길수록 주식만큼 움직입니다.',
  },
  cash: {
    label: '파킹형 (현금성)', short: '파킹형', order: 6, gradeable: false,
    note: '현금을 잠시 두는 용도라 우열을 매기지 않습니다. 다만 달러·엔화 파킹형은 환율이 그대로 손익이 됩니다. 실제로 이 10종의 값이 1년간 연 9~10% 폭으로 흔들렸습니다. 원화 파킹형(0.1~0.3%)의 30배가 넘습니다.',
  },
  income: {
    label: '월배당·인컴형', short: '월배당·인컴', order: 7, gradeable: true,
    note: '수익률에는 분배금이 이미 들어 있습니다. 월분배는 그 수익 중 현금으로 나온 몫이며, 일반 계좌에서는 여기에 15.4% 세금이 붙습니다. ISA·연금 계좌면 부담을 줄일 수 있습니다.',
  },
  etc: {
    label: '기타', short: '기타', order: 8, gradeable: false,
    note: '비교 대상이 부족하거나 성격이 달라 등급 없이 지표만 표시합니다.',
  },
  derivative: {
    label: '레버리지·인버스', short: '레버리지', order: 9, gradeable: false, tone: 'danger',
    note: '하루 단위 목표를 좇는 구조라 오래 들고 있으면 손실이 쌓일 수 있습니다. 등급을 매기지 않습니다.',
  },
}

// ── 상단 탭 ───────────────────────────────────────────────────────────────────
// 순서는 문오너 지정: 국내 -> 해외 -> 레버리지 -> 월배당 -> 채권 -> 대체 -> 신규
export const TABS = [
  { key: 'kr',   label: '국내주식',  axis: 'style',  bench: 'domestic_equity',
    match: e => e.asset_type === 'equity' && e.market === 'kr' },
  { key: 'ovs',  label: '해외주식',  axis: 'market', bench: 'overseas_equity', axisSwitch: true,
    match: e => e.asset_type === 'equity' && e.market !== 'kr' },
  { key: 'lev',  label: '레버리지·인버스', axis: 'market', bench: 'derivative', special: true,
    match: e => e.peer_group === 'derivative' },
  { key: 'income', label: '월배당·인컴', axis: 'market', bench: 'income', special: true,
    match: e => e.peer_group === 'income' },
  { key: 'bond', label: '채권·현금', axis: 'style',  bench: 'bond',
    match: e => e.asset_type === 'bond' || e.asset_type === 'cash' },
  { key: 'alt',  label: '대체·기타', axis: 'style',  bench: 'other',
    match: e => ['mixed', 'commodity', 'realestate', 'currency'].includes(e.asset_type) },
  { key: 'new',  label: '신규 상장', axis: 'asset_type', bench: 'domestic_equity', isNew: true,
    match: () => true },
]

// 자기 전용 탭이 있는 평가군. 다른 탭에 중복으로 끼지 않게 걸러낸다.
export const OWN_TAB_PEERS = ['income', 'derivative']

// 표 칸 나누기. 머리글과 각 줄이 같은 값을 써야 어긋나지 않는다.
export const ROW_COLS = (showDist = false, hasChart = true) => {
  if (showDist) return hasChart ? '28px 1fr 44px 74px 60px 56px 34px' : '28px 1fr 44px 74px 60px 56px'
  return hasChart ? '32px 1fr 52px 90px 64px 36px' : '32px 1fr 52px 90px 64px'
}

// 분배금에 붙는 세금. 일반 계좌 기준.
export const DIST_TAX_RATE = 0.154

// ── 운용사 ────────────────────────────────────────────────────────────────────
// ETF 이름 첫 낱말이 곧 브랜드다. 브랜드로 운용사 이름을 찾는다.
//
// detail 이 있는 두 곳만 그 ETF 상품 페이지로 바로 간다. 실제로 열어 확인했다.
//   TIGER  ksdFund=국제표준코드(ISIN). 티커에서 계산된다. 확인: 102110, 360750, 458760
//   SOL    주소에 티커가 그대로 들어간다. 확인: soletf.com/ko/fund/etf/{티커}
//
// 나머지 운용사는 내부 코드를 써서 티커만으로 상품 페이지를 만들 수 없다.
// (삼성 id=2ETF69, KB /finderDetail/44A9, 한화 n=006273, NH /fund/A7499D2757FC46EF)
// 운용사 홈으로 보내봐야 거기서 또 검색해야 하므로 링크를 걸지 않는다.
// 이름만 글자로 보여주고, 자료 찾기는 검색 버튼이 맡는다.
//
// 확신이 없는 브랜드(FOCUS, UNICORN, HK)는 넣지 않았다. 틀린 운용사 이름을
// 보여주느니 안 보여주는 게 낫다. 검색 버튼은 어차피 전 종목에 붙는다.
export const BRAND_ISSUER = {
  TIGER:  { issuer: '미래에셋자산운용', needsIsin: true,
            detail: isin => `https://investments.miraeasset.com/tigeretf/ko/product/search/detail/index.do?ksdFund=${isin}` },
  SOL:    { issuer: '신한자산운용',
            detail: (_, t) => `https://www.soletf.com/ko/fund/etf/${t}` },
  KODEX:      { issuer: '삼성자산운용' },
  RISE:       { issuer: 'KB자산운용' },
  ACE:        { issuer: '한국투자신탁운용' },
  PLUS:       { issuer: '한화자산운용' },
  KIWOOM:     { issuer: '키움투자자산운용' },
  HANARO:     { issuer: 'NH아문디자산운용' },
  '1Q':       { issuer: '하나자산운용' },
  KoAct:      { issuer: '삼성액티브자산운용' },
  TIME:       { issuer: '타임폴리오자산운용' },
  WON:        { issuer: '우리자산운용' },
  '에셋플러스': { issuer: '에셋플러스자산운용' },
  '마이티':     { issuer: 'DB자산운용' },
  '파워':       { issuer: '교보악사자산운용' },
  IBK:        { issuer: 'IBK자산운용' },
  BNK:        { issuer: 'BNK자산운용' },
  TREX:       { issuer: '유리자산운용' },
  MIDAS:      { issuer: '마이다스에셋자산운용' },
  DAISHIN343: { issuer: '대신자산운용' },
  TRUSTON:    { issuer: '트러스톤자산운용' },
  '아이엠에셋': { issuer: '아이엠에셋자산운용' },
  KCGI:       { issuer: 'KCGI자산운용' },
}

// 성격·업종 이름. 예전에는 '섹터'와 '테마'로 나눴는데 기준이 없어서
// 같은 반도체 ETF가 어디는 섹터, 어디는 테마로 갈렸다. 업종 이름으로 바꿨다.
export const STYLE_LABELS = {
  broad_index: '대표지수', large_core: '대형·우량', factor: '팩터·전략',
  dividend: '배당주', esg: 'ESG·기후', group: '그룹주',
  covered_call: '커버드콜', lev_inv: '레버리지·인버스',
  // 업종
  ind_semi: '반도체', ind_battery: '2차전지', ind_bio: '바이오·헬스케어',
  ind_ai: 'AI·로봇·소프트웨어', ind_defense: '방산·우주항공',
  ind_ship: '조선·기계·산업재', ind_finance: '금융', ind_auto: '자동차',
  ind_energy: '에너지·화학·소재', ind_internet: '인터넷·게임·콘텐츠',
  ind_telecom: '통신·네트워크', ind_consumer: '소비재·유통',
  ind_construct: '건설·부동산', ind_it: 'IT·테크', ind_kculture: 'K-컬처',
  ind_etc: '복합·기타',
  // 채권·현금
  parking: '파킹형 (원화)', parking_fx: '파킹형 (환노출)',
  govt_short: '국고채 단기', govt_mid: '국고채 중기',
  govt_long: '국고채 장기', credit: '종합·회사채',
  mixed: '자산배분·혼합', commodity: '원자재', reit: '리츠·인프라', currency: '통화',
  // 예전 값. 데이터가 남아 있을 때를 대비해 남겨둔다.
  sector: '업종', theme: '테마',
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
  '별도_트랙': '별도 관리',
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
