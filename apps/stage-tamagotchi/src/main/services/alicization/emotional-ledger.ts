import type { AlicizationEmotionalKernelSnapshot } from '../../../shared/eventa'

type EmotionalAxisName = 'valence' | 'arousal' | 'guardedness' | 'closenessDrive' | 'repairNeed' | 'initiativePressure'

type EmotionalAxisDeltas = Record<EmotionalAxisName, number>

export type AlicizationEmotionalTransitionKind
  = 'stable'
    | 'intensified'
    | 'softened'
    | 'repair-shift'
    | 'rest-protective-shift'
    | 'guarded-shift'

export interface AlicizationEmotionalTransitionLedgerSnapshot {
  version: 'emotional-transition-ledger-v1'
  createdAt: number
  turnId: string | null
  previousEmotion: AlicizationEmotionalKernelSnapshot['dominantEmotion'] | null
  nextEmotion: AlicizationEmotionalKernelSnapshot['dominantEmotion']
  transitionKind: AlicizationEmotionalTransitionKind
  axisDeltas: EmotionalAxisDeltas
  changedAxes: EmotionalAxisName[]
  sourceTags: string[]
  decayPolicy: {
    mode: 'decay-normally' | 'hold-until-repair-cools' | 'protect-rest-window' | 'cool-approach-pressure'
    carryTtlMs: number
    reason: string
  }
  memoryWriteback: {
    shouldWrite: boolean
    lane: 'none' | 'relationship-repair' | 'rest-protection' | 'emotional-continuity'
    reason: string
  }
  initiativeSuppression: {
    shouldSuppress: boolean
    mode: 'none' | 'repair-first' | 'rest-guard' | 'measured-return' | 'single-thread'
    reason: string
  }
  embodimentDrive: {
    shouldDrive: boolean
    tone: AlicizationEmotionalKernelSnapshot['embodimentTone'] | null
    reason: string
  }
  selfRevisionCandidate: {
    shouldPropose: boolean
    domain: 'dialogue-style' | 'proactive-policy' | 'relationship'
    reasonCodes: string[]
    summary: string | null
    projectStateContinuity: {
      sameHerSelfLine: string | null
      sameHerDriftRisk: string | null
      proactiveSameHerGap: string | null
      emotionalClosureCue: string | null
      sameHerHoldDetail: string | null
      continuityGuard: string | null
    }
  }
  traceSummary: string
  replayLine: string
}

export interface AlicizationEmotionalTransitionDecaySnapshot {
  version: 'emotional-transition-decay-v1'
  ledgerCreatedAt: number
  evaluatedAt: number
  elapsedMs: number
  expiresAt: number
  phase: 'hold' | 'soften' | 'release'
  shouldSuppressInitiative: boolean
  shouldDriveEmbodiment: boolean
  initiativeMode: AlicizationEmotionalTransitionLedgerSnapshot['initiativeSuppression']['mode']
  embodimentTone: AlicizationEmotionalTransitionLedgerSnapshot['embodimentDrive']['tone']
  memoryWritebackLane: AlicizationEmotionalTransitionLedgerSnapshot['memoryWriteback']['lane']
  reasonTags: string[]
  summary: string
}

function roundDelta(value: number) {
  if (!Number.isFinite(value))
    return 0
  return Number(value.toFixed(2))
}

function compactUnique(items: Array<string | null | undefined>, limit = 12) {
  const result: string[] = []
  for (const item of items) {
    const normalized = typeof item === 'string' ? item.trim() : ''
    if (!normalized)
      continue
    if (result.some(existing => existing.toLowerCase() === normalized.toLowerCase()))
      continue
    result.push(normalized)
    if (result.length >= limit)
      break
  }
  return result
}

function clampElapsedMs(value: number) {
  if (!Number.isFinite(value))
    return 0
  return Math.max(0, Math.floor(value))
}

