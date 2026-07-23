import type {
  AlicizationChatMetaEvent,
  AlicizationChatStartResult,
} from '../../../shared/eventa'
import type {
  AlicizationPreparedMainChatExecutionResult,
  AlicizationPreparedMainChatPrelude,
} from './main-chat-session-runtime'

import {
  deriveAlicizationDigitalLifeSpineFromSurface,
  projectAlicizationDigitalLifeSpineDigest,
} from './digital-life-spine'
import {
  buildAlicizationChatMetaPayload,
  sanitizeAlicizationRuntimeDigestForTransport,
} from './main-chat-stream-meta'

type AlicizationMainChatStartGovernance = AlicizationChatMetaEvent['governance']

interface ResolveAlicizationMainChatStartResultOptions {
  cardId: string
  turnId: string
  preludePromise: Promise<AlicizationPreparedMainChatPrelude>
  preparationPromise: Promise<AlicizationPreparedMainChatExecutionResult>
  eagerPreparationBudgetMs: number
  buildEmbodimentMeta: (input: {
    governance: AlicizationMainChatStartGovernance
    digitalLifeSpine: AlicizationChatStartResult['digitalLifeSpine']
    turnId: string
  }) => {
    embodiment: AlicizationChatStartResult['embodiment']
    embodimentScript: AlicizationChatStartResult['embodimentScript']
    speechTimeline: AlicizationChatStartResult['speechTimeline']
    digitalLife: AlicizationChatStartResult['digitalLife']
  }
  setTimeoutImpl?: typeof setTimeout
  clearTimeoutImpl?: typeof clearTimeout
}

type AlicizationMainChatStartRuntimeSurface
  = | AlicizationPreparedMainChatExecutionResult['runtimeSurface']['digitalLifeRuntimeSurface']
    | AlicizationPreparedMainChatPrelude['perceptionAugmentation']['digitalLifeRuntimeSurface']

function resolveMainChatStartRuntimeDigest(
  runtimeSurface: AlicizationMainChatStartRuntimeSurface | null | undefined,
): AlicizationChatStartResult['runtimeDigest'] {
  if (!runtimeSurface)
    return null

  return sanitizeAlicizationRuntimeDigestForTransport(
    runtimeSurface.raw?.runtimeDigest
    ?? runtimeSurface.cognition?.runtimeDigest
    ?? null,
  )
}

function hasUsableMainChatStartRuntimeSurface(
  runtimeSurface: AlicizationPreparedMainChatExecutionResult['runtimeSurface']['digitalLifeRuntimeSurface'] | null | undefined,
) {
  return Boolean(
    runtimeSurface?.perception
    && runtimeSurface?.world
    && runtimeSurface?.cognition
    && runtimeSurface?.memory
    && runtimeSurface?.dialogue
    && runtimeSurface?.agency,
  )
}

function isThinPreparedStartSpine(
  digitalLifeSpine: AlicizationPreparedMainChatExecutionResult['runtimeSurface']['digitalLifeSpine'] | null | undefined,
) {
  return Boolean(
    digitalLifeSpine?.runtimeSurface
    && !hasUsableMainChatStartRuntimeSurface(
      digitalLifeSpine.runtimeSurface as AlicizationPreparedMainChatExecutionResult['runtimeSurface']['digitalLifeRuntimeSurface'],
    ),
  )
}

