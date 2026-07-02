import { useState } from 'react'

const CIRCLED = (n) => String.fromCodePoint(0x2460 + n - 1) // ①..⑨(直放板子)

// 策略路線:橫向 step rail。板子=深色方塊;直放板=外框方塊;S 板出向=橘色標籤。
// rounds: 二維陣列,每個 round 是一串 token {uid, id, vertical, sEntry?, sExit?}。
// onReorder(fromUid, toUid, before):拖曳某片到另一片前/後 → 由上層重排放置順序。
// onHover(uid|null):滑過/拖曳某片時,通知上層在地圖高亮對應板子(讓你看到板子在哪、怎麼走)。
export default function StrategySequence({ rounds, onReorder, onHover }) {
  const [over, setOver] = useState(null) // 拖曳落點提示 { uid, before }
  if (!rounds || rounds.length === 0) return null
  const draggable = typeof onReorder === 'function'
  const hover = (uid) => onHover && onHover(uid)

  const dropSide = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    return e.clientX < rect.left + rect.width / 2 // true=放在左(前)
  }
  const onDragStart = (e, uid) => {
    e.dataTransfer.setData('text/plain', uid)
    e.dataTransfer.effectAllowed = 'move'
  }
  const onDragOver = (e, uid) => {
    e.preventDefault()
    setOver({ uid, before: dropSide(e) })
  }
  const onDrop = (e, uid) => {
    e.preventDefault()
    const from = e.dataTransfer.getData('text/plain')
    const before = dropSide(e)
    setOver(null)
    if (from) onReorder(from, uid, before)
  }

  return (
    <section className="rail">
      <div className="section-head">
        <h2 className="section-title">策略路線</h2>
        <span className="section-hint">
          {draggable ? '板子放置順序 · 可拖曳調整順序' : '板子放置順序與 S 板進出方向'}
        </span>
      </div>
      <div className="rail-track" onDragLeave={() => setOver(null)}>
        {rounds.map((round, i) => (
          <div key={i} className="rail-group">
            {i > 0 && <span className="rail-split" aria-hidden="true" />}
            {round.map((u, j) => {
              const isS = u.id === 'S'
              const dropCue = over && over.uid === u.uid ? (over.before ? 'drop-before' : 'drop-after') : ''
              return (
                <div key={u.uid ?? j} className="rail-node">
                  {(i > 0 || j > 0) && (
                    <span className="rail-arrow" aria-hidden="true">
                      ›
                    </span>
                  )}
                  <span
                    className={`step ${isS ? 'step-dir' : `step-tile ${u.vertical ? 'is-vertical' : ''}`} ${draggable ? 'is-draggable' : ''} ${dropCue}`}
                    draggable={draggable || undefined}
                    onDragStart={draggable ? (e) => { hover(u.uid); onDragStart(e, u.uid) } : undefined}
                    onDragOver={draggable ? (e) => onDragOver(e, u.uid) : undefined}
                    onDrop={draggable ? (e) => { onDrop(e, u.uid); hover(null) } : undefined}
                    onDragEnd={draggable ? () => hover(null) : undefined}
                    onMouseEnter={() => hover(u.uid)}
                    onMouseLeave={() => hover(null)}
                    title={draggable ? '滑過看板子位置 · 拖曳可調整順序' : '滑過看板子位置'}
                  >
                    {isS ? (u.sEntry && u.sExit ? `${u.sEntry}→${u.sExit}` : 'S') : u.vertical ? CIRCLED(u.id) : u.id}
                  </span>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </section>
  )
}
