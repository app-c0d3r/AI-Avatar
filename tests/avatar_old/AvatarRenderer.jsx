import React from 'react';
import useSwarmStore from '../../store/useSwarmStore';
import AvatarCanvas from '../chat/AvatarCanvas';
import AuraGlow from './variants/AuraGlow';
import VoiceWaveform from './variants/VoiceWaveform';
import Minimalist from './variants/Minimalist';
import ParticleSwarm from './variants/ParticleSwarm';
import HoloRing from './variants/HoloRing';
import PersonaCanvas from './PersonaCanvas';
import VrmPersonaWidget from './VrmPersonaWidget';

const LABELS = {
  '3d': {
    particles: '3D — Particle Swarm',
    'holo-ring': '3D — Holo-Ring',
    persona: '3D — Persona',
  },
};

const AvatarRenderer = ({ compact = false, mode = 'widget' }) => {
  const { characterState } = useSwarmStore();
  const { activeEngine, variant2D, variant3D, avatarType3D, personaModelUrl, emotion } = characterState;

  // Check if VRM model is loaded
  const isVrmModel = personaModelUrl && personaModelUrl.endsWith('.vrm');

  // 3D variants
  if (activeEngine === '3d' && avatarType3D === 'persona') {
    // Widget mode uses VrmPersonaWidget (no controls, fixed framing)
    // Inspector mode uses VrmPersonaInspector (with OrbitControls)
    if (isVrmModel) {
      return mode === 'widget' ? <VrmPersonaWidget /> : null;
    }
    return <PersonaCanvas />;
  }
  if (activeEngine === '3d' && variant3D === 'sphere') return <AvatarCanvas />;
  if (activeEngine === '3d' && variant3D === 'particles') return <ParticleSwarm emotion={emotion} compact={compact} />;
  if (activeEngine === '3d' && variant3D === 'holo-ring') return <HoloRing emotion={emotion} compact={compact} />;

  // 2D variants
  if (activeEngine === '2d') {
    if (variant2D === 'glow') return <AuraGlow emotion={emotion} />;
    if (variant2D === 'waveform') return <VoiceWaveform emotion={emotion} />;
    if (variant2D === 'minimalist') return <Minimalist emotion={emotion} />;
  }

  const label = activeEngine === '3d'
    ? (LABELS['3d'][variant3D] ?? '3D Avatar')
    : '2D Avatar';

  return (
    <div className="w-full h-full flex items-center justify-center bg-zinc-950/50 rounded-2xl border border-zinc-800/40">
      <span className="text-zinc-500 text-sm font-mono">{label} Active</span>
    </div>
  );
};

export default AvatarRenderer;
