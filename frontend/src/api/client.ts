import type { ImportPreview, ItemIn, PackResponse } from '../types/api'

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail ?? `HTTP ${res.status}`)
  }
  return res.json() as Promise<T>
}

export async function packItems(
  items: ItemIn[],
  allowRotation = true,
): Promise<PackResponse> {
  const res = await fetch('/api/pack', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items, allow_rotation: allowRotation }),
  })
  return handleResponse<PackResponse>(res)
}

export async function importFile(
  file: File,
  allowRotation = true,
): Promise<ImportPreview> {
  const fd = new FormData()
  fd.append('file', file)
  fd.append('allow_rotation', String(allowRotation))
  const res = await fetch('/api/import', { method: 'POST', body: fd })
  return handleResponse<ImportPreview>(res)
}
