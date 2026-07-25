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
        id: 'segment-mouth-1',
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
      segmentId: 'segment-mouth-1',
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
    expect(lipSync.executionState.value.segmentId).toBe('segment-mouth-1')
  })

  it('falls back to the digital-life frame id for vrm mouth execution proof when descriptor and cue segment ids are absent', () => {
    const speech = createSpeechRenderState()
    speech.value.item.segmentId = null
    speech.value.item.cue.id = '   '
    speech.value.item.digitalLifeFrame.id = 'segment-frame-mouth'

    const lipSync = useVRMLipSync(speech)

    const result = lipSync.update(1 / 60)

    expect(result.active).toBe(true)
    expect(lipSync.executionState.value.active).toBe(true)
    expect(lipSync.executionState.value.segmentId).toBe('segment-frame-mouth')
  })

  it('prefers the active digital-life frame over a stale vrm descriptor segment id for mouth execution proof', () => {
    const speech = createSpeechRenderState()
    speech.value.item.segmentId = 'segment-stale-shell'
    speech.value.item.cue.id = 'segment-current-frame'
    speech.value.item.digitalLifeFrame.id = 'segment-current-frame'

    const lipSync = useVRMLipSync(speech)

    const result = lipSync.update(1 / 60)

    expect(result.active).toBe(true)
    expect(lipSync.executionState.value.active).toBe(true)
    expect(lipSync.executionState.value.segmentId).toBe('segment-current-frame')
  })

  it('keeps the aligned playback segment over a stale cue shell for vrm mouth execution proof', () => {
    const speech = createSpeechRenderState()
    speech.value.item.segmentId = 'segment-current-mouth'
    speech.value.item.cue.id = 'turn-stale-cue-shell:0'
    speech.value.item.digitalLifeFrame = null

    const lipSync = useVRMLipSync(speech)

    const result = lipSync.update(1 / 60)

    expect(result.active).toBe(true)
    expect(lipSync.executionState.value.active).toBe(true)
    expect(lipSync.executionState.value.segmentId).toBe('segment-current-mouth')
  })

  it('freezes cue audit context through the vrm mouth continuity tail after speech authority clears', () => {
    const speech = createSpeechRenderState({
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      reasonTags: ['renderer:audit-only'],
      residentMode: 'repair-before-closeness',
      signature: 'renderer audit text',
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
    expect(lipSync.executionState.value.segmentId).toBe('segment-mouth-1')
    expect((lipSync.executionState.value as any).cueSnapshot).toEqual({
      id: 'segment-mouth-1',
      emotion: 'thinking',
      facialCue: 'soft-gaze',
      rendererHints: {
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        reasonTags: ['renderer:audit-only'],
        residentMode: 'repair-before-closeness',
        signature: 'renderer audit text',
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
    expect(lipSync.executionState.value.segmentId).toBe('segment-mouth-1')
    expect((lipSync.executionState.value as any).cueSnapshot).toEqual({
      id: 'segment-mouth-1',
      emotion: 'thinking',
      facialCue: 'soft-gaze',
      rendererHints: {
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        reasonTags: ['renderer:audit-only'],
        residentMode: 'repair-before-closeness',
        signature: 'renderer audit text',
      },
      rendererSettle: {
        vrmActionFadeMs: 420,
        vrmExpressionBlendMs: 560,
      },
    })
  })

  it.each([
    'measured-return',
    'repair-before-closeness',
    'same-thread-continuation',
  ])('keeps %s viseme weights audit neutral', (residentMode) => {
    const baselineSpeech = createSpeechRenderState({
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      residentMode,
    })
    const auditedSpeech = createSpeechRenderState({
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      reasonTags: ['renderer:audit-only', 'renderer:changed'],
      residentMode,
      signature: 'renderer audit text',
    })

    const baseline = useVRMLipSync(baselineSpeech).update(1 / 60)
    const audited = useVRMLipSync(auditedSpeech).update(1 / 60)

    expect(audited).toEqual(baseline)
  })
})
