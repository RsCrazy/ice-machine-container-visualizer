import { useState } from 'react'
import { packItems } from '../../api/client'
import { useAppStore } from '../../store/useAppStore'
import { exportToPdf } from '../../utils/exportPdf'
import CargoList from './CargoList'
import StatsPanel from './StatsPanel'
import ItemForm from './ItemForm'
import TypeManager from './TypeManager'
import ContainerManager from './ContainerManager'
import UploadPanel from '../Upload/UploadPanel'

type Tab = 'cargo' | 'types' | 'containers'

export default function LeftPanel() {
  const {
    items, allowRotation, packResult,
    containerTypes, selectedContainerIds,
    solveMode, setSolveMode,
    setPackResult, setAllowRotation, setLoading, setError,
    isLoading, error, reset, setItems,
  } = useAppStore()
  const [tab, setTab] = useState<Tab>('cargo')
  const [showForm, setShowForm] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  const selectedContainers = containerTypes.filter((c) =>
    selectedContainerIds.includes(c.id)
  )

  const handlePack = async () => {
    if (items.length === 0) return
    setLoading(true)
    setError(null)
    try {
      const result = await packItems(items, allowRotation, selectedContainers, solveMode)
      setPackResult(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : '请求失败')
    } finally {
      setLoading(false)
    }
  }

  const handleExport = () => {
    if (!packResult) return
    setIsExporting(true)
    try {
      exportToPdf(packResult)
    } finally {
      setIsExporting(false)
    }
  }

  const TABS: [Tab, string][] = [
    ['cargo',      '货物清单'],
    ['types',      '类型库'],
    ['containers', '集装箱'],
  ]

  return (
    <aside className="w-[272px] min-w-[272px] bg-[#161616] border-r border-[#2a2a2a] flex flex-col overflow-hidden">
      {/* ── Header ── */}
      <div className="px-4 py-4 border-b border-[#2a2a2a] flex-shrink-0">
        <div className="text-[10px] uppercase tracking-[2.5px] text-[#555] mb-0.5">Ice Machine</div>
        <div className="text-[15px] font-semibold text-[#d4b483]">集装箱装载优化</div>
      </div>

      {/* ── Tab bar ── */}
      <div className="flex border-b border-[#2a2a2a] flex-shrink-0">
        {TABS.map(([key, label]) => (
          <button
            key={key}
            onClick={() => { setTab(key); setShowForm(false) }}
            className={`flex-1 py-2 text-[11px] font-medium transition-colors ${
              tab === key
                ? 'text-[#c9a96e] border-b border-[#c9a96e]'
                : 'text-[#444] hover:text-[#666]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Cargo tab ── */}
      {tab === 'cargo' && (
        <>
          <div className="text-[10px] uppercase tracking-widest text-[#444] px-4 pt-3 pb-1 flex items-center justify-between flex-shrink-0">
            <span>{items.length} 件</span>
            {!packResult && (
              <button
                onClick={() => setShowForm((v) => !v)}
                className="text-[#c9a96e]/70 hover:text-[#c9a96e] transition-colors"
              >
                {showForm ? '收起' : '＋ 添加'}
              </button>
            )}
          </div>

          {showForm && <ItemForm onClose={() => setShowForm(false)} />}
          <CargoList />

          {error && (
            <div className="mx-3 mb-2 px-3 py-2 rounded bg-[#e86e6e]/10 border border-[#e86e6e]/30 text-xs text-[#e86e6e]">
              {error}
            </div>
          )}

          <StatsPanel />
          {!packResult && <UploadPanel />}

          {/* ── Actions ── */}
          <div className="px-3 py-3 border-t border-[#2a2a2a] flex-shrink-0 space-y-2">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <div
                onClick={() => setAllowRotation(!allowRotation)}
                className={`w-8 h-4 rounded-full transition-colors relative ${allowRotation ? 'bg-[#c9a96e]/60' : 'bg-[#2a2a2a]'}`}
              >
                <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all ${allowRotation ? 'left-4' : 'left-0.5'}`} />
              </div>
              <span className="text-xs text-[#555]">允许水平旋转 90°</span>
            </label>

            {/* Solve mode toggle */}
            <div className="space-y-1">
              <div className="flex rounded-md border border-[#2a2a2a] overflow-hidden text-[11px]">
                {([ ['fast', '快速'], ['multi_restart', '多重启'], ['optimized', '退火'], ['exact', 'B&B'] ] as const).map(([mode, label], idx) => (
                  <button
                    key={mode}
                    onClick={() => setSolveMode(mode)}
                    className={`flex-1 py-1 transition-colors ${idx > 0 ? 'border-l border-[#2a2a2a]' : ''} ${
                      solveMode === mode ? 'bg-[#c9a96e]/20 text-[#c9a96e]' : 'text-[#444] hover:text-[#666]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="text-[10px] text-[#444]">
                {solveMode === 'fast'          && '单次贪心，<100ms'}
                {solveMode === 'multi_restart' && 'n≤100 随机重启×30，约 1-3s'}
                {solveMode === 'optimized'     && 'n≤100 模拟退火，每类型≤10s'}
                {solveMode === 'exact'         && '前瞻剪枝穷举，每类型≤30s'}
              </div>
            </div>

            {/* Container selection hint */}
            {!packResult && (
              <div className="text-[10px] text-[#444]">
                容器：
                <span className="text-[#666]">
                  {selectedContainers.length === 0
                    ? '未选择（将使用 20GP）'
                    : selectedContainers.map((c) => c.name).join(' / ')}
                </span>
              </div>
            )}

            {!packResult ? (
              <>
                <button
                  onClick={() => setItems([])}
                  disabled={isLoading || items.length === 0}
                  className="w-full py-2.5 rounded-lg text-sm font-medium transition-all
                    bg-transparent text-[#666] border border-[#2a2a2a]
                    hover:text-[#999] hover:border-[#444] disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  清空货物
                </button>
                <button
                  onClick={handlePack}
                  disabled={isLoading || items.length === 0}
                  className="w-full py-2.5 rounded-lg text-sm font-medium transition-all
                    bg-[#c9a96e]/20 text-[#c9a96e] border border-[#c9a96e]/30
                    hover:bg-[#c9a96e]/30 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isLoading ? '计算中…' : '开始装载'}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={reset}
                  className="w-full py-2.5 rounded-lg text-sm font-medium transition-all
                    bg-transparent text-[#666] border border-[#2a2a2a]
                    hover:text-[#999] hover:border-[#444]"
                >
                  重置
                </button>
                <button
                  onClick={handleExport}
                  disabled={isExporting}
                  className="w-full py-2.5 rounded-lg text-sm font-medium transition-all
                    bg-[#c9a96e]/20 text-[#c9a96e] border border-[#c9a96e]/30
                    hover:bg-[#c9a96e]/30 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isExporting ? '生成中…' : '导出 PDF 报告'}
                </button>
              </>
            )}
          </div>
        </>
      )}

      {/* ── Types tab ── */}
      {tab === 'types' && (
        <>
          <div className="text-[10px] uppercase tracking-widest text-[#444] px-4 pt-3 pb-1 flex-shrink-0">
            已保存类型（本地）
          </div>
          <TypeManager />
        </>
      )}

      {/* ── Containers tab ── */}
      {tab === 'containers' && (
        <>
          <div className="text-[10px] uppercase tracking-widest text-[#444] px-4 pt-3 pb-1 flex-shrink-0">
            集装箱库（本地）
          </div>
          <ContainerManager />
        </>
      )}
    </aside>
  )
}
