// 上下文狀態列:label/value 成對、以分隔線區隔,低調不喧賓奪主。
export default function StatusBar({ group, groupRule, mode, ready }) {
  const items = [
    { label: '組別', value: `${group}組` },
    { label: '規則', value: groupRule },
    { label: '模式', value: mode === 'manual' ? '手動輸入' : '抽籤' },
  ]
  return (
    <div className="statusbar">
      {items.map((it) => (
        <span key={it.label} className="status-item">
          <span className="status-label">{it.label}</span>
          <span className="status-value">{it.value}</span>
        </span>
      ))}
      <span className={`status-item status-plan ${ready ? 'is-ready' : ''}`}>
        <span className="status-dot" />
        <span className="status-value">自動規劃{ready ? ' 就緒' : ' 待選板'}</span>
      </span>
    </div>
  )
}
