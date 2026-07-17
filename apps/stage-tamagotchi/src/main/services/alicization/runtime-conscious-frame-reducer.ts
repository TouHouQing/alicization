import type {
  AlicizationCurrentConsciousFrameSnapshot,
  AlicizationMindTurnGovernance,
} from '../../../shared/eventa'
import type { AlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'

import { sanitizeAlicizationProviderFacingText } from '@proj-alicization/stage-shared'

export interface RuntimeConsciousFrameReducerInput {
  surface: AlicizationDigitalLifeRuntimeSurface | null
  governance: AlicizationMindTurnGovernance | null
  now: number
}

function sanitizeConsciousFrameText(raw: unknown, maxChars = 620) {
  return sanitizeAlicizationProviderFacingText(raw, maxChars, '')
}

function sanitizeConsciousFrameOptionalText(raw: unknown, maxChars = 320) {
  return sanitizeConsciousFrameText(raw, maxChars) || null
}

function sanitizeConsciousFrameReasonTags(values: string[] | null | undefined) {
  return (values ?? [])
    .map(value => sanitizeConsciousFrameText(value, 220))
    .filter(Boolean)
}

function sanitizeCurrentConsciousFrame(
  frame: AlicizationCurrentConsciousFrameSnapshot,
) {
  return {
    ...frame,
    consciousNeed: sanitizeConsciousFrameText(frame.consciousNeed),
    consciousTension: sanitizeConsciousFrameText(frame.consciousTension),
    speakingIntention: sanitizeConsciousFrameText(frame.speakingIntention),
    focusAnchor: sanitizeConsciousFrameOptionalText(frame.focusAnchor),
    withheldImpulse: sanitizeConsciousFrameOptionalText(frame.withheldImpulse),
    reasonTags: sanitizeConsciousFrameReasonTags(frame.reasonTags),
    continuityCadence: sanitizeConsciousFrameOptionalText(frame.continuityCadence, 80),
  } satisfies AlicizationCurrentConsciousFrameSnapshot
}

export function reduceRuntimeConsciousFrame(input: RuntimeConsciousFrameReducerInput) {
  const surface = input.surface ?? null
  if (!surface)
    return null

  const currentConsciousFrame = surface.dialogue?.currentConsciousFrame ?? null
  if (!currentConsciousFrame)
    return surface

  return {
    ...surface,
    dialogue: {
      ...surface.dialogue,
      currentConsciousFrame: sanitizeCurrentConsciousFrame(currentConsciousFrame),
    },
  } satisfies AlicizationDigitalLifeRuntimeSurface
}
