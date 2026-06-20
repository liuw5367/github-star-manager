import type { Category } from '../../types'
import { useState } from 'react'
import { persistRepoSnapshot, reconcileReposWithCategories, splitReposByTrash } from '../../lib/repoPersistence'
import { useAuthStore } from '../../stores/authStore'
import { useRepoStore } from '../../stores/repoStore'
import { useTagStore } from '../../stores/tagStore'
import { useUiStore } from '../../stores/uiStore'
import { CloseIcon, EditIcon, PlusIcon, TrashIcon } from '../shared/Icons'

export function TagManagerModal() {
  const categories = useTagStore(s => s.categories)
  const setCategories = useTagStore(s => s.setCategories)
  const repos = useRepoStore(s => s.repos)
  const setRepos = useRepoStore(s => s.setRepos)
  const lastSynced = useRepoStore(s => s.lastSynced)
  const setShowTagManager = useUiStore(s => s.setShowTagManager)
  const setToast = useUiStore(s => s.setToast)
  const pat = useAuthStore(s => s.pat)
  const gistId = useAuthStore(s => s.gistId)
  const user = useAuthStore(s => s.user)

  const [localCats, setLocalCats] = useState<Category[]>(JSON.parse(JSON.stringify(categories)))
  const [newTagName, setNewTagName] = useState('')
  const [newTagTargetCat, setNewTagTargetCat] = useState<string | null>(null)
  const [editingTagId, setEditingTagId] = useState<string | null>(null)
  const [editingTagName, setEditingTagName] = useState('')
  const [newCatName, setNewCatName] = useState('')
  const [showNewCat, setShowNewCat] = useState(false)

  const handleAddTag = (catId: string) => {
    if (!newTagName.trim())
      return
    const tagId = `tag_${newTagName.trim().toLowerCase().replace(/[^a-z0-9]/gu, '_').replace(/_+/g, '_')}`
    setLocalCats(prev => prev.map(cat =>
      cat.id === catId
        ? { ...cat, tags: [...cat.tags, { id: tagId, name: newTagName.trim(), order: cat.tags.length }] }
        : cat,
    ))
    setNewTagName('')
    setNewTagTargetCat(null)
  }

  const handleDeleteTag = (catId: string, tagId: string) => {
    setLocalCats(prev => prev.map(cat =>
      cat.id === catId
        ? { ...cat, tags: cat.tags.filter(t => t.id !== tagId) }
        : cat,
    ))
  }

  const handleSaveTagName = (catId: string, tagId: string) => {
    if (!editingTagName.trim())
      return
    setLocalCats(prev => prev.map(cat =>
      cat.id === catId
        ? { ...cat, tags: cat.tags.map(t => t.id === tagId ? { ...t, name: editingTagName.trim() } : t) }
        : cat,
    ))
    setEditingTagId(null)
    setEditingTagName('')
  }

  const handleAddCategory = () => {
    if (!newCatName.trim())
      return
    const catId = `cat_${newCatName.trim().toLowerCase().replace(/[^a-z0-9]/gu, '_').replace(/_+/g, '_')}`
    setLocalCats(prev => [...prev, { id: catId, name: newCatName.trim(), order: prev.length, tags: [] }])
    setNewCatName('')
    setShowNewCat(false)
  }

  const handleDeleteCategory = (catId: string) => {
    setLocalCats(prev => prev.filter(c => c.id !== catId))
  }

  const handleSave = async () => {
    const nextRepos = reconcileReposWithCategories(repos, localCats)
    setCategories(localCats)
    setRepos(nextRepos)

    try {
      if (pat && gistId && user) {
        await persistRepoSnapshot({
          repos: nextRepos,
          categories: localCats,
          ownerLogin: user.login,
          lastSynced,
          totalStarred: splitReposByTrash(nextRepos).activeRepos.length,
          gistId,
          pat,
        })
      }
      setShowTagManager(false)
      setToast({ message: '标签已保存', type: 'success' })
    }
    catch (err) {
      setToast({ message: err instanceof Error ? err.message : '保存标签失败', type: 'error' })
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-100 flex items-center justify-center" onClick={() => setShowTagManager(false)}>
      <div
        className="bg-white dark:bg-gh-canvas border border-gh-border rounded-xl shadow-lg w-[520px] max-w-[calc(100vw-32px)] max-h-[calc(100vh-48px)] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gh-border-muted">
          <h3 className="text-ui-body font-semibold text-gh-fg">管理标签</h3>
          <button onClick={() => setShowTagManager(false)} className="p-1 rounded hover:bg-gh-canvas transition-colors text-gh-fg-muted">
            <CloseIcon />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ maxHeight: 480 }}>
          {localCats.map(cat => (
            <div key={cat.id} className="border border-gh-border-muted rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 bg-gh-canvas/50 border-b border-gh-border-muted">
                <span className="text-ui-caption font-semibold text-gh-fg">{cat.name}</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setNewTagTargetCat(cat.id)
                      setNewTagName('')
                    }}
                    className="p-1 rounded hover:bg-gh-canvas-subtle transition-colors text-gh-fg-muted hover:text-gh-accent"
                    title="添加标签"
                  >
                    <PlusIcon size={14} />
                  </button>
                  <button
                    onClick={() => handleDeleteCategory(cat.id)}
                    className="p-1 rounded hover:bg-gh-danger-subtle transition-colors text-gh-fg-muted hover:text-gh-danger"
                    title="删除分类"
                  >
                    <TrashIcon />
                  </button>
                </div>
              </div>

              <div className="p-2 space-y-0.5">
                {cat.tags.length === 0 && (
                  <p className="text-ui-caption text-gh-fg-muted/50 px-2 py-1">暂无标签</p>
                )}
                {cat.tags.map(tag => (
                  <div key={tag.id} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-gh-canvas/60 group">
                    {editingTagId === tag.id
                      ? (
                          <div className="flex items-center gap-1 flex-1">
                            <input
                              className="gh-input text-ui-caption flex-1"
                              style={{ height: 26, padding: '2px 8px' }}
                              value={editingTagName}
                              onChange={e => setEditingTagName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter')
                                  handleSaveTagName(cat.id, tag.id)
                                if (e.key === 'Escape')
                                  setEditingTagId(null)
                              }}
                              autoFocus
                            />
                            <button onClick={() => handleSaveTagName(cat.id, tag.id)} className="gh-btn gh-btn-primary gh-btn-sm" style={{ padding: '2px 8px' }}>保存</button>
                            <button onClick={() => setEditingTagId(null)} className="gh-btn gh-btn-default gh-btn-sm" style={{ padding: '2px 8px' }}>取消</button>
                          </div>
                        )
                      : (
                          <>
                            <span className="text-ui-caption text-gh-fg flex-1">{tag.name}</span>
                            <span className="text-ui-caption text-gh-fg-muted/40 font-mono">{tag.id}</span>
                            <button
                              onClick={() => {
                                setEditingTagId(tag.id)
                                setEditingTagName(tag.name)
                              }}
                              className="p-0.5 rounded hover:bg-gh-canvas-subtle transition-colors text-gh-fg-muted opacity-0 group-hover:opacity-100"
                              title="编辑"
                            >
                              <EditIcon />
                            </button>
                            <button
                              onClick={() => handleDeleteTag(cat.id, tag.id)}
                              className="p-0.5 rounded hover:bg-gh-danger-subtle transition-colors text-gh-fg-muted opacity-0 group-hover:opacity-100 hover:text-gh-danger"
                              title="删除"
                            >
                              <TrashIcon />
                            </button>
                          </>
                        )}
                  </div>
                ))}

                {newTagTargetCat === cat.id && (
                  <div className="flex items-center gap-1 px-2 py-1 mt-1 border-t border-gh-border-muted/50">
                    <input
                      className="gh-input text-ui-caption flex-1"
                      style={{ height: 26, padding: '2px 8px' }}
                      placeholder="新标签名称..."
                      value={newTagName}
                      onChange={e => setNewTagName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter')
                          handleAddTag(cat.id)
                        if (e.key === 'Escape')
                          setNewTagTargetCat(null)
                      }}
                      autoFocus
                    />
                    <button onClick={() => handleAddTag(cat.id)} className="gh-btn gh-btn-primary gh-btn-sm" style={{ padding: '2px 8px' }}>添加</button>
                    <button onClick={() => setNewTagTargetCat(null)} className="gh-btn gh-btn-default gh-btn-sm" style={{ padding: '2px 8px' }}>取消</button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {showNewCat
            ? (
                <div className="flex items-center gap-2 p-2 border border-gh-border-muted rounded-lg">
                  <input
                    className="gh-input text-ui-caption flex-1"
                    style={{ height: 28, padding: '2px 8px' }}
                    placeholder="分类名称..."
                    value={newCatName}
                    onChange={e => setNewCatName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter')
                        handleAddCategory()
                      if (e.key === 'Escape')
                        setShowNewCat(false)
                    }}
                    autoFocus
                  />
                  <button onClick={handleAddCategory} className="gh-btn gh-btn-primary gh-btn-sm">添加分类</button>
                  <button onClick={() => setShowNewCat(false)} className="gh-btn gh-btn-default gh-btn-sm">取消</button>
                </div>
              )
            : (
                <button
                  onClick={() => setShowNewCat(true)}
                  className="w-full flex items-center justify-center gap-1.5 py-2 border border-dashed border-gh-border rounded-lg text-ui-caption text-gh-fg-muted hover:text-gh-accent hover:border-gh-accent transition-colors"
                >
                  <PlusIcon />
                  {' '}
                  添加新分类
                </button>
              )}
        </div>

        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-gh-border-muted bg-gh-canvas/30">
          <button onClick={() => setShowTagManager(false)} className="gh-btn gh-btn-default gh-btn-sm">取消</button>
          <button onClick={handleSave} className="gh-btn gh-btn-primary gh-btn-sm">保存更改</button>
        </div>
      </div>
    </div>
  )
}
