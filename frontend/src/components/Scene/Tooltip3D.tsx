import { useEffect, useRef } from 'react'
import type { PlacedItemOut } from '../../types/api'
import { modelColor } from '../../store/useAppStore'

interface Props {
  item: PlacedItemOut | null
  order: number
  x: number
  y: number
}

export default function Tooltip3D({ item, order, x, y }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current || !item) return
    const el = ref.current
    const vw = window.innerWidth
    const vh = window.innerHeight
    const ew = el.offsetWidth
    const eh = el.offsetHeight
    el.style.left = Math.min(x + 14, vw - ew - 8) + 'px'
    el.style.top  = Math.min(y + 14, vh - eh - 8) + 'px'
  }, [x, y, item])

  if (!item) return null

  const color = modelColor(item.model)

  return (
    <div
      ref={ref}
      style={{ position: 'fixed', pointerEvents: 'none', zIndex: 9999 }}
      className="bg-[#1a1a1a]/95 border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-xs shadow-xl backdrop-blur-sm"
    >
      <div className="flex items-center gap-2 mb-1.5">
        <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: color }} />
        <span className="font-semibold text-[#ddd]">{item.model}</span>
      </div>
      <div className="text-[#888] space-y-0.5">
        <div className="flex gap-3">
          <span className="text-[#555]">名称</span>
          <span className="text-[#bbb]">{item.name}</span>
        </div>
        <div className="flex gap-3">
          <span className="text-[#555]">重量</span>
          <span className="text-[#bbb]">{item.weight} kg</span>
        </div>
        <div className="flex gap-3">
          <span className="text-[#555]">支撑率</span>
          <span className="text-[#bbb]">{(item.support_ratio * 100).toFixed(1)}%</span>
        </div>
        <div className="flex gap-3">
          <span className="text-[#555]">装载序</span>
          <span className="text-[#c9a96e]">#{order}</span>
        </div>
        {item.rotation === 90 && (
          <div className="text-[#a47fe8] pt-0.5">↻ 已旋转 90°</div>
        )}
      </div>
    </div>
  )
}
