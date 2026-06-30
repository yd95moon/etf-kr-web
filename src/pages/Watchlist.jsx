import React, { useContext } from 'react'
import { Star } from 'lucide-react'
import { DataContext, WatchlistContext } from '../App.jsx'
import { ASSET_CLASS_META, COLOR } from '../constants.js'
import { buildEtfList, groupByAssetClass, useIsMobile } from '../utils.js'
import EtfRow from '../components/EtfRow.jsx'

const COL = '32px 1fr 52px 90px 64px'

export default function Watchlist() {
  const { data } = useContext(DataContext)
  const { watchlist } = useContext(WatchlistContext)
  const isMobile = useIsMobile()

  if (!data) return <div style={{ padding: 32, color: COLOR.textMuted }}>데이터 로딩 중…</div>

  if (watchlist.length === 0) {
    return (
      <div style={{ padding: '64px 24px', textAlign: 'center' }}>
        <Star size={40} style={{ color: COLOR.textDim, marginBottom: 16 }} />
        <div style={{ fontSize: 16, color: COLOR.textMuted, marginBottom: 8 }}>관심 ETF가 없습니다</div>
        <div style={{ fontSize: 13, color: COLOR.textDim }}>★를 눌러 관심 ETF를 추가하세요.</div>
      </div>
    )
  }

  const allEtfs = buildEtfList(data.etfs)
  const watchEtfs = allEtfs.filter(e => watchlist.includes(e.ticker))
  const groups = groupByAssetClass(watchEtfs)

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '16px' }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, color: COLOR.text, marginBottom: 20 }}>
        <Star size={18} style={{ color: COLOR.star, marginRight: 6, verticalAlign: 'middle' }} />
        관심 ETF ({watchlist.length}종)
      </h1>
      {groups.map(([ac, etfs]) => {
        const meta = ASSET_CLASS_META[ac]
        const isDanger = meta?.tone === 'danger'
        return (
          <div key={ac} style={{
            marginBottom: 20,
            background: COLOR.bgCard,
            border: `1px solid ${isDanger ? COLOR.danger + '44' : COLOR.border}`,
            borderRadius: 8, overflow: 'hidden',
          }}>
            <div style={{
              padding: '10px 14px',
              borderBottom: `1px solid ${COLOR.borderSoft}`,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: isDanger ? COLOR.danger : COLOR.text }}>
                {meta?.label || ac}
              </span>
              <span style={{ fontSize: 11, color: COLOR.textDim }}>{etfs.length}종</span>
            </div>
            {!isMobile && (
              <div style={{
                display: 'grid', gridTemplateColumns: COL,
                padding: '5px 12px', gap: 8,
                fontSize: 11, fontWeight: 600, color: COLOR.textDim,
                borderBottom: `1px solid ${COLOR.borderSoft}`,
                textTransform: 'uppercase',
              }}>
                <span></span>
                <span>종목명</span>
                <span>등급</span>
                <span style={{ textAlign: 'right' }}>AUM</span>
                <span style={{ textAlign: 'right' }}>보수</span>
              </div>
            )}
            {etfs.map(etf => (
              <EtfRow key={etf.ticker} etf={etf} showWarning={isDanger} isMobile={isMobile} />
            ))}
          </div>
        )
      })}
    </div>
  )
}
