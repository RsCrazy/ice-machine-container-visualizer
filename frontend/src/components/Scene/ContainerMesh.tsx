import { useRef } from 'react'
import * as THREE from 'three'

interface Props {
  l?: number
  w?: number
  h?: number
}

export default function ContainerMesh({ l = 5898, w = 2352, h = 2393 }: Props) {
  const edgesRef = useRef<THREE.LineSegments>(null)

  return (
    <group position={[l / 2, h / 2, w / 2]}>
      {/* Faint filled box for depth cueing */}
      <mesh>
        <boxGeometry args={[l, h, w]} />
        <meshBasicMaterial
          color={0x1a1a2a}
          transparent
          opacity={0.12}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Gold wireframe edges */}
      <lineSegments ref={edgesRef}>
        <edgesGeometry args={[new THREE.BoxGeometry(l, h, w)]} />
        <lineBasicMaterial color={0xc9a96e} transparent opacity={0.7} />
      </lineSegments>
    </group>
  )
}
