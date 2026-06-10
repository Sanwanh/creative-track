import Button from './ui/Button.jsx'

// 產品頂欄:左側品牌,右側主要動作(自動規劃)+ 次要動作(清空場地)。
export default function Header({ ready, onAutoPlan, onClear }) {
  return (
    <header className="app-bar">
      <div className="app-bar-inner">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 32 32" width="20" height="20">
              <rect width="32" height="32" rx="8" fill="#16181d" />
              <path
                d="M8 7V14a4 4 0 0 0 4 4h8a4 4 0 0 1 4 4v3"
                fill="none"
                stroke="#fff"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="8" cy="7" r="2.6" fill="#16a34a" />
              <circle cx="24" cy="26" r="2.6" fill="#ef4444" />
            </svg>
          </span>
          <div className="brand-text">
            <h1 className="brand-title">競賽路線規劃器</h1>
            <p className="brand-sub">自動抽籤、加分點配置與最佳路線策略</p>
          </div>
        </div>

        <div className="app-bar-actions">
          <Button variant="ghost" className="act-clear" onClick={onClear}>
            清空場地
          </Button>
          <Button variant="primary" disabled={!ready} onClick={onAutoPlan}>
            自動規劃
          </Button>
        </div>
      </div>
    </header>
  )
}
