import React, { useContext } from 'react'
import { Link } from 'react-router-dom'
import { DataContext } from '../App.jsx'
import { ASSET_CLASS_META, COLOR } from '../constants.js'
import { buildEtfList } from '../utils.js'

export default function AssetGrid() {
  const { data } = useContext(DataContext)
  if (!data) return <div style={{ padding: 32, color: COLOR.textMuted }}>데이터 로딩 중…</div>

  const etfs = buildEtfList(data.etfs)

  // Count per asset_class
  const counts = {}
  for (const etf of etfs) {
    counts[etf.asset_class] = (counts[etf.asset_class] || 0) + 1
  }

  const classes = Object.entries(ASSET_CLASS_META).sort((a, b) => a[1].order - b[1].order)

  return (
    <div style={{ padding: '24px 16px', maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: 18, fontSize: 12, color: COLOR.textDim, textAlign: 'center' }}>
        forward n=1 · 측정 전 · 첫 채점 2026-09-26
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: 14,
      }}>
        {classes.map(([ac, meta]) => {
          const count = counts[ac] || 0
          const isDanger = meta.tone === 'danger'
          const isGray = meta.tone === 'gray'

          const cardBg = isDanger ? '#2a1d1d' : isGray ? '#22242e' : COLOR.bgCard
          const cardBorder = isDanger ? `${COLOR.danger}55` : isGray ? COLOR.borderSoft : COLOR.border

          return (
            <Link
              key={ac}
              to={`/class/${ac}`}
              style={{ textDecoration: 'none' }}
            >
              <div style={{
                background: cardBg,
                border: `1px solid ${cardBorder}`,
                borderRadius: 10,
                padding: '18px 16px',
                cursor: 'pointer',
                transition: 'border-color 0.15s, transform 0.1s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = isDanger ? COLOR.danger : '#5a6070'
                e.currentTarget.style.transform = 'translateY(-2px)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = cardBorder
                e.currentTarget.style.transform = 'translateY(0)'
              }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <span style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: isDanger ? COLOR.danger : isGray ? COLOR.textMuted : COLOR.text,
                  }}>
                    {meta.label}
                  </span>
                  <span style={{ fontSize: 12, color: COLOR.textDim }}>{count}종</span>
                </div>

                {/* Badge */}
                {meta.gradeable && (
                  <div style={{
                    display: 'inline-block',
                    padding: '2px 8px',
                    borderRadius: 4,
                    fontSize: 11,
                    fontWeight: 600,
                    background: '#fbbf2422',
                    color: '#fbbf24',
                  }}>
                    등급 A~E
                  </div>
                )}
                {!meta.gradeable && isDanger && (
                  <div style={{
                    display: 'inline-block',
                    padding: '2px 8px',
                    borderRadius: 4,
                    fontSize: 11,
                    fontWeight: 600,
                    background: `${COLOR.danger}22`,
                    color: COLOR.danger,
                  }}>
                    장기보유 부적합, 별도 관리
                  </div>
                )}
                {!meta.gradeable && !isDanger && (
                  <div style={{
                    display: 'inline-block',
                    padding: '2px 8px',
                    borderRadius: 4,
                    fontSize: 11,
                    fontWeight: 600,
                    background: '#ffffff11',
                    color: COLOR.textDim,
                  }}>
                    30종 미만, 수치만
                  </div>
                )}
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
