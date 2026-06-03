import MarkdownIt from 'markdown-it'
import { useEffect, useMemo, useRef, useState } from 'react'
import { getReadme } from '../../api/github'
import { formatStars, getLanguageColor } from '../../lib/utils'
import { useAuthStore } from '../../stores/authStore'
import { useRepoStore } from '../../stores/repoStore'
import { useUiStore } from '../../stores/uiStore'
import { CloseIcon, ExternalIcon, StarIcon } from '../shared/Icons'

let md: MarkdownIt | null = null
let mdInit: Promise<void> | null = null

async function ensureMd(dark: boolean) {
  const theme = dark ? 'github-dark' : 'github-light'

  if (md && (md as any).__shikiTheme === theme)
    return

  mdInit = (async () => {
    const instance = new MarkdownIt({
      html: true,
      linkify: true,
      breaks: true,
    })

    const fence = instance.renderer.rules.fence
    instance.renderer.rules.fence = (tokens, idx, options, env, self) => {
      const token = tokens[idx]
      if (token.info.trim() === 'mermaid') {
        return `<div class="mermaid">${token.content}</div>`
      }
      return fence?.(tokens, idx, options, env, self) ?? ''
    }

    try {
      const shikiPlugin = await (await import('@shikijs/markdown-it')).default({ theme })
      instance.use(shikiPlugin)
    }
    catch {}

    try {
      const katex = (await import('markdown-it-katex')).default
      instance.use(katex)
    }
    catch {}

    ;(instance as any).__shikiTheme = theme
    md = instance
  })()

  await mdInit
}

function resolveRelativePaths(html: string, owner: string, repo: string): string {
  const rawBase = `https://github.com/${owner}/${repo}/raw/main`
  const blobBase = `https://github.com/${owner}/${repo}/blob/main`

  return html
    .replace(/(src=["'])(\.\/)?([^"'#?]+)/g, (m, pre, _dot, path) => {
      if (path.startsWith('http') || path.startsWith('data:'))
        return m
      return `${pre}${rawBase}/${path}`
    })
    .replace(/(href=["'])(\.\/)?([^"'#?]+)/g, (m, pre, _dot, path) => {
      if (path.startsWith('http') || path.startsWith('#') || path.startsWith('mailto:'))
        return m
      return `${pre}${blobBase}/${path}`
    })
}

export function ReadmePanel() {
  const selectedRepoName = useUiStore(s => s.selectedRepo)
  const setSelectedRepo = useUiStore(s => s.setSelectedRepo)
  const theme = useUiStore(s => s.theme)
  const pat = useAuthStore(s => s.pat)
  const repos = useRepoStore(s => s.repos)
  const repo = repos.find(r => r.full_name === selectedRepoName)
  const contentRef = useRef<HTMLDivElement>(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [readmeHtml, setReadmeHtml] = useState('')

  const isDark = useMemo(() => {
    if (theme === 'dark')
      return true
    if (theme === 'light')
      return false
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  }, [theme])

  useEffect(() => {
    if (!repo)
      return

    let cancelled = false

    queueMicrotask(() => {
      if (cancelled)
        return
      setLoading(true)
      setError('')
      setReadmeHtml('')
    })

    const [owner, name] = repo.full_name.split('/')

    ;(async () => {
      try {
        await ensureMd(isDark)
        const raw = await getReadme(pat, owner, name)
        if (cancelled)
          return
        if (!raw) {
          setError('此仓库没有 README 文件')
          return
        }
        const rendered = md!.render(raw)
        if (!cancelled)
          setReadmeHtml(resolveRelativePaths(rendered, owner, name))
      }
      catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : '加载 README 失败')
      }
      finally {
        if (!cancelled)
          setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [repo?.full_name, theme, isDark, pat, repo])

  useEffect(() => {
    if (!readmeHtml || !contentRef.current)
      return

    const initMermaid = async () => {
      if (!contentRef.current!.querySelector('.mermaid'))
        return
      try {
        const mermaid = (await import('mermaid')).default
        mermaid.initialize({
          startOnLoad: false,
          theme: isDark ? 'dark' : 'default',
        })
        await mermaid.run({ nodes: contentRef.current!.querySelectorAll('.mermaid') })
      }
      catch {}
    }

    initMermaid()
  }, [readmeHtml, isDark])

  if (!repo)
    return null

  const handleClose = () => {
    setSelectedRepo(null)
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gh-canvas">
      <div className="flex items-start justify-between p-4 border-b border-gh-border-muted">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-base font-semibold text-gh-accent truncate">{repo.full_name}</h2>
            <a
              href={`https://github.com/${repo.full_name}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-gh-fg-muted hover:text-gh-accent flex-shrink-0"
            >
              在 GitHub 打开
              <ExternalIcon />
            </a>
          </div>
          <div className="flex items-center gap-3 text-xs text-gh-fg-muted flex-wrap">
            <span className="flex items-center gap-0.5">
              <StarIcon filled size={12} />
              {formatStars(repo.stargazers_count)}
            </span>
            {repo.language && (
              <span className="flex items-center gap-1">
                <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: getLanguageColor(repo.language) }} />
                {repo.language}
              </span>
            )}
            <span>
              Updated:
              {repo.updated_at}
            </span>
          </div>
          {repo.description && (
            <p className="text-xs text-gh-fg-muted mt-1.5">{repo.description}</p>
          )}
        </div>
        <button
          onClick={handleClose}
          className="p-2 rounded hover:bg-gh-canvas transition-colors text-gh-fg-muted hover:text-gh-fg ml-2 flex-shrink-0"
          style={{ minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <CloseIcon />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading
          ? (
              <div className="p-6 space-y-3">
                <div className="skeleton h-8 w-2/3" />
                <div className="skeleton h-4 w-full" />
                <div className="skeleton h-4 w-5/6" />
                <div className="skeleton h-4 w-4/6" />
                <div className="h-4" />
                <div className="skeleton h-4 w-full" />
                <div className="skeleton h-4 w-3/4" />
                <div className="skeleton h-24 w-full" />
                <div className="skeleton h-4 w-5/6" />
                <div className="skeleton h-4 w-2/3" />
              </div>
            )
          : error
            ? (
                <div className="flex flex-col items-center justify-center py-16 text-gh-fg-muted">
                  <p className="text-sm">{error}</p>
                </div>
              )
            : (
                <div
                  ref={contentRef}
                  className="p-6 readme-content"
                  style={{ maxWidth: 800 }}
                  dangerouslySetInnerHTML={{ __html: readmeHtml }}
                />
              )}
      </div>
    </div>
  )
}
