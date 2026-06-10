// 地圖圖例(對應實際視覺):路線、加分點、S 板、起點區、終點區、分組線。
const ITEMS = [
  { cls: 'lg-path', label: '路線' },
  { cls: 'lg-bonus', label: '加分點' },
  { cls: 'lg-s', label: 'S 板' },
  { cls: 'lg-start', label: '起點' },
  { cls: 'lg-end', label: '終點' },
  { cls: 'lg-seam', label: '分組線' },
]

export default function Legend() {
  return (
    <div className="legend">
      {ITEMS.map((it) => (
        <span key={it.label} className="legend-item">
          <span className={`legend-swatch ${it.cls}`} />
          {it.label}
        </span>
      ))}
    </div>
  )
}
