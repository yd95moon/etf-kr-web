import React, { useContext, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ChevronDown, ChevronUp, ArrowLeft } from 'lucide-react'
import { DataContext } from '../App.jsx'
import { ASSET_CLASS_META, COLOR, GATE_REASON_KO } from '../constants.js'
import { buildEtfList, sortEtfs, fmtAum, fmtFee, getFailReason } from '../utils.js'
import EtfRow from '../components/EtfRow.jsx'

const COL = '32px 72px 1fr 52px 90px 64px'

function TableHeader() {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: COL,
      padding: '6px 12px',
      gap: 8,
      fontSize: 11,
      fontWeight: 600,
      color: COLOR.textDim,
      borderBottom: `1px solid ${COLOR.border}`,
      textTransform: 'uppercase',
      letterSpacing: '0.04em',
    }}>
      <span></span>
      <span>티커</span>
      <span>이름</span>
      <span>등급</span>
      <span style={{ textAlign: 'right' }}>AUM</span>
      <span style={{ textAlign: 'right' }}>보수</span>
    </div>
  )
}

export default function AssetClass() {
  const { asset_class } = useParams()
  const { data } = useContext(DataContext)
  const [sortMode, setSortMode] = useState('grade')
  const [sepOpen, setSepOpen] = useState(false)
  const [failOpen, setFailOpen] = useState(false)

  if (!data) return <div style={{ padding: 32, color: COLOR.textMuted }}>데이터 로딩 중…</div>

  const meta = ASSET_CLASS_META[asset_class]
  if (!meta) return <div style={{ padding: 32, color: COLOR.danger }}>알 수 없는 자산군입니다.</div>

  const allEtfs = buildEtfList(data.etfs)
  const classEtfs = allEtfs.filter(e => e.asset_class === asset_class)

  const mainEtfs = classEtfs.filter(e => e.final_class === '메인')
  const sepEtfs  = classEtfs.filter(e => e.final_class === '별도_트랙')
  const failEtfs = classEtfs.filter(e => e.final_class === '탈락')

  const effectiveSort = (!meta.gradeable && sortMode === 'grade') ? 'aum' : sortMode
  const sortedMain = sortEtfs(mainEtfs, effectiveSort)
  const sortedSep  = sortEtfs(sepEtfs, effectiveSort)

  const isDanger = meta.tone === 'danger'
  const isGray   = meta.tone === 'gray'

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '16px' }}>
      {/* Back */}
      <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, color: COLOR.textMuted, textDecoration: 'none', marginBottom: 16 }}>
        <ArrowLeft size={14} /> 자산군 목록
      </Link>

      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: isDanger ? COLOR.danger : COLOR.text, marginBottom: 6 }}>
          {meta.label}
        </h1>
        {meta.gradeable ? (
          <p style={{ fontSize: 12, color: COLOR.textMuted }}>
            등급은 같은 자산군 안에서의 상대 위치(백분위 5분위)입니다. 미래수익 보장 아님.
          </p>
        ) : isDanger ? (
          <p style={{ fontSize: 12, color: COLOR.danger }}>
            레버리지·인버스 상품은 일일 목표 추적 구조로 장기 보유 시 복리 손실이 발생할 수 있습니다. 별도 관리 자산군으로, 등급을 부여하지 않습니다.
          </p>
        ) : (
          <p style={{ fontSize: 12, color: COLOR.textMuted }}>
            30종 미만 자산군으로 등급을 부여하지 않습니다. 수치 데이터만 제공합니다.
          </p>
        )}
      </div>

      {/* Sort buttons */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {['grade', 'aum', 'fee'].map(mode => {
          const labels = { grade: '등급', aum: 'AUM', fee: '보수' }
          const disabled = mode === 'grade' && !meta.gradeable
          const active = effectiveSort === mode
          return (
            <button
              key={mode}
              disabled={disabled}
              onClick={() => setSortMode(mode)}
              style={{
                padding: '5px 14px',
                borderRadius: 6,
                border: `1px solid ${active ? '#5a6a9a' : COLOR.border}`,
                background: active ? '#2a3050' : COLOR.bgCard,
                color: disabled ? COLOR.textDim : active ? COLOR.text : COLOR.textMuted,
                cursor: disabled ? 'not-allowed' : 'pointer',
                fontSize: 12,
                fontWeight: active ? 600 : 400,
                opacity: disabled ? 0.4 : 1,
              }}
            >{labels[mode]}</button>
          )
        })}
      </div>

      {/* Main table */}
      <div style={{
        background: COLOR.bgCard,
        border: `1px solid ${COLOR.border}`,
        borderRadius: 8,
        overflow: 'hidden',
        marginBottom: 12,
      }}>
        <TableHeader />
        {sortedMain.length === 0 ? (
          <div style={{ padding: '24px 16px', textAlign: 'center', color: COLOR.textDim }}>
            메인 종목 없음
          </div>
        ) : (
          sortedMain.map(etf => (
            <EtfRow
              key={etf.ticker}
              etf={etf}
              showWarning={isDanger}
              dimmed={false}
            />
          ))
        )}
      </div>

      {/* 별도트랙 tray */}
      {sepEtfs.length > 0 && (
        <div style={{
          background: '#22242e',
          border: `1px solid ${COLOR.borderSoft}`,
          borderRadius: 8,
          overflow: 'hidden',
          marginBottom: 12,
        }}>
          <button
            onClick={() => setSepOpen(o => !o)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: COLOR.textMuted,
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            <span>⚠️ 별도트랙 {sepEtfs.length}종 (레버리지·인버스)</span>
            {sepOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {sepOpen && (
            <>
              <TableHeader />
              {sortedSep.map(etf => (
                <EtfRow key={etf.ticker} etf={etf} showWarning dimmed />
              ))}
            </>
          )}
        </div>
      )}

      {/* 탈락 tray */}
      {failEtfs.length > 0 && (
        <div style={{
          background: '#1e2028',
          border: `1px solid ${COLOR.borderSoft}`,
          borderRadius: 8,
          overflow: 'hidden',
          marginBottom: 12,
        }}>
          <button
            onClick={() => setFailOpen(o => !o)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: COLOR.textDim,
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            <span>탈락 {failEtfs.length}종</span>
            {failOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {failOpen && (
            <div>
              {/* Fail table header */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '72px 1fr 1fr',
                padding: '6px 12px',
                gap: 8,
                fontSize: 11,
                fontWeight: 600,
                color: COLOR.textDim,
                borderBottom: `1px solid ${COLOR.borderSoft}`,
                textTransform: 'uppercase',
              }}>
                <span>티커</span>
                <span>이름</span>
                <span>탈락 사유</span>
              </div>
              {failEtfs.map(etf => (
                <div key={etf.ticker} style={{
                  display: 'grid',
                  gridTemplateColumns: '72px 1fr 1fr',
                  padding: '7px 12px',
                  gap: 8,
                  fontSize: 12,
                  borderBottom: `1px solid ${COLOR.borderSoft}`,
                  alignItems: 'center',
                }}>
                  <span style={{ fontFamily: 'monospace', color: COLOR.textDim }}>{etf.ticker}</span>
                  <span style={{ color: COLOR.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{etf.name}</span>
                  <span style={{ color: COLOR.textDim, fontSize: 11 }}>{getFailReason(etf)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