function resolveMainChatStartDigitalLifeSpineDigest(input: {
  digitalLifeSpine?: AlicizationPreparedMainChatExecutionResult['runtimeSurface']['digitalLifeSpine'] | null
  digitalLifeRuntimeSurface?: AlicizationPreparedMainChatExecutionResult['runtimeSurface']['digitalLifeRuntimeSurface'] | null
}) {
  if (input.digitalLifeSpine && !isThinPreparedStartSpine(input.digitalLifeSpine)) {
    try {
      return projectAlicizationDigitalLifeSpineDigest(input.digitalLifeSpine)
    }
    catch {
    }
  }

  if (input.digitalLifeRuntimeSurface) {
    try {
      return projectAlicizationDigitalLifeSpineDigest(
        deriveAlicizationDigitalLifeSpineFromSurface(input.digitalLifeRuntimeSurface),
      )
    }
    catch {
    }
  }

  return null
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
      governance: AlicizationMainChatStartGovernance
      digitalLifeSpine: AlicizationChatStartResult['digitalLifeSpine']
      runtimeDigest: AlicizationChatStartResult['runtimeDigest']
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
        digitalLifeSpine: resolveMainChatStartDigitalLifeSpineDigest({
          digitalLifeSpine: result.runtimeSurface?.digitalLifeSpine ?? null,
          digitalLifeRuntimeSurface: result.runtimeSurface?.digitalLifeRuntimeSurface ?? null,
        }),
        runtimeDigest: resolveMainChatStartRuntimeDigest(
          result.runtimeSurface?.digitalLifeRuntimeSurface ?? null,
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
  let eagerPreludeGovernance: AlicizationMainChatStartGovernance = null
  let eagerPreludeDigitalLifeSpine: AlicizationChatStartResult['digitalLifeSpine'] = null
  let eagerPreludeRuntimeDigest: AlicizationChatStartResult['runtimeDigest'] = null
  let eagerPreludeSettled = false

  void input.preludePromise
    .then((result) => {
      eagerPreludeGovernance = result.perceptionAugmentation.chatGovernance.mindTurnGovernance ?? null
      eagerPreludeDigitalLifeSpine = resolveMainChatStartDigitalLifeSpineDigest({
        digitalLifeSpine: null,
        digitalLifeRuntimeSurface: result.perceptionAugmentation.digitalLifeRuntimeSurface ?? null,
      })
      eagerPreludeRuntimeDigest = resolveMainChatStartRuntimeDigest(
        result.perceptionAugmentation.digitalLifeRuntimeSurface ?? null,
      )
      eagerPreludeSettled = true
    })
    .catch(() => {
      eagerPreludeSettled = true
    })

  const eagerPreparation = await raceAlicizationMainChatPreparation(input)
  const prepared = eagerPreparation.stage === 'prepared'
  const eagerGovernance = prepared
    ? eagerPreparation.governance
    : eagerPreludeSettled
      ? eagerPreludeGovernance
      : null
  const eagerDigitalLifeSpine = prepared
    ? eagerPreparation.digitalLifeSpine
    : eagerPreludeSettled
      ? eagerPreludeDigitalLifeSpine
      : null
  const eagerRuntimeDigest = prepared
    ? eagerPreparation.runtimeDigest
    : eagerPreludeSettled
      ? eagerPreludeRuntimeDigest
      : null
  const transportSeed = buildAlicizationChatMetaPayload({
    cardId: input.cardId,
    turnId: input.turnId,
    governance: eagerGovernance,
    embodiment: null,
    embodimentScript: null,
    speechTimeline: null,
    digitalLife: null,
    digitalLifeSpine: eagerDigitalLifeSpine,
    runtimeDigest: eagerRuntimeDigest,
  })
  const eagerEmbodimentMeta = input.buildEmbodimentMeta({
    governance: transportSeed.governance,
    digitalLifeSpine: transportSeed.digitalLifeSpine,
    turnId: input.turnId,
  })
  const transportMeta = buildAlicizationChatMetaPayload({
    cardId: input.cardId,
    turnId: input.turnId,
    governance: transportSeed.governance,
    embodiment: eagerEmbodimentMeta.embodiment,
    embodimentScript: eagerEmbodimentMeta.embodimentScript,
    speechTimeline: eagerEmbodimentMeta.speechTimeline,
    digitalLife: eagerEmbodimentMeta.digitalLife,
    digitalLifeSpine: transportSeed.digitalLifeSpine,
    runtimeDigest: transportSeed.runtimeDigest,
  })

  return {
    accepted: true,
    turnId: input.turnId,
    state: 'accepted',
    governance: transportMeta.governance,
    embodiment: transportMeta.embodiment,
    embodimentScript: transportMeta.embodimentScript,
    speechTimeline: transportMeta.speechTimeline,
    digitalLife: transportMeta.digitalLife,
    digitalLifeSpine: transportMeta.digitalLifeSpine,
    runtimeDigest: transportMeta.runtimeDigest,
  }
}
