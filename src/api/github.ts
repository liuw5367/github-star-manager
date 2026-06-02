import type { User } from '../types'

const BASE = 'https://api.github.com'

function headers(pat: string): HeadersInit {
  return {
    Authorization: `Bearer ${pat}`,
    Accept: 'application/vnd.github.star+json',
  }
}

export async function getUser(pat: string): Promise<User> {
  const res = await fetch(`${BASE}/user`, { headers: headers(pat) })
  if (!res.ok) throw new Error(`PAT 无效 (${res.status})`)
  const data = await res.json()
  return {
    login: data.login,
    avatar_url: data.avatar_url,
    name: data.name || data.login,
    public_repos: data.public_repos,
  }
}

export interface StarredRepo {
  full_name: string
  description: string | null
  language: string | null
  stargazers_count: number
  updated_at: string
  starred_at: string
  topics: string[]
  fork: boolean
  archived: boolean
  license: { spdx_id: string } | null
  forks_count: number
  created_at: string
  homepage: string | null
}

export async function getStarred(
  pat: string,
  onProgress?: (page: number, total: number) => void,
): Promise<StarredRepo[]> {
  const results: StarredRepo[] = []
  let page = 1
  let totalPages = 1

  while (page <= totalPages) {
    const url = `${BASE}/user/starred?per_page=100&page=${page}&sort=created&direction=desc`
    const res = await fetch(url, { headers: headers(pat) })
    if (!res.ok) throw new Error(`拉取 Star 列表失败 (${res.status})`)

    const link = res.headers.get('link') || ''
    const lastMatch = link.match(/page=(\d+)>; rel="last"/)
    if (lastMatch) totalPages = Number(lastMatch[1])

    onProgress?.(page, totalPages)

    const data = await res.json()
    for (const item of data) {
      results.push({
        full_name: item.full_name,
        description: item.description,
        language: item.language,
        stargazers_count: item.stargazers_count,
        updated_at: item.updated_at,
        starred_at: item.starred_at,
        topics: item.topics || [],
        fork: item.fork,
        archived: item.archived,
        license: item.license,
        forks_count: item.forks_count,
        created_at: item.created_at,
        homepage: item.homepage,
      })
    }
    page++
  }

  return results
}

export async function getReadme(pat: string, owner: string, repo: string): Promise<string> {
  const res = await fetch(`${BASE}/repos/${owner}/${repo}/readme`, {
    headers: {
      Authorization: `Bearer ${pat}`,
      Accept: 'application/vnd.github.raw+json',
    },
  })
  if (res.status === 404) return ''
  if (!res.ok) throw new Error(`拉取 README 失败 (${res.status})`)
  return res.text()
}
