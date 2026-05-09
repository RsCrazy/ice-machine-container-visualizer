import { useRef, useState } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import type { PlacedItemOut } from '../../types/api'
import { modelColor } from '../../store/useAppStore'

interface Props {
  item: PlacedItemOut
  order: number          // 1-based placement order
  highlighted: boolean
  layerHeight: number    // mm — fade out items above this
  onClick: () => void
  onPointerOver: (e: ThreeEvent<PointerEvent>, item: PlacedItemOut, order: number) => void
  onPointerOut: () => void
}

export default function PlacedItemMesh({
  item, order, highlighted, layerHeight, onClick, onPointerOver, onPointerOut,
}: Props) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [hovered, setHovered] = useState(false)

  const cx = item.x + item.eff_l / 2
  const cy = item.y + item.height / 2
  const cz = item.z + item.eff_w / 2

  const aboveLayer = item.y >= layerHeight - 1
  const opacity    = aboveLayer ? 0.08 : highlighted ? 0.95 : hovered ? 0.9 : 0.75
  const color      = modelColor(item.model)

  return (
    <group position={[cx, cy, cz]}>
      {/* Solid fill */}
      <mesh
        ref={meshRef}
        onClick={onClick}
        onPointerOver={(e) => {
          e.stopPropagation()
          setHovered(true)
          onPointerOver(e, item, order)
        }}
        onPointerOut={() => {
          setHovered(false)
          onPointerOut()
        }}
      >
        <boxGeometry args={[item.eff_l, item.height, item.eff_w]} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={opacity}
          roughness={0.6}
          metalness={0.1}
        />
      </mesh>

      {/* Edge highlight when hovered or highlighted */}
      {(hovered || highlighted) && !aboveLayer && (
        <lineSegments>
          <edgesGeometry args={[new THREE.BoxGeometry(item.eff_l, item.height, item.eff_w)]} />
          <lineBasicMaterial color={0xffffff} transparent opacity={0.6} />
        </lineSegments>
      )}
    </group>
  )
}
