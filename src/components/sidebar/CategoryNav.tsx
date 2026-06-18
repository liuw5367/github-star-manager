import { useMemo, useState } from 'react'
import { AUTO_CAT_ID } from '../../lib/autoClassify'
import { splitReposByTrash } from '../../lib/repoPersistence'
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
  const classifyAll = useRepoStore(s => s.classifyAll)

  const setActiveFilter = useUiStore(s => s.setActiveFilter)
  const toggleCat = useUiStore(s => s.toggleCat)
  const setShowTagManager = useUiStore(s => s.setShowTagManager)
  const setSelectedRepo = useUiStore(s => s.setSelectedRepo)
  const setMobileSidebarOpen = useUiStore(s => s.setMobileSidebarOpen)
  const setToast = useUiStore(s => s.setToast)

  const [classifying, setClassifying] = useState(false)
  const { activeRepos, trashRepos } = splitReposByTrash(repos)

  const totalRepos = activeRepos.length
  const untaggedCount = activeRepos.filter(r => !r.tags || r.tags.length === 0).length

  const repoCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    activeRepos.forEach((r) => {
      (r.tags || []).forEach((t) => {
        counts[t] = (counts[t] || 0) + 1
      })
    })
    return counts
  }, [activeRepos])

  const isActive = (key: string) => activeFilter === key

  const handleSelect = (filter: string) => {
    setActiveFilter(filter)
    setSelectedRepo(null)
    setMobileSidebarOpen(false)
  }

  const handleClassify = async () => {
    setClassifying(true)
    try {
      const { classified, tags, hasTopics } = await classifyAll()
      if (collapsedCats.includes(AUTO_CAT_ID))
        toggleCat(AUTO_CAT_ID)
      if (tags === 0 && !hasTopics) {
        setToast({ message: '未发现 topics 数据，无法自动分类。请确认仓库有 GitHub Topics 标签', type: 'info' })
      }
      else if (classified === 0) {
        setToast({ message: `自动分类已更新（${tags} 个标签）`, type: 'success' })
      }
      else {
        setToast({ message: `已处理 ${classified} 个仓库（共 ${tags} 个分类标签）`, type: 'success' })
      }
    }
    catch (err) {
      setToast({ message: err instanceof Error ? err.message : '分类失败', type: 'error' })
    }
    finally {
      setClassifying(false)
    }
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
        {repos.length === 0
          ? (
              <div className="flex flex-col items-center justify-center py-12 text-gh-fg-muted">
                <svg width="32" height="32" viewBox="0 0 16 16" fill="currentColor" className="mb-2 opacity-40">
                  <path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z" />
                </svg>
                <p className="text-xs">暂无数据</p>
                <p className="text-[10px] mt-0.5 opacity-50">同步后显示标签分类</p>
              </div>
            )
          : (
              <>
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
                  onClick={handleClassify}
                  disabled={classifying}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gh-accent hover:bg-gh-accent/10 transition-colors disabled:opacity-50"
                  style={{ borderRadius: 0 }}
                >
                  <svg width={14} height={14} viewBox="0 0 16 16" fill="currentColor" className={classifying ? 'animate-spin' : ''}>
                    <path d="M2 8a6 6 0 0 1 10.47-4" />
                    <path d="M14 8a6 6 0 0 1-10.47 4" />
                    <path d="M13.5 1.5V5h-3.5" />
                    <path d="M2.5 14.5V11H6" />
                  </svg>
                  {classifying ? '分类中...' : '自动分类'}
                </button>

                <button
                  onClick={() => setShowTagManager(true)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gh-fg-muted hover:text-gh-accent hover:bg-gh-canvas transition-colors"
                  style={{ borderRadius: 0 }}
                >
                  <TagManageIcon />
                  管理标签...
                </button>
              </>
            )}
      </div>

      <div className="flex-shrink-0 border-t border-gh-border-muted px-3 py-1.5">
        <div className="flex items-center justify-between">
          <ThemeToggle />
          <button
            onClick={() => handleSelect('trash')}
            className={`flex items-center gap-1.5 px-2 py-1 text-xs rounded transition-colors ${isActive('trash') ? 'bg-gh-accent/10 text-gh-accent font-medium' : 'text-gh-fg-muted hover:text-gh-fg hover:bg-gh-canvas'}`}
          >
            <TrashIcon />
            回收站
            {' '}
            {trashRepos.length > 0 ? `(${trashRepos.length})` : ''}
          </button>
        </div>
      </div>
    </div>
  )
}
