import { useUiStore } from '../../stores/uiStore'

export function ThemeToggle() {
  const theme = useUiStore(s => s.theme)
  const setTheme = useUiStore(s => s.setTheme)

  const options: { value: 'system' | 'light' | 'dark', label: string }[] = [
    { value: 'system', label: '🌓 跟随系统' },
    { value: 'light', label: '☀️ 浅色' },
    { value: 'dark', label: '🌙 深色' },
  ]

  return (
    <div className="px-3 py-1.5">
      <div className="flex flex-col gap-1">
        {options.map(opt => (
          <button
            key={opt.value}
            onClick={() => setTheme(opt.value)}
            className={`w-full flex items-center gap-2 px-2 py-1 text-xs rounded transition-colors text-left ${theme === opt.value ? 'bg-gh-accent/10 text-gh-accent font-medium' : 'text-gh-fg-muted hover:text-gh-fg hover:bg-gh-canvas'}`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}
