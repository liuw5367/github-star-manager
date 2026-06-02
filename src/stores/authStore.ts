import type { User } from '../types'
import { create } from 'zustand'

interface AuthState {
  pat: string
  gistId: string
  user: User | null
  isAuth: boolean
  setPat: (pat: string) => void
  setGistId: (id: string) => void
  setUser: (user: User) => void
  logout: () => void
}

const MOCK_USER: User = {
  login: 'octocat',
  avatar_url: 'https://github.githubassets.com/images/modules/logos_page/Octocat.png',
  name: 'The Octocat',
  public_repos: 8,
}

export const useAuthStore = create<AuthState>(set => ({
  pat: '',
  gistId: '',
  user: MOCK_USER,
  isAuth: true,
  setPat: (pat) => {
    localStorage.setItem('github_star_manager_pat', pat)
    set({ pat })
  },
  setGistId: (id) => {
    localStorage.setItem('github_star_manager_gist_id', id)
    set({ gistId: id })
  },
  setUser: user => set({ user, isAuth: true }),
  logout: () => {
    localStorage.removeItem('github_star_manager_pat')
    localStorage.removeItem('github_star_manager_gist_id')
    set({ pat: '', gistId: '', user: null, isAuth: false })
  },
}))
