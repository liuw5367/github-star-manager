import type { Repo } from './types'
import { useEffect } from 'react'
import { getGistFiles } from './api/gist'
import { getUser } from './api/github'
import { AuthPage } from './components/auth/AuthPage'
import AppShell from './components/layout/AppShell'
import { useAuthStore } from './stores/authStore'
import { useRepoStore } from './stores/repoStore'
import { useTagStore } from './stores/tagStore'

function mergeRemoteRepoData(
  cachedRepos: Repo[],
  tagMap: Record<string, string[]>,
  noteMap: Record<string, string>,
): Repo[] {
  const cachedMap = new Map(cachedRepos.map(repo => [repo.full_name, repo]))
  const repoNames = new Set([
    ...cachedRepos.map(repo => repo.full_name),
    ...Object.keys(tagMap),
    ...Object.keys(noteMap),
  ])

  return [...repoNames].map((fullName) => {
    const cached = cachedMap.get(fullName)
    const languageTags = cached?.tags.filter(tagId => tagId.startsWith('tag_lang_')) ?? []

    return {
      full_name: fullName,
      description: cached?.description ?? '',
      language: cached?.language ?? null,
      topics: cached?.topics ?? [],
      stargazers_count: cached?.stargazers_count ?? 0,
      updated_at: cached?.updated_at ?? '',
      starred_at: cached?.starred_at ?? '',
      tags: [...languageTags, ...(tagMap[fullName] ?? cached?.tags.filter(tagId => !tagId.startsWith('tag_lang_')) ?? [])],
      note: noteMap[fullName] ?? cached?.note ?? '',
    }
  })
}

export default function App() {
  const isAuth = useAuthStore(s => s.isAuth)
  const checking = useAuthStore(s => s.checking)
  const login = useAuthStore(s => s.login)
  const setCheckingDone = useAuthStore(s => s.setCheckingDone)
  const setRepos = useRepoStore(s => s.setRepos)
  const setCategories = useTagStore(s => s.setCategories)

  useEffect(() => {
    if (isAuth)
      return
    const storedPat = localStorage.getItem('github_star_manager_pat')
    const storedGist = localStorage.getItem('github_star_manager_gist_id')

    if (!storedPat) {
      setCheckingDone()
      return
    }

    ;(async () => {
      try {
        const user = await getUser(storedPat)
        if (storedGist) {
          const files = await getGistFiles(storedGist, storedPat)
          if (files['categories.json']) {
            try {
              const cats = JSON.parse(files['categories.json'])
              setCategories(cats.categories ?? [])
            }
            catch {}
          }

          let remoteTagMap: Record<string, string[]> = {}
          let remoteNoteMap: Record<string, string> = {}

          if (files['tags.json']) {
            try {
              remoteTagMap = JSON.parse(files['tags.json'])
            }
            catch {}
          }

          if (files['notes.json']) {
            try {
              remoteNoteMap = JSON.parse(files['notes.json'])
            }
            catch {}
          }

          const mergedRepos = mergeRemoteRepoData(
            useRepoStore.getState().repos,
            remoteTagMap,
            remoteNoteMap,
          )

          if (mergedRepos.length > 0)
            setRepos(mergedRepos)
        }
        login(storedPat, user)

        const repos = useRepoStore.getState().repos
        if (repos.length > 0)
          useTagStore.getState().ensureAutoCategories(repos)
      }
      catch {
        localStorage.removeItem('github_star_manager_pat')
        localStorage.removeItem('github_star_manager_gist_id')
        setCheckingDone()
      }
    })()
  }, [isAuth, login, setCategories, setCheckingDone, setRepos])

  if (checking) {
    return (
      <div className="flex h-screen items-center justify-center bg-white dark:bg-gh-canvas">
        <div className="flex flex-col items-center gap-3">
          <svg
            width="32"
            height="32"
            viewBox="0 0 16 16"
            fill="currentColor"
            className="text-gh-fg-muted"
          >
            <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.87-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z" />
          </svg>
          <div className="flex items-center gap-2 text-sm text-gh-fg-muted">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="animate-spin">
              <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeDasharray="28" strokeLinecap="round" />
            </svg>
            验证登录状态...
          </div>
        </div>
      </div>
    )
  }

  if (!isAuth)
    return <AuthPage />

  return <AppShell />
}
