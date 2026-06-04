import { useUiStore } from '../../stores/uiStore'

export function ThemeToggle() {
  const theme = useUiStore(s => s.theme)
  const setTheme = useUiStore(s => s.setTheme)

  const options: { value: 'system' | 'light' | 'dark', label: string }[] = [
    { value: 'system', label: '🌓' },
    { value: 'light', label: '☀️' },
    { value: 'dark', label: '🌙' },
  ]

  return (
    <div className="flex items-center">
      {options.map((opt, i) => (
        <button
          key={opt.value}
          onClick={() => setTheme(opt.value)}
          className={`flex items-center justify-center px-2 py-1 text-xs transition-colors ${
            i === 0 ? 'rounded-l-md' : i === options.length - 1 ? 'rounded-r-md' : ''
          } ${
            theme === opt.value
              ? 'bg-gh-accent/10 text-gh-accent font-medium'
              : 'text-gh-fg-muted hover:text-gh-fg hover:bg-gh-canvas'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