function currentEmotionStillCarriesLedger(input: {
  ledger: AlicizationEmotionalTransitionLedgerSnapshot
  current?: AlicizationEmotionalKernelSnapshot | null
}) {
  const current = input.current ?? null
  if (!current)
    return true

  if (input.ledger.transitionKind === 'repair-shift') {
    return current.dominantEmotion === 'repair-tension'
      || current.initiativeMode === 'repair'
      || current.embodimentTone === 'repair-before-closeness'
      || current.repairNeed >= 0.36
      || current.reasonTags.includes('repair-before-closeness')
  }

  if (input.ledger.transitionKind === 'rest-protective-shift') {
    return current.dominantEmotion === 'rest-protective-companionship'
      || current.initiativeMode === 'rest-guard'
      || current.embodimentTone === 'rest-protective'
      || current.reasonTags.includes('rest-protective')
  }

  if (input.ledger.initiativeSuppression.mode === 'measured-return') {
    return current.dominantEmotion === 'measured-companionship'
      || current.initiativeMode === 'observe'
      || current.embodimentTone === 'measured-return'
      || current.reasonTags.includes('measured-return')
  }

  return current.dominantEmotion === input.ledger.nextEmotion
}

function currentEmotionCanSoftenLedger(input: {
  ledger: AlicizationEmotionalTransitionLedgerSnapshot
  current?: AlicizationEmotionalKernelSnapshot | null
}) {
  const current = input.current ?? null
  if (!current)
    return false

  if (input.ledger.transitionKind === 'repair-shift') {
    return current.dominantEmotion === 'measured-companionship'
      || current.initiativeMode === 'observe'
      || current.embodimentTone === 'measured-return'
      || current.repairNeed >= 0.16
      || current.reasonTags.includes('measured-return')
  }

  if (input.ledger.transitionKind === 'rest-protective-shift') {
    return current.dominantEmotion === 'measured-companionship'
      || current.initiativeMode === 'observe'
      || current.embodimentTone === 'measured-return'
  }

  return input.ledger.initiativeSuppression.mode === 'measured-return'
    && (
      current.dominantEmotion === 'hesitant-curiosity'
      || current.initiativeMode === 'hold'
      || current.embodimentTone === 'quiet-companionship'
    )
}

function resolveSoftenedInitiativeMode(
  ledger: AlicizationEmotionalTransitionLedgerSnapshot,
): AlicizationEmotionalTransitionDecaySnapshot['initiativeMode'] {
  if (ledger.initiativeSuppression.mode === 'repair-first')
    return 'measured-return'
  if (ledger.initiativeSuppression.mode === 'rest-guard')
    return 'measured-return'
  return ledger.initiativeSuppression.mode === 'none' ? 'none' : ledger.initiativeSuppression.mode
}

function resolveSoftenedEmbodimentTone(
  ledger: AlicizationEmotionalTransitionLedgerSnapshot,
): AlicizationEmotionalTransitionDecaySnapshot['embodimentTone'] {
  if (ledger.embodimentDrive.tone === 'repair-before-closeness' || ledger.embodimentDrive.tone === 'rest-protective')
    return 'measured-return'
  return ledger.embodimentDrive.tone
}

function buildAxisDeltas(input: {
  previous?: AlicizationEmotionalKernelSnapshot | null
  next: AlicizationEmotionalKernelSnapshot
}): EmotionalAxisDeltas {
  const previous = input.previous
  const next = input.next

  return {
    valence: roundDelta(next.valence - (previous?.valence ?? next.valence)),
    arousal: roundDelta(next.arousal - (previous?.arousal ?? next.arousal)),
    guardedness: roundDelta(next.guardedness - (previous?.guardedness ?? next.guardedness)),
    closenessDrive: roundDelta(next.closenessDrive - (previous?.closenessDrive ?? next.closenessDrive)),
    repairNeed: roundDelta(next.repairNeed - (previous?.repairNeed ?? next.repairNeed)),
    initiativePressure: roundDelta(next.initiativePressure - (previous?.initiativePressure ?? next.initiativePressure)),
  }
}

