import type {
  AlicizationLivingWorldObjectSnapshot,
  AlicizationLivingWorldStateSnapshot,
  AlicizationPrivateThoughtSnapshot,
  AlicizationRelationshipModelSnapshot,
  AlicizationSelfGovernorDrive,
  AlicizationSelfGovernorIntentionKind,
  AlicizationSelfGovernorIntentionSnapshot,
  AlicizationSelfGovernorSnapshot,
  AlicizationThoughtThreadKind,
  AlicizationThoughtThreadSnapshot,
  AlicizationThoughtThreadStateSnapshot,
  AlicizationVisualSceneSnapshot,
  AlicizationVisualWatchMode,
  AlicizationWorldModelSnapshot,
} from '../../../shared/eventa'

function clamp01(value: number) {
  if (!Number.isFinite(value))
    return 0
  return Math.max(0, Math.min(1, Number(value.toFixed(2))))
}

function sanitizeText(raw: unknown, maxChars = 220) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function stableId(kind: string, parts: Array<string | number | null | undefined>) {
  return `${kind}::${parts.map((part) => {
    if (typeof part === 'number')
      return String(part)
    return sanitizeText(part ?? '', 120).toLowerCase()
  }).filter(Boolean).join('::') || 'unknown'}`
}

function dedupeTexts(values: Array<string | undefined>) {
  return [...new Set(values.map(value => sanitizeText(value, 180)).filter(Boolean))]
}

function resolveFallbackDrive(input: {
  worldModel?: AlicizationWorldModelSnapshot | null
  relationshipModel?: AlicizationRelationshipModelSnapshot | null
  privateThought?: AlicizationPrivateThoughtSnapshot | null
}): AlicizationSelfGovernorDrive {
  if (input.worldModel?.activeThread?.kind === 'recovery')
    return 'protect' as const
  if (input.privateThought?.stance === 'warn')
    return 'protect' as const
  if (
    (input.privateThought?.stance === 'observe' || input.privateThought?.stance === 'uncertain')
    && input.relationshipModel?.climate === 'guarded'
    && input.worldModel?.epistemicState.certainty !== 'grounded'
  ) {
    return 'withhold' as const
  }
  if (input.worldModel?.continuity.afterglowOpen)
    return 'accompany' as const
  if (input.worldModel?.activeThread?.kind === 'late-night-endurance')
    return 'care' as const
  if (input.worldModel?.epistemicState.certainty === 'uncertain' || input.worldModel?.epistemicState.certainty === 'lingering')
    return 'repair' as const
  if (input.relationshipModel?.approachVector === 'care')
    return 'care' as const
  if (input.relationshipModel?.approachVector === 'stay-near')
    return 'accompany' as const
  return 'understand' as const
}

function resolveFallbackIntentionKind(drive: AlicizationSelfGovernorDrive): AlicizationSelfGovernorIntentionKind {
  if (drive === 'repair')
    return 'repair-misread'
  if (drive === 'protect')
    return 'protect-host'
  if (drive === 'care')
    return 'care-host'
  if (drive === 'accompany')
    return 'stay-near'
  if (drive === 'withhold')
    return 'wait-opening'
  return 'hold-thread'
}

function resolveFallbackThoughtThreadKind(drive: AlicizationSelfGovernorDrive, worldModel?: AlicizationWorldModelSnapshot | null): AlicizationThoughtThreadKind {
  if (drive === 'repair')
    return 'repair-thread'
  if (drive === 'care' || drive === 'protect')
    return 'care-thread'
  if (drive === 'accompany')
    return worldModel?.continuity.afterglowOpen ? 'afterglow-thread' : 'relationship-thread'
  if (worldModel?.activeThread?.unresolved)
    return 'problem-thread'
  return 'scene-hold'
}

function resolveLivingWorldSummary(input: {
  scene?: AlicizationVisualSceneSnapshot | null
  worldModel?: AlicizationWorldModelSnapshot | null
}) {
  return sanitizeText(
    input.worldModel?.activeThread?.summary
    ?? input.scene?.summary
    ?? input.worldModel?.activeThread?.title
    ?? input.scene?.target?.title
    ?? input.scene?.target?.appName
    ?? '',
    220,
  )
}

