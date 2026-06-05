import type { User } from '../../types'
import { useState } from 'react'
import { createGist } from '../../api/gist'
import { getUser } from '../../api/github'
import { useAuthStore } from '../../stores/authStore'
import { CheckIcon, SpinnerIcon } from '../shared/Icons'

export function AuthPage() {
  const login = useAuthStore(s => s.login)
  const setGistId = useAuthStore(s => s.setGistId)
  const pat = useAuthStore(s => s.pat)
  const gistId = useAuthStore(s => s.gistId)

  const [inputPat, setInputPat] = useState(pat)
  const [validating, setValidating] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [validUser, setValidUser] = useState<User | null>(null)
  const [step, setStep] = useState<'pat' | 'gist'>(pat ? 'gist' : 'pat')
  const [validated, setValidated] = useState(false)

  const handleValidate = async () => {
    if (!inputPat.trim())
      return
    setValidating(true)
    setError('')
    setValidated(false)
    try {
      const user = await getUser(inputPat.trim())
      setValidUser(user)
      setValidated(true)
      setTimeout(setStep, 400, 'gist')
    }
    catch {
      setError('PAT 无效，请检查是否包含 read:user 权限')
    }
    finally {
      setValidating(false)
    }
  }

  const handleCreateGist = async () => {
    if (!validUser)
      return
    setCreating(true)
    setError('')
    try {
      const id = await createGist(inputPat.trim())
      setGistId(id)
      login(inputPat.trim(), validUser)
    }
    catch {
      setError('创建 Gist 失败，请检查 PAT 是否包含 gist 权限')
    }
    finally {
      setCreating(false)
    }
  }

  const handleUseExisting = () => {
    if (!validUser)
      return
    login(inputPat.trim(), validUser)
  }

  return (
    <div className="flex h-screen items-center justify-center bg-white dark:bg-gh-canvas">
      <div className="w-[400px] max-w-[calc(100vw-32px)] border border-gh-border rounded-xl shadow-md p-7 bg-white dark:bg-gh-canvas">
        <div className="text-center mb-6">
          <svg
            className="mx-auto mb-3"
            width="40"
            height="40"
            viewBox="0 0 16 16"
            fill="currentColor"
            style={{ color: '#1f2328' }}
          >
            <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.87-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z" />
          </svg>
          <h1 className="text-xl font-semibold text-gh-fg">GitHub Star Manager</h1>
          <p className="text-xs text-gh-fg-muted mt-1">管理你的 GitHub Star 仓库</p>
        </div>

        {step === 'pat' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gh-fg mb-1.5">Personal Access Token</label>
              <input
                type="password"
                className="gh-input text-sm"
                placeholder="输入你的 PAT"
                value={inputPat}
                onChange={e => setInputPat(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleValidate()}
                autoFocus
              />
            </div>
            <div className="bg-gh-canvas rounded-lg border border-gh-border-muted p-3 text-xs text-gh-fg-muted space-y-1">
              <p className="font-medium text-gh-fg mb-1.5">所需权限</p>
              <div className="flex items-center gap-2">
                <span className="flex-shrink-0 w-3.5 h-3.5 rounded-full bg-gh-success flex items-center justify-center text-white">
                  <CheckIcon />
                </span>
                <span>
                  <code className="bg-gh-canvas-subtle px-1 rounded text-[11px]">read:user</code>
                  {' '}
                  读取账号信息
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex-shrink-0 w-3.5 h-3.5 rounded-full bg-gh-success flex items-center justify-center text-white">
                  <CheckIcon />
                </span>
                <span>
                  <code className="bg-gh-canvas-subtle px-1 rounded text-[11px]">public_repo</code>
                  {' '}
                  读取 Star 列表
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex-shrink-0 w-3.5 h-3.5 rounded-full bg-gh-success flex items-center justify-center text-white">
                  <CheckIcon />
                </span>
                <span>
                  <code className="bg-gh-canvas-subtle px-1 rounded text-[11px]">gist</code>
                  {' '}
                  读写数据存储
                </span>
              </div>
            </div>
            {error && (
              <div className="flex items-start gap-2 text-xs text-gh-danger bg-gh-danger-subtle rounded-lg border border-gh-danger/20 p-3">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" className="flex-shrink-0 mt-0.5">
                  <path d="M6.457 1.047c.659-1.234 2.427-1.234 3.086 0l6.082 11.378A1.75 1.75 0 0 1 14.082 15H1.918a1.75 1.75 0 0 1-1.543-2.575Zm1.763.707a.25.25 0 0 0-.44 0L1.698 13.132a.25.25 0 0 0 .22.368h12.164a.25.25 0 0 0 .22-.368Zm.53 3.996v2.5a.75.75 0 0 1-1.5 0v-2.5a.75.75 0 0 1 1.5 0ZM9 11a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z" />
                </svg>
                <span>{error}</span>
              </div>
            )}
            <button
              onClick={handleValidate}
              disabled={validating || !inputPat.trim()}
              className="gh-btn gh-btn-primary w-full justify-center"
              style={{ minHeight: 36 }}
            >
              {validating
                ? (
                    <span className="flex items-center gap-2">
                      <SpinnerIcon />
                      验证中...
                    </span>
                  )
                : validated
                  ? (
                      <span className="flex items-center gap-2">
                        <CheckIcon />
                        已验证
                      </span>
                    )
                  : '验证 PAT'}
            </button>
          </div>
        )}

        {step === 'gist' && validUser && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-gh-canvas rounded-lg border border-gh-border-muted">
              <img src={validUser.avatar_url} alt="" className="w-10 h-10 rounded-full border border-gh-border" />
              <div>
                <p className="text-sm font-medium text-gh-fg">{validUser.name || validUser.login}</p>
                <p className="text-xs text-gh-fg-muted">{validUser.login}</p>
              </div>
            </div>

            {gistId && (
              <div className="flex items-center justify-between text-xs bg-gh-canvas rounded-lg border border-gh-border-muted p-3">
                <span className="text-gh-fg-muted">已有 Gist</span>
                <code className="text-gh-accent">{gistId}</code>
              </div>
            )}

            {!gistId && (
              <>
                <p className="text-xs text-gh-fg-muted leading-relaxed">
                  将自动创建一个私有 Gist 来存储你的标签和备注数据。
                </p>
                {error && (
                  <div className="flex items-start gap-2 text-xs text-gh-danger bg-gh-danger-subtle rounded-lg border border-gh-danger/20 p-3">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" className="flex-shrink-0 mt-0.5">
                      <path d="M6.457 1.047c.659-1.234 2.427-1.234 3.086 0l6.082 11.378A1.75 1.75 0 0 1 14.082 15H1.918a1.75 1.75 0 0 1-1.543-2.575Zm1.763.707a.25.25 0 0 0-.44 0L1.698 13.132a.25.25 0 0 0 .22.368h12.164a.25.25 0 0 0 .22-.368Zm.53 3.996v2.5a.75.75 0 0 1-1.5 0v-2.5a.75.75 0 0 1 1.5 0ZM9 11a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z" />
                    </svg>
                    <span>{error}</span>
                  </div>
                )}
                <button
                  onClick={handleCreateGist}
                  disabled={creating}
                  className="gh-btn gh-btn-primary w-full justify-center"
                  style={{ minHeight: 36 }}
                >
                  {creating
                    ? (
                        <span className="flex items-center gap-2">
                          <SpinnerIcon />
                          创建中...
                        </span>
                      )
                    : '创建 Gist 并进入'}
                </button>
                <button
                  onClick={handleUseExisting}
                  className="w-full text-xs text-gh-fg-muted hover:text-gh-accent text-center transition-colors"
                >
                  已有 Gist？跳过创建直接进入
                </button>
              </>
            )}

            {gistId && (
              <button
                onClick={handleUseExisting}
                className="gh-btn gh-btn-primary w-full justify-center"
                style={{ minHeight: 36 }}
              >
                进入应用
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
