import { useEffect, useRef } from 'react'
import type { PlacedItemOut } from '../../types/api'
import { modelColor } from '../../store/useAppStore'

// Container constants (mm)
const CL = 5898, CW = 2352, CH = 2393

interface Props {
  placed: PlacedItemOut[]
  layerHeight: number
  highlightedItem: string | null
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

function drawTopView(
  ctx: CanvasRenderingContext2D,
  placed: PlacedItemOut[],
  highlight: string | null,
  layerH: number,
  W: number,
  H: number,
) {
  // Top-down cross-section at layerH: X → horizontal, Z → vertical
  const pad = 12
  const scaleX = (W - pad * 2) / CL
  const scaleZ = (H - pad * 2) / CW

  ctx.clearRect(0, 0, W, H)

  // Container outline
  ctx.strokeStyle = '#c9a96e'
  ctx.lineWidth = 1
  ctx.strokeRect(pad, pad, CL * scaleX, CW * scaleZ)

  for (const p of placed) {
    // Items whose bottom is at or above the layer are not visible from above the cut
    if (p.y >= layerH) continue

    const x = pad + p.x * scaleX
    const z = pad + p.z * scaleZ
    const w = p.eff_l * scaleX
    const d = p.eff_w * scaleZ
    const color = modelColor(p.model)
    const isHL = highlight === p.name

    // Items that cross the cut plane are shown at reduced opacity
    const crossesCut = p.y + p.height > layerH
    const alpha = crossesCut ? (isHL ? 0.5 : 0.2) : (isHL ? 0.75 : 0.45)

    ctx.fillStyle = hexToRgba(color, alpha)
    ctx.fillRect(x, z, w, d)
    ctx.strokeStyle = crossesCut
      ? hexToRgba(color, 0.3)
      : isHL ? '#fff' : hexToRgba(color, 0.8)
    ctx.lineWidth = isHL && !crossesCut ? 1.5 : 0.5
    ctx.strokeRect(x, z, w, d)
  }

  // Layer height label
  const label = layerH >= CH - 1 ? '俯视 X–Z（全部）' : `俯视 X–Z  截面 ${layerH} mm`
  ctx.fillStyle = '#3a3a3a'
  ctx.font = '9px sans-serif'
  ctx.fillText(label, pad + 2, H - 4)
}

function drawSideView(ctx: CanvasRenderingContext2D, placed: PlacedItemOut[], highlight: string | null, layerH: number, W: number, H: number) {
  // Side view: X → horizontal, Y (height) → vertical (flip so floor at bottom)
  const pad = 12
  const scaleX = (W - pad * 2) / CL
  const scaleY = (H - pad * 2) / CH

  ctx.clearRect(0, 0, W, H)

  // Container outline
  ctx.strokeStyle = '#c9a96e'
  ctx.lineWidth = 1
  ctx.strokeRect(pad, pad, CL * scaleX, CH * scaleY)

  // Layer plane
  if (layerH < CH - 1) {
    const ly = pad + (CH - layerH) * scaleY
    ctx.strokeStyle = 'rgba(201,169,110,0.5)'
    ctx.lineWidth = 1
    ctx.setLineDash([4, 4])
    ctx.beginPath()
    ctx.moveTo(pad, ly)
    ctx.lineTo(pad + CL * scaleX, ly)
    ctx.stroke()
    ctx.setLineDash([])
  }

  for (const p of placed) {
    const x = pad + p.x * scaleX
    // Flip Y: 0 at bottom means floor. Canvas y=0 is top.
    const yTop = pad + (CH - p.y - p.height) * scaleY
    const w = p.eff_l * scaleX
    const h = p.height * scaleY
    const color = modelColor(p.model)
    const isHL = highlight === p.name

    ctx.fillStyle = hexToRgba(color, isHL ? 0.7 : 0.4)
    ctx.fillRect(x, yTop, w, h)
    ctx.strokeStyle = isHL ? '#fff' : hexToRgba(color, 0.8)
    ctx.lineWidth = isHL ? 1.5 : 0.5
    ctx.setLineDash([])
    ctx.strokeRect(x, yTop, w, h)
  }

  ctx.fillStyle = '#3a3a3a'
  ctx.font = '9px sans-serif'
  ctx.fillText('侧面 X–Y', pad + 2, H - 4)
}

export default function SectionView({ placed, layerHeight, highlightedItem }: Props) {
  const topRef  = useRef<HTMLCanvasElement>(null)
  const sideRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!topRef.current || !sideRef.current) return
    const tw = topRef.current.clientWidth || 240
    const th = topRef.current.clientHeight || 120
    const sw = sideRef.current.clientWidth || 240
    const sh = sideRef.current.clientHeight || 120

    topRef.current.width  = tw
    topRef.current.height = th
    sideRef.current.width  = sw
    sideRef.current.height = sh

    const tCtx = topRef.current.getContext('2d')!
    const sCtx = sideRef.current.getContext('2d')!

    drawTopView(tCtx, placed, highlightedItem, layerHeight, tw, th)
    drawSideView(sCtx, placed, highlightedItem, layerHeight, sw, sh)
  }, [placed, layerHeight, highlightedItem])

  return (
    <div className="flex flex-col gap-2 p-3">
      <div className="text-[10px] uppercase tracking-widest text-[#444] mb-1">截面视图</div>
      <canvas
        ref={topRef}
        className="w-full rounded bg-[#181818] border border-[#2a2a2a]"
        style={{ height: 120 }}
      />
      <canvas
        ref={sideRef}
        className="w-full rounded bg-[#181818] border border-[#2a2a2a]"
        style={{ height: 120 }}
      />
    </div>
  )
}
