import { useState } from 'react'
import { useAppStore, modelColor } from '../../store/useAppStore'
import type { ItemType } from '../../types/api'

const EMPTY = { model: '', length: '', width: '', height: '', weight: '' }

const FIELDS: Array<{ k: keyof typeof EMPTY; label: string; unit?: string }> = [
  { k: 'model',  label: '型号' },
  { k: 'length', label: '长度', unit: 'mm' },
  { k: 'width',  label: '宽度', unit: 'mm' },
  { k: 'height', label: '高度', unit: 'mm' },
  { k: 'weight', label: '重量', unit: 'kg' },
]

export default function TypeManager() {
  const { itemTypes, addItemType, removeItemType } = useAppStore()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ ...EMPTY })
  const [err, setErr] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const handle = (k: keyof typeof EMPTY, v: string) =>
    setForm((f) => ({ ...f, [k]: v }))

  const submit = () => {
    const model = form.model.trim()
    if (!model) return setErr('请填写型号名称')
    const l = parseFloat(form.length)
    const w = parseFloat(form.width)
    const h = parseFloat(form.height)
    const wt = parseFloat(form.weight)
    if ([l, w, h, wt].some((v) => isNaN(v) || v <= 0))
      return setErr('尺寸和重量必须大于 0')
    if (itemTypes.some((t) => t.model === model))
      return setErr('该型号已存在')

    const newType: ItemType = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      model, length: l, width: w, height: h, weight: wt,
    }
    addItemType(newType)
    setForm({ ...EMPTY })
    setErr('')
    setShowForm(false)
  }

  const handleDelete = (id: string) => {
    if (confirmDelete === id) {
      removeItemType(id)
      setConfirmDelete(null)
    } else {
      setConfirmDelete(id)
    }
  }

  return (
    <div className="flex-1 overflow-y-auto flex flex-col min-h-0">

      {/* ── Type list ── */}
      <div className="px-2.5 py-2 flex flex-col gap-1.5 flex-1">
        {itemTypes.length === 0 && (
          <div className="text-xs text-[#333] text-center py-6">
            暂无类型，点击下方「＋ 新增类型」添加
          </div>
        )}

        {itemTypes.map((t) => {
          const color   = modelColor(t.model)
          const pending = confirmDelete === t.id

          return (
            <div
              key={t.id}
              className={`rounded-lg px-3 py-2.5 border relative overflow-hidden transition-colors ${
                pending
                  ? 'border-[#e86e6e]/40 bg-[#2a1a1a]'
                  : 'border-[#2a2a2a] bg-[#1e1e1e] hover:border-[#333]'
              }`}
            >
              {/* Left accent bar */}
              <span
                className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l"
                style={{ background: color }}
              />

              <div className="pl-1 flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-[#ddd] leading-tight truncate">
                    {t.model}
                  </div>
                  <div className="text-[10px] text-[#444] mt-0.5 tabular-nums">
                    {t.length}×{t.width}×{t.height} mm · {t.weight} kg
                  </div>
                </div>

                {/* Delete button — always visible */}
                <button
                  onClick={() => handleDelete(t.id)}
                  onBlur={() => setConfirmDelete(null)}
                  title={pending ? '再次点击确认删除' : '删除类型'}
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
          <div className="text-[10px] uppercase tracking-widest text-[#c9a96e] mb-2">新增类型</div>

          {FIELDS.map(({ k, label, unit }) => (
            <div key={k} className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] text-[#555] w-10 flex-shrink-0">{label}</span>
              <input
                type={k === 'model' ? 'text' : 'number'}
                min={0}
                placeholder={unit ?? '型号名称'}
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
            ＋ 新增类型
          </button>
        </div>
      )}
    </div>
  )
}
