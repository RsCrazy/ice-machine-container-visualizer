import { useState } from 'react'
import { useAppStore, modelColor } from '../../store/useAppStore'
import type { ItemType } from '../../types/api'

interface FormFields {
  model: string
  length: string
  width: string
  height: string
  weight: string
}

const EMPTY: FormFields = { model: '', length: '', width: '', height: '', weight: '' }

export default function ItemForm({ onClose }: { onClose: () => void }) {
  const { items, itemTypes, addItem } = useAppStore()
  const [selectedType, setSelectedType] = useState<ItemType | null>(null)
  const [form, setForm] = useState<FormFields>({ ...EMPTY })
  const [qty, setQty] = useState(1)
  const [err, setErr] = useState('')

  const applyType = (t: ItemType) => {
    setSelectedType(t)
    setForm({
      model:  t.model,
      length: String(t.length),
      width:  String(t.width),
      height: String(t.height),
      weight: String(t.weight),
    })
    setErr('')
  }

  const handle = (k: keyof FormFields, v: string) => {
    setForm((f) => ({ ...f, [k]: v }))
    if (k !== 'model') setSelectedType(null) // manual edit deselects type
  }

  const submit = () => {
    const model  = form.model.trim()
    const length = parseFloat(form.length)
    const width  = parseFloat(form.width)
    const height = parseFloat(form.height)
    const weight = parseFloat(form.weight)

    if (!model) return setErr('请填写型号')
    if ([length, width, height, weight].some((v) => isNaN(v) || v <= 0))
      return setErr('尺寸和重量必须大于 0')
    if (qty < 1 || qty > 99) return setErr('数量须在 1–99 之间')

    // Count existing items of same model to build sequential names
    let existingCount = items.filter((i) => i.model === model).length
    const newItems = []
    for (let i = 0; i < qty; i++) {
      existingCount++
      const name = `${model}-${String(existingCount).padStart(3, '0')}`
      if (items.some((it) => it.name === name)) {
        return setErr(`名称 ${name} 已存在，请先清理清单`)
      }
      newItems.push({ name, model, length, width, height, weight })
    }

    newItems.forEach((it) => addItem(it))
    setErr('')
    onClose()
  }

  const dimFields: Array<{ k: keyof FormFields; label: string; unit: string }> = [
    { k: 'length', label: '长度', unit: 'mm' },
    { k: 'width',  label: '宽度', unit: 'mm' },
    { k: 'height', label: '高度', unit: 'mm' },
    { k: 'weight', label: '重量', unit: 'kg' },
  ]

  return (
    <div className="border-t border-[#2a2a2a] bg-[#181818] flex-shrink-0">
      {/* ── Type picker ── */}
      <div className="px-3 pt-3 pb-2">
        <div className="text-[10px] uppercase tracking-widest text-[#c9a96e] mb-2">选择类型</div>
        {itemTypes.length === 0 ? (
          <div className="text-[10px] text-[#444] py-2">暂无类型，请先在「类型库」中添加</div>
        ) : (
          <div className="flex flex-col gap-1">
            {itemTypes.map((t) => {
              const color = modelColor(t.model)
              const active = selectedType?.id === t.id
              return (
                <button
                  key={t.id}
                  onClick={() => applyType(t)}
                  className={`w-full text-left rounded px-2.5 py-2 border transition-all relative overflow-hidden ${
                    active
                      ? 'border-[#c9a96e]/50 bg-[#1f1c17]'
                      : 'border-[#252525] bg-[#1a1a1a] hover:border-[#333] hover:bg-[#1d1d1d]'
                  }`}
                >
                  <span
                    className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l"
                    style={{ background: color }}
                  />
                  <div className="pl-2 flex items-center justify-between">
                    <span className={`text-xs font-medium ${active ? 'text-[#c9a96e]' : 'text-[#bbb]'}`}>
                      {t.model}
                    </span>
                    <span className="text-[10px] text-[#444] tabular-nums">
                      {t.weight} kg
                    </span>
                  </div>
                  <div className="pl-2 text-[10px] text-[#3a3a3a] tabular-nums mt-0.5">
                    {t.length}×{t.width}×{t.height} mm
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Dimension fields (editable after type selection) ── */}
      <div className="px-3 pb-2 border-t border-[#222] pt-2">
        <div className="text-[10px] uppercase tracking-widest text-[#444] mb-2">
          规格 {selectedType ? <span className="text-[#555] normal-case tracking-normal">（可手动修改）</span> : ''}
        </div>

        {/* Model */}
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-[10px] text-[#555] w-10 flex-shrink-0">型号</span>
          <input
            type="text"
            placeholder="型号名称"
            value={form.model}
            onChange={(e) => handle('model', e.target.value)}
            className="flex-1 bg-[#222] border border-[#2a2a2a] rounded px-2 py-1 text-xs text-[#ddd] focus:outline-none focus:border-[#c9a96e]/50"
          />
        </div>

        {dimFields.map(({ k, label, unit }) => (
          <div key={k} className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] text-[#555] w-10 flex-shrink-0">{label}</span>
            <input
              type="number"
              min={0}
              placeholder={unit}
              value={form[k]}
              onChange={(e) => handle(k, e.target.value)}
              className="flex-1 bg-[#222] border border-[#2a2a2a] rounded px-2 py-1 text-xs text-[#ddd] focus:outline-none focus:border-[#c9a96e]/50"
            />
          </div>
        ))}

        {/* Quantity */}
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-[10px] text-[#555] w-10 flex-shrink-0">数量</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="w-6 h-6 rounded bg-[#222] border border-[#2a2a2a] text-[#666] hover:text-[#aaa] text-sm flex items-center justify-center"
            >−</button>
            <input
              type="number"
              min={1}
              max={99}
              value={qty}
              onChange={(e) => setQty(Math.max(1, Math.min(99, parseInt(e.target.value) || 1)))}
              className="w-12 bg-[#222] border border-[#2a2a2a] rounded px-2 py-1 text-xs text-[#ddd] text-center focus:outline-none focus:border-[#c9a96e]/50"
            />
            <button
              onClick={() => setQty((q) => Math.min(99, q + 1))}
              className="w-6 h-6 rounded bg-[#222] border border-[#2a2a2a] text-[#666] hover:text-[#aaa] text-sm flex items-center justify-center"
            >＋</button>
          </div>
          <span className="text-[10px] text-[#444]">件</span>
        </div>
      </div>

      {err && (
        <div className="mx-3 mb-2 text-[10px] text-[#e86e6e]">{err}</div>
      )}

      <div className="flex gap-2 px-3 pb-3">
        <button
          onClick={submit}
          className="flex-1 py-1.5 rounded text-xs bg-[#c9a96e]/20 text-[#c9a96e] border border-[#c9a96e]/30 hover:bg-[#c9a96e]/30 transition-colors"
        >
          添加 {qty > 1 ? `${qty} 件` : ''}
        </button>
        <button
          onClick={onClose}
          className="px-3 py-1.5 rounded text-xs text-[#555] border border-[#2a2a2a] hover:border-[#3a3a3a] transition-colors"
        >
          取消
        </button>
      </div>
    </div>
  )
}
