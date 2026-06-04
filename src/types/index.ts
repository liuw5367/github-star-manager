export interface User {
  login: string
  avatar_url: string
  name: string
  public_repos: number
}

export interface Tag {
  id: string
  name: string
  order: number
}

export interface Category {
  id: string
  name: string
  order: number
  tags: Tag[]
}

export interface Repo {
  full_name: string
  description: string | null
  language: string | null
  topics: string[]
  stargazers_count: number
  updated_at: string
  starred_at: string
  tags: string[]
  note: string
}

export interface TrashItem {
  tags: string[]
  note: string
  trashed_at: string
}

export interface Meta {
  version: number
  last_synced: string
  total_starred: number
}

export interface GistData {
  meta: Meta
  categories: { categories: Category[] }
  tags: Record<string, string[]>
  notes: Record<string, string>
  trash: Record<string, TrashItem>
}
