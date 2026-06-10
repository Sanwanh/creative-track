import { TRACK_STROKE } from '../data/tiles.js'

// 依設計檔 軌道場地.html 渲染軌道板:
//   一般板:黑底 + 白色軌道線(stroke=15、butt caps、無光暈)。
//   起點板:上黑塊(含白槽)+ 底部白墊。
//   S 板:白線交叉 + 三個紅點 + "S" 字。
// 使用原始 viewBox(vw/vh)+ preserveAspectRatio="none",填滿父層容器。

export default function Tile({ tile }) {
  const vw = tile.vw ?? 100
  const vh = tile.vh ?? 100 * tile.h

  if (tile.startPlate) {
    // viewBox 100×200:黑塊佔上 55%、白槽在 42.5%~57.5%、白墊佔下 43%
    return (
      <svg className="tile-svg" viewBox={`0 0 ${vw} ${vh}`} width="100%" height="100%" preserveAspectRatio="none">
        <rect x="0" y="114" width="100" height="86" rx="2" fill="#fff" stroke="#111" strokeWidth="3" />
        <rect x="0" y="0" width="100" height="110" rx="3" fill="#0c0c0c" />
        <rect x="42.5" y="0" width="15" height="110" fill="#fff" />
      </svg>
    )
  }

  if (tile.junction) {
    // S 板:垂直幹線 + 三個側向出口(直放=上左、中右、下左)、紅點標記
    return (
      <svg className="tile-svg" viewBox={`0 0 ${vw} ${vh}`} width="100%" height="100%" preserveAspectRatio="none">
        <rect x="0" y="0" width={vw} height={vh} fill="#0c0c0c" />
        <path
          d="M50,50 L50,250 M0,50 L50,50 M50,150 L100,150 M0,250 L50,250"
          fill="none"
          stroke="#ffffff"
          strokeWidth={TRACK_STROKE}
          strokeLinecap="butt"
        />
        <circle cx="50" cy="50" r="19" fill="#e8232a" />
        <circle cx="50" cy="150" r="19" fill="#e8232a" />
        <circle cx="50" cy="250" r="19" fill="#e8232a" />
        <text x="78" y="295" fill="#ffffff" fontSize="22" fontWeight="700" fontFamily="Georgia,serif">S</text>
      </svg>
    )
  }

  return (
    <svg className="tile-svg" viewBox={`0 0 ${vw} ${vh}`} width="100%" height="100%" preserveAspectRatio="none">
      <rect x="0" y="0" width={vw} height={vh} fill="#0c0c0c" />
      {tile.d && (
        <path
          d={tile.d}
          fill="none"
          stroke="#ffffff"
          strokeWidth={TRACK_STROKE}
          strokeLinecap="butt"
          strokeLinejoin="round"
        />
      )}
    </svg>
  )
}
