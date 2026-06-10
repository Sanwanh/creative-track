// 軌道板資料模型 v7 —— 形狀來自設計檔 軌道場地.html(最終統一幾何)。
//   1~5 號 = 3 格高(viewBox 100×300)、6~9 號 = 2 格高(viewBox 100×200)。
//   出入口一律在「格邊中點」(y = 50/150/250)→ 每片完整佔滿格子、整格吸附、線精準對接。
//   白線 stroke=15、butt caps、無灰光暈。
//   ports:{ s:'T'|'B'|'L'|'R', c?:格index }

export const ROWS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I']
export const COLS = Array.from({ length: 36 }, (_, i) => i + 1)

// 終點區寬 3 格:板子可伸出終點線(最後一片必須超過;1×3 板也接得進)。
export const FIELD_COLS = 36
export const END_COLS = 3
export const TOTAL_COLS = FIELD_COLS + END_COLS

// 加分點:固定在 9、18、27 欄,列從 B~H 抽籤。
export const BONUS_COLS = [9, 18, 27]
export const BONUS_ROW_CHOICES = ['B', 'C', 'D', 'E', 'F', 'G', 'H']

export const GRID_CELL = 34 // 格子像素(與 index.css 的 --cell 必須一致)
export const TRACK_STROKE = 15

const TILES_3 = [
  { id: 1, label: '1', h: 3, vw: 100, vh: 300, d: 'M0,50 A50,50 0 0 1 50,100 L50,200 A50,50 0 0 1 0,250', ports: [{ s: 'L', c: 0 }, { s: 'L', c: 2 }] }, // 長 U 迴轉
  { id: 2, label: '2', h: 3, vw: 100, vh: 300, d: 'M0,50 A50,50 0 0 1 50,100 L50,200 A50,50 0 0 0 100,250', ports: [{ s: 'L', c: 0 }, { s: 'R', c: 2 }] }, // 長 S 彎
  { id: 3, label: '3', h: 3, vw: 100, vh: 300, d: 'M50,0 L50,300', ports: [{ s: 'T' }, { s: 'B' }], straight: true }, // 長直線
  { id: 4, label: '4', h: 3, vw: 100, vh: 300, d: 'M0,50 A50,50 0 0 1 50,100 L50,300', ports: [{ s: 'L', c: 0 }, { s: 'B' }] }, // 長彎 左上→下
  { id: 5, label: '5', h: 3, vw: 100, vh: 300, d: 'M100,50 A50,50 0 0 0 50,100 L50,300', ports: [{ s: 'R', c: 0 }, { s: 'B' }] }, // 長彎 右上→下
]

const TILES_2 = [
  { id: 6, label: '6', h: 2, vw: 100, vh: 200, d: 'M50,0 L50,200', ports: [{ s: 'T' }, { s: 'B' }], straight: true }, // 短直線
  { id: 7, label: '7', h: 2, vw: 100, vh: 200, d: 'M100,50 A50,50 0 0 0 50,100 L50,200', ports: [{ s: 'R', c: 0 }, { s: 'B' }] }, // 短彎 右上→下
  { id: 8, label: '8', h: 2, vw: 100, vh: 200, d: 'M0,50 A50,50 0 0 1 50,100 L50,200', ports: [{ s: 'L', c: 0 }, { s: 'B' }] }, // 短彎 左上→下
  { id: 9, label: '9', h: 2, vw: 100, vh: 200, d: 'M0,50 A50,50 0 0 1 0,150', ports: [{ s: 'L', c: 0 }, { s: 'L', c: 1 }] }, // 短 U 迴轉(半圓)
]

export const TILES = [...TILES_3, ...TILES_2]

// S 板:三紅點交叉路口。直放 = 上左、中右、下左(三向路口,線從任一口進、另兩口擇一出)。
// 每一組(輪)都必須包含 1 片 S 板(抽 4 片 + S = 5 片,順序不限)。只能旋轉、不能鏡射。
export const S_TILE = {
  id: 'S',
  label: 'S板',
  h: 3,
  vw: 100,
  vh: 300,
  junction: true,
  ports: [{ s: 'L', c: 0 }, { s: 'R', c: 1 }, { s: 'L', c: 2 }],
}

// 起點板:設計檔為「上黑塊(含白槽)+ 底部白墊」。2x1、橫放在起點區內(不過起點線)。
export const START_PLATE = {
  id: 'start',
  label: '起點板',
  h: 2,
  vw: 100,
  vh: 200,
  startPlate: true,
  startOnly: true,
}

export const TILE_BY_ID = {
  start: START_PLATE,
  S: S_TILE,
  ...Object.fromEntries(TILES.map((t) => [t.id, t])),
}

export const cellKey = (row, col) => `${row}-${col}`

export function parseKey(key) {
  const i = key.indexOf('-')
  return [key.slice(0, i), Number(key.slice(i + 1))]
}

export const tileHeight = (id) => TILE_BY_ID[id]?.h ?? 1

// 旋轉後的佔格:0/180 -> 直向(往下 h 格);90/270 -> 橫向(往右 h 格)。
export function footprint(originKey, h, rot) {
  const [r, c] = parseKey(originKey)
  const ri = ROWS.indexOf(r)
  const ci = c - 1
  const horizontal = rot === 90 || rot === 270
  const cells = []
  for (let k = 0; k < h; k++) {
    cells.push({ ri: horizontal ? ri : ri + k, ci: horizontal ? ci + k : ci })
  }
  return { cells, horizontal, ri, ci }
}
