// 自動規劃器:抽籤「只抽一次」4 片(例如 1234),整場用這 4 片循環拼到終點。
//
// ── 硬規則(一定遵守,違反就是死路)──────────────────────────────
//   H1 每一輪(組)= 抽到的 4 片 + 1 片 S 板(共 5 片)各用一次,順序不限;
//      用完同樣 5 片進下一輪,循環到底
//   H2 緩衝:剛放下的「最後 2 片」要先搬回,同號板子兩次使用之間至少隔 2 片(S 板亦同)
//   H3 板子只能「4 向旋轉」、不能鏡射(mirror);S 板亦同
//      S 板=三向路口(直放=上左、中右、下左),線從任一口進、另兩口擇一出
//   H4 不可超出場地(可伸進終點區 END_COLS 格)
//   H5 加分點(若有)一定要經過
//   H6 最後一塊板子必須「伸出終點線」:板子末端實際壓進終點區,表示接出去
//      (只有出口指過線不算;必要時在終點區再放一塊收尾)
//   H7 組數越少越好(逼近理論下限 minRounds)
//
// ── 規劃核心 = A*,直接最小化「總片數(=組數)」,保證最省 ─────────────
//   實驗證明:調軟規則權重救不了組數;真正關鍵是搜尋本身(見 solveAStar)。
// ── 軟規則(現在只當「平手微調」:等片數時挑最直的一條,絕不影響組數)──
//   uturn    進出同側=回轉一圈(1/9 號 U 板),最不想要
//   backward 出口朝左=倒退
//   vertical 純垂直移動(能橫就橫,板子越多橫越快)
//   想調:plan({ weights:{ uturn: 8, backward: 5, vertical: 1 } })
import { OPPOSITE, ROWS_N, COLS_N, END_COLS, TILE_PORTS, placementsFor } from './geometry.mjs'

const TILE_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9]
const ROW_LABEL = 'ABCDEFGHI'

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const k = (r, c) => r + ',' + c

// 抽籤:抽出整場使用的 4 片(不重複)。
export function drawHand(rng) {
  const pool = TILE_IDS.slice()
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool.slice(0, 4).sort((a, b) => a - b)
}

// ── A* 最佳優先搜尋:直接最小化「總片數」(= 組數),保證最省 ──────────────
//   狀態 = (need 格 r,c、need 邊、本輪已用片 bitmask、已過加分點 bitmask、前2片)
//   成本 = 每片 1;軟規則(回轉/倒退/垂直)只當「平手微調」(×1e-3),
//          永遠改不了片數排名,只在等長解中挑最直的一條。
//   啟發值 = 剩餘欄數 ÷ 單片最大水平推進(可採且一致 → A* 最佳)。
//   壓板合法 → 佔格不必進狀態,狀態空間小、可實際求到最佳解。

class MinHeap {
  constructor() { this.a = [] }
  get size() { return this.a.length }
  push(x) {
    const a = this.a
    a.push(x)
    let i = a.length - 1
    while (i > 0) {
      const p = (i - 1) >> 1
      if (a[p].f <= a[i].f) break
      ;[a[p], a[i]] = [a[i], a[p]]
      i = p
    }
  }
  pop() {
    const a = this.a
    const top = a[0]
    const last = a.pop()
    if (a.length) {
      a[0] = last
      let i = 0
      for (;;) {
        let m = i
        const l = 2 * i + 1
        const r = 2 * i + 2
        if (l < a.length && a[l].f < a[m].f) m = l
        if (r < a.length && a[r].f < a[m].f) m = r
        if (m === i) break
        ;[a[m], a[i]] = [a[i], a[m]]
        i = m
      }
    }
    return top
  }
}

const EMPTY_OCC = new Set()

function reconstruct(node) {
  const out = []
  for (let n = node; n && n.placed; n = n.parent) out.push(n.placed)
  out.reverse()
  return out
}

