import { useEffect } from 'react'
import { useUiStore } from '../../stores/uiStore'
import { TagManagerModal } from '../modals/TagManagerModal'
import { ReadmePanel } from '../readme/ReadmePanel'
import { RepoList } from '../repo-list/RepoList'
import { RepoToolbar } from '../repo-list/RepoToolbar'
import { Toast } from '../shared/Toast'
import { CategoryNav } from '../sidebar/CategoryNav'

export default function AppShell() {
  const selectedRepo = useUiStore(s => s.selectedRepo)
  const isMobile = useUiStore(s => s.isMobile)
  const mobileSidebarOpen = useUiStore(s => s.mobileSidebarOpen)
  const showTagManager = useUiStore(s => s.showTagManager)
  const setIsMobile = useUiStore(s => s.setIsMobile)
  const setMobileSidebarOpen = useUiStore(s => s.setMobileSidebarOpen)
  const setSelectedRepo = useUiStore(s => s.setSelectedRepo)

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [setIsMobile])

  return (
    <div className="flex h-screen bg-white overflow-hidden">
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
        <div className="flex-shrink-0 border-r border-gh-border bg-gh-canvas/30 overflow-hidden" style={{ width: 200 }}>
          <CategoryNav />
        </div>
      )}

      {/* Center: Repo List */}
      <div
        className="flex flex-col border-r border-gh-border panel-transition overflow-hidden"
        style={{
          width: (!isMobile && selectedRepo) ? 360 : '100%',
          minWidth: isMobile ? 0 : 320,
        }}
      >
        <RepoToolbar />
        <RepoList />
      </div>

      {/* Desktop: README Panel */}
      {!isMobile && selectedRepo && (
        <div className="flex-1 overflow-hidden panel-transition bg-white">
          <ReadmePanel />
        </div>
      )}

      {/* Mobile: README overlay */}
      {isMobile && selectedRepo && (
        <>
          <div className="fixed inset-0 bg-black/50 z-[29]" onClick={() => setSelectedRepo(null)} />
          <div className="fixed inset-0 z-30 bg-white overflow-y-auto translate-x-0 transition-transform duration-250">
            <ReadmePanel />
          </div>
        </>
      )}
    </div>
  )
}
