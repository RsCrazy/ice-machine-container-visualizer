import type { ContainerType, ImportPreview, ItemIn, PackResponse } from '../types/api'

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
  containerTypes: ContainerType[] = [],
): Promise<PackResponse> {
  const body: Record<string, unknown> = {
    items: items.map(i => ({
      ...i,
      allow_free_rotation: i.allow_free_rotation ?? false,
    })),
    allow_rotation: allowRotation,
  }

  if (containerTypes.length > 0) {
    body.container_types = containerTypes.map(ct => ({
      name:     ct.name,
      length:   ct.length,
      width:    ct.width,
      height:   ct.height,
      cost_usd: ct.cost,
    }))
  }

  const res = await fetch('/api/pack', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
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