// 對單一起點列跑 A*,回傳「最少片數」的放置序列;找不到回 null。
// opts.includeS:每輪是否含 1 片 S 板(國小組=false)。opts.sLast:S 必須是該輪最後一片(高中組)。
function solveAStar(startRow, bonus, hand, opts = {}) {
  const includeS = opts.includeS ?? true
  const sLast = opts.sLast ?? false
  const buffer = opts.buffer ?? 2 // 緩衝片數:2=正常、1=激進(只擋剛放的 1 片)
  const slots = includeS ? [...hand, 'S'] : [...hand] // 每輪 = 抽到的 4 片(+ 1 片 S)
  const sIdx = includeS ? slots.length - 1 : -1
  const allButS = includeS ? (1 << sIdx) ^ ((1 << slots.length) - 1) : 0 // 除 S 外全用完
  const cap = opts.cap ?? 150000
  const full = (1 << slots.length) - 1
  const allBonus = (1 << bonus.length) - 1
  const maxAdv = Math.max(...slots.map((t) => TILE_PORTS[t].h)) // 單片最多往右推進的欄數
  // 板端要壓進終點區 → 從 need 欄 c 起共需覆蓋 (COLS_N+1-c) 欄;非終點節點至少再 1 片
  const heur = (c) => Math.max(1, Math.ceil((COLS_N + 1 - c) / maxAdv))
  const w = opts.w || {}
  const TB = 1e-3 // tie-break 量級:絕不影響片數,只在等長時挑最直
  const wU = (w.uturn ?? 6) * TB
  const wB = (w.backward ?? 4) * TB
  const wV = (w.vertical ?? 1) * TB

  const sKey = `${startRow},0,L,0,0,0,0`
  const open = new MinHeap()
  open.push({
    f: heur(0), g: 0, goal: false, key: sKey, placed: null, parent: null,
    r: startRow, c: 0, side: 'L', used: 0, bm: 0, prev: 0, pp: 0,
  })
  const bestG = new Map([[sKey, 0]])
  let nodes = 0

  while (open.size) {
    const cur = open.pop()
    if (cur.goal) return reconstruct(cur)
    if (cur.g > (bestG.get(cur.key) ?? Infinity)) continue
    if (++nodes > cap) return null

    const used = cur.used === full ? 0 : cur.used // 該輪用完 → 開新一輪
    const ppKey = buffer >= 2 ? cur.prev : 0 // 激進模式不把「前前片」納入狀態
    for (let i = 0; i < slots.length; i++) {
      if (used & (1 << i)) continue
      const tid = slots[i]
      if (tid === cur.prev) continue // 緩衝:剛放下的板子不能馬上再用
      if (buffer >= 2 && tid === cur.pp) continue // 正常模式:再往前一片也要緩衝
      if (sLast && i === sIdx && used !== allButS) continue // 高中組:S 必須是該輪最後一片
      for (const sol of placementsFor(tid, cur.r, cur.c, cur.side, EMPTY_OCC, { allowOverlap: true })) {
        const inCell = sol.placed.ports[sol.inPortIndex].cell
        const inIdx = sol.placed.cells.findIndex(([cr, cc]) => cr === inCell[0] && cc === inCell[1])
        // S 板有 3 個口:線從進口進,可從「另外兩口」擇一出(一般板只有 1 個出口)
        for (let oi = 0; oi < sol.placed.ports.length; oi++) {
          if (oi === sol.inPortIndex) continue
          const out = sol.placed.ports[oi]
          const ex = out.exit
          // 加分點:必須是「線實際經過」的格(進口→出口之間的那段線),不只是板子壓到。
          // 一條線占 1 格寬,進/出口落在板子兩端格之間;S 板沒被線經過的那一臂即使壓到也不算。
          let bm = cur.bm
          if (bm !== allBonus) {
            const outIdx = sol.placed.cells.findIndex(([cr, cc]) => cr === out.cell[0] && cc === out.cell[1])
            const lo = Math.min(inIdx, outIdx)
            const hi = Math.max(inIdx, outIdx)
            for (let b = 0; b < bonus.length; b++) {
              if (bm & (1 << b)) continue
              for (let kk = lo; kk <= hi; kk++) {
                const [cr, cc] = sol.placed.cells[kk]
                if (cr === bonus[b].r && cc === bonus[b].c) { bm |= 1 << b; break }
              }
            }
          }
          let tie = 0
          if (out.side === cur.side) tie += wU // 進出同側 = 回轉一圈
          if (out.side === 'L') tie += wB // 出口朝左 = 倒退
          else if (out.side !== 'R') tie += wV // 垂直(能橫就橫)
          const ng = cur.g + 1 + tie

          // 收尾「多壓一塊」:若這片進口已在終點區(前一片把線帶過終點線),
          // 這片就是壓在終點區的那塊收尾板(界內已由 placementsFor 保證)→ 達標。
          if (cur.c >= COLS_N) {
            open.push({ f: ng, g: ng, goal: true, placed: sol.placed, parent: cur })
            continue
          }
          // 出口進終點區:加分點要先過完,且要留得下收尾片(出口欄在終點區內)
          if (ex[1] >= COLS_N) {
            if (bm !== allBonus) continue
            if (ex[1] >= COLS_N + END_COLS) continue // 太遠,終點區放不下收尾片
          } else if (ex[0] < 0 || ex[0] >= ROWS_N || ex[1] < 0) {
            continue
          }
          const nUsed = used | (1 << i)
          const nSide = OPPOSITE[out.side]
          const nKey = `${ex[0]},${ex[1]},${nSide},${nUsed},${bm},${tid},${ppKey}`
          if (ng >= (bestG.get(nKey) ?? Infinity)) continue
          bestG.set(nKey, ng)
          open.push({
            f: ng + heur(ex[1]), g: ng, goal: false, key: nKey, placed: sol.placed, parent: cur,
            r: ex[0], c: ex[1], side: nSide, used: nUsed, bm, prev: tid, pp: ppKey,
          })
        }
      }
    }
  }
  return null
}

