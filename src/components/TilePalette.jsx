import { TILES, START_PLATE, S_TILE } from '../data/tiles.js'
import Tile from './Tile.jsx'

// 板子縮圖每格高度 = CSS 變數 --gu(隨根字級自適應);N 格高 => calc(var(--gu) * N)
const glyphHeight = (h) => `calc(var(--gu) * ${h})`

// 下方工具列:起點板 + 1-9 + S板 + 清除。
// tileStatus[id]:'ok'(可用)/'used'(本輪已放)/'buffer'(緩衝中)/'out'(不在手牌)。
// 起點板與 S 板不參加抽籤,永遠可用。
export default function TilePalette({ selected, onSelect, tileStatus, brushRot, showS = true, sUsed = false, onDragTile, onDragTileEnd }) {
  const renderItem = (tile) => {
    const id = tile.id
    // 起點板永遠可用;S 板每回合限放一次(放過就標「已用」);數字片看 tileStatus
    const status = id === 'start' ? 'ok' : id === 'S' ? (sUsed ? 'used' : 'ok') : tileStatus[id]
    const usable = status === 'ok'
    const isSel = selected === id
    return (
      <button
        type="button"
        key={id}
        className={`palette-item ${isSel ? 'sel' : ''} ${usable ? '' : 'disabled'}`}
        disabled={!usable}
        draggable={usable}
        onDragStart={(e) => {
          e.dataTransfer.setData('text/plain', String(id))
          e.dataTransfer.effectAllowed = 'copy'
          onSelect(id)
          if (id !== 'start' && id !== 'erase' && onDragTile) onDragTile(id)
        }}
        onDragEnd={() => onDragTileEnd && onDragTileEnd()}
        onClick={() => usable && onSelect(id)}
      >
        <div className="palette-glyph" style={{ height: glyphHeight(tile.h) }}>
          <Tile tile={tile} />
          {isSel && brushRot && usable ? <span className="rot-badge">↻{brushRot}°</span> : null}
          {status === 'used' ? <span className="used-badge">已用</span> : null}
          {status === 'buffer' ? <span className="used-badge buffer">緩衝</span> : null}
        </div>
        <span className="palette-label">{tile.label}</span>
      </button>
    )
  }

  return (
    <div className="palette">
      <div className="tray-group">{renderItem(START_PLATE)}</div>
      <span className="tray-div" aria-hidden="true" />
      <div className="tray-group">{TILES.map(renderItem)}</div>
      {showS && (
        <>
          <span className="tray-div" aria-hidden="true" />
          <div className="tray-group">{renderItem(S_TILE)}</div>
        </>
      )}
    </div>
  )
}
