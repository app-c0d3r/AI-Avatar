import React, { useState, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import useSwarmStore from '../../store/useSwarmStore';
import { VrmModelCore } from './VrmPersona';


/**
 * Framing offsets: [x, y, z] position + scale
 * Widget: Strong Y-shifts to frame specific body parts in 192x192px box.
 * Model origin is at feet, camera centered at 0.
 */
const WIDGET_FRAMING_OFFSETS = {
  face: { position: [0, -1.5, 2.3], scale: 0.95 },   // Head shot - tight on face/head
  half: { position: [0, -1.4, 2.1], scale: 0.90 },   // Upper body - face + chest/torso
};

/**
 * VRM Canvas wrapper for floating widget.
 * No user interaction (OrbitControls disabled).
 */
const VrmPersonaWidget = () => {
  const { personaModelUrl, isMouseTrackingActive } = useSwarmStore((s) => s.characterState);
  const [loadError, setLoadError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const handleVrmLoaded = (success, error) => {
    setIsLoading(false);
    if (!success) setLoadError(error);
    else setLoadError(null);
  };

  const filename = useMemo(() => {
    if (!personaModelUrl) return '';
    const parts = personaModelUrl.split('/');
    return parts[parts.length - 1] || personaModelUrl;
  }, [personaModelUrl]);

  return (
    <div className="w-full h-full relative">
      <Canvas camera={{ position: [0, 0, 2.8], fov: 50 }}>
        <ambientLight intensity={0.6} />
        <pointLight position={[5, 5, 5]} intensity={1.2} />
        <VrmModelCore
          modelUrl={personaModelUrl}
          onVrmLoaded={handleVrmLoaded}
          lookAtMouse={isMouseTrackingActive}
          framingOffsets={WIDGET_FRAMING_OFFSETS}
        />
      </Canvas>

      {/* Loading State */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
          <span className="text-xs text-zinc-400 animate-pulse">VRM lädt...</span>
        </div>
      )}

      {/* Error State */}
      {loadError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60">
          <div className="text-center p-2">
            <p className="text-xs text-rose-400 mb-1">VRM Fehler</p>
            <p className="text-[10px] text-zinc-500 font-mono truncate max-w-[150px]">{loadError.message}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default VrmPersonaWidget;