function buildFallbackLivingWorldState(input: {
  now: number
  currentScene?: AlicizationVisualSceneSnapshot | null
  worldModel?: AlicizationWorldModelSnapshot | null
  previous?: AlicizationLivingWorldStateSnapshot | null
}): AlicizationLivingWorldStateSnapshot | null {
  const summary = resolveLivingWorldSummary({
    scene: input.currentScene,
    worldModel: input.worldModel,
  })
  const label = sanitizeText(
    input.currentScene?.summary
    ?? input.worldModel?.activeThread?.title
    ?? input.currentScene?.target?.title
    ?? input.currentScene?.target?.appName
    ?? '',
    140,
  )
  if (!summary && !label)
    return input.previous ?? null

  const objectId = stableId('living-world:fallback', [
    input.worldModel?.activeThread?.kind ?? input.currentScene?.scenario ?? 'scene',
    label || summary,
    input.currentScene?.target?.pid ?? input.worldModel?.focusTarget?.pid ?? null,
  ])
  const object: AlicizationLivingWorldObjectSnapshot = {
    id: objectId,
    kind: input.worldModel?.activeThread?.kind === 'recovery'
      ? 'incident'
      : input.worldModel?.continuity.afterglowOpen
        ? 'session'
        : 'artifact',
    status: input.worldModel?.epistemicState.certainty === 'grounded' ? 'active' : 'forming',
    label: label || summary || 'current-world-object',
    summary: summary || label || 'current-world-object',
    confidence: clamp01(
      input.worldModel?.activeThread?.confidence
      ?? input.currentScene?.confidence
      ?? 0.58,
    ),
    salience: clamp01(
      (input.worldModel?.activeThread?.significance ?? 0.46) * 0.72
      + (input.currentScene?.confidence ?? 0.42) * 0.2
      + (input.worldModel?.continuity.afterglowOpen ? 0.08 : 0),
    ),
    continuity: clamp01(
      input.worldModel?.continuity.sameSceneAsBefore
        ? 0.72
        : input.worldModel?.continuity.afterglowOpen
          ? 0.68
          : 0.52,
    ),
    lastChange: input.worldModel?.continuity.label ?? 'fallback-stabilized',
    openLoop: input.worldModel?.activeThread?.unresolved
      ? sanitizeText(input.worldModel.epistemicState.openQuestions[0] ?? summary, 160) || undefined
      : undefined,
    entityIds: [],
    threadIds: input.worldModel?.activeThread ? [input.worldModel.activeThread.id] : [],
    evidence: dedupeTexts([
      input.currentScene?.source ? `scene:${input.currentScene.source}` : '',
      input.worldModel?.activeThread?.source ? `thread:${input.worldModel.activeThread.source}` : '',
      'fallback-invariant',
    ]),
    firstSeenAt: input.previous?.objects.find(object => object.id === objectId)?.firstSeenAt ?? input.now,
    lastUpdatedAt: input.now,
  }

  const stability = input.worldModel?.epistemicState.certainty === 'grounded'
    ? 'stable'
    : input.worldModel?.epistemicState.certainty === 'observed'
      ? 'shifting'
      : 'fractured'

  return {
    focusObjectId: object.id,
    activeObjectIds: [object.id],
    objects: [object],
    openLoops: dedupeTexts([
      object.openLoop,
      ...(input.worldModel?.epistemicState.openQuestions ?? []),
    ]).slice(0, 6),
    stability,
    narrative: dedupeTexts([
      `focus:${object.id}`,
      `stability:${stability}`,
      input.worldModel?.activeThread?.kind ? `thread:${input.worldModel.activeThread.kind}` : '',
      'fallback:living-world',
    ]).slice(0, 6),
    updatedAt: input.now,
  }
}

