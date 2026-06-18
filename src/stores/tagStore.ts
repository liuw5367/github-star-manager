import type { Category, Repo } from '../types'
import { create } from 'zustand'
import { AUTO_CAT_ID, AUTO_CAT_NAME, getTopTopics, tagIdFromTopic } from '../lib/autoClassify'

interface TagState {
  categories: Category[]
  setCategories: (categories: Category[]) => void
  addCategory: (name: string) => string
  deleteCategory: (catId: string) => void
  renameCategory: (catId: string, name: string) => void
  addTag: (catId: string, name: string) => string
  deleteTag: (catId: string, tagId: string) => void
  renameTag: (catId: string, tagId: string, name: string) => void
  ensureLanguageTag: (language: string) => string
  ensureAutoCategories: (repos: Repo[]) => void
  ensureAutoCategory: () => Category
  ensureAutoTag: (tagId: string, tagName: string) => void
  syncAutoTags: (repos: Repo[]) => Set<string>
}

const AUTO_TAG_NAMES_KEY = 'gsm_auto_tag_names'

function saveAutoTagName(tagId: string, name: string) {
  try {
    const map = JSON.parse(localStorage.getItem(AUTO_TAG_NAMES_KEY) || '{}')
    map[tagId] = name
    localStorage.setItem(AUTO_TAG_NAMES_KEY, JSON.stringify(map))
  }
  catch {}
}

function langTagId(language: string): string {
  return `tag_lang_${language.toLowerCase().replace(/[^a-z0-9]/g, '_')}`
}

export const useTagStore = create<TagState>((set, get) => ({
  categories: [],

  setCategories: categories => set({ categories }),

  addCategory: (name) => {
    const catId = `cat_${name.toLowerCase().replace(/[^a-z0-9]/gu, '_').replace(/_+/g, '_')}`
    set((state) => {
      if (state.categories.some(c => c.id === catId))
        return state
      return {
        categories: [...state.categories, { id: catId, name, order: state.categories.length, tags: [] }],
      }
    })
    return catId
  },

  deleteCategory: (catId) => {
    set(state => ({
      categories: state.categories.filter(c => c.id !== catId),
    }))
  },

  renameCategory: (catId, name) => {
    set(state => ({
      categories: state.categories.map(c =>
        c.id === catId ? { ...c, name } : c,
      ),
    }))
  },

  addTag: (catId, name) => {
    const tagId = `tag_${name.toLowerCase().replace(/[^a-z0-9]/gu, '_').replace(/_+/g, '_')}`
    set(state => ({
      categories: state.categories.map(cat =>
        cat.id === catId
          ? { ...cat, tags: [...cat.tags, { id: tagId, name, order: cat.tags.length }] }
          : cat,
      ),
    }))
    return tagId
  },

  deleteTag: (catId, tagId) => {
    set(state => ({
      categories: state.categories.map(cat =>
        cat.id === catId
          ? { ...cat, tags: cat.tags.filter(t => t.id !== tagId) }
          : cat,
      ),
    }))
  },

  renameTag: (catId, tagId, name) => {
    set(state => ({
      categories: state.categories.map(cat =>
        cat.id === catId
          ? { ...cat, tags: cat.tags.map(t => t.id === tagId ? { ...t, name } : t) }
          : cat,
      ),
    }))
  },

  ensureLanguageTag: (language) => {
    const tagId = langTagId(language)
    const { categories } = get()
    let langCat = categories.find(c => c.id === 'cat_language')

    if (!langCat) {
      const newCat: Category = { id: 'cat_language', name: '语言 / Language', order: 0, tags: [] }
      set(s => ({ categories: [newCat, ...s.categories] }))
      langCat = newCat
    }

    const exists = langCat.tags.find(t => t.id === tagId)
    if (exists)
      return tagId

    saveAutoTagName(tagId, language)
    const tagCount = langCat.tags.length
    set(state => ({
      categories: state.categories.map(cat =>
        cat.id === 'cat_language'
          ? { ...cat, tags: [...cat.tags, { id: tagId, name: language, order: tagCount }] }
          : cat,
      ),
    }))
    return tagId
  },

  ensureAutoCategories: (repos) => {
    const autoTagNames: Record<string, string> = JSON.parse(
      localStorage.getItem(AUTO_TAG_NAMES_KEY) || '{}',
    )
    const seen = new Set<string>()
    for (const repo of repos) {
      for (const tagId of repo.tags) {
        if (tagId.startsWith('tag_lang_') && !seen.has(tagId)) {
          seen.add(tagId)
          const name = autoTagNames[tagId]
          if (name)
            get().ensureLanguageTag(name)
        }
      }
    }
  },

  ensureAutoCategory: () => {
    const { categories } = get()
    const existing = categories.find(c => c.id === AUTO_CAT_ID)
    if (existing)
      return existing
    const newCat: Category = { id: AUTO_CAT_ID, name: AUTO_CAT_NAME, order: 0, tags: [] }
    set(s => ({ categories: [newCat, ...s.categories] }))
    return newCat
  },

  ensureAutoTag: (tagId, tagName) => {
    set(state => ({
      categories: state.categories.map(cat =>
        cat.id === AUTO_CAT_ID && !cat.tags.some(t => t.id === tagId)
          ? { ...cat, tags: [...cat.tags, { id: tagId, name: tagName, order: cat.tags.length }] }
          : cat,
      ),
    }))
  },

  syncAutoTags: (repos) => {
    get().ensureAutoCategory()
    const topTopics = getTopTopics(repos)
    const tagIds = new Set<string>()
    for (const topic of topTopics) {
      const tid = tagIdFromTopic(topic)
      get().ensureAutoTag(tid, topic)
      tagIds.add(tid)
    }
    return tagIds
  },
}))
