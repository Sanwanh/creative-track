// 軌道板幾何模型(供自動規劃)。
// 場地:9 列(row 0..8 = A..I)× 36 欄(col 0..35)。
// 每塊板 rot=0 時:佔 h 格、寬 1、由上往下排(cell i 在 local (x=0,y=i))。
// 連接埠 port:{ s, c } —— T/B = 整塊上/下緣;L/R 配 c = 第 c 格的左/右緣。
// 旋轉以「順時針 90°」為單位(rot ∈ 0/90/180/270)。

export const ROWS_N = 9
export const COLS_N = 36
// 終點區寬 3 格:板子可以伸出終點線(最後一片「必須」伸過去;1×3 板也接得進)
export const END_COLS = 3

// 來源:設計檔 軌道板拼貼.html 的路徑兩端。
export const TILE_PORTS = {
  1: { h: 3, straight: false, ports: [{ s: 'L', c: 0 }, { s: 'L', c: 2 }] }, // 長 U 迴轉(左開口)
  2: { h: 3, straight: false, ports: [{ s: 'L', c: 0 }, { s: 'R', c: 2 }] }, // 長 S 彎
  3: { h: 3, straight: true, ports: [{ s: 'T' }, { s: 'B' }] }, // 長直線
  4: { h: 3, straight: false, ports: [{ s: 'L', c: 0 }, { s: 'B' }] }, // 長彎 左上→下
  5: { h: 3, straight: false, ports: [{ s: 'R', c: 0 }, { s: 'B' }] }, // 長彎 右上→下
  6: { h: 2, straight: true, ports: [{ s: 'T' }, { s: 'B' }] }, // 短直線
  7: { h: 2, straight: false, ports: [{ s: 'R', c: 0 }, { s: 'B' }] }, // 短彎 右上→下
  8: { h: 2, straight: false, ports: [{ s: 'L', c: 0 }, { s: 'B' }] }, // 短彎 左上→下
  9: { h: 2, straight: false, ports: [{ s: 'L', c: 0 }, { s: 'L', c: 1 }] }, // 短 U 迴轉(左開口)
  // S 板:三向路口(直放=上左、中右、下左)。線從任一口進、另兩口擇一出;只能旋轉不能鏡射。
  S: { h: 3, straight: false, ports: [{ s: 'L', c: 0 }, { s: 'R', c: 1 }, { s: 'L', c: 2 }] },
}

const SIDE_ORDER = ['T', 'R', 'B', 'L']
export const OPPOSITE = { T: 'B', B: 'T', L: 'R', R: 'L' }
export const DELTA = { T: [-1, 0], B: [1, 0], L: [0, -1], R: [0, 1] } // [drow, dcol]

export function rotSide(s, q) {
  return SIDE_ORDER[(SIDE_ORDER.indexOf(s) + q) % 4]
}

// 旋轉 local 點 (x,y) 在 box (W×H) 內,順時針 q 次 90°。回傳 [x', y', W', H']。
export function rotPoint(x, y, W, H, q) {
  let nx = x, ny = y, w = W, h = H
  for (let k = 0; k < q; k++) {
    const px = h - 1 - ny
    const py = nx
    nx = px
    ny = py
    ;[w, h] = [h, w]
  }
  return [nx, ny, w, h]
}

// port 在 local 的 cell 座標 (x=0, y)
function portLocalY(tile, p) {
  if (p.s === 'T') return 0
  if (p.s === 'B') return tile.h - 1
  return p.c // L/R
}

// 把一塊板放在 (originR, originC, rot),回傳佔格與兩個 port 的網格資訊。
// port: { cell:[r,c], side, exit:[r,c] }  exit = 跨過 side 的鄰格(可能出界)
export function place(tileId, originR, originC, rot) {
  const tile = TILE_PORTS[tileId]
  const q = (rot / 90) % 4
  const cells = []
  for (let i = 0; i < tile.h; i++) {
    const [x, y] = rotPoint(0, i, 1, tile.h, q)
    cells.push([originR + y, originC + x])
  }
  const ports = tile.ports.map((p) => {
    const ly = portLocalY(tile, p)
    const [x, y] = rotPoint(0, ly, 1, tile.h, q)
    const cell = [originR + y, originC + x]
    const side = rotSide(p.s, q)
    const exit = [cell[0] + DELTA[side][0], cell[1] + DELTA[side][1]]
    return { cell, side, exit }
  })
  return { tileId, rot, cells, ports }
}

