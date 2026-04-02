import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const WAVE_COUNT = 800

export function CubeAvatar({ size, speed, color }) {
  const meshRef = useRef()

  useFrame(() => {
    if (!meshRef.current) return
    meshRef.current.rotation.x += speed
    meshRef.current.rotation.y += speed
  })

  return (
    <mesh ref={meshRef}>
      <boxGeometry args={[size, size, size]} />
      <meshStandardMaterial color={color} />
    </mesh>
  )
}

export function SwarmAvatar({ count, spread, color }) {
  const pointsGeoRef = useRef()
  const linesGeoRef  = useRef()
  const activeBufs   = useRef(null)

  const bufs = useMemo(() => {
    const seeds  = new Float32Array(count * 3)
    const phases = new Float32Array(count * 3)
    const pos    = new Float32Array(count * 3)
    const lines  = new Float32Array(count * (count - 1) * 3)
    for (let i = 0; i < count; i++) {
      const theta  = Math.random() * Math.PI * 2
      const phi    = Math.acos(2 * Math.random() - 1)
      seeds[i*3]   = Math.sin(phi) * Math.cos(theta)
      seeds[i*3+1] = Math.cos(phi)
      seeds[i*3+2] = Math.sin(phi) * Math.sin(theta)
      phases[i*3]   = Math.random() * Math.PI * 2
      phases[i*3+1] = Math.random() * Math.PI * 2
      phases[i*3+2] = Math.random() * Math.PI * 2
    }
    return { seeds, phases, pos, lines }
  }, [count])

  useFrame((state) => {
    if (activeBufs.current !== bufs) {
      pointsGeoRef.current?.setAttribute('position', new THREE.BufferAttribute(bufs.pos, 3))
      linesGeoRef.current?.setAttribute('position', new THREE.BufferAttribute(bufs.lines, 3))
      linesGeoRef.current?.setDrawRange(0, 0)
      activeBufs.current = bufs
    }
    if (!pointsGeoRef.current?.attributes.position) return

    const t = state.clock.elapsedTime * 0.4
    const { seeds, phases, pos, lines } = bufs

    for (let i = 0; i < count; i++) {
      const sx = seeds[i*3], sy = seeds[i*3+1], sz = seeds[i*3+2]
      const px = phases[i*3], py = phases[i*3+1], pz = phases[i*3+2]
      const drift = spread * 0.25
      pos[i*3]   = sx * spread + Math.sin(sy*1.7 + t*0.8 + px) * Math.cos(sz*1.3 + t*0.6) * drift
      pos[i*3+1] = sy * spread + Math.sin(sz*1.7 + t*0.8 + py) * Math.cos(sx*1.3 + t*0.6) * drift
      pos[i*3+2] = sz * spread + Math.sin(sx*1.7 + t*0.8 + pz) * Math.cos(sy*1.3 + t*0.6) * drift
    }
    pointsGeoRef.current.attributes.position.needsUpdate = true

    if (!linesGeoRef.current?.attributes.position) return

    const r2 = (spread * 0.75) ** 2
    let li = 0
    for (let i = 0; i < count; i++) {
      for (let j = i + 1; j < count; j++) {
        const dx = pos[i*3] - pos[j*3]
        const dy = pos[i*3+1] - pos[j*3+1]
        const dz = pos[i*3+2] - pos[j*3+2]
        if (dx*dx + dy*dy + dz*dz < r2) {
          lines[li++] = pos[i*3];  lines[li++] = pos[i*3+1]; lines[li++] = pos[i*3+2]
          lines[li++] = pos[j*3];  lines[li++] = pos[j*3+1]; lines[li++] = pos[j*3+2]
        }
      }
    }
    linesGeoRef.current.attributes.position.needsUpdate = true
    linesGeoRef.current.setDrawRange(0, li / 3)
  })

  return (
    <group>
      <points>
        <bufferGeometry ref={pointsGeoRef} />
        <pointsMaterial size={0.08} color={color} transparent opacity={0.9} sizeAttenuation />
      </points>
      <lineSegments>
        <bufferGeometry ref={linesGeoRef} />
        <lineBasicMaterial color={color} transparent opacity={0.15} />
      </lineSegments>
    </group>
  )
}

