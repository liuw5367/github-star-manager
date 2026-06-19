import { create } from 'zustand'

interface UiState {
  activeFilter: string
  selectedRepo: string | null
  collapsedCats: string[]
  sortBy: string
  sortDir: 'asc' | 'desc'
  searchQuery: string
  theme: 'system' | 'light' | 'dark'
  isMobile: boolean
  mobileSidebarOpen: boolean
  sidebarOpen: boolean
  showTagManager: boolean
  toast: { message: string, type: 'success' | 'error' | 'info' } | null
  retainedRepoNames: string[]
  setActiveFilter: (filter: string) => void
  setSelectedRepo: (repo: string | null) => void
  toggleCat: (catId: string) => void
  setSortBy: (field: string) => void
  setSortDir: (dir: 'asc' | 'desc') => void
  setSearchQuery: (query: string) => void
  setTheme: (theme: 'system' | 'light' | 'dark') => void
  setIsMobile: (isMobile: boolean) => void
  setMobileSidebarOpen: (open: boolean) => void
  setSidebarOpen: (open: boolean) => void
  setShowTagManager: (show: boolean) => void
  setToast: (toast: UiState['toast']) => void
  retainRepoInCurrentView: (fullName: string) => void
}

export const useUiStore = create<UiState>(set => ({
  activeFilter: 'all',
  selectedRepo: null,
  collapsedCats: [],
  sortBy: 'starred_at',
  sortDir: 'desc',
  searchQuery: '',
  theme: (localStorage.getItem('gsm_theme') as UiState['theme']) || 'system',
  isMobile: false,
  mobileSidebarOpen: false,
  sidebarOpen: true,
  showTagManager: false,
  toast: null,
  retainedRepoNames: [],
  setActiveFilter: filter => set({ activeFilter: filter, retainedRepoNames: [] }),
  setSelectedRepo: repo => set({ selectedRepo: repo }),
  toggleCat: catId => set(state => ({
    collapsedCats: state.collapsedCats.includes(catId)
      ? state.collapsedCats.filter(id => id !== catId)
      : [...state.collapsedCats, catId],
  })),
  setSortBy: sortBy => set({ sortBy, retainedRepoNames: [] }),
  setSortDir: sortDir => set({ sortDir, retainedRepoNames: [] }),
  setSearchQuery: searchQuery => set({ searchQuery, retainedRepoNames: [] }),
  setTheme: (theme) => {
    localStorage.setItem('gsm_theme', theme)
    set({ theme })
  },
  setIsMobile: isMobile => set({ isMobile }),
  setMobileSidebarOpen: open => set({ mobileSidebarOpen: open }),
  setSidebarOpen: open => set({ sidebarOpen: open }),
  setShowTagManager: show => set({ showTagManager: show }),
  setToast: toast => set({ toast }),
  retainRepoInCurrentView: fullName => set(state => state.retainedRepoNames.includes(fullName)
    ? state
    : { retainedRepoNames: [...state.retainedRepoNames, fullName] }),
}))
