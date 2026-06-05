import { useMemo } from 'react'
import { useRepoStore } from '../../stores/repoStore'
import { useUiStore } from '../../stores/uiStore'
import { HamburgerIcon, SearchIcon, SyncIcon } from '../shared/Icons'

export function RepoToolbar() {
  const repos = useRepoStore(s => s.repos)
  const syncing = useRepoStore(s => s.syncing)
  const syncProgress = useRepoStore(s => s.syncProgress)
  const syncStarred = useRepoStore(s => s.syncStarred)
  const sortBy = useUiStore(s => s.sortBy)
  const sortDir = useUiStore(s => s.sortDir)
  const setSortBy = useUiStore(s => s.setSortBy)
  const setSortDir = useUiStore(s => s.setSortDir)
  const searchQuery = useUiStore(s => s.searchQuery)
  const setSearchQuery = useUiStore(s => s.setSearchQuery)
  const activeFilter = useUiStore(s => s.activeFilter)
  const setActiveFilter = useUiStore(s => s.setActiveFilter)
  const setMobileSidebarOpen = useUiStore(s => s.setMobileSidebarOpen)
  const sidebarOpen = useUiStore(s => s.sidebarOpen)
  const setSidebarOpen = useUiStore(s => s.setSidebarOpen)
  const setToast = useUiStore(s => s.setToast)

  const langOptions = useMemo(() => {
    const counts: Record<string, number> = {}
    repos.forEach((r) => {
      if (r.language)
        counts[r.language] = (counts[r.language] || 0) + 1
    })
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
  }, [repos])

  function langTagId(language: string): string {
    return `tag_lang_${language.toLowerCase().replace(/[^a-z0-9]/g, '_')}`
  }

  const selectedLang = activeFilter.startsWith('tag:tag_lang_')
    ? [...langOptions].find(o => langTagId(o.name) === activeFilter.slice(4))?.name || ''
    : ''

  const handleSync = async () => {
    try {
      await syncStarred()
      setToast({ message: '✓ 同步完成', type: 'success' })
    }
    catch (err) {
      setToast({ message: err instanceof Error ? err.message : '同步失败', type: 'error' })
    }
  }

  return (
    <>
      <div className="flex items-center justify-between px-3 py-2 border-b border-gh-border-muted bg-white dark:bg-gh-canvas flex-shrink-0 min-h-12 md:min-h-10">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (window.innerWidth < 768) {
                setMobileSidebarOpen(true)
              }
              else {
                setSidebarOpen(!sidebarOpen)
              }
            }}
            className="p-2 -ml-1 rounded-md hover:bg-gh-canvas transition-colors md:p-1.5 text-gh-fg-muted hover:text-gh-fg"
            aria-label="切换侧边栏"
            title={sidebarOpen ? '隐藏侧边栏' : '显示侧边栏'}
            style={{ minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <HamburgerIcon />
          </button>
          <button
            className="gh-btn gh-btn-default gh-btn-sm"
            title="同步 Star 数据"
            onClick={handleSync}
            disabled={syncing}
          >
            <SyncIcon spinning={syncing} />
            <span className="hidden sm:inline">{syncing ? syncProgress || '同步中...' : '同步'}</span>
          </button>
          {/* <span className="text-xs text-gh-fg-muted">
            {filteredCount}
            {' '}
            个仓库
          </span> */}
        </div>
        <div className="flex items-center gap-2">
          <select
            className="gh-select text-xs h-7"
            value={selectedLang}
            onChange={(e) => {
              const val = e.target.value
              setActiveFilter(val ? `tag:${langTagId(val)}` : 'all')
            }}
          >
            <option value="">全部语言</option>
            {langOptions.map(o => (
              <option key={o.name} value={o.name}>
                {o.name}
                {' '}
                (
                {o.count}
                )
              </option>
            ))}
          </select>
          <select
            className="gh-select text-xs"
            style={{ backgroundImage: 'none', paddingRight: 12 }}
            value={`${sortBy}:${sortDir}`}
            onChange={(e) => {
              const [field, dir] = e.target.value.split(':')
              setSortBy(field)
              setSortDir(dir as 'asc' | 'desc')
            }}
          >
            <option value="starred_at:desc">Star 时间 ↓</option>
            <option value="starred_at:asc">Star 时间 ↑</option>
            <option value="stargazers_count:desc">Star 数 ↓</option>
            <option value="stargazers_count:asc">Star 数 ↑</option>
            <option value="full_name:asc">名称 A→Z</option>
            <option value="full_name:desc">名称 Z→A</option>
            <option value="updated_at:desc">更新时间 ↓</option>
            <option value="updated_at:asc">更新时间 ↑</option>
          </select>
        </div>
      </div>

      <div className="px-3 py-2 border-b border-gh-border-muted bg-white dark:bg-gh-canvas flex-shrink-0">
        <div className="relative">
          <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"><SearchIcon /></div>
          <input
            type="text"
            placeholder="搜索仓库名、描述、标签..."
            className="gh-input text-sm h-9 md:h-8"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ paddingLeft: 32 }}
          />
        </div>
      </div>
    </>
  )
}
