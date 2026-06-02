import { create } from 'zustand'

interface UiState {
  activeFilter: string
  selectedRepo: string | null
  collapsedCats: string[]
  sortBy: string
  sortDir: 'asc' | 'desc'
  theme: 'system' | 'light' | 'dark'
  isMobile: boolean
  mobileSidebarOpen: boolean
  showTagManager: boolean
  toast: { message: string, type: 'success' | 'error' | 'info' } | null
  setActiveFilter: (filter: string) => void
  setSelectedRepo: (repo: string | null) => void
  toggleCat: (catId: string) => void
  setSortBy: (field: string) => void
  setSortDir: (dir: 'asc' | 'desc') => void
  setTheme: (theme: 'system' | 'light' | 'dark') => void
  setIsMobile: (isMobile: boolean) => void
  setMobileSidebarOpen: (open: boolean) => void
  setShowTagManager: (show: boolean) => void
  setToast: (toast: UiState['toast']) => void
}

export const useUiStore = create<UiState>(set => ({
  activeFilter: 'all',
  selectedRepo: null,
  collapsedCats: [],
  sortBy: 'starred_at',
  sortDir: 'desc',
  theme: (localStorage.getItem('gsm_theme') as UiState['theme']) || 'system',
  isMobile: false,
  mobileSidebarOpen: false,
  showTagManager: false,
  toast: null,
  setActiveFilter: filter => set({ activeFilter: filter }),
  setSelectedRepo: repo => set({ selectedRepo: repo }),
  toggleCat: catId => set(state => ({
    collapsedCats: state.collapsedCats.includes(catId)
      ? state.collapsedCats.filter(id => id !== catId)
      : [...state.collapsedCats, catId],
  })),
  setSortBy: sortBy => set({ sortBy }),
  setSortDir: sortDir => set({ sortDir }),
  setTheme: (theme) => {
    localStorage.setItem('gsm_theme', theme)
    set({ theme })
  },
  setIsMobile: isMobile => set({ isMobile }),
  setMobileSidebarOpen: open => set({ mobileSidebarOpen: open }),
  setShowTagManager: show => set({ showTagManager: show }),
  setToast: toast => set({ toast }),
}))
