import type { AnimationAction, AnimationMixer } from 'three'

import { shallowRef } from 'vue'

// Three.js completion events carry the original action identity. Vue proxies
// would prevent the owning action from releasing its playback state.
export function createVrmAnimationPlaybackState() {
  return {
    mixer: shallowRef<AnimationMixer>(),
    idleAction: shallowRef<AnimationAction>(),
    transientAction: shallowRef<AnimationAction>(),
  }
}

// A stalled renderer should still show the gesture's intermediate poses.
// Wall-clock life events keep their own timing; this only advances the body.
export function stepVrmAnimationPlayback(mixer: AnimationMixer | undefined, delta: number) {
  const step = Math.min(0.1, Math.max(0, Number.isFinite(delta) ? delta : 0))
  mixer?.update(step)
  return step
}
