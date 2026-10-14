import type { VrmMotionExecutionState } from './action-playback'

import { createIdleStageEmbodimentSpeechRenderState } from '@proj-alicization/stage-shared'
import { AnimationClip, AnimationMixer, NumberKeyframeTrack, Object3D, Quaternion } from 'three'
import { describe, expect, it } from 'vitest'

import { createSettledVrmMotionExecutionState } from './action-playback'
import { createVrmAnimationReleaseQueue } from './animation-release-queue'
import { createVrmProceduralGestureClip } from './procedural-gestures'
import { allowsVrmMotionOwner, reconcileVrmSpeechMotionOwnership } from './speech-motion-ownership'

function speaking(segmentId: string) {
  return { ...createIdleStageEmbodimentSpeechRenderState(), active: true, audioBound: true, item: { segmentId, intentId: null, streamId: null, ownerId: 'alice', text: 'care', special: null, continuityHoldMs: 0, playbackDurationMs: null, metadata: null, cue: null, digitalLifeFrame: null } }
}

describe('actual gesture ownership when another utterance begins', () => {
  it('stops the prior nod before the next mixer frame, restores the real bone and allows the same cue with its new owner', () => {
    const root = new Object3D()
    const head = new Object3D()
    const spine = new Object3D()
    root.add(spine)
    spine.add(head)
    const mixer = new AnimationMixer(root)
    const clip = createVrmProceduralGestureClip({ getNormalizedBoneNode: name => name === 'head' ? head : name === 'spine' ? spine : null }, 'reassuring_nod')!
    const action = mixer.clipAction(clip).play()
    const renderPeak = () => {
      let peak = 0
      for (let frame = 0; frame < 45; frame++) {
        mixer.update(1 / 60)
        peak = Math.max(peak, head.quaternion.angleTo(new Quaternion()))
      }
      return peak
    }
    expect(renderPeak()).toBeGreaterThan(0.01)
    let motion: VrmMotionExecutionState = { cue: 'reassuring_nod', segmentId: 'greeting', cueSnapshot: null }
    let interrupted = 0
    const speech = speaking('care')
    const queue = createVrmAnimationReleaseQueue()
    const reconcile = () => reconcileVrmSpeechMotionOwnership({ speech, motion, cancelRetiringOthers: queue.cancelOtherOwners, interrupt: () => {
      action.stop()
      mixer.uncacheClip(clip)
      motion = createSettledVrmMotionExecutionState()
      interrupted++
    } })
    expect(reconcile()).toBe(true)
    mixer.update(0.01)
    expect(head.quaternion.angleTo(new Quaternion())).toBeLessThan(0.000001)
    expect(mixer.existingAction(clip)).toBeNull()
    expect(motion.segmentId).toBeNull()
    expect(interrupted).toBe(1)
    expect(allowsVrmMotionOwner(speech, 'greeting')).toBe(false)
    const currentClip = createVrmProceduralGestureClip({ getNormalizedBoneNode: name => name === 'head' ? head : name === 'spine' ? spine : null }, 'reassuring_nod')!
    const current = mixer.clipAction(currentClip).play()
    motion = { cue: 'reassuring_nod', segmentId: 'care', cueSnapshot: null }
    expect(allowsVrmMotionOwner(speech, motion.segmentId)).toBe(true)
    expect(reconcile()).toBe(false)
    expect(renderPeak()).toBeGreaterThan(0.01)
    expect(current.isRunning()).toBe(true)
    expect(interrupted).toBe(1)
  })

  it('cancels the prior faded action physically while retaining the current owner and independent base', () => {
    const root = new Object3D()
    const mixer = new AnimationMixer(root)
    const queue = createVrmAnimationReleaseQueue()
    const oldClip = new AnimationClip('old', 2, [new NumberKeyframeTrack('.position[x]', [0, 2], [0, 1])])
    const currentClip = new AnimationClip('current', 2, [new NumberKeyframeTrack('.position[y]', [0, 2], [0, 1])])
    const baseClip = new AnimationClip('base', 2, [new NumberKeyframeTrack('.position[z]', [0, 2], [0, 1])])
    const old = mixer.clipAction(oldClip).play()
    const current = mixer.clipAction(currentClip).play()
    const base = mixer.clipAction(baseClip).play()
    queue.retire(old, mixer, oldClip, 0.5, 'greeting')
    queue.retire(current, mixer, currentClip, 0.5, 'care')
    mixer.update(0.1)
    const input = { speech: speaking('care'), motion: createSettledVrmMotionExecutionState(), cancelRetiringOthers: queue.cancelOtherOwners, interrupt: () => {
      throw new Error('Settled motion must not invent another owner')
    } }
    expect(reconcileVrmSpeechMotionOwnership(input)).toBe(false)
    expect(mixer.existingAction(oldClip)).toBeNull()
    expect(current.isRunning()).toBe(true)
    expect(base.isRunning()).toBe(true)
    mixer.update(0.1)
    expect(root.position.x).toBe(0)
    expect(root.position.y).toBeGreaterThan(0)
    expect(root.position.z).toBeGreaterThan(0)
    expect(allowsVrmMotionOwner({ ...input.speech, audioBound: false }, 'greeting')).toBe(true)
  })
})