// 理論最少輪數:每輪片數最多前進「每片長度總和」欄,要跨 37 欄。
function minRounds(hand, includeS) {
  const perRound = hand.reduce((s, t) => s + TILE_PORTS[t].h, 0) + (includeS ? TILE_PORTS.S.h : 0)
  return Math.max(1, Math.ceil(37 / perRound))
}

// 起點列嘗試順序:有加分點時以第一個加分點的列為中心向外擴。
function startRowOrder(bonus) {
  const base = bonus.length ? bonus[0].r : ROWS_N >> 1
  const seen = new Set()
  const order = []
  for (const d of [0, -1, 1, -2, 2, -3, 3, -4, 4]) {
    const r = base + d
    if (r >= 0 && r < ROWS_N && !seen.has(r)) { seen.add(r); order.push(r) }
  }
  for (let r = 0; r < ROWS_N; r++) if (!seen.has(r)) order.push(r)
  return order
}

// 用固定 hand(4 片)循環,A* 求「組數最少」的完整路線。
// weights:軟規則微調(回轉/倒退/垂直),只在等長解中挑最直,不影響組數。
export function plan({
  baseSeed = 1, bonus = [], hand = null, timeLimitMs = 3000, weights = {},
  includeS = true, sLast = false, buffer = 2, cap,
} = {}) {
  if (!hand) hand = drawHand(mulberry32(baseSeed ^ 0x9e3779b9)) // CLI/相容:沒給就抽一手
  const floor = minRounds(hand, includeS)
  const roundSize = hand.length + (includeS ? 1 : 0)
  const t0 = Date.now()
  let best = null
  let bestTiles = Infinity
  for (const startRow of startRowOrder(bonus)) {
    if (Date.now() - t0 > timeLimitMs) break
    const seqPlaced = solveAStar(startRow, bonus, hand, { w: weights, includeS, sLast, buffer, cap })
    if (!seqPlaced || seqPlaced.length >= bestTiles) continue
    bestTiles = seqPlaced.length
    const groups = []
    for (let i = 0; i < seqPlaced.length; i += roundSize) {
      groups.push({ drew: hand.slice(), placed: seqPlaced.slice(i, i + roundSize) })
    }
    best = { startRow, groups, reachedEnd: true, hand: hand.slice(), includeS, sLast, buffer }
    if (best.groups.length <= floor) break // 已達理論下限,收工
  }
  return best
}

