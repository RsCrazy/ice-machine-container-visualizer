import { useAppStore } from '../../store/useAppStore'

export default function StatsPanel() {
  const { packResult, activeBin } = useAppStore()

  if (!packResult) return null

  const { stats } = packResult
  const bin = packResult.bins[activeBin]

  const rows = [
    { label: '集装箱数',   value: `${stats.num_containers}（下界 ${stats.lower_bound}）`, gold: stats.gap === 0 },
    { label: '本箱件数',   value: bin ? `${bin.placed.length} 件` : '—' },
    { label: '本箱填充率', value: bin ? `${(bin.fill_ratio * 100).toFixed(1)}%` : '—' },
    { label: '本箱总重',   value: bin ? `${bin.total_weight_kg.toLocaleString()} kg` : '—' },
    { label: '总重量',     value: `${stats.total_weight_kg.toLocaleString()} kg` },
    { label: '体积利用率', value: `${stats.volume_util_pct}%` },
  ]

  if (stats.unplaced_count > 0) {
    rows.push({ label: '⚠ 未装载', value: `${stats.unplaced_count} 件`, gold: false })
  }

  return (
    <div className="px-4 py-3 border-t border-[#2a2a2a]">
      <div className="text-[10px] uppercase tracking-widest text-[#444] mb-2">统计</div>
      <div className="space-y-1.5">
        {rows.map((r) => (
          <div key={r.label} className="flex justify-between text-xs">
            <span className="text-[#555]">{r.label}</span>
            <span className={r.gold ? 'text-[#c9a96e]' : 'text-[#aaa]'}>{r.value}</span>
          </div>
        ))}
      </div>
      {stats.gap === 0 && (
        <div className="mt-2 text-[10px] text-[#50c87a]">✓ 已达理论最优</div>
      )}
    </div>
  )
}
