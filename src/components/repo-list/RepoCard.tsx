import type { Repo } from '../../types'
import { useRef, useState } from 'react'
import { formatStars, getLanguageColor, formatISODate } from '../../lib/utils'
import { useTagStore } from '../../stores/tagStore'
import { EditIcon, NoteIcon, StarIcon } from '../shared/Icons'
import { TagPill } from '../shared/TagPill'
import { RepoTagPicker } from './RepoTagPicker'

interface RepoCardProps {
  repo: Repo
  isSelected: boolean
  onClick: () => void
}

export function RepoCard({ repo, isSelected, onClick }: RepoCardProps) {
  const categories = useTagStore(s => s.categories)
  const [editingNote, setEditingNote] = useState(false)
  const [noteText, setNoteText] = useState(repo.note || '')
  const [showTagPicker, setShowTagPicker] = useState(false)
  const tagAreaRef = useRef<HTMLDivElement>(null)

  const tagNames = (repo.tags || []).map((tagId) => {
    for (const cat of categories) {
      const found = cat.tags.find(t => t.id === tagId)
      if (found)
        return { id: tagId, name: found.name }
    }
    return { id: tagId, name: tagId }
  })

  return (
    <div
      onClick={onClick}
      className={`group border-b border-gh-border-muted cursor-pointer transition-colors ${isSelected ? 'bg-gh-accent/5 border-l-2 !border-l-gh-accent' : 'hover:bg-gh-canvas/60 border-l-2 border-l-transparent'}`}
      style={{ padding: '12px 12px 10px' }}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="min-w-0 flex-1 flex items-center gap-2">
          <img
            src={`https://github.com/${repo.full_name.split('/')[0]}.png?size=20`}
            alt=""
            className="w-4 h-4 rounded-full flex-shrink-0 mt-0.5"
          />
          <span className="text-sm font-semibold text-gh-accent hover:underline truncate block">
            {repo.full_name}
          </span>
        </div>
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button
            onClick={(e) => { e.stopPropagation() }}
            className="p-1.5 rounded hover:bg-gh-canvas-subtle transition-colors"
            title="取消 Star"
            style={{ minWidth: 32, minHeight: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <StarIcon filled size={14} />
          </button>
          <button
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
        <p className="text-xs text-gh-fg-muted leading-relaxed mb-1.5" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {repo.description}
        </p>
      )}

      {repo.topics && repo.topics.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap mb-1.5">
          {repo.topics.map(topic => (
            <span key={topic} className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded-full bg-gh-canvas text-gh-accent border border-gh-border leading-none">
              {topic}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3 text-xs text-gh-fg-muted mb-1.5 flex-wrap">
        {repo.language && (
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: getLanguageColor(repo.language) }} />
            {repo.language}
          </span>
        )}
        <span className="flex items-center gap-0.5">
          <StarIcon size={12} />
          {formatStars(repo.stargazers_count)}
        </span>
        <span className="flex-1" />
        <span>
          更新:
          {formatISODate(repo.updated_at)}
        </span>
        <span>
          Starred:
          {formatISODate(repo.starred_at)}
        </span>
      </div>

      <div className="flex items-center gap-1 flex-wrap relative" ref={tagAreaRef}>
        {tagNames.map(t => (
          <TagPill key={t.id} name={t.name} />
        ))}
        <button
          onClick={(e) => {
            e.stopPropagation()
            setShowTagPicker(!showTagPicker)
          }}
          className="inline-flex items-center gap-0.5 text-xs text-gh-accent hover:underline"
        >
          + 添加标签
        </button>
        {showTagPicker && (
          <RepoTagPicker
            repo={repo}
            anchorRef={tagAreaRef}
            onClose={() => setShowTagPicker(false)}
          />
        )}
      </div>

      {editingNote && (
        <div className="mt-2" onClick={e => e.stopPropagation()}>
          <textarea
            className="gh-input text-xs resize-none"
            rows={2}
            placeholder="添加备注..."
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
            autoFocus
            onBlur={() => setEditingNote(false)}
          />
        </div>
      )}

      {!editingNote && repo.note && (
        <div className="mt-1 flex items-start gap-1.5 text-xs text-gh-fg-muted">
          <span className="mt-0.5 flex-shrink-0">📝</span>
          <span className="truncate">{repo.note}</span>
        </div>
      )}
    </div>
  )
}
