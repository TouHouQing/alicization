import type { AnimationAction, AnimationClip, AnimationMixer } from 'three'

/** Three emits finished while iterating its action array; release outside update. */
export function createVrmAnimationReleaseQueue() {
  const retiring = new Map<AnimationAction, { mixer: AnimationMixer, clip: AnimationClip, remaining: number, owner: string | null }>()

  function release(action: AnimationAction, item: { mixer: AnimationMixer, clip: AnimationClip }) {
    action.stop()
    item.mixer.uncacheClip(item.clip)
    retiring.delete(action)
  }

  function retire(action: AnimationAction, mixer: AnimationMixer, clip: AnimationClip, fadeSeconds = 0, owner: string | null = null) {
    const remaining = Number.isFinite(fadeSeconds) ? Math.max(0, fadeSeconds) : 0
    if (remaining > 0)
      action.fadeOut(remaining)
    else
      action.setEffectiveWeight(0)
    retiring.set(action, { mixer, clip, remaining, owner })
  }

  function update(delta: number) {
    const step = Math.min(0.1, Math.max(0, Number.isFinite(delta) ? delta : 0))
    for (const [action, item] of retiring) {
      item.remaining -= step
      if (item.remaining <= 0)
        release(action, item)
    }
  }

  function clear() {
    for (const [action, item] of retiring)
      release(action, item)
  }

  function cancelOtherOwners(owner: string) {
    for (const [action, item] of retiring) {
      if (item.owner && item.owner !== owner)
        release(action, item)
    }
  }

  return { retire, update, clear, cancelOtherOwners }
}