function changedAxesFrom(deltas: EmotionalAxisDeltas): EmotionalAxisName[] {
  return (Object.keys(deltas) as EmotionalAxisName[])
    .filter(axis => Math.abs(deltas[axis]) >= 0.05)
}

function resolveTransitionKind(input: {
  previous?: AlicizationEmotionalKernelSnapshot | null
  next: AlicizationEmotionalKernelSnapshot
  axisDeltas: EmotionalAxisDeltas
}): AlicizationEmotionalTransitionKind {
  const { previous, next, axisDeltas } = input
  if (
    next.dominantEmotion === 'repair-tension'
    || next.initiativeMode === 'repair'
    || next.embodimentTone === 'repair-before-closeness'
    || next.reasonTags.includes('repair-before-closeness')
  ) {
    return 'repair-shift'
  }

  if (
    next.dominantEmotion === 'rest-protective-companionship'
    || next.initiativeMode === 'rest-guard'
    || next.embodimentTone === 'rest-protective'
  ) {
    return 'rest-protective-shift'
  }

  if (
    next.dominantEmotion === 'guarded-care'
    || next.reasonTags.includes('confirmation-boundary')
    || next.reasonTags.includes('execution-safety-gate')
  ) {
    return 'guarded-shift'
  }

  if (!previous || previous.dominantEmotion === next.dominantEmotion)
    return changedAxesFrom(axisDeltas).length > 0 ? 'intensified' : 'stable'

  const pressureDelta = axisDeltas.arousal + axisDeltas.guardedness + axisDeltas.repairNeed - axisDeltas.valence
  return pressureDelta > 0.2 ? 'intensified' : 'softened'
}

function resolveDecayPolicy(input: {
  next: AlicizationEmotionalKernelSnapshot
  transitionKind: AlicizationEmotionalTransitionKind
}) {
  if (input.transitionKind === 'repair-shift') {
    return {
      mode: 'hold-until-repair-cools' as const,
      carryTtlMs: 1_800_000,
      reason: 'Repair pressure is high enough that warmth should not decay back into approach immediately.',
    }
  }

  if (input.transitionKind === 'rest-protective-shift') {
    return {
      mode: 'protect-rest-window' as const,
      carryTtlMs: 3_600_000,
      reason: 'Rest-protective emotion should persist long enough to keep initiative and body quiet.',
    }
  }

  if (input.next.initiativeMode === 'observe' || input.next.embodimentTone === 'measured-return') {
    return {
      mode: 'cool-approach-pressure' as const,
      carryTtlMs: 900_000,
      reason: 'Measured return should cool approach pressure before the next outward move.',
    }
  }

  return {
    mode: 'decay-normally' as const,
    carryTtlMs: 300_000,
    reason: 'No high-risk emotional carry needs a longer hold window.',
  }
}

function resolveMemoryWriteback(input: {
  axisDeltas: EmotionalAxisDeltas
  next: AlicizationEmotionalKernelSnapshot
  transitionKind: AlicizationEmotionalTransitionKind
}) {
  const strongAxisChange = Object.values(input.axisDeltas).some(delta => Math.abs(delta) >= 0.3)
  if (input.transitionKind === 'repair-shift') {
    return {
      shouldWrite: true,
      lane: 'relationship-repair' as const,
      reason: 'Repair, restraint, or a strong axis change should be available to later memory recall.',
    }
  }

  if (input.transitionKind === 'rest-protective-shift') {
    return {
      shouldWrite: true,
      lane: 'rest-protection' as const,
      reason: 'Rest protection should be remembered so later initiative does not reopen too loudly.',
    }
  }

  if (input.transitionKind === 'guarded-shift') {
    return {
      shouldWrite: true,
      lane: 'emotional-continuity' as const,
      reason: 'Guarded confirmation-boundary emotion should remain recallable so later initiative stays single-thread until the boundary settles.',
    }
  }

  if (strongAxisChange || input.next.reasonTags.includes('protective-continuity')) {
    return {
      shouldWrite: true,
      lane: 'emotional-continuity' as const,
      reason: 'A strong emotional movement should remain available as continuity evidence.',
    }
  }

  return {
    shouldWrite: false,
    lane: 'none' as const,
    reason: 'The emotional movement is small enough to remain transient.',
  }
}

