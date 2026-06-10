// 分段切換控制(組別 / 抽籤模式)。options: [{ value, label }]。
export default function ToggleGroup({ options, value, onChange, size = 'md', className = '' }) {
  return (
    <div className={`tgl ${size === 'sm' ? 'tgl-sm' : ''} ${className}`} role="tablist">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="tab"
          aria-selected={value === opt.value}
          className={`tgl-btn ${value === opt.value ? 'on' : ''}`}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
