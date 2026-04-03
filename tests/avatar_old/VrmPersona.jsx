import { useRef, useState, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { VRMLoaderPlugin } from '@pixiv/three-vrm';
import { OrbitControls, Html } from '@react-three/drei';
import useSwarmStore from '../../store/useSwarmStore';
import useAvatarStore from '../../store/useAvatarStore';
import { resetArmPose, FRAMING_OFFSETS } from './vrmUtils';

/** Reusable VRM model component — must be rendered inside a <Canvas>. */
export function VrmModelCore({ modelUrl, onVrmLoaded, framingOffsets = null }) {
  const { avatarFraming } = useSwarmStore((s) => s.characterState);
  const { currentEmotion, currentActivity, activeEmote, isMouseTrackingActive } = useAvatarStore();
  const [vrm, setVrm] = useState(null);

  const groupRef          = useRef();
  const emoteRef          = useRef();
  const blinkTimerRef     = useRef(0);
  const isBlinkingRef     = useRef(false);
  const breathTimerRef    = useRef(0);
  const trackingOffsetRef = useRef({ x: 0, y: 0 });
  const globalPointerRef  = useRef({ x: 0, y: 0 });
  const thinkingWeightRef  = useRef(0);
  const speechAmpRef       = useRef(0);  // damped mouth-open amplitude for lip-sync
  const listeningSmileRef  = useRef(0);  // damped happy blend weight for listening pose
  const trackingActiveRef = useRef(isMouseTrackingActive);
  const { gl } = useThree();

  useEffect(() => { trackingActiveRef.current = isMouseTrackingActive; }, [isMouseTrackingActive]);

  // Always-on global mouse listener; gated internally by trackingActiveRef
  useEffect(() => {
    const onMove = (e) => {
      if (!trackingActiveRef.current || !gl?.domElement) return;
      const rect = gl.domElement.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top  + rect.height / 2;
      globalPointerRef.current.x = Math.max(-1, Math.min(1, (e.clientX - cx) / (window.innerWidth  / 2)));
      globalPointerRef.current.y = Math.max(-1, Math.min(1, -(e.clientY - cy) / (window.innerHeight / 2)));
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, [gl]);

  // Load VRM — retries on network errors (e.g. backend not ready on startup)
  useEffect(() => {
    if (!modelUrl) { setVrm(null); return; }
    let cancelled = false;
    const MAX_RETRIES = 5;
    const RETRY_DELAY_MS = 3000;

    const attempt = async (retriesLeft) => {
      try {
        const loader = new GLTFLoader();
        loader.register((p) => new VRMLoaderPlugin(p));
        const gltf = await loader.loadAsync(modelUrl);
        if (cancelled) return;
        setVrm(gltf.userData.vrm);
        onVrmLoaded?.(true);
      } catch (err) {
        if (cancelled) return;
        // Retry only on network/fetch errors (backend not ready), not on 404/parse errors
        const isNetworkErr = err instanceof TypeError || String(err?.message).startsWith('fetch');
        if (retriesLeft > 0 && isNetworkErr) {
          console.warn(`[VRM] Load failed, retrying in ${RETRY_DELAY_MS}ms (${retriesLeft} left):`, err.message);
          setTimeout(() => attempt(retriesLeft - 1), RETRY_DELAY_MS);
        } else {
          console.error('Failed to load VRM:', err);
          onVrmLoaded?.(false, err);
        }
      }
    };

    attempt(MAX_RETRIES);
    return () => { cancelled = true; };
  }, [modelUrl]);

  // One-shot expression blendshapes on emotion change
  useEffect(() => {
    if (!vrm?.expressionManager) return;
    const em = vrm.expressionManager;
    ['happy','angry','sad','relaxed','surprised','aa','ih','uu','ee','oh','blink','blinkLeft','blinkRight']
      .forEach(k => em.setValue(k, 0));
    switch (currentEmotion) {
      case 'happy1': em.setValue('relaxed', 1.0); break;
      case 'happy2': em.setValue('relaxed', 0.8); em.setValue('ee', 1.0); break;
      case 'sad':    em.setValue('sad', 1.0); break;
      case 'wink':
        em.setValue('happy', 0.7);
        if (!em.getExpression('blinkLeft')) console.warn('[VRM] blinkLeft not found on this model');
        em.setValue('blinkLeft', 1.0);
        break;
      default: break;
    }
  }, [currentEmotion, vrm]);

  useFrame((_state, delta) => {
    if (!vrm || !groupRef.current) return;
    const em = vrm.expressionManager;
    if (!em) return;

    vrm.update(delta);
    if (vrm.humanoid) resetArmPose(vrm.humanoid);

    // Blinking — suppressed during wink and asleep activities
    blinkTimerRef.current += delta;
    const disableBlink = currentEmotion === 'wink' || currentActivity === 'asleep';
    if (!disableBlink && !isBlinkingRef.current && blinkTimerRef.current > 3 + Math.random() * 3) {
      isBlinkingRef.current = true; blinkTimerRef.current = 0;
      em.setValue('blink', 1.0);
      setTimeout(() => { em.setValue('blink', 0.0); isBlinkingRef.current = false; }, 150);
    }

    // Breathing (hips sway)
    breathTimerRef.current += delta;
    const t    = breathTimerRef.current;
    const hips = vrm.humanoid.getNormalizedBoneNode('hips');
    if (hips) { hips.rotation.x = Math.sin(t * 0.5) * 0.02; hips.rotation.z = Math.cos(t * 0.25) * 0.01; }

    const head = vrm.humanoid.getNormalizedBoneNode('head');
    const neck = vrm.humanoid.getNormalizedBoneNode('neck');

    // ── Activity layer (priority over emotion) ──────────────────────────────
    if (currentActivity === 'asleep') {
      em.setValue('blink', 1.0);
      if (head) { head.rotation.x = THREE.MathUtils.damp(head.rotation.x, 0.25, 3, delta); head.rotation.y = 0; head.rotation.z = 0.08; }
      if (neck) neck.rotation.x = THREE.MathUtils.damp(neck.rotation.x, 0.1, 3, delta);

    } else if (currentActivity === 'waking_up') {
      em.setValue('aa', 0.8); em.setValue('blink', 0.4); // yawn pose
      if (head) head.rotation.x = THREE.MathUtils.damp(head.rotation.x, -0.1, 4, delta);

    } else {
      // ── Emotion head/neck rotations ─────────────────────────────────────
      let hx = 0, hy = 0, hz = 0, nx = 0;
      switch (currentEmotion) {
        case 'happy1': hx = -0.06+Math.sin(t*2.5)*0.02; hy = Math.sin(t*1.1)*0.035; hz = Math.sin(t*1.6)*0.02; break;
        case 'happy2': case 'wink':
          hx = -0.05+Math.sin(t*2.0)*0.015; hy = Math.sin(t*0.9)*0.025; hz = Math.sin(t*1.3)*0.015; break;
        case 'sad': hx = 0.15; hy = Math.sin(t*0.3)*0.01; hz = -0.06+Math.sin(t*0.4)*0.01; nx = 0.05; break;
        case 'speaking': {
          // Syllable envelope: two overlapping waves at speech cadence (3–7 Hz)
          // clamp to [0.08, 1] so the mouth never snaps fully shut mid-word
          const raw = (Math.sin(t * 7.3) + Math.sin(t * 4.1)) * 0.5; // -1..1
          speechAmpRef.current = THREE.MathUtils.damp(
            speechAmpRef.current, Math.max(0.08, raw * 0.9 + 0.1), 14, delta
          );
          const amp = speechAmpRef.current;
          // Four-phase viseme cycle (~1.5 Hz) for natural phoneme variation
          const ph = (t * 1.5) % (Math.PI * 2);
          em.setValue('aa', amp * Math.max(0, Math.cos(ph)));               // open  "ah"
          em.setValue('oh', amp * Math.max(0, Math.cos(ph + Math.PI / 3))); // round "oh"
          em.setValue('uu', amp * Math.max(0, Math.cos(ph + Math.PI)));     // pursed "oo"
          em.setValue('ee', amp * Math.max(0, Math.cos(ph + Math.PI * 4/3)));// front "ee"
          hx = Math.sin(t*3.7)*0.012; hy = Math.sin(t*2.1)*0.02; hz = Math.sin(t*1.9)*0.008; break;
        }
        default: hy = Math.sin(t*0.4)*0.015; hz = Math.sin(t*0.3)*0.01; break; // neutral
      }
      if (head) head.rotation.set(hx, hy, hz);
      if (neck) neck.rotation.set(nx, 0, 0);

      // Smooth thinking pose — blended additively so transitions feel natural
      thinkingWeightRef.current = THREE.MathUtils.damp(thinkingWeightRef.current, currentEmotion === 'thinking' ? 1 : 0, 4, delta);
      const w = thinkingWeightRef.current;
      if (w > 0.01) {
        if (head) { head.rotation.z += THREE.MathUtils.lerp(0, 0.15, w); head.rotation.x += THREE.MathUtils.lerp(0, -0.1, w); }
        if (neck) neck.rotation.z += THREE.MathUtils.lerp(0, 0.05, w);
        const lEye = vrm.humanoid.getNormalizedBoneNode('leftEye');
        const rEye = vrm.humanoid.getNormalizedBoneNode('rightEye');
        if (lEye) lEye.rotation.x = THREE.MathUtils.lerp(0, -0.15, w); // upward gaze
        if (rEye) rEye.rotation.x = THREE.MathUtils.lerp(0, -0.15, w);
        if (w > 0.5) { // arm pose once weight is dominant
          const rU = vrm.humanoid.getNormalizedBoneNode('rightUpperArm');
          const rL = vrm.humanoid.getNormalizedBoneNode('rightLowerArm');
          const rH = vrm.humanoid.getNormalizedBoneNode('rightHand');
          if (rU) rU.rotation.set(-1.2, -0.3, -0.3); // raised + forward + inward
          if (rL) rL.rotation.set(-1.5, 0, 0);        // elbow bent toward chin
          if (rH) rH.rotation.set(0.3, 0.2, 0);        // wrist tilted back
        }
      }

      // Listening pose — attentive forward spine lean + subtle receptive smile
      // Spine breathing: slow sine (~4 s/cycle) additive to listening lean so both coexist
      const spine = vrm.humanoid.getNormalizedBoneNode('spine');
      const spineBreath = Math.sin(t * 1.5) * 0.02; // chest rise, 1.5 rad/s ≈ one breath every ~4 s
      const targetSpineX = currentActivity === 'listening' ? 0.12 : 0.0;
      if (spine) spine.rotation.x = THREE.MathUtils.damp(spine.rotation.x, targetSpineX + spineBreath, 5, delta);
      listeningSmileRef.current = THREE.MathUtils.damp(listeningSmileRef.current, currentActivity === 'listening' ? 1 : 0, 4, delta);
      if (listeningSmileRef.current > 0.01) em.setValue('happy', listeningSmileRef.current * 0.25); // subtle attentive smile

      // Mouse tracking — additive offset distributed across neck + head
      const tX = trackingActiveRef.current ? globalPointerRef.current.y * -0.5 : 0; // pitch
      const tY = trackingActiveRef.current ? globalPointerRef.current.x *  0.5 : 0; // yaw
      trackingOffsetRef.current.x = THREE.MathUtils.damp(trackingOffsetRef.current.x, tX, 5, delta);
      trackingOffsetRef.current.y = THREE.MathUtils.damp(trackingOffsetRef.current.y, tY, 5, delta);
      if (neck) { neck.rotation.x += trackingOffsetRef.current.x * 0.5; neck.rotation.y += trackingOffsetRef.current.y * 0.5; }
      if (head) { head.rotation.x += trackingOffsetRef.current.x * 0.5; head.rotation.y += trackingOffsetRef.current.y * 0.5; }
    }

    // Floating emote — track head world position; emoteRef lives at scene root
    if (emoteRef.current && vrm.humanoid) {
      const headNode = vrm.humanoid.getNormalizedBoneNode('head');
      if (headNode) { headNode.getWorldPosition(emoteRef.current.position); emoteRef.current.position.y += 0.3; }
    }

    // Framing
    const offsets = framingOffsets || FRAMING_OFFSETS;
    const framing = offsets[avatarFraming] || offsets.full || Object.values(offsets)[0];
    groupRef.current.position.set(...framing.position);
    groupRef.current.scale.setScalar(framing.scale);
  });

  if (!vrm) return null;

  return (
    <>
      <group ref={groupRef}><primitive object={vrm.scene} /></group>
      {activeEmote && (
        <group ref={emoteRef}>
          <Html center distanceFactor={1.5}
            style={{ fontSize: '2rem', pointerEvents: 'none', filter: 'drop-shadow(0 0 8px rgba(0,255,255,0.8))' }}>
            {activeEmote}
          </Html>
        </group>
      )}
    </>
  );
}

/** VRM Canvas wrapper with loading state. */
const VrmPersona = () => {
  const { personaModelUrl } = useSwarmStore((s) => s.characterState);
  const { currentEmotion, currentActivity } = useAvatarStore();
  const [loadError, setLoadError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const handleVrmLoaded = (success, error) => {
    setIsLoading(false);
    if (!success) setLoadError(error);
  };

  const filename = useMemo(() => {
    if (!personaModelUrl) return '';
    const parts = personaModelUrl.split('/');
    return parts[parts.length - 1] || personaModelUrl;
  }, [personaModelUrl]);

  return (
    <div className="w-full h-full relative">
      <Canvas camera={{ position: [0, 0, 3], fov: 50 }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <VrmModelCore modelUrl={personaModelUrl} onVrmLoaded={handleVrmLoaded} />
        <OrbitControls enableZoom={false} />
      </Canvas>

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
          <span className="text-xs text-zinc-400 animate-pulse">VRM loading...</span>
        </div>
      )}

      {loadError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60">
          <div className="text-center">
            <p className="text-xs text-rose-400 mb-1">VRM load error</p>
            <p className="text-[10px] text-zinc-500 font-mono truncate max-w-[200px]">{loadError.message}</p>
          </div>
        </div>
      )}

      <div className="absolute bottom-2 left-2 right-2 bg-black/60 backdrop-blur-sm rounded-lg p-2 text-[10px] font-mono">
        <div className="space-y-1">
          <div className="flex justify-between items-center text-zinc-300">
            <span className="truncate max-w-[60%]">
              {personaModelUrl
                ? <><span className="text-emerald-400 mr-1">✓</span>{filename}</>
                : <><span className="text-amber-400 mr-1">◌</span>No VRM loaded</>}
            </span>
            <span className="capitalize text-indigo-400 flex-shrink-0 ml-2">{currentEmotion}</span>
          </div>
          <div className="text-[9px] text-zinc-500 flex justify-between">
            <span>VRM Model</span>
            <span>Activity: <span className="text-zinc-400">{currentActivity}</span></span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VrmPersona;
