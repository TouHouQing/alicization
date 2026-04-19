import type { AlicizationProactiveFeedbackKind, AlicizationProactiveScenario } from '../../../shared/eventa'

const proactiveScenarioKeys = ['coding', 'media', 'late-night-care', 'general'] as const satisfies AlicizationProactiveScenario[]

export const proactiveDismissCooldownMs = 30 * 60_000
export const proactiveReplyWindowMs = 120_000
export const proactiveImplicitIgnoredAfterMs = 10 * 60_000

export type AlicizationProactiveOutcome = 'positive' | 'dismiss' | 'ignored' | 'reply-within-120s'

export interface AlicizationRecentProactiveOutcome {
  turnId: string
  scenario: AlicizationProactiveScenario
  outcome: AlicizationProactiveOutcome
  createdAt: number
}

export interface AlicizationPendingProactiveOutcome {
  turnId: string
  scenario: AlicizationProactiveScenario
  deliveredAt: number
  feedbackWindowMs: number
}

export interface AlicizationProactiveLoopState {
  globalCooldownUntil: number
  scenarioBias: Record<AlicizationProactiveScenario, number>
  consecutiveIgnored: Record<AlicizationProactiveScenario, number>
  initiativeTrust: number
  openingMomentum: number
  lastProactiveTurnAt: number | null
  lateNightActivityStartedAt: number | null
  lateNightActivityLastActiveAt: number | null
  pendingOutcomes: AlicizationPendingProactiveOutcome[]
  recentOutcomes: AlicizationRecentProactiveOutcome[]
  updatedAt: number
}

export interface AlicizationProactiveLoopMutationResult {
  state: AlicizationProactiveLoopState
  appliedOutcomes: AlicizationRecentProactiveOutcome[]
}

function clampBias(value: number) {
  if (!Number.isFinite(value))
    return 0
  return Math.max(-0.15, Math.min(0.75, Number(value.toFixed(2))))
}

function clamp01(value: number) {
  if (!Number.isFinite(value))
    return 0
  return Math.max(0, Math.min(1, Number(value.toFixed(2))))
}

function createScenarioNumberMap(initial = 0) {
  return Object.fromEntries(
    proactiveScenarioKeys.map(key => [key, initial]),
  ) as Record<AlicizationProactiveScenario, number>
}

function normalizePendingOutcome(raw: unknown): AlicizationPendingProactiveOutcome | null {
  const candidate = raw && typeof raw === 'object' ? raw as Record<string, unknown> : null
  const turnId = typeof candidate?.turnId === 'string' ? candidate.turnId.trim() : ''
  const scenario = proactiveScenarioKeys.find(key => key === candidate?.scenario)
  const deliveredAt = Number(candidate?.deliveredAt)
  const feedbackWindowMs = Number(candidate?.feedbackWindowMs)
  if (!turnId || !scenario || !Number.isFinite(deliveredAt) || !Number.isFinite(feedbackWindowMs))
    return null

  return {
    turnId,
    scenario,
    deliveredAt: Math.max(0, Math.floor(deliveredAt)),
    feedbackWindowMs: Math.max(1_000, Math.floor(feedbackWindowMs)),
  }
}

function normalizeRecentOutcome(raw: unknown): AlicizationRecentProactiveOutcome | null {
  const candidate = raw && typeof raw === 'object' ? raw as Record<string, unknown> : null
  const turnId = typeof candidate?.turnId === 'string' ? candidate.turnId.trim() : ''
  const scenario = proactiveScenarioKeys.find(key => key === candidate?.scenario)
  const createdAt = Number(candidate?.createdAt)
  const outcome = candidate?.outcome
  if (
    !turnId
    || !scenario
    || !Number.isFinite(createdAt)
    || (outcome !== 'positive' && outcome !== 'dismiss' && outcome !== 'ignored' && outcome !== 'reply-within-120s')
  ) {
    return null
  }

  return {
    turnId,
    scenario,
    outcome,
    createdAt: Math.max(0, Math.floor(createdAt)),
  }
}

function normalizeScenarioNumberMap(raw: unknown) {
  const source = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {}
  const next = createScenarioNumberMap(0)
  for (const scenario of proactiveScenarioKeys)
    next[scenario] = Number.isFinite(Number(source[scenario])) ? Number(source[scenario]) : next[scenario]
  return next
}

function trimRecentOutcomes(outcomes: AlicizationRecentProactiveOutcome[]) {
  return outcomes
    .slice(-16)
    .sort((left, right) => left.createdAt - right.createdAt)
}

