import type { Repo } from '../../types'
import { useRef, useState } from 'react'
import { formatISODate, formatStars, getLanguageColor } from '../../lib/utils'
import { useRepoStore } from '../../stores/repoStore'
import { useTagStore } from '../../stores/tagStore'
import { useUiStore } from '../../stores/uiStore'
import { EditIcon, ExternalIcon, NoteIcon, StarIcon } from '../shared/Icons'
import { TagPill } from '../shared/TagPill'
import { RepoTagPicker } from './RepoTagPicker'

interface RepoCardProps {
  repo: Repo
  isSelected: boolean
  onClick: () => void
}

export function RepoCard({ repo, isSelected, onClick }: RepoCardProps) {
  const categories = useTagStore(s => s.categories)
  const setNote = useRepoStore(s => s.setNote)
  const setRepoStarred = useRepoStore(s => s.setRepoStarred)
  const retainRepoInCurrentView = useUiStore(s => s.retainRepoInCurrentView)
  const setToast = useUiStore(s => s.setToast)
  const [editingNote, setEditingNote] = useState(false)
  const [noteText, setNoteText] = useState(repo.note || '')
  const [showTagPicker, setShowTagPicker] = useState(false)
  const [updatingStar, setUpdatingStar] = useState(false)
  const editTagBtnRef = useRef<HTMLButtonElement>(null)
  const tagAreaRef = useRef<HTMLDivElement>(null)
  const isStarred = !repo.trashed_at

  const handleStarToggle = async () => {
    retainRepoInCurrentView(repo.full_name)
    setUpdatingStar(true)
    try {
      await setRepoStarred(repo.full_name, !isStarred)
      setToast({ message: isStarred ? '已取消 Star，可在回收站中恢复' : '已恢复 Star', type: 'success' })
    }
    catch (err) {
      setToast({ message: err instanceof Error ? err.message : 'Star 操作失败', type: 'error' })
    }
    finally {
      setUpdatingStar(false)
    }
  }

  const tagNames = (repo.tags || []).flatMap((tagId) => {
    for (const cat of categories) {
      const found = cat.tags.find(t => t.id === tagId)
      if (found)
        return [{ id: tagId, name: found.name }]
    }
    return []
  })

  return (
    <div
      onClick={onClick}
      className={`group border-b border-gh-border-muted cursor-pointer transition-colors ${isSelected ? 'bg-gh-accent/5 border-l-2 !border-l-gh-accent' : 'hover:bg-gh-canvas/60 border-l-2 border-l-transparent'}`}
      style={{ padding: '12px 12px 10px' }}
    >
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="min-w-0 flex-1 flex items-center gap-2">
          <img
            src={`https://github.com/${repo.full_name.split('/')[0]}.png?size=20`}
            alt=""
            className="w-4 h-4 rounded-full flex-shrink-0 mt-0.5"
          />
          <span className="text-ui-body font-semibold text-gh-accent truncate block">
            {repo.full_name}
          </span>
          <span className="flex items-center gap-0.5 text-ui-caption text-gh-fg-muted flex-shrink-0">
            <StarIcon size={12} />
            {formatStars(repo.stargazers_count)}
          </span>
          <a
            href={`https://github.com/${repo.full_name}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={event => event.stopPropagation()}
            className="text-gh-fg-muted hover:text-gh-accent flex-shrink-0"
            title="在 GitHub 打开"
            aria-label={`在 GitHub 打开 ${repo.full_name}`}
          >
            <ExternalIcon />
          </a>
        </div>
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation()
              void handleStarToggle()
            }}
            disabled={updatingStar}
            className="p-1.5 rounded hover:bg-gh-canvas-subtle transition-colors disabled:opacity-50 disabled:cursor-wait"
            title={isStarred ? '取消 Star' : '恢复 Star'}
            style={{ minWidth: 32, minHeight: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <StarIcon filled={isStarred} size={14} />
          </button>
          <button
            ref={editTagBtnRef}
            onClick={(e) => {
              e.stopPropagation()
              setShowTagPicker(!showTagPicker)
            }}
            className="p-1.5 rounded hover:bg-gh-canvas-subtle transition-colors text-gh-fg-muted hover:text-gh-fg"
            title="编辑标签"
            style={{ minWidth: 32, minHeight: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <EditIcon />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              setNoteText(repo.note || '')
              setEditingNote(!editingNote)
            }}
            className="p-1.5 rounded hover:bg-gh-canvas-subtle transition-colors text-gh-fg-muted hover:text-gh-fg"
            title="编辑备注"
            style={{ minWidth: 32, minHeight: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <NoteIcon />
          </button>
        </div>
      </div>

      {repo.description && (
        <p
          className="text-ui-body text-gh-fg-muted leading-relaxed mb-2"
          title={repo.description}
          style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
        >
          {repo.description}
        </p>
      )}

      {repo.topics && repo.topics.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap mb-2">
          {repo.topics.map(topic => (
            <span key={topic} className="inline-flex items-center px-2 py-0.5 text-ui-caption font-medium rounded-full bg-gh-canvas text-gh-accent border border-gh-border leading-none">
              {topic}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3 text-ui-caption text-gh-fg-muted mb-2 flex-wrap">
        {repo.language && (
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: getLanguageColor(repo.language) }} />
            {repo.language}
          </span>
        )}
        <span className="flex-1" />
        <span>
          最后更新：
          {formatISODate(repo.updated_at)}
        </span>
        <span>
          关注时间：
          {formatISODate(repo.starred_at)}
        </span>
      </div>

      {tagNames.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap relative" ref={tagAreaRef}>
          {tagNames.map(t => (
            <TagPill key={t.id} name={t.name} />
          ))}
        </div>
      )}
      {showTagPicker && (
        <RepoTagPicker
          repo={repo}
          anchorRef={editTagBtnRef}
          onClose={() => setShowTagPicker(false)}
        />
      )}

      {editingNote && (
        <div className="mt-2" onClick={e => e.stopPropagation()}>
          <textarea
            className="gh-input text-ui-caption resize-none"
            rows={2}
            placeholder="添加备注..."
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
            autoFocus
            onBlur={() => {
              setNote(repo.full_name, noteText.trim())
              setEditingNote(false)
            }}
          />
        </div>
      )}

      {!editingNote && repo.note && (
        <div className="mt-1 flex items-start gap-1.5 text-ui-caption text-gh-fg-muted">
          <span className="mt-0.5 flex-shrink-0">📝</span>
          <span className="truncate">{repo.note}</span>
        </div>
      )}
    </div>
  )
}
