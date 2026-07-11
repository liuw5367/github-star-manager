export type NotificationKind = 'success' | 'info' | 'warning' | 'error'

export interface AppNotification {
  id: string
  kind: NotificationKind
  message: string
  title?: string
  persistent: boolean
  dedupeKey?: string
  actionLabel?: string
  action?: () => void | Promise<void>
}

export function addNotification(
  notifications: AppNotification[],
  incoming: AppNotification,
): AppNotification[] {
  if (incoming.dedupeKey) {
    const index = notifications.findIndex(item => item.dedupeKey === incoming.dedupeKey)
    if (index >= 0) {
      return notifications.map((item, itemIndex) => itemIndex === index
        ? { ...incoming, id: item.id }
        : item)
    }
  }
  return [...notifications, incoming].slice(-3)
}