function resolveInitiativeSuppression(input: {
  next: AlicizationEmotionalKernelSnapshot
  transitionKind: AlicizationEmotionalTransitionKind
}) {
  if (input.transitionKind === 'repair-shift') {
    return {
      shouldSuppress: true,
      mode: 'repair-first' as const,
      reason: 'Repair-first emotion should lower proactive pressure until the relationship line settles.',
    }
  }

  if (input.transitionKind === 'rest-protective-shift') {
    return {
      shouldSuppress: true,
      mode: 'rest-guard' as const,
      reason: 'Rest-protective emotion should suppress outward initiative during the rest window.',
    }
  }

  if (input.next.initiativeMode === 'hold' || input.next.reasonTags.includes('confirmation-boundary')) {
    return {
      shouldSuppress: true,
      mode: 'single-thread' as const,
      reason: 'Guarded emotion should keep initiative on one confirmed thread.',
    }
  }

  if (input.next.initiativeMode === 'observe' || input.next.embodimentTone === 'measured-return') {
    return {
      shouldSuppress: true,
      mode: 'measured-return' as const,
      reason: 'Measured-return emotion should keep proactive pressure low.',
    }
  }

  return {
    shouldSuppress: false,
    mode: 'none' as const,
    reason: 'The emotional state does not require initiative suppression.',
  }
}

function resolveEmbodimentDrive(input: {
  previous?: AlicizationEmotionalKernelSnapshot | null
  next: AlicizationEmotionalKernelSnapshot
  transitionKind: AlicizationEmotionalTransitionKind
}) {
  const toneChanged = input.previous?.embodimentTone !== input.next.embodimentTone
  const shouldDrive = toneChanged || input.transitionKind !== 'stable'
  return {
    shouldDrive,
    tone: shouldDrive ? input.next.embodimentTone : null,
    reason: shouldDrive
      ? 'The body should express the next emotional tone instead of stale warmth.'
      : 'The body can keep its current expression because the emotional tone is stable.',
  }
}

function resolveSelfRevisionCandidate(input: {
  next: AlicizationEmotionalKernelSnapshot
  transitionKind: AlicizationEmotionalTransitionKind
  memoryWriteback: AlicizationEmotionalTransitionLedgerSnapshot['memoryWriteback']
  initiativeSuppression: AlicizationEmotionalTransitionLedgerSnapshot['initiativeSuppression']
}) {
  const emptyContinuity = {
    sameHerSelfLine: null,
    sameHerDriftRisk: null,
    proactiveSameHerGap: null,
    emotionalClosureCue: null,
    sameHerHoldDetail: null,
    continuityGuard: null,
  }

  if (input.transitionKind === 'repair-shift') {
    return {
      shouldPropose: true,
      domain: 'dialogue-style' as const,
      reasonCodes: compactUnique([
        'repair-before-closeness',
        input.initiativeSuppression.mode === 'repair-first' ? 'continue-repair-first' : null,
        input.memoryWriteback.shouldWrite ? 'writeback-repair-restraint' : null,
      ], 6),
      summary: 'Repair-first emotional carry should propose a continuity self-revision so later turns keep closeness restrained until the seam settles.',
      projectStateContinuity: emptyContinuity,
    }
  }

  if (input.transitionKind === 'rest-protective-shift') {
    return {
      shouldPropose: true,
      domain: 'proactive-policy' as const,
      reasonCodes: compactUnique([
        'rest-protective',
        input.initiativeSuppression.mode === 'rest-guard' ? 'suppress-outward-initiative' : null,
        input.memoryWriteback.shouldWrite ? 'writeback-rest-window' : null,
      ], 6),
      summary: 'Rest-protective emotional carry should propose a continuity self-revision so later initiative keeps the body quiet during rest windows.',
      projectStateContinuity: emptyContinuity,
    }
  }

  if (input.transitionKind === 'guarded-shift') {
    return {
      shouldPropose: true,
      domain: 'relationship' as const,
      reasonCodes: compactUnique([
        'guarded-care',
        input.next.reasonTags.includes('confirmation-boundary') ? 'confirmation-boundary' : null,
        input.initiativeSuppression.mode === 'single-thread' ? 'single-thread-restraint' : null,
      ], 6),
      summary: 'Guarded emotional carry should propose a continuity self-revision so later turns preserve the confirmed boundary before widening.',
      projectStateContinuity: emptyContinuity,
    }
  }

  return {
    shouldPropose: false,
    domain: 'dialogue-style' as const,
    reasonCodes: [],
    summary: null,
    projectStateContinuity: emptyContinuity,
  }
}

