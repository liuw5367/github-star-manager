export function TagPill({ name, removable, onRemove }: { name: string, removable?: boolean, onRemove?: () => void }) {
  return (
    <span className="tag-pill">
      {name}
      {removable && onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          className="ml-0.5 hover:text-gh-danger transition-colors"
        >
          ×
        </button>
      )}
    </span>
  )
}
