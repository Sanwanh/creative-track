import Card from './ui/Card.jsx'

const CIRCLED = (n) => String.fromCodePoint(0x2460 + n - 1) // ①..⑨(直放板子)

// 策略路線:把放置順序畫成橫向 Stepper。
// 板子=深色小卡(直放者加圈/外框);S 板的進出方向=橘色小卡;箭頭=淡灰。
// rounds: 二維陣列,每個 round 是一串 token {id, vertical, sEntry?, sExit?}。
export default function StrategySequence({ rounds }) {
  if (!rounds || rounds.length === 0) return null
  return (
    <Card title="策略路線" subtitle="板子放置順序與 S 板進出方向" className="strategy-card" bodyClass="strategy-body">
      <div className="strategy">
        {rounds.map((round, i) => (
          <span key={i} className="strat-round">
            {round.map((u, j) => (
              <span key={j} className="strat-step">
                {(i > 0 || j > 0) && (
                  <span className="strat-arrow" aria-hidden="true">
                    →
                  </span>
                )}
                {u.id === 'S' ? (
                  <span className="chip chip-dir">
                    {u.sEntry && u.sExit ? `${u.sEntry}進${u.sExit}出` : 'S'}
                  </span>
                ) : (
                  <span className={`chip chip-tile ${u.vertical ? 'is-vertical' : ''}`}>
                    {u.vertical ? CIRCLED(u.id) : u.id}
                  </span>
                )}
              </span>
            ))}
          </span>
        ))}
      </div>
    </Card>
  )
}
