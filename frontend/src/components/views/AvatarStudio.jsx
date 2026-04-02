import { useState, useEffect } from 'react'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { Canvas } from '@react-three/fiber'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { CubeAvatar, SwarmAvatar, Swarm2Avatar, WaveAvatar, GhostAvatar } from '@/components/3d/AvatarForms'

const FORMS = ['Cube', 'Swarm', 'Swarm 2', 'Wave', 'Ghost']

const STUDIO_DEFAULTS = {
  cubeSize: 2, rotationSpeed: 0.01, cubeColor: '#8b5cf6',
  particleCount: 80, spread: 4, swarmColor: '#00ffff',
  swarm2Count: 70, swarm2Speed: 0.5, swarm2Size: 1.0, swarm2Color: '#00d2ff',
  amplitude: 1.5, frequency: 1.5, waveSize: 1.0, waveColor: '#ff00ff',
  ghostDistort: 0.4, ghostSpeed: 2, ghostSize: 1.0, ghostColor: '#ffffff',
}

function loadAvatarConfig() {
  try {
    const raw = localStorage.getItem('avatarConfig')
    return raw ? { ...STUDIO_DEFAULTS, ...JSON.parse(raw) } : STUDIO_DEFAULTS
  } catch {
    return STUDIO_DEFAULTS
  }
}

function PreviewCanvas({ activeForm, cubeSize, rotationSpeed, cubeColor, particleCount, spread, swarmColor, swarm2Count, swarm2Speed, swarm2Size, swarm2Color, amplitude, frequency, waveColor, waveSize, ghostDistort, ghostSpeed, ghostSize, ghostColor }) {
  const avatars = {
    Cube:      <CubeAvatar size={cubeSize} speed={rotationSpeed} color={cubeColor} />,
    Swarm:     <SwarmAvatar count={particleCount} spread={spread} color={swarmColor} />,
    'Swarm 2': <Swarm2Avatar count={swarm2Count} speed={swarm2Speed} size={swarm2Size} color={swarm2Color} />,
    Wave:      <WaveAvatar amplitude={amplitude} frequency={frequency} color={waveColor} size={waveSize} />,
    Ghost:     <GhostAvatar distort={ghostDistort} speed={ghostSpeed} size={ghostSize} color={ghostColor} />,
  }

  return (
    <Canvas camera={{ position: [0, 0, 4], fov: 45 }}>
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 10, 10]} intensity={0.8} />
      {avatars[activeForm]}
    </Canvas>
  )
}

function ColorPicker({ value, onChange }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">Color</label>
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-14 cursor-pointer rounded border border-input bg-transparent p-0.5"
        />
        <span className="text-sm text-muted-foreground font-mono">{value}</span>
      </div>
    </div>
  )
}

