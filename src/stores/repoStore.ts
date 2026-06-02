import type { Repo } from '../types'
import { create } from 'zustand'
import * as github from '../api/github'
import * as gist from '../api/gist'
import { useAuthStore } from './authStore'
import { useTagStore } from './tagStore'

interface RepoState {
  repos: Repo[]
  syncing: boolean
  syncProgress: string
  lastSynced: string
  setRepos: (repos: Repo[]) => void
  syncStarred: () => Promise<void>
  toggleTag: (fullName: string, tagId: string) => void
  setNote: (fullName: string, note: string) => void
  addTag: (fullName: string, tagId: string) => void
  removeTag: (fullName: string, tagId: string) => void
}

function saveCache(repos: Repo[]) {
  localStorage.setItem('gsm_repo_cache', JSON.stringify(repos))
}

function loadCache(): Repo[] {
  try {
    const raw = localStorage.getItem('gsm_repo_cache')
    return raw ? JSON.parse(raw) : []
  }
  catch {
    return []
  }
}

export const useRepoStore = create<RepoState>((set, get) => ({
  repos: loadCache(),
  syncing: false,
  syncProgress: '',
  lastSynced: '',

  setRepos: (repos) => {
    set({ repos })
    saveCache(repos)
  },

  syncStarred: async () => {
    const { pat, gistId } = useAuthStore.getState()
    if (!pat) throw new Error('未设置 PAT')
    if (!gistId) throw new Error('未设置 Gist')

    set({ syncing: true, syncProgress: '正在拉取 Star 数据...' })

    try {
      const starredRepos = await github.getStarred(pat, (page, total) => {
        set({ syncProgress: `正在拉取第 ${page} 页 / 共 ${total} 页...` })
      })

      set({ syncProgress: '正在对比本地数据...' })

      const existing = get().repos
      const existingNames = new Set(existing.map(r => r.full_name))
      const starredNames = new Set(starredRepos.map(r => r.full_name))

      const newRepos = starredRepos.filter(r => !existingNames.has(r.full_name))
      const removedRepos = existing.filter(r => !starredNames.has(r.full_name))

      const { ensureLanguageTag, categories } = useTagStore.getState()

      const createdTags: string[] = []
      const reposToAdd: Repo[] = newRepos.map((sr) => {
        const tags: string[] = []
        if (sr.language) {
          const tagId = ensureLanguageTag(sr.language)
          if (!createdTags.includes(tagId)) createdTags.push(tagId)
          tags.push(tagId)
        }
        return {
          full_name: sr.full_name,
          description: sr.description,
          language: sr.language,
          stargazers_count: sr.stargazers_count,
          updated_at: sr.updated_at,
          starred_at: sr.starred_at,
          tags,
          note: '',
        }
      })

      const existingMap = new Map(existing.map(r => [r.full_name, r]))
      const updatedRepos: Repo[] = starredRepos.map(sr => {
        const old = existingMap.get(sr.full_name)
        if (old) {
          return {
            ...old,
            description: sr.description,
            language: sr.language,
            stargazers_count: sr.stargazers_count,
            updated_at: sr.updated_at,
          }
        }
        const added = reposToAdd.find(r => r.full_name === sr.full_name)
        return added || {
          full_name: sr.full_name,
          description: sr.description,
          language: sr.language,
          stargazers_count: sr.stargazers_count,
          updated_at: sr.updated_at,
          starred_at: sr.starred_at,
          tags: [],
          note: '',
        }
      })

      const now = new Date().toISOString()
      const trash: Record<string, { tags: string[]; note: string; trashed_at: string }> = {}
      removedRepos.forEach((r) => {
        trash[r.full_name] = { tags: r.tags, note: r.note, trashed_at: now }
      })

      set({ syncProgress: '正在保存到 Gist...' })

      const tagMap: Record<string, string[]> = {}
      updatedRepos.forEach((r) => {
        if (r.tags.length > 0) tagMap[r.full_name] = r.tags
      })
      const noteMap: Record<string, string> = {}
      updatedRepos.forEach((r) => {
        if (r.note) noteMap[r.full_name] = r.note
      })

      const currentCategories = useTagStore.getState().categories

      await gist.updateGistFiles(gistId, pat, {
        'meta.json': JSON.stringify({ version: 1, last_synced: now, total_starred: starredRepos.length }),
        'categories.json': JSON.stringify({ categories: currentCategories }),
        'tags.json': JSON.stringify(tagMap),
        'notes.json': JSON.stringify(noteMap),
        'trash.json': JSON.stringify(trash),
      })

      set({ repos: updatedRepos, lastSynced: now, syncing: false, syncProgress: '' })
      saveCache(updatedRepos)
    }
    catch (err) {
      set({ syncing: false, syncProgress: '' })
      throw err
    }
  },

  toggleTag: (fullName, tagId) => {
    set(state => {
      const updated = state.repos.map(r =>
        r.full_name === fullName
          ? { ...r, tags: r.tags.includes(tagId) ? r.tags.filter(t => t !== tagId) : [...r.tags, tagId] }
          : r,
      )
      saveCache(updated)
      return { repos: updated }
    })
  },

  addTag: (fullName, tagId) => {
    set(state => {
      const updated = state.repos.map(r =>
        r.full_name === fullName && !r.tags.includes(tagId)
          ? { ...r, tags: [...r.tags, tagId] }
          : r,
      )
      saveCache(updated)
      return { repos: updated }
    })
  },

  removeTag: (fullName, tagId) => {
    set(state => {
      const updated = state.repos.map(r =>
        r.full_name === fullName
          ? { ...r, tags: r.tags.filter(t => t !== tagId) }
          : r,
      )
      saveCache(updated)
      return { repos: updated }
    })
  },

  setNote: (fullName, note) => {
    set(state => {
      const updated = state.repos.map(r =>
        r.full_name === fullName ? { ...r, note } : r,
      )
      saveCache(updated)
      return { repos: updated }
    })
  },
}))
