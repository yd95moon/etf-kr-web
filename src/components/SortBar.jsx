import React from 'react'
import { COLOR } from '../constants.js'

// 기간 정렬 키. utils.js sortEtfs 의 수익률 목록과 반드시 같아야 한다.
export const PERIOD_KEYS = ['w1', 'm1', 'm3', 'm6', 'm12', 'm36', 'm60']

// 정렬 버튼 줄.
//
// 기간(1주~5년)은 하나의 눈금자다. 그래서 화면이 좁든 넓든 무조건 한 줄에 둔다.
// 줄바꿈에 맡기면 5년만 아래로 떨어져서, 눈금이 끊긴 것처럼 보인다.
// 좁은 화면에서는 일곱 칸을 가로로 균등 분할하고(flex 1) 글자 크기를 화면 폭에
// 비례해 줄여서(clamp) 밀려나지 않게 한다. 320px 폰에서도 한 줄이 유지된다.
//
// 성격(월분배·AUM·보수·등급)은 개수가 늘어날 수 있어 아랫줄에서 자연 줄바꿈을 쓴다.
export default function SortBar({
  opts,
  active,
  dir = 'desc',
  onSort,
  isMobile = false,
  gradeDisabled = false,
  padding = '10px 16px 6px',
}) {
  const arrow = dir === 'desc' ? '↓' : '↑'
  const periods = opts.filter(o => PERIOD_KEYS.includes(o.key))
  const others = opts.filter(o => !PERIOD_KEYS.includes(o.key))

  const renderBtn = ({ key, label }, stretch) => {
    const isGradeBtn = key === 'grade'
    const disabled = isGradeBtn && gradeDisabled
    const on = active === key
    return (
      <button
        key={key}
        disabled={disabled}
        onClick={() => onSort(key)}
        style={{
          // 기간 줄에서만 균등 분할. 성격 줄은 글자 폭 그대로 둔다.
          flex: stretch ? '1 1 0' : '0 0 auto',
          minWidth: 0,
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          textAlign: 'center',
          padding: stretch ? '5px 2px' : '5px 12px',
          borderRadius: 6,
          fontFamily: 'inherit',
          border: on
            ? `1px solid ${isGradeBtn ? '#6b5a7a' : '#5a6a9a'}`
            : `1px ${isGradeBtn ? 'dashed' : 'solid'} ${isGradeBtn ? '#4a3d5a' : COLOR.border}`,
          background: on ? (isGradeBtn ? '#2a2035' : '#2a3050') : COLOR.bgCard,
          color: disabled ? COLOR.textDim
            : on ? (isGradeBtn ? '#c4a8d8' : COLOR.text)
            : (isGradeBtn ? '#7a6a8a' : COLOR.textMuted),
          cursor: disabled ? 'not-allowed' : 'pointer',
          // 폭이 모자라는 건 좁은 화면의 기간 줄뿐이라 거기서만 글자를 줄인다.
          fontSize: stretch ? 'clamp(9.5px, 2.9vw, 12px)' : 12,
          fontWeight: on ? 600 : 400,
          opacity: disabled ? 0.4 : 1,
        }}
      >
        {isGradeBtn
          ? <span>등급 <span style={{ fontSize: 10, opacity: 0.75 }}>검증중</span></span>
          : label}
        {on && <span style={{ fontSize: '0.85em', marginLeft: stretch ? 1 : 4 }}>{arrow}</span>}
      </button>
    )
  }

  return (
    <div style={{ padding, display: 'flex', flexDirection: 'column', gap: 6 }}>
      {periods.length > 0 && (
        <div style={{ display: 'flex', gap: isMobile ? 3 : 6, flexWrap: 'nowrap' }}>
          {periods.map(o => renderBtn(o, isMobile))}
        </div>
      )}
      {others.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {others.map(o => renderBtn(o, false))}
        </div>
      )}
    </div>
  )
}