export function Swarm2Avatar({ count, speed, size, color }) {
  const pointsGeoRef = useRef()
  const linesGeoRef  = useRef()
  const activeBufs   = useRef(null)

  // Single memo — all three buffers share the same identity token
  const bufs = useMemo(() => {
    const origins = new Float32Array(count * 3)
    const pos     = new Float32Array(count * 3)
    const lines   = new Float32Array(count * count * 3)
    for (let i = 0; i < count; i++) {
      const r     = Math.random() * 2.5
      const theta = Math.random() * Math.PI * 2
      const phi   = Math.acos(2 * Math.random() - 1)
      origins[i*3]   = r * Math.sin(phi) * Math.cos(theta)
      origins[i*3+1] = r * Math.cos(phi)
      origins[i*3+2] = r * Math.sin(phi) * Math.sin(theta)
    }
    return { origins, pos, lines }
  }, [count])

  useFrame((state) => {
    // Re-bind GPU attributes whenever count changes (bufs is a new object)
    if (activeBufs.current !== bufs) {
      pointsGeoRef.current?.setAttribute('position', new THREE.BufferAttribute(bufs.pos, 3))
      linesGeoRef.current?.setAttribute('position', new THREE.BufferAttribute(bufs.lines, 3))
      linesGeoRef.current?.setDrawRange(0, 0)
      activeBufs.current = bufs
    }
    if (!pointsGeoRef.current?.attributes.position) return

    const t = state.clock.elapsedTime
    const { origins, pos, lines } = bufs

    for (let i = 0; i < count; i++) {
      const ox = origins[i*3], oy = origins[i*3+1], oz = origins[i*3+2]
      pos[i*3]   = (ox + Math.sin(t * speed + oy * 0.5) * 1.2 + Math.cos(t * speed * 0.7 + oz * 0.8) * 0.5) * size
      pos[i*3+1] = (oy + Math.cos(t * speed + oz * 0.5) * 1.2 + Math.sin(t * speed * 0.9 + ox * 0.6) * 0.5) * size
      pos[i*3+2] = (oz + Math.sin(t * speed * 0.8 + ox * 0.5) * 1.2 + Math.cos(t * speed * 0.6 + oy * 0.7) * 0.5) * size
    }
    pointsGeoRef.current.attributes.position.needsUpdate = true

    if (!linesGeoRef.current?.attributes.position) return

    const threshold2 = (1.5 * size) ** 2
    let li = 0
    for (let i = 0; i < count; i++) {
      for (let j = i + 1; j < count; j++) {
        const dx = pos[i*3] - pos[j*3]
        const dy = pos[i*3+1] - pos[j*3+1]
        const dz = pos[i*3+2] - pos[j*3+2]
        if (dx*dx + dy*dy + dz*dz < threshold2) {
          lines[li++] = pos[i*3];  lines[li++] = pos[i*3+1]; lines[li++] = pos[i*3+2]
          lines[li++] = pos[j*3];  lines[li++] = pos[j*3+1]; lines[li++] = pos[j*3+2]
        }
      }
    }
    linesGeoRef.current.attributes.position.needsUpdate = true
    linesGeoRef.current.setDrawRange(0, li / 3)
  })

  return (
    <group>
      <points>
        <bufferGeometry ref={pointsGeoRef} />
        <pointsMaterial size={0.1} color={color} transparent opacity={0.8} depthWrite={false} blending={THREE.AdditiveBlending} sizeAttenuation />
      </points>
      <lineSegments>
        <bufferGeometry ref={linesGeoRef} />
        <lineBasicMaterial color={color} transparent opacity={0.3} depthWrite={false} blending={THREE.AdditiveBlending} />
      </lineSegments>
    </group>
  )
}