function FormSettings({
  activeForm,
  cubeSize, setCubeSize, rotationSpeed, setRotationSpeed, cubeColor, setCubeColor,
  particleCount, setParticleCount, spread, setSpread, swarmColor, setSwarmColor,
  swarm2Count, setSwarm2Count, swarm2Speed, setSwarm2Speed, swarm2Size, setSwarm2Size, swarm2Color, setSwarm2Color,
  amplitude, setAmplitude, frequency, setFrequency, waveColor, setWaveColor, waveSize, setWaveSize,
  ghostDistort, setGhostDistort, ghostSpeed, setGhostSpeed, ghostSize, setGhostSize, ghostColor, setGhostColor,
}) {
  if (activeForm === 'Cube') {
    return (
      <div className="space-y-5">
        <Slider label="Size" min={0.5} max={5} step={0.1} value={cubeSize} onValueChange={setCubeSize} />
        <Slider label="Rotation Speed" min={0} max={0.1} step={0.005} value={rotationSpeed} onValueChange={setRotationSpeed} />
        <ColorPicker value={cubeColor} onChange={setCubeColor} />
      </div>
    )
  }

  if (activeForm === 'Swarm') {
    return (
      <div className="space-y-5">
        <Slider label="Particle Count" min={20} max={120} step={5} value={particleCount} onValueChange={setParticleCount} />
        <Slider label="Spread" min={1} max={8} step={0.25} value={spread} onValueChange={setSpread} />
        <ColorPicker value={swarmColor} onChange={setSwarmColor} />
      </div>
    )
  }

  if (activeForm === 'Swarm 2') {
    return (
      <div className="space-y-5">
        <Slider label="Particle Count" min={20} max={120} step={5} value={swarm2Count} onValueChange={setSwarm2Count} />
        <Slider label="Speed" min={0.1} max={2} step={0.1} value={swarm2Speed} onValueChange={setSwarm2Speed} />
        <Slider label="Size" min={0.3} max={3} step={0.1} value={swarm2Size} onValueChange={setSwarm2Size} />
        <ColorPicker value={swarm2Color} onChange={setSwarm2Color} />
      </div>
    )
  }

  if (activeForm === 'Ghost') {
    return (
      <div className="space-y-5">
        <Slider label="Distort" min={0} max={1} step={0.05} value={ghostDistort} onValueChange={setGhostDistort} />
        <Slider label="Speed" min={0} max={10} step={0.5} value={ghostSpeed} onValueChange={setGhostSpeed} />
        <Slider label="Size" min={0.3} max={3} step={0.1} value={ghostSize} onValueChange={setGhostSize} />
        <ColorPicker value={ghostColor} onChange={setGhostColor} />
      </div>
    )
  }

  if (activeForm === 'Wave') {
    return (
      <div className="space-y-5">
        <Slider label="Amplitude" min={0.5} max={4} step={0.1} value={amplitude} onValueChange={setAmplitude} />
        <Slider label="Frequency" min={0.1} max={3} step={0.1} value={frequency} onValueChange={setFrequency} />
        <Slider label="Size" min={0.3} max={3} step={0.1} value={waveSize} onValueChange={setWaveSize} />
        <ColorPicker value={waveColor} onChange={setWaveColor} />
      </div>
    )
  }

  return null
}

