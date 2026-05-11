import { useRef, useState, useEffect, useCallback } from 'react'
import { useAppStore } from '../../store/useAppStore'

export default function BinTabs() {
  const { packResult, activeBin, setActiveBin } = useAppStore()
  const listRef  = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)
  const origin   = useRef({ x: 0, sl: 0 })
  const [arrows, setArrows] = useState({ l: false, r: false })

  const syncArrows = useCallback(() => {
    const el = listRef.current
    if (!el) return
    setArrows({
      l: el.scrollLeft > 2,
      r: el.scrollLeft + el.clientWidth < el.scrollWidth - 2,
    })
  }, [])

  useEffect(() => {
    const el = listRef.current
    if (!el) return
    const handler = (e: WheelEvent) => {
      e.preventDefault()
      el.scrollLeft += e.deltaY + e.deltaX
      syncArrows()
    }
    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  }, [syncArrows])

  useEffect(() => {
    const el = listRef.current
    if (!el) return
    const tab = el.querySelector<HTMLElement>(`[data-idx="${activeBin}"]`)
    tab?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' })
    setTimeout(syncArrows, 350)
  }, [activeBin, syncArrows])

  useEffect(() => { syncArrows() }, [packResult?.bins.length, syncArrows])

  if (!packResult || packResult.bins.length <= 1) return null

  const onMouseDown = (e: React.MouseEvent) => {
    dragging.current = true
    origin.current = { x: e.clientX, sl: listRef.current?.scrollLeft ?? 0 }
  }
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging.current || !listRef.current) return
    listRef.current.scrollLeft = origin.current.sl - (e.clientX - origin.current.x)
    syncArrows()
  }
  const stopDrag = () => { dragging.current = false }

  const nudge = (dir: number) => {
    listRef.current?.scrollBy({ left: dir * 200, behavior: 'smooth' })
    setTimeout(syncArrows, 350)
  }

  return (
    <div
      className="flex items-center gap-1 px-3 py-2 bg-[#161616] border-b border-[#2a2a2a] select-none"
      onMouseMove={onMouseMove}
      onMouseUp={stopDrag}
      onMouseLeave={stopDrag}
    >
      <span className="text-[10px] uppercase tracking-widest text-[#444] flex-shrink-0 mr-1">
        集装箱
      </span>

      <button
        onClick={() => nudge(-1)}
        className={`flex-shrink-0 w-5 h-5 flex items-center justify-center text-lg leading-none rounded transition-colors ${
          arrows.l ? 'text-[#555] hover:text-[#c9a96e]' : 'text-[#252525] pointer-events-none'
        }`}
      >
        ‹
      </button>

      <div
        ref={listRef}
        className="flex items-center gap-1.5 flex-1 overflow-x-auto cursor-grab active:cursor-grabbing"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}
        onScroll={syncArrows}
        onMouseDown={onMouseDown}
      >
        {packResult.bins.map((b, i) => (
          <button
            key={i}
            data-idx={i}
            onClick={() => setActiveBin(i)}
            className={`px-3 py-1 rounded text-xs font-medium transition-all flex-shrink-0 ${
              activeBin === i
                ? 'bg-[#c9a96e]/20 text-[#c9a96e] border border-[#c9a96e]/40'
                : 'text-[#666] border border-[#2a2a2a] hover:border-[#3a3a3a] hover:text-[#999]'
            }`}
          >
            {b.container_type} #{i + 1}
          </button>
        ))}
      </div>

      <button
        onClick={() => nudge(1)}
        className={`flex-shrink-0 w-5 h-5 flex items-center justify-center text-lg leading-none rounded transition-colors ${
          arrows.r ? 'text-[#555] hover:text-[#c9a96e]' : 'text-[#252525] pointer-events-none'
        }`}
      >
        ›
      </button>
    </div>
  )
}
