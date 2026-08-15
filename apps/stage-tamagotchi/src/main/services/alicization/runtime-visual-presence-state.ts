import type {
  AlicizationMindHeadKey,
  AlicizationVisualPresenceStateSnapshot,
} from '../../../shared/eventa'
import type { AlicizationPerceptionState } from './attention-anchor'
import type { CardScopeOptions } from './runtime-soul'

interface CreateAlicizationRuntimeVisualPresenceStateOptions {
  now: () => number
  normalizeCardId: (raw: unknown) => string
  getActiveCardId: () => string
  withCardScope: <T>(nextCardIdRaw: unknown, task: () => Promise<T>, options?: CardScopeOptions) => Promise<T>
  alicizationDb: {
    getMetaValue: (key: string) => Promise<string | undefined>
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

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === 'AbortError'
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

  async function persistPerceptionState(cardIdRaw: unknown, state: AlicizationPerceptionState) {
    const cardId = normalizeCardId(cardIdRaw)
    perceptionStateByCard.set(cardId, state)
    if (cardId === getActiveCardId()) {
      await alicizationDb.setMetaValue(perceptionMetaKey, JSON.stringify(state)).catch(() => {})
      return
    }
    await withCardScope(cardId, async () => {
      await alicizationDb.setMetaValue(perceptionMetaKey, JSON.stringify(state)).catch(() => {})
    }, {
      label: `perception.persist:${cardId}`,
    })
  }

  async function queuePerceptionStateMutation(
    cardIdRaw: unknown,
    mutate: (current: AlicizationPerceptionState) => AlicizationPerceptionState | Promise<AlicizationPerceptionState>,
  ) {
    const cardId = normalizeCardId(cardIdRaw)
    const previous = perceptionMutationQueueByCard.get(cardId) ?? Promise.resolve(
      perceptionStateByCard.get(cardId) ?? createDefaultPerceptionState(now()),
    )
    const run = previous
      .catch(() => perceptionStateByCard.get(cardId) ?? createDefaultPerceptionState(now()))
      .then(async () => {
        const current = await ensurePerceptionState(cardId)
        const next = await mutate(current)
        await persistPerceptionState(cardId, next)
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

  async function restorePerceptionState(cardIdRaw: unknown) {
    const cardId = normalizeCardId(cardIdRaw)
    const currentTs = now()
    const setState = (state: AlicizationPerceptionState) => {
      perceptionStateByCard.set(cardId, state)
      return state
    }

    if (cardId !== getActiveCardId()) {
      await withCardScope(cardId, async () => {
        const raw = await alicizationDb.getMetaValue(perceptionMetaKey).catch(() => undefined)
        if (!raw) {
          setState(createDefaultPerceptionState(currentTs))
          return
        }
        try {
          setState(normalizePerceptionState(JSON.parse(raw), currentTs))
        }
        catch {
          setState(createDefaultPerceptionState(currentTs))
        }
      }, {
        label: `perception.restore:${cardId}`,
      })
      return perceptionStateByCard.get(cardId) ?? createDefaultPerceptionState(currentTs)
    }

    const raw = await alicizationDb.getMetaValue(perceptionMetaKey).catch(() => undefined)
    if (!raw)
      return setState(createDefaultPerceptionState(currentTs))
    try {
      return setState(normalizePerceptionState(JSON.parse(raw), currentTs))
    }
    catch {
      return setState(createDefaultPerceptionState(currentTs))
    }
  }

  async function ensurePerceptionState(cardIdRaw: unknown) {
    const cardId = normalizeCardId(cardIdRaw)
    const current = perceptionStateByCard.get(cardId) ?? await restorePerceptionState(cardId)
    const normalized = normalizePerceptionState(current, now())
    if (JSON.stringify(normalized) !== JSON.stringify(current)) {
      await persistPerceptionState(cardId, normalized)
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
    const task = async () => {
      const mindHeads: Array<[AlicizationMindHeadKey, unknown]> = [
        ['autobiographical-self', state.autobiographicalSelf ?? null],
        ['reflection-ledger', state.reflectionLedger ?? null],
        ['motive-engine', state.motiveEngine ?? null],
        ['habit-policy', state.habitPolicy ?? null],
      ]
      for (const [key, value] of mindHeads) {
        assertVisualPresencePersistenceNotAborted(persistOptions.signal)
        await alicizationDb.upsertMindHead(cardId, key, value, {
          signal: persistOptions.signal,
        })
        assertVisualPresencePersistenceNotAborted(persistOptions.signal)
      }
    }

    if (cardId === getActiveCardId()) {
      try {
        await task()
      }
      catch (error) {
        if (persistOptions.signal?.aborted || isAbortError(error))
          throw persistOptions.signal?.reason ?? error
      }
      return
    }

    await withCardScope(cardId, async () => {
      try {
        await task()
      }
      catch (error) {
        if (persistOptions.signal?.aborted || isAbortError(error))
          throw persistOptions.signal?.reason ?? error
      }
    }, {
      label: `mind-heads.persist:${cardId}`,
    })
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
    const fingerprint = persistOptions.fingerprint ?? buildVisualPresenceCapturePersistFingerprint(canonicalState)
    const debounceWindowMs = Number.isFinite(persistOptions.debounceWindowMs) ? Math.max(0, Math.floor(persistOptions.debounceWindowMs!)) : 0
    const previousPersistMeta = visualPresenceCapturePersistMetaByCard.get(cardId)
    const currentTs = now()
    if (
      debounceWindowMs > 0
      && previousPersistMeta?.fingerprint === fingerprint
      && currentTs - previousPersistMeta.persistedAt < debounceWindowMs
    ) {
      assertVisualPresencePersistenceNotAborted(persistOptions.signal)
      visualPresenceStateByCard.set(cardId, canonicalState)
      return
    }

    await persistMindHeadsFromVisualState(cardId, canonicalState, {
      signal: persistOptions.signal,
    })
    assertVisualPresencePersistenceNotAborted(persistOptions.signal)
    if (cardId === getActiveCardId()) {
      try {
        await alicizationDb.setMetaValue(visualPresenceMetaKey, nextSerialized, {
          signal: persistOptions.signal,
        })
      }
      catch (error) {
        if (persistOptions.signal?.aborted || isAbortError(error))
          throw persistOptions.signal?.reason ?? error
      }
    }
    else {
      await withCardScope(cardId, async () => {
        assertVisualPresencePersistenceNotAborted(persistOptions.signal)
        try {
          await alicizationDb.setMetaValue(visualPresenceMetaKey, nextSerialized, {
            signal: persistOptions.signal,
          })
        }
        catch (error) {
          if (persistOptions.signal?.aborted || isAbortError(error))
            throw persistOptions.signal?.reason ?? error
        }
      }, {
        label: `visual-presence.persist:${cardId}`,
      })
    }
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
        const raw = await alicizationDb.getMetaValue(visualPresenceMetaKey).catch(() => undefined)
        assertVisualPresencePersistenceNotAborted(persistOptions.signal)
        if (!raw) {
          setState(createDefaultVisualPresenceState(currentTs))
          return
        }
        try {
          setState(normalizeVisualPresenceState(JSON.parse(raw), currentTs))
        }
        catch {
          setState(createDefaultVisualPresenceState(currentTs))
        }
      }, {
        label: `visual-presence.restore:${cardId}`,
      })
      assertVisualPresencePersistenceNotAborted(persistOptions.signal)
      return visualPresenceStateByCard.get(cardId) ?? createDefaultVisualPresenceState(currentTs)
    }

    const raw = await alicizationDb.getMetaValue(visualPresenceMetaKey).catch(() => undefined)
    assertVisualPresencePersistenceNotAborted(persistOptions.signal)
    if (!raw)
      return setState(createDefaultVisualPresenceState(currentTs))
    try {
      return setState(normalizeVisualPresenceState(JSON.parse(raw), currentTs))
    }
    catch {
      return setState(createDefaultVisualPresenceState(currentTs))
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
