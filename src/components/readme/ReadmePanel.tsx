import { useEffect, useState } from 'react'
import { formatStars, getLanguageColor } from '../../lib/utils'
import { useRepoStore } from '../../stores/repoStore'
import { useUiStore } from '../../stores/uiStore'
import { CloseIcon, ExternalIcon, StarIcon } from '../shared/Icons'

export function ReadmePanel() {
  const selectedRepoName = useUiStore(s => s.selectedRepo)
  const setSelectedRepo = useUiStore(s => s.setSelectedRepo)
  const repos = useRepoStore(s => s.repos)
  const repo = repos.find(r => r.full_name === selectedRepoName)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!repo)
      return

    setLoading(true)
    const t = setTimeout(setLoading, 800, false)
    return () => clearTimeout(t)
  }, [repo?.full_name])

  if (!repo)
    return null

  const handleClose = () => {
    setSelectedRepo(null)
  }

  return (
    <div className="flex flex-col h-full bg-white">
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
          : (
              <div className="p-6 readme-content" style={{ maxWidth: 800 }}>
                <div dangerouslySetInnerHTML={{ __html: MOCK_README_HTML }} />
              </div>
            )}
      </div>
    </div>
  )
}

const MOCK_README_HTML = `
<h1>React</h1>
<p>React is a JavaScript library for building user interfaces.</p>
<h2>Installation</h2>
<pre><code class="language-bash">npm install react react-dom</code></pre>
<h2>Quick Start</h2>
<pre><code class="language-jsx">import { createRoot } from 'react-dom/client';

function App() {
  return &lt;h1&gt;Hello, world!&lt;/h1&gt;;
}

createRoot(document.getElementById('root')).render(&lt;App /&gt;);</code></pre>
<h2>Features</h2>
<ul>
<li><strong>Declarative</strong>: React makes it painless to create interactive UIs.</li>
<li><strong>Component-Based</strong>: Build encapsulated components that manage their own state.</li>
<li><strong>Learn Once, Write Anywhere</strong>: Develop new features without rewriting existing code.</li>
</ul>
`
