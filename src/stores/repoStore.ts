import type { Repo } from '../types'
import { create } from 'zustand'
import * as gist from '../api/gist'
import * as github from '../api/github'
import { useAuthStore } from './authStore'
import { useTagStore } from './tagStore'
import { AUTO_CAT_ID, getTopTopics, tagIdFromTopic } from '../lib/autoClassify'

interface RepoState {
  repos: Repo[]
  syncing: boolean
  syncProgress: string
  lastSynced: string
  classifying: boolean
  setRepos: (repos: Repo[]) => void
  syncStarred: () => Promise<void>
  classifyAll: () => Promise<{ classified: number, tags: number, hasTopics: boolean }>
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
  classifying: false,

  setRepos: (repos) => {
    set({ repos })
    saveCache(repos)
  },

  syncStarred: async () => {
    const { pat, gistId } = useAuthStore.getState()
    if (!pat)
      throw new Error('未设置 PAT')
    if (!gistId)
      throw new Error('未设置 Gist')

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

      const { ensureLanguageTag } = useTagStore.getState()

      const createdTags: string[] = []
      const reposToAdd: Repo[] = newRepos.map((sr) => {
        const tags: string[] = []
        if (sr.language) {
          const tagId = ensureLanguageTag(sr.language)
          if (!createdTags.includes(tagId))
            createdTags.push(tagId)
          tags.push(tagId)
        }
        return {
          full_name: sr.full_name,
          description: sr.description,
          language: sr.language,
          topics: sr.topics || [],
          stargazers_count: sr.stargazers_count,
          updated_at: sr.updated_at,
          starred_at: sr.starred_at,
          tags,
          note: '',
        }
      })

      const tagState = useTagStore.getState()
      let autoCat = tagState.categories.find(c => c.id === AUTO_CAT_ID)
      if (!autoCat && reposToAdd.length > 0) {
        const topTopics = getTopTopics(starredRepos.map(sr => ({ full_name: sr.full_name, topics: sr.topics || [] })) as Repo[])
        const autoTagIds = new Set<string>()
        tagState.ensureAutoCategory()
        for (const topic of topTopics) {
          const tid = tagIdFromTopic(topic)
          tagState.ensureAutoTag(tid, topic)
          autoTagIds.add(tid)
        }
        for (const repo of reposToAdd) {
          for (const topic of repo.topics || []) {
            const tid = tagIdFromTopic(topic)
            if (autoTagIds.has(tid) && !repo.tags.includes(tid))
              repo.tags.push(tid)
          }
        }
      }
      else if (autoCat) {
        const autoTagIds = new Set(autoCat.tags.map(t => t.id))
        for (const repo of reposToAdd) {
          for (const topic of repo.topics || []) {
            const tid = tagIdFromTopic(topic)
            if (autoTagIds.has(tid) && !repo.tags.includes(tid))
              repo.tags.push(tid)
          }
        }
      }

      const existingMap = new Map(existing.map(r => [r.full_name, r]))
      const updatedRepos: Repo[] = starredRepos.map((sr) => {
        const old = existingMap.get(sr.full_name)
        if (old) {
          return {
            ...old,
            description: sr.description,
            language: sr.language,
            topics: sr.topics || [],
            stargazers_count: sr.stargazers_count,
            updated_at: sr.updated_at,
          }
        }
        const added = reposToAdd.find(r => r.full_name === sr.full_name)
        return added || {
          full_name: sr.full_name,
          description: sr.description,
          language: sr.language,
          topics: sr.topics || [],
          stargazers_count: sr.stargazers_count,
          updated_at: sr.updated_at,
          starred_at: sr.starred_at,
          tags: [],
          note: '',
        }
      })

      const now = new Date().toISOString()
      const trash: Record<string, { tags: string[], note: string, trashed_at: string }> = {}
      removedRepos.forEach((r) => {
        trash[r.full_name] = { tags: r.tags, note: r.note, trashed_at: now }
      })

      set({ syncProgress: '正在保存到 Gist...' })

      const userTagMap: Record<string, string[]> = {}
      updatedRepos.forEach((r) => {
        const userTags = r.tags.filter(t => !t.startsWith('tag_lang_'))
        if (userTags.length > 0)
          userTagMap[r.full_name] = userTags
      })
      const noteMap: Record<string, string> = {}
      updatedRepos.forEach((r) => {
        if (r.note)
          noteMap[r.full_name] = r.note
      })

      const currentCategories = useTagStore.getState().categories
      const userCategories = currentCategories.filter(c => c.id !== 'cat_language')

      await gist.updateGistFiles(gistId, pat, {
        'meta.json': JSON.stringify({ version: 1, last_synced: now, total_starred: starredRepos.length }),
        'categories.json': JSON.stringify({ categories: userCategories }),
        'tags.json': JSON.stringify(userTagMap),
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

  classifyAll: async () => {
    const { pat, gistId } = useAuthStore.getState()
    if (!pat || !gistId)
      throw new Error('未设置 PAT 或 Gist')

    const repos = get().repos
    const tagStore = useTagStore.getState()

    set({ classifying: true })

    try {
      const autoTagIds = tagStore.syncAutoTags(repos)
      let classifiedCount = 0
      let hasTopics = false
      const updatedRepos = repos.map((repo) => {
        if ((repo.topics || []).length > 0)
          hasTopics = true
        const matched: string[] = []
        for (const topic of repo.topics || []) {
          const tid = tagIdFromTopic(topic)
          if (autoTagIds.has(tid) && !repo.tags.includes(tid)) {
            matched.push(tid)
          }
        }
        if (matched.length > 0) {
          classifiedCount++
          return { ...repo, tags: [...repo.tags, ...matched] }
        }
        return repo
      })

      const autoCat = useTagStore.getState().categories.find(c => c.id === AUTO_CAT_ID)
      const tagCount = autoCat?.tags.length || 0

      const userTagMap: Record<string, string[]> = {}
      updatedRepos.forEach((r) => {
        const userTags = r.tags.filter(t => !t.startsWith('tag_lang_'))
        if (userTags.length > 0)
          userTagMap[r.full_name] = userTags
      })

      const allCategories = useTagStore.getState().categories
      const saveCategories = allCategories.filter(c => c.id !== 'cat_language')

      await gist.updateGistFiles(gistId, pat, {
        'categories.json': JSON.stringify({ categories: saveCategories }),
        'tags.json': JSON.stringify(userTagMap),
      })

      set({ repos: updatedRepos, classifying: false })
      saveCache(updatedRepos)
      return { classified: classifiedCount, tags: tagCount, hasTopics }
    }
    catch (err) {
      set({ classifying: false })
      throw err
    }
  },

  toggleTag: (fullName, tagId) => {
    set((state) => {
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
    set((state) => {
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
    set((state) => {
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
    set((state) => {
      const updated = state.repos.map(r =>
        r.full_name === fullName ? { ...r, note } : r,
      )
      saveCache(updated)
      return { repos: updated }
    })
  },
}))
