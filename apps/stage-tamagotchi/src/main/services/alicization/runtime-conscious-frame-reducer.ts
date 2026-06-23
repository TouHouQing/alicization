import type { AlicizationMindTurnGovernance } from '../../../shared/eventa'
import type { AlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'

export interface RuntimeConsciousFrameReducerInput {
  surface: AlicizationDigitalLifeRuntimeSurface | null
  governance: AlicizationMindTurnGovernance | null
  now: number
}

export function reduceRuntimeConsciousFrame(input: RuntimeConsciousFrameReducerInput) {
  const surface = input.surface ?? null
  const governance = input.governance ?? null
  if (!surface || !governance)
    return surface
  if (surface.dialogue.currentConsciousFrame)
    return surface

  return {
    ...surface,
    dialogue: {
      ...surface.dialogue,
      currentConsciousFrame: {
        subject: governance.answerSubject ?? 'general',
        centerOfGravity: governance.answerAct === 'care'
          ? 'care'
          : governance.answerAct === 'guide'
            ? 'guide'
            : governance.repairState === 'none'
              ? 'answer'
              : 'repair',
        truthDiscipline: governance.screenReferenceMode === 'avoid'
          ? 'dialogue-first'
          : governance.labelCarryAsMemory
            ? 'memory-labeled'
            : 'observe-first',
        consciousNeed: governance.answerIntent ?? governance.focusAnchor ?? '',
        consciousTension: governance.liveSurface ?? governance.carriedThread ?? '',
        speakingIntention: governance.openingMove ?? governance.answerIntent ?? '',
        focusAnchor: governance.focusAnchor ?? null,
        withheldImpulse: governance.screenReferenceMode === 'avoid'
          ? 'Do not import stale scene details into this dialogue-first turn.'
          : null,
        shouldWithholdSpecificity: governance.screenReferenceMode === 'avoid' || governance.truthState === 'uncertain',
        shouldSelfRevise: governance.repairState !== 'none',
        confidence: 0.72,
        reasonTags: ['runtime-conscious-frame'],
        updatedAt: input.now,
      },
    },
  } satisfies AlicizationDigitalLifeRuntimeSurface
}
