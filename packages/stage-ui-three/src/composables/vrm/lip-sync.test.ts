import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

import { useVRMLipSync } from './lip-sync'

const { mockLipSyncNode } = vi.hoisted(() => ({
  mockLipSyncNode: {
    volume: 1,
    weights: {
      A: 0.9,
      E: 0.32,
      I: 0.08,
      O: 0.04,
      U: 0.02,
      S: 0,
    },
  },
}))

vi.mock('vue', async () => {
  const actual = await vi.importActual<typeof import('vue')>('vue')

  return {
    ...actual,
    onUnmounted: () => {},
  }
})

vi.mock('@vueuse/core', async () => {
  const vue = await import('vue')

  return {
    useAsyncState: () => ({
      state: vue.shallowRef(mockLipSyncNode),
      isReady: vue.ref(true),
    }),
  }
})

vi.mock('wlipsync', () => ({
  createWLipSyncNode: vi.fn(async () => mockLipSyncNode),
}))

vi.mock('../../../../stage-ui/src/stores/audio', () => ({
  useAudioContext: () => ({
    audioContext: {} as AudioContext,
  }),
}))

function createSpeechRenderState(rendererHints?: {
  residentMode?: string | null
  preferredBlinkCadence?: string | null
  preferredGazeMode?: string | null
  signature?: string | null
  reasonTags?: readonly string[] | null
} | null) {
  return ref({
    active: true,
    articulation: null,
    currentAudioSource: null,
    dynamics: {
      cadencePulse: 0.34,
      emphasisLevel: 0.42,
      prosodyIntensity: 0.58,
      speechEnergy: 0.72,
    },
    item: {
      cue: {
        id: 'segment-same-her-1',
        mouthWeight: 0.56,
        rendererHints: rendererHints ?? null,
      },
      digitalLifeFrame: {
        action: {
          rendererHints: null,
        },
        face: {
          rendererHints: null,
        },
        lipSync: {
          energyBias: 0.34,
          mode: 'viseme',
          mouthScale: 1,
          visemeBias: 0.66,
        },
        motor: {
          facial: {
            jawOpenBias: 0.28,
            mouthRound: 0.22,
            mouthSpread: 0.18,
          },
        },
      },
      segmentId: 'segment-same-her-1',
    },
    mouthOpenRatio: 0.62,
    phase: 'playing',
  } as any)
}

