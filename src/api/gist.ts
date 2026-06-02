import type { Category, TrashItem } from '../types'

const BASE = 'https://api.github.com'

export interface GistFiles {
  'meta.json': string
  'categories.json': string
  'tags.json': string
  'notes.json': string
  'trash.json': string
}

function headers(pat: string): HeadersInit {
  return {
    Authorization: `Bearer ${pat}`,
    Accept: 'application/vnd.github.v3+json',
  }
}

export async function createGist(pat: string): Promise<string> {
  const defaultFiles: GistFiles = {
    'meta.json': JSON.stringify({ version: 1, last_synced: '', total_starred: 0 }),
    'categories.json': JSON.stringify({ categories: [] }),
    'tags.json': JSON.stringify({}),
    'notes.json': JSON.stringify({}),
    'trash.json': JSON.stringify({}),
  }

  const files: Record<string, { content: string }> = {}
  for (const [name, content] of Object.entries(defaultFiles)) {
    files[name] = { content }
  }

  const res = await fetch(`${BASE}/gists`, {
    method: 'POST',
    headers: headers(pat),
    body: JSON.stringify({
      description: 'GitHub Star Manager Data',
      public: false,
      files,
    }),
  })

  if (!res.ok) throw new Error(`创建 Gist 失败 (${res.status})`)
  const data = await res.json()
  return data.id
}

export async function getGistFiles(gistId: string, pat: string): Promise<GistFiles> {
  const res = await fetch(`${BASE}/gists/${gistId}`, { headers: headers(pat) })
  if (!res.ok) throw new Error(`读取 Gist 失败 (${res.status})`)
  const data = await res.json()

  const getContent = (name: string): string => {
    const file = data.files?.[name]
    return file?.content || ''
  }

  return {
    'meta.json': getContent('meta.json'),
    'categories.json': getContent('categories.json'),
    'tags.json': getContent('tags.json'),
    'notes.json': getContent('notes.json'),
    'trash.json': getContent('trash.json'),
  }
}

export async function updateGistFiles(
  gistId: string,
  pat: string,
  files: Partial<GistFiles>,
): Promise<void> {
  const bodyFiles: Record<string, { content: string }> = {}
  for (const [name, content] of Object.entries(files)) {
    bodyFiles[name] = { content: content || '' }
  }

  const res = await fetch(`${BASE}/gists/${gistId}`, {
    method: 'PATCH',
    headers: headers(pat),
    body: JSON.stringify({ files: bodyFiles }),
  })

  if (!res.ok) throw new Error(`写入 Gist 失败 (${res.status})`)
}

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat_language', name: '语言 / Language', order: 0, tags: [] },
  {
    id: 'cat_framework', name: '框架 / Framework', order: 1, tags: [
      { id: 'tag_react', name: 'React', order: 0 },
      { id: 'tag_vue', name: 'Vue', order: 1 },
      { id: 'tag_angular', name: 'Angular', order: 2 },
      { id: 'tag_nextjs', name: 'Next.js', order: 3 },
      { id: 'tag_spring', name: 'Spring', order: 4 },
      { id: 'tag_fastapi', name: 'FastAPI', order: 5 },
    ],
  },
  {
    id: 'cat_tooling', name: '工具 / Tooling', order: 2, tags: [
      { id: 'tag_cli', name: 'CLI', order: 0 },
      { id: 'tag_build', name: '构建工具', order: 1 },
      { id: 'tag_devtools', name: '开发辅助', order: 2 },
    ],
  },
  {
    id: 'cat_ai', name: 'AI / ML', order: 3, tags: [
      { id: 'tag_llm', name: 'LLM', order: 0 },
      { id: 'tag_training', name: '训练框架', order: 1 },
      { id: 'tag_inference', name: '推理', order: 2 },
      { id: 'tag_dataset', name: '数据集', order: 3 },
    ],
  },
  {
    id: 'cat_infra', name: '基础设施 / Infra', order: 4, tags: [
      { id: 'tag_docker', name: 'Docker', order: 0 },
      { id: 'tag_k8s', name: 'K8s', order: 1 },
      { id: 'tag_cicd', name: 'CI/CD', order: 2 },
      { id: 'tag_monitor', name: '监控', order: 3 },
    ],
  },
  {
    id: 'cat_database', name: '数据库 / Database', order: 5, tags: [
      { id: 'tag_orm', name: 'ORM', order: 0 },
      { id: 'tag_migration', name: '迁移工具', order: 1 },
    ],
  },
  {
    id: 'cat_learning', name: '学习资源 / Learning', order: 6, tags: [
      { id: 'tag_tutorial', name: '教程', order: 0 },
      { id: 'tag_awesome', name: 'Awesome 列表', order: 1 },
    ],
  },
  {
    id: 'cat_app', name: '应用 / App', order: 7, tags: [
      { id: 'tag_saas', name: 'SaaS', order: 0 },
      { id: 'tag_opensource', name: '开源服务', order: 1 },
    ],
  },
]
