import type { User } from '../../types'
import { useState } from 'react'
import { createGist } from '../../api/gist'
import { getUser } from '../../api/github'
import { useAuthStore } from '../../stores/authStore'

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

  const handleValidate = async () => {
    if (!inputPat.trim())
      return
    setValidating(true)
    setError('')
    try {
      const user = await getUser(inputPat.trim())
      setValidUser(user)
      setStep('gist')
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
      <div className="w-[400px] max-w-[calc(100vw-32px)] border border-gh-border rounded-xl shadow-lg p-6 bg-white dark:bg-gh-canvas">
        <div className="text-center mb-6">
          <h1 className="text-lg font-semibold text-gh-fg mb-1">GitHub Star Manager</h1>
          <p className="text-xs text-gh-fg-muted">管理你的 GitHub Star 仓库</p>
        </div>

        {step === 'pat' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gh-fg mb-1.5">GitHub Personal Access Token</label>
              <input
                type="password"
                className="gh-input text-sm"
                placeholder="输入你的 PAT..."
                value={inputPat}
                onChange={e => setInputPat(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleValidate()}
                autoFocus
              />
            </div>
            <div className="text-xs text-gh-fg-muted space-y-1">
              <p>需要以下权限：</p>
              <ul className="list-disc pl-4 space-y-0.5">
                <li>
                  <code className="bg-gh-canvas-subtle px-1 rounded">read:user</code>
                  {' '}
                  — 读取账号信息
                </li>
                <li>
                  <code className="bg-gh-canvas-subtle px-1 rounded">public_repo</code>
                  {' '}
                  — 读取 Star 列表
                </li>
                <li>
                  <code className="bg-gh-canvas-subtle px-1 rounded">gist</code>
                  {' '}
                  — 读写数据存储
                </li>
              </ul>
            </div>
            {error && <p className="text-xs text-gh-danger">{error}</p>}
            <button
              onClick={handleValidate}
              disabled={validating || !inputPat.trim()}
              className="gh-btn gh-btn-primary w-full justify-center"
              style={{ minHeight: 36 }}
            >
              {validating ? '验证中...' : '验证'}
            </button>
          </div>
        )}

        {step === 'gist' && validUser && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-gh-canvas rounded-lg border border-gh-border-muted">
              <img src={validUser.avatar_url} alt="" className="w-10 h-10 rounded-full border border-gh-border" />
              <div>
                <p className="text-sm font-medium text-gh-fg">{validUser.name}</p>
                <p className="text-xs text-gh-fg-muted">{validUser.login}</p>
              </div>
            </div>

            {gistId && (
              <div className="text-xs text-gh-fg-muted">
                已有 Gist ID:
                {' '}
                <code className="text-gh-accent">{gistId}</code>
              </div>
            )}

            {!gistId && (
              <>
                <div className="text-xs text-gh-fg-muted">
                  将自动创建一个私有 Gist 来存储你的标签、备注等数据。
                </div>
                {error && <p className="text-xs text-gh-danger">{error}</p>}
                <button
                  onClick={handleCreateGist}
                  disabled={creating}
                  className="gh-btn gh-btn-primary w-full justify-center"
                  style={{ minHeight: 36 }}
                >
                  {creating ? '创建中...' : '创建 Gist 并进入'}
                </button>
                <button
                  onClick={handleUseExisting}
                  className="w-full text-xs text-gh-fg-muted hover:text-gh-accent text-center"
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