function FormTab() {
  const [activeForm, setActiveForm] = useLocalStorage('studioActiveForm', 'Cube')

  const [init] = useState(loadAvatarConfig)

  const [cubeSize, setCubeSize]           = useState(init.cubeSize)
  const [rotationSpeed, setRotationSpeed] = useState(init.rotationSpeed)
  const [cubeColor, setCubeColor]         = useState(init.cubeColor)

  const [particleCount, setParticleCount] = useState(init.particleCount)
  const [spread, setSpread]               = useState(init.spread)
  const [swarmColor, setSwarmColor]       = useState(init.swarmColor)

  const [swarm2Count, setSwarm2Count]     = useState(init.swarm2Count)
  const [swarm2Speed, setSwarm2Speed]     = useState(init.swarm2Speed)
  const [swarm2Size, setSwarm2Size]       = useState(init.swarm2Size)
  const [swarm2Color, setSwarm2Color]     = useState(init.swarm2Color)

  const [amplitude, setAmplitude]         = useState(init.amplitude)
  const [frequency, setFrequency]         = useState(init.frequency)
  const [waveSize, setWaveSize]           = useState(init.waveSize)
  const [waveColor, setWaveColor]         = useState(init.waveColor)

  const [ghostDistort, setGhostDistort]   = useState(init.ghostDistort)
  const [ghostSpeed, setGhostSpeed]       = useState(init.ghostSpeed)
  const [ghostSize, setGhostSize]         = useState(init.ghostSize)
  const [ghostColor, setGhostColor]       = useState(init.ghostColor)

  useEffect(() => {
    const config = {
      activeForm,
      cubeSize, rotationSpeed, cubeColor,
      particleCount, spread, swarmColor,
      swarm2Count, swarm2Speed, swarm2Size, swarm2Color,
      amplitude, frequency, waveSize, waveColor,
      ghostDistort, ghostSpeed, ghostSize, ghostColor,
    }
    localStorage.setItem('avatarConfig', JSON.stringify(config))
  }, [
    activeForm,
    cubeSize, rotationSpeed, cubeColor,
    particleCount, spread, swarmColor,
    swarm2Count, swarm2Speed, swarm2Size, swarm2Color,
    amplitude, frequency, waveSize, waveColor,
    ghostDistort, ghostSpeed, ghostSize, ghostColor,
  ])

  return (
    <div className="flex gap-4 h-full">

      <aside className="flex flex-col gap-2 w-36 shrink-0">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1 px-1">
          Form
        </p>
        {FORMS.map((form) => (
          <Button
            key={form}
            variant={activeForm === form ? 'default' : 'outline'}
            onClick={() => setActiveForm(form)}
            className="justify-start"
          >
            {form}
          </Button>
        ))}
      </aside>

      <div className="flex-1 flex flex-col gap-4 min-w-0">

        <div className="flex-1 min-h-[280px] flex items-center justify-center rounded-lg border border-border bg-black/20">
          <div className="relative w-64 h-64 rounded-full overflow-hidden border-2 border-primary/30 shadow-[0_0_40px_rgba(139,92,246,0.25),0_0_80px_rgba(0,255,255,0.08)] bg-black">
            <PreviewCanvas
              activeForm={activeForm}
              cubeSize={cubeSize} rotationSpeed={rotationSpeed} cubeColor={cubeColor}
              particleCount={particleCount} spread={spread} swarmColor={swarmColor}
              swarm2Count={swarm2Count} swarm2Speed={swarm2Speed} swarm2Size={swarm2Size} swarm2Color={swarm2Color}
              amplitude={amplitude} frequency={frequency} waveColor={waveColor} waveSize={waveSize}
              ghostDistort={ghostDistort} ghostSpeed={ghostSpeed} ghostSize={ghostSize} ghostColor={ghostColor}
            />
          </div>
        </div>

        <div className="rounded-lg border border-border bg-muted/20 p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
            {activeForm} Settings
          </p>
          <FormSettings
            activeForm={activeForm}
            cubeSize={cubeSize} setCubeSize={setCubeSize}
            rotationSpeed={rotationSpeed} setRotationSpeed={setRotationSpeed}
            cubeColor={cubeColor} setCubeColor={setCubeColor}
            particleCount={particleCount} setParticleCount={setParticleCount}
            spread={spread} setSpread={setSpread}
            swarmColor={swarmColor} setSwarmColor={setSwarmColor}
            swarm2Count={swarm2Count} setSwarm2Count={setSwarm2Count}
            swarm2Speed={swarm2Speed} setSwarm2Speed={setSwarm2Speed}
            swarm2Size={swarm2Size} setSwarm2Size={setSwarm2Size}
            swarm2Color={swarm2Color} setSwarm2Color={setSwarm2Color}
            amplitude={amplitude} setAmplitude={setAmplitude}
            frequency={frequency} setFrequency={setFrequency}
            waveColor={waveColor} setWaveColor={setWaveColor}
            waveSize={waveSize} setWaveSize={setWaveSize}
            ghostDistort={ghostDistort} setGhostDistort={setGhostDistort}
            ghostSpeed={ghostSpeed} setGhostSpeed={setGhostSpeed}
            ghostSize={ghostSize} setGhostSize={setGhostSize}
            ghostColor={ghostColor} setGhostColor={setGhostColor}
          />
        </div>

      </div>
    </div>
  )
}

export default function AvatarStudio() {
  const [activeTab, setActiveTab] = useState('form')

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold mb-6">Avatar Studio</h2>

        <Tabs className="w-full">
          <TabsList className="mb-6">
            {['form', '2d', '3d'].map((tab) => (
              <TabsTrigger
                key={tab}
                data-state={activeTab === tab ? 'active' : 'inactive'}
                onClick={() => setActiveTab(tab)}
                className="uppercase tracking-widest text-xs px-6"
              >
                {tab}
              </TabsTrigger>
            ))}
          </TabsList>

          {activeTab === 'form' && (
            <TabsContent><FormTab /></TabsContent>
          )}

          {activeTab === '2d' && (
            <TabsContent>
              <div className="flex items-center justify-center h-64 rounded-lg border border-dashed border-border text-muted-foreground text-sm">
                2D Avatar support coming in future updates
              </div>
            </TabsContent>
          )}

          {activeTab === '3d' && (
            <TabsContent>
              <div className="flex items-center justify-center h-64 rounded-lg border border-dashed border-border text-muted-foreground text-sm">
                3D Avatar support coming in future updates
              </div>
            </TabsContent>
          )}
        </Tabs>

      </div>
    </div>
  )
}