const CIRCLED = (n) => String.fromCodePoint(0x2460 + n - 1) // ①..⑨
// 直放圈起來:數字 → ①..⑨,S 板 → Ⓢ
const chipText = (tileId, rot) => {
  const vertical = rot % 180 === 0
  if (tileId === 'S') return vertical ? 'Ⓢ' : 'S'
  return vertical ? CIRCLED(tileId) : String(tileId)
}

export function reportText(result) {
  if (!result) return '（這手 4 片沒跑出解,請重抽)'
  const lines = []
  lines.push(`抽籤 4 片:[${result.hand.join(' ')}] + 每輪 1 片 S 板(整場循環使用)`)
  lines.push(`起點:${ROW_LABEL[result.startRow]} 列(左側) → 終點:超過終點線`)
  lines.push(`總共 ${result.groups.length} 輪`)
  lines.push('')
  let total = 0
  result.groups.forEach((grp, gi) => {
    total += grp.placed.length
    const shown = grp.placed.map((p) => chipText(p.tileId, p.rot))
    lines.push(`第 ${gi + 1} 輪  拼上:${shown.join('  ')}`)
  })
  lines.push('')
  lines.push(`(直放的板子號碼圈起來;共 ${total} 片)`)
  return lines.join('\n')
}

export function asciiGrid(result, bonus = []) {
  if (!result) return ''
  const W = COLS_N + END_COLS
  const grid = Array.from({ length: ROWS_N }, () => Array(W).fill('·'))
  for (const b of bonus) grid[b.r][b.c] = '◎'
  result.groups.forEach((grp) => {
    grp.placed.forEach((p) => {
      for (const [r, c] of p.cells) grid[r][c] = String(p.tileId)
    })
  })
  const header = '    ' + Array.from({ length: W }, (_, i) => ((i + 1) % 10)).join('')
  const rows = grid.map((row, r) => `${ROW_LABEL[r]}   ${row.join('')}`)
  return [header, ...rows].join('\n')
}

