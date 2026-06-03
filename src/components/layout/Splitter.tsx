import { useCallback, useEffect, useRef } from 'react'

interface SplitterProps {
  onResize: (delta: number) => void
}

export function Splitter({ onResize }: SplitterProps) {
  const draggingRef = useRef(false)
  const startXRef = useRef(0)

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    draggingRef.current = true
    startXRef.current = e.clientX
    e.preventDefault()
  }, [])

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!draggingRef.current)
        return
      const delta = e.clientX - startXRef.current
      if (Math.abs(delta) < 2)
        return
      onResize(delta)
      startXRef.current = e.clientX
    }

    const onMouseUp = () => {
      draggingRef.current = false
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
    return () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
  }, [onResize])

  return (
    <div
      onMouseDown={onMouseDown}
      className="flex-shrink-0 relative cursor-col-resize hover:bg-gh-accent/30 transition-colors"
      style={{ width: 5, marginLeft: 0, marginRight: 0 }}
    >
      <div className="absolute inset-y-0 left-0 w-px bg-gh-border" />
    </div>
  )
}
