import { useAppStore } from '../../store/useAppStore'
import SectionView from './SectionView'

export default function RightPanel() {
  const { packResult, activeBin, layerHeight, highlightedItem } = useAppStore()
  const bin = packResult?.bins[activeBin]

  return (
    <aside className="w-[280px] min-w-[280px] bg-[#161616] border-l border-[#2a2a2a] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-5 border-b border-[#2a2a2a] flex-shrink-0">
        <div className="text-[10px] uppercase tracking-[2.5px] text-[#555] mb-1">Section</div>
        <div className="text-[13px] font-semibold text-[#888]">截面分析</div>
      </div>

      {bin ? (
        <div className="flex-1 overflow-y-auto">
          <SectionView
            placed={bin.placed}
            layerHeight={layerHeight}
            highlightedItem={highlightedItem}
          />

          {/* Dimension legend */}
          <div className="px-3 pb-3 text-[10px] text-[#3a3a3a] space-y-0.5">
            <div>X 轴（长）: 5898 mm</div>
            <div>Z 轴（宽）: 2352 mm</div>
            <div>Y 轴（高）: 2393 mm</div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-[#333]">
            <div className="text-3xl mb-2">📦</div>
            <div className="text-xs">运行装载后显示截面</div>
          </div>
        </div>
      )}
    </aside>
  )
}