function buildFallbackSelfGovernor(input: {
  now: number
  worldModel?: AlicizationWorldModelSnapshot | null
  livingWorldState?: AlicizationLivingWorldStateSnapshot | null
  relationshipModel?: AlicizationRelationshipModelSnapshot | null
  privateThought?: AlicizationPrivateThoughtSnapshot | null
  previous?: AlicizationSelfGovernorSnapshot | null
}): AlicizationSelfGovernorSnapshot | null {
  const focusObjectId = input.livingWorldState?.focusObjectId ?? null
  const drive = resolveFallbackDrive({
    worldModel: input.worldModel,
    relationshipModel: input.relationshipModel,
    privateThought: input.privateThought,
  })
  const intentionKind = resolveFallbackIntentionKind(drive)
  const summary = sanitizeText(
    input.privateThought?.thoughtText
    ?? input.worldModel?.activeThread?.summary
    ?? input.livingWorldState?.openLoops[0]
    ?? input.livingWorldState?.objects[0]?.summary
    ?? '',
    200,
  )
  if (!summary && !focusObjectId)
    return input.previous ?? null

  const intentionId = stableId('governor-intention:fallback', [
    intentionKind,
    focusObjectId,
    input.worldModel?.activeThread?.id ?? '',
    summary,
  ])
  const intention: AlicizationSelfGovernorIntentionSnapshot = {
    id: intentionId,
    kind: intentionKind,
    status: drive === 'withhold' ? 'withheld' : 'active',
    drive,
    title: sanitizeText(input.worldModel?.activeThread?.title ?? intentionKind, 120) || intentionKind,
    summary: summary || 'Keep the live thread coherent before it drifts.',
    urgency: clamp01(
      drive === 'protect' || drive === 'care'
        ? 0.72
        : drive === 'repair'
          ? 0.68
          : 0.58,
    ),
    confidence: clamp01(
      input.worldModel?.epistemicState.certainty === 'grounded'
        ? 0.74
        : input.worldModel?.epistemicState.certainty === 'observed'
          ? 0.64
          : 0.52,
    ),
    patience: clamp01(drive === 'accompany' ? 0.82 : drive === 'repair' ? 0.44 : 0.58),
    targetObjectId: focusObjectId,
    targetThreadId: input.worldModel?.activeThread?.id ?? null,
    formedAt: input.previous?.activeIntentions.find(intention => intention.id === intentionId)?.formedAt ?? input.now,
    lastUpdatedAt: input.now,
    expiresAt: input.now + 25 * 60_000,
  }

  return {
    dominantDrive: drive,
    dominantIntentionId: intention.id,
    focusObjectId,
    activeIntentions: [intention],
    inhibition: clamp01(
      drive === 'repair' || input.worldModel?.epistemicState.certainty === 'uncertain'
        ? 0.62
        : 0.34,
    ),
    persistence: clamp01(
      input.worldModel?.continuity.afterglowOpen
        ? 0.76
        : input.worldModel?.activeThread?.unresolved
          ? 0.72
          : 0.58,
    ),
    socialRiskTolerance: clamp01(
      input.relationshipModel?.climate === 'attuned'
        ? 0.66
        : input.relationshipModel?.climate === 'guarded'
          ? 0.34
          : 0.5,
    ),
    revisionReadiness: clamp01(
      input.worldModel?.epistemicState.certainty === 'grounded'
        ? 0.72
        : 0.9,
    ),
    narrative: dedupeTexts([
      `drive:${drive}`,
      intentionKind ? `intention:${intentionKind}` : '',
      'fallback:self-governor',
    ]).slice(0, 6),
    updatedAt: input.now,
  }
}

