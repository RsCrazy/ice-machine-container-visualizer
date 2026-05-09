import * as THREE from 'three'

const L = 5898, W = 2352

interface Props { height: number }

export default function LayerPlane({ height }: Props) {
  if (height >= 2393 - 1) return null
  return (
    <group position={[L / 2, height, W / 2]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[L, W]} />
        <meshBasicMaterial
          color={0xc9a96e}
          transparent
          opacity={0.07}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Dashed border line using line loop */}
      <lineLoop>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[new Float32Array([
              -L / 2, 0, -W / 2,
               L / 2, 0, -W / 2,
               L / 2, 0,  W / 2,
              -L / 2, 0,  W / 2,
            ]), 3]}
          />
        </bufferGeometry>
        <lineBasicMaterial color={0xc9a96e} transparent opacity={0.6} />
      </lineLoop>
    </group>
  )
}
