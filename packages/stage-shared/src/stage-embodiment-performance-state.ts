import type { AlicizationDialogueSpeechTimelineSegment } from './alicization-dialogue-speech-timeline'
import type { AlicizationDialoguePerformancePayload } from './alicization-performance-contracts'
import type { StageEmbodimentMotorState } from './stage-embodiment-motor-state'
import type {
  StageEmbodimentSpeechPlaybackItem,
  StageEmbodimentSpeechRenderPhase,
} from './stage-embodiment-speech-playback'

import { normalizeAlicizationPerformancePayload } from './alicization-performance-contracts'
import { createIdleStageEmbodimentMotorState } from './stage-embodiment-motor-state'

export type StageEmbodimentPerformancePhase = 'idle' | 'armed' | 'speaking' | 'cooldown'
export type StageEmbodimentPerformanceCueSource = 'none' | 'resident' | 'segment' | 'preview'
export type StageEmbodimentPerformanceMatchedDriver = 'body' | 'face' | 'motion' | 'lipsync' | 'voice'

export type StageEmbodimentPerformanceActionPulseReason
  = | 'dialogue'
    | 'presence-pulse'
    | 'segment-preview'
    | 'segment-start'
    | 'segment-shift'
    | 'segment-beat'

export interface StageEmbodimentPerformanceActionPulseState {
  revision: number
  cue: string | null
  issuedAt: number | null
  reason: StageEmbodimentPerformanceActionPulseReason | null
  segmentId: string | null
}

export interface StageEmbodimentPerformanceState {
  revision: number
  phase: StageEmbodimentPerformancePhase
  driverRendererTarget: 'live2d' | 'vrm' | null
  driverAuthority: {
    segmentId: string | null
    rendererTarget: 'live2d' | 'vrm' | null
    matchedDrivers: StageEmbodimentPerformanceMatchedDriver[]
    sources: string[]
    bodySegmentMatched: boolean
    faceSegmentMatched: boolean
    motionSegmentMatched: boolean
    lipsyncSegmentMatched: boolean
    voiceSegmentMatched?: boolean
    prosodyAuthority?: {
      segmentId: string | null
      provenance: 'authority-bound' | 'fallback-derived'
      source: string | null
      mode: string | null
      cueProsodyWeight: number | null
      cueMouthWeight: number | null
      cueHeadWeight: number | null
      visemePeakWeight: number | null
    } | null
  } | null
  residentPerformance: AlicizationDialoguePerformancePayload
  residentReasonTags: string[]
  performance: AlicizationDialoguePerformancePayload
  activeFacialCue: string | null
  activeFacialCueSource: StageEmbodimentPerformanceCueSource
  activeActionCue: string | null
  activeActionCueSource: StageEmbodimentPerformanceCueSource
  variationToken: string | null
  speechActive: boolean
  speechPhase: StageEmbodimentSpeechRenderPhase
  activeCue: AlicizationDialogueSpeechTimelineSegment | null
  activeCueSource: StageEmbodimentPerformanceCueSource
  activeSegment: StageEmbodimentSpeechPlaybackItem | null
  expressionIntensity: number
  facialCueIntensity: number
  actionIntensity: number
  motionPulse: number
  prosodyDrive: number
  breathDrive: number
  focusDrive: number
  motor: StageEmbodimentMotorState
  armedAt: number | null
  speakingStartedAt: number | null
  cooldownUntil: number | null
  updatedAt: number
  actionPulse: StageEmbodimentPerformanceActionPulseState
}

export function createIdleStageEmbodimentPerformanceState(): StageEmbodimentPerformanceState {
  const idlePerformance = normalizeAlicizationPerformancePayload(undefined, 'neutral')

  return {
    revision: 0,
    phase: 'idle',
    driverRendererTarget: null,
    driverAuthority: null,
    residentPerformance: { ...idlePerformance },
    residentReasonTags: [],
    performance: { ...idlePerformance },
    activeFacialCue: null,
    activeFacialCueSource: 'none',
    activeActionCue: null,
    activeActionCueSource: 'none',
    variationToken: null,
    speechActive: false,
    speechPhase: 'idle',
    activeCue: null,
    activeCueSource: 'none',
    activeSegment: null,
    expressionIntensity: 0,
    facialCueIntensity: 0,
    actionIntensity: 0,
    motionPulse: 0,
    prosodyDrive: 0,
    breathDrive: 0,
    focusDrive: 0,
    motor: createIdleStageEmbodimentMotorState(),
    armedAt: null,
    speakingStartedAt: null,
    cooldownUntil: null,
    updatedAt: 0,
    actionPulse: {
      revision: 0,
      cue: null,
      issuedAt: null,
      reason: null,
      segmentId: null,
    },
  }
}
