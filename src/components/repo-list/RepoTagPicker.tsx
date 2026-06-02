import type { Repo } from '../../types'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRepoStore } from '../../stores/repoStore'
import { useTagStore } from '../../stores/tagStore'
import { useUiStore } from '../../stores/uiStore'
import { CheckIcon, PlusIcon, SearchIcon } from '../shared/Icons'

interface RepoTagPickerProps {
  repo: Repo
  anchorRef: React.RefObject<HTMLElement | null>
  onClose: () => void
}

export function RepoTagPicker({ repo, anchorRef, onClose }: RepoTagPickerProps) {
  const categories = useTagStore(s => s.categories)
  const addTag = useTagStore(s => s.addTag)
  const toggleTag = useRepoStore(s => s.toggleTag)
  const setToast = useUiStore(s => s.setToast)

  const [search, setSearch] = useState('')
  const [newTagName, setNewTagName] = useState('')
  const [newTagCat, setNewTagCat] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ top: 0, left: 0 })

  useEffect(() => {
    if (anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect()
      const pickerW = 320
      const pickerH = 400
      const spaceBelow = window.innerHeight - rect.bottom
      const top = spaceBelow >= pickerH || spaceBelow > rect.top
        ? rect.bottom + 4
        : rect.top - pickerH - 4
      let left = rect.left
      if (left + pickerW > window.innerWidth - 16)
        left = window.innerWidth - pickerW - 16
      if (left < 16)
        left = 16
      setPos({ top, left })
    }
  }, [anchorRef])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)
        && anchorRef.current && !anchorRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose, anchorRef])

  const filteredCats = categories.map(cat => ({
    ...cat,
    tags: cat.tags.filter(t => !search || t.name.toLowerCase().includes(search.toLowerCase())),
  })).filter(cat => cat.tags.length > 0)

  const repoTagSet = new Set(repo.tags || [])

  const handleCreate = () => {
    if (!newTagName.trim() || !newTagCat)
      return
    const tagId = `tag_${newTagName.trim().toLowerCase().replace(/[^a-z0-9]/gu, '_').replace(/_+/g, '_')}`
    addTag(newTagCat, newTagName.trim())
    toggleTag(repo.full_name, tagId)
    setNewTagName('')
    setNewTagCat('')
    setShowCreate(false)
    setToast({ message: `标签 "${newTagName.trim()}" 已创建并添加`, type: 'success' })
  }

  return createPortal(
    <div
      className="fixed bg-white dark:bg-gh-canvas border border-gh-border rounded-lg shadow-lg z-60 flex flex-col"
      ref={pickerRef}
      onClick={e => e.stopPropagation()}
      style={{ top: pos.top, left: pos.left, width: 320, maxHeight: 400 }}
    >
      <div className="p-2 border-b border-gh-border-muted">
        <div className="relative">
          <div className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none"><SearchIcon /></div>
          <input
            type="text"
            placeholder="搜索标签..."
            className="gh-input text-xs"
            style={{ height: 28, paddingLeft: 28 }}
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-1" style={{ maxHeight: 280 }}>
        {filteredCats.map(cat => (
          <div key={cat.id} className="mb-1">
            <div className="px-2 py-1 text-xs font-medium text-gh-fg-muted/60 uppercase tracking-wide">{cat.name}</div>
            {cat.tags.map((tag) => {
              const checked = repoTagSet.has(tag.id)
              return (
                <div
                  key={tag.id}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-md cursor-pointer hover:bg-gh-canvas transition-colors text-sm"
                  onClick={() => toggleTag(repo.full_name, tag.id)}
                >
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${checked ? 'bg-gh-accent border-gh-accent' : 'border-gh-border bg-white dark:bg-gh-canvas'}`}>
                    {checked && <CheckIcon />}
                  </div>
                  <span className={checked ? 'text-gh-fg font-medium' : 'text-gh-fg'}>{tag.name}</span>
                </div>
              )
            })}
          </div>
        ))}
        {filteredCats.length === 0 && (
          <p className="text-xs text-gh-fg-muted text-center py-4">没有匹配的标签</p>
        )}
      </div>

      {showCreate
        ? (
            <div className="p-2 border-t border-gh-border-muted space-y-2">
              <select
                className="gh-select text-xs w-full"
                value={newTagCat}
                onChange={e => setNewTagCat(e.target.value)}
                style={{ minHeight: 28 }}
              >
                <option value="">选择分类...</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
              <div className="flex items-center gap-1">
                <input
                  className="gh-input text-xs flex-1"
                  style={{ height: 28, padding: '2px 8px' }}
                  placeholder="新标签名称..."
                  value={newTagName}
                  onChange={e => setNewTagName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter')
                      handleCreate()
                  }}
                />
                <button onClick={handleCreate} className="gh-btn gh-btn-primary gh-btn-sm" style={{ padding: '3px 10px', fontSize: 11 }}>创建</button>
                <button onClick={() => setShowCreate(false)} className="gh-btn gh-btn-default gh-btn-sm" style={{ padding: '3px 10px', fontSize: 11 }}>取消</button>
              </div>
            </div>
          )
        : (
            <div className="p-2 border-t border-gh-border-muted">
              <button
                onClick={() => {
                  setShowCreate(true)
                  setNewTagCat(categories[0]?.id || '')
                }}
                className="flex items-center gap-1.5 w-full px-2 py-1.5 text-xs text-gh-accent hover:bg-gh-accent/5 rounded transition-colors"
              >
                <PlusIcon />
                {' '}
                创建新标签并添加
              </button>
            </div>
          )}
    </div>,
    document.body,
  )
}