export function WaveAvatar({ amplitude, frequency, color }) {
  const geoRef = useRef()

  const { seeds, posBuffer } = useMemo(() => {
    const seeds     = new Float32Array(WAVE_COUNT * 3)
    const posBuffer = new Float32Array(WAVE_COUNT * 3)
    for (let i = 0; i < WAVE_COUNT; i++) {
      const theta  = Math.random() * Math.PI * 2
      const phi    = Math.acos(2 * Math.random() - 1)
      seeds[i*3]   = Math.sin(phi) * Math.cos(theta)
      seeds[i*3+1] = Math.cos(phi)
      seeds[i*3+2] = Math.sin(phi) * Math.sin(theta)
    }
    return { seeds, posBuffer }
  }, [])

  useFrame((state) => {
    const t = state.clock.elapsedTime
    for (let i = 0; i < WAVE_COUNT; i++) {
      const sx = seeds[i*3], sy = seeds[i*3+1], sz = seeds[i*3+2]
      const angle  = Math.atan2(sy, sx)
      const polar  = Math.acos(Math.max(-1, Math.min(1, sz)))
      const ripple = Math.sin(angle * 3 + polar * 4 + t * frequency) * amplitude * 0.5
                   + Math.sin(angle * 5 - polar * 2 + t * frequency * 1.3) * amplitude * 0.2
      const r = 3 + ripple
      posBuffer[i*3]   = sx * r
      posBuffer[i*3+1] = sy * r
      posBuffer[i*3+2] = sz * r
    }
    if (geoRef.current?.attributes.position) {
      geoRef.current.attributes.position.needsUpdate = true
    }
  })

  return (
    <points>
      <bufferGeometry ref={geoRef}>
        <bufferAttribute attach="attributes-position" count={WAVE_COUNT} array={posBuffer} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        size={0.07}
        color={color}
        transparent
        opacity={0.7}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  )
}

const GHOST_SEG = 40

export function GhostAvatar({ distort, speed, size, color }) {
  const meshRef = useRef()

  // Base sphere positions — generated once, used as displacement origin
  const basePos = useMemo(() => {
    const geo = new THREE.SphereGeometry(1.2, GHOST_SEG, GHOST_SEG)
    const copy = geo.attributes.position.array.slice()
    geo.dispose()
    return copy
  }, [])

  useFrame((state) => {
    if (!meshRef.current) return
    const t   = state.clock.elapsedTime * speed * 0.25
    const pos = meshRef.current.geometry.attributes.position.array

    for (let i = 0; i < pos.length; i += 3) {
      const ox = basePos[i], oy = basePos[i + 1], oz = basePos[i + 2]
      const len = Math.sqrt(ox * ox + oy * oy + oz * oz) || 1
      const d = Math.sin(ox * 2.5 + t) * Math.cos(oy * 2.1 + t * 1.1) * Math.sin(oz * 1.8 + t * 0.9) * distort
      pos[i]     = (ox + (ox / len) * d) * size
      pos[i + 1] = (oy + (oy / len) * d) * size
      pos[i + 2] = (oz + (oz / len) * d) * size
    }
    meshRef.current.geometry.attributes.position.needsUpdate = true
  })

  return (
    <group>
      <pointLight position={[3, 2, 3]}    intensity={1.5} color="#ffffff" />
      <pointLight position={[-2, -2, -1]} intensity={0.8} color={color} />
      <mesh ref={meshRef}>
        <sphereGeometry args={[1.2, GHOST_SEG, GHOST_SEG]} />
        <meshPhysicalMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.25}
          roughness={0.05}
          metalness={0.2}
          transparent
          opacity={0.85}
          transmission={0.4}
          thickness={1.5}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  )
}
