import type { AccountInitializationResult } from './services/accountInitialization'
import { useEffect, useState } from 'react'
import { AuthPage } from './components/auth/AuthPage'
import AppShell from './components/layout/AppShell'
import { initializeAccount } from './services/accountInitialization'
import { useAuthStore } from './stores/authStore'

type PendingSelection = Extract<AccountInitializationResult, { kind: 'choose' }>

export default function App() {
  const isAuth = useAuthStore(s => s.isAuth)
  const checking = useAuthStore(s => s.checking)
  const setCheckingDone = useAuthStore(s => s.setCheckingDone)
  const [status, setStatus] = useState('验证登录状态...')
  const [pendingSelection, setPendingSelection] = useState<PendingSelection | null>(null)
  const [startupError, setStartupError] = useState('')

  useEffect(() => {
    if (isAuth)
      return
    const storedPat = localStorage.getItem('github_star_manager_pat')
    const storedGistId = localStorage.getItem('github_star_manager_gist_id')

    if (!storedPat) {
      setCheckingDone()
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        const result = await initializeAccount(storedPat, {
          preferredGistId: storedGistId,
          onStatus: message => !cancelled && setStatus(message),
        })
        if (!cancelled && result.kind === 'choose') {
          setPendingSelection(result)
          setCheckingDone()
        }
      }
      catch (err) {
        if (!cancelled) {
          setStartupError(err instanceof Error ? err.message : '初始化失败，请重试')
          setCheckingDone()
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [isAuth, setCheckingDone])

  if (checking) {
    return (
      <div className="flex h-screen items-center justify-center bg-white dark:bg-gh-canvas">
        <div className="flex items-center gap-2 text-sm text-gh-fg-muted">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="animate-spin">
            <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeDasharray="28" strokeLinecap="round" />
          </svg>
          {status}
        </div>
      </div>
    )
  }

  if (!isAuth)
    return <AuthPage pendingSelection={pendingSelection} initialError={startupError} />

  return <AppShell />
}
