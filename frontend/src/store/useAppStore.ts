import { create } from 'zustand'
import type { ContainerType, ItemIn, ItemType, PackResponse } from '../types/api'

// ── localStorage helpers ──────────────────────────────────────────────────────
const LS_KEY_TYPES       = 'ice-machine-item-types'
const LS_KEY_CONTAINERS  = 'ice-machine-container-types'
const LS_KEY_SELECTED    = 'ice-machine-selected-containers'

const DEFAULT_TYPES: ItemType[] = [
  { id: 'default-1', model: 'IcePro-L1500', length: 760, width: 690, height: 1580, weight: 162, allowFreeRotation: false },
  { id: 'default-2', model: 'IcePro-M1200', length: 640, width: 610, height: 1280, weight: 118, allowFreeRotation: false },
  { id: 'default-3', model: 'IceMid-S900',  length: 560, width: 530, height: 990,  weight: 83,  allowFreeRotation: false },
  { id: 'default-4', model: 'IceMini-700',  length: 450, width: 420, height: 780,  weight: 51,  allowFreeRotation: false },
]

const DEFAULT_CONTAINERS: ContainerType[] = [
  { id: 'default-20gp', name: '20GP', length: 5898,  width: 2352, height: 2393, cost: 2800 },
  { id: 'default-40gp', name: '40GP', length: 12032, width: 2352, height: 2393, cost: 4500 },
  { id: 'default-40hc', name: '40HC', length: 12032, width: 2352, height: 2698, cost: 5000 },
]

function loadTypes(): ItemType[] {
  try {
    const raw = localStorage.getItem(LS_KEY_TYPES)
    if (raw) return JSON.parse(raw) as ItemType[]
  } catch { /* ignore */ }
  return DEFAULT_TYPES
}

function saveTypes(types: ItemType[]) {
  try { localStorage.setItem(LS_KEY_TYPES, JSON.stringify(types)) } catch { /* ignore */ }
}

function loadContainers(): ContainerType[] {
  try {
    const raw = localStorage.getItem(LS_KEY_CONTAINERS)
    if (raw) return JSON.parse(raw) as ContainerType[]
  } catch { /* ignore */ }
  return DEFAULT_CONTAINERS
}

function saveContainers(containers: ContainerType[]) {
  try { localStorage.setItem(LS_KEY_CONTAINERS, JSON.stringify(containers)) } catch { /* ignore */ }
}

function loadSelectedContainerIds(allIds: string[]): string[] {
  try {
    const raw = localStorage.getItem(LS_KEY_SELECTED)
    if (raw) {
      const saved = JSON.parse(raw) as string[]
      // Keep only IDs that still exist
      const valid = saved.filter(id => allIds.includes(id))
      if (valid.length > 0) return valid
    }
  } catch { /* ignore */ }
  // Default: only 20GP selected
  return allIds.slice(0, 1)
}

function saveSelectedIds(ids: string[]) {
  try { localStorage.setItem(LS_KEY_SELECTED, JSON.stringify(ids)) } catch { /* ignore */ }
}

// ── App state ─────────────────────────────────────────────────────────────────
export interface AppState {
  // item type library
  itemTypes: ItemType[]
  addItemType: (t: ItemType) => void
  removeItemType: (id: string) => void

  // container type library
  containerTypes: ContainerType[]
  selectedContainerIds: string[]
  addContainerType: (c: ContainerType) => void
  removeContainerType: (id: string) => void
  toggleContainerSelected: (id: string) => void

  // cargo manifest
  items: ItemIn[]
  allowRotation: boolean

  // result
  packResult: PackResponse | null
  activeBin: number
  layerHeight: number
  highlightedItem: string | null

  // ui
  isLoading: boolean
  error: string | null

  // actions
  setItems: (items: ItemIn[]) => void
  addItem: (item: ItemIn) => void
  removeItem: (name: string) => void
  setAllowRotation: (v: boolean) => void
  setPackResult: (r: PackResponse | null) => void
  setActiveBin: (i: number) => void
  setLayerHeight: (h: number) => void
  setHighlightedItem: (name: string | null) => void
  setLoading: (v: boolean) => void
  setError: (msg: string | null) => void
  reset: () => void
}

const _initContainers  = loadContainers()
const _initSelectedIds = loadSelectedContainerIds(_initContainers.map(c => c.id))

export const useAppStore = create<AppState>((set) => ({
  itemTypes: loadTypes(),

  addItemType: (t) => set((s) => {
    const next = [...s.itemTypes, t]
    saveTypes(next)
    return { itemTypes: next }
  }),

  removeItemType: (id) => set((s) => {
    const next = s.itemTypes.filter((t) => t.id !== id)
    saveTypes(next)
    return { itemTypes: next }
  }),

  containerTypes:       _initContainers,
  selectedContainerIds: _initSelectedIds,

  addContainerType: (c) => set((s) => {
    const next = [...s.containerTypes, c]
    const sel  = [...s.selectedContainerIds, c.id]
    saveContainers(next)
    saveSelectedIds(sel)
    return { containerTypes: next, selectedContainerIds: sel }
  }),

  removeContainerType: (id) => set((s) => {
    const next = s.containerTypes.filter((c) => c.id !== id)
    const sel  = s.selectedContainerIds.filter((sid) => sid !== id)
    saveContainers(next)
    saveSelectedIds(sel)
    return { containerTypes: next, selectedContainerIds: sel }
  }),

  toggleContainerSelected: (id) => set((s) => {
    const sel = s.selectedContainerIds.includes(id)
      ? s.selectedContainerIds.filter((sid) => sid !== id)
      : [...s.selectedContainerIds, id]
    saveSelectedIds(sel)
    return { selectedContainerIds: sel }
  }),

  items: [],
  allowRotation: true,
  packResult: null,
  activeBin: 0,
  layerHeight: 2393,
  highlightedItem: null,
  isLoading: false,
  error: null,

  setItems:           (items) => set({ items }),
  addItem:            (item) => set((s) => ({ items: [...s.items, item] })),
  removeItem:         (name) => set((s) => ({ items: s.items.filter((i) => i.name !== name) })),
  setAllowRotation:   (v) => set({ allowRotation: v }),
  setPackResult:      (r) => set({
    packResult: r,
    activeBin: 0,
    layerHeight: r?.bins[0]?.container_h ?? 2393,
  }),
  setActiveBin: (i) => set((s) => ({
    activeBin: i,
    highlightedItem: null,
    layerHeight: s.packResult?.bins[i]?.container_h ?? 2393,
  })),
  setLayerHeight:     (h) => set({ layerHeight: h }),
  setHighlightedItem: (name) => set({ highlightedItem: name }),
  setLoading:         (v) => set({ isLoading: v }),
  setError:           (msg) => set({ error: msg }),
  reset:              () => set({ packResult: null, activeBin: 0, layerHeight: 2393, error: null }),
}))

// ── Color helpers ─────────────────────────────────────────────────────────────
const PALETTE = ['#4f93e8', '#50c87a', '#e8944f', '#e86e6e', '#a47fe8', '#4fe8d0']
const _modelColorCache = new Map<string, string>()

export function modelColor(model: string): string {
  if (!_modelColorCache.has(model)) {
    _modelColorCache.set(model, PALETTE[_modelColorCache.size % PALETTE.length])
  }
  return _modelColorCache.get(model)!
}
