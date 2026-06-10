// 控制台中的一個區段(有小標題的工具欄分區),非厚重卡片。
export default function ToolbarSection({ title, hint, className = '', children }) {
  return (
    <section className={`tbsec ${className}`}>
      <div className="tbsec-head">
        <span className="tbsec-title">{title}</span>
        {hint && <span className="tbsec-hint">{hint}</span>}
      </div>
      <div className="tbsec-body">{children}</div>
    </section>
  )
}
