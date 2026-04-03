import React, { useRef, Suspense, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import useSwarmStore from '../../store/useSwarmStore';

/**
 * Renders a loaded GLB/GLTF/VRM model with rotation animation.
 */
function LoadedModel({ modelUrl }) {
  const meshRef = useRef();
  const { scene } = useGLTF(modelUrl);

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.3;
    }
  });

  return (
    <primitive
      ref={meshRef}
      object={scene.clone()}
      scale={0.5}
      position={[0, -0.5, 0]}
    />
  );
}

/**
 * Placeholder box when no model is loaded.
 */
function PlaceholderBox({ emotion }) {
  const meshRef = useRef();

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.3;
    }
  });

  const emotionColors = {
    neutral: '#6366f1',
    happy: '#22c55e',
    thinking: '#eab308',
    speaking: '#ec4899',
  };

  return (
    <mesh ref={meshRef}>
      <boxGeometry args={[1.2, 1.2, 1.2]} />
      <meshStandardMaterial color={emotionColors[emotion] || '#6366f1'} />
    </mesh>
  );
}

/**
 * Error fallback component for GLTF loading errors.
 */
function LoadErrorFallback({ emotion }) {
  return (
    <group>
      <PlaceholderBox emotion={emotion} />
      <mesh position={[0, 1.5, 0]}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshStandardMaterial color="#ef4444" />
      </mesh>
    </group>
  );
}

/**
 * Uses useGLTF with error callback.
 */
function LoadedModelWithCallback({ modelUrl, onError }) {
  try {
    const { scene } = useGLTF(modelUrl);
    const meshRef = useRef();

    useFrame((state, delta) => {
      if (meshRef.current) {
        meshRef.current.rotation.y += delta * 0.3;
      }
    });

    return (
      <primitive
        ref={meshRef}
        object={scene.clone()}
        scale={0.5}
        position={[0, -0.5, 0]}
      />
    );
  } catch (error) {
    console.warn('GLTF load error:', modelUrl, error);
    onError?.();
    return null;
  }
}

/**
 * Wrapper that catches GLTF loading errors.
 */
function LoadedModelWithErrorHandler({ modelUrl, emotion, onError }) {
  try {
    return <LoadedModelWithCallback modelUrl={modelUrl} onError={onError} />;
  } catch {
    return <LoadErrorFallback emotion={emotion} />;
  }
}

/**
 * Main model component with error handling.
 */
function PersonaModel({ modelUrl, emotion }) {
  const [hasError, setHasError] = useState(false);

  // Reset error when URL changes
  useEffect(() => {
    setHasError(false);
  }, [modelUrl]);

  // No model URL → show placeholder
  if (!modelUrl || modelUrl === '') {
    return <PlaceholderBox emotion={emotion} />;
  }

  // Had error loading → show error fallback
  if (hasError) {
    return <LoadErrorFallback emotion={emotion} />;
  }

  return (
    <Suspense fallback={<PlaceholderBox emotion={emotion} />}>
      <LoadedModelWithErrorHandler
        modelUrl={modelUrl}
        emotion={emotion}
        onError={() => setHasError(true)}
      />
    </Suspense>
  );
}

/**
 * Extract filename from URL path.
 */
function getFilenameFromUrl(url) {
  if (!url) return '';
  const parts = url.split('/');
  return parts[parts.length - 1] || url;
}

/**
 * 3D canvas for persona avatar.
 * Shows uploaded/custom model or placeholder box with state info.
 */
const PersonaCanvas = () => {
  const { personaModelUrl, personaEmotion } = useSwarmStore((s) => s.characterState);
  const filename = getFilenameFromUrl(personaModelUrl);

  return (
    <div className="w-full h-full relative">
      <Canvas camera={{ position: [0, 0, 3], fov: 50 }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <PersonaModel modelUrl={personaModelUrl} emotion={personaEmotion} />
        <OrbitControls enableZoom={false} />
      </Canvas>

      {/* State Info Overlay */}
      <div className="absolute bottom-2 left-2 right-2 bg-black/60 backdrop-blur-sm rounded-lg p-2 text-[10px] font-mono">
        <div className="space-y-1">
          {/* Model Info */}
          <div className="flex justify-between items-center text-zinc-300">
            <span className="truncate max-w-[55%]">
              {personaModelUrl ? (
                <>
                  <span className="text-emerald-400 mr-1">✓</span>
                  {filename}
                </>
              ) : (
                <>
                  <span className="text-amber-400 mr-1">◌</span>
                  Placeholder (kein Modell)
                </>
              )}
            </span>
            <span className="capitalize text-indigo-400 flex-shrink-0 ml-2">
              {personaEmotion}
            </span>
          </div>
          {/* Emotion Label */}
          <div className="text-[9px] text-zinc-500 flex justify-between">
            <span>Lokales BYOM-Modell</span>
            <span>Emotion aktiv</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PersonaCanvas;
