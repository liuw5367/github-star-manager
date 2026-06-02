import { useEffect } from 'react'
import { useAuthStore } from './stores/authStore'
import { useRepoStore } from './stores/repoStore'
import { useTagStore } from './stores/tagStore'
import AppShell from './components/layout/AppShell'
import { AuthPage } from './components/auth/AuthPage'
import { getUser } from './api/github'
import { getGistFiles } from './api/gist'

export default function App() {
  const isAuth = useAuthStore(s => s.isAuth)
  const checking = useAuthStore(s => s.checking)
  const login = useAuthStore(s => s.login)
  const setCheckingDone = useAuthStore(s => s.setCheckingDone)
  const setGistId = useAuthStore(s => s.setGistId)
  const setRepos = useRepoStore(s => s.setRepos)
  const setCategories = useTagStore(s => s.setCategories)
  const seedDefaultCategories = useTagStore(s => s.seedDefaultCategories)

  useEffect(() => {
    if (isAuth) return
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
              if (cats.categories?.length) setCategories(cats.categories)
            }
            catch {}
          }
          if (files['tags.json']) {
            try {
              const tagMap = JSON.parse(files['tags.json'])
              const cached = localStorage.getItem('gsm_repo_cache')
              if (!cached || cached === '[]') {
                const repos = Object.entries(tagMap).map(([full_name, tags]) => ({
                  full_name,
                  description: '',
                  language: null,
                  stargazers_count: 0,
                  updated_at: '',
                  starred_at: '',
                  tags: tags as string[],
                  note: '',
                }))
                setRepos(repos)
              }
            }
            catch {}
          }
        }
        else {
          seedDefaultCategories()
        }
        login(storedPat, user)
      }
      catch {
        localStorage.removeItem('github_star_manager_pat')
        localStorage.removeItem('github_star_manager_gist_id')
        setCheckingDone()
      }
    })()
  }, [])

  if (checking) {
    return (
      <div className="flex h-screen items-center justify-center bg-white dark:bg-gh-canvas">
        <div className="text-sm text-gh-fg-muted">验证登录状态...</div>
      </div>
    )
  }

  if (!isAuth) return <AuthPage />

  return <AppShell />
}
