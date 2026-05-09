import { useRef } from 'react'
import * as THREE from 'three'

// 20GP inner dimensions in mm → Three.js units (1 unit = 1 mm)
const L = 5898, W = 2352, H = 2393

export default function ContainerMesh() {
  const edgesRef = useRef<THREE.LineSegments>(null)

  return (
    <group position={[L / 2, H / 2, W / 2]}>
      {/* Faint filled box for depth cueing */}
      <mesh>
        <boxGeometry args={[L, H, W]} />
        <meshBasicMaterial
          color={0x1a1a2a}
          transparent
          opacity={0.12}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Gold wireframe edges */}
      <lineSegments ref={edgesRef}>
        <edgesGeometry args={[new THREE.BoxGeometry(L, H, W)]} />
        <lineBasicMaterial color={0xc9a96e} transparent opacity={0.7} />
      </lineSegments>
    </group>
  )
}
