// 把規劃結果畫成真正的場地圖(36×9 + 軌道板 + 下方用板清單),輸出 HTML。
import { writeFileSync } from 'node:fs'
import { plan, verify } from './solver.mjs'
import { TILE_PORTS } from './geometry.mjs'
import { TILES } from '../data/tiles.js'

const STROKE = 13
const CELL = 22
const ROWS_N = 9, COLS_N = 36
const ROW_LABEL = 'ABCDEFGHI'
const DESIGN = Object.fromEntries(TILES.map((t) => [t.id, t]))
const CIRCLED = (n) => String.fromCodePoint(0x2460 + n - 1)

function tileSvg(id) {
  const t = DESIGN[id]
  return `<svg viewBox="0 0 ${t.vw} ${t.vh}" preserveAspectRatio="none">
    <rect x="0" y="0" width="${t.vw}" height="${t.vh}" fill="#0c0c0c"/>
    <path d="${t.d}" fill="none" stroke="#cfcfcf" stroke-width="${STROKE + 4}" stroke-linecap="round" stroke-linejoin="round" opacity=".55"/>
    <path d="${t.d}" fill="none" stroke="#fff" stroke-width="${STROKE}" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`
}

function placedHtml(p) {
  const rows = p.cells.map((c) => c[0]), cols = p.cells.map((c) => c[1])
  const minR = Math.min(...rows), minC = Math.min(...cols)
  const hC = Math.max(...rows) - minR + 1, wC = Math.max(...cols) - minC + 1
  const tileH = TILE_PORTS[p.tileId].h
  const left = minC * CELL, top = minR * CELL, w = wC * CELL, h = hC * CELL
  return `<div class="ptile" style="left:${left}px;top:${top}px;width:${w}px;height:${h}px">
    <div class="rot" style="width:${CELL}px;height:${CELL * tileH}px;transform:rotate(${p.rot}deg)">${tileSvg(p.tileId)}</div>
  </div>`
}

function buildHtml(result) {
  const v = verify(result)
  const placedAll = result.groups.flatMap((g) => g.placed).map(placedHtml).join('\n')
  const startTop = result.startRow * CELL

  const groupRows = result.groups.map((g, gi) => {
    const chips = g.placed.map((p) => {
      const id = p.tileId
      const straight = TILE_PORTS[id].straight
      return `<span class="chip ${straight ? 'straight' : ''}">${straight ? CIRCLED(id) : id}</span>`
    }).join('')
    return `<div class="grow"><b>第 ${gi + 1} 組</b><span class="drew">抽到 ${g.drew.join('・')}</span><span class="arrow">→</span>${chips}</div>`
  }).join('\n')

  return `<!doctype html><html lang="zh-Hant"><head><meta charset="UTF-8"><title>自動規劃結果</title><style>
  *{box-sizing:border-box} body{font-family:"PingFang TC",system-ui,sans-serif;margin:24px;color:#222;background:#fff}
  h1{font-size:20px;margin:0 0 4px} .sub{color:#666;margin:0 0 16px;font-size:14px}
  .field{position:relative;width:${COLS_N * CELL}px;height:${ROWS_N * CELL}px;border:2px solid #1a1a1a;background:
    repeating-linear-gradient(90deg,#eee 0 1px,transparent 1px ${CELL}px),
    repeating-linear-gradient(0deg,#eee 0 1px,transparent 1px ${CELL}px);}
  .start,.end{position:absolute;width:${CELL}px;height:${2 * CELL}px;display:flex;align-items:center;justify-content:center;font:800 13px/1 system-ui}
  .start{left:-26px;color:#0a9a0a}.end{right:-26px;color:#d11}
  .ptile{position:absolute;display:flex;align-items:center;justify-content:center;filter:drop-shadow(0 2px 4px rgba(0,0,0,.2))}
  .rot svg{display:block;width:100%;height:100%}
  .legend{margin:22px 0 6px;font-weight:800}
  .grow{display:flex;align-items:center;gap:10px;margin:6px 0;font-size:15px}
  .drew{color:#999;font-size:13px}.arrow{color:#bbb}
  .chip{display:inline-flex;align-items:center;justify-content:center;min-width:26px;height:26px;padding:0 6px;border-radius:6px;background:#222;color:#fff;font-weight:800}
  .chip.straight{background:#fff;color:#d11;border:2px solid #d11;border-radius:50%}
  </style></head><body>
  <h1>自動規劃結果</h1>
  <p class="sub">起點 ${ROW_LABEL[result.startRow]} 列(左) → 終點(右)　·　共 <b>${result.groups.length} 組 / ${v.tiles} 片</b>　·　驗證:${v.ok ? '✓ 軌道連續合法' : '✗ ' + v.why}</p>
  <div style="padding-left:28px;padding-right:28px;display:inline-block">
    <div class="field" id="field">
      <div class="start" style="top:${startTop}px">起點</div>
      <div class="end" style="top:${startTop}px">終點</div>
      ${placedAll}
    </div>
  </div>
  <div class="legend">場地下方:每組用了什麼板子(直線板號碼圈起來 ⭕)</div>
  ${groupRows}
  </body></html>`
}

const result = plan({ trials: 6000, baseSeed: 2026 })
if (!result) { console.error('沒跑出解'); process.exit(1) }
writeFileSync(new URL('../../planner-result.html', import.meta.url), buildHtml(result))
console.log('已輸出 planner-result.html　組數=', result.groups.length, '　驗證=', verify(result).ok)
