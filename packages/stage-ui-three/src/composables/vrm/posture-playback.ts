import type { AnimationAction, AnimationClip, AnimationMixer } from 'three'

import type { VrmDailyPosture } from './daily-posture-driver'

import { LoopRepeat } from 'three'

/** A persistent base pose and a short gesture have distinct ownership. */
export function createVrmPosturePlayback(options: {
  mixer: () => AnimationMixer | undefined
  neutral: () => AnimationAction | undefined
  load: (mode: VrmDailyPosture) => Promise<AnimationClip | null>
}) {
  let generation = 0
  let active: { mode: VrmDailyPosture, action: AnimationAction, mixer: AnimationMixer, clip: AnimationClip } | null = null
  let failed = false
  const retiring: Array<{ action: AnimationAction, mixer: AnimationMixer, clip: AnimationClip, remaining: number }> = []
  function release(item: { action: AnimationAction, mixer: AnimationMixer, clip: AnimationClip }) {
    item.action.stop()
    item.mixer.uncacheClip(item.clip)
  }
  function clear() {
    generation++
    if (active)
      release(active)
    active = null
    retiring.splice(0).forEach(release)
    options.neutral()?.setEffectiveWeight(1).play()
  }
  async function request(mode: VrmDailyPosture) {
    const requestId = ++generation
    const mixer = options.mixer()
    failed = false
    if (!mixer)
      return
    let clip: AnimationClip | null = null
    if (mode !== 'stand') {
      try {
        clip = await options.load(mode)
      }
      catch { failed = true }
    }
    if (requestId !== generation || mixer !== options.mixer())
      return
    if (mode !== 'stand' && !clip) {
      failed = true
      return
    }
    const previous = active
    const from = previous?.action ?? options.neutral()
    const next = clip ? mixer.clipAction(clip).setLoop(LoopRepeat, Infinity).reset().play() : options.neutral()
    if (clip && clip.duration <= 0)
      clip.duration = 1
    next?.setEffectiveWeight(1)
    if (from && next && from !== next)
      from.crossFadeTo(next, 0.65, false)
    active = clip && next ? { mode, action: next, mixer, clip } : null
    if (previous && previous.action !== next)
      retiring.push({ ...previous, remaining: 0.7 })
  }
  function update(delta: number) {
    for (const item of [...retiring]) {
      item.remaining -= Math.min(0.1, Math.max(0, delta))
      if (item.remaining <= 0) {
        release(item)
        retiring.splice(retiring.indexOf(item), 1)
      }
    }
  }
  return { request, clear, update, base: () => active?.action ?? options.neutral(), snapshot: () => ({ mode: active?.mode ?? 'stand', loaded: Boolean(active), failed }) }
}