function applyOutcome(
  current: AlicizationProactiveLoopState,
  entry: AlicizationPendingProactiveOutcome,
  outcome: AlicizationProactiveOutcome,
  at: number,
) {
  const nextScenarioBias = { ...current.scenarioBias }
  const nextConsecutiveIgnored = { ...current.consecutiveIgnored }

  if (outcome === 'positive' || outcome === 'reply-within-120s') {
    nextScenarioBias[entry.scenario] = clampBias(nextScenarioBias[entry.scenario] - 0.05)
    nextConsecutiveIgnored[entry.scenario] = 0
  }

  if (outcome === 'dismiss') {
    nextScenarioBias[entry.scenario] = clampBias(nextScenarioBias[entry.scenario] + 0.15)
    nextConsecutiveIgnored[entry.scenario] = 0
  }

  if (outcome === 'ignored') {
    const nextIgnoredCount = nextConsecutiveIgnored[entry.scenario] + 1
    nextConsecutiveIgnored[entry.scenario] = nextIgnoredCount
    if (nextIgnoredCount >= 3)
      nextScenarioBias[entry.scenario] = clampBias(nextScenarioBias[entry.scenario] + 0.10)
  }

  const nextOutcome: AlicizationRecentProactiveOutcome = {
    turnId: entry.turnId,
    scenario: entry.scenario,
    outcome,
    createdAt: at,
  }

  return {
    state: {
      ...current,
      globalCooldownUntil: outcome === 'dismiss'
        ? Math.max(current.globalCooldownUntil, at + proactiveDismissCooldownMs)
        : current.globalCooldownUntil,
      scenarioBias: nextScenarioBias,
      consecutiveIgnored: nextConsecutiveIgnored,
      initiativeTrust: clamp01(
        current.initiativeTrust
        + (outcome === 'positive' ? 0.08 : 0)
        + (outcome === 'reply-within-120s' ? 0.04 : 0)
        - (outcome === 'dismiss' ? 0.12 : 0)
        - (outcome === 'ignored' ? 0.06 : 0),
      ),
      openingMomentum: clamp01(
        current.openingMomentum
        * (outcome === 'dismiss' ? 0.42 : outcome === 'ignored' ? 0.68 : 0.74),
      ),
      recentOutcomes: trimRecentOutcomes([...current.recentOutcomes, nextOutcome]),
      updatedAt: at,
    },
    outcome: nextOutcome,
  }
}

export function createDefaultProactiveLoopState(now = Date.now()): AlicizationProactiveLoopState {
  return {
    globalCooldownUntil: 0,
    scenarioBias: createScenarioNumberMap(0),
    consecutiveIgnored: createScenarioNumberMap(0),
    initiativeTrust: 0.5,
    openingMomentum: 0,
    lastProactiveTurnAt: null,
    lateNightActivityStartedAt: null,
    lateNightActivityLastActiveAt: null,
    pendingOutcomes: [],
    recentOutcomes: [],
    updatedAt: now,
  }
}

export function normalizeProactiveLoopState(raw: unknown, now = Date.now()): AlicizationProactiveLoopState {
  const source = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {}
  const next = createDefaultProactiveLoopState(now)
  next.globalCooldownUntil = Number.isFinite(Number(source.globalCooldownUntil))
    ? Math.max(0, Math.floor(Number(source.globalCooldownUntil)))
    : 0
  next.scenarioBias = normalizeScenarioNumberMap(source.scenarioBias)
  next.consecutiveIgnored = normalizeScenarioNumberMap(source.consecutiveIgnored)
  next.initiativeTrust = clamp01(Number(source.initiativeTrust))
  next.openingMomentum = clamp01(Number(source.openingMomentum))
  next.lastProactiveTurnAt = Number.isFinite(Number(source.lastProactiveTurnAt))
    ? Math.max(0, Math.floor(Number(source.lastProactiveTurnAt)))
    : null
  next.lateNightActivityStartedAt = Number.isFinite(Number(source.lateNightActivityStartedAt))
    ? Math.max(0, Math.floor(Number(source.lateNightActivityStartedAt)))
    : null
  next.lateNightActivityLastActiveAt = Number.isFinite(Number(source.lateNightActivityLastActiveAt))
    ? Math.max(0, Math.floor(Number(source.lateNightActivityLastActiveAt)))
    : null
  next.pendingOutcomes = Array.isArray(source.pendingOutcomes)
    ? source.pendingOutcomes
        .map(normalizePendingOutcome)
        .filter((entry): entry is AlicizationPendingProactiveOutcome => Boolean(entry))
        .slice(-12)
    : []
  next.recentOutcomes = Array.isArray(source.recentOutcomes)
    ? trimRecentOutcomes(source.recentOutcomes
        .map(normalizeRecentOutcome)
        .filter((entry): entry is AlicizationRecentProactiveOutcome => Boolean(entry)))
    : []
  next.updatedAt = Number.isFinite(Number(source.updatedAt))
    ? Math.max(0, Math.floor(Number(source.updatedAt)))
    : now
  return next
}

