import { useEffect } from 'react'
import { useUiStore } from '../../stores/uiStore'

export function Toast() {
  const toast = useUiStore(s => s.toast)
  const setToast = useUiStore(s => s.setToast)

  useEffect(() => {
    if (!toast)
      return
    const t = setTimeout(setToast, 3000, null)
    return () => clearTimeout(t)
  }, [toast, setToast])

  if (!toast)
    return null

  const bgMap = {
    success: 'bg-gh-success-subtle border-gh-success text-gh-success',
    error: 'bg-gh-danger-subtle border-gh-danger text-gh-danger',
    info: 'bg-gh-warning-subtle border-gh-warning text-gh-warning',
  }

  return (
    <div className={`toast-enter fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2 rounded-lg border text-ui-body font-medium shadow-lg ${bgMap[toast.type] || bgMap.info}`}>
      {toast.message}
    </div>
  )
}
