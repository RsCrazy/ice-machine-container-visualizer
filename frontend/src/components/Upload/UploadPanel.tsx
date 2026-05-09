import { useRef, useState } from 'react'
import type { DragEvent } from 'react'
import { importFile } from '../../api/client'
import { useAppStore } from '../../store/useAppStore'

export default function UploadPanel() {
  const { allowRotation, setItems, setPackResult, setLoading, setError } = useAppStore()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const process = async (file: File) => {
    setLoading(true)
    setError(null)
    try {
      const preview = await importFile(file, allowRotation)
      setItems(preview.parsed_items)
      setPackResult(preview.pack_result)
    } catch (e) {
      setError(e instanceof Error ? e.message : '解析失败')
    } finally {
      setLoading(false)
    }
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) process(file)
  }

  return (
    <div className="px-3 py-3 border-t border-[#2a2a2a]">
      <div className="text-[10px] uppercase tracking-widest text-[#444] mb-2">导入文件</div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`border border-dashed rounded-lg py-4 text-center cursor-pointer transition-all ${
          dragging
            ? 'border-[#c9a96e] bg-[#c9a96e]/05'
            : 'border-[#2a2a2a] hover:border-[#3a3a3a]'
        }`}
      >
        <div className="text-lg mb-1">📂</div>
        <div className="text-xs text-[#555]">拖入或点击上传</div>
        <div className="text-[10px] text-[#3a3a3a] mt-0.5">.xlsx / .json</div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,.json"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) process(f) }}
      />
    </div>
  )
}
