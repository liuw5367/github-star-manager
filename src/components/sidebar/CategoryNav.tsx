import { useMemo } from 'react'
import { DERIVED_AUTO_CAT_ID, DERIVED_LANGUAGE_CAT_ID, getDerivedCategories, repoMatchesFilter, sortTagsByRepoCount } from '../../lib/repoList'
import { splitReposByTrash } from '../../lib/repoPersistence'
import { formatLastSynced } from '../../lib/utils'
import { useAuthStore } from '../../stores/authStore'
import { useRepoStore } from '../../stores/repoStore'
import { useTagStore } from '../../stores/tagStore'
import { useUiStore } from '../../stores/uiStore'
import { ChevronIcon, LogoutIcon, TagManageIcon, TrashIcon } from '../shared/Icons'
import { ThemeToggle } from '../shared/ThemeToggle'

export function CategoryNav() {
  const repos = useRepoStore(s => s.repos)
  const lastSynced = useRepoStore(s => s.lastSynced)
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

  const { activeRepos, trashRepos } = splitReposByTrash(repos)
  const derivedCategories = useMemo(() => getDerivedCategories(activeRepos), [activeRepos])
  const visibleCategories = [...derivedCategories, ...categories]
  const totalRepos = activeRepos.length
  const untaggedCount = activeRepos.filter(repo => !repo.tags?.length).length

  const repoCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    activeRepos.forEach((repo) => {
      repo.tags?.forEach((tag) => {
        counts[tag] = (counts[tag] || 0) + 1
      })
    })
    return counts
  }, [activeRepos])

  const handleSelect = (filter: string) => {
    setActiveFilter(filter)
    setSelectedRepo(null)
    setMobileSidebarOpen(false)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-gh-border-muted">
        {user && (
          <div className="flex items-center gap-2">
            <img src={user.avatar_url} alt="" className="w-7 h-7 rounded-full border border-gh-border flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="text-ui-caption font-medium text-gh-fg truncate">{user.login}</div>
              {lastSynced && (
                <div className="text-ui-caption text-gh-fg-muted truncate">
                  {formatLastSynced(lastSynced)}
                </div>
              )}
            </div>
            {/* Native confirmation keeps this destructive boundary synchronous and dependency-free. */}
            {/* eslint-disable-next-line no-alert */}
            <button onClick={() => window.confirm('退出登录会移除本机账号缓存，但不会删除 GitHub 或 Gist 数据。确定继续吗？') && logout()} className="p-1 rounded hover:bg-gh-canvas transition-colors text-gh-fg-muted hover:text-gh-danger flex-shrink-0" title="退出登录" aria-label="退出登录">
              <LogoutIcon />
            </button>
          </div>
        )}
      </div>

      <div className="flex-shrink-0 py-1 border-b border-gh-border-muted">
        {[
          { filter: 'all', label: '全部', count: totalRepos, icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M1.5 1.75V13.5h13.25a.75.75 0 0 1 0 1.5H.75a.75.75 0 0 1-.75-.75V1.75a.75.75 0 0 1 1.5 0Zm14.28 2.53-5.25 5.25a.75.75 0 0 1-1.06 0L7 7.06 4.28 9.78a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042l3.25-3.25a.75.75 0 0 1 1.06 0L10 7.94l4.72-4.72a.751.751 0 0 1 1.042.018.751.751 0 0 1 .018 1.042Z" /></svg> },
          { filter: 'untagged', label: '未分类', count: untaggedCount, icon: <TagManageIcon /> },
        ].map(item => (
          <button
            key={item.filter}
            onClick={() => handleSelect(item.filter)}
            className={`w-full flex items-center justify-between px-3 py-1.5 text-ui-body hover:bg-gh-canvas transition-colors ${activeFilter === item.filter ? 'bg-gh-accent/10 text-gh-accent font-medium' : 'text-gh-fg'}`}
            style={{ borderRadius: 0 }}
          >
            <span className="flex items-center gap-2">
              {item.icon}
              {item.label}
            </span>
            <span className="text-ui-caption text-gh-fg-muted">{item.count}</span>
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto py-1">
        {repos.length === 0
          ? (
              <div className="flex flex-col items-center justify-center py-12 text-ui-caption text-gh-fg-muted">
                <svg width="32" height="32" viewBox="0 0 16 16" fill="currentColor" className="mb-2 opacity-40"><path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z" /></svg>
                <p>暂无数据</p>
                <p className="mt-0.5 opacity-50">同步后显示标签分类</p>
              </div>
            )
          : visibleCategories.map((category) => {
              const isOpen = !collapsedCats.includes(category.id)
              const isDerived = category.id === DERIVED_LANGUAGE_CAT_ID || category.id === DERIVED_AUTO_CAT_ID
              const countFor = (tagId: string) => isDerived
                ? activeRepos.filter(repo => repoMatchesFilter(repo, tagId)).length
                : repoCounts[tagId] || 0
              const counts = Object.fromEntries(category.tags.map(tag => [tag.id, countFor(tag.id)]))
              const sortedTags = sortTagsByRepoCount(category.tags, counts)
              const categoryCount = activeRepos.filter(repo => category.tags.some(tag => isDerived ? repoMatchesFilter(repo, tag.id) : repo.tags.includes(tag.id))).length
              return (
                <div key={category.id}>
                  <button
                    onClick={() => {
                      toggleCat(category.id)
                      if (!isDerived)
                        handleSelect(`cat:${category.id}`)
                    }}
                    className={`w-full flex items-center justify-between px-3 py-1.5 text-ui-body hover:bg-gh-canvas transition-colors ${activeFilter === `cat:${category.id}` ? 'bg-gh-accent/10 text-gh-accent font-medium' : 'text-gh-fg'}`}
                    style={{ borderRadius: 0 }}
                  >
                    <span className="flex items-center gap-1.5 min-w-0">
                      <ChevronIcon open={isOpen} />
                      <span className="truncate">{category.name}</span>
                    </span>
                    <span className="text-ui-caption text-gh-fg-muted flex-shrink-0">{categoryCount}</span>
                  </button>
                  {isOpen && sortedTags.map(tag => (
                    <button
                      key={tag.id}
                      onClick={() => handleSelect(isDerived ? tag.id : `tag:${tag.id}`)}
                      className={`w-full flex items-center justify-between pl-8 pr-3 py-1 text-ui-body transition-colors ${activeFilter === (isDerived ? tag.id : `tag:${tag.id}`) ? 'bg-gh-accent/10 text-gh-accent font-medium' : 'hover:bg-gh-canvas text-gh-fg'}`}
                      style={{ borderRadius: 0 }}
                    >
                      <span className="truncate">{tag.name}</span>
                      <span className="text-ui-caption text-gh-fg-muted flex-shrink-0">{countFor(tag.id)}</span>
                    </button>
                  ))}
                </div>
              )
            })}
      </div>

      <div className="flex-shrink-0 py-1 border-t border-gh-border-muted">
        <button onClick={() => setShowTagManager(true)} className="w-full flex items-center gap-2 px-3 py-1.5 text-ui-body text-gh-fg-muted hover:text-gh-fg hover:bg-gh-canvas transition-colors" style={{ borderRadius: 0 }}>
          <TagManageIcon />
          管理标签
        </button>
      </div>

      <div className="flex-shrink-0 border-t border-gh-border-muted px-3 py-1.5">
        <div className="flex items-center justify-between">
          <ThemeToggle />
          <button onClick={() => handleSelect('trash')} className={`flex items-center gap-1.5 px-2 py-1 text-ui-caption rounded transition-colors ${activeFilter === 'trash' ? 'bg-gh-accent/10 text-gh-accent font-medium' : 'text-gh-fg-muted hover:text-gh-fg hover:bg-gh-canvas'}`}>
            <TrashIcon />
            回收站
            {trashRepos.length > 0 ? `(${trashRepos.length})` : ''}
          </button>
        </div>
      </div>
    </div>
  )
}
