const CIRCLED = (n) => String.fromCodePoint(0x2460 + n - 1) // ①..⑨(直放板子)

// 策略路線:橫向 step rail。板子=深色方塊;直放板=外框方塊;S 板出向=橘色標籤。
// rounds: 二維陣列,每個 round 是一串 token {id, vertical, sEntry?, sExit?}。
export default function StrategySequence({ rounds }) {
  if (!rounds || rounds.length === 0) return null
  return (
    <section className="rail">
      <div className="section-head">
        <h2 className="section-title">策略路線</h2>
        <span className="section-hint">板子放置順序與 S 板進出方向</span>
      </div>
      <div className="rail-track">
        {rounds.map((round, i) => (
          <div key={i} className="rail-group">
            {i > 0 && <span className="rail-split" aria-hidden="true" />}
            {round.map((u, j) => (
              <div key={j} className="rail-node">
                {(i > 0 || j > 0) && (
                  <span className="rail-arrow" aria-hidden="true">
                    ›
                  </span>
                )}
                {u.id === 'S' ? (
                  <span className="step step-dir">
                    {u.sEntry && u.sExit ? `${u.sEntry}→${u.sExit}` : 'S'}
                  </span>
                ) : (
                  <span className={`step step-tile ${u.vertical ? 'is-vertical' : ''}`}>
                    {u.vertical ? CIRCLED(u.id) : u.id}
                  </span>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  )
}