// 找出所有「能讓某個 port 落在 needCell、且旋轉後該 side == needSide」的擺法。
// occupied: Set of "r,c"。回傳合法擺法陣列(界內;allowOverlap=true 時可壓在已放板子上)。
// 每個擺法附 overlap = 與既有板子重疊的格數(供評分懲罰)。
export function placementsFor(tileId, needR, needC, needSide, occupied, opts = {}) {
  const allowOverlap = opts.allowOverlap ?? false
  const tile = TILE_PORTS[tileId]
  const out = []
  for (let q = 0; q < 4; q++) {
    const rot = q * 90
    for (let pi = 0; pi < tile.ports.length; pi++) {
      const p = tile.ports[pi]
      if (rotSide(p.s, q) !== needSide) continue
      const ly = portLocalY(tile, p)
      const [px, py] = rotPoint(0, ly, 1, tile.h, q)
      const originR = needR - py
      const originC = needC - px
      const placed = place(tileId, originR, originC, rot)
      // 界內(允許伸進終點區 END_COLS 格);重疊依 allowOverlap
      let ok = true
      let overlap = 0
      for (const [r, c] of placed.cells) {
        if (r < 0 || r >= ROWS_N || c < 0 || c >= COLS_N + END_COLS) {
          ok = false
          break
        }
        if (occupied.has(r + ',' + c)) {
          if (!allowOverlap) {
            ok = false
            break
          }
          overlap++
        }
      }
      if (!ok) continue
      placed.overlap = overlap
      // 確認連接的那個 port 確實落在 needCell(理論上一定,保險)
      const inPort = placed.ports[pi]
      if (inPort.cell[0] !== needR || inPort.cell[1] !== needC) continue
      out.push({ placed, inPortIndex: pi })
    }
  }
  return out
}

// ---------- 自我測試 ----------
function assert(cond, msg) { if (!cond) { console.error('FAIL:', msg); process.exitCode = 1 } else console.log('ok  :', msg) }

if (typeof process !== 'undefined' && process.argv?.[1] && import.meta.url === `file://${process.argv[1]}`) {
  // 1) 直立直線 3 號:佔 (0,0)(1,0)(2,0),port 上=(0,0)T、下=(2,0)B
  const t3 = place(3, 0, 0, 0)
  assert(JSON.stringify(t3.cells) === JSON.stringify([[0, 0], [1, 0], [2, 0]]), '3號 rot0 佔格 (0,0)(1,0)(2,0)')
  assert(t3.ports[0].side === 'T' && t3.ports[0].cell[0] === 0, '3號 rot0 port0=上緣')
  assert(t3.ports[1].side === 'B' && t3.ports[1].cell[0] === 2, '3號 rot0 port1=下緣')

  // 2) 3 號旋轉 90°(CW):變成橫的、佔 1 列 × 3 欄,port 變成 左/右
  const t3r = place(3, 0, 0, 90)
  const cols = t3r.cells.map((c) => c[1]).sort((a, b) => a - b)
  const rowsSet = new Set(t3r.cells.map((c) => c[0]))
  assert(rowsSet.size === 1 && cols.length === 3, '3號 rot90 = 橫向 1列×3欄')
  const sides = t3r.ports.map((p) => p.side).sort()
  assert(sides[0] === 'L' && sides[1] === 'R', '3號 rot90 port 變成 L/R(可左右走)')

  // 3) placementsFor:在 (4,0) 需要一個朝 L 的 port(從起點進場),3號應有解
  const occ = new Set()
  const sols = placementsFor(3, 4, 0, 'L', occ)
  assert(sols.length > 0, '3號 能接「(4,0) 朝左」的起點需求(旋轉後)')
  const s0 = sols[0].placed
  const other = s0.ports[1 - sols[0].inPortIndex]
  assert(other.side === 'R', '3號 接左後、另一端朝右(往右推進)')

  // 4) U 迴轉 9 號:兩 port 同在 L(rot0)
  const t9 = place(9, 0, 0, 0)
  assert(t9.ports[0].side === 'L' && t9.ports[1].side === 'L', '9號 rot0 兩端都在左緣(U迴轉)')

  console.log(process.exitCode ? '\n=== 有測試失敗 ===' : '\n=== 幾何全部通過 ===')
}
