import { useUiStore } from '../../stores/uiStore'
import { IconButton } from './Button'
import { MoonIcon, SunIcon, SystemThemeIcon } from './Icons'

export function ThemeToggle() {
  const theme = useUiStore(s => s.theme)
  const setTheme = useUiStore(s => s.setTheme)

  const options = [
    { value: 'system' as const, label: '跟随系统', icon: <SystemThemeIcon /> },
    { value: 'light' as const, label: '浅色模式', icon: <SunIcon /> },
    { value: 'dark' as const, label: '深色模式', icon: <MoonIcon /> },
  ]

  return (
    <div className="flex items-center" role="group" aria-label="主题模式">
      {options.map((opt, i) => (
        <IconButton
          key={opt.value}
          label={opt.label}
          onClick={() => setTheme(opt.value)}
          className={`flex items-center justify-center px-2 py-1 text-ui-caption transition-colors ${
            i === 0 ? 'rounded-l-md' : i === options.length - 1 ? 'rounded-r-md' : ''
          } ${
            theme === opt.value
              ? 'bg-gh-accent/10 text-gh-accent font-medium'
              : 'text-gh-fg-muted hover:text-gh-fg hover:bg-gh-canvas'
          }`}
        >
          {opt.icon}
        </IconButton>
      ))}
    </div>
  )
}
