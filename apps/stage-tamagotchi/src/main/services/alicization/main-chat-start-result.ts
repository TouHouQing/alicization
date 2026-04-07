import type { AlicizationChatStartResult } from '../../../shared/eventa'
import type {
  AlicizationPreparedMainChatExecutionResult,
  AlicizationPreparedMainChatPrelude,
} from './main-chat-session-runtime'

import {
  deriveAlicizationDigitalLifeSpineFromSurface,
  projectAlicizationDigitalLifeSpineDigest,
} from './digital-life-spine'

interface ResolveAlicizationMainChatStartResultOptions {
  turnId: string
  preludePromise: Promise<AlicizationPreparedMainChatPrelude>
  preparationPromise: Promise<AlicizationPreparedMainChatExecutionResult>
  eagerPreparationBudgetMs: number
  buildEmbodimentMeta: (input: {
    governance: AlicizationChatStartResult['governance']
    turnId: string
  }) => {
    embodiment: AlicizationChatStartResult['embodiment']
    speechTimeline: AlicizationChatStartResult['speechTimeline']
    digitalLife: AlicizationChatStartResult['digitalLife']
  }
  setTimeoutImpl?: typeof setTimeout
  clearTimeoutImpl?: typeof clearTimeout
}

async function raceAlicizationMainChatPreparation(
  input: Pick<
    ResolveAlicizationMainChatStartResultOptions,
    'preparationPromise' | 'eagerPreparationBudgetMs' | 'setTimeoutImpl' | 'clearTimeoutImpl'
  >,
) {
  const setTimeoutImpl = input.setTimeoutImpl ?? setTimeout
  const clearTimeoutImpl = input.clearTimeoutImpl ?? clearTimeout

  return await new Promise<
    | {
      stage: 'prepared'
      governance: AlicizationChatStartResult['governance']
      digitalLifeSpine: AlicizationChatStartResult['digitalLifeSpine']
    }
    | { stage: 'failed', governance: null }
    | { stage: 'timeout', governance: null }
  >((resolve) => {
    const timer = setTimeoutImpl(() => resolve({
      stage: 'timeout',
      governance: null,
    }), Math.max(0, input.eagerPreparationBudgetMs))

    void input.preparationPromise
      .then(result => resolve({
        stage: 'prepared',
        governance: result.governance ?? null,
        digitalLifeSpine: projectAlicizationDigitalLifeSpineDigest(
          result.runtimeSurface?.digitalLifeSpine ?? null,
        ),
      }))
      .catch(() => resolve({
        stage: 'failed',
        governance: null,
      }))
      .finally(() => clearTimeoutImpl(timer))
  })
}

export async function resolveAlicizationMainChatStartResult(
  input: ResolveAlicizationMainChatStartResultOptions,
): Promise<AlicizationChatStartResult> {
  let eagerPreludeGovernance: AlicizationChatStartResult['governance'] = null
  let eagerPreludeDigitalLifeSpine: AlicizationChatStartResult['digitalLifeSpine'] = null
  let eagerPreludeSettled = false
  void input.preludePromise
    .then((result) => {
      eagerPreludeGovernance = result.perceptionAugmentation.chatGovernance.mindTurnGovernance ?? null
      eagerPreludeDigitalLifeSpine = result.perceptionAugmentation.digitalLifeRuntimeSurface
        ? projectAlicizationDigitalLifeSpineDigest(
            deriveAlicizationDigitalLifeSpineFromSurface(result.perceptionAugmentation.digitalLifeRuntimeSurface),
          )
        : null
      eagerPreludeSettled = true
    })
    .catch(() => {
      eagerPreludeSettled = true
    })

  const eagerPreparation = await raceAlicizationMainChatPreparation(input)
  const eagerGovernance = eagerPreparation.stage === 'prepared'
    ? eagerPreparation.governance
    : eagerPreludeSettled
      ? eagerPreludeGovernance
      : null
  const eagerDigitalLifeSpine = eagerPreparation.stage === 'prepared'
    ? eagerPreparation.digitalLifeSpine
    : eagerPreludeSettled
      ? eagerPreludeDigitalLifeSpine
      : null
  const eagerEmbodimentMeta = input.buildEmbodimentMeta({
    governance: eagerGovernance,
    turnId: input.turnId,
  })

  return {
    accepted: true,
    turnId: input.turnId,
    state: 'accepted',
    governance: eagerGovernance,
    embodiment: eagerEmbodimentMeta.embodiment,
    speechTimeline: eagerEmbodimentMeta.speechTimeline,
    digitalLife: eagerEmbodimentMeta.digitalLife,
    digitalLifeSpine: eagerDigitalLifeSpine,
  }
}
