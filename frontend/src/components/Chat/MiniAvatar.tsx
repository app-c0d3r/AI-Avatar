import { Component, ReactNode, useState, Suspense, memo } from 'react'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { Canvas } from '@react-three/fiber'
import { CubeAvatar, SwarmAvatar, Swarm2Avatar, WaveAvatar, GhostAvatar, CoreAvatar, DNAAvatar, GLTFAvatar } from '@/components/3d/AvatarForms'

interface AvatarConfig {
  activeForm: string
  cubeSize: number
  rotationSpeed: number
  cubeColor: string
  particleCount: number
  spread: number
  swarmColor: string
  swarm2Count: number
  swarm2Speed: number
  swarm2Size: number
  swarm2Color: string
  amplitude: number
  frequency: number
  waveSize: number
  waveColor: string
  ghostDistort: number
  ghostSpeed: number
  ghostSize: number
  ghostColor: string
  coreSize: number
  coreSpeed: number
  coreColor: string
  dnaSize: number
  dnaSpeed: number
  dnaColor: string
}

const DEFAULT_CONFIG: AvatarConfig = {
  activeForm: 'Ghost',
  cubeSize: 2,
  rotationSpeed: 0.01,
  cubeColor: '#8b5cf6',
  particleCount: 80,
  spread: 4,
  swarmColor: '#00ffff',
  swarm2Count: 70,
  swarm2Speed: 0.5,
  swarm2Size: 1.0,
  swarm2Color: '#00d2ff',
  amplitude: 1.5,
  frequency: 1.5,
  waveSize: 1.0,
  waveColor: '#ff00ff',
  ghostDistort: 0.4,
  ghostSpeed: 2,
  ghostSize: 1.0,
  ghostColor: '#ffffff',
  coreSize: 1.0,
  coreSpeed: 1.0,
  coreColor: '#00ffff',
  dnaSize: 1.0,
  dnaSpeed: 1.0,
  dnaColor: '#00ff88',
}

class AvatarErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode; fallback: ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError() { return { hasError: true } }
  render() {
    if (this.state.hasError) return this.props.fallback
    return this.props.children
  }
}

function readConfig(): AvatarConfig {
  try {
    const raw = localStorage.getItem('avatarConfig')
    if (!raw) return DEFAULT_CONFIG
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_CONFIG
  }
}

function AvatarScene({ config }: { config: AvatarConfig }) {
  switch (config.activeForm) {
    case 'Cube':
      return <CubeAvatar size={config.cubeSize} speed={config.rotationSpeed} color={config.cubeColor} />
    case 'Swarm':
      return <SwarmAvatar count={config.particleCount} spread={config.spread} color={config.swarmColor} />
    case 'Swarm 2':
      return <Swarm2Avatar count={config.swarm2Count} speed={config.swarm2Speed} size={config.swarm2Size} color={config.swarm2Color} />
    case 'Wave':
      return <WaveAvatar amplitude={config.amplitude} frequency={config.frequency} color={config.waveColor} size={config.waveSize} />
    case 'Core':
      return <CoreAvatar size={config.coreSize} speed={config.coreSpeed} color={config.coreColor} />
    case 'DNA':
      return <DNAAvatar size={config.dnaSize} speed={config.dnaSpeed} color={config.dnaColor} />
    default:
      return <GhostAvatar distort={config.ghostDistort} speed={config.ghostSpeed} size={config.ghostSize} color={config.ghostColor} />
  }
}

function getActiveSize(config: AvatarConfig): number {
  switch (config.activeForm) {
    case 'Cube':    return config.cubeSize / 2
    case 'Swarm 2': return config.swarm2Size
    case 'Wave':    return config.waveSize
    case 'Ghost':   return config.ghostSize
    case 'Core':    return config.coreSize
    case 'DNA':     return config.dnaSize
    default:        return 1.0
  }
}

const MiniAvatar = () => {
  const [config] = useState<AvatarConfig>(readConfig)
  const [avatarMode]       = useLocalStorage('avatarMode', 'form')
  const [avatar2DUrl]      = useLocalStorage('avatar2DUrl', '')
  const [avatar3DUrl]      = useLocalStorage('avatar3DUrl', '')
  const [avatar3DFileName] = useLocalStorage('avatar3DFileName', '')
  const [avatar3DScaleRaw]   = useLocalStorage('avatar3DScale', 2.5)
  const [avatar3DYOffsetRaw] = useLocalStorage('avatar3DYOffset', -2.0)
  const [chatAvatarSizeRaw]  = useLocalStorage('chatAvatarSize', 80)
  const avatar3DScale  = Number(avatar3DScaleRaw)
  const avatar3DYOffset = Number(avatar3DYOffsetRaw)
  const chatAvatarSize = Number(chatAvatarSizeRaw)
  const sizeStyle = { width: `${chatAvatarSize}px`, height: `${chatAvatarSize}px` }

  const currentSize = getActiveSize(config)
  const calculatedZPosition = Math.max(1.5, 3.5 - (currentSize * 1.5))

  if (avatarMode === '2d' && avatar2DUrl) {
    return (
      <div className="flex-shrink-0 rounded-full overflow-hidden border border-primary/50 shadow-lg" style={sizeStyle}>
        <img src={avatar2DUrl} className="w-full h-full object-cover" alt="Avatar" />
      </div>
    )
  }

  const formAvatar = (
    <div className="flex-shrink-0 rounded-full overflow-hidden border border-primary/50 shadow-lg bg-black/40" style={sizeStyle}>
      <Canvas camera={{ position: [0, 0, calculatedZPosition], fov: 45 }} frameloop="always" dpr={[1, 2]}>
        <ambientLight intensity={0.4} />
        <directionalLight position={[10, 10, 10]} intensity={0.8} />
        <AvatarScene config={config} />
      </Canvas>
    </div>
  )

  const is3D = avatarMode === '3d' && !!avatar3DUrl

  if (is3D) {
    return (
      <AvatarErrorBoundary fallback={formAvatar}>
        <div className="flex-shrink-0 rounded-full overflow-hidden border border-primary/50 shadow-lg bg-black/40" style={sizeStyle}>
          {(() => {
            const faceY = avatar3DYOffset + 1.5 * avatar3DScale
            const camZ  = Math.max(1.2, 0.8 * avatar3DScale)
            return (
              <Canvas
                key={`${faceY.toFixed(1)}-${camZ.toFixed(1)}`}
                camera={{ position: [0, faceY, camZ], fov: 45 }}
                frameloop="always"
                dpr={[1, 2]}
              >
                <ambientLight intensity={1.5} />
                <directionalLight position={[2, 2, 2]} intensity={2} />
                <Suspense fallback={null}>
                  <GLTFAvatar url={avatar3DUrl} scale={avatar3DScale} yOffset={avatar3DYOffset} />
                </Suspense>
              </Canvas>
            )
          })()}
        </div>
      </AvatarErrorBoundary>
    )
  }

  return formAvatar
}

export default memo(MiniAvatar)
