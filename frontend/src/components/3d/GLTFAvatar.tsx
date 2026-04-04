import { useState, useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { MathUtils } from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { VRMLoaderPlugin } from '@pixiv/three-vrm'

// VRM coordinate convention (right-handed, Y-up, T-pose at rotation zero):
//   leftUpperArm  → points +X  → z negative = arm DOWN, z positive = arm UP
//   rightUpperArm → points -X  → z positive = arm DOWN, z negative = arm UP
interface PoseTargets { lUAz: number; rUAz: number; lLAz: number; rLAz: number }

function getPoseTargets(p: string, t: number): PoseTargets {
  switch (p) {
    case 'wave':
      // left arm down, right arm raised and forearm oscillates for wave motion
      return { lUAz: -1.2, rUAz: -0.9, lLAz: 0, rLAz: -0.35 + Math.sin(t * 3) * 0.35 }
    case 'thinking':
      // right arm partially up with forearm bent toward face
      return { lUAz: -1.2, rUAz: 0.25, lLAz: 0, rLAz: -0.85 }
    case 'happy':
      // both arms slightly raised from natural hang
      return { lUAz: -0.8, rUAz: 0.8, lLAz: 0, rLAz: 0 }
    case 'sad':
      // arms drooped below natural hang
      return { lUAz: -1.5, rUAz: 1.5, lLAz: 0, rLAz: 0 }
    case 'surprised':
      // both arms raised up high (hands toward face)
      return { lUAz: -0.15, rUAz: 0.15, lLAz: 0, rLAz: 0 }
    default: // neutral
      return { lUAz: -1.2, rUAz: 1.2, lLAz: 0, rLAz: 0 }
  }
}

interface GLTFAvatarProps {
  url: string
  scale: number
  yOffset?: number
  onFitComputed?: (fit: { scale: number; yOffset: number }) => void
  pose?: string
}

function GLTFAvatar({ url, scale = 2.5, yOffset = -2.0, onFitComputed, pose = 'neutral' }: GLTFAvatarProps) {
  const [vrm, setVrm] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [hasError, setHasError] = useState(false)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const targetMouse = useRef({ x: 0, y: 0 })
  const blinkState = useRef({ nextBlinkTime: 0 })
  const speakingTime = useRef(0)
  const onFitComputedRef = useRef(onFitComputed)
  useEffect(() => { onFitComputedRef.current = onFitComputed })

  // Pose control: prop sets initial value; vrm-pose-change events can override at runtime
  const poseRef  = useRef(pose ?? 'neutral')
  const armState = useRef({ lUAz: -1.2, rUAz: 1.2, lLAz: 0, rLAz: 0 })
  useEffect(() => { poseRef.current = pose ?? 'neutral' }, [pose])
  useEffect(() => {
    const handlePoseChange = (e: Event) => { poseRef.current = (e as CustomEvent<string>).detail }
    window.addEventListener('vrm-pose-change', handlePoseChange)
    return () => window.removeEventListener('vrm-pose-change', handlePoseChange)
  }, [])

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
    let isMounted = true
    let loadedVrm: any = null
    setIsLoading(true)
    setHasError(false)
    setVrm(null)

    const loader = new GLTFLoader()
    loader.register((parser: any) => new VRMLoaderPlugin(parser))

    ;(async () => {
      try {
        const gltf = await loader.loadAsync(url)
        if (!isMounted) {
          // Component unmounted during load — dispose immediately to prevent memory leak
          gltf.scene?.traverse((obj: any) => {
            obj.geometry?.dispose()
            if (obj.material) {
              const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
              mats.forEach((m: any) => m.dispose())
            }
          })
          return
        }
        const loaded = gltf.userData.vrm
        if (!loaded) {
          console.error('[GLTFAvatar] VRM data missing in GLTF userData — file may not be a valid VRM', gltf.userData)
          setHasError(true)
        } else {
          loadedVrm = loaded
          setVrm(loaded)
          if (onFitComputedRef.current) {
            const box = new THREE.Box3().setFromObject(loaded.scene)
            const boxHeight = box.max.y - box.min.y
            if (boxHeight > 0) {
              loaded.scene.updateWorldMatrix(true, true)
              const headBone = loaded.humanoid?.getNormalizedBoneNode?.('head')
              let headWorldY: number
              if (headBone) {
                const headPosVec = new THREE.Vector3()
                headBone.getWorldPosition(headPosVec)
                headWorldY = headPosVec.y
              } else {
                headWorldY = box.min.y + boxHeight * 0.88
              }
              const fitScale = Math.min(Math.max(3.5 / boxHeight, 1.0), 6.0)
              const fitYOffset = Math.min(Math.max(-headWorldY * fitScale, -8), 2)
              onFitComputedRef.current({ scale: fitScale, yOffset: fitYOffset })
            }
          }
        }
      } catch (err) {
        console.error('[GLTFAvatar] load failed:', err)
        if (isMounted) setHasError(true)
      } finally {
        if (isMounted) setIsLoading(false)
      }
    })()

    return () => {
      isMounted = false
      // Traverse and dispose the loaded VRM's scene to prevent WebGL context loss
      if (loadedVrm?.scene) {
        loadedVrm.scene.traverse((obj: any) => {
          obj.geometry?.dispose()
          if (obj.material) {
            const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
            mats.forEach((m: any) => m.dispose())
          }
        })
      }
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
        const targets = getPoseTargets(poseRef.current, state.clock.elapsedTime)
        const a = armState.current
        const LERP = 0.08
        a.lUAz = MathUtils.lerp(a.lUAz, targets.lUAz, LERP)
        a.rUAz = MathUtils.lerp(a.rUAz, targets.rUAz, LERP)
        a.lLAz = MathUtils.lerp(a.lLAz, targets.lLAz, LERP)
        a.rLAz = MathUtils.lerp(a.rLAz, targets.rLAz, LERP)
        const leftArm    = vrm.humanoid.getNormalizedBoneNode('leftUpperArm')
        const rightArm   = vrm.humanoid.getNormalizedBoneNode('rightUpperArm')
        const leftLower  = vrm.humanoid.getNormalizedBoneNode('leftLowerArm')
        const rightLower = vrm.humanoid.getNormalizedBoneNode('rightLowerArm')
        if (leftArm)    leftArm.rotation.z    = a.lUAz
        if (rightArm)   rightArm.rotation.z   = a.rUAz
        if (leftLower)  leftLower.rotation.z   = a.lLAz
        if (rightLower) rightLower.rotation.z  = a.rLAz
      }
    } catch {
      // Silent fail — a bad frame must not crash the WebGL canvas
    }
  })

  if (hasError) {
    return (
      <mesh>
        <sphereGeometry args={[0.4, 16, 16]} />
        <meshStandardMaterial color="red" />
      </mesh>
    )
  }
  if (isLoading || !vrm) return null

  return (
    <group position={[0, yOffset, 0]}>
      <primitive object={vrm.scene} scale={scale} />
    </group>
  )
}

export { GLTFAvatar }
export type { GLTFAvatarProps }
