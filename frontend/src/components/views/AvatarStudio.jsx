import { Component, useState, useEffect, Suspense } from 'react'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { Canvas } from '@react-three/fiber'

import { Box, X } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { CubeAvatar, SwarmAvatar, Swarm2Avatar, WaveAvatar, GhostAvatar, CoreAvatar, DNAAvatar, GLTFAvatar } from '@/components/3d/AvatarForms'

class PreviewErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false } }
  static getDerivedStateFromError() { return { hasError: true } }
  render() {
    if (this.state.hasError) return this.props.fallback ?? null
    return this.props.children
  }
}

const FORMS = ['Cube', 'Swarm', 'Swarm 2', 'Wave', 'Ghost', 'Core', 'DNA']

const STUDIO_DEFAULTS = {
  cubeSize: 2, rotationSpeed: 0.01, cubeColor: '#8b5cf6',
  particleCount: 80, spread: 4, swarmColor: '#00ffff',
  swarm2Count: 70, swarm2Speed: 0.5, swarm2Size: 1.0, swarm2Color: '#00d2ff',
  amplitude: 1.5, frequency: 1.5, waveSize: 1.0, waveColor: '#ff00ff',
  ghostDistort: 0.4, ghostSpeed: 2, ghostSize: 1.0, ghostColor: '#ffffff',
  coreSize: 1.0, coreSpeed: 1.0, coreColor: '#00ffff',
  dnaSize: 1.0, dnaSpeed: 1.0, dnaColor: '#00ff88',
}

function loadAvatarConfig() {
  try {
    const raw = localStorage.getItem('avatarConfig')
    return raw ? { ...STUDIO_DEFAULTS, ...JSON.parse(raw) } : STUDIO_DEFAULTS
  } catch {
    return STUDIO_DEFAULTS
  }
}

