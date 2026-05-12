import { useAppStore } from '../../store/useAppStore'

export default function StatsPanel() {
  const { packResult, activeBin } = useAppStore()

  if (!packResult) return null

  const { stats, cost_comparison } = packResult
  const bin = packResult.bins[activeBin]

  const rows = [
    { label: '集装箱数',   value: `${stats.num_containers}（下界 ${stats.lower_bound}）`, gold: stats.gap === 0 },
    { label: '本箱类型',   value: bin ? bin.container_type : '—' },
    { label: '本箱件数',   value: bin ? `${bin.placed.length} 件` : '—' },
    { label: '本箱填充率', value: bin ? `${(bin.fill_ratio * 100).toFixed(1)}%` : '—' },
    { label: '本箱总重',   value: bin ? `${bin.total_weight_kg.toLocaleString()} kg` : '—' },
    { label: '总重量',     value: `${stats.total_weight_kg.toLocaleString()} kg` },
    { label: '体积利用率', value: `${stats.volume_util_pct}%` },
  ]

  if (stats.unplaced_count > 0) {
    rows.push({ label: '⚠ 未装载', value: `${stats.unplaced_count} 件`, gold: false })
  }

  const hasCost    = cost_comparison.length > 0
  const hasNonZero = cost_comparison.some((c) => c.total_cost > 0)
  const bestCost   = hasCost
    ? Math.min(...cost_comparison.map((c) => c.total_cost))
    : -1

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

      {/* ── Solve info ── */}
      {(packResult.solve_time_ms !== undefined || packResult.solve_mode_used) && (
        <div className="mt-2 flex justify-between text-[10px]">
          <span className="text-[#444]">求解算法</span>
          <span className="text-[#555]">{packResult.solve_mode_used ?? '—'}</span>
        </div>
      )}
      {packResult.solve_time_ms !== undefined && packResult.solve_time_ms > 0 && (
        <div className="flex justify-between text-[10px]">
          <span className="text-[#444]">求解耗时</span>
          <span className="text-[#555]">{packResult.solve_time_ms.toFixed(1)} ms</span>
        </div>
      )}

      {/* ── Cost comparison table ── */}
      {hasCost && (
        <div className="mt-3">
          <div className="text-[10px] uppercase tracking-widest text-[#444] mb-1.5">
            容器方案对比
          </div>
          <div className="rounded border border-[#2a2a2a] overflow-hidden">
            <table className="w-full text-[10px]">
              <thead>
                <tr className="bg-[#1a1a1a] text-[#444]">
                  <th className="text-left px-2 py-1.5 font-medium">类型</th>
                  <th className="text-right px-2 py-1.5 font-medium">箱数</th>
                  {hasNonZero && (
                    <th className="text-right px-2 py-1.5 font-medium">总费用</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {cost_comparison.map((c, i) => {
                  const isBest = hasNonZero
                    ? c.total_cost === bestCost
                    : c.num_bins === Math.min(...cost_comparison.map((x) => x.num_bins))
                  return (
                    <tr
                      key={i}
                      className={`border-t border-[#222] ${isBest ? 'bg-[#1e1c15]' : ''}`}
                    >
                      <td className={`px-2 py-1.5 ${isBest ? 'text-[#c9a96e]' : 'text-[#666]'}`}>
                        {isBest ? '★ ' : ''}{c.type_name}
                      </td>
                      <td className={`px-2 py-1.5 text-right tabular-nums ${isBest ? 'text-[#c9a96e]' : 'text-[#666]'}`}>
                        {c.num_bins}
                      </td>
                      {hasNonZero && (
                        <td className={`px-2 py-1.5 text-right tabular-nums ${isBest ? 'text-[#c9a96e]' : 'text-[#666]'}`}>
                          ${c.total_cost.toLocaleString()}
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