export function registerProactiveDelivery(
  state: AlicizationProactiveLoopState,
  input: {
    turnId: string
    scenario: AlicizationProactiveScenario
    deliveredAt: number
    feedbackWindowMs: number
  },
): AlicizationProactiveLoopState {
  const turnId = input.turnId.trim()
  if (!turnId)
    return state

  const deliveredAt = Math.max(0, Math.floor(input.deliveredAt))
  const pending = state.pendingOutcomes.filter(entry => entry.turnId !== turnId)
  pending.push({
    turnId,
    scenario: input.scenario,
    deliveredAt,
    feedbackWindowMs: Math.max(1_000, Math.floor(input.feedbackWindowMs)),
  })

  return {
    ...state,
    openingMomentum: clamp01(state.openingMomentum * 0.46),
    lastProactiveTurnAt: deliveredAt,
    pendingOutcomes: pending.slice(-12),
    updatedAt: deliveredAt,
  }
}

export function reportExplicitProactiveFeedback(
  state: AlicizationProactiveLoopState,
  input: {
    turnId: string
    feedback: AlicizationProactiveFeedbackKind
    at?: number
  },
): AlicizationProactiveLoopMutationResult {
  const turnId = input.turnId.trim()
  const at = input.at ?? Date.now()
  const entry = state.pendingOutcomes.find(candidate => candidate.turnId === turnId)
  if (!entry) {
    return {
      state,
      appliedOutcomes: [],
    }
  }

  const nextPending = state.pendingOutcomes.filter(candidate => candidate.turnId !== turnId)
  const applied = applyOutcome({
    ...state,
    pendingOutcomes: nextPending,
  }, entry, input.feedback, at)

  return {
    state: applied.state,
    appliedOutcomes: [applied.outcome],
  }
}

export function settleProactiveOutcomesOnUserTurnStart(
  state: AlicizationProactiveLoopState,
  at = Date.now(),
): AlicizationProactiveLoopMutationResult {
  let nextState = {
    ...state,
    pendingOutcomes: [...state.pendingOutcomes],
  }
  const appliedOutcomes: AlicizationRecentProactiveOutcome[] = []

  for (const entry of state.pendingOutcomes) {
    if (at - entry.deliveredAt > proactiveReplyWindowMs)
      continue
    nextState.pendingOutcomes = nextState.pendingOutcomes.filter(candidate => candidate.turnId !== entry.turnId)
    const applied = applyOutcome(nextState, entry, 'reply-within-120s', at)
    nextState = applied.state
    appliedOutcomes.push(applied.outcome)
  }

  return {
    state: nextState,
    appliedOutcomes,
  }
}

export function settleExpiredProactiveOutcomes(
  state: AlicizationProactiveLoopState,
  at = Date.now(),
): AlicizationProactiveLoopMutationResult {
  let nextState = {
    ...state,
    pendingOutcomes: [...state.pendingOutcomes],
  }
  const appliedOutcomes: AlicizationRecentProactiveOutcome[] = []

  for (const entry of state.pendingOutcomes) {
    if (at - entry.deliveredAt < proactiveImplicitIgnoredAfterMs)
      continue
    nextState.pendingOutcomes = nextState.pendingOutcomes.filter(candidate => candidate.turnId !== entry.turnId)
    const applied = applyOutcome(nextState, entry, 'ignored', at)
    nextState = applied.state
    appliedOutcomes.push(applied.outcome)
  }

  return {
    state: nextState,
    appliedOutcomes,
  }
}

export function updateLateNightActivityState(
  state: AlicizationProactiveLoopState,
  input: {
    now: number
    hostActive: boolean
    isLateNight: boolean
  },
) {
  const now = Math.max(0, Math.floor(input.now))
  if (!input.hostActive || !input.isLateNight) {
    return {
      state: {
        ...state,
        lateNightActivityStartedAt: null,
        lateNightActivityLastActiveAt: null,
        updatedAt: now,
      },
      lateNightActiveMinutes: 0,
    }
  }

  const shouldContinueExistingSession
    = typeof state.lateNightActivityStartedAt === 'number'
      && typeof state.lateNightActivityLastActiveAt === 'number'
      && now >= state.lateNightActivityLastActiveAt
      && now - state.lateNightActivityLastActiveAt <= 10 * 60_000

  const startedAt = shouldContinueExistingSession
    ? state.lateNightActivityStartedAt
    : now
  const safeStartedAt = typeof startedAt === 'number' ? startedAt : now

  return {
    state: {
      ...state,
      lateNightActivityStartedAt: safeStartedAt,
      lateNightActivityLastActiveAt: now,
      updatedAt: now,
    },
    lateNightActiveMinutes: Math.max(0, (now - safeStartedAt) / 60_000),
  }
}

export function recoverProactiveRhythmAfterDream(
  state: AlicizationProactiveLoopState,
  at = Date.now(),
) {
  return {
    ...state,
    openingMomentum: clamp01(state.openingMomentum * 0.52),
    initiativeTrust: clamp01(state.initiativeTrust * 0.96 + 0.02),
    lateNightActivityStartedAt: null,
    lateNightActivityLastActiveAt: null,
    updatedAt: at,
  } satisfies AlicizationProactiveLoopState
}
