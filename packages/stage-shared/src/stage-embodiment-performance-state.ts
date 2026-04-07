import type { AlicizationDialogueSpeechTimelineSegment } from './alicization-dialogue-speech-timeline'
import type { AlicizationDialoguePerformancePayload } from './alicization-performance-contracts'
import type {
  StageEmbodimentSpeechPlaybackItem,
  StageEmbodimentSpeechRenderPhase,
} from './stage-embodiment-speech-playback'

import { normalizeAlicizationPerformancePayload } from './alicization-performance-contracts'

export type StageEmbodimentPerformancePhase = 'idle' | 'armed' | 'speaking' | 'cooldown'
export type StageEmbodimentPerformanceCueSource = 'none' | 'resident' | 'segment' | 'preview'

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
  residentPerformance: AlicizationDialoguePerformancePayload
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
    residentPerformance: { ...idlePerformance },
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
