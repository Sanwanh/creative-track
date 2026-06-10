// 統一按鈕。variant: primary | outline | danger | warning | ghost。
// active=true 顯示明確的啟用背景;size="sm" 為較小尺寸。
export default function Button({
  variant = 'outline',
  size = 'md',
  active = false,
  className = '',
  children,
  ...rest
}) {
  const cls = [
    'btn',
    `btn-${variant}`,
    size === 'sm' ? 'btn-sm' : '',
    active ? 'is-active' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')
  return (
    <button type="button" className={cls} {...rest}>
      {children}
    </button>
  )
}