describe('vrm lip sync', () => {
  beforeEach(() => {
    mockLipSyncNode.volume = 1
    mockLipSyncNode.weights = {
      A: 0.9,
      E: 0.32,
      I: 0.08,
      O: 0.04,
      U: 0.02,
      S: 0,
    }
  })

  it('publishes vrm mouth execution segment proof while the continuity state is active', () => {
    const speech = createSpeechRenderState()
    const lipSync = useVRMLipSync(speech)

    const result = lipSync.update(1 / 60)

    expect(result.active).toBe(true)
    expect(lipSync.executionState.value.active).toBe(true)
    expect(lipSync.executionState.value.segmentId).toBe('segment-same-her-1')
  })

  it('falls back to the digital-life frame id for vrm mouth execution proof when descriptor and cue segment ids are absent', () => {
    const speech = createSpeechRenderState()
    speech.value.item.segmentId = null
    speech.value.item.cue.id = '   '
    speech.value.item.digitalLifeFrame.id = 'segment-frame-living-line'

    const lipSync = useVRMLipSync(speech)

    const result = lipSync.update(1 / 60)

    expect(result.active).toBe(true)
    expect(lipSync.executionState.value.active).toBe(true)
    expect(lipSync.executionState.value.segmentId).toBe('segment-frame-living-line')
  })

  it('prefers the active digital-life living line over a stale vrm descriptor segment id for mouth execution proof', () => {
    const speech = createSpeechRenderState()
    speech.value.item.segmentId = 'segment-stale-shell'
    speech.value.item.cue.id = 'segment-current-living-line'
    speech.value.item.digitalLifeFrame.id = 'segment-current-living-line'

    const lipSync = useVRMLipSync(speech)

    const result = lipSync.update(1 / 60)

    expect(result.active).toBe(true)
    expect(lipSync.executionState.value.active).toBe(true)
    expect(lipSync.executionState.value.segmentId).toBe('segment-current-living-line')
  })

  it('keeps the aligned playback living line over a stale cue shell for vrm mouth execution proof', () => {
    const speech = createSpeechRenderState()
    speech.value.item.segmentId = 'segment-current-living-line'
    speech.value.item.cue.id = 'turn-stale-cue-shell:0'
    speech.value.item.digitalLifeFrame = null

    const lipSync = useVRMLipSync(speech)

    const result = lipSync.update(1 / 60)

    expect(result.active).toBe(true)
    expect(lipSync.executionState.value.active).toBe(true)
    expect(lipSync.executionState.value.segmentId).toBe('segment-current-living-line')
  })

  it('freezes same-her cue context through the vrm mouth continuity tail after speech authority clears', () => {
    const speech = createSpeechRenderState({
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      reasonTags: ['same-her-return'],
      residentMode: 'repair-before-closeness',
      signature: 'same-her-hold:slower-lower-pressure',
    })
    speech.value.item.cue.emotion = 'thinking'
    speech.value.item.cue.facialCue = 'soft-gaze'
    speech.value.item.cue.rendererSettle = {
      vrmActionFadeMs: 420,
      vrmExpressionBlendMs: 560,
    }

    const lipSync = useVRMLipSync(speech)

    const active = lipSync.update(1 / 60)
    expect(active.active).toBe(true)
    expect(lipSync.executionState.value.active).toBe(true)
    expect(lipSync.executionState.value.segmentId).toBe('segment-same-her-1')
    expect((lipSync.executionState.value as any).cueSnapshot).toEqual({
      id: 'segment-same-her-1',
      emotion: 'thinking',
      facialCue: 'soft-gaze',
      rendererHints: {
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        reasonTags: ['same-her-return'],
        residentMode: 'repair-before-closeness',
        signature: 'same-her-hold:slower-lower-pressure',
      },
      rendererSettle: {
        vrmActionFadeMs: 420,
        vrmExpressionBlendMs: 560,
      },
    })

    speech.value.active = false
    speech.value.phase = 'idle'
    speech.value.playbackPhase = 'idle'
    speech.value.item = null
    mockLipSyncNode.volume = 0
    mockLipSyncNode.weights = {
      A: 0,
      E: 0,
      I: 0,
      O: 0,
      U: 0,
      S: 0,
    }

    const tail = lipSync.update(0.12)

    expect(tail.active).toBe(true)
    expect(lipSync.executionState.value.active).toBe(true)
    expect(lipSync.executionState.value.segmentId).toBe('segment-same-her-1')
    expect((lipSync.executionState.value as any).cueSnapshot).toEqual({
      id: 'segment-same-her-1',
      emotion: 'thinking',
      facialCue: 'soft-gaze',
      rendererHints: {
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        reasonTags: ['same-her-return'],
        residentMode: 'repair-before-closeness',
        signature: 'same-her-hold:slower-lower-pressure',
      },
      rendererSettle: {
        vrmActionFadeMs: 420,
        vrmExpressionBlendMs: 560,
      },
    })
  })

  it('keeps coordinator-style freeform same-her body+voice carry more inward than an otherwise equally softened measured-return viseme pass', () => {
    const softenedSpeech = createSpeechRenderState({
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      residentMode: 'measured-return',
    })
    const sameHerSpeech = createSpeechRenderState({
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      reasonTags: ['embodiment:body+voice-only'],
      residentMode: 'measured-return',
      signature: 'resident|main-runtime|embodiment:audible_same_her_line|body+voice-only',
    })

    const softenedLipSync = useVRMLipSync(softenedSpeech)
    const sameHerLipSync = useVRMLipSync(sameHerSpeech)

    const softened = softenedLipSync.update(1 / 60)
    const sameHer = sameHerLipSync.update(1 / 60)

    expect(softened.active).toBe(true)
    expect(sameHer.active).toBe(true)
    expect(softened.weights.aa).toBeGreaterThan(sameHer.weights.aa)
    expect(softened.weights.ee).toBeGreaterThan(sameHer.weights.ee)
  })

  it('keeps repair-before-closeness body+voice-only viseme restraint more inward than an otherwise equally softened repair-first pass', () => {
    const softenedSpeech = createSpeechRenderState({
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      residentMode: 'repair-before-closeness',
    })
    const sameHerSpeech = createSpeechRenderState({
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      reasonTags: ['embodiment:body+voice-only'],
      residentMode: 'repair-before-closeness',
      signature: 'resident|main-runtime|embodiment:audible_same_her_line|body+voice-only',
    })

    const softenedLipSync = useVRMLipSync(softenedSpeech)
    const sameHerLipSync = useVRMLipSync(sameHerSpeech)

    const softened = softenedLipSync.update(1 / 60)
    const sameHer = sameHerLipSync.update(1 / 60)

    expect(softened.active).toBe(true)
    expect(sameHer.active).toBe(true)
    expect(softened.weights.aa).toBeGreaterThan(sameHer.weights.aa)
    expect(softened.weights.ee).toBeGreaterThan(sameHer.weights.ee)
  })

  it('keeps same-thread still-voiced face-line viseme restraint more inward than an otherwise equally softened same-thread pass', () => {
    const softenedSpeech = createSpeechRenderState({
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      residentMode: 'same-thread-continuation',
    })
    const stillVoicedFaceSpeech = createSpeechRenderState({
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      reasonTags: ['embodiment:still-voiced-face-line'],
      residentMode: 'same-thread-continuation',
    })

    const softenedLipSync = useVRMLipSync(softenedSpeech)
    const stillVoicedFaceLipSync = useVRMLipSync(stillVoicedFaceSpeech)

    const softened = softenedLipSync.update(1 / 60)
    const stillVoicedFace = stillVoicedFaceLipSync.update(1 / 60)

    expect(softened.active).toBe(true)
    expect(stillVoicedFace.active).toBe(true)
    expect(softened.weights.aa).toBeGreaterThan(stillVoicedFace.weights.aa)
    expect(softened.weights.ee).toBeGreaterThan(stillVoicedFace.weights.ee)
  })

  it('keeps same-thread richer still-voiced face-and-mouth viseme carry a little more alive than the plainer still-voiced face line', () => {
    const stillVoicedFaceSpeech = createSpeechRenderState({
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      reasonTags: ['embodiment:still-voiced-face-line'],
      residentMode: 'same-thread-continuation',
    })
    const stillVoicedFaceMouthSpeech = createSpeechRenderState({
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      reasonTags: ['embodiment:still-voiced-face-lipsync-line'],
      residentMode: 'same-thread-continuation',
      signature: 'resident|main-runtime|accompanying|quiet-accompaniment|still-voiced-face-lipsync-line|lane=face+lipsync+voice-only',
    })

    const stillVoicedFaceLipSync = useVRMLipSync(stillVoicedFaceSpeech)
    const stillVoicedFaceMouthLipSync = useVRMLipSync(stillVoicedFaceMouthSpeech)

    const stillVoicedFace = stillVoicedFaceLipSync.update(1 / 60)
    const stillVoicedFaceMouth = stillVoicedFaceMouthLipSync.update(1 / 60)

    expect(stillVoicedFace.active).toBe(true)
    expect(stillVoicedFaceMouth.active).toBe(true)
    expect(stillVoicedFaceMouth.weights.aa).toBeGreaterThan(stillVoicedFace.weights.aa)
    expect(stillVoicedFaceMouth.weights.ee).toBeGreaterThan(stillVoicedFace.weights.ee)
  })

  it('keeps same-thread still-voiced motion-line signature-only viseme restraint more inward than an otherwise equally softened same-thread pass', () => {
    const softenedSpeech = createSpeechRenderState({
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      residentMode: 'same-thread-continuation',
    })
    const stillVoicedMotionSpeech = createSpeechRenderState({
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      residentMode: 'same-thread-continuation',
      signature: 'resident|main-runtime|still-voiced-motion-line',
    })

    const softenedLipSync = useVRMLipSync(softenedSpeech)
    const stillVoicedMotionLipSync = useVRMLipSync(stillVoicedMotionSpeech)

    const softened = softenedLipSync.update(1 / 60)
    const stillVoicedMotion = stillVoicedMotionLipSync.update(1 / 60)

    expect(softened.active).toBe(true)
    expect(stillVoicedMotion.active).toBe(true)
    expect(softened.weights.aa).toBeGreaterThan(stillVoicedMotion.weights.aa)
    expect(softened.weights.ee).toBeGreaterThan(stillVoicedMotion.weights.ee)
  })

  it('keeps same-thread richer still-voiced motion-and-mouth viseme carry a little more alive than the plainer still-voiced motion line', () => {
    const stillVoicedMotionSpeech = createSpeechRenderState({
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      residentMode: 'same-thread-continuation',
      signature: 'resident|main-runtime|still-voiced-motion-line',
    })
    const stillVoicedMotionMouthSpeech = createSpeechRenderState({
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      reasonTags: ['embodiment:still-voiced-motion-lipsync-line'],
      residentMode: 'same-thread-continuation',
      signature: 'resident|main-runtime|accompanying|quiet-accompaniment|still-voiced-motion-lipsync-line|lane=motion+lipsync+voice-only',
    })

    const stillVoicedMotionLipSync = useVRMLipSync(stillVoicedMotionSpeech)
    const stillVoicedMotionMouthLipSync = useVRMLipSync(stillVoicedMotionMouthSpeech)

    const stillVoicedMotion = stillVoicedMotionLipSync.update(1 / 60)
    const stillVoicedMotionMouth = stillVoicedMotionMouthLipSync.update(1 / 60)

    expect(stillVoicedMotion.active).toBe(true)
    expect(stillVoicedMotionMouth.active).toBe(true)
    expect(stillVoicedMotionMouth.weights.aa).toBeGreaterThan(stillVoicedMotion.weights.aa)
    expect(stillVoicedMotionMouth.weights.ee).toBeGreaterThan(stillVoicedMotion.weights.ee)
  })

  it('keeps same-thread richer still-voiced face-and-motion viseme restraint more inward than an otherwise equally softened same-thread pass', () => {
    const softenedSpeech = createSpeechRenderState({
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      residentMode: 'same-thread-continuation',
    })
    const stillVoicedFaceMotionSpeech = createSpeechRenderState({
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      residentMode: 'same-thread-continuation',
      signature: 'resident|main-runtime|accompanying|quiet-accompaniment|still-voiced-face-motion-line|lane=face+motion+voice-only',
      reasonTags: ['embodiment:still-voiced-face-motion-line'],
    })

    const softenedLipSync = useVRMLipSync(softenedSpeech)
    const stillVoicedFaceMotionLipSync = useVRMLipSync(stillVoicedFaceMotionSpeech)

    const softened = softenedLipSync.update(1 / 60)
    const stillVoicedFaceMotion = stillVoicedFaceMotionLipSync.update(1 / 60)

    expect(softened.active).toBe(true)
    expect(stillVoicedFaceMotion.active).toBe(true)
    expect(softened.weights.aa).toBeGreaterThan(stillVoicedFaceMotion.weights.aa)
    expect(softened.weights.ee).toBeGreaterThan(stillVoicedFaceMotion.weights.ee)
  })

  it('keeps same-thread face+lipsync-only viseme restraint more inward than an otherwise equally softened same-thread pass', () => {
    const softenedSpeech = createSpeechRenderState({
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      residentMode: 'same-thread-continuation',
    })
    const faceLipsyncSpeech = createSpeechRenderState({
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      reasonTags: ['lane=face+lipsync-only'],
      residentMode: 'same-thread-continuation',
    })

    const softenedLipSync = useVRMLipSync(softenedSpeech)
    const faceLipsyncLipSync = useVRMLipSync(faceLipsyncSpeech)

    const softened = softenedLipSync.update(1 / 60)
    const faceLipsync = faceLipsyncLipSync.update(1 / 60)

    expect(softened.active).toBe(true)
    expect(faceLipsync.active).toBe(true)
    expect(softened.weights.aa).toBeGreaterThan(faceLipsync.weights.aa)
    expect(softened.weights.ee).toBeGreaterThan(faceLipsync.weights.ee)
  })

  it('keeps same-thread motion+lipsync-only viseme restraint more inward than an otherwise equally softened same-thread pass', () => {
    const softenedSpeech = createSpeechRenderState({
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      residentMode: 'same-thread-continuation',
    })
    const motionLipsyncSpeech = createSpeechRenderState({
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      reasonTags: ['lane=motion+lipsync-only'],
      residentMode: 'same-thread-continuation',
    })

    const softenedLipSync = useVRMLipSync(softenedSpeech)
    const motionLipsyncLipSync = useVRMLipSync(motionLipsyncSpeech)

    const softened = softenedLipSync.update(1 / 60)
    const motionLipsync = motionLipsyncLipSync.update(1 / 60)

    expect(softened.active).toBe(true)
    expect(motionLipsync.active).toBe(true)
    expect(softened.weights.aa).toBeGreaterThan(motionLipsync.weights.aa)
    expect(softened.weights.ee).toBeGreaterThan(motionLipsync.weights.ee)
  })
})
