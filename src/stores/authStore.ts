import type { User } from '../types'
import { create } from 'zustand'
import { AUTO_TAG_NAMES_KEY, clearAccountCache, REPO_CACHE_KEY, saveCachedUser, scopedCacheKey } from '../lib/accountCache'

interface AuthState {
  pat: string
  gistId: string
  user: User | null
  isAuth: boolean
  checking: boolean
  login: (pat: string, user: User, gistId: string) => void
  logout: () => void
  setCheckingDone: () => void
}

function loadFromStorage() {
  const pat = localStorage.getItem('github_star_manager_pat') || ''
  const gistId = localStorage.getItem('github_star_manager_gist_id') || ''
  return { pat, gistId }
}

const { pat, gistId } = loadFromStorage()

export const useAuthStore = create<AuthState>((set, get) => ({
  pat,
  gistId,
  user: null,
  isAuth: false,
  checking: true,
  login: (pat, user, gistId) => {
    localStorage.setItem('github_star_manager_pat', pat)
    localStorage.setItem('github_star_manager_gist_id', gistId)
    saveCachedUser(localStorage, gistId, user)
    set({ pat, gistId, user, isAuth: true, checking: false })
  },
  logout: () => {
    const currentGistId = get().gistId
    if (currentGistId) {
      clearAccountCache(localStorage, currentGistId)
      localStorage.removeItem(scopedCacheKey(AUTO_TAG_NAMES_KEY, currentGistId))
    }
    localStorage.removeItem('github_star_manager_pat')
    localStorage.removeItem('github_star_manager_gist_id')
    localStorage.removeItem(REPO_CACHE_KEY)
    localStorage.removeItem(AUTO_TAG_NAMES_KEY)
    set({ pat: '', gistId: '', user: null, isAuth: false, checking: false })
  },
  setCheckingDone: () => set({ checking: false }),
}))
