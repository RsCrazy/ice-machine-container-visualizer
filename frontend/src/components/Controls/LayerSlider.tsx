import { useAppStore } from '../../store/useAppStore'

export default function LayerSlider() {
  const { packResult, activeBin, layerHeight, setLayerHeight } = useAppStore()
  const maxH = packResult?.bins[activeBin]?.container_h ?? 2393

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-[#161616] border-t border-[#2a2a2a]">
      <span className="text-[10px] uppercase tracking-widest text-[#444] whitespace-nowrap">分层</span>
      <input
        type="range"
        min={0}
        max={maxH}
        step={10}
        value={Math.min(layerHeight, maxH)}
        onChange={(e) => setLayerHeight(Number(e.target.value))}
        className="flex-1 accent-[#c9a96e] h-1"
      />
      <span className="text-xs text-[#666] w-16 text-right tabular-nums">
        {layerHeight >= maxH - 1 ? '全部' : `${layerHeight} mm`}
      </span>
    </div>
  )
}
