/**
 * Shared VRM animation helpers.
 * Extracted from VrmPersona.jsx to stay under the 300-line limit.
 */

/** Default framing offsets for the full-page inspector canvas. */
export const FRAMING_OFFSETS = {
  face: { position: [0, -0.3, 2.5], scale: 0.8 },
  half: { position: [0, -0.8, 2.8], scale: 0.9 },
  full: { position: [0, -1.2, 3.0], scale: 1.0 },
};

/**
 * Resets arm bones to a relaxed T-pose baseline every frame.
 * Emotion cases in VrmModelCore.useFrame override specific bones after this runs.
 */
export function resetArmPose(humanoid) {
  const leftUpperArm  = humanoid.getNormalizedBoneNode('leftUpperArm');
  const rightUpperArm = humanoid.getNormalizedBoneNode('rightUpperArm');
  const leftLowerArm  = humanoid.getNormalizedBoneNode('leftLowerArm');
  const rightLowerArm = humanoid.getNormalizedBoneNode('rightLowerArm');
  const leftHand      = humanoid.getNormalizedBoneNode('leftHand');
  const rightHand     = humanoid.getNormalizedBoneNode('rightHand');
  // z pulls arms down from T-pose; x tilts slightly forward
  if (leftUpperArm)  { leftUpperArm.rotation.z  = -1.2; leftUpperArm.rotation.x  = -0.1; leftUpperArm.rotation.y  = 0; }
  if (rightUpperArm) { rightUpperArm.rotation.z =  1.2; rightUpperArm.rotation.x = -0.1; rightUpperArm.rotation.y = 0; }
  if (leftLowerArm)  leftLowerArm.rotation.set(0, 0, 0);
  if (rightLowerArm) rightLowerArm.rotation.set(0, 0, 0);
  if (leftHand)      leftHand.rotation.set(0, 0, 0);
  if (rightHand)     rightHand.rotation.set(0, 0, 0);
}