function PreviewCanvas({ activeForm, cubeSize, rotationSpeed, cubeColor, particleCount, spread, swarmColor, swarm2Count, swarm2Speed, swarm2Size, swarm2Color, amplitude, frequency, waveColor, waveSize, ghostDistort, ghostSpeed, ghostSize, ghostColor, coreSize, coreSpeed, coreColor, dnaSize, dnaSpeed, dnaColor }) {
  const avatars = {
    Cube:      <CubeAvatar size={cubeSize} speed={rotationSpeed} color={cubeColor} />,
    Swarm:     <SwarmAvatar count={particleCount} spread={spread} color={swarmColor} />,
    'Swarm 2': <Swarm2Avatar count={swarm2Count} speed={swarm2Speed} size={swarm2Size} color={swarm2Color} />,
    Wave:      <WaveAvatar amplitude={amplitude} frequency={frequency} color={waveColor} size={waveSize} />,
    Ghost:     <GhostAvatar distort={ghostDistort} speed={ghostSpeed} size={ghostSize} color={ghostColor} />,
    Core:      <CoreAvatar size={coreSize} speed={coreSpeed} color={coreColor} />,
    DNA:       <DNAAvatar size={dnaSize} speed={dnaSpeed} color={dnaColor} />,
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
  coreSize, setCoreSize, coreSpeed, setCoreSpeed, coreColor, setCoreColor,
  dnaSize, setDnaSize, dnaSpeed, setDnaSpeed, dnaColor, setDnaColor,
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

  if (activeForm === 'Core') {
    return (
      <div className="space-y-5">
        <Slider label="Size" min={0.3} max={3} step={0.1} value={coreSize} onValueChange={setCoreSize} />
        <Slider label="Speed" min={0.1} max={5} step={0.1} value={coreSpeed} onValueChange={setCoreSpeed} />
        <ColorPicker value={coreColor} onChange={setCoreColor} />
      </div>
    )
  }

  if (activeForm === 'DNA') {
    return (
      <div className="space-y-5">
        <Slider label="Size" min={0.3} max={3} step={0.1} value={dnaSize} onValueChange={setDnaSize} />
        <Slider label="Speed" min={0.1} max={5} step={0.1} value={dnaSpeed} onValueChange={setDnaSpeed} />
        <ColorPicker value={dnaColor} onChange={setDnaColor} />
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

  const [coreSize, setCoreSize]           = useState(init.coreSize)
  const [coreSpeed, setCoreSpeed]         = useState(init.coreSpeed)
  const [coreColor, setCoreColor]         = useState(init.coreColor)

  const [dnaSize, setDnaSize]             = useState(init.dnaSize)
  const [dnaSpeed, setDnaSpeed]           = useState(init.dnaSpeed)
  const [dnaColor, setDnaColor]           = useState(init.dnaColor)

  useEffect(() => {
    const config = {
      activeForm,
      cubeSize, rotationSpeed, cubeColor,
      particleCount, spread, swarmColor,
      swarm2Count, swarm2Speed, swarm2Size, swarm2Color,
      amplitude, frequency, waveSize, waveColor,
      ghostDistort, ghostSpeed, ghostSize, ghostColor,
      coreSize, coreSpeed, coreColor,
      dnaSize, dnaSpeed, dnaColor,
    }
    localStorage.setItem('avatarConfig', JSON.stringify(config))
  }, [
    activeForm,
    cubeSize, rotationSpeed, cubeColor,
    particleCount, spread, swarmColor,
    swarm2Count, swarm2Speed, swarm2Size, swarm2Color,
    amplitude, frequency, waveSize, waveColor,
    ghostDistort, ghostSpeed, ghostSize, ghostColor,
    coreSize, coreSpeed, coreColor,
    dnaSize, dnaSpeed, dnaColor,
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
              coreSize={coreSize} coreSpeed={coreSpeed} coreColor={coreColor}
              dnaSize={dnaSize} dnaSpeed={dnaSpeed} dnaColor={dnaColor}
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
            coreSize={coreSize} setCoreSize={setCoreSize}
            coreSpeed={coreSpeed} setCoreSpeed={setCoreSpeed}
            coreColor={coreColor} setCoreColor={setCoreColor}
            dnaSize={dnaSize} setDnaSize={setDnaSize}
            dnaSpeed={dnaSpeed} setDnaSpeed={setDnaSpeed}
            dnaColor={dnaColor} setDnaColor={setDnaColor}
          />
        </div>

      </div>
    </div>
  )
}

const PRESET_SEEDS = ['Felix', 'Mia', 'Luca']

export default function AvatarStudio() {
  const [activeTab, setActiveTab] = useLocalStorage('studioTab', 'form')
  const [avatarMode, setAvatarMode] = useLocalStorage('avatarMode', 'form')
  const [avatar2DUrl, setAvatar2DUrl] = useLocalStorage('avatar2DUrl', '')
  const [avatar3DUrl, setAvatar3DUrl] = useLocalStorage('avatar3DUrl', '')
  const [, setAvatar3DFileName] = useLocalStorage('avatar3DFileName', '')
  const [gallery, setGallery] = useLocalStorage('avatarGallery', [])
  const [avatar3DGallery, setAvatar3DGallery] = useLocalStorage('avatar3DGallery', [])
  const [avatar3DScale, setAvatar3DScale]     = useLocalStorage('avatar3DScale', 2.5)
  const [avatar3DYOffset, setAvatar3DYOffset] = useLocalStorage('avatar3DYOffset', -3.5)
  const [chatAvatarSize, setChatAvatarSize]   = useLocalStorage('chatAvatarSize', 80)
  const [isUploading3D, setIsUploading3D]     = useState(false)
  const [systemPrompt, setSystemPrompt]       = useLocalStorage('mapa-systemPrompt', 'You are a helpful, friendly AI assistant. Keep your answers concise.')
  const [voiceProfile, setVoiceProfile]       = useLocalStorage('mapa-voiceProfile', 'female')
  const [autoRead, setAutoRead]               = useLocalStorage('mapa-autoRead', true)

  const handleTestVoice = () => {
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance('Hello! I am your AI assistant. This is how my voice sounds.')
    if (voiceProfile === 'robot') {
      utterance.pitch = 0.2
      utterance.rate = 0.9
    } else {
      const voices = window.speechSynthesis.getVoices()
      if (voiceProfile === 'female') {
        utterance.pitch = 1.2
        const match = voices.find(v => /female|samantha|victoria|zira|karen|moira|tessa/i.test(v.name))
        if (match) utterance.voice = match
      } else if (voiceProfile === 'male') {
        utterance.pitch = 0.8
        const match = voices.find(v => /male|david|daniel|alex|fred|jorge|rishi/i.test(v.name))
        if (match) utterance.voice = match
      }
    }
    window.speechSynthesis.speak(utterance)
  }

  const handleTabClick = (tab) => {
    setActiveTab(tab)
    if (tab === '2d')   setAvatarMode('2d')
    if (tab === 'form') setAvatarMode('form')
    if (tab === '3d')   setAvatarMode('3d')
  }

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const newItem = { id: Date.now().toString(), url: reader.result, name: file.name }
        setGallery(prev => [...prev, newItem])
        setAvatar2DUrl(reader.result)
      }
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const handlePresetAdd = (url, seed) => {
    if (!gallery.some(item => item.url === url)) {
      setGallery(prev => [...prev, { id: `preset-${seed}`, url, name: seed }])
    }
    setAvatar2DUrl(url)
  }

  const handleGalleryDelete = (id, url) => {
    setGallery(prev => prev.filter(item => item.id !== id))
    if (avatar2DUrl === url) setAvatar2DUrl('')
  }

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
                onClick={() => handleTabClick(tab)}
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
              <div className="flex gap-8">

                {/* Active preview */}
                <div className="flex flex-col items-center gap-3 shrink-0">
                  <div className="w-40 h-40 rounded-full overflow-hidden border-2 border-primary/30 shadow-[0_0_40px_rgba(139,92,246,0.25),0_0_80px_rgba(0,255,255,0.08)] bg-black flex items-center justify-center">
                    {avatar2DUrl ? (
                      <img src={avatar2DUrl} className="w-full h-full object-cover" alt="Active avatar" />
                    ) : (
                      <span className="text-muted-foreground text-xs text-center px-4">None selected</span>
                    )}
                  </div>
                  <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-md border border-input bg-muted/30 text-sm hover:bg-muted/60 transition-colors">
                    + Upload
                    <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                  </label>
                </div>

                {/* Gallery + presets */}
                <div className="flex-1 space-y-6 min-w-0">

                  {/* Gallery */}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                      Gallery {gallery.length > 0 && <span className="normal-case font-normal">({gallery.length})</span>}
                    </p>
                    {gallery.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No images saved yet. Upload one or add a preset.</p>
                    ) : (
                      <div className="grid grid-cols-5 gap-3">
                        {gallery.map(item => (
                          <div key={item.id} className="relative group">
                            <button
                              onClick={() => setAvatar2DUrl(item.url)}
                              className={`w-full aspect-square rounded-lg overflow-hidden border-2 transition-colors ${avatar2DUrl === item.url ? 'border-primary shadow-[0_0_12px_rgba(139,92,246,0.6)]' : 'border-border hover:border-primary/50'}`}
                            >
                              <img src={item.url} className="w-full h-full object-cover" alt={item.name || 'Avatar'} />
                            </button>
                            <button
                              onClick={() => handleGalleryDelete(item.id, item.url)}
                              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-xs font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity leading-none"
                            >
                              ×
                            </button>
                            {avatar2DUrl === item.url && (
                              <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[9px] text-primary font-semibold uppercase tracking-wider">active</div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Presets */}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Presets</p>
                    <div className="flex gap-3">
                      {PRESET_SEEDS.map((seed) => {
                        const url = `https://api.dicebear.com/9.x/avataaars/svg?seed=${seed}`
                        const inGallery = gallery.some(item => item.url === url)
                        return (
                          <div key={seed} className="flex flex-col items-center gap-1">
                            <button
                              onClick={() => handlePresetAdd(url, seed)}
                              className={`w-14 h-14 rounded-full overflow-hidden border-2 transition-colors bg-white ${avatar2DUrl === url ? 'border-primary' : 'border-border hover:border-primary/60'}`}
                            >
                              <img src={url} alt={seed} className="w-full h-full object-cover" />
                            </button>
                            <span className="text-[10px] text-muted-foreground">{inGallery ? '✓' : '+ add'}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                </div>
              </div>
            </TabsContent>
          )}

          {activeTab === '3d' && (
            <TabsContent>
              <div className="flex gap-8">

                {/* Active preview */}
                <div className="flex flex-col items-center gap-3 shrink-0">
                  <div className="rounded-full overflow-hidden border-2 border-primary/30 shadow-[0_0_40px_rgba(139,92,246,0.25),0_0_80px_rgba(0,255,255,0.08)] bg-black" style={{ width: `${chatAvatarSize}px`, height: `${chatAvatarSize}px` }}>
                    {avatar3DUrl ? (
                      <PreviewErrorBoundary fallback={
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs text-center px-4">
                          Failed to load
                        </div>
                      }>
                        <Canvas camera={{ position: [0, 0, 3], fov: 45 }}>
                          <ambientLight intensity={1.5} />
                          <directionalLight position={[2, 2, 2]} intensity={2} />
                          <Suspense fallback={null}>
                            <GLTFAvatar url={avatar3DUrl} scale={avatar3DScale} yOffset={avatar3DYOffset} />
                          </Suspense>
                        </Canvas>
                      </PreviewErrorBoundary>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs text-center px-4">
                        No model loaded
                      </div>
                    )}
                  </div>
                  <label className={`cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-md border border-input bg-muted/30 text-sm hover:bg-muted/60 transition-colors ${isUploading3D ? 'opacity-50 pointer-events-none' : ''}`}>
                    {isUploading3D ? 'Uploading...' : '+ Upload .glb / .gltf / .vrm'}
                    <input
                      type="file"
                      accept=".glb,.gltf,.fbx,.vrm"
                      className="hidden"
                      disabled={isUploading3D}
                      onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        e.target.value = ''
                        setIsUploading3D(true)
                        try {
                          const formData = new FormData()
                          formData.append('file', file)
                          const res = await fetch('http://localhost:8000/api/upload/model', { method: 'POST', body: formData })
                          if (!res.ok) throw new Error(`Upload failed: ${res.statusText}`)
                          const data = await res.json()
                          const newItem = { id: Date.now().toString(), name: file.name, url: data.url }
                          setAvatar3DGallery(prev => [...prev, newItem])
                          setAvatar3DUrl(data.url)
                          setAvatar3DFileName(file.name)
                        } catch (err) {
                          console.error('3D model upload error:', err)
                          alert(`Upload failed: ${err.message}`)
                        } finally {
                          setIsUploading3D(false)
                        }
                      }}
                    />
                  </label>
                </div>

                {/* Gallery */}
                <div className="flex-1 min-w-0 space-y-4">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Models {avatar3DGallery.length > 0 && <span className="normal-case font-normal">({avatar3DGallery.length})</span>}
                  </p>

                  <div className="space-y-2 pb-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        Zoom / Scale
                      </label>
                      <span className="text-xs text-muted-foreground font-mono">{Number(avatar3DScale).toFixed(1)}×</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="6"
                      step="0.1"
                      value={avatar3DScale}
                      onChange={(e) => setAvatar3DScale(Number(e.target.value))}
                      className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-primary bg-muted"
                    />
                  </div>

                  <div className="space-y-2 pb-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        Vertical Position
                      </label>
                      <span className="text-xs text-muted-foreground font-mono">{Number(avatar3DYOffset).toFixed(1)}</span>
                    </div>
                    <input
                      type="range"
                      min="-8"
                      max="2"
                      step="0.1"
                      value={avatar3DYOffset}
                      onChange={(e) => setAvatar3DYOffset(Number(e.target.value))}
                      className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-primary bg-muted"
                    />
                  </div>

                  <div className="space-y-2 pb-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        Chat Bubble Size
                      </label>
                      <span className="text-xs text-muted-foreground font-mono">{Number(chatAvatarSize)}px</span>
                    </div>
                    <input
                      type="range"
                      min="40"
                      max="400"
                      step="5"
                      value={chatAvatarSize}
                      onChange={(e) => setChatAvatarSize(Number(e.target.value))}
                      className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-primary bg-muted"
                    />
                  </div>

                  <div className="space-y-3 pt-2">
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      AI Behavior &amp; Voice
                    </p>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        System Prompt
                      </label>
                      <textarea
                        value={systemPrompt}
                        onChange={(e) => setSystemPrompt(e.target.value)}
                        className="w-full h-20 bg-muted/50 border border-border rounded-md p-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        Voice Profile
                      </label>
                      <select
                        value={voiceProfile}
                        onChange={(e) => setVoiceProfile(e.target.value)}
                        className="w-full bg-muted/50 border border-border rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                      >
                        <option value="female">Female Voice</option>
                        <option value="male">Male Voice</option>
                        <option value="robot">Robot Voice</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="autoRead"
                        checked={autoRead}
                        onChange={(e) => setAutoRead(e.target.checked)}
                        className="w-4 h-4 accent-primary cursor-pointer"
                      />
                      <label htmlFor="autoRead" className="text-sm cursor-pointer select-none">
                        Auto-Read Chat Responses
                      </label>
                    </div>

                    <button
                      onClick={handleTestVoice}
                      className="mt-4 flex items-center gap-2 px-4 py-2 text-xs font-medium bg-primary/10 text-primary border border-primary/20 rounded-md hover:bg-primary/20 transition-colors"
                    >
                      ▶ Test Voice
                    </button>
                  </div>

                  {avatar3DGallery.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No models yet. Upload a .glb, .gltf, or .vrm file.</p>
                  ) : (
                    <div className="grid grid-cols-4 gap-3">
                      {avatar3DGallery.map(item => (
                        <div key={item.id} className="relative group">
                          <button
                            onClick={() => { setAvatar3DUrl(item.url); setAvatar3DFileName(item.name) }}
                            className={`w-full flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-colors bg-muted/10 hover:bg-muted/30 ${
                              avatar3DUrl === item.url
                                ? 'border-primary shadow-[0_0_12px_rgba(139,92,246,0.5)]'
                                : 'border-border hover:border-primary/50'
                            }`}
                          >
                            <Box className="w-8 h-8 text-muted-foreground shrink-0" strokeWidth={1.5} />
                            <span className="w-full text-[10px] text-center text-muted-foreground truncate leading-tight">
                              {item.name}
                            </span>
                          </button>
                          <button
                            onClick={() => {
                              URL.revokeObjectURL(item.url)
                              setAvatar3DGallery(prev => prev.filter(g => g.id !== item.id))
                              if (avatar3DUrl === item.url) { setAvatar3DUrl(''); setAvatar3DFileName('') }
                            }}
                            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3" />
                          </button>
                          {avatar3DUrl === item.url && (
                            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[9px] text-primary font-semibold uppercase tracking-wider">active</div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            </TabsContent>
          )}
        </Tabs>

      </div>
    </div>
  )
}