function buildFallbackThoughtThreads(input: {
  now: number
  worldModel?: AlicizationWorldModelSnapshot | null
  livingWorldState?: AlicizationLivingWorldStateSnapshot | null
  selfGovernor?: AlicizationSelfGovernorSnapshot | null
  privateThought?: AlicizationPrivateThoughtSnapshot | null
  previous?: AlicizationThoughtThreadStateSnapshot | null
}): AlicizationThoughtThreadStateSnapshot | null {
  const intention = input.selfGovernor?.activeIntentions.find(candidate => candidate.id === input.selfGovernor?.dominantIntentionId)
    ?? input.selfGovernor?.activeIntentions[0]
    ?? null
  if (!intention)
    return input.previous ?? null

  const focusObject = input.livingWorldState?.objects.find(object => object.id === input.selfGovernor?.focusObjectId)
    ?? input.livingWorldState?.objects[0]
    ?? null
  const kind = resolveFallbackThoughtThreadKind(intention.drive, input.worldModel)
  const threadId = stableId('thought-thread:fallback', [
    kind,
    focusObject?.id ?? '',
    intention.id,
    input.worldModel?.activeThread?.id ?? '',
  ])
  const summary = sanitizeText(
    input.privateThought?.thoughtText
    ?? intention.summary
    ?? focusObject?.summary
    ?? input.worldModel?.activeThread?.summary
    ?? '',
    220,
  )
  const question = sanitizeText(
    input.worldModel?.epistemicState.openQuestions[0]
    ?? focusObject?.openLoop
    ?? '',
    180,
  )
  const certainty = input.worldModel?.epistemicState.certainty ?? 'uncertain'
  const thread: AlicizationThoughtThreadSnapshot = {
    id: threadId,
    kind,
    status: certainty === 'grounded'
      ? (kind === 'afterglow-thread' || kind === 'care-thread' ? 'ripe' : 'active')
      : certainty === 'observed'
        ? 'active'
        : 'waiting',
    title: sanitizeText(focusObject?.label ?? input.worldModel?.activeThread?.title ?? intention.title, 120) || kind,
    summary: summary || 'Keep the current line coherent before speaking.',
    question: question || undefined,
    anchoredObjectId: focusObject?.id ?? null,
    anchoredIntentionId: intention.id,
    salience: clamp01(
      intention.urgency * 0.4
      + intention.confidence * 0.28
      + (focusObject?.salience ?? 0.32) * 0.22,
    ),
    confidence: clamp01(
      intention.confidence * 0.64
      + (focusObject?.confidence ?? 0.42) * 0.24
      + (certainty === 'grounded' ? 0.12 : certainty === 'observed' ? 0.06 : 0),
    ),
    surfaceReadiness: clamp01(
      certainty === 'grounded'
        ? 0.72
        : certainty === 'observed'
          ? 0.54
          : 0.34,
    ),
    reopenWhen: dedupeTexts([
      certainty === 'grounded' ? 'grounded-scene' : '',
      input.worldModel?.continuity.afterglowOpen ? 'afterglow-window' : '',
      intention.kind,
      kind,
    ]).slice(0, 8),
    openedAt: input.previous?.threads.find(candidate => candidate.id === threadId)?.openedAt ?? input.now,
    lastUpdatedAt: input.now,
    expiresAt: input.now + 30 * 60_000,
  }

  return {
    foregroundThreadId: thread.id,
    threads: [thread],
    unresolvedCount: thread.status === 'cooling' || thread.status === 'released' ? 0 : 1,
    narrative: dedupeTexts([
      `foreground:${thread.kind}/${thread.status}`,
      input.selfGovernor?.dominantDrive ? `drive:${input.selfGovernor.dominantDrive}` : '',
      'fallback:thought-thread',
    ]).slice(0, 6),
    updatedAt: input.now,
  }
}

export function stabilizeMindStateInvariants(input: {
  now: number
  watchMode: AlicizationVisualWatchMode
  currentScene?: AlicizationVisualSceneSnapshot | null
  worldModel?: AlicizationWorldModelSnapshot | null
  livingWorldState?: AlicizationLivingWorldStateSnapshot | null
  relationshipModel?: AlicizationRelationshipModelSnapshot | null
  selfGovernor?: AlicizationSelfGovernorSnapshot | null
  thoughtThreads?: AlicizationThoughtThreadStateSnapshot | null
  privateThought?: AlicizationPrivateThoughtSnapshot | null
}) {
  const hasLiveAnchor = Boolean(
    input.currentScene
    || input.worldModel?.activeThread
    || input.watchMode === 'recovering',
  )

  if (!hasLiveAnchor) {
    return {
      livingWorldState: input.livingWorldState ?? null,
      selfGovernor: input.selfGovernor ?? null,
      thoughtThreads: input.thoughtThreads ?? null,
    }
  }

  const livingWorldState
    = input.livingWorldState && input.livingWorldState.objects.length > 0 && input.livingWorldState.focusObjectId
      ? input.livingWorldState
      : buildFallbackLivingWorldState({
          now: input.now,
          currentScene: input.currentScene,
          worldModel: input.worldModel,
          previous: input.livingWorldState ?? null,
        })

  const selfGovernor
    = input.selfGovernor && input.selfGovernor.activeIntentions.length > 0 && input.selfGovernor.dominantDrive
      ? input.selfGovernor
      : buildFallbackSelfGovernor({
          now: input.now,
          worldModel: input.worldModel,
          livingWorldState,
          relationshipModel: input.relationshipModel,
          privateThought: input.privateThought,
          previous: input.selfGovernor ?? null,
        })

  const thoughtThreads
    = input.thoughtThreads && input.thoughtThreads.threads.length > 0 && input.thoughtThreads.foregroundThreadId
      ? input.thoughtThreads
      : buildFallbackThoughtThreads({
          now: input.now,
          worldModel: input.worldModel,
          livingWorldState,
          selfGovernor,
          privateThought: input.privateThought,
          previous: input.thoughtThreads ?? null,
        })

  return {
    livingWorldState,
    selfGovernor,
    thoughtThreads,
  }
}
