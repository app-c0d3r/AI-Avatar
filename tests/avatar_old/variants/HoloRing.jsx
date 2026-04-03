import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const RINGS = [
  { radius: 1,   tube: 0.05, segments: 64 },
  { radius: 1.5, tube: 0.05, segments: 64 },
  { radius: 2,   tube: 0.05, segments: 64 },
];

const HoloRing = ({ emotion = 'neutral', compact = false }) => {
  const mountRef   = useRef(null);
  const emotionRef = useRef(emotion);

  // Keep emotionRef in sync without re-running the scene setup
  useEffect(() => { emotionRef.current = emotion; }, [emotion]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const w = mount.clientWidth  || 224;
    const h = mount.clientHeight || 224;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h);
    renderer.domElement.style.pointerEvents = 'none';
    mount.appendChild(renderer.domElement);

    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 100);
    camera.position.z = compact ? 10 : 5;

    const mat = new THREE.MeshBasicMaterial({
      color: 0x00d2ff,
      wireframe: true,
      transparent: true,
      opacity: 0.6,
    });

    const group = new THREE.Group();
    const geos  = RINGS.map(({ radius, tube, segments }) => {
      const geo  = new THREE.TorusGeometry(radius, tube, 16, segments);
      const mesh = new THREE.Mesh(geo, mat);
      group.add(mesh);
      return geo;
    });
    scene.add(group);

    const [inner, middle, outer] = group.children;

    const onResize = () => {
      const nw = mount.clientWidth;
      const nh = mount.clientHeight;
      renderer.setSize(nw, nh);
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', onResize);

    let rafId;
    const animate = () => {
      rafId = requestAnimationFrame(animate);
      const em = emotionRef.current;
      const t  = performance.now() * 0.001;

      if (em === 'thinking') {
        inner.rotation.x  += 0.05;
        middle.rotation.y += 0.05;
        outer.rotation.z  += 0.05;
        outer.scale.setScalar(0.85);
        mat.color.setHex(0x818cf8);
      } else if (em === 'happy') {
        inner.rotation.x  += 0.012;
        middle.rotation.y += 0.012;
        outer.rotation.z  += 0.012;
        outer.scale.setScalar(1);
        const pulse = 1 + Math.sin(t * 3) * 0.08;
        group.scale.setScalar(pulse);
        mat.color.setHex(0x4ade80);
      } else if (em === 'confused') {
        inner.rotation.x  += 0.02 + (Math.random() - 0.5) * 0.04;
        middle.rotation.y += 0.02 + (Math.random() - 0.5) * 0.04;
        outer.rotation.z  += 0.02 + (Math.random() - 0.5) * 0.04;
        outer.scale.setScalar(1);
        group.scale.setScalar(1);
        mat.color.setHex(0xfb923c);
      } else {
        // neutral — slow idle
        inner.rotation.x  += 0.005;
        middle.rotation.y += 0.005;
        outer.rotation.z  += 0.005;
        outer.scale.setScalar(1);
        group.scale.setScalar(1);
        mat.color.setHex(0x00d2ff);
      }

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', onResize);
      geos.forEach(g => g.dispose());
      mat.dispose();
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} className="w-full h-full" />;
};

export default HoloRing;
