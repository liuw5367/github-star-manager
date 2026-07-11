interface NamedItem {
  name: string
}

type RandomId = () => string

function defaultRandomId(): string {
  return crypto.randomUUID()
}

export function createCategoryId(randomId: RandomId = defaultRandomId): string {
  return `cat_${randomId()}`
}

export function createTagId(randomId: RandomId = defaultRandomId): string {
  return `tag_${randomId()}`
}

export function hasDuplicateName(items: NamedItem[], name: string, excludedId?: string): boolean {
  const normalized = name.trim().toLocaleLowerCase()
  return items.some(item => item.name.trim().toLocaleLowerCase() === normalized
    && (!excludedId || !('id' in item) || item.id !== excludedId))
}
