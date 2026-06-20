import type { Category } from '../types'
import { create } from 'zustand'
import { AUTO_TAG_NAMES_KEY, migrateLegacyCache } from '../lib/accountCache'
import { getUserCategories } from '../lib/repoPersistence'

interface TagState {
  categories: Category[]
  cacheGistId: string
  activateCache: (gistId: string, previousGistId: string | null) => void
  setCategories: (categories: Category[]) => void
  addCategory: (name: string) => string
  deleteCategory: (catId: string) => void
  renameCategory: (catId: string, name: string) => void
  addTag: (catId: string, name: string) => string
  deleteTag: (catId: string, tagId: string) => void
  renameTag: (catId: string, tagId: string, name: string) => void
}

export const useTagStore = create<TagState>(set => ({
  categories: [],
  cacheGistId: '',

  activateCache: (gistId, previousGistId) => {
    migrateLegacyCache(localStorage, AUTO_TAG_NAMES_KEY, gistId, previousGistId)
    set({ cacheGistId: gistId })
  },

  setCategories: categories => set({ categories: getUserCategories(categories) }),

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

}))
