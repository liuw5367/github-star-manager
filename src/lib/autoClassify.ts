import type { Repo } from '../types'

export const AUTO_CAT_ID = 'cat_auto_classify'
export const AUTO_CAT_NAME = '自动分类'
const TOP_N = 20

function extractRepoNameWords(fullName: string): string[] {
  // Take part after owner/, split by -_. and lowercase
  const name = (fullName || '').split('/')[1] || ''
  return name.split(/[-_.]+/).filter(w => w.length > 1).map(w => w.toLowerCase())
}

export function getTopTopics(repos: Repo[], topN = TOP_N): string[] {
  const counts: Record<string, number> = {}
  for (const repo of repos) {
    for (const topic of repo.topics || []) {
      const t = topic.trim()
      if (t) counts[t] = (counts[t] || 0) + 1
    }
    for (const word of extractRepoNameWords(repo.full_name || '')) {
      counts[word] = (counts[word] || 0) + 1
    }
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([topic]) => topic)
}

export function tagIdFromTopic(topic: string): string {
  return `tag_auto_${topic.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_')}`
}
