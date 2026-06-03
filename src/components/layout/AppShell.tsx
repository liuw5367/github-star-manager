import { useCallback, useEffect, useState } from 'react'
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
  const selectedRepo = useUiStore(s => s.selectedRepo)
  const isMobile = useUiStore(s => s.isMobile)
  const mobileSidebarOpen = useUiStore(s => s.mobileSidebarOpen)
  const showTagManager = useUiStore(s => s.showTagManager)
  const setIsMobile = useUiStore(s => s.setIsMobile)
  const setMobileSidebarOpen = useUiStore(s => s.setMobileSidebarOpen)
  const setSelectedRepo = useUiStore(s => s.setSelectedRepo)
  const theme = useUiStore(s => s.theme)

  const [sidebarWidth, setSidebarWidth] = useState(() => loadWidth('gsm_sidebar_width', 200))
  const [repoListWidth, setRepoListWidth] = useState(() => loadWidth('gsm_list_width', 360))

  const updateSidebar = useCallback((delta: number) => {
    setSidebarWidth((prev) => {
      const next = Math.min(Math.max(prev + delta, 160), 400)
      saveWidth('gsm_sidebar_width', next)
      return next
    })
  }, [])

  const updateRepoList = useCallback((delta: number) => {
    setRepoListWidth((prev) => {
      const next = Math.min(Math.max(prev + delta, 240), 600)
      saveWidth('gsm_list_width', next)
      return next
    })
  }, [])

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

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [setIsMobile])

  return (
    <div className="flex h-screen bg-white dark:bg-gh-canvas overflow-hidden">
      <Toast />

      {showTagManager && <TagManagerModal />}

      {/* Mobile sidebar */}
      {isMobile && (
        <>
          <div
            className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-200 ${mobileSidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div
            className={`fixed top-0 left-0 bottom-0 w-[280px] z-50 bg-gh-canvas border-r border-gh-border transform transition-transform duration-250 overflow-y-auto ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
          >
            <CategoryNav />
          </div>
        </>
      )}

      {/* Desktop sidebar */}
      {!isMobile && (
        <div className="flex-shrink-0 flex">
          <div className="border-r border-gh-border bg-gh-canvas/30 overflow-hidden" style={{ width: sidebarWidth }}>
            <CategoryNav />
          </div>
          <Splitter onResize={updateSidebar} />
        </div>
      )}

      {/* Center: Repo List */}
      <div
        className="flex flex-col border-r border-gh-border overflow-hidden"
        style={{
          width: (!isMobile && selectedRepo) ? repoListWidth : '100%',
          minWidth: isMobile ? 0 : 320,
        }}
      >
        <RepoToolbar />
        <RepoList />
      </div>

      {/* Desktop: README Panel */}
      {!isMobile && selectedRepo && (
        <>
          <Splitter onResize={updateRepoList} />
          <div className="flex-1 overflow-hidden bg-white dark:bg-gh-canvas">
            <ReadmePanel />
          </div>
        </>
      )}

      {/* Mobile: README overlay */}
      {isMobile && selectedRepo && (
        <>
          <div className="fixed inset-0 bg-black/50 z-[29]" onClick={() => setSelectedRepo(null)} />
          <div className="fixed inset-0 z-30 bg-white dark:bg-gh-canvas overflow-y-auto translate-x-0 transition-transform duration-250">
            <ReadmePanel />
          </div>
        </>
      )}
    </div>
  )
}
