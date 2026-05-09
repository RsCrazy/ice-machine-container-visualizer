import jsPDF from 'jspdf'
import type { PackResponse, PlacedItemOut } from '../types/api'
import { modelColor } from '../store/useAppStore'

// ── Page geometry (A4 portrait @ ~150 dpi) ────────────────────────────────────
const PW = 1240
const PH = 1754
const M  = 64           // margin
const CW = PW - M * 2  // content width = 1112

// Container dimensions (mm)
const CON_L = 5898
const CON_W = 2352
const CON_H = 2393

// ── Color palette ─────────────────────────────────────────────────────────────
const GOLD  = '#b89040'
const BG    = '#ffffff'
const CARD  = '#f5f4f1'
const D1    = '#111111'
const D2    = '#444444'
const D3    = '#888888'
const D4    = '#cccccc'
const ROW_H_BG = '#eceae6'
const ROW_A    = '#f8f7f4'
const FOOTER_SAFE = PH - M - 40

// ── Helpers ───────────────────────────────────────────────────────────────────
function h2r(hex: string, a: number) {
  const n = parseInt(hex.replace('#', ''), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

function font(ctx: CanvasRenderingContext2D, size: number, bold = false) {
  ctx.font = `${bold ? 'bold ' : ''}${size}px "PingFang SC","Microsoft YaHei","Noto Sans SC",sans-serif`
}

function rrect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function newPage(): CanvasRenderingContext2D {
  const c = document.createElement('canvas')
  c.width = PW; c.height = PH
  const ctx = c.getContext('2d')!
  ctx.fillStyle = BG
  ctx.fillRect(0, 0, PW, PH)
  pages.push(c)
  pageNum++
  return ctx
}

// Module-level accumulators (reset each call)
let pages: HTMLCanvasElement[]
let pageNum: number

// ── Layout primitives ─────────────────────────────────────────────────────────
function drawHeader(ctx: CanvasRenderingContext2D, title: string, sub: string, date: string) {
  ctx.fillStyle = GOLD
  ctx.fillRect(M, M, 5, 64)

  font(ctx, 24, true)
  ctx.fillStyle = D1
  ctx.fillText(title, M + 20, M + 30)

  font(ctx, 13)
  ctx.fillStyle = D3
  ctx.fillText(sub, M + 20, M + 54)

  font(ctx, 11)
  ctx.textAlign = 'right'
  ctx.fillStyle = D3
  ctx.fillText(date, PW - M, M + 30)
  ctx.textAlign = 'left'

  ctx.strokeStyle = D4
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(M, M + 76); ctx.lineTo(PW - M, M + 76)
  ctx.stroke()
}

function drawFooter(ctx: CanvasRenderingContext2D, page: number, date: string) {
  ctx.strokeStyle = D4
  ctx.lineWidth = 0.5
  ctx.beginPath()
  ctx.moveTo(M, PH - M - 6); ctx.lineTo(PW - M, PH - M - 6)
  ctx.stroke()
  font(ctx, 10)
  ctx.fillStyle = D3
  ctx.fillText(`制冰机集装箱装载优化报告  ·  生成于 ${date}`, M, PH - M + 14)
  ctx.textAlign = 'right'
  ctx.fillText(`第 ${page} 页`, PW - M, PH - M + 14)
  ctx.textAlign = 'left'
}

interface Card { label: string; value: string; sub?: string; hi?: boolean }

function drawStatCards(ctx: CanvasRenderingContext2D, y: number, cards: Card[]): number {
  const gap = 12
  const cw  = (CW - gap * (cards.length - 1)) / cards.length
  const ch  = 86
  for (let i = 0; i < cards.length; i++) {
    const { label, value, sub, hi } = cards[i]
    const x = M + i * (cw + gap)
    rrect(ctx, x, y, cw, ch, 8)
    ctx.fillStyle = hi ? h2r(GOLD, 0.12) : CARD
    ctx.fill()
    ctx.strokeStyle = hi ? h2r(GOLD, 0.45) : D4
    ctx.lineWidth = hi ? 1.5 : 0.5
    ctx.stroke()
    font(ctx, 11)
    ctx.fillStyle = hi ? h2r(GOLD, 0.85) : D3
    ctx.fillText(label, x + 16, y + 23)
    font(ctx, 23, true)
    ctx.fillStyle = hi ? GOLD : D1
    ctx.fillText(value, x + 16, y + 58)
    if (sub) {
      font(ctx, 10)
      ctx.fillStyle = D3
      ctx.fillText(sub, x + 16, y + 76)
    }
  }
  return y + ch
}

function drawSectionLabel(ctx: CanvasRenderingContext2D, y: number, text: string): number {
  font(ctx, 12, true)
  ctx.fillStyle = D2
  ctx.fillText(text, M, y + 14)
  ctx.strokeStyle = D4
  ctx.lineWidth = 0.5
  ctx.beginPath()
  ctx.moveTo(M, y + 22); ctx.lineTo(PW - M, y + 22)
  ctx.stroke()
  return y + 30
}

// ── Section views (light-theme variant) ───────────────────────────────────────
function drawTopView(ctx: CanvasRenderingContext2D, placed: PlacedItemOut[], x: number, y: number, w: number, h: number) {
  const pad = 14
  const sx  = (w - pad * 2) / CON_L
  const sz  = (h - pad * 2 - 18) / CON_W
  ctx.fillStyle = '#f9f8f5'
  ctx.fillRect(x, y, w, h)
  ctx.strokeStyle = GOLD; ctx.lineWidth = 1.5
  ctx.strokeRect(x + pad, y + pad, CON_L * sx, CON_W * sz)
  for (const p of placed) {
    const c = modelColor(p.model)
    ctx.fillStyle = h2r(c, 0.5)
    ctx.fillRect(x + pad + p.x * sx, y + pad + p.z * sz, p.eff_l * sx, p.eff_w * sz)
    ctx.strokeStyle = h2r(c, 0.85); ctx.lineWidth = 0.5
    ctx.strokeRect(x + pad + p.x * sx, y + pad + p.z * sz, p.eff_l * sx, p.eff_w * sz)
  }
  font(ctx, 9); ctx.fillStyle = D3
  ctx.fillText('俯视 X–Z', x + pad + 2, y + h - 5)
  ctx.strokeStyle = D4; ctx.lineWidth = 0.5
  ctx.strokeRect(x, y, w, h)
}

function drawSideView(ctx: CanvasRenderingContext2D, placed: PlacedItemOut[], x: number, y: number, w: number, h: number) {
  const pad = 14
  const sx  = (w - pad * 2) / CON_L
  const sy  = (h - pad * 2 - 18) / CON_H
  ctx.fillStyle = '#f9f8f5'
  ctx.fillRect(x, y, w, h)
  ctx.strokeStyle = GOLD; ctx.lineWidth = 1.5
  ctx.strokeRect(x + pad, y + pad, CON_L * sx, CON_H * sy)
  for (const p of placed) {
    const c  = modelColor(p.model)
    const iy = y + pad + (CON_H - p.y - p.height) * sy
    ctx.fillStyle = h2r(c, 0.5)
    ctx.fillRect(x + pad + p.x * sx, iy, p.eff_l * sx, p.height * sy)
    ctx.strokeStyle = h2r(c, 0.85); ctx.lineWidth = 0.5
    ctx.strokeRect(x + pad + p.x * sx, iy, p.eff_l * sx, p.height * sy)
  }
  font(ctx, 9); ctx.fillStyle = D3
  ctx.fillText('侧面 X–Y', x + pad + 2, y + h - 5)
  ctx.strokeStyle = D4; ctx.lineWidth = 0.5
  ctx.strokeRect(x, y, w, h)
}

// ── Items table ───────────────────────────────────────────────────────────────
// Column widths must sum to CW = 1112
const COLS   = [44, 256, 148, 188, 72, 220, 72, 112]
const C_HEAD = ['#', '货物名称', '型号', '尺寸 mm (L×W×H)', 'kg', '坐标 (x, y, z)', '支撑率', '旋转']
const C_X: number[] = (() => {
  const xs: number[] = []; let x = M
  for (const w of COLS) { xs.push(x); x += w }
  return xs
})()
const ROW_H = 28

function drawTableHeader(ctx: CanvasRenderingContext2D, y: number): number {
  ctx.fillStyle = ROW_H_BG
  ctx.fillRect(M, y, CW, ROW_H)
  font(ctx, 10, true); ctx.fillStyle = D2
  for (let i = 0; i < C_HEAD.length; i++) {
    const center = i === 0 || i === 4 || i === 6 || i === 7
    ctx.textAlign = center ? 'center' : 'left'
    ctx.fillText(C_HEAD[i], center ? C_X[i] + COLS[i] / 2 : C_X[i] + 6, y + 19)
  }
  ctx.textAlign = 'left'
  ctx.strokeStyle = D4; ctx.lineWidth = 0.5
  ctx.strokeRect(M, y, CW, ROW_H)
  return y + ROW_H
}

function drawTableRow(ctx: CanvasRenderingContext2D, y: number, p: PlacedItemOut, idx: number, even: boolean): number {
  ctx.fillStyle = even ? ROW_A : BG
  ctx.fillRect(M, y, CW, ROW_H)
  font(ctx, 10)

  // Index (center)
  ctx.textAlign = 'center'; ctx.fillStyle = D3
  ctx.fillText(String(idx + 1), C_X[0] + COLS[0] / 2, y + 19)

  // Color dot + name
  ctx.fillStyle = modelColor(p.model)
  ctx.beginPath(); ctx.arc(C_X[1] + 9, y + ROW_H / 2, 4, 0, Math.PI * 2); ctx.fill()
  ctx.textAlign = 'left'; ctx.fillStyle = D1
  const name = p.name.length > 22 ? p.name.slice(0, 21) + '…' : p.name
  ctx.fillText(name, C_X[1] + 22, y + 19)

  // Model
  ctx.fillStyle = D3
  ctx.fillText(p.model.length > 14 ? p.model.slice(0, 13) + '…' : p.model, C_X[2] + 6, y + 19)

  // Dims
  ctx.fillStyle = D2
  ctx.fillText(`${p.eff_l}×${p.eff_w}×${p.height}`, C_X[3] + 6, y + 19)

  // Weight (center)
  ctx.textAlign = 'center'; ctx.fillStyle = D2
  ctx.fillText(String(p.weight), C_X[4] + COLS[4] / 2, y + 19)

  // Position
  ctx.textAlign = 'left'; ctx.fillStyle = D3
  ctx.fillText(`${p.x}, ${p.y}, ${p.z}`, C_X[5] + 6, y + 19)

  // Support ratio (center, color-coded)
  ctx.textAlign = 'center'
  ctx.fillStyle = p.support_ratio >= 0.8 ? '#2a7a42' : '#cc4444'
  ctx.fillText(`${(p.support_ratio * 100).toFixed(0)}%`, C_X[6] + COLS[6] / 2, y + 19)

  // Rotation (center)
  ctx.fillStyle = p.rotation ? GOLD : D4
  ctx.fillText(p.rotation ? '90°' : '—', C_X[7] + COLS[7] / 2, y + 19)

  ctx.textAlign = 'left'
  ctx.strokeStyle = D4; ctx.lineWidth = 0.3
  ctx.beginPath()
  ctx.moveTo(M, y + ROW_H); ctx.lineTo(M + CW, y + ROW_H)
  ctx.stroke()
  return y + ROW_H
}

// ── Main export ───────────────────────────────────────────────────────────────
export function exportToPdf(packResult: PackResponse): void {
  pages   = []
  pageNum = 0

  const now   = new Date()
  const pad2  = (n: number) => String(n).padStart(2, '0')
  const dateStr  = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())} ${pad2(now.getHours())}:${pad2(now.getMinutes())}`
  const fileDate = dateStr.replace(/[: ]/g, '-')

  const { bins, stats, unplaced } = packResult

  // ── Page 1: Summary ─────────────────────────────────────────────────────────
  let ctx = newPage()
  drawHeader(ctx, '制冰机集装箱装载优化报告', '20GP 集装箱  ·  5,898 × 2,352 × 2,393 mm（内径）', dateStr)
  let y = M + 96

  y = drawStatCards(ctx, y, [
    { label: '集装箱数量', value: String(stats.num_containers), sub: `理论下界 ${stats.lower_bound}`, hi: stats.gap === 0 },
    { label: '总货物件数', value: String(stats.items_packed),   sub: unplaced.length > 0 ? `${unplaced.length} 件未装` : '全部装入' },
    { label: '总重量',     value: stats.total_weight_kg.toLocaleString(), sub: 'kg' },
    { label: '体积利用率', value: `${stats.volume_util_pct}%`, sub: '各箱平均' },
  ]) + 24

  if (stats.gap === 0) {
    rrect(ctx, M, y, 240, 30, 6)
    ctx.fillStyle = h2r('#50c87a', 0.12); ctx.fill()
    ctx.strokeStyle = h2r('#50c87a', 0.4); ctx.lineWidth = 1; ctx.stroke()
    font(ctx, 12); ctx.fillStyle = '#2a7a42'
    ctx.fillText('✓ 已达理论最优（gap = 0）', M + 12, y + 19)
    y += 44
  }

  y = drawSectionLabel(ctx, y, '各集装箱汇总') + 4

  // Summary table header
  // CW = 1112: [64, 128, 136, 152, 148, 484]
  const SC  = [64, 128, 136, 152, 148, 484]
  const SCX: number[] = (() => { const xs: number[] = []; let x = M; for (const w of SC) { xs.push(x); x += w } return xs })()
  const SH  = ['集装箱', '件数', '填充率', '总重量 kg', '体积 m³', '状态']
  const SRH = 36

  ctx.fillStyle = ROW_H_BG; ctx.fillRect(M, y, CW, SRH)
  font(ctx, 11, true); ctx.fillStyle = D2
  for (let i = 0; i < SH.length; i++) {
    const center = i >= 1 && i <= 4
    ctx.textAlign = center ? 'center' : 'left'
    ctx.fillText(SH[i], center ? SCX[i] + SC[i] / 2 : SCX[i] + 8, y + 23)
  }
  ctx.textAlign = 'left'
  ctx.strokeStyle = D4; ctx.lineWidth = 0.5; ctx.strokeRect(M, y, CW, SRH)
  y += SRH

  for (let i = 0; i < bins.length; i++) {
    const bin = bins[i]
    ctx.fillStyle = i % 2 === 0 ? ROW_A : BG; ctx.fillRect(M, y, CW, SRH)
    font(ctx, 11)
    const rv = [
      `集装箱 #${i + 1}`,
      String(bin.placed.length),
      `${(bin.fill_ratio * 100).toFixed(1)}%`,
      bin.total_weight_kg.toLocaleString(),
      (bin.used_volume_mm3 / 1e9).toFixed(2),
      bin.fill_ratio >= 0.85 ? '高效' : bin.fill_ratio >= 0.6 ? '正常' : '偏低',
    ]
    for (let j = 0; j < rv.length; j++) {
      const center = j >= 1 && j <= 4
      ctx.fillStyle = j === 5
        ? (bin.fill_ratio >= 0.85 ? '#2a7a42' : bin.fill_ratio >= 0.6 ? D3 : '#cc8833')
        : (j === 0 ? D1 : D2)
      ctx.textAlign = center ? 'center' : 'left'
      ctx.fillText(rv[j], center ? SCX[j] + SC[j] / 2 : SCX[j] + 8, y + 23)
    }
    ctx.textAlign = 'left'
    ctx.strokeStyle = D4; ctx.lineWidth = 0.3
    ctx.beginPath(); ctx.moveTo(M, y + SRH); ctx.lineTo(M + CW, y + SRH); ctx.stroke()
    y += SRH
  }

  if (unplaced.length > 0) {
    y += 20
    y = drawSectionLabel(ctx, y, `未装载货物（${unplaced.length} 件）`) + 8
    font(ctx, 11); ctx.fillStyle = '#cc4444'
    const str = unplaced.slice(0, 10).map(u => u.name).join('、') + (unplaced.length > 10 ? ` …等 ${unplaced.length} 件` : '')
    ctx.fillText(str, M, y + 16)
    y += 32
  }

  // Container spec strip
  y = Math.max(y + 24, FOOTER_SAFE - 72)
  rrect(ctx, M, y, CW, 64, 8)
  ctx.fillStyle = CARD; ctx.fill()
  ctx.strokeStyle = D4; ctx.lineWidth = 0.5; ctx.stroke()
  font(ctx, 10, true); ctx.fillStyle = D3
  ctx.fillText('集装箱参数（ISO 20GP 标准）', M + 16, y + 20)
  font(ctx, 10); ctx.fillStyle = D2
  ctx.fillText(
    `内径：5,898 mm (L) × 2,352 mm (W) × 2,393 mm (H)    容积：${(CON_L * CON_W * CON_H / 1e9).toFixed(2)} m³    禁止翻转，可水平旋转 90°`,
    M + 16, y + 44
  )

  drawFooter(ctx, pageNum, dateStr)

  // ── Pages 2+: Per-bin details ────────────────────────────────────────────────
  for (let bi = 0; bi < bins.length; bi++) {
    const bin = bins[bi]
    ctx = newPage()
    drawHeader(
      ctx,
      `集装箱 #${bi + 1}  装载明细`,
      `共 ${bin.placed.length} 件  ·  填充率 ${(bin.fill_ratio * 100).toFixed(1)}%  ·  总重 ${bin.total_weight_kg.toLocaleString()} kg`,
      dateStr
    )

    y = M + 96
    y = drawStatCards(ctx, y, [
      { label: '货物件数', value: String(bin.placed.length) },
      { label: '填充率', value: `${(bin.fill_ratio * 100).toFixed(1)}%`, hi: bin.fill_ratio >= 0.85 },
      { label: '总重量',  value: bin.total_weight_kg.toLocaleString(), sub: 'kg' },
      { label: '已用体积', value: (bin.used_volume_mm3 / 1e9).toFixed(2), sub: 'm³' },
    ]) + 20

    y = drawSectionLabel(ctx, y, '截面视图') + 8
    const VH = 222
    const VW = (CW - 12) / 2
    drawTopView(ctx, bin.placed, M, y, VW, VH)
    drawSideView(ctx, bin.placed, M + VW + 12, y, VW, VH)
    y += VH + 20

    y = drawSectionLabel(ctx, y, '货物装载清单') + 4
    let ty = drawTableHeader(ctx, y)

    for (let ii = 0; ii < bin.placed.length; ii++) {
      if (ty + ROW_H > FOOTER_SAFE) {
        drawFooter(ctx, pageNum, dateStr)
        ctx = newPage()
        font(ctx, 13, true); ctx.fillStyle = D1
        ctx.fillText(`集装箱 #${bi + 1} 装载清单（续）`, M, M + 24)
        ctx.strokeStyle = D4; ctx.lineWidth = 1
        ctx.beginPath(); ctx.moveTo(M, M + 36); ctx.lineTo(PW - M, M + 36); ctx.stroke()
        ty = M + 52
        ty = drawTableHeader(ctx, ty)
      }
      ty = drawTableRow(ctx, ty, bin.placed[ii], ii, ii % 2 === 0)
    }

    drawFooter(ctx, pageNum, dateStr)
  }

  // ── Compile to PDF ────────────────────────────────────────────────────────────
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  for (let i = 0; i < pages.length; i++) {
    if (i > 0) pdf.addPage()
    pdf.addImage(pages[i].toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, 210, 297)
  }
  pdf.save(`装载报告_${fileDate}.pdf`)
}
