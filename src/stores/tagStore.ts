import type { Category } from '../types'
import { create } from 'zustand'

interface TagState {
  categories: Category[]
  setCategories: (categories: Category[]) => void
  addCategory: (name: string) => void
  deleteCategory: (catId: string) => void
  renameCategory: (catId: string, name: string) => void
  addTag: (catId: string, name: string) => void
  deleteTag: (catId: string, tagId: string) => void
  renameTag: (catId: string, tagId: string, name: string) => void
}

const MOCK_CATEGORIES: Category[] = [
  { id: 'cat_lang', name: '语言 / Language', order: 0, tags: [
    { id: 'tag_python', name: 'Python', order: 0 },
    { id: 'tag_typescript', name: 'TypeScript', order: 1 },
    { id: 'tag_rust', name: 'Rust', order: 2 },
    { id: 'tag_go', name: 'Go', order: 3 },
  ] },
  { id: 'cat_framework', name: '框架 / Framework', order: 1, tags: [
    { id: 'tag_react', name: 'React', order: 0 },
    { id: 'tag_vue', name: 'Vue', order: 1 },
    { id: 'tag_nextjs', name: 'Next.js', order: 2 },
  ] },
  { id: 'cat_tooling', name: '工具 / Tooling', order: 2, tags: [
    { id: 'tag_cli', name: 'CLI', order: 0 },
    { id: 'tag_build', name: '构建工具', order: 1 },
    { id: 'tag_devtools', name: '开发辅助', order: 2 },
  ] },
  { id: 'cat_ai', name: 'AI / ML', order: 3, tags: [
    { id: 'tag_llm', name: 'LLM', order: 0 },
    { id: 'tag_training', name: '训练框架', order: 1 },
    { id: 'tag_inference', name: '推理', order: 2 },
  ] },
  { id: 'cat_infra', name: '基础设施 / Infra', order: 4, tags: [
    { id: 'tag_docker', name: 'Docker', order: 0 },
    { id: 'tag_k8s', name: 'K8s', order: 1 },
    { id: 'tag_cicd', name: 'CI/CD', order: 2 },
  ] },
  { id: 'cat_database', name: '数据库 / Database', order: 5, tags: [
    { id: 'tag_orm', name: 'ORM', order: 0 },
    { id: 'tag_migration', name: '迁移工具', order: 1 },
  ] },
  { id: 'cat_learning', name: '学习资源 / Learning', order: 6, tags: [
    { id: 'tag_tutorial', name: '教程', order: 0 },
    { id: 'tag_awesome', name: 'Awesome 列表', order: 1 },
  ] },
  { id: 'cat_app', name: '应用 / App', order: 7, tags: [
    { id: 'tag_saas', name: 'SaaS', order: 0 },
    { id: 'tag_opensource', name: '开源服务', order: 1 },
  ] },
]

export const useTagStore = create<TagState>(set => ({
  categories: MOCK_CATEGORIES,
  setCategories: categories => set({ categories }),
  addCategory: (name) => {
    const catId = `cat_${name.toLowerCase().replace(/[^a-z0-9]/gu, '_').replace(/_+/g, '_')}`
    set(state => ({
      categories: [...state.categories, { id: catId, name, order: state.categories.length, tags: [] }],
    }))
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
