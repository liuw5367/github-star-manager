import { useCallback, useEffect, useRef } from 'react'

interface SplitterProps {
  onResize: (delta: number) => void
}

export function Splitter({ onResize }: SplitterProps) {
  const draggingRef = useRef(false)
  const startXRef = useRef(0)

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    draggingRef.current = true
    startXRef.current = e.clientX
    e.preventDefault()
  }, [])

  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      if (!draggingRef.current)
        return
      const delta = e.clientX - startXRef.current
      if (Math.abs(delta) < 2)
        return
      onResize(delta)
      startXRef.current = e.clientX
    }

    const onPointerUp = () => {
      draggingRef.current = false
    }

    document.addEventListener('pointermove', onPointerMove)
    document.addEventListener('pointerup', onPointerUp)
    return () => {
      document.removeEventListener('pointermove', onPointerMove)
      document.removeEventListener('pointerup', onPointerUp)
    }
  }, [onResize])

  return (
    <div
      role="separator"
      aria-label="调整面板宽度"
      aria-orientation="vertical"
      tabIndex={0}
      onPointerDown={onPointerDown}
      onKeyDown={(event) => {
        if (event.key === 'ArrowLeft')
          onResize(-10)
        if (event.key === 'ArrowRight')
          onResize(10)
      }}
      className="flex-shrink-0 relative cursor-col-resize hover:bg-gh-accent/30 transition-colors"
      style={{ width: 5, marginLeft: 0, marginRight: 0 }}
    >
      <div className="absolute inset-y-0 left-0 w-px bg-gh-border" />
    </div>
  )
}
