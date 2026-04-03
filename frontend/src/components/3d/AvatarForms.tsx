import { useRef, useMemo, useEffect, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { MathUtils } from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { VRMLoaderPlugin } from '@pixiv/three-vrm'

const WAVE_COUNT = 800

interface CubeAvatarProps {
  size: number
  speed: number
  color: string
}

export function CubeAvatar({ size, speed, color }: CubeAvatarProps) {
  const groupRef = useRef<THREE.Group>(null!)

  const edgesGeo = useMemo(
    () => new THREE.EdgesGeometry(new THREE.BoxGeometry(size, size, size)),
    [size]
  )

  useFrame(() => {
    if (!groupRef.current) return
    groupRef.current.rotation.x += speed
    groupRef.current.rotation.y += speed
  })

  return (
    <group ref={groupRef}>
      <mesh>
        <boxGeometry args={[size, size, size]} />
        <meshPhysicalMaterial color="#111111" transparent={true} opacity={0.7} roughness={0.2} metalness={0.8} />
        <pointLight distance={size * 2} intensity={2} color={color} />
      </mesh>
      <lineSegments geometry={edgesGeo}>
        <lineBasicMaterial color={color} />
      </lineSegments>
    </group>
  )
}

interface SwarmAvatarProps {
  count: number
  spread: number
  color: string
}

interface SwarmBuffers {
  seeds: Float32Array
  phases: Float32Array
  pos: Float32Array
  lines: Float32Array
}

export function SwarmAvatar({ count, spread, color }: SwarmAvatarProps) {
  const pointsGeoRef = useRef<THREE.BufferGeometry>(null!)
  const linesGeoRef  = useRef<THREE.BufferGeometry>(null!)
  const activeBufs   = useRef<SwarmBuffers | null>(null)

  const bufs = useMemo<SwarmBuffers>(() => {
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

interface Swarm2AvatarProps {
  count: number
  speed: number
  size: number
  color: string
}

interface Swarm2Buffers {
  origins: Float32Array
  pos: Float32Array
  lines: Float32Array
}

export function Swarm2Avatar({ count, speed, size, color }: Swarm2AvatarProps) {
  const pointsGeoRef = useRef<THREE.BufferGeometry>(null!)
  const linesGeoRef  = useRef<THREE.BufferGeometry>(null!)
  const activeBufs   = useRef<Swarm2Buffers | null>(null)

  const bufs = useMemo<Swarm2Buffers>(() => {
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

interface WaveAvatarProps {
  amplitude: number
  frequency: number
  color: string
  size?: number
}

export function WaveAvatar({ amplitude, frequency, color, size = 1.0 }: WaveAvatarProps) {
  const geoRef = useRef<THREE.BufferGeometry>(null!)

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
      const r = 3 * size + ripple
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

interface CoreAvatarProps {
  size?: number
  speed?: number
  color: string
}

export function CoreAvatar({ size = 1, speed = 1, color }: CoreAvatarProps) {
  const ring1Ref = useRef<THREE.Mesh>(null!)
  const ring2Ref = useRef<THREE.Mesh>(null!)
  const ring3Ref = useRef<THREE.Mesh>(null!)

  useFrame((_, delta) => {
    const s = speed * delta
    if (ring1Ref.current) { ring1Ref.current.rotation.x += s * 0.8; ring1Ref.current.rotation.y += s * 1.2 }
    if (ring2Ref.current) { ring2Ref.current.rotation.y += s * 0.6; ring2Ref.current.rotation.z += s * 1.0 }
    if (ring3Ref.current) { ring3Ref.current.rotation.x += s * 1.1; ring3Ref.current.rotation.z += s * 0.7 }
  })

  const ringR = size * 1.5
  const tube  = size * 0.04

  return (
    <group>
      <pointLight intensity={2} distance={size * 4} color={color} />
      <mesh>
        <sphereGeometry args={[size * 0.4, 32, 32]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.5} />
      </mesh>
      <mesh ref={ring1Ref}>
        <torusGeometry args={[ringR, tube, 8, 64]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} />
      </mesh>
      <mesh ref={ring2Ref} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[ringR * 0.85, tube, 8, 64]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} />
      </mesh>
      <mesh ref={ring3Ref} rotation={[0, Math.PI / 4, Math.PI / 2]}>
        <torusGeometry args={[ringR * 0.7, tube, 8, 64]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} />
      </mesh>
    </group>
  )
}

const DNA_POINTS        = 80
const DNA_RUNG_INTERVAL = 4

interface DNAAvatarProps {
  size?: number
  speed?: number
  color: string
}

export function DNAAvatar({ size = 1, speed = 1, color }: DNAAvatarProps) {
  const groupRef = useRef<THREE.Group>(null!)

  const { strand1Pos, strand2Pos, rungPos, rungCount } = useMemo(() => {
    const radius = 1.2 * size
    const vStep  = 0.18 * size
    const yOff   = (DNA_POINTS * vStep) / 2
    const s1 = new Float32Array(DNA_POINTS * 3)
    const s2 = new Float32Array(DNA_POINTS * 3)
    const rc = Math.floor(DNA_POINTS / DNA_RUNG_INTERVAL)
    const rp = new Float32Array(rc * 6)

    for (let i = 0; i < DNA_POINTS; i++) {
      const angle = i * 0.4
      const y     = i * vStep - yOff
      s1[i*3]   = Math.cos(angle) * radius;         s1[i*3+1] = y; s1[i*3+2] = Math.sin(angle) * radius
      s2[i*3]   = Math.cos(angle + Math.PI) * radius; s2[i*3+1] = y; s2[i*3+2] = Math.sin(angle + Math.PI) * radius
    }
    for (let r = 0; r < rc; r++) {
      const i = r * DNA_RUNG_INTERVAL
      rp[r*6]   = s1[i*3]; rp[r*6+1] = s1[i*3+1]; rp[r*6+2] = s1[i*3+2]
      rp[r*6+3] = s2[i*3]; rp[r*6+4] = s2[i*3+1]; rp[r*6+5] = s2[i*3+2]
    }
    return { strand1Pos: s1, strand2Pos: s2, rungPos: rp, rungCount: rc }
  }, [size])

  useFrame((_, delta) => {
    if (groupRef.current) groupRef.current.rotation.y += speed * delta * 0.5
  })

  return (
    <group ref={groupRef}>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={DNA_POINTS} array={strand1Pos} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial size={0.1} color={color} transparent opacity={0.9} blending={THREE.AdditiveBlending} depthWrite={false} sizeAttenuation />
      </points>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={DNA_POINTS} array={strand2Pos} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial size={0.1} color={color} transparent opacity={0.6} blending={THREE.AdditiveBlending} depthWrite={false} sizeAttenuation />
      </points>
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={rungCount * 2} array={rungPos} itemSize={3} />
        </bufferGeometry>
        <lineBasicMaterial color={color} transparent opacity={0.4} blending={THREE.AdditiveBlending} depthWrite={false} />
      </lineSegments>
    </group>
  )
}

interface GLTFAvatarProps {
  url: string
  scale: number
  yOffset?: number
  onFitComputed?: (fit: { scale: number; yOffset: number }) => void
}

export function GLTFAvatar({ url, scale = 2.5, yOffset = -2.0, onFitComputed }: GLTFAvatarProps) {
  const [vrm, setVrm] = useState<any>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const targetMouse = useRef({ x: 0, y: 0 })
  const blinkState = useRef({ nextBlinkTime: 0 })
  const speakingTime = useRef(0)

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      const canvas = document.querySelector('canvas')
      let centerX = window.innerWidth / 2
      let centerY = window.innerHeight / 2
      if (canvas) {
        const rect = canvas.getBoundingClientRect()
        centerX = rect.left + rect.width / 2
        centerY = rect.top + rect.height / 2
      }
      targetMouse.current.x = -(event.clientX - centerX) / (window.innerWidth / 2)
      targetMouse.current.y = (event.clientY - centerY) / (window.innerHeight / 2)
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
    }
  }, [])

  useEffect(() => {
    const handleAudioPlay = (e: Event) => {
      const audio = (e as CustomEvent).detail as HTMLAudioElement
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 256
      const source = audioCtx.createMediaElementSource(audio)
      source.connect(analyser)
      analyser.connect(audioCtx.destination)
      analyserRef.current = analyser
    }
    window.addEventListener('vrm-audio-play', handleAudioPlay)
    return () => {
      window.removeEventListener('vrm-audio-play', handleAudioPlay)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoadError(null)

    const loader = new GLTFLoader()
    loader.register((parser: any) => new VRMLoaderPlugin(parser))

    loader.loadAsync(url)
      .then((gltf) => {
        if (cancelled) return
        const loaded = gltf.userData.vrm
        if (!loaded) {
          const msg = 'VRM data missing in GLTF userData — file may not be a valid VRM'
          console.error('[GLTFAvatar]', msg, gltf.userData)
          setLoadError(msg)
        } else {
          setVrm(loaded)
          if (onFitComputed) {
            const box = new THREE.Box3().setFromObject(loaded.scene)
            const boxHeight = box.max.y - box.min.y
            if (boxHeight > 0) {
              loaded.scene.updateWorldMatrix(true, true)
              const headBone = loaded.humanoid?.getNormalizedBoneNode?.('head')
              const headLocalY = headBone
                ? (() => { const v = new THREE.Vector3(); headBone.getWorldPosition(v); return v.y })()
                : box.min.y + boxHeight * 0.88
              const fitScale = Math.min(Math.max(3.5 / boxHeight, 1.0), 6.0)
              const fitYOffset = Math.min(Math.max(-headLocalY * fitScale, -8), 2)
              onFitComputed({ scale: fitScale, yOffset: fitYOffset })
            }
          }
        }
      })
      .catch((err: Error) => {
        if (cancelled) return
        console.error('[GLTFAvatar] load failed:', err)
        setLoadError(err.message)
      })

    return () => {
      cancelled = true
    }
  }, [url])

  useFrame((state, delta) => {
    try {
      if (vrm) {
        const dt = Math.min(delta, 0.033)
        vrm.update(dt)
      }
      if (vrm && vrm.expressionManager && analyserRef.current) {
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
        analyserRef.current.getByteFrequencyData(dataArray)
        let maxVolume = 0
        for (let i = 0; i < dataArray.length; i++) {
          if (dataArray[i] > maxVolume) maxVolume = dataArray[i]
        }
        const isSpeaking = maxVolume > 30
        if (isSpeaking) {
          speakingTime.current += delta
        } else {
          speakingTime.current = 0
        }
        const amplitude = Math.max(0, Math.min((maxVolume - 30) / 100, 1.0))
        const oscillation = isSpeaking ? (Math.sin(speakingTime.current * 12) * 0.5 + 0.5) : 0
        const targetMouthOpen = amplitude * oscillation
        const currentAa = vrm.expressionManager.getValue('aa') || 0
        vrm.expressionManager.setValue('aa', MathUtils.lerp(currentAa, targetMouthOpen, 0.35))
      }
      if (vrm && vrm.humanoid) {
        const head = vrm.humanoid.getNormalizedBoneNode('head')
        const neck = vrm.humanoid.getNormalizedBoneNode('neck')
        const targetX = MathUtils.clamp(targetMouse.current.y * 0.3, -0.25, 0.25)
        const targetY = MathUtils.clamp(-targetMouse.current.x * 0.5, -0.35, 0.35)
        if (head) {
          head.rotation.x = MathUtils.lerp(head.rotation.x, targetX, 0.05)
          head.rotation.y = MathUtils.lerp(head.rotation.y, targetY, 0.05)
        }
        if (neck) {
          neck.rotation.x = MathUtils.lerp(neck.rotation.x, targetX, 0.05)
          neck.rotation.y = MathUtils.lerp(neck.rotation.y, targetY, 0.05)
        }
      }
      if (vrm && vrm.expressionManager) {
        const time = state.clock.elapsedTime
        if (time >= blinkState.current.nextBlinkTime) {
          vrm.expressionManager.setValue('blink', 1.0)
          setTimeout(() => { if (vrm.expressionManager) vrm.expressionManager.setValue('blink', 0.0) }, 150)
          blinkState.current.nextBlinkTime = time + Math.random() * 4 + 2
        }
      }
      if (vrm && vrm.humanoid) {
        const leftArm = vrm.humanoid.getNormalizedBoneNode('leftUpperArm')
        const rightArm = vrm.humanoid.getNormalizedBoneNode('rightUpperArm')
        if (leftArm) leftArm.rotation.z = -1.2
        if (rightArm) rightArm.rotation.z = 1.2
      }
    } catch (e) {
      console.error('VRM Frame Error:', e)
    }
  })

  if (loadError) {
    return (
      <mesh>
        <sphereGeometry args={[0.4, 16, 16]} />
        <meshStandardMaterial color="red" />
      </mesh>
    )
  }
  if (!vrm) return null

  return (
    <group position={[0, yOffset, 0]}>
      <primitive object={vrm.scene} scale={scale} />
    </group>
  )
}

interface GhostAvatarProps {
  distort: number
  speed: number
  size: number
  color: string
}

const GHOST_SEG = 40

export function GhostAvatar({ distort, speed, size, color }: GhostAvatarProps) {
  const meshRef = useRef<THREE.Mesh>(null!)

  const basePos = useMemo(() => {
    const geo = new THREE.SphereGeometry(1.2, GHOST_SEG, GHOST_SEG)
    const copy = geo.attributes.position.array.slice()
    geo.dispose()
    return copy as Float32Array
  }, [])

  useFrame((state) => {
    if (!meshRef.current) return
    const t   = state.clock.elapsedTime * speed * 0.25
    const pos = meshRef.current.geometry.attributes.position.array as Float32Array

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
