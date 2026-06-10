// 卡片容器:白底、圓角、柔和陰影。可選標題與右上角操作區(如 Legend)。
export default function Card({ title, subtitle, action, className = '', bodyClass = '', children }) {
  return (
    <section className={`card ${className}`}>
      {(title || action) && (
        <div className="card-head">
          <div className="card-head-text">
            {title && <h2 className="card-title">{title}</h2>}
            {subtitle && <p className="card-subtitle">{subtitle}</p>}
          </div>
          {action && <div className="card-action">{action}</div>}
        </div>
      )}
      <div className={`card-body ${bodyClass}`}>{children}</div>
    </section>
  )
}
