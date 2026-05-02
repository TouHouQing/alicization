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
    setMetaValue: (key: string, value: string) => Promise<void>
    upsertMindHead: (cardId: string, key: AlicizationMindHeadKey, value: unknown) => Promise<void>
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

  async function persistMindHeadsFromVisualState(cardIdRaw: unknown, state: AlicizationVisualPresenceStateSnapshot) {
    const cardId = normalizeCardId(cardIdRaw)
    const task = async () => {
      await alicizationDb.upsertMindHead(cardId, 'autobiographical-self', state.autobiographicalSelf ?? null)
      await alicizationDb.upsertMindHead(cardId, 'reflection-ledger', state.reflectionLedger ?? null)
      await alicizationDb.upsertMindHead(cardId, 'motive-engine', state.motiveEngine ?? null)
      await alicizationDb.upsertMindHead(cardId, 'habit-policy', state.habitPolicy ?? null)
    }

    if (cardId === getActiveCardId()) {
      await task().catch(() => {})
      return
    }

    await withCardScope(cardId, async () => {
      await task().catch(() => {})
    }, {
      label: `mind-heads.persist:${cardId}`,
    })
  }

  async function persistVisualPresenceState(
    cardIdRaw: unknown,
    state: AlicizationVisualPresenceStateSnapshot,
    persistOptions: {
      debounceWindowMs?: number
      fingerprint?: string
    } = {},
  ) {
    const cardId = normalizeCardId(cardIdRaw)
    visualPresenceStateByCard.set(cardId, state)
    const fingerprint = persistOptions.fingerprint ?? buildVisualPresenceCapturePersistFingerprint(state)
    const debounceWindowMs = Number.isFinite(persistOptions.debounceWindowMs) ? Math.max(0, Math.floor(persistOptions.debounceWindowMs!)) : 0
    const previousPersistMeta = visualPresenceCapturePersistMetaByCard.get(cardId)
    const currentTs = now()
    if (
      debounceWindowMs > 0
      && previousPersistMeta?.fingerprint === fingerprint
      && currentTs - previousPersistMeta.persistedAt < debounceWindowMs
    ) {
      return
    }

    rememberVisualPresencePersistMeta(cardId, state, currentTs)
    await persistMindHeadsFromVisualState(cardId, state)
    if (cardId === getActiveCardId()) {
      await alicizationDb.setMetaValue(visualPresenceMetaKey, JSON.stringify(state)).catch(() => {})
      emitVisualPresenceState(cardId, state)
      return
    }
    await withCardScope(cardId, async () => {
      await alicizationDb.setMetaValue(visualPresenceMetaKey, JSON.stringify(state)).catch(() => {})
    }, {
      label: `visual-presence.persist:${cardId}`,
    })
    emitVisualPresenceState(cardId, state)
  }

  async function restoreVisualPresenceState(cardIdRaw: unknown) {
    const cardId = normalizeCardId(cardIdRaw)
    const currentTs = now()
    const setState = (state: AlicizationVisualPresenceStateSnapshot) => {
      visualPresenceStateByCard.set(cardId, state)
      rememberVisualPresencePersistMeta(cardId, state, state.updatedAt)
      return state
    }

    if (cardId !== getActiveCardId()) {
      await withCardScope(cardId, async () => {
        const raw = await alicizationDb.getMetaValue(visualPresenceMetaKey).catch(() => undefined)
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
      return visualPresenceStateByCard.get(cardId) ?? createDefaultVisualPresenceState(currentTs)
    }

    const raw = await alicizationDb.getMetaValue(visualPresenceMetaKey).catch(() => undefined)
    if (!raw)
      return setState(createDefaultVisualPresenceState(currentTs))
    try {
      return setState(normalizeVisualPresenceState(JSON.parse(raw), currentTs))
    }
    catch {
      return setState(createDefaultVisualPresenceState(currentTs))
    }
  }

  async function ensureVisualPresenceState(cardIdRaw: unknown) {
    const cardId = normalizeCardId(cardIdRaw)
    const current = visualPresenceStateByCard.get(cardId) ?? await restoreVisualPresenceState(cardId)
    const normalized = normalizeVisualPresenceState(current, now())
    if (JSON.stringify(normalized) !== JSON.stringify(current)) {
      await persistVisualPresenceState(cardId, normalized)
      return normalized
    }
    return current
  }

  return {
    rememberVisualPresencePersistMeta,
    persistPerceptionState,
    restorePerceptionState,
    ensurePerceptionState,
    persistMindHeadsFromVisualState,
    persistVisualPresenceState,
    restoreVisualPresenceState,
    ensureVisualPresenceState,
  }
}

export type AlicizationRuntimeVisualPresenceState = ReturnType<typeof createAlicizationRuntimeVisualPresenceState>
