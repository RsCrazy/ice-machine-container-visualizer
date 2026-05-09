import { Suspense, useState, useCallback, useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import { OrbitControls, GizmoHelper, GizmoViewport } from '@react-three/drei'
import * as THREE from 'three'
import { useAppStore } from '../../store/useAppStore'
import ContainerMesh from './ContainerMesh'
import PlacedItemMesh from './PlacedItemMesh'
import LayerPlane from './LayerPlane'
import Tooltip3D from './Tooltip3D'
import type { PlacedItemOut } from '../../types/api'

const L = 5898, W = 2352, H = 2393

// Minimal interface for OrbitControls ref (avoids three-stdlib direct import)
interface ControlsRef {
  target: THREE.Vector3
  object: THREE.Camera & { position: THREE.Vector3 }
  update(): void
}

// Flies the camera target towards `dest`, maintaining current orbit offset.
// Rendered inside Canvas so useFrame is valid here.
function CameraRig({
  controlsRef,
  dest,
}: {
  controlsRef: React.RefObject<ControlsRef | null>
  dest: THREE.Vector3 | null
}) {
  useFrame(() => {
    const ctrl = controlsRef.current
    if (!ctrl || !dest) return
    if (ctrl.target.distanceTo(dest) < 2) return
    // Keep orbit offset (angle + distance) fixed; only relocate pivot
    const offset = ctrl.object.position.clone().sub(ctrl.target)
    ctrl.target.lerp(dest, 0.1)
    ctrl.object.position.copy(ctrl.target).add(offset)
    ctrl.update()
  })
  return null
}

export default function ContainerScene() {
  const { packResult, activeBin, layerHeight, highlightedItem, setHighlightedItem } = useAppStore()
  const [tooltip, setTooltip] = useState<{ item: PlacedItemOut; order: number; x: number; y: number } | null>(null)
  const controlsRef = useRef<ControlsRef>(null)

  const bin = packResult?.bins[activeBin] ?? null

  // Compute the 3-D centre of the highlighted item (null = no animation)
  const cameraTarget = useMemo<THREE.Vector3 | null>(() => {
    if (!highlightedItem || !bin) return null
    const p = bin.placed.find((it) => it.name === highlightedItem)
    if (!p) return null
    return new THREE.Vector3(
      p.x + p.eff_l / 2,
      p.y + p.height / 2,
      p.z + p.eff_w / 2,
    )
  }, [highlightedItem, bin])

  const handlePointerOver = useCallback((e: ThreeEvent<PointerEvent>, item: PlacedItemOut, order: number) => {
    setTooltip({ item, order, x: e.clientX, y: e.clientY })
  }, [])
  const handlePointerOut = useCallback(() => setTooltip(null), [])

  return (
    <div className="relative w-full h-full bg-[#121212]">
      <Canvas
        camera={{ position: [L * 0.9, H * 0.8, W * 1.4], fov: 45, near: 1, far: 60000 }}
        gl={{ antialias: true, alpha: false }}
        style={{ background: '#121212' }}
        onPointerMissed={() => setHighlightedItem(null)}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[L, H * 2, W]} intensity={0.8} />
        <directionalLight position={[-L, H, -W]} intensity={0.3} />

        <Suspense fallback={null}>
          <ContainerMesh />
          <LayerPlane height={layerHeight} />

          {bin?.placed.map((p, i) => (
            <PlacedItemMesh
              key={p.name}
              item={p}
              order={i + 1}
              highlighted={highlightedItem === p.name}
              layerHeight={layerHeight}
              onClick={() => setHighlightedItem(p.name === highlightedItem ? null : p.name)}
              onPointerOver={handlePointerOver}
              onPointerOut={handlePointerOut}
            />
          ))}

          {/* Empty container hint */}
          {!bin && (
            <mesh position={[L / 2, H / 2, W / 2]}>
              <boxGeometry args={[1, 1, 1]} />
              <meshBasicMaterial visible={false} />
            </mesh>
          )}
        </Suspense>

        <CameraRig controlsRef={controlsRef} dest={cameraTarget} />

        <OrbitControls
          ref={controlsRef as React.RefObject<never>}
          target={[L / 2, H / 2, W / 2]}
          minDistance={500}
          maxDistance={30000}
          enableDamping
          dampingFactor={0.08}
        />
        <GizmoHelper alignment="bottom-right" margin={[60, 60]}>
          <GizmoViewport axisColors={['#e86e6e', '#50c87a', '#4f93e8']} labelColor="#ddd" />
        </GizmoHelper>
      </Canvas>

      {/* Floating label */}
      <div className="absolute top-3 left-3 text-[10px] uppercase tracking-widest text-[#444] select-none">
        20GP 集装箱 · {L}×{W}×{H} mm
      </div>

      {tooltip && (
        <Tooltip3D
          item={tooltip.item}
          order={tooltip.order}
          x={tooltip.x}
          y={tooltip.y}
        />
      )}
    </div>
  )
}
