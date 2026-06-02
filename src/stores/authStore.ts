import type { User } from '../types'
import { create } from 'zustand'

interface AuthState {
  pat: string
  gistId: string
  user: User | null
  isAuth: boolean
  checking: boolean
  setGistId: (id: string) => void
  login: (pat: string, user: User) => void
  logout: () => void
  setCheckingDone: () => void
}

function loadFromStorage() {
  const pat = localStorage.getItem('github_star_manager_pat') || ''
  const gistId = localStorage.getItem('github_star_manager_gist_id') || ''
  return { pat, gistId }
}

const { pat, gistId } = loadFromStorage()

export const useAuthStore = create<AuthState>(set => ({
  pat,
  gistId,
  user: null,
  isAuth: false,
  checking: true,
  setGistId: (id) => {
    localStorage.setItem('github_star_manager_gist_id', id)
    set({ gistId: id })
  },
  login: (pat, user) => {
    localStorage.setItem('github_star_manager_pat', pat)
    set({ pat, user, isAuth: true, checking: false })
  },
  logout: () => {
    localStorage.removeItem('github_star_manager_pat')
    localStorage.removeItem('github_star_manager_gist_id')
    set({ pat: '', gistId: '', user: null, isAuth: false, checking: false })
  },
  setCheckingDone: () => set({ checking: false }),
}))
