export interface ContainerType {
  id: string
  name: string
  length: number
  width: number
  height: number
  cost: number
}

export interface ItemType {
  id: string
  model: string
  length: number
  width: number
  height: number
  weight: number
  allowFreeRotation?: boolean
}

export interface ItemIn {
  name: string
  model: string
  length: number
  width: number
  height: number
  weight: number
  allow_free_rotation?: boolean
}

export interface PlacedItemOut {
  name: string
  model: string
  x: number
  y: number
  z: number
  eff_l: number
  eff_w: number
  height: number   // effective placed height (eff_h)
  rotation: number // 0–5
  support_ratio: number
  weight: number
}

export interface CostComparisonItem {
  type_name: string
  num_bins: number
  total_cost: number
}

export interface BinOut {
  index: number
  container_type: string
  container_l: number
  container_w: number
  container_h: number
  placed: PlacedItemOut[]
  fill_ratio: number
  total_weight_kg: number
  used_volume_mm3: number
}

export interface UnplacedItemOut {
  name: string
  model: string
  length: number
  width: number
  height: number
  weight: number
}

export interface PackStats {
  num_containers: number
  lower_bound: number
  gap: number
  total_weight_kg: number
  volume_util_pct: number
  unplaced_count: number
  items_packed: number
}

export interface PackResponse {
  bins: BinOut[]
  unplaced: UnplacedItemOut[]
  lower_bound: number
  stats: PackStats
  cost_comparison: CostComparisonItem[]
}

export interface ImportPreview {
  parsed_items: ItemIn[]
  pack_result: PackResponse
}