export function buildAlicizationEmotionalTransitionLedger(input: {
  createdAt?: number
  previous?: AlicizationEmotionalKernelSnapshot | null
  next: AlicizationEmotionalKernelSnapshot
  source?: {
    turnId?: string | null
    sourceTags?: string[]
  } | null
}): AlicizationEmotionalTransitionLedgerSnapshot {
  const createdAt = Number.isFinite(input.createdAt) ? Number(input.createdAt) : Date.now()
  const axisDeltas = buildAxisDeltas({ previous: input.previous ?? null, next: input.next })
  const changedAxes = changedAxesFrom(axisDeltas)
  const transitionKind = resolveTransitionKind({
    previous: input.previous ?? null,
    next: input.next,
    axisDeltas,
  })
  const sourceTags = compactUnique([
    ...(input.source?.sourceTags ?? []),
    ...(input.next.reasonTags ?? []),
  ])
  const decayPolicy = resolveDecayPolicy({ next: input.next, transitionKind })
  const memoryWriteback = resolveMemoryWriteback({
    axisDeltas,
    next: input.next,
    transitionKind,
  })
  const initiativeSuppression = resolveInitiativeSuppression({
    next: input.next,
    transitionKind,
  })
  const embodimentDrive = resolveEmbodimentDrive({
    previous: input.previous ?? null,
    next: input.next,
    transitionKind,
  })
  const selfRevisionCandidate = resolveSelfRevisionCandidate({
    next: input.next,
    transitionKind,
    memoryWriteback,
    initiativeSuppression,
  })
  const previousEmotion = input.previous?.dominantEmotion ?? null
  const transitionLabel = `${previousEmotion ?? 'none'} -> ${input.next.dominantEmotion}`
  const reasonCarry = compactUnique([
    input.next.embodimentTone,
    input.next.memoryRecallMode,
    input.next.why,
    ...sourceTags,
  ], 6).join(' | ')
  const traceSummary = `${transitionLabel}; kind=${transitionKind}; changed=${changedAxes.join(',') || 'none'}; carry=${reasonCarry || 'none'}`
  const turnId = input.source?.turnId?.trim() || null

  return {
    version: 'emotional-transition-ledger-v1',
    createdAt,
    turnId,
    previousEmotion,
    nextEmotion: input.next.dominantEmotion,
    transitionKind,
    axisDeltas,
    changedAxes,
    sourceTags,
    decayPolicy,
    memoryWriteback,
    initiativeSuppression,
    embodimentDrive,
    selfRevisionCandidate,
    traceSummary,
    replayLine: `${turnId ?? 'turn:unknown'} emotional-transition ${transitionKind} ${transitionLabel} changed=${changedAxes.join('|') || 'none'}`,
  }
}

