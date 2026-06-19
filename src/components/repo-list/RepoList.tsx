import { useVirtualizer } from '@tanstack/react-virtual'
import { useMemo, useRef } from 'react'
import { getFilteredRepos, getRepoListEmptyState } from '../../lib/repoList'
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
  const retainedRepoNames = useUiStore(s => s.retainedRepoNames)

  const filteredRepos = useMemo(() => getFilteredRepos({
    repos,
    categories,
    activeFilter,
    sortBy,
    sortDir,
    searchQuery,
    retainedRepoNames,
  }), [repos, categories, activeFilter, sortBy, sortDir, searchQuery, retainedRepoNames])
  const emptyState = getRepoListEmptyState({
    repos,
    filteredRepos,
    activeFilter,
    searchQuery,
  })

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
      {filteredRepos.length > 0
        ? (
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
          )
        : (
            <div className="flex flex-col items-center justify-center py-16 text-gh-fg-muted">
              <svg width="40" height="40" viewBox="0 0 16 16" fill="currentColor" className="mb-3 text-gh-fg-muted">
                <path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z" />
              </svg>
              <p className="text-sm">
                {emptyState === 'no-data' && '暂无仓库数据'}
                {emptyState === 'empty-trash' && '回收站为空'}
                {emptyState === 'no-results' && '没有匹配的仓库'}
              </p>
              <p className="mt-1 text-xs text-gh-fg-muted/70">
                {emptyState === 'no-data' && '先同步 GitHub Star 列表开始使用'}
                {emptyState === 'empty-trash' && '取消 Star 的仓库会暂存在这里'}
                {emptyState === 'no-results' && '试试调整搜索词或筛选条件'}
              </p>
            </div>
          )}
    </div>
  )
}
