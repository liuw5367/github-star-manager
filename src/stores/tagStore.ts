import type { Category } from '../types'
import { create } from 'zustand'
import { AUTO_TAG_NAMES_KEY, migrateLegacyCache } from '../lib/accountCache'
import { getUserCategories } from '../lib/repoPersistence'
import { createCategoryId, createTagId, hasDuplicateName } from '../lib/tagIdentity'

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
    const catId = createCategoryId()
    let added = false
    set((state) => {
      if (hasDuplicateName(state.categories, name))
        return state
      added = true
      return {
        categories: [...state.categories, { id: catId, name: name.trim(), order: state.categories.length, tags: [] }],
      }
    })
    return added ? catId : ''
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
    const tagId = createTagId()
    let added = false
    set(state => ({
      categories: state.categories.map((cat) => {
        if (cat.id !== catId || hasDuplicateName(cat.tags, name))
          return cat
        added = true
        return { ...cat, tags: [...cat.tags, { id: tagId, name: name.trim(), order: cat.tags.length }] }
      }),
    }))
    return added ? tagId : ''
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
