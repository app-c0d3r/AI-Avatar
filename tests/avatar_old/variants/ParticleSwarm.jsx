import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const PARTICLE_COUNT = 3000;
const SPHERE_RADIUS  = 1.5;

function buildGeometry() {
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    // Uniform spherical volume distribution
    const r     = SPHERE_RADIUS * Math.cbrt(Math.random());
    const theta = Math.random() * Math.PI * 2;
    const phi   = Math.acos(2 * Math.random() - 1);
    positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  return geo;
}

const ParticleSwarm = ({ emotion = 'neutral', compact = false }) => {
  const mountRef   = useRef(null);
  const emotionRef = useRef(emotion);

  // Keep emotionRef in sync without re-running the scene setup
  useEffect(() => { emotionRef.current = emotion; }, [emotion]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const w = mount.clientWidth  || 224;
    const h = mount.clientHeight || 224;

    // Renderer — alpha:true keeps the avatar card background visible
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h);
    renderer.domElement.style.pointerEvents = 'none';
    mount.appendChild(renderer.domElement);

    // Scene & Camera
    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 100);
    camera.position.z = compact ? 8 : 4;

    // Particles
    const geo = buildGeometry();
    const mat = new THREE.PointsMaterial({
      color: 0x00e5ff,
      size: 0.05,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true,
    });
    const points = new THREE.Points(geo, mat);
    scene.add(points);

    // Resize
    const onResize = () => {
      if (!mount) return;
      const nw = mount.clientWidth;
      const nh = mount.clientHeight;
      renderer.setSize(nw, nh);
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', onResize);

    // Render loop
    let rafId;
    const animate = () => {
      rafId = requestAnimationFrame(animate);
      const em = emotionRef.current;
      const t  = performance.now() * 0.001;

      if (em === 'thinking') {
        points.rotation.y += 0.025;
        points.rotation.x += 0.012;
        points.scale.setScalar(0.8);
        mat.color.setHex(0x818cf8); // indigo — focused
      } else if (em === 'happy') {
        points.rotation.y += 0.01;
        points.rotation.x += 0.004;
        const pulse = 1 + Math.sin(t * 5) * 0.06;
        points.scale.setScalar(pulse);
        mat.color.setHex(0xfde047); // yellow — joyful
      } else if (em === 'confused') {
        points.rotation.y += 0.015 + (Math.random() - 0.5) * 0.03;
        points.rotation.x += 0.010 + (Math.random() - 0.5) * 0.02;
        points.scale.setScalar(1);
        mat.color.setHex(0xfb923c); // orange — confused
      } else {
        // neutral — slow idle
        points.rotation.y += 0.004;
        points.rotation.x += 0.002;
        points.scale.setScalar(1);
        mat.color.setHex(0x00e5ff); // cyan — calm
      }

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', onResize);
      geo.dispose();
      mat.dispose();
      renderer.dispose();
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div ref={mountRef} className="w-full h-full" />
  );
};

export default ParticleSwarm;
