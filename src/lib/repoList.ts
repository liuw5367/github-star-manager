import type { Category, Repo, Tag } from '../types'

interface FilterArgs {
  repos: Repo[]
  categories: Category[]
  activeFilter: string
  sortBy: string
  sortDir: 'asc' | 'desc'
  searchQuery: string
  retainedRepoNames?: string[]
}

export type RepoListEmptyState = 'no-data' | 'no-results' | 'empty-trash'

export function getFilteredRepos({
  repos,
  categories,
  activeFilter,
  sortBy,
  sortDir,
  searchQuery,
  retainedRepoNames = [],
}: FilterArgs): Repo[] {
  let filtered = [...repos]
  const retainedNames = new Set(retainedRepoNames)

  if (activeFilter === 'trash') {
    filtered = filtered.filter(repo => Boolean(repo.trashed_at) || retainedNames.has(repo.full_name))
  }
  else {
    filtered = filtered.filter(repo => !repo.trashed_at || retainedNames.has(repo.full_name))

    if (activeFilter === 'untagged') {
      filtered = filtered.filter(repo => !repo.tags || repo.tags.length === 0)
    }
    else if (activeFilter.startsWith('cat:')) {
      const catId = activeFilter.slice(4)
      const category = categories.find(item => item.id === catId)
      if (category) {
        const tagIds = new Set(category.tags.map(tag => tag.id))
        filtered = filtered.filter(repo => repo.tags?.some(tag => tagIds.has(tag)))
      }
      else {
        filtered = []
      }
    }
    else if (activeFilter.startsWith('tag:')) {
      const tagId = activeFilter.slice(4)
      filtered = filtered.filter(repo => repo.tags?.includes(tagId))
    }
  }

  if (searchQuery) {
    const query = searchQuery.toLowerCase()
    const tagNameMap = new Map<string, string>()

    for (const category of categories) {
      for (const tag of category.tags) {
        tagNameMap.set(tag.id, tag.name.toLowerCase())
      }
    }

    filtered = filtered.filter((repo) => {
      if (repo.full_name.toLowerCase().includes(query))
        return true
      if (repo.description?.toLowerCase().includes(query))
        return true
      if (repo.tags?.some(tagId => tagNameMap.get(tagId)?.includes(query)))
        return true
      return false
    })
  }

  filtered.sort((left, right) => {
    let comparison = 0
    if (sortBy === 'starred_at')
      comparison = left.starred_at.localeCompare(right.starred_at)
    else if (sortBy === 'stargazers_count')
      comparison = left.stargazers_count - right.stargazers_count
    else if (sortBy === 'full_name')
      comparison = left.full_name.localeCompare(right.full_name)
    else if (sortBy === 'updated_at')
      comparison = left.updated_at.localeCompare(right.updated_at)
    return sortDir === 'desc' ? -comparison : comparison
  })

  return filtered
}

export function getRepoListEmptyState({
  repos,
  filteredRepos,
  activeFilter,
  searchQuery,
}: {
  repos: Repo[]
  filteredRepos: Repo[]
  activeFilter: string
  searchQuery: string
}): RepoListEmptyState {
  if (filteredRepos.length > 0)
    return 'no-results'
  if (activeFilter === 'trash')
    return 'empty-trash'
  if (searchQuery || repos.some(repo => !repo.trashed_at))
    return 'no-results'
  return 'no-data'
}

export function shouldClearSelectedRepo(selectedRepo: string | null, filteredRepos: Repo[]): boolean {
  if (!selectedRepo)
    return false
  return !filteredRepos.some(repo => repo.full_name === selectedRepo)
}

export function sortTagsByRepoCount(tags: Tag[], repoCounts: Record<string, number>): Tag[] {
  return [...tags].sort((left, right) =>
    (repoCounts[right.id] || 0) - (repoCounts[left.id] || 0)
    || left.order - right.order,
  )
}
