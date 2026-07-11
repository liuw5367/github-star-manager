import { useEffect } from 'react'
import { useRepoStore } from '../../stores/repoStore'
import { useUiStore } from '../../stores/uiStore'
import { CloseIcon } from './Icons'

function AutoDismiss({ id, delay }: { id: string, delay: number }) {
  const dismiss = useUiStore(s => s.dismissNotification)
  useEffect(() => {
    const timer = window.setTimeout(dismiss, delay, id)
    return () => window.clearTimeout(timer)
  }, [delay, dismiss, id])
  return null
}

export function Toast() {
  const notifications = useUiStore(s => s.notifications)
  const notify = useUiStore(s => s.notify)
  const dismiss = useUiStore(s => s.dismissNotification)
  const cloudSaveState = useRepoStore(s => s.cloudSaveState)
  const retryPendingCloudWrite = useRepoStore(s => s.retryPendingCloudWrite)

  useEffect(() => {
    if (cloudSaveState !== 'pending')
      return
    notify({
      kind: 'warning',
      title: '云端尚未同步',
      message: '修改已保存在本机，请重试写入 Gist。',
      persistent: true,
      dedupeKey: 'pending-cloud-write',
      actionLabel: '重试',
      action: () => retryPendingCloudWrite(),
    })
  }, [cloudSaveState, notify, retryPendingCloudWrite])

  if (notifications.length === 0)
    return null

  const bgMap = {
    success: 'bg-gh-success-subtle border-gh-success text-gh-success',
    error: 'bg-gh-danger-subtle border-gh-danger text-gh-danger',
    warning: 'bg-gh-warning-subtle border-gh-warning text-gh-warning',
    info: 'bg-gh-canvas border-gh-accent text-gh-fg',
  }

  return (
    <div className="fixed top-3 right-3 left-3 z-50 flex flex-col gap-2 sm:left-auto sm:w-[380px]" aria-label="通知">
      {notifications.map(notification => (
        <div
          key={notification.id}
          role={notification.kind === 'error' ? 'alert' : 'status'}
          className={`toast-enter flex items-start gap-3 rounded-lg border px-3 py-2 text-ui-body shadow-lg ${bgMap[notification.kind]}`}
        >
          {!notification.persistent && <AutoDismiss id={notification.id} delay={notification.kind === 'success' ? 3000 : 6000} />}
          <div className="min-w-0 flex-1">
            {notification.title && <div className="font-semibold">{notification.title}</div>}
            <div className="break-words">{notification.message}</div>
          </div>
          {notification.action && notification.actionLabel && (
            <button type="button" className="font-semibold underline underline-offset-2" onClick={() => void notification.action?.()}>
              {notification.actionLabel}
            </button>
          )}
          <button type="button" className="p-1" aria-label="关闭通知" onClick={() => dismiss(notification.id)}>
            <CloseIcon />
          </button>
        </div>
      ))}
    </div>
  )
}
