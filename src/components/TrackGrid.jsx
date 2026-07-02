import { ROWS, COLS, TOTAL_COLS, FIELD_COLS, END_COLS, TILE_BY_ID, START_PLATE, cellKey, footprint } from '../data/tiles.js'
import Tile from './Tile.jsx'

// 版面欄位(1-based grid column):
//   1          -> 左側列標籤 A-I
//   2          -> 起點區(2 格寬,只收起點板)
//   3 .. 40    -> 38 格(36 場地 + 2 終點區;ci 36 起為終點區)
//   41         -> 右側列標籤 A-I
const FIRST_CELL_COL = 3
const START_COL = 2
const RIGHT_LABEL_COL = FIRST_CELL_COL + TOTAL_COLS // 41

export default function TrackGrid({
  placed,
  startPos,
  bonus,
  groupSeams,
  anim,
  drag,
  hoverCell,
  highlightUid,
  stepByUid,
  onGridCellClick,
  onGridDrop,
  onGridDragOver,
  onGridLeave,
  onTileClick,
  onTileContext,
  onTileDragStart,
  onTileDragEnd,
  onStartCellClick,
  onStartDrop,
  onStartClick,
  onStartContext,
}) {
  const showAll = !anim || anim.all
  const tileVisible = (uid) => showAll || anim.vis.has(uid)
  const startVisible = showAll || anim.startVisible
  return (
    <div
      className="grid-scroll"
      onDragLeave={(e) => {
        // 游標離開整個場地容器 → 清掉落點預覽
        if (onGridLeave && !e.currentTarget.contains(e.relatedTarget)) onGridLeave()
      }}
    >
      <div className="grid">
        {/* 欄號 1-36(終點區不標號) */}
        {COLS.map((c, i) => (
          <div key={`num-${c}`} className="colnum" style={{ gridColumn: FIRST_CELL_COL + i, gridRow: 1 }}>
            {c}
          </div>
        ))}

        {/* 左右列標籤 A-I */}
        {ROWS.map((r, j) => (
          <div key={`ll-${r}`} className="rowlabel" style={{ gridColumn: 1, gridRow: j + 2 }}>
            {r}
          </div>
        ))}
        {ROWS.map((r, j) => (
          <div key={`rl-${r}`} className="rowlabel" style={{ gridColumn: RIGHT_LABEL_COL, gridRow: j + 2 }}>
            {r}
          </div>
        ))}

        {/* 起點區:A-I 每列一格(2 格寬),只收起點板 */}
        {ROWS.map((r, j) => (
          <div
            key={`sz-${r}`}
            className="start-cell"
            aria-label={`起點 ${r}`}
            style={{ gridColumn: START_COL, gridRow: j + 2 }}
            onClick={() => onStartCellClick(r)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              onStartDrop(r, e.dataTransfer.getData('text/plain'))
            }}
          />
        ))}
        <div className="margin-label start" style={{ gridColumn: START_COL, gridRow: '2 / span 9' }}>
          <span>起</span>
          <span>點</span>
        </div>

        {/* 38 欄底格(36 場地 + 2 終點區) */}
        {ROWS.map((r, j) =>
          Array.from({ length: TOTAL_COLS }, (_, i) => {
            const key = cellKey(r, i + 1)
            const isEndZone = i >= FIELD_COLS
            return (
              <button
                key={key}
                type="button"
                className={`cell ${isEndZone ? 'end-cell' : ''}`}
                aria-label={`格 ${r}${i + 1}`}
                style={{
                  gridColumn: FIRST_CELL_COL + i,
                  gridRow: j + 2,
                  ...(i === FIELD_COLS ? { borderLeft: '2px solid #9ca3af' } : {}),
                }}
                onClick={() => onGridCellClick(key)}
                onDragOver={(e) => {
                  e.preventDefault()
                  onGridDragOver(key)
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  onGridDrop(key, e.dataTransfer.getData('text/plain'))
                }}
              />
            )
          })
        )}

        {/* 終點 直書標籤(不擋拖放) */}
        <div
          className="margin-label end"
          style={{ gridColumn: `${FIRST_CELL_COL + FIELD_COLS} / span ${END_COLS}`, gridRow: '2 / span 9' }}
        >
          <span>終</span>
          <span>點</span>
        </div>

        {/* 加分點標記(在板子上層,環圈可透視) */}
        {(bonus || []).map((b) => (
          <div
            key={`bp-${b.col}`}
            className="bonus-dot"
            style={{ gridColumn: FIRST_CELL_COL + (b.col - 1), gridRow: ROWS.indexOf(b.row) + 2 }}
          >
            <span />
          </div>
        ))}

        {/* 每組結束的紅槓:畫在「該組最後一片」的出口邊上 */}
        {(groupSeams || []).map((s, i) => (
          <div
            key={`seam-${i}`}
            className={`group-seam side-${s.side}`}
            style={{ gridColumn: FIRST_CELL_COL + s.ci, gridRow: s.ri + 2 }}
            title={`第 ${i + 1} 組結束`}
          />
        ))}

        {/* 已放置的軌道板(uid 為鍵;可壓板,後放的在上層) */}
        {Object.entries(placed).map(([uid, { origin, id, rot }], idx) => {
          const isHi = uid === highlightUid
          if (!tileVisible(uid) && !isHi) return null // 動畫:還沒輪到就先不顯示(高亮的一律顯示)
          const tile = TILE_BY_ID[id]
          const { ri, ci, horizontal } = footprint(origin, tile.h, rot)
          const rowSpan = horizontal ? 1 : tile.h
          const colSpan = horizontal ? tile.h : 1
          const step = stepByUid ? stepByUid[uid] : null
          return (
            <div
              key={uid}
              className={`tile-overlay appear ${isHi ? 'is-highlight' : ''}`}
              draggable
              style={{
                gridColumn: `${FIRST_CELL_COL + ci} / span ${colSpan}`,
                gridRow: `${ri + 2} / span ${rowSpan}`,
                zIndex: isHi ? 40 : 2 + idx,
              }}
              onDragStart={(e) => {
                e.dataTransfer.setData('text/plain', `move:track:${uid}`)
                e.dataTransfer.effectAllowed = 'move'
                onTileDragStart(uid)
              }}
              onDragEnd={(e) => {
                // 拖出地圖(沒有落在任何格子上)→ 自動移除;一律清掉預覽
                onTileDragEnd(uid, e.dataTransfer.dropEffect === 'none')
              }}
              onClick={() => onTileClick(uid)}
              onContextMenu={(e) => {
                e.preventDefault()
                onTileContext(uid)
              }}
              title="拖曳搬移(拖出地圖即移除)/ 左鍵旋轉 / 右鍵移除"
            >
              <div
                className="tile-rot"
                style={{ '--th': tile.h, transform: `rotate(${rot}deg)` }}
              >
                <Tile tile={tile} />
              </div>
              {isHi && step != null && <span className="tile-step">{step}</span>}
            </div>
          )
        })}

        {/* 已放置的起點板(起點區,橫放佔 1 列) */}
        {startPos && startVisible && (
          <div
            className="tile-overlay start-overlay appear"
            draggable
            style={{
              gridColumn: START_COL,
              gridRow: `${ROWS.indexOf(startPos.row) + 2} / span 1`,
            }}
            onDragStart={(e) => {
              e.dataTransfer.setData('text/plain', 'move:start')
              e.dataTransfer.effectAllowed = 'move'
            }}
            onClick={onStartClick}
            onContextMenu={(e) => {
              e.preventDefault()
              onStartContext()
            }}
            title="拖曳換列 / 左鍵翻轉 / 右鍵移除"
          >
            <div
              className="tile-rot"
              style={{ '--th': START_PLATE.h, transform: `rotate(${startPos.rot}deg)` }}
            >
              <Tile tile={START_PLATE} />
            </div>
          </div>
        )}

        {/* 拖曳落點預覽:吸附到游標所在格,顯示板子會放到哪裡(綠=可放,紅=超出場地) */}
        {drag &&
          hoverCell &&
          TILE_BY_ID[drag.id] &&
          (() => {
            const tile = TILE_BY_ID[drag.id]
            const { ri, ci, horizontal } = footprint(hoverCell, tile.h, drag.rot)
            const rowSpan = horizontal ? 1 : tile.h
            const colSpan = horizontal ? tile.h : 1
            const inBounds = ri + rowSpan <= ROWS.length && ci + colSpan <= TOTAL_COLS
            if (!inBounds) {
              // 放不下:只在游標格標紅框,不畫出超出格線的板子
              return (
                <div
                  className="tile-overlay tile-ghost bad"
                  style={{ gridColumn: FIRST_CELL_COL + ci, gridRow: ri + 2, zIndex: 50 }}
                />
              )
            }
            return (
              <div
                className="tile-overlay tile-ghost ok"
                style={{
                  gridColumn: `${FIRST_CELL_COL + ci} / span ${colSpan}`,
                  gridRow: `${ri + 2} / span ${rowSpan}`,
                  zIndex: 50,
                }}
              >
                <div
                  className="tile-rot"
                  style={{ '--th': tile.h, transform: `rotate(${drag.rot}deg)` }}
                >
                  <Tile tile={tile} />
                </div>
              </div>
            )
          })()}
      </div>
    </div>
  )
}
