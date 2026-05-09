import { useAppStore } from '../../store/useAppStore'

const MAX_H = 2393

export default function LayerSlider() {
  const { layerHeight, setLayerHeight } = useAppStore()

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-[#161616] border-t border-[#2a2a2a]">
      <span className="text-[10px] uppercase tracking-widest text-[#444] whitespace-nowrap">分层</span>
      <input
        type="range"
        min={0}
        max={MAX_H}
        step={10}
        value={layerHeight}
        onChange={(e) => setLayerHeight(Number(e.target.value))}
        className="flex-1 accent-[#c9a96e] h-1"
      />
      <span className="text-xs text-[#666] w-16 text-right tabular-nums">
        {layerHeight >= MAX_H - 1 ? '全部' : `${layerHeight} mm`}
      </span>
    </div>
  )
}
