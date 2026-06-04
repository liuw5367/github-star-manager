import { useMemo, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useRepoStore } from '../../stores/repoStore'
import { useTagStore } from '../../stores/tagStore'
import { useUiStore } from '../../stores/uiStore'
import { RepoCard } from './RepoCard'

const ROW_HEIGHT = 145

export function RepoList() {
  const repos = useRepoStore(s => s.repos)
  const categories = useTagStore(s => s.categories)
  const activeFilter = useUiStore(s => s.activeFilter)
  const selectedRepo = useUiStore(s => s.selectedRepo)
  const setSelectedRepo = useUiStore(s => s.setSelectedRepo)
  const sortBy = useUiStore(s => s.sortBy)
  const sortDir = useUiStore(s => s.sortDir)
  const searchQuery = useUiStore(s => s.searchQuery)

  const filteredRepos = useMemo(() => {
    let filtered = [...repos]

    if (activeFilter === 'untagged') {
      filtered = filtered.filter(r => !r.tags || r.tags.length === 0)
    }
    else if (activeFilter.startsWith('cat:')) {
      const catId = activeFilter.slice(4)
      const cat = categories.find(c => c.id === catId)
      if (cat) {
        const tagIds = new Set(cat.tags.map(t => t.id))
        filtered = filtered.filter(r => r.tags?.some(t => tagIds.has(t)))
      }
      else { filtered = [] }
    }
    else if (activeFilter.startsWith('tag:')) {
      const tagId = activeFilter.slice(4)
      filtered = filtered.filter(r => r.tags?.includes(tagId))
    }
    else if (activeFilter === 'trash') {
      filtered = []
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      const tagNameMap = new Map<string, string>()
      for (const cat of categories) {
        for (const t of cat.tags) {
          tagNameMap.set(t.id, t.name.toLowerCase())
        }
      }
      filtered = filtered.filter((r) => {
        if (r.full_name.toLowerCase().includes(q))
          return true
        if (r.description?.toLowerCase().includes(q))
          return true
        if (r.tags?.some(tid => tagNameMap.get(tid)?.includes(q)))
          return true
        return false
      })
    }

    filtered.sort((a, b) => {
      let cmp = 0
      if (sortBy === 'starred_at')
        cmp = a.starred_at.localeCompare(b.starred_at)
      else if (sortBy === 'stargazers_count')
        cmp = a.stargazers_count - b.stargazers_count
      else if (sortBy === 'full_name')
        cmp = a.full_name.localeCompare(b.full_name)
      else if (sortBy === 'updated_at')
        cmp = a.updated_at.localeCompare(b.updated_at)
      return sortDir === 'desc' ? -cmp : cmp
    })

    return filtered
  }, [repos, categories, activeFilter, sortBy, sortDir, searchQuery])

  const scrollRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: filteredRepos.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    measureElement: el => el.getBoundingClientRect().height,
    overscan: 5,
  })

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto">
      {filteredRepos.length > 0 ? (
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualizer.getVirtualItems().map(virtualItem => (
            <div
              key={virtualItem.key}
              data-index={virtualItem.index}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <RepoCard
                repo={filteredRepos[virtualItem.index]}
                isSelected={selectedRepo === filteredRepos[virtualItem.index].full_name}
                onClick={() => setSelectedRepo(filteredRepos[virtualItem.index].full_name)}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-gh-fg-muted">
          <svg width="40" height="40" viewBox="0 0 16 16" fill="currentColor" className="mb-3 text-gh-fg-muted">
            <path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z" />
          </svg>
          <p className="text-sm">没有匹配的仓库</p>
        </div>
      )}
    </div>
  )
}
