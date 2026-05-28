import type {
  AlicizationVisualPresenceStateSnapshot,
  AlicizationPresencePulsePayload,
} from './alicization-bridge'

export function createAlicizationBrowserBridgePresenceComposition(input: {
  now: () => number
  normalizeCardId: (raw?: unknown) => string
  resolveActiveCardId: () => string
  visualPresencePulseListeners: Set<(payload: AlicizationPresencePulsePayload) => void>
  visualPresenceStateListeners: Set<(state: AlicizationVisualPresenceStateSnapshot | null) => void>
  ensureAlicizationVisualPresenceResidentPerformance: (state: AlicizationVisualPresenceStateSnapshot) => AlicizationVisualPresenceStateSnapshot
  writeVisualPresenceState: (cardId: string, state: AlicizationVisualPresenceStateSnapshot) => Promise<void>
  readVisualPresenceState: (cardId: string) => Promise<AlicizationVisualPresenceStateSnapshot | null>
  buildBrowserOrganicMemorySnapshot: (cardId: string) => Promise<any>
  readProactiveLoopState: (cardId: string) => Promise<any>
  readConversationTurns: (cardId: string) => Promise<any[]>
  readActiveSessionId: (cardId: string) => Promise<string | null | undefined>
  buildBrowserSessionContinuitySummary: (input: {
    turns: any[]
    activeSessionId: string
    recollectionForeground: any
  }) => any
  deriveBrowserProactiveFeedbackSummary: (state: any) => any
  buildBrowserFallbackDigitalLifeSpineDigest: (input: any) => any
  buildAlicizationVisualPresenceStateFromSpineDigest: (input: {
    digest: any
    snapshot: any
    previous?: AlicizationVisualPresenceStateSnapshot | null
  }) => AlicizationVisualPresenceStateSnapshot
  buildSensorySnapshot: (runtime: any) => Promise<any>
}) {
  function buildVisualPresencePulsePayload(state: AlicizationVisualPresenceStateSnapshot): AlicizationPresencePulsePayload | null {
    const privateThought = state.privateThought
    const currentScene = state.currentScene
    if (!privateThought || privateThought.embodiedPresence === 'none' || !currentScene)
      return null

    return {
      watchMode: state.watchMode,
      embodiedPresence: privateThought.embodiedPresence,
      scenario: currentScene.scenario,
      stance: privateThought.stance,
      currentBodyState: state.currentBodyState,
      continuityMode: state.continuityMode,
      quietLineMs: state.quietLineMs,
      currentInwardPreoccupation: state.currentInwardPreoccupation,
      confidence: privateThought.confidence,
      reasonTags: [...privateThought.rationaleTags],
      emotionalTension: privateThought.emotionalTension,
      expiresAt: privateThought.expiresAt,
    }
  }

  function emitVisualPresenceState(cardIdRaw: unknown, state: AlicizationVisualPresenceStateSnapshot | null) {
    const cardId = input.normalizeCardId(cardIdRaw)
    if (cardId !== input.resolveActiveCardId())
      return

    for (const listener of input.visualPresenceStateListeners)
      listener(state)
  }

  function emitVisualPresencePulse(cardIdRaw: unknown, state: AlicizationVisualPresenceStateSnapshot | null) {
    const cardId = input.normalizeCardId(cardIdRaw)
    if (cardId !== input.resolveActiveCardId() || !state)
      return

    const payload = buildVisualPresencePulsePayload(state)
    if (!payload || payload.expiresAt <= input.now())
      return

    for (const listener of input.visualPresencePulseListeners)
      listener(payload)
  }

  async function persistVisualPresenceState(cardId: string, state: AlicizationVisualPresenceStateSnapshot) {
    const normalizedState = input.ensureAlicizationVisualPresenceResidentPerformance(state)
    await input.writeVisualPresenceState(cardId, normalizedState)
    emitVisualPresenceState(cardId, normalizedState)
    emitVisualPresencePulse(cardId, normalizedState)
  }

  async function syncBrowserFallbackVisualPresenceFromLocalMemory(
    cardId: string,
    runtime: any,
    previous?: AlicizationVisualPresenceStateSnapshot | null,
  ) {
    const [snapshot, organicMemorySnapshot, proactiveLoopState, turns, activeSessionId] = await Promise.all([
      input.buildSensorySnapshot(runtime),
      input.buildBrowserOrganicMemorySnapshot(cardId),
      input.readProactiveLoopState(cardId),
      input.readConversationTurns(cardId),
      input.readActiveSessionId(cardId),
    ])
    const sessionContinuity = input.buildBrowserSessionContinuitySummary({
      turns,
      activeSessionId: activeSessionId ?? '',
      recollectionForeground: organicMemorySnapshot.recollectionForeground ?? null,
    })
    const proactiveFeedback = input.deriveBrowserProactiveFeedbackSummary(proactiveLoopState)
    const digest = input.buildBrowserFallbackDigitalLifeSpineDigest({
      now: input.now,
      snapshot,
      organicMemorySnapshot,
      sessionContinuity,
      proactiveFeedback,
    })
    await persistVisualPresenceState(cardId, input.buildAlicizationVisualPresenceStateFromSpineDigest({
      digest,
      snapshot,
      previous: previous ?? (await input.readVisualPresenceState(cardId)),
    }))
  }

  async function persistVisualPresencePulseFromStreamMeta(inputMeta: {
    cardId: string
    runtime: any
    event: { digitalLifeSpine?: any }
  }) {
    const existing = await input.readVisualPresenceState(inputMeta.cardId)
    const digest = inputMeta.event.digitalLifeSpine ?? null
    if (digest) {
      const sensory = await input.buildSensorySnapshot(inputMeta.runtime)
      await persistVisualPresenceState(inputMeta.cardId, input.buildAlicizationVisualPresenceStateFromSpineDigest({
        digest,
        snapshot: sensory,
        previous: existing,
      }))
      return
    }

    await syncBrowserFallbackVisualPresenceFromLocalMemory(inputMeta.cardId, inputMeta.runtime, existing)
  }

  return {
    buildVisualPresencePulsePayload,
    emitVisualPresenceState,
    emitVisualPresencePulse,
    persistVisualPresenceState,
    persistVisualPresencePulseFromStreamMeta,
    syncBrowserFallbackVisualPresenceFromLocalMemory,
  }
}
