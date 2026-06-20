import { useCallback, useEffect, useState } from 'react'
import { getFilteredRepos, shouldClearSelectedRepo } from '../../lib/repoList'
import { useRepoStore } from '../../stores/repoStore'
import { useTagStore } from '../../stores/tagStore'
import { useUiStore } from '../../stores/uiStore'
import { TagManagerModal } from '../modals/TagManagerModal'
import { ReadmePanel } from '../readme/ReadmePanel'
import { RepoList } from '../repo-list/RepoList'
import { RepoToolbar } from '../repo-list/RepoToolbar'
import { Toast } from '../shared/Toast'
import { CategoryNav } from '../sidebar/CategoryNav'
import { Splitter } from './Splitter'

function loadWidth(key: string, fallback: number): number {
  try {
    const v = localStorage.getItem(key)
    return v ? Math.max(Number(v), 160) : fallback
  }
  catch {
    return fallback
  }
}

function saveWidth(key: string, val: number) {
  localStorage.setItem(key, String(val))
}

export default function AppShell() {
  const repos = useRepoStore(s => s.repos)
  const categories = useTagStore(s => s.categories)
  const selectedRepo = useUiStore(s => s.selectedRepo)
  const activeFilter = useUiStore(s => s.activeFilter)
  const sortBy = useUiStore(s => s.sortBy)
  const sortDir = useUiStore(s => s.sortDir)
  const searchQuery = useUiStore(s => s.searchQuery)
  const mobileSidebarOpen = useUiStore(s => s.mobileSidebarOpen)
  const sidebarOpen = useUiStore(s => s.sidebarOpen)
  const showTagManager = useUiStore(s => s.showTagManager)
  const retainedRepoNames = useUiStore(s => s.retainedRepoNames)
  const setMobileSidebarOpen = useUiStore(s => s.setMobileSidebarOpen)
  const setSidebarOpen = useUiStore(s => s.setSidebarOpen)
  const setSelectedRepo = useUiStore(s => s.setSelectedRepo)
  const theme = useUiStore(s => s.theme)

  const [sidebarWidth, setSidebarWidth] = useState(() => loadWidth('gsm_sidebar_width', 220))
  const [repoListWidth, setRepoListWidth] = useState(() => loadWidth('gsm_list_width', 360))

  const updateSidebar = useCallback((delta: number) => {
    setSidebarOpen(true)
    setSidebarWidth((prev) => {
      const next = Math.min(Math.max(prev + delta, 160), 400)
      saveWidth('gsm_sidebar_width', next)
      return next
    })
  }, [setSidebarOpen])

  const updateRepoList = useCallback((delta: number) => {
    setRepoListWidth((prev) => {
      const next = Math.min(Math.max(prev + delta, 240), 600)
      saveWidth('gsm_list_width', next)
      return next
    })
  }, [])

  useEffect(() => {
    const filteredRepos = getFilteredRepos({
      repos,
      categories,
      activeFilter,
      sortBy,
      sortDir,
      searchQuery,
      retainedRepoNames,
    })

    if (shouldClearSelectedRepo(selectedRepo, filteredRepos))
      setSelectedRepo(null)
  }, [repos, categories, activeFilter, sortBy, sortDir, searchQuery, retainedRepoNames, selectedRepo, setSelectedRepo])

  // Apply theme
  useEffect(() => {
    const root = document.documentElement

    if (theme === 'dark') {
      root.classList.add('dark')
    }
    else if (theme === 'light') {
      root.classList.remove('dark')
    }
    else {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      root.classList.toggle('dark', mq.matches)
      const handler = (e: MediaQueryListEvent) => root.classList.toggle('dark', e.matches)
      mq.addEventListener('change', handler)
      return () => mq.removeEventListener('change', handler)
    }
  }, [theme])

  return (
    <div className="flex h-screen bg-white dark:bg-gh-canvas overflow-hidden">
      <Toast />

      {showTagManager && <TagManagerModal />}

      {/* Mobile sidebar overlay */}
      <div
        className={`md:hidden fixed inset-0 bg-black/50 z-40 transition-opacity duration-200 ${mobileSidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setMobileSidebarOpen(false)}
      />
      <div
        className={`md:hidden fixed top-0 left-0 bottom-0 w-[280px] z-50 bg-gh-canvas border-r border-gh-border transform transition-transform duration-250 overflow-hidden ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <CategoryNav />
      </div>

      {/* Desktop sidebar */}
      <div
        className="hidden md:flex flex-shrink-0 transition-[width] duration-200 overflow-hidden"
        style={{ width: sidebarOpen ? sidebarWidth : 0 }}
      >
        <div className="bg-gh-canvas/30 overflow-hidden flex-shrink-0" style={{ width: sidebarWidth }}>
          <CategoryNav />
        </div>
      </div>
      {sidebarOpen && <Splitter onResize={updateSidebar} />}

      {/* Center: Repo List */}
      <div
        className={`flex flex-col overflow-hidden max-md:!w-full md:min-w-[320px] ${selectedRepo ? '' : 'md:flex-1'}`}
        style={{
          width: selectedRepo ? repoListWidth : undefined,
        }}
      >
        <RepoToolbar />
        <RepoList />
      </div>

      {/* Desktop: README Panel */}
      {selectedRepo && (
        <div className="hidden md:flex flex-1 overflow-hidden">
          <Splitter onResize={updateRepoList} />
          <div className="flex-1 overflow-hidden bg-white dark:bg-gh-canvas">
            <ReadmePanel />
          </div>
        </div>
      )}

      {/* Mobile: README overlay */}
      {selectedRepo && (
        <div className="md:hidden">
          <div className="fixed inset-0 bg-black/50 z-[29]" onClick={() => setSelectedRepo(null)} />
          <div className="fixed inset-0 z-30 bg-white dark:bg-gh-canvas overflow-y-auto">
            <ReadmePanel />
          </div>
        </div>
      )}
    </div>
  )
}
