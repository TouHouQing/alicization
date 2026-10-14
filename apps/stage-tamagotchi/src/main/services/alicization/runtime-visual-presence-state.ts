import type {
  AlicizationMindHeadKey,
  AlicizationVisualPresenceStateSnapshot,
} from '../../../shared/eventa'
import type { LifeCommitInput, LifeCommitReceipt } from '../../../shared/life-contracts'
import type { AlicizationPerceptionState } from './attention-anchor'
import type { CardScopeOptions } from './runtime-soul'

import { createHash, randomUUID } from 'node:crypto'

import { lifeEmotionParameterVersion } from './life-appraisal-repository'

interface CreateAlicizationRuntimeVisualPresenceStateOptions {
  now: () => number
  normalizeCardId: (raw: unknown) => string
  getActiveCardId: () => string
  withCardScope: <T>(nextCardIdRaw: unknown, task: () => Promise<T>, options?: CardScopeOptions) => Promise<T>
  alicizationDb: {
    commitLifeState: (input: LifeCommitInput, options?: { signal?: AbortSignal }) => Promise<LifeCommitReceipt>
    getMetaValue: (key: string, options?: { signal?: AbortSignal }) => Promise<string | undefined>
    setMetaValue: (key: string, value: string, options?: { signal?: AbortSignal }) => Promise<void>
    upsertMindHead: (cardId: string, key: AlicizationMindHeadKey, value: unknown, options?: { signal?: AbortSignal }) => Promise<void>
  }
  perceptionStateByCard: Map<string, AlicizationPerceptionState>
  visualPresenceStateByCard: Map<string, AlicizationVisualPresenceStateSnapshot>
  visualPresenceCapturePersistMetaByCard: Map<string, {
    fingerprint: string
    persistedAt: number
  }>
  createDefaultPerceptionState: (now: number) => AlicizationPerceptionState
  normalizePerceptionState: (raw: unknown, now: number) => AlicizationPerceptionState
  createDefaultVisualPresenceState: (now: number) => AlicizationVisualPresenceStateSnapshot
  normalizeVisualPresenceState: (raw: unknown, now: number) => AlicizationVisualPresenceStateSnapshot
  buildVisualPresenceCapturePersistFingerprint: (state: AlicizationVisualPresenceStateSnapshot) => string
  emitVisualPresenceState: (cardIdRaw: unknown, state: AlicizationVisualPresenceStateSnapshot | null) => void
  perceptionMetaKey: string
  visualPresenceMetaKey: string
}

interface AlicizationVisualPresencePersistenceOptions {
  debounceWindowMs?: number
  fingerprint?: string
  signal?: AbortSignal
}

function assertVisualPresencePersistenceNotAborted(signal?: AbortSignal) {
  if (!signal?.aborted)
    return
  throw signal.reason ?? new DOMException('Visual presence persistence was aborted', 'AbortError')
}

function toComparableJsonValue(value: unknown): unknown {
  if (Array.isArray(value))
    return value.map(item => toComparableJsonValue(item))
  if (value && typeof value === 'object') {
    const comparable: Record<string, unknown> = {}
    for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right))) {
      if (nestedValue === undefined)
        continue
      comparable[key] = toComparableJsonValue(nestedValue)
    }
    return comparable
  }
  return value
}

function serializeComparableJson(value: unknown) {
  return JSON.stringify(toComparableJsonValue(value))
}

