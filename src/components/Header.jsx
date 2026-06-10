import Badge from './ui/Badge.jsx'

// 頂部標題列:左產品名 + 副標,右側即時狀態 Badge(組別 / 規則 / 模式 / 激進 / 規劃就緒)。
export default function Header({ group, groupRule, mode, aggressive, ready }) {
  return (
    <header className="app-header">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true">
          <svg viewBox="0 0 32 32" width="22" height="22">
            <rect width="32" height="32" rx="8" fill="#111827" />
            <path
              d="M8 7V14a4 4 0 0 0 4 4h8a4 4 0 0 1 4 4v3"
              fill="none"
              stroke="#fff"
              strokeWidth="3.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="8" cy="7" r="3" fill="#16A34A" />
            <circle cx="24" cy="26" r="3" fill="#EF4444" />
          </svg>
        </span>
        <div className="brand-text">
          <h1 className="brand-title">競賽路線規劃器</h1>
          <p className="brand-sub">自動抽籤、加分點配置與最佳路線策略</p>
        </div>
      </div>

      <div className="header-status">
        <Badge tone="dark">{group}組</Badge>
        <Badge tone="neutral">{groupRule}</Badge>
        <Badge tone={mode === 'manual' ? 'info' : 'neutral'}>
          {mode === 'manual' ? '手動輸入' : '抽籤模式'}
        </Badge>
        {aggressive && (
          <Badge tone="warning" dot>
            激進模式
          </Badge>
        )}
        <Badge tone={ready ? 'primary' : 'neutral'} dot>
          自動規劃{ready ? '：就緒' : '：待選板'}
        </Badge>
      </div>
    </header>
  )
}
