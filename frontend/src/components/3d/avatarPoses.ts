import { MathUtils } from 'three'

export interface PoseTargets {
  lUAz: number   // leftUpperArm.rotation.z
  rUAz: number   // rightUpperArm.rotation.z
  lLAz: number   // leftLowerArm.rotation.z
  rLAz: number   // rightLowerArm.rotation.z (dynamic for wave)
  spineX: number // spine.rotation.x
  headZ: number  // head.rotation.z — additive roll only, mouse tracking owns X/Y
}

export const NEUTRAL: PoseTargets = {
  lUAz: -1.2, rUAz: 1.2, lLAz: 0, rLAz: 0, spineX: 0, headZ: 0
}

const INTENSITY_FACTOR: Record<string, number> = {
  low: 0.5, medium: 1.0, high: 1.5
}

function getRawTargets(pose: string, t: number): PoseTargets {
  switch (pose) {
    case 'wave':
      return { lUAz: -1.2, rUAz: -0.9, lLAz: 0, rLAz: -0.35 + Math.sin(t * 3) * 0.35, spineX: 0,     headZ: 0.05 }
    case 'happy':
      return { lUAz: -0.8, rUAz:  0.8, lLAz: 0, rLAz: 0,                                spineX: -0.05, headZ: 0.10 }
    case 'thinking':
      return { lUAz: -1.2, rUAz:  0.25, lLAz: 0, rLAz: -0.85,                           spineX: 0.05,  headZ: 0.18 }
    case 'sad':
      return { lUAz: -1.5, rUAz:  1.5, lLAz: 0, rLAz: 0,                                spineX: 0.10,  headZ: -0.12 }
    case 'surprised':
      return { lUAz: -0.15, rUAz: 0.15, lLAz: 0, rLAz: 0,                               spineX: -0.10, headZ: 0 }
    case 'excited':
      return { lUAz: -0.20, rUAz: 0.20, lLAz: 0, rLAz: 0,                               spineX: -0.12, headZ: 0 }
    case 'bow':
      return { lUAz: -1.2,  rUAz: 1.2,  lLAz: 0, rLAz: 0,                               spineX: 0.40,  headZ: 0 }
    case 'explaining':
      return { lUAz: -1.2,  rUAz: 0.55, lLAz: 0, rLAz: -0.40,                           spineX: 0.05,  headZ: 0.05 }
    case 'embarrassed':
      return { lUAz: -1.05, rUAz: 1.05, lLAz: -0.30, rLAz: 0.30,                        spineX: 0.08,  headZ: 0.20 }
    case 'confident':
      return { lUAz: -1.0,  rUAz: 1.0,  lLAz: -0.50, rLAz: 0.50,                        spineX: -0.05, headZ: -0.05 }
    default: // neutral
      return { ...NEUTRAL }
  }
}

function scalePose(raw: PoseTargets, factor: number): PoseTargets {
  const clamp = MathUtils.clamp
  return {
    lUAz:   clamp(NEUTRAL.lUAz  + (raw.lUAz  - NEUTRAL.lUAz)  * factor, -1.8, 0.2),
    rUAz:   clamp(NEUTRAL.rUAz  + (raw.rUAz  - NEUTRAL.rUAz)  * factor, -0.2, 1.8),
    lLAz:   clamp(NEUTRAL.lLAz  + (raw.lLAz  - NEUTRAL.lLAz)  * factor, -1.0, 1.0),
    rLAz:   clamp(NEUTRAL.rLAz  + (raw.rLAz  - NEUTRAL.rLAz)  * factor, -1.0, 1.0),
    spineX: clamp(NEUTRAL.spineX + (raw.spineX - NEUTRAL.spineX) * factor, -0.2, 0.6),
    headZ:  clamp(NEUTRAL.headZ  + (raw.headZ  - NEUTRAL.headZ)  * factor, -0.4, 0.4),
  }
}

export function getPoseTargets(pose: string, intensity: string, t: number): PoseTargets {
  const factor = INTENSITY_FACTOR[intensity] ?? 1.0
  return scalePose(getRawTargets(pose, t), factor)
}
