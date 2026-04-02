import { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { CubeAvatar, SwarmAvatar, Swarm2Avatar, WaveAvatar, GhostAvatar } from '@/components/3d/AvatarForms'

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
    default:        return 1.0
  }
}

export default function MiniAvatar() {
  const [config] = useState<AvatarConfig>(readConfig)

  const currentSize = getActiveSize(config)
  const calculatedZPosition = Math.max(1.5, 3.5 - (currentSize * 1.5))

  return (
    <div className="w-20 h-20 rounded-full overflow-hidden border border-primary/50 shadow-lg bg-black/40">
      <Canvas camera={{ position: [0, 0, calculatedZPosition], fov: 45 }} frameloop="always">
        <ambientLight intensity={0.4} />
        <directionalLight position={[10, 10, 10]} intensity={0.8} />
        <AvatarScene config={config} />
      </Canvas>
    </div>
  )
}