export function resolveAlicizationEmotionalTransitionDecay(input: {
  ledger: AlicizationEmotionalTransitionLedgerSnapshot
  now: number
  current?: AlicizationEmotionalKernelSnapshot | null
}): AlicizationEmotionalTransitionDecaySnapshot {
  const evaluatedAt = Number.isFinite(input.now) ? Math.floor(input.now) : input.ledger.createdAt
  const carryTtlMs = Math.max(0, Math.floor(input.ledger.decayPolicy.carryTtlMs))
  const elapsedMs = clampElapsedMs(evaluatedAt - input.ledger.createdAt)
  const expiresAt = Math.floor(input.ledger.createdAt + carryTtlMs)
  const withinWindow = elapsedMs <= carryTtlMs
  const stillCarries = currentEmotionStillCarriesLedger({
    ledger: input.ledger,
    current: input.current ?? null,
  })
  const canSoften = currentEmotionCanSoftenLedger({
    ledger: input.ledger,
    current: input.current ?? null,
  })
  const phase: AlicizationEmotionalTransitionDecaySnapshot['phase'] = withinWindow && stillCarries
    ? 'hold'
    : canSoften
      ? 'soften'
      : 'release'
  const shouldSuppressInitiative = phase === 'hold'
    ? input.ledger.initiativeSuppression.shouldSuppress
    : phase === 'soften' && input.ledger.initiativeSuppression.mode !== 'none'
  const shouldDriveEmbodiment = phase === 'hold'
    ? input.ledger.embodimentDrive.shouldDrive
    : phase === 'soften' && input.ledger.embodimentDrive.tone !== null
  const initiativeMode = phase === 'release'
    ? 'none'
    : phase === 'soften'
      ? resolveSoftenedInitiativeMode(input.ledger)
      : input.ledger.initiativeSuppression.mode
  const embodimentTone = phase === 'release'
    ? null
    : phase === 'soften'
      ? resolveSoftenedEmbodimentTone(input.ledger)
      : input.ledger.embodimentDrive.tone
  const memoryWritebackLane = phase === 'release' ? 'none' : input.ledger.memoryWriteback.lane
  const reasonTags = compactUnique([
    `emotion-decay:${input.ledger.decayPolicy.mode}`,
    withinWindow ? 'emotion-decay:within-window' : 'emotion-decay:expired',
    phase === 'hold' && input.ledger.transitionKind === 'repair-shift' ? 'emotion-decay:repair-still-hot' : null,
    phase === 'hold' && input.ledger.transitionKind === 'rest-protective-shift' ? 'emotion-decay:rest-window-active' : null,
    phase === 'soften' && input.ledger.transitionKind === 'repair-shift' ? 'emotion-decay:repair-cooling' : null,
    phase === 'soften' && input.ledger.transitionKind === 'rest-protective-shift' ? 'emotion-decay:rest-softening' : null,
    phase === 'soften' && input.ledger.initiativeSuppression.mode === 'measured-return' ? 'emotion-decay:approach-cooling' : null,
    phase === 'release' ? 'emotion-decay:released' : null,
  ], 8)
  const summary = phase === 'hold'
    ? `Emotional transition ${input.ledger.transitionKind} is still inside its ${input.ledger.decayPolicy.mode} hold window.`
    : phase === 'soften'
      ? `Emotional transition ${input.ledger.transitionKind} has expired but should soften into measured restraint before release.`
      : `Emotional transition ${input.ledger.transitionKind} has cooled enough to release initiative, memory, and embodiment carry.`

  return {
    version: 'emotional-transition-decay-v1',
    ledgerCreatedAt: input.ledger.createdAt,
    evaluatedAt,
    elapsedMs,
    expiresAt,
    phase,
    shouldSuppressInitiative,
    shouldDriveEmbodiment,
    initiativeMode,
    embodimentTone,
    memoryWritebackLane,
    reasonTags,
    summary,
  }
}