export function createAlicizationRuntimeVisualPresenceState(
  options: CreateAlicizationRuntimeVisualPresenceStateOptions,
) {
  const {
    now,
    normalizeCardId,
    getActiveCardId,
    withCardScope,
    alicizationDb,
    perceptionStateByCard,
    visualPresenceStateByCard,
    visualPresenceCapturePersistMetaByCard,
    createDefaultPerceptionState,
    normalizePerceptionState,
    createDefaultVisualPresenceState,
    normalizeVisualPresenceState,
    buildVisualPresenceCapturePersistFingerprint,
    emitVisualPresenceState,
    perceptionMetaKey,
    visualPresenceMetaKey,
  } = options
  const perceptionMutationQueueByCard = new Map<string, Promise<AlicizationPerceptionState>>()

  function rememberVisualPresencePersistMeta(cardIdRaw: unknown, state: AlicizationVisualPresenceStateSnapshot, persistedAt: number = now()) {
    const cardId = normalizeCardId(cardIdRaw)
    visualPresenceCapturePersistMetaByCard.set(cardId, {
      fingerprint: buildVisualPresenceCapturePersistFingerprint(state),
      persistedAt: Number.isFinite(persistedAt) ? Math.max(0, Math.floor(persistedAt)) : now(),
    })
  }

  async function persistPerceptionState(
    cardIdRaw: unknown,
    state: AlicizationPerceptionState,
    persistOptions: { signal?: AbortSignal } = {},
  ) {
    assertVisualPresencePersistenceNotAborted(persistOptions.signal)
    const cardId = normalizeCardId(cardIdRaw)
    if (cardId === getActiveCardId()) {
      await alicizationDb.commitLifeState({ cardId, operationKey: `perception:${randomUUID()}`, changes: [{ owner: 'cognition', key: perceptionMetaKey, value: JSON.stringify(state) }] }, persistOptions)
      assertVisualPresencePersistenceNotAborted(persistOptions.signal)
      perceptionStateByCard.set(cardId, state)
      return
    }
    await withCardScope(cardId, async () => {
      assertVisualPresencePersistenceNotAborted(persistOptions.signal)
      await alicizationDb.commitLifeState({ cardId, operationKey: `perception:${randomUUID()}`, changes: [{ owner: 'cognition', key: perceptionMetaKey, value: JSON.stringify(state) }] }, persistOptions)
      assertVisualPresencePersistenceNotAborted(persistOptions.signal)
    }, {
      label: `perception.persist:${cardId}`,
      signal: persistOptions.signal,
    })
    assertVisualPresencePersistenceNotAborted(persistOptions.signal)
    perceptionStateByCard.set(cardId, state)
  }

  async function queuePerceptionStateMutation(
    cardIdRaw: unknown,
    mutate: (current: AlicizationPerceptionState) => AlicizationPerceptionState | Promise<AlicizationPerceptionState>,
    persistOptions: { signal?: AbortSignal } = {},
  ) {
    assertVisualPresencePersistenceNotAborted(persistOptions.signal)
    const cardId = normalizeCardId(cardIdRaw)
    const previous = perceptionMutationQueueByCard.get(cardId) ?? Promise.resolve(
      perceptionStateByCard.get(cardId) ?? createDefaultPerceptionState(now()),
    )
    const run = previous
      .catch(() => perceptionStateByCard.get(cardId) ?? createDefaultPerceptionState(now()))
      .then(async () => {
        const current = await ensurePerceptionState(cardId, persistOptions)
        const next = await mutate(current)
        await persistPerceptionState(cardId, next, persistOptions)
        return next
      })
    perceptionMutationQueueByCard.set(cardId, run)
    try {
      return await run
    }
    finally {
      if (perceptionMutationQueueByCard.get(cardId) === run)
        perceptionMutationQueueByCard.delete(cardId)
    }
  }

  async function restorePerceptionState(cardIdRaw: unknown, persistOptions: { signal?: AbortSignal } = {}) {
    assertVisualPresencePersistenceNotAborted(persistOptions.signal)
    const cardId = normalizeCardId(cardIdRaw)
    const currentTs = now()
    const setState = (state: AlicizationPerceptionState) => {
      perceptionStateByCard.set(cardId, state)
      return state
    }

    if (cardId !== getActiveCardId()) {
      await withCardScope(cardId, async () => {
        const raw = await alicizationDb.getMetaValue(perceptionMetaKey, persistOptions)
        assertVisualPresencePersistenceNotAborted(persistOptions.signal)
        if (!raw) {
          setState(createDefaultPerceptionState(currentTs))
          return
        }
        try {
          setState(normalizePerceptionState(JSON.parse(raw), currentTs))
        }
        catch (error) {
          throw new Error('Persisted cognition is invalid; recovery is required', { cause: error })
        }
      }, {
        label: `perception.restore:${cardId}`,
        signal: persistOptions.signal,
      })
      assertVisualPresencePersistenceNotAborted(persistOptions.signal)
      return perceptionStateByCard.get(cardId) ?? createDefaultPerceptionState(currentTs)
    }

    const raw = await alicizationDb.getMetaValue(perceptionMetaKey, persistOptions)
    assertVisualPresencePersistenceNotAborted(persistOptions.signal)
    if (!raw)
      return setState(createDefaultPerceptionState(currentTs))
    try {
      return setState(normalizePerceptionState(JSON.parse(raw), currentTs))
    }
    catch (error) {
      throw new Error('Persisted cognition is invalid; recovery is required', { cause: error })
    }
  }

  async function ensurePerceptionState(cardIdRaw: unknown, persistOptions: { signal?: AbortSignal } = {}) {
    const cardId = normalizeCardId(cardIdRaw)
    assertVisualPresencePersistenceNotAborted(persistOptions.signal)
    const current = perceptionStateByCard.get(cardId) ?? await restorePerceptionState(cardId, persistOptions)
    const normalized = normalizePerceptionState(current, now())
    if (JSON.stringify(normalized) !== JSON.stringify(current)) {
      await persistPerceptionState(cardId, normalized, persistOptions)
      return normalized
    }
    return current
  }

  async function persistMindHeadsFromVisualState(
    cardIdRaw: unknown,
    state: AlicizationVisualPresenceStateSnapshot,
    persistOptions: { signal?: AbortSignal } = {},
  ) {
    const cardId = normalizeCardId(cardIdRaw)
    const commit = () => alicizationDb.commitLifeState({
      cardId,
      operationKey: `mind-heads:${randomUUID()}`,
      changes: [
        { owner: 'self', key: `mind-head:${cardId}:autobiographical-self`, value: JSON.stringify(state.autobiographicalSelf ?? null) },
        { owner: 'reflection', key: `mind-head:${cardId}:reflection-ledger`, value: JSON.stringify(state.reflectionLedger ?? null) },
        { owner: 'motivation', key: `mind-head:${cardId}:motive-engine`, value: JSON.stringify(state.motiveEngine ?? null) },
        { owner: 'habit', key: `mind-head:${cardId}:habit-policy`, value: JSON.stringify(state.habitPolicy ?? null) },
      ],
    }, persistOptions)
    if (cardId === getActiveCardId())
      await commit()
    else
      await withCardScope(cardId, commit, { label: `mind-heads.persist:${cardId}`, signal: persistOptions.signal })
  }
  async function persistVisualPresenceState(
    cardIdRaw: unknown,
    state: AlicizationVisualPresenceStateSnapshot,
    persistOptions: AlicizationVisualPresencePersistenceOptions = {},
  ) {
    assertVisualPresencePersistenceNotAborted(persistOptions.signal)
    const cardId = normalizeCardId(cardIdRaw)
    const previousState = visualPresenceStateByCard.get(cardId)
    const canonicalState = normalizeVisualPresenceState(
      state,
      Number.isFinite(Number(state.updatedAt)) ? Math.max(0, Math.floor(Number(state.updatedAt))) : now(),
    )
    const nextSerialized = JSON.stringify(canonicalState)
    const nextComparableSerialized = serializeComparableJson(canonicalState)
    if (previousState && serializeComparableJson(previousState) === nextComparableSerialized) {
      return
    }
    const currentTs = now()
    const emotion = canonicalState.emotionalKernel
    const transition = canonicalState.derivedMindStateBundle?.emotionalTransitionLedger
    const appraisal = emotion
      ? {
          causeKey: transition ? `transition:${transition.turnId ?? cardId}:${transition.createdAt}` : `projection:${cardId}:${createHash('sha256').update(JSON.stringify(emotion)).digest('hex')}`,
          turnId: transition?.turnId ?? null,
          occurredAt: transition?.createdAt ?? currentTs,
          parameterVersion: lifeEmotionParameterVersion,
          dimensions: { valence: emotion.valence, arousal: emotion.arousal, guardedness: emotion.guardedness, closenessDrive: emotion.closenessDrive, repairNeed: emotion.repairNeed, initiativePressure: emotion.initiativePressure },
          snapshot: { ...emotion },
          baseline: previousState?.emotionalKernel ? { ...previousState.emotionalKernel } : null,
          evidence: [],
          relationship: {
            snapshot: { relationshipModel: canonicalState.relationshipModel ?? null, personStateProjection: canonicalState.personStateProjection ?? null },
            baseline: previousState ? { relationshipModel: previousState.relationshipModel ?? null, personStateProjection: previousState.personStateProjection ?? null } : null,
          },
        }
      : null
    const commit = () => alicizationDb.commitLifeState({
      cardId,
      operationKey: `mind-state:${randomUUID()}`,
      source: 'mind-state',
      mutations: appraisal ? [{ type: 'appraisal-apply', appraisal }] : [],
      changes: [
        { owner: 'presence', key: visualPresenceMetaKey, value: nextSerialized },
        { owner: 'self', key: `mind-head:${cardId}:autobiographical-self`, value: JSON.stringify(canonicalState.autobiographicalSelf ?? null) },
        { owner: 'reflection', key: `mind-head:${cardId}:reflection-ledger`, value: JSON.stringify(canonicalState.reflectionLedger ?? null) },
        { owner: 'motivation', key: `mind-head:${cardId}:motive-engine`, value: JSON.stringify(canonicalState.motiveEngine ?? null) },
        { owner: 'habit', key: `mind-head:${cardId}:habit-policy`, value: JSON.stringify(canonicalState.habitPolicy ?? null) },
      ],
    }, { signal: persistOptions.signal })
    if (cardId === getActiveCardId())
      await commit()
    else
      await withCardScope(cardId, commit, { label: `life-state.persist:${cardId}`, signal: persistOptions.signal })
    assertVisualPresencePersistenceNotAborted(persistOptions.signal)
    visualPresenceStateByCard.set(cardId, canonicalState)
    rememberVisualPresencePersistMeta(cardId, canonicalState, currentTs)
    emitVisualPresenceState(cardId, canonicalState)
  }

  async function restoreVisualPresenceState(
    cardIdRaw: unknown,
    persistOptions: { signal?: AbortSignal } = {},
  ) {
    const cardId = normalizeCardId(cardIdRaw)
    const currentTs = now()
    const setState = (state: AlicizationVisualPresenceStateSnapshot) => {
      assertVisualPresencePersistenceNotAborted(persistOptions.signal)
      visualPresenceStateByCard.set(cardId, state)
      rememberVisualPresencePersistMeta(cardId, state, state.updatedAt)
      return state
    }

    assertVisualPresencePersistenceNotAborted(persistOptions.signal)
    if (cardId !== getActiveCardId()) {
      await withCardScope(cardId, async () => {
        const raw = await alicizationDb.getMetaValue(visualPresenceMetaKey)
        assertVisualPresencePersistenceNotAborted(persistOptions.signal)
        if (!raw) {
          setState(createDefaultVisualPresenceState(currentTs))
          return
        }
        try {
          setState(normalizeVisualPresenceState(JSON.parse(raw), currentTs))
        }
        catch (error) {
          throw new Error('Persisted life state is invalid; recovery is required', { cause: error })
        }
      }, {
        label: `visual-presence.restore:${cardId}`,
      })
      assertVisualPresencePersistenceNotAborted(persistOptions.signal)
      return visualPresenceStateByCard.get(cardId) ?? createDefaultVisualPresenceState(currentTs)
    }

    const raw = await alicizationDb.getMetaValue(visualPresenceMetaKey)
    assertVisualPresencePersistenceNotAborted(persistOptions.signal)
    if (!raw)
      return setState(createDefaultVisualPresenceState(currentTs))
    try {
      return setState(normalizeVisualPresenceState(JSON.parse(raw), currentTs))
    }
    catch (error) {
      throw new Error('Persisted life state is invalid; recovery is required', { cause: error })
    }
  }

  async function ensureVisualPresenceState(
    cardIdRaw: unknown,
    persistOptions: { signal?: AbortSignal } = {},
  ) {
    const cardId = normalizeCardId(cardIdRaw)
    assertVisualPresencePersistenceNotAborted(persistOptions.signal)
    const current = visualPresenceStateByCard.get(cardId)
      ?? await restoreVisualPresenceState(cardId, persistOptions)
    assertVisualPresencePersistenceNotAborted(persistOptions.signal)
    const normalized = normalizeVisualPresenceState(current, now())
    if (serializeComparableJson(normalized) !== serializeComparableJson(current)) {
      await persistVisualPresenceState(cardId, normalized, persistOptions)
      return normalized
    }
    return current
  }

  return {
    rememberVisualPresencePersistMeta,
    persistPerceptionState,
    queuePerceptionStateMutation,
    restorePerceptionState,
    ensurePerceptionState,
    persistMindHeadsFromVisualState,
    persistVisualPresenceState,
    restoreVisualPresenceState,
    ensureVisualPresenceState,
  }
}

export type AlicizationRuntimeVisualPresenceState = ReturnType<typeof createAlicizationRuntimeVisualPresenceState>
