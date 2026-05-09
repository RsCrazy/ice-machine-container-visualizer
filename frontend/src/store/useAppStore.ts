import { create } from 'zustand'
import type { ItemIn, ItemType, PackResponse } from '../types/api'

// ── localStorage helpers ──────────────────────────────────────────────────────
const LS_KEY = 'ice-machine-item-types'

const DEFAULT_TYPES: ItemType[] = [
  { id: 'default-1', model: 'IcePro-L1500', length: 760, width: 690, height: 1580, weight: 162 },
  { id: 'default-2', model: 'IcePro-M1200', length: 640, width: 610, height: 1280, weight: 118 },
  { id: 'default-3', model: 'IceMid-S900',  length: 560, width: 530, height: 990,  weight: 83  },
  { id: 'default-4', model: 'IceMini-700',  length: 450, width: 420, height: 780,  weight: 51  },
]

function loadTypes(): ItemType[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) return JSON.parse(raw) as ItemType[]
  } catch { /* ignore */ }
  return DEFAULT_TYPES
}

function saveTypes(types: ItemType[]) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(types)) } catch { /* ignore */ }
}

// ── App state ─────────────────────────────────────────────────────────────────
export interface AppState {
  // item type library
  itemTypes: ItemType[]
  addItemType: (t: ItemType) => void
  removeItemType: (id: string) => void

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

const INITIAL_ITEMS: ItemIn[] = [
  { name: 'IcePro-L1500-001', model: 'IcePro-L1500', length: 760, width: 690, height: 1580, weight: 162 },
  { name: 'IcePro-L1500-002', model: 'IcePro-L1500', length: 760, width: 690, height: 1580, weight: 162 },
  { name: 'IcePro-M1200-001', model: 'IcePro-M1200', length: 640, width: 610, height: 1280, weight: 118 },
  { name: 'IcePro-M1200-002', model: 'IcePro-M1200', length: 640, width: 610, height: 1280, weight: 118 },
  { name: 'IcePro-M1200-003', model: 'IcePro-M1200', length: 640, width: 610, height: 1280, weight: 118 },
  { name: 'IceMid-S900-001',  model: 'IceMid-S900',  length: 560, width: 530, height: 990,  weight: 83  },
  { name: 'IceMid-S900-002',  model: 'IceMid-S900',  length: 560, width: 530, height: 990,  weight: 83  },
  { name: 'IceMid-S900-003',  model: 'IceMid-S900',  length: 560, width: 530, height: 990,  weight: 83  },
  { name: 'IceMid-S900-004',  model: 'IceMid-S900',  length: 560, width: 530, height: 990,  weight: 83  },
  { name: 'IceMini-700-001',  model: 'IceMini-700',  length: 450, width: 420, height: 780,  weight: 51  },
  { name: 'IceMini-700-002',  model: 'IceMini-700',  length: 450, width: 420, height: 780,  weight: 51  },
  { name: 'IceMini-700-003',  model: 'IceMini-700',  length: 450, width: 420, height: 780,  weight: 51  },
  { name: 'IceMini-700-004',  model: 'IceMini-700',  length: 450, width: 420, height: 780,  weight: 51  },
  { name: 'IceMini-700-005',  model: 'IceMini-700',  length: 450, width: 420, height: 780,  weight: 51  },
  { name: 'IceMini-700-006',  model: 'IceMini-700',  length: 450, width: 420, height: 780,  weight: 51  },
]

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

  items: INITIAL_ITEMS,
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
  setPackResult:      (r) => set({ packResult: r, activeBin: 0, layerHeight: 2393 }),
  setActiveBin:       (i) => set({ activeBin: i, highlightedItem: null }),
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
