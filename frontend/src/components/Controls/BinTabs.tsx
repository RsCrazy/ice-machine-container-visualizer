import { useAppStore } from '../../store/useAppStore'

export default function BinTabs() {
  const { packResult, activeBin, setActiveBin } = useAppStore()
  if (!packResult || packResult.bins.length <= 1) return null

  return (
    <div className="flex items-center gap-1.5 px-4 py-2 bg-[#161616] border-b border-[#2a2a2a]">
      <span className="text-[10px] uppercase tracking-widest text-[#444] mr-2">集装箱</span>
      {packResult.bins.map((_, i) => (
        <button
          key={i}
          onClick={() => setActiveBin(i)}
          className={`px-3 py-1 rounded text-xs font-medium transition-all ${
            activeBin === i
              ? 'bg-[#c9a96e]/20 text-[#c9a96e] border border-[#c9a96e]/40'
              : 'text-[#666] border border-[#2a2a2a] hover:border-[#3a3a3a] hover:text-[#999]'
          }`}
        >
          箱 {i + 1}
        </button>
      ))}
    </div>
  )
}
