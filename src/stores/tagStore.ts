import type { Category } from '../types'
import { create } from 'zustand'
import { DEFAULT_CATEGORIES } from '../api/gist'

interface TagState {
  categories: Category[]
  setCategories: (categories: Category[]) => void
  addCategory: (name: string) => string
  deleteCategory: (catId: string) => void
  renameCategory: (catId: string, name: string) => void
  addTag: (catId: string, name: string) => string
  deleteTag: (catId: string, tagId: string) => void
  renameTag: (catId: string, tagId: string, name: string) => void
  seedDefaultCategories: () => void
  ensureLanguageTag: (language: string) => string
}

function langTagId(language: string): string {
  return `tag_lang_${language.toLowerCase().replace(/[^a-z0-9]/g, '_')}`
}

export const useTagStore = create<TagState>((set, get) => ({
  categories: [],

  setCategories: categories => set({ categories }),

  addCategory: (name) => {
    const catId = `cat_${name.toLowerCase().replace(/[^a-z0-9]/gu, '_').replace(/_+/g, '_')}`
    set(state => {
      if (state.categories.find(c => c.id === catId)) return state
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

  seedDefaultCategories: () => {
    const { categories } = get()
    if (categories.length > 0) return
    set({ categories: DEFAULT_CATEGORIES })
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
    if (exists) return tagId

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
}))
