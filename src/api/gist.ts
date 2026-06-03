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

  if (!res.ok)
    throw new Error(`创建 Gist 失败 (${res.status})`)
  const data = await res.json()
  return data.id
}

export async function getGistFiles(gistId: string, pat: string): Promise<GistFiles> {
  const res = await fetch(`${BASE}/gists/${gistId}`, { headers: headers(pat) })
  if (!res.ok)
    throw new Error(`读取 Gist 失败 (${res.status})`)
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

  if (!res.ok)
    throw new Error(`写入 Gist 失败 (${res.status})`)
}
