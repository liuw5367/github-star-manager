import type { Repo } from '../types'
import { create } from 'zustand'

interface RepoState {
  repos: Repo[]
  setRepos: (repos: Repo[]) => void
  toggleTag: (fullName: string, tagId: string) => void
  setNote: (fullName: string, note: string) => void
  addTag: (fullName: string, tagId: string) => void
  removeTag: (fullName: string, tagId: string) => void
}

export const useRepoStore = create<RepoState>(set => ({
  repos: MOCK_REPOS,
  setRepos: repos => set({ repos }),
  toggleTag: (fullName, tagId) => {
    set(state => ({
      repos: state.repos.map(r =>
        r.full_name === fullName
          ? { ...r, tags: r.tags.includes(tagId) ? r.tags.filter(t => t !== tagId) : [...r.tags, tagId] }
          : r,
      ),
    }))
  },
  addTag: (fullName, tagId) => {
    set(state => ({
      repos: state.repos.map(r =>
        r.full_name === fullName && !r.tags.includes(tagId)
          ? { ...r, tags: [...r.tags, tagId] }
          : r,
      ),
    }))
  },
  removeTag: (fullName, tagId) => {
    set(state => ({
      repos: state.repos.map(r =>
        r.full_name === fullName
          ? { ...r, tags: r.tags.filter(t => t !== tagId) }
          : r,
      ),
    }))
  },
  setNote: (fullName, note) => {
    set(state => ({
      repos: state.repos.map(r =>
        r.full_name === fullName ? { ...r, note } : r,
      ),
    }))
  },
}))

const MOCK_REPOS: Repo[] = [
  { full_name: 'facebook/react', description: 'The library for web and native user interfaces.', language: 'JavaScript', stargazers_count: 231000, updated_at: '2025-05-20', starred_at: '2023-06-15', tags: ['tag_react', 'tag_typescript'], note: '核心依赖，持续关注新版本' },
  { full_name: 'vercel/next.js', description: 'The React Framework for the Web.', language: 'JavaScript', stargazers_count: 128000, updated_at: '2025-05-22', starred_at: '2023-08-20', tags: ['tag_react', 'tag_nextjs', 'tag_typescript'], note: '' },
  { full_name: 'shadcn-ui/ui', description: 'Beautifully designed components that you can copy and paste into your apps.', language: 'TypeScript', stargazers_count: 78500, updated_at: '2025-05-21', starred_at: '2024-01-10', tags: ['tag_react', 'tag_typescript'], note: 'UI 组件库首选' },
  { full_name: 'tailwindlabs/tailwindcss', description: 'A utility-first CSS framework for rapid UI development.', language: 'TypeScript', stargazers_count: 85200, updated_at: '2025-05-19', starred_at: '2023-03-05', tags: ['tag_build'], note: '' },
  { full_name: 'denoland/deno', description: 'A modern runtime for JavaScript and TypeScript.', language: 'Rust', stargazers_count: 98400, updated_at: '2025-05-18', starred_at: '2024-02-28', tags: ['tag_rust', 'tag_typescript'], note: '替代 Node.js 的方案' },
  { full_name: 'astral-sh/ruff', description: 'An extremely fast Python linter and code formatter, written in Rust.', language: 'Rust', stargazers_count: 35200, updated_at: '2025-05-20', starred_at: '2024-04-12', tags: ['tag_python', 'tag_rust', 'tag_cli'], note: 'Python 工具链的未来' },
  { full_name: 'pydantic/pydantic', description: 'Data validation using Python type annotations.', language: 'Python', stargazers_count: 20800, updated_at: '2025-05-17', starred_at: '2023-11-01', tags: ['tag_python'], note: '' },
  { full_name: 'langchain-ai/langchain', description: 'Build context-aware reasoning applications.', language: 'Python', stargazers_count: 98700, updated_at: '2025-05-22', starred_at: '2024-01-20', tags: ['tag_python', 'tag_llm'], note: 'LLM 应用开发框架' },
  { full_name: 'ollama/ollama', description: 'Get up and running with large language models.', language: 'Go', stargazers_count: 115000, updated_at: '2025-05-21', starred_at: '2024-03-15', tags: ['tag_go', 'tag_llm', 'tag_inference'], note: '本地运行 LLM 最佳方案' },
  { full_name: 'docker/compose', description: 'Define and run multi-container applications with Docker.', language: 'Go', stargazers_count: 34500, updated_at: '2025-05-15', starred_at: '2023-07-20', tags: ['tag_docker', 'tag_go'], note: '' },
  { full_name: 'tokio-rs/tokio', description: 'A runtime for writing reliable asynchronous applications with Rust.', language: 'Rust', stargazers_count: 27800, updated_at: '2025-05-16', starred_at: '2024-05-10', tags: ['tag_rust'], note: 'Rust 异步运行时' },
  { full_name: 'drizzle-team/drizzle-orm', description: 'Headless TypeScript ORM with a head.', language: 'TypeScript', stargazers_count: 26400, updated_at: '2025-05-19', starred_at: '2024-06-01', tags: ['tag_typescript', 'tag_orm'], note: '' },
  { full_name: 'vuejs/core', description: 'Vue.js is a progressive JavaScript framework for building UI on the web.', language: 'TypeScript', stargazers_count: 48200, updated_at: '2025-05-20', starred_at: '2023-09-10', tags: ['tag_vue', 'tag_typescript'], note: '' },
  { full_name: 'biomejs/biome', description: 'A toolchain for web projects.', language: 'Rust', stargazers_count: 16800, updated_at: '2025-05-18', starred_at: '2024-07-22', tags: ['tag_rust', 'tag_cli', 'tag_devtools'], note: '' },
  { full_name: 'sindresorhus/awesome-nodejs', description: 'Delightful Node.js packages and resources.', language: null, stargazers_count: 58400, updated_at: '2025-05-10', starred_at: '2023-05-01', tags: ['tag_awesome', 'tag_typescript'], note: '' },
  { full_name: 'huggingface/transformers', description: 'State-of-the-art Machine Learning for Pytorch, TensorFlow, and JAX.', language: 'Python', stargazers_count: 138000, updated_at: '2025-05-22', starred_at: '2023-12-05', tags: ['tag_python', 'tag_llm', 'tag_training'], note: 'ML 核心库' },
  { full_name: 'astral-sh/uv', description: 'An extremely fast Python package and project manager, written in Rust.', language: 'Rust', stargazers_count: 52300, updated_at: '2025-05-21', starred_at: '2024-09-01', tags: ['tag_python', 'tag_rust', 'tag_cli'], note: '替代 pip/poetry' },
]
