import React from 'react'
import { GRADE_COLOR, COLOR } from '../constants.js'

export default function GradeChip({ grade, size = 'md' }) {
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
    }}>{grade}</span>
  )
}
