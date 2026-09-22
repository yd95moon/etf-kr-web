import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { DataContext, WatchlistContext } from '../src/App.jsx'
import Home from '../src/pages/Home.jsx'
import Watchlist from '../src/pages/Watchlist.jsx'
import EtfRow from '../src/components/EtfRow.jsx'
import { buildEtfList, sortEtfs } from '../src/utils.js'

const data = JSON.parse(fs.readFileSync('public/data/etf_v1.json'))
const returnsMap = JSON.parse(fs.readFileSync('public/data/returns.json'))
const prices = JSON.parse(fs.readFileSync('public/data/chart_prices.json'))
const benchmarks = JSON.parse(fs.readFileSync('public/data/benchmarks.json'))
const etfList = buildEtfList(data.etfs)
const context = { data, returnsMap, prices, benchmarks, etfList, activeTab:'kr', subClassMap:{}, loadingPrices:false }
const home = renderToStaticMarkup(<DataContext.Provider value={context}><Home /></DataContext.Provider>)
assert(home.includes('6개월수익률'))
assert(home.includes('모멘텀 등급 v1'))
assert(!home.includes('검증중'))
assert(home.includes('>10년</button>'))
const ordered = sortEtfs(etfList.filter(e=>e.grade_eligible), 'grade', 'desc', returnsMap)
assert(ordered.length > 0)
assert(ordered[0].momentum_6m.score >= ordered.at(-1).momentum_6m.score)
const sample = ordered.find(e=>returnsMap[e.ticker]?.m6 != null)
assert(sample)
const value = returnsMap[sample.ticker].m6
const row = renderToStaticMarkup(<EtfRow etf={sample} returnVal={value} />)
assert(row.includes(value.toFixed(1)+'%'))
const emptyRow = renderToStaticMarkup(<EtfRow etf={sample} returnVal={null} />)
assert(emptyRow.includes('—'))
const watch = renderToStaticMarkup(<DataContext.Provider value={context}><WatchlistContext.Provider value={{watchlist:[sample.ticker],toggleTicker:()=>{}}}><Watchlist /></WatchlistContext.Provider></DataContext.Provider>)
assert(watch.includes('1년수익률'))
assert(watch.includes(returnsMap[sample.ticker].m12.toFixed(1)+'%'))
assert.equal(prices.dates[0], '2016-01-04')
assert(prices.dates.at(-1) >= '2026-09-22')
console.log('PASS: home grade sort displays 6m; watchlist retains default 1y; v1 label; 10y control; return/null row; grade ordering; history range')

const overseas = renderToStaticMarkup(<DataContext.Provider value={{...context, activeTab:'ovs'}}><Home /></DataContext.Provider>)
assert(overseas.includes('업종별 분류'))
assert(overseas.includes('국가별로 보기'))
// 2026-09-22 업종 2단계 개편: 기본 화면은 큰 분야 칩만 보이고, 세부 분류는
// 큰 분야를 고른 뒤 클릭으로만 나타난다(SSR 정적 렌더로는 재현 불가).
assert(overseas.includes('디지털 기술'))
assert(overseas.includes('헬스케어'))
assert(overseas.includes('대표지수'))
assert(overseas.includes('기업집중·복합'))
console.log('PASS: overseas defaults to big-field industry chips, country toggle and diversified categories rendered')
