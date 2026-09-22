import React from 'react'
import { GRADE_COLOR, COLOR } from '../constants.js'

export default function GradeChip({ grade, score, size = 'md' }) {
  if (!grade) {
    return (
      <span style={{
        display: 'inline-block',
        padding: size === 'sm' ? '1px 5px' : '2px 6px',
        borderRadius: 4,
        fontSize: size === 'sm' ? 11 : 12,
        fontWeight: 700,
        color: COLOR.textDim,
        background: 'transparent',
      }}>—</span>
    )
  }
  const c = GRADE_COLOR[grade] || COLOR.textDim
  return (
    <span style={{
      display: 'inline-block',
      padding: size === 'sm' ? '1px 5px' : '2px 6px',
      borderRadius: 4,
      fontSize: size === 'sm' ? 11 : 12,
      fontWeight: 700,
      background: c + '33',
      color: c,
      letterSpacing: '0.02em',
    }} title={score != null ? '6개월 목표 점수 / 100' : undefined}>{grade}{score != null ? ' · ' + score.toFixed(1) : ''}</span>
  )
}
