import { useMemo } from 'react'
import { useAuthStore } from '../../stores/authStore'
import { useRepoStore } from '../../stores/repoStore'
import { useTagStore } from '../../stores/tagStore'
import { useUiStore } from '../../stores/uiStore'
import { ChevronIcon, LogoutIcon, TagManageIcon, TrashIcon } from '../shared/Icons'
import { ThemeToggle } from '../shared/ThemeToggle'

export function CategoryNav() {
  const repos = useRepoStore(s => s.repos)
  const categories = useTagStore(s => s.categories)
  const activeFilter = useUiStore(s => s.activeFilter)
  const collapsedCats = useUiStore(s => s.collapsedCats)
  const user = useAuthStore(s => s.user)
  const logout = useAuthStore(s => s.logout)

  const setActiveFilter = useUiStore(s => s.setActiveFilter)
  const toggleCat = useUiStore(s => s.toggleCat)
  const setShowTagManager = useUiStore(s => s.setShowTagManager)
  const setSelectedRepo = useUiStore(s => s.setSelectedRepo)
  const setMobileSidebarOpen = useUiStore(s => s.setMobileSidebarOpen)
  const isMobile = useUiStore(s => s.isMobile)

  const totalRepos = repos.length
  const untaggedCount = repos.filter(r => !r.tags || r.tags.length === 0).length

  const repoCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    repos.forEach((r) => {
      (r.tags || []).forEach((t) => {
        counts[t] = (counts[t] || 0) + 1
      })
    })
    return counts
  }, [repos])

  const isActive = (key: string) => activeFilter === key

  const handleSelect = (filter: string) => {
    setActiveFilter(filter)
    setSelectedRepo(null)
    if (isMobile)
      setMobileSidebarOpen(false)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-3 border-b border-gh-border-muted">
        {user && (
          <div className="flex items-center gap-2">
            <img src={user.avatar_url} alt="" className="w-7 h-7 rounded-full border border-gh-border flex-shrink-0" />
            <span className="text-xs font-medium text-gh-fg truncate min-w-0 flex-1">{user.login}</span>
            <button
              onClick={logout}
              className="p-1 rounded hover:bg-gh-canvas transition-colors text-gh-fg-muted hover:text-gh-danger flex-shrink-0"
              title="退出登录"
            >
              <LogoutIcon />
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        <button
          onClick={() => handleSelect('all')}
          className={`w-full flex items-center justify-between px-3 py-1.5 text-sm hover:bg-gh-canvas transition-colors ${isActive('all') ? 'bg-gh-accent text-white hover:bg-gh-accent-emphasis font-medium' : 'text-gh-fg'}`}
          style={{ borderRadius: 0 }}
        >
          <span className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className={isActive('all') ? 'text-white' : 'text-gh-fg-muted'}><path d="M1.5 1.75V13.5h13.25a.75.75 0 0 1 0 1.5H.75a.75.75 0 0 1-.75-.75V1.75a.75.75 0 0 1 1.5 0Zm14.28 2.53-5.25 5.25a.75.75 0 0 1-1.06 0L7 7.06 4.28 9.78a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042l3.25-3.25a.75.75 0 0 1 1.06 0L10 7.94l4.72-4.72a.751.751 0 0 1 1.042.018.751.751 0 0 1 .018 1.042Z" /></svg>
            全部
          </span>
          <span className={`text-xs ${isActive('all') ? 'text-white/70' : 'text-gh-fg-muted'}`}>{totalRepos}</span>
        </button>

        <button
          onClick={() => handleSelect('untagged')}
          className={`w-full flex items-center justify-between px-3 py-1.5 text-sm hover:bg-gh-canvas transition-colors ${isActive('untagged') ? 'bg-gh-accent text-white hover:bg-gh-accent-emphasis font-medium' : 'text-gh-fg'}`}
          style={{ borderRadius: 0 }}
        >
          <span className="flex items-center gap-2">
            <TagManageIcon />
            未分类
          </span>
          <span className={`text-xs ${isActive('untagged') ? 'text-white/70' : 'text-gh-fg-muted'}`}>{untaggedCount}</span>
        </button>

        <div className="h-px bg-gh-border-muted my-1" />

        {categories.map((cat) => {
          const isOpen = !collapsedCats.includes(cat.id)
          const catRepoCount = cat.tags.reduce((sum, t) => sum + (repoCounts[t.id] || 0), 0)
          return (
            <div key={cat.id}>
              <button
                onClick={() => {
                  toggleCat(cat.id)
                  handleSelect(`cat:${cat.id}`)
                }}
                className={`w-full flex items-center justify-between px-3 py-1.5 text-sm hover:bg-gh-canvas transition-colors ${activeFilter === `cat:${cat.id}` ? 'bg-gh-canvas font-semibold text-gh-fg' : 'text-gh-fg'}`}
                style={{ borderRadius: 0 }}
              >
                <span className="flex items-center gap-1.5">
                  <ChevronIcon open={isOpen} />
                  <span className="truncate text-xs">{cat.name}</span>
                </span>
                <span className="text-xs text-gh-fg-muted flex-shrink-0">{catRepoCount}</span>
              </button>
              {isOpen && cat.tags.map(tag => (
                <button
                  key={tag.id}
                  onClick={() => handleSelect(`tag:${tag.id}`)}
                  className={`w-full flex items-center justify-between pl-8 pr-3 py-1 text-sm transition-colors ${activeFilter === `tag:${tag.id}` ? 'bg-gh-accent text-white hover:bg-gh-accent-emphasis font-medium' : 'hover:bg-gh-canvas text-gh-fg'}`}
                  style={{ borderRadius: 0 }}
                >
                  <span className="truncate text-xs">{tag.name}</span>
                  <span className={`text-xs flex-shrink-0 ${activeFilter === `tag:${tag.id}` ? 'text-white/70' : 'text-gh-fg-muted'}`}>{repoCounts[tag.id] || 0}</span>
                </button>
              ))}
            </div>
          )
        })}

        <div className="h-px bg-gh-border-muted my-1" />

        <button
          onClick={() => setShowTagManager(true)}
          className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gh-fg-muted hover:text-gh-accent hover:bg-gh-canvas transition-colors"
          style={{ borderRadius: 0 }}
        >
          <TagManageIcon />
          管理标签...
        </button>

        <div className="h-px bg-gh-border-muted my-1" />

        <ThemeToggle />

        <div className="h-px bg-gh-border-muted my-1" />

        <button
          onClick={() => handleSelect('trash')}
          className={`w-full flex items-center justify-between px-3 py-1.5 text-sm hover:bg-gh-canvas transition-colors ${isActive('trash') ? 'bg-gh-accent text-white hover:bg-gh-accent-emphasis font-medium' : 'text-gh-fg'}`}
          style={{ borderRadius: 0 }}
        >
          <span className="flex items-center gap-2">
            <TrashIcon />
            回收站
          </span>
          <span className={`text-xs ${isActive('trash') ? 'text-white/70' : 'text-gh-fg-muted'}`}>0</span>
        </button>
      </div>
    </div>
  )
}
