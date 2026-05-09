import { useAppStore, modelColor } from '../../store/useAppStore'

export default function CargoList() {
  const { packResult, activeBin, items, highlightedItem, setHighlightedItem, removeItem } = useAppStore()

  // ── After packing: show placed items for active bin ──────────────────────────
  if (packResult) {
    const bin = packResult.bins[activeBin]
    if (!bin) return null
    return (
      <div className="flex-1 min-h-0 overflow-y-auto px-2.5 py-2 flex flex-col gap-1.5">
        {bin.placed.map((p, i) => {
          const color = modelColor(p.model)
          const active = highlightedItem === p.name
          return (
            <button
              key={p.name}
              onClick={() => setHighlightedItem(active ? null : p.name)}
              className={`w-full flex-shrink-0 text-left rounded-lg px-3 py-2.5 border transition-all relative overflow-hidden ${
                active
                  ? 'border-[#c9a96e] bg-[#1f1c17]'
                  : 'border-[#2a2a2a] bg-[#1e1e1e] hover:bg-[#222] hover:border-[#3a3a3a]'
              }`}
            >
              <span className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l" style={{ background: color }} />
              <div className="flex items-center justify-between">
                <div className="pl-1">
                  <div className="text-xs font-medium text-[#ddd] leading-tight">{p.name}</div>
                  <div className="text-[10px] text-[#555] mt-0.5">{p.model}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-[#888]">{p.weight} kg</div>
                  <div className="text-[10px] text-[#555]">#{i + 1}</div>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    )
  }

  // ── Pre-pack: show manifest with delete button ───────────────────────────────
  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-2.5 py-2 flex flex-col gap-1.5">
      {items.length === 0 && (
        <div className="text-xs text-[#333] text-center py-6">清单为空，点击上方「＋ 添加」</div>
      )}
      {items.map((it) => {
        const color = modelColor(it.model)
        return (
          <div
            key={it.name}
            className="flex-shrink-0 rounded-lg px-3 py-2 border border-[#2a2a2a] bg-[#1e1e1e] relative overflow-hidden group hover:border-[#3a3a3a] transition-colors"
          >
            <span className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l" style={{ background: color }} />
            <div className="flex items-center justify-between pl-1">
              <div className="min-w-0 flex-1">
                <div className="text-xs text-[#ddd] truncate">{it.name}</div>
                <div className="text-[10px] text-[#555] truncate">{it.model}</div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                <span className="text-[10px] text-[#888]">{it.weight} kg</span>
                <button
                  onClick={() => removeItem(it.name)}
                  className="text-[#2a2a2a] group-hover:text-[#444] hover:!text-[#e86e6e] transition-colors text-xs w-4 h-4 flex items-center justify-center"
                  title="移除"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
