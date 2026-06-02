import { useUiStore } from '../../stores/uiStore'
import { HamburgerIcon, SearchIcon, SyncIcon } from '../shared/Icons'

export function RepoToolbar() {
  const filteredCount = 0
  const sortBy = useUiStore(s => s.sortBy)
  const sortDir = useUiStore(s => s.sortDir)
  const isMobile = useUiStore(s => s.isMobile)
  const setSortBy = useUiStore(s => s.setSortBy)
  const setSortDir = useUiStore(s => s.setSortDir)
  const setMobileSidebarOpen = useUiStore(s => s.setMobileSidebarOpen)

  return (
    <>
      <div className="flex items-center justify-between px-3 py-2 border-b border-gh-border-muted bg-white dark:bg-gh-canvas flex-shrink-0" style={{ minHeight: isMobile ? 48 : 40 }}>
        <div className="flex items-center gap-2">
          {isMobile && (
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="p-2 -ml-1 rounded-md hover:bg-gh-canvas transition-colors"
              aria-label="打开侧边栏"
              style={{ minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <HamburgerIcon />
            </button>
          )}
          {!isMobile && (
            <button className="gh-btn gh-btn-default gh-btn-sm" title="同步 Star 数据">
              <SyncIcon />
              <span className="hidden sm:inline">同步</span>
            </button>
          )}
          <span className="text-xs text-gh-fg-muted">
            {filteredCount}
            {' '}
            个仓库
          </span>
        </div>
        <select
          className="gh-input text-xs"
          style={{ height: 28, paddingRight: 24, width: 'auto' }}
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

      <div className="px-3 py-2 border-b border-gh-border-muted bg-white dark:bg-gh-canvas flex-shrink-0">
        <div className="relative">
          <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"><SearchIcon /></div>
          <input
            type="text"
            placeholder="搜索仓库名、描述、标签..."
            className="gh-input text-sm"
            style={{ height: isMobile ? 36 : 32, paddingLeft: 32 }}
          />
        </div>
      </div>
    </>
  )
}
