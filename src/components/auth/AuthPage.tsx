import type { GistCandidate } from '../../api/gist'
import type { AccountInitializationResult } from '../../services/accountInitialization'
import type { User } from '../../types'
import { useState } from 'react'
import { initializeAccount } from '../../services/accountInitialization'
import { useAuthStore } from '../../stores/authStore'
import { CheckIcon, SpinnerIcon } from '../shared/Icons'

type PendingSelection = Extract<AccountInitializationResult, { kind: 'choose' }>

interface AuthPageProps {
  pendingSelection?: PendingSelection | null
  initialError?: string
}

function getCandidateSummary(candidate: GistCandidate): string {
  try {
    const meta = JSON.parse(candidate.files['meta.json'])
    return `${meta.total_starred ?? 0} Stars · 更新于 ${new Date(candidate.updatedAt).toLocaleDateString()}`
  }
  catch {
    return candidate.updatedAt
  }
}

export function AuthPage({ pendingSelection, initialError = '' }: AuthPageProps) {
  const storedPat = useAuthStore(s => s.pat)
  const [inputPat, setInputPat] = useState(storedPat)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState(initialError)
  const [validUser, setValidUser] = useState<User | null>(pendingSelection?.user ?? null)
  const [candidates, setCandidates] = useState<GistCandidate[]>(pendingSelection?.candidates ?? [])

  const handleInitialize = async (candidateId?: string) => {
    if (!inputPat.trim())
      return
    setBusy(true)
    setError('')
    try {
      const result = await initializeAccount(inputPat, { candidateId, onStatus: setStatus })
      if (result.kind === 'choose') {
        setValidUser(result.user)
        setCandidates(result.candidates)
      }
    }
    catch (err) {
      setError(err instanceof Error ? err.message : '初始化失败，请重试')
    }
    finally {
      setBusy(false)
      setStatus('')
    }
  }

  return (
    <div className="flex h-screen items-center justify-center bg-white dark:bg-gh-canvas">
      <div className="w-[420px] max-w-[calc(100vw-32px)] border border-gh-border rounded-xl shadow-md p-7 bg-white dark:bg-gh-canvas">
        <div className="text-center mb-6">
          <svg className="mx-auto mb-3" width="40" height="40" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.87-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z" />
          </svg>
          <h1 className="text-xl font-semibold text-gh-fg">GitHub Star Manager</h1>
          <p className="text-xs text-gh-fg-muted mt-1">管理你的 GitHub Star 仓库</p>
        </div>

        {candidates.length > 1 && validUser
          ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-gh-canvas rounded-lg border border-gh-border-muted">
                  <img src={validUser.avatar_url} alt="" className="w-10 h-10 rounded-full border border-gh-border" />
                  <div>
                    <p className="text-sm font-medium text-gh-fg">{validUser.name || validUser.login}</p>
                    <p className="text-xs text-gh-fg-muted">检测到多个 GitStars Gist，请选择一个</p>
                  </div>
                </div>
                {candidates.map(candidate => (
                  <button
                    key={candidate.id}
                    type="button"
                    disabled={busy}
                    onClick={() => handleInitialize(candidate.id)}
                    className="w-full text-left border border-gh-border rounded-lg p-3 hover:border-gh-accent transition-colors disabled:opacity-60"
                  >
                    <code className="block text-xs text-gh-accent mb-1">{candidate.id}</code>
                    <span className="text-xs text-gh-fg-muted">{getCandidateSummary(candidate)}</span>
                  </button>
                ))}
                <button type="button" className="w-full text-xs text-gh-fg-muted" onClick={() => setCandidates([])}>
                  使用其他 PAT
                </button>
              </div>
            )
          : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gh-fg mb-1.5">Personal Access Token</label>
                  <input
                    type="password"
                    className="gh-input text-sm"
                    placeholder="输入你的 PAT"
                    value={inputPat}
                    onChange={e => setInputPat(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleInitialize()}
                    disabled={busy}
                    autoFocus
                  />
                </div>
                <div className="bg-gh-canvas rounded-lg border border-gh-border-muted p-3 text-xs text-gh-fg-muted space-y-1.5">
                  <p className="font-medium text-gh-fg mb-1">所需权限</p>
                  {[
                    ['read:user', '读取账号信息'],
                    ['public_repo', '读取 Star 列表'],
                    ['gist', '读写数据存储'],
                  ].map(([scope, label]) => (
                    <div key={scope} className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 rounded-full bg-gh-success flex items-center justify-center text-white"><CheckIcon /></span>
                      <span>
                        <code className="bg-gh-canvas-subtle px-1 rounded text-[11px]">{scope}</code>
                        {' '}
                        {label}
                      </span>
                    </div>
                  ))}
                </div>
                {error && <div className="text-xs text-gh-danger bg-gh-danger-subtle rounded-lg border border-gh-danger/20 p-3">{error}</div>}
                <button
                  type="button"
                  onClick={() => handleInitialize()}
                  disabled={busy || !inputPat.trim()}
                  className="gh-btn gh-btn-primary w-full justify-center"
                  style={{ minHeight: 36 }}
                >
                  {busy
                    ? (
                        <span className="flex items-center gap-2">
                          <SpinnerIcon />
                          {status || '初始化中...'}
                        </span>
                      )
                    : '验证并进入'}
                </button>
              </div>
            )}
      </div>
    </div>
  )
}
