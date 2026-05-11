import { useState } from 'react'
import { useAppStore } from '../../store/useAppStore'
import type { ContainerType } from '../../types/api'

const EMPTY = { name: '', length: '', width: '', height: '', cost: '' }

export default function ContainerManager() {
  const {
    containerTypes, selectedContainerIds,
    addContainerType, removeContainerType, toggleContainerSelected,
  } = useAppStore()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ ...EMPTY })
  const [err, setErr] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const handle = (k: keyof typeof EMPTY, v: string) =>
    setForm((f) => ({ ...f, [k]: v }))

  const submit = () => {
    const name = form.name.trim()
    if (!name) return setErr('请填写容器名称')
    const l    = parseFloat(form.length)
    const w    = parseFloat(form.width)
    const h    = parseFloat(form.height)
    const cost = parseFloat(form.cost)
    if ([l, w, h].some((v) => isNaN(v) || v <= 0))
      return setErr('尺寸必须大于 0')
    if (isNaN(cost) || cost < 0) return setErr('单价须 ≥ 0')
    if (containerTypes.some((c) => c.name === name))
      return setErr('该名称已存在')

    const ct: ContainerType = {
      id:     `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name, length: l, width: w, height: h, cost,
    }
    addContainerType(ct)
    setForm({ ...EMPTY })
    setErr('')
    setShowForm(false)
  }

  const handleDelete = (id: string) => {
    if (confirmDelete === id) {
      removeContainerType(id)
      setConfirmDelete(null)
    } else {
      setConfirmDelete(id)
    }
  }

  return (
    <div className="flex-1 overflow-y-auto flex flex-col min-h-0">
      <div className="px-2.5 py-2 text-[10px] text-[#444] flex-shrink-0">
        勾选参与本次计算的容器类型，系统将比较费用并自动选用最优方案。
      </div>

      {/* ── Container list ── */}
      <div className="px-2.5 pb-2 flex flex-col gap-1.5 flex-1">
        {containerTypes.length === 0 && (
          <div className="text-xs text-[#333] text-center py-6">
            暂无容器，点击下方「＋ 新增容器」添加
          </div>
        )}

        {containerTypes.map((c) => {
          const selected = selectedContainerIds.includes(c.id)
          const pending  = confirmDelete === c.id

          return (
            <div
              key={c.id}
              className={`rounded-lg px-3 py-2.5 border relative overflow-hidden transition-colors ${
                pending
                  ? 'border-[#e86e6e]/40 bg-[#2a1a1a]'
                  : selected
                    ? 'border-[#c9a96e]/40 bg-[#1e1c17]'
                    : 'border-[#2a2a2a] bg-[#1e1e1e] hover:border-[#333]'
              }`}
            >
              {/* Selected accent bar */}
              {selected && !pending && (
                <span className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l bg-[#c9a96e]" />
              )}

              <div className="pl-1 flex items-start gap-2">
                {/* Checkbox */}
                <button
                  onClick={() => toggleContainerSelected(c.id)}
                  className={`flex-shrink-0 mt-0.5 w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                    selected
                      ? 'border-[#c9a96e] bg-[#c9a96e]/20 text-[#c9a96e]'
                      : 'border-[#333] bg-transparent text-transparent'
                  }`}
                >
                  <span className="text-[10px] leading-none">✓</span>
                </button>

                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-[#ddd] leading-tight">{c.name}</div>
                  <div className="text-[10px] text-[#444] mt-0.5 tabular-nums">
                    {c.length}×{c.width}×{c.height} mm
                  </div>
                  {c.cost > 0 && (
                    <div className="text-[10px] text-[#555] tabular-nums">
                      ${c.cost.toLocaleString()} / 箱
                    </div>
                  )}
                </div>

                <button
                  onClick={() => handleDelete(c.id)}
                  onBlur={() => setConfirmDelete(null)}
                  title={pending ? '再次点击确认删除' : '删除容器'}
                  className={`flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded transition-all ${
                    pending
                      ? 'text-[#e86e6e] border border-[#e86e6e]/40 bg-[#e86e6e]/10'
                      : 'text-[#3a3a3a] border border-transparent hover:text-[#e86e6e] hover:border-[#e86e6e]/30'
                  }`}
                >
                  {pending ? '确认删除' : '✕'}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Add form ── */}
      {showForm ? (
        <div className="px-3 py-3 border-t border-[#2a2a2a] bg-[#181818] flex-shrink-0">
          <div className="text-[10px] uppercase tracking-widest text-[#c9a96e] mb-2">新增容器</div>

          {([
            ['name',   '名称',    '如 45HC'],
            ['length', '内长',    'mm'],
            ['width',  '内宽',    'mm'],
            ['height', '内高',    'mm'],
            ['cost',   '单价',    'USD'],
          ] as [keyof typeof EMPTY, string, string][]).map(([k, label, placeholder]) => (
            <div key={k} className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] text-[#555] w-8 flex-shrink-0">{label}</span>
              <input
                type={k === 'name' ? 'text' : 'number'}
                min={0}
                placeholder={placeholder}
                value={form[k]}
                onChange={(e) => handle(k, e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submit()}
                className="flex-1 bg-[#222] border border-[#2a2a2a] rounded px-2 py-1 text-xs text-[#ddd] focus:outline-none focus:border-[#c9a96e]/50"
              />
            </div>
          ))}

          {err && <div className="text-[10px] text-[#e86e6e] mb-1.5">{err}</div>}

          <div className="flex gap-2 mt-2">
            <button
              onClick={submit}
              className="flex-1 py-1.5 rounded text-xs bg-[#c9a96e]/20 text-[#c9a96e] border border-[#c9a96e]/30 hover:bg-[#c9a96e]/30 transition-colors"
            >
              保存
            </button>
            <button
              onClick={() => { setShowForm(false); setForm({ ...EMPTY }); setErr('') }}
              className="px-3 py-1.5 rounded text-xs text-[#555] border border-[#2a2a2a] hover:border-[#3a3a3a] transition-colors"
            >
              取消
            </button>
          </div>
        </div>
      ) : (
        <div className="px-3 py-3 border-t border-[#2a2a2a] flex-shrink-0">
          <button
            onClick={() => setShowForm(true)}
            className="w-full py-2 rounded text-xs font-medium
              bg-[#c9a96e]/10 text-[#c9a96e]/70 border border-[#c9a96e]/20
              hover:bg-[#c9a96e]/20 hover:text-[#c9a96e] hover:border-[#c9a96e]/40
              transition-all"
          >
            ＋ 新增容器
          </button>
        </div>
      )}
    </div>
  )
}
