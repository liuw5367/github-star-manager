import { normalizeNetworkError, parseGitHubError } from './errors.ts'

const BASE = 'https://api.github.com'
export const GIST_DESCRIPTION = 'gitstars-data-v1'
export const LEGACY_GIST_DESCRIPTION = 'GitHub Star Manager Data'
export const GIST_APP_ID = 'gitstars'

const REQUIRED_FILE_NAMES: (keyof GistFiles)[] = [
  'meta.json',
  'categories.json',
  'tags.json',
  'notes.json',
  'trash.json',
]

export interface GistCandidate {
  id: string
  description: string
  updatedAt: string
  legacy: boolean
  files: GistFiles
}

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

async function githubRequest(request: typeof fetch, input: string, init: RequestInit, context: string): Promise<Response> {
  try {
    const response = await request(input, init)
    if (!response.ok)
      throw await parseGitHubError(response, context)
    return response
  }
  catch (error) {
    throw normalizeNetworkError(error, context)
  }
}

export async function discoverGitStarsGists(
  pat: string,
  request: typeof fetch = fetch,
): Promise<GistCandidate[]> {
  const summaries: Array<{ id: string, description: string }> = []
  let pageNumber = 1

  while (true) {
    const url = `${BASE}/gists?per_page=100&page=${pageNumber}`
    const res = await githubRequest(request, url, { headers: headers(pat) }, '查找 Gist 失败')

    const page = await res.json()
    for (const item of page) {
      if (item.description === GIST_DESCRIPTION || item.description === LEGACY_GIST_DESCRIPTION) {
        summaries.push({
          id: item.id,
          description: item.description,
        })
      }
    }

    if (!hasNextPage(res.headers.get('link')))
      break
    pageNumber++
  }

  const candidates = await Promise.all(summaries.map(async (summary): Promise<GistCandidate | null> => {
    const res = await githubRequest(request, `${BASE}/gists/${summary.id}`, { headers: headers(pat) }, '读取 Gist 失败')

    const data = await res.json()
    const files = readGistFiles(data)
    if (!files)
      return null

    const meta = parseMeta(files['meta.json'])
    const legacy = summary.description === LEGACY_GIST_DESCRIPTION
    const valid = legacy
      ? meta?.version === 1 && !meta.app
      : meta?.version === 1 && meta.app === GIST_APP_ID

    if (!valid)
      return null

    return {
      id: data.id,
      description: data.description,
      updatedAt: data.updated_at,
      legacy,
      files,
    }
  }))

  return candidates.filter((candidate): candidate is GistCandidate => Boolean(candidate))
}

export async function upgradeLegacyGist(
  candidate: GistCandidate,
  pat: string,
  ownerLogin: string,
  request: typeof fetch = fetch,
): Promise<GistCandidate> {
  const previous = JSON.parse(candidate.files['meta.json'])
  const metaContent = JSON.stringify({
    app: GIST_APP_ID,
    version: 1,
    owner_login: ownerLogin,
    initialized: true,
    last_synced: previous.last_synced || '',
    total_starred: previous.total_starred || 0,
  })
  await githubRequest(request, `${BASE}/gists/${candidate.id}`, {
    method: 'PATCH',
    headers: headers(pat),
    body: JSON.stringify({
      description: GIST_DESCRIPTION,
      files: {
        'meta.json': { content: metaContent },
      },
    }),
  }, '升级 Gist 失败')

  return {
    ...candidate,
    description: GIST_DESCRIPTION,
    legacy: false,
    files: {
      ...candidate.files,
      'meta.json': metaContent,
    },
  }
}

function hasNextPage(linkHeader: string | null): boolean {
  return Boolean(linkHeader
    ? linkHeader
        .split(',')
        .map(part => part.trim())
        .find(part => part.endsWith('rel="next"'))
    : false)
}

function parseMeta(raw: string): { app?: string, version?: number } | null {
  try {
    return JSON.parse(raw)
  }
  catch {
    return null
  }
}

function readGistFiles(data: any): GistFiles | null {
  if (!REQUIRED_FILE_NAMES.every(name => typeof data.files?.[name]?.content === 'string'))
    return null

  return Object.fromEntries(
    REQUIRED_FILE_NAMES.map(name => [name, data.files[name].content]),
  ) as unknown as GistFiles
}

export async function createGist(pat: string, ownerLogin: string): Promise<string> {
  const defaultFiles: GistFiles = {
    'meta.json': JSON.stringify({
      app: GIST_APP_ID,
      version: 1,
      owner_login: ownerLogin,
      initialized: false,
      last_synced: '',
      total_starred: 0,
    }),
    'categories.json': JSON.stringify({ categories: [] }),
    'tags.json': JSON.stringify({}),
    'notes.json': JSON.stringify({}),
    'trash.json': JSON.stringify({}),
  }

  const files: Record<string, { content: string }> = {}
  for (const [name, content] of Object.entries(defaultFiles)) {
    files[name] = { content }
  }

  const res = await githubRequest(fetch, `${BASE}/gists`, {
    method: 'POST',
    headers: headers(pat),
    body: JSON.stringify({
      description: GIST_DESCRIPTION,
      public: false,
      files,
    }),
  }, '创建 Gist 失败')
  const data = await res.json()
  return data.id
}

export async function getGistFiles(gistId: string, pat: string): Promise<GistFiles> {
  const res = await githubRequest(fetch, `${BASE}/gists/${gistId}`, { headers: headers(pat) }, '读取 Gist 失败')
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

  await githubRequest(fetch, `${BASE}/gists/${gistId}`, {
    method: 'PATCH',
    headers: headers(pat),
    body: JSON.stringify({ files: bodyFiles }),
  }, '写入 Gist 失败')
}