// 獨立驗證:固定手牌、每輪用齊、緩衝間隔、連續性、界內、加分點、收尾壓板。
export function verify(result, bonus = [], opts = {}) {
  if (!result) return { ok: false, why: '無結果' }
  const includeS = opts.includeS ?? result.includeS ?? true
  const sLast = opts.sLast ?? result.sLast ?? false
  const buffer = opts.buffer ?? result.buffer ?? 2
  const roundSize = result.hand.length + (includeS ? 1 : 0)
  const handSet = new Set(result.hand)
  for (let gi = 0; gi < result.groups.length; gi++) {
    const g = result.groups[gi]
    const ids = g.placed.map((p) => p.tileId)
    if (new Set(ids).size !== ids.length) return { ok: false, why: `第${gi + 1}輪同一片用了兩次` }
    if (!ids.every((t) => t === 'S' || handSet.has(t))) {
      return { ok: false, why: `第${gi + 1}輪用了手牌以外的板子` }
    }
    if (sLast && ids.includes('S') && ids[ids.length - 1] !== 'S') {
      return { ok: false, why: `第${gi + 1}輪 S 板不在最後` }
    }
    const isLast = gi === result.groups.length - 1
    if (!isLast) {
      if (ids.length !== roundSize) return { ok: false, why: `第${gi + 1}輪沒用滿 ${roundSize} 片就換輪` }
      if (includeS && !ids.includes('S')) return { ok: false, why: `第${gi + 1}輪沒有包含 S 板` }
    }
  }
  // 緩衝:同號兩次使用之間至少隔 buffer 片(S 板亦同)
  const seq = result.groups.flatMap((g) => g.placed.map((p) => p.tileId))
  for (let i = 0; i < seq.length; i++) {
    for (let j = i + 1; j <= i + buffer && j < seq.length; j++) {
      if (seq[i] === seq[j]) return { ok: false, why: `緩衝不足:第${i + 1}、${j + 1}片同為${seq[i]}號` }
    }
  }
  const all = result.groups.flatMap((g) => g.placed)
  const occ = new Set() // 佔格(界內/壓板檢查用)
  const passed = new Set() // 線實際經過的格(加分點以此為準)
  let need = { cell: [result.startRow, 0], side: 'L' }
  for (let i = 0; i < all.length; i++) {
    const p = all[i]
    const pin = p.ports.findIndex(
      (pt) => pt.cell[0] === need.cell[0] && pt.cell[1] === need.cell[1] && pt.side === need.side
    )
    if (pin < 0) return { ok: false, why: `第${i + 1}塊接不上` }
    for (const [r, c] of p.cells) {
      if (r < 0 || r >= ROWS_N || c < 0 || c >= COLS_N + END_COLS) return { ok: false, why: `第${i + 1}塊出界` }
      occ.add(k(r, c)) // 壓板合法:可疊在已放板子上(走回頭路)
    }
    // 出口:一般板=另一口;S 板(3 口)=用「下一塊接得上的那個口」回推(最後一塊=伸過終點線的口)
    const outs = p.ports.filter((_, idx) => idx !== pin)
    let other
    if (i === all.length - 1) {
      other = outs.find((o) => o.cell[1] >= COLS_N) ?? outs[0]
    } else {
      const np = all[i + 1]
      other = outs.find((o) =>
        np.ports.some((q) => q.cell[0] === o.exit[0] && q.cell[1] === o.exit[1] && q.side === OPPOSITE[o.side])
      )
      if (!other) return { ok: false, why: `第${i + 1}塊(${p.tileId})之後接不上` }
    }
    // 這塊「線經過」的格 = 進口格→出口格之間那段(S 板沒走的那一臂不算)
    const ix = p.cells.findIndex(([r, c]) => r === p.ports[pin].cell[0] && c === p.ports[pin].cell[1])
    const ox = p.cells.findIndex(([r, c]) => r === other.cell[0] && c === other.cell[1])
    for (let kk = Math.min(ix, ox); kk <= Math.max(ix, ox); kk++) passed.add(k(p.cells[kk][0], p.cells[kk][1]))
    if (i === all.length - 1) {
      if (other.cell[1] < COLS_N) return { ok: false, why: '最後一塊沒有超過終點線' }
      for (const b of bonus) {
        if (!passed.has(k(b.r, b.c))) return { ok: false, why: `加分點 ${ROW_LABEL[b.r]}${b.c + 1} 沒被線經過` }
      }
      return { ok: true, tiles: all.length }
    }
    need = { cell: other.exit, side: OPPOSITE[other.side] }
  }
  return { ok: false, why: '沒有到終點' }
}

if (typeof process !== 'undefined' && process.argv?.[1] && import.meta.url === `file://${process.argv[1]}`) {
  // 三組規則:國小(無S、加分點 12/24)、國中(含S)、高中(含S且S在最後)
  const divisions = [
    { name: '國小', bonus: [{ r: 3, c: 11 }, { r: 5, c: 23 }], includeS: false, sLast: false },
    { name: '國中', bonus: [{ r: 1, c: 8 }, { r: 5, c: 17 }, { r: 3, c: 26 }], includeS: true, sLast: false },
    { name: '高中', bonus: [{ r: 1, c: 8 }, { r: 5, c: 17 }, { r: 3, c: 26 }], includeS: true, sLast: true },
  ]
  for (const hand of [[1, 2, 3, 4], [2, 3, 5, 6], [4, 5, 6, 7]]) {
    for (const d of divisions) {
      const t0 = Date.now()
      const r = plan({ baseSeed: 7, bonus: d.bonus, hand, includeS: d.includeS, sLast: d.sLast })
      const v = r ? verify(r, d.bonus, { includeS: d.includeS, sLast: d.sLast }) : null
      const lastTid = r ? r.groups.at(-1).placed.at(-1).tileId : '-'
      console.log(
        `${d.name} ${JSON.stringify(hand)}: ${r ? r.groups.length + '輪/' + v.tiles + '片 收尾=' + lastTid + ' verify=' + (v.ok ? '✓' : '✗ ' + v.why) : '無解'} (${Date.now() - t0}ms)`
      )
    }
  }
}
