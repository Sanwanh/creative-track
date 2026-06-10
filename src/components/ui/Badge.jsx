// 小型狀態標籤。tone: neutral | primary | warning | danger | info | dark。
// dot=true 在前面加一個小圓點(狀態指示)。
export default function Badge({ tone = 'neutral', dot = false, className = '', children }) {
  return (
    <span className={`badge badge-${tone} ${className}`}>
      {dot && <span className="badge-dot" />}
      {children}
    </span>
  )
}
