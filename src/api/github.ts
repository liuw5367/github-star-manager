import type { User } from '../types'
import { normalizeNetworkError, parseGitHubError } from './errors.ts'

const BASE = 'https://api.github.com'

function getLastPage(linkHeader: string): number | null {
  if (!linkHeader)
    return null

  const lastEntry = linkHeader
    .split(',')
    .map(part => part.trim())
    .find(part => part.endsWith('rel="last"'))

  if (!lastEntry)
    return null

  const urlMatch = lastEntry.match(/<([^>]+)>/)
  if (!urlMatch)
    return null

  try {
    return Number(new URL(urlMatch[1]).searchParams.get('page'))
  }
  catch {
    return null
  }
}

function headers(pat: string): HeadersInit {
  return {
    Authorization: `Bearer ${pat}`,
    Accept: 'application/vnd.github.star+json',
  }
}

export async function getUser(pat: string): Promise<User> {
  let res: Response
  try {
    res = await fetch(`${BASE}/user`, { headers: headers(pat) })
  }
  catch (error) {
    throw normalizeNetworkError(error, '验证 PAT 失败')
  }
  if (!res.ok)
    throw await parseGitHubError(res, '验证 PAT 失败')
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
  const perPage = 100
  let page = 1

  while (true) {
    const url = `${BASE}/user/starred?per_page=${perPage}&page=${page}&sort=created&direction=desc`
    let res: Response
    try {
      res = await fetch(url, { headers: headers(pat) })
    }
    catch (error) {
      throw normalizeNetworkError(error, '拉取 Star 列表失败')
    }
    if (!res.ok)
      throw await parseGitHubError(res, '拉取 Star 列表失败')

    const link = res.headers.get('link') || ''
    const totalPages = getLastPage(link) ?? page

    onProgress?.(page, totalPages)

    const data = await res.json()
    for (const item of data) {
      const repo = item.repo || item
      results.push({
        full_name: repo.full_name,
        description: repo.description,
        language: repo.language,
        stargazers_count: repo.stargazers_count,
        updated_at: repo.updated_at,
        starred_at: item.starred_at || repo.starred_at,
        topics: repo.topics || [],
        fork: repo.fork,
        archived: repo.archived,
        license: repo.license,
        forks_count: repo.forks_count,
        created_at: repo.created_at,
        homepage: repo.homepage,
      })
    }

    if (data.length < perPage || !link.includes('rel="next"'))
      break

    page++
    await new Promise(r => setTimeout(r, 500))
  }

  return results
}

export async function setRepoStarred(pat: string, fullName: string, starred: boolean): Promise<void> {
  const [owner, repo, ...rest] = fullName.split('/')
  if (!owner || !repo || rest.length > 0)
    throw new Error('仓库名称无效')

  let res: Response
  try {
    res = await fetch(`${BASE}/user/starred/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`, {
      method: starred ? 'PUT' : 'DELETE',
      headers: headers(pat),
    })
  }
  catch (error) {
    throw normalizeNetworkError(error, `${starred ? '恢复' : '取消'} Star 失败`)
  }
  if (!res.ok)
    throw await parseGitHubError(res, `${starred ? '恢复' : '取消'} Star 失败`)
}

export async function getReadme(pat: string, owner: string, repo: string): Promise<string> {
  let res: Response
  try {
    res = await fetch(`${BASE}/repos/${owner}/${repo}/readme`, {
      headers: {
        Authorization: `Bearer ${pat}`,
        Accept: 'application/vnd.github.raw+json',
      },
    })
  }
  catch (error) {
    throw normalizeNetworkError(error, '拉取 README 失败')
  }
  if (res.status === 404)
    return ''
  if (!res.ok)
    throw await parseGitHubError(res, '拉取 README 失败')
  return res.text()
}
