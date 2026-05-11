import type {
  AlicizationEmbodimentScriptRendererTarget,
  AlicizationEmbodimentScriptV1,
} from '@proj-alicization/stage-shared'
import type { AlicizationRuntimeEmbodimentSeed } from '../../../../../apps/stage-tamagotchi/src/main/services/alicization/embodiment/runtime-embodiment-seed'

import type {
  AlicizationDialoguePerformancePayload,
  AlicizationResidentPerformanceSnapshot,
  CharacterPerformanceCapabilitiesManifest,
} from '../../stores/alicization-bridge'

import { adaptAlicizationEmbodimentPerformanceToRenderer } from './renderer-capability-adapter'

export interface BuildAlicizationEmbodimentScriptInput {
  seed: AlicizationRuntimeEmbodimentSeed
  manifest: CharacterPerformanceCapabilitiesManifest | null | undefined
  residentPerformance: AlicizationResidentPerformanceSnapshot | null
  rendererTarget: AlicizationEmbodimentScriptRendererTarget
}

function buildSegmentText(replyText: string, speechTimeline: AlicizationRuntimeEmbodimentSeed['speechTimeline']) {
  return speechTimeline?.segments[0]?.text?.trim() || replyText
}

function resolveResidentMode(input: {
  residentPerformance: AlicizationResidentPerformanceSnapshot | null
  digitalLife: AlicizationRuntimeEmbodimentSeed['digitalLife']
}) {
  if (input.digitalLife?.mode === 'recovering')
    return 'idle-recovering' as const

  const residentSource = input.residentPerformance?.source
  if (residentSource === 'browser-fallback' || residentSource === 'runtime')
    return 'quiet-companionship' as const

  return 'dialogue' as const
}

export function buildAlicizationEmbodimentScript(
  input: BuildAlicizationEmbodimentScriptInput,
): AlicizationEmbodimentScriptV1 {
  const adapted = adaptAlicizationEmbodimentPerformanceToRenderer({
    performance: input.seed.performance,
    manifest: input.manifest,
    residentPerformance: input.residentPerformance,
    continuity: input.seed.embodiment
      ? {
          previousActionCue: input.seed.embodiment.performance.actionCue,
          previousFacialCue: input.seed.embodiment.performance.facialCue,
          variationToken: input.seed.embodiment.variationToken,
        }
      : undefined,
  })
  const segmentId = `${input.seed.turnId}-segment-0`
  const segmentText = buildSegmentText(input.seed.replyText, input.seed.speechTimeline)

  return {
    version: 'embodiment-script-v1',
    turnId: input.seed.turnId,
    rendererTarget: input.rendererTarget,
    replyText: input.seed.replyText,
    state: {
      baseEmotion: adapted.performance.baseEmotion,
      delivery: adapted.performance.delivery,
      emphasis: adapted.performance.emphasis,
      residentMode: resolveResidentMode({
        residentPerformance: input.residentPerformance,
        digitalLife: input.seed.digitalLife,
      }),
    },
    speechPlan: {
      segments: [{
        id: segmentId,
        index: 0,
        text: segmentText,
        interruptPolicy: 'soft-settle',
        preRollMs: 40,
        settleMs: 220,
      }],
      interruptPolicy: 'soft-settle',
      preRollMs: 40,
      settleMs: 220,
    },
    facePlan: {
      preUtteranceCue: null,
      postUtteranceCue: null,
      speakingCues: [{
        segmentId,
        emotion: adapted.performance.baseEmotion,
        facialCue: adapted.performance.facialCue ?? null,
        intensity: adapted.performance.emphasis >= 2 ? 0.8 : adapted.performance.emphasis === 1 ? 0.6 : 0.4,
      }],
    },
    motionPlan: {
      idleBase: adapted.performance.actionCue ?? 'idle_settle',
      actionBursts: [{
        segmentId,
        actionCue: adapted.performance.actionCue ?? null,
        intensity: adapted.performance.emphasis >= 2 ? 0.7 : adapted.performance.emphasis === 1 ? 0.5 : 0.3,
        holdMs: 320,
      }],
      attentionMode: input.manifest?.supportsLookAt === false ? 'ambient' : 'attentive',
    },
    lipsyncPlan: {
      mode: input.manifest?.supportsVisemeLipSync === true
        ? 'energy-phoneme-hybrid'
        : 'energy-only',
    },
  }
}
