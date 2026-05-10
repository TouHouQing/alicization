import type {
  AlicizationMindTurnEventInput,
  AlicizationVisualPresenceStateSnapshot,
  AlicizationDurabilityPulseSnapshot,
  AlicizationEntityWorldModelSnapshot,
  AlicizationLivingWorldObjectKind,
  AlicizationLivingWorldObjectSnapshot,
  AlicizationLivingWorldStateSnapshot,
  AlicizationVisualSceneSnapshot,
  AlicizationVisualTransitionSnapshot,
  AlicizationVisualWatchMode,
  AlicizationWorldModelSnapshot,
} from '../../../shared/eventa'
import type { AlicizationProactiveLayeredContext } from './proactive-layered-context'

import { createAlicizationContinuityMind } from './continuity-mind'

const coolingObjectTtlMs = 30 * 60_000

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

function isSeriousDurabilityPulse(pulse: AlicizationDurabilityPulseSnapshot | null | undefined) {
  return pulse?.kind === 'process-gone'
    || pulse?.kind === 'render-process-gone'
    || pulse?.kind === 'child-process-gone'
    || pulse?.kind === 'anr-likely'
}

function createObject(input: {
  now: number
  previous?: AlicizationLivingWorldObjectSnapshot | null
  id: string
  kind: AlicizationLivingWorldObjectKind
  status: AlicizationLivingWorldObjectSnapshot['status']
  label: string
  summary: string
  confidence: number
  salience: number
  continuity: number
  lastChange: string
  openLoop?: string
  entityIds?: string[]
  threadIds?: string[]
  evidence?: string[]
}): AlicizationLivingWorldObjectSnapshot {
  return {
    id: input.id,
    kind: input.kind,
    status: input.status,
    label: sanitizeText(input.label, 140) || 'current-world-object',
    summary: sanitizeText(input.summary, 220) || sanitizeText(input.label, 140) || 'current-world-object',
    confidence: clamp01(Math.max(input.confidence, input.previous?.confidence ?? 0)),
    salience: clamp01(Math.max(input.salience, input.previous?.salience ?? 0)),
    continuity: clamp01(Math.max(input.continuity, input.previous?.continuity ?? 0)),
    lastChange: sanitizeText(input.lastChange, 180) || 'continuity-holding',
    openLoop: sanitizeText(input.openLoop, 160) || undefined,
    entityIds: dedupeTexts([...(input.previous?.entityIds ?? []), ...(input.entityIds ?? [])]),
    threadIds: dedupeTexts([...(input.previous?.threadIds ?? []), ...(input.threadIds ?? [])]),
    evidence: dedupeTexts([...(input.previous?.evidence ?? []), ...(input.evidence ?? [])]).slice(0, 8),
    firstSeenAt: input.previous?.firstSeenAt ?? input.now,
    lastUpdatedAt: input.now,
  }
}

function coolingCarry(previous: AlicizationLivingWorldObjectSnapshot, now: number): AlicizationLivingWorldObjectSnapshot {
  return {
    ...previous,
    status: 'cooling',
    confidence: clamp01(previous.confidence * 0.92),
    salience: clamp01(previous.salience * 0.9),
    continuity: clamp01(previous.continuity * 0.86),
    lastUpdatedAt: now,
  }
}

function upsertObject(
  objects: Map<string, AlicizationLivingWorldObjectSnapshot>,
  nextObject: AlicizationLivingWorldObjectSnapshot | null,
) {
  if (!nextObject)
    return

  const previous = objects.get(nextObject.id)
  if (!previous) {
    objects.set(nextObject.id, nextObject)
    return
  }

  objects.set(nextObject.id, {
    ...previous,
    ...nextObject,
    status: nextObject.status === 'active' ? 'active' : nextObject.status,
    confidence: clamp01(Math.max(previous.confidence, nextObject.confidence)),
    salience: clamp01(Math.max(previous.salience, nextObject.salience)),
    continuity: clamp01(Math.max(previous.continuity, nextObject.continuity)),
    entityIds: dedupeTexts([...previous.entityIds, ...nextObject.entityIds]),
    threadIds: dedupeTexts([...previous.threadIds, ...nextObject.threadIds]),
    evidence: dedupeTexts([...previous.evidence, ...nextObject.evidence]).slice(0, 8),
    firstSeenAt: Math.min(previous.firstSeenAt, nextObject.firstSeenAt),
    lastUpdatedAt: Math.max(previous.lastUpdatedAt, nextObject.lastUpdatedAt),
  })
}

function resolveActiveFocusEntity(model: AlicizationEntityWorldModelSnapshot) {
  return model.entities.find(entity => entity.id === model.focusEntityId)
    ?? model.entities.find(entity => entity.status === 'active')
    ?? model.entities[0]
    ?? null
}

function buildThreadObject(input: {
  now: number
  context: AlicizationProactiveLayeredContext
  worldModel: AlicizationWorldModelSnapshot
  entityWorld: AlicizationEntityWorldModelSnapshot
  previous?: AlicizationLivingWorldObjectSnapshot | null
}) {
  const activeThread = input.worldModel.activeThread
  if (!activeThread)
    return null

  const focusEntity = resolveActiveFocusEntity(input.entityWorld)
  const threadKind = activeThread.kind === 'recovery' ? 'incident' : 'thread'
  const openLoop = activeThread.unresolved
    ? input.worldModel.epistemicState.openQuestions[0] ?? input.entityWorld.openLoops[0] ?? activeThread.summary
    : ''

  return createObject({
    now: input.now,
    previous: input.previous,
    id: stableId(`living-world:${threadKind}`, [activeThread.kind, activeThread.title, activeThread.target?.pid ?? null]),
    kind: threadKind,
    status: activeThread.status === 'forming' ? 'forming' : 'active',
    label: activeThread.title,
    summary: activeThread.summary,
    confidence: activeThread.confidence,
    salience: activeThread.significance,
    continuity: activeThread.unresolved
      ? 0.84
      : input.worldModel.continuity.sameSceneAsBefore
        ? 0.78
        : 0.56,
    lastChange: input.worldModel.continuity.label,
    openLoop,
    entityIds: focusEntity ? [focusEntity.id] : [],
    threadIds: [activeThread.id],
    evidence: [
      `thread-kind:${activeThread.kind}`,
      `certainty:${input.worldModel.epistemicState.certainty}`,
      `availability:${input.worldModel.hostState.availability}`,
    ],
  })
}

function buildArtifactObject(input: {
  now: number
  context: AlicizationProactiveLayeredContext
  watchMode: AlicizationVisualWatchMode
  scene: AlicizationVisualSceneSnapshot | null
  worldModel: AlicizationWorldModelSnapshot
  entityWorld: AlicizationEntityWorldModelSnapshot
  previous?: AlicizationLivingWorldObjectSnapshot | null
}) {
  const focusEntity = resolveActiveFocusEntity(input.entityWorld)
  const label = sanitizeText(
    focusEntity?.label
    ?? input.scene?.summary
    ?? input.worldModel.focusTarget?.title
    ?? input.context.system.foregroundWindow?.title,
    140,
  )
  if (!label)
    return null

  const openLoop = input.context.content.kind === 'unknown'
    ? input.worldModel.epistemicState.openQuestions[0] ?? ''
    : ''

  return createObject({
    now: input.now,
    previous: input.previous,
    id: stableId('living-world:artifact', [
      focusEntity?.id ?? '',
      label,
      input.worldModel.focusTarget?.pid ?? null,
    ]),
    kind: 'artifact',
    status: input.scene && input.scene.confidence >= 0.72 ? 'active' : 'forming',
    label,
    summary: sanitizeText(
      input.scene?.summary
      ?? focusEntity?.summary
      ?? input.worldModel.activeThread?.summary
      ?? label,
      220,
    ),
    confidence: Math.max(input.scene?.confidence ?? 0.34, focusEntity?.confidence ?? 0.34),
    salience: clamp01(
      (input.scene?.confidence ?? 0.3) * 0.38
      + (focusEntity?.salience ?? 0.28) * 0.4
      + (input.watchMode === 'symbiotic-vision' ? 0.16 : 0.08),
    ),
    continuity: clamp01(
      (input.worldModel.continuity.sameSceneAsBefore ? 0.42 : 0.18)
      + (focusEntity?.status === 'active' ? 0.24 : 0.08)
      + (input.watchMode === 'symbiotic-vision' ? 0.16 : 0.04),
    ),
    lastChange: input.scene?.source ?? input.worldModel.continuity.label,
    openLoop,
    entityIds: focusEntity ? [focusEntity.id] : [],
    threadIds: input.worldModel.activeThread ? [input.worldModel.activeThread.id] : [],
    evidence: [
      input.scene ? `scene:${input.scene.source}` : '',
      focusEntity?.kind ? `entity:${focusEntity.kind}` : '',
      `watch:${input.watchMode}`,
    ],
  })
}

function buildSessionObject(input: {
  now: number
  context: AlicizationProactiveLayeredContext
  watchMode: AlicizationVisualWatchMode
  scene: AlicizationVisualSceneSnapshot | null
  worldModel: AlicizationWorldModelSnapshot
  recentTransition?: AlicizationVisualTransitionSnapshot | null
  previous?: AlicizationLivingWorldObjectSnapshot | null
}) {
  const lateNightSession = input.context.localTime.isLateNight && input.context.relationship.lateNightActiveMinutes >= 60
  const afterglowSession = input.worldModel.continuity.afterglowOpen
  const covisionSession = input.watchMode === 'symbiotic-vision'
  if (!lateNightSession && !afterglowSession && !covisionSession)
    return null

  const label = lateNightSession
    ? 'late-night-session'
    : afterglowSession
      ? 'afterglow-window'
      : 'covision-session'
  const summary = lateNightSession
    ? 'The host is still carrying the current session deep into the night.'
    : afterglowSession
      ? 'The shared scene just loosened but is still warm enough to matter.'
      : 'A shared scene is holding long enough to feel like an ongoing session.'

  return createObject({
    now: input.now,
    previous: input.previous,
    id: stableId('living-world:session', [
      input.scene?.scenario ?? input.worldModel.activeThread?.kind ?? 'session',
      label,
      input.recentTransition?.occurredAt ?? input.scene?.beganAt ?? 0,
    ]),
    kind: 'session',
    status: afterglowSession ? 'active' : 'forming',
    label,
    summary,
    confidence: lateNightSession ? 0.82 : afterglowSession ? 0.78 : 0.64,
    salience: lateNightSession ? 0.72 : afterglowSession ? 0.68 : 0.54,
    continuity: lateNightSession
      ? 0.88
      : afterglowSession
        ? 0.82
        : 0.66,
    lastChange: input.worldModel.continuity.label,
    openLoop: afterglowSession ? 'shared-thread-still-warm' : '',
    threadIds: input.worldModel.activeThread ? [input.worldModel.activeThread.id] : [],
    evidence: [
      lateNightSession ? 'late-night-active' : '',
      afterglowSession ? 'afterglow-open' : '',
      covisionSession ? 'symbiotic-vision' : '',
    ],
  })
}

function buildIncidentObject(input: {
  now: number
  pulse?: AlicizationDurabilityPulseSnapshot | null
  previous?: AlicizationLivingWorldObjectSnapshot | null
}) {
  if (!isSeriousDurabilityPulse(input.pulse))
    return null

  return createObject({
    now: input.now,
    previous: input.previous,
    id: stableId('living-world:incident', [
      input.pulse?.kind ?? '',
      input.pulse?.pid ?? null,
      input.pulse?.title ?? '',
      input.pulse?.detectedAt ?? 0,
    ]),
    kind: 'incident',
    status: 'active',
    label: sanitizeText(input.pulse?.title ?? input.pulse?.appName ?? input.pulse?.processName, 140) || 'foreground-incident',
    summary: sanitizeText(input.pulse?.detail ?? input.pulse?.title ?? input.pulse?.appName, 220) || 'A serious foreground durability event was detected.',
    confidence: 0.95,
    salience: 0.96,
    continuity: 0.92,
    lastChange: input.pulse?.kind ?? 'incident',
    openLoop: 'foreground-incident-needs-revision',
    evidence: [
      input.pulse?.kind ? `pulse:${input.pulse.kind}` : '',
      input.pulse?.source ? `source:${input.pulse.source}` : '',
      input.pulse?.pid ? `pid:${input.pulse.pid}` : '',
    ],
  })
}

function resolveRelationshipPressure(state: AlicizationVisualPresenceStateSnapshot) {
  return clamp01(
    (
      (state.relationshipModel?.receptivity ?? 0)
      + (state.relationshipModel?.sharedAttentionTrust ?? 0)
      + (state.relationshipModel?.reciprocityExpectation ?? 0)
    ) / 3,
  )
}

function deriveQuietCompanionshipState(input: {
  now: number
  state: AlicizationVisualPresenceStateSnapshot
}) {
  return createAlicizationContinuityMind().reduce({
    quietLineMs: Math.max(0, Number(input.state.quietLineMs ?? 0)),
    bodyState: input.state.currentBodyState,
    latestThreadSummary: input.state.worldModel?.activeThread?.summary ?? null,
    relationshipPressure: resolveRelationshipPressure(input.state),
    personaAuthoritySummary: input.state.autobiographicalSelf?.relationshipDoctrine ?? null,
    personaKernelSummary: [
      input.state.autobiographicalSelf?.personaDrift?.conflictStyle ? `conflict ${input.state.autobiographicalSelf.personaDrift.conflictStyle}` : '',
      input.state.autobiographicalSelf?.personaDrift?.agencyStyle ? `agency ${input.state.autobiographicalSelf.personaDrift.agencyStyle}` : '',
      input.state.autobiographicalSelf?.personaDrift?.attachmentStyle ? `attachment ${input.state.autobiographicalSelf.personaDrift.attachmentStyle}` : '',
    ].filter(Boolean).join(' | ') || null,
    latestUserTurnAt: null,
    now: input.now,
  })
}

export interface AlicizationQuietCompanionshipOutcome {
  mode: 'quiet-companionship'
  label: 'quiet-companionship'
  summary: string
  quietLineMs: number
  shouldDispatchSilentPresencePulse: boolean
}

export function deriveQuietCompanionshipOutcome(input: {
  now: number
  state: AlicizationVisualPresenceStateSnapshot
  previousState?: AlicizationVisualPresenceStateSnapshot | null
  activeConversation: boolean
}): AlicizationQuietCompanionshipOutcome | null {
  const continuityMindState = deriveQuietCompanionshipState({
    now: input.now,
    state: input.state,
  })
  const sustainedFocusMs = Math.max(0, Number(input.state.quietLineMs ?? 0))
  const shouldEnterQuietCompanionship
    = sustainedFocusMs >= 120_000
      && input.state.currentBodyState === 'accompanying'
      && continuityMindState.privateThoughtMode === 'quiet-companionship'
      && !input.activeConversation

  if (!shouldEnterQuietCompanionship)
    return null

  const previousContinuityMindState = input.previousState
    ? deriveQuietCompanionshipState({
        now: input.now,
        state: input.previousState,
      })
    : null
  const previousQualified = Boolean(
    input.previousState
    && Math.max(0, Number(input.previousState.quietLineMs ?? 0)) >= 120_000
    && input.previousState.currentBodyState === 'accompanying'
    && previousContinuityMindState?.privateThoughtMode === 'quiet-companionship',
  )

  return {
    mode: 'quiet-companionship',
    label: 'quiet-companionship',
    summary: continuityMindState.subjectiveNowSummary,
    quietLineMs: sustainedFocusMs,
    shouldDispatchSilentPresencePulse: !previousQualified,
  }
}

export function buildQuietCompanionshipMindTurnEvent(input: {
  now: number
  decisionTraceId: string
  sessionId?: string | null
  turnId?: string | null
  outcome: AlicizationQuietCompanionshipOutcome
}): AlicizationMindTurnEventInput {
  return {
    decisionTraceId: input.decisionTraceId,
    turnId: input.turnId ?? null,
    sessionId: input.sessionId ?? null,
    origin: 'system',
    kind: 'presence-pulse-dispatched',
    payload: {
      mode: input.outcome.mode,
      summary: input.outcome.summary,
      quietLineMs: input.outcome.quietLineMs,
      label: input.outcome.label,
    },
    createdAt: input.now,
  }
}

export function buildLivingWorldState(input: {
  now: number
  context: AlicizationProactiveLayeredContext
  watchMode: AlicizationVisualWatchMode
  scene: AlicizationVisualSceneSnapshot | null
  worldModel: AlicizationWorldModelSnapshot
  entityWorld: AlicizationEntityWorldModelSnapshot
  recentTransition?: AlicizationVisualTransitionSnapshot | null
  durabilityPulse?: AlicizationDurabilityPulseSnapshot | null
  previous?: AlicizationLivingWorldStateSnapshot | null
}): AlicizationLivingWorldStateSnapshot {
  const previousObjects = new Map((input.previous?.objects ?? []).map(object => [object.id, object]))
  const objects = new Map<string, AlicizationLivingWorldObjectSnapshot>()

  const threadObject = buildThreadObject({
    now: input.now,
    context: input.context,
    worldModel: input.worldModel,
    entityWorld: input.entityWorld,
    previous: input.worldModel.activeThread
      ? previousObjects.get(stableId(
        `living-world:${input.worldModel.activeThread.kind === 'recovery' ? 'incident' : 'thread'}`,
        [input.worldModel.activeThread.kind, input.worldModel.activeThread.title, input.worldModel.activeThread.target?.pid ?? null],
      )) ?? null
      : null,
  })
  upsertObject(objects, threadObject)

  const artifactObject = buildArtifactObject({
    now: input.now,
    context: input.context,
    watchMode: input.watchMode,
    scene: input.scene,
    worldModel: input.worldModel,
    entityWorld: input.entityWorld,
    previous: previousObjects.get(stableId('living-world:artifact', [
      resolveActiveFocusEntity(input.entityWorld)?.id ?? '',
      resolveActiveFocusEntity(input.entityWorld)?.label
      ?? input.scene?.summary
      ?? input.worldModel.focusTarget?.title
      ?? input.context.system.foregroundWindow?.title
      ?? '',
      input.worldModel.focusTarget?.pid ?? null,
    ])) ?? null,
  })
  upsertObject(objects, artifactObject)

  const sessionObject = buildSessionObject({
    now: input.now,
    context: input.context,
    watchMode: input.watchMode,
    scene: input.scene,
    worldModel: input.worldModel,
    recentTransition: input.recentTransition,
    previous: previousObjects.get(stableId('living-world:session', [
      input.scene?.scenario ?? input.worldModel.activeThread?.kind ?? 'session',
      input.worldModel.continuity.afterglowOpen
        ? 'afterglow-window'
        : input.context.localTime.isLateNight && input.context.relationship.lateNightActiveMinutes >= 60
          ? 'late-night-session'
          : 'covision-session',
      input.recentTransition?.occurredAt ?? input.scene?.beganAt ?? 0,
    ])) ?? null,
  })
  upsertObject(objects, sessionObject)

  const incidentObject = buildIncidentObject({
    now: input.now,
    pulse: input.durabilityPulse,
    previous: input.durabilityPulse
      ? previousObjects.get(stableId('living-world:incident', [
        input.durabilityPulse.kind ?? '',
        input.durabilityPulse.pid ?? null,
        input.durabilityPulse.title ?? '',
        input.durabilityPulse.detectedAt ?? 0,
      ])) ?? null
      : null,
  })
  upsertObject(objects, incidentObject)

  for (const previousObject of previousObjects.values()) {
    if (objects.has(previousObject.id))
      continue
    if (input.now - previousObject.lastUpdatedAt > coolingObjectTtlMs)
      continue
    upsertObject(objects, coolingCarry(previousObject, input.now))
  }

  const sortedObjects = [...objects.values()]
    .sort((left, right) => {
      const leftActive = left.status === 'active' ? 1 : left.status === 'forming' ? 0.8 : 0.3
      const rightActive = right.status === 'active' ? 1 : right.status === 'forming' ? 0.8 : 0.3
      return (right.salience + right.continuity * 0.4 + rightActive) - (left.salience + left.continuity * 0.4 + leftActive)
    })
    .slice(0, 8)

  const activeObjectIds = sortedObjects
    .filter(object => object.status === 'active' || object.status === 'forming')
    .map(object => object.id)

  const focusObjectId = activeObjectIds[0] ?? sortedObjects[0]?.id ?? null
  const openLoops = dedupeTexts([
    ...sortedObjects.map(object => object.openLoop),
    ...input.worldModel.epistemicState.openQuestions,
    ...input.entityWorld.openLoops,
  ]).slice(0, 6)
  const stability = isSeriousDurabilityPulse(input.durabilityPulse)
    || input.worldModel.epistemicState.certainty === 'uncertain'
    || input.worldModel.epistemicState.certainty === 'lingering'
    ? 'fractured'
    : input.worldModel.continuity.label === 'scene-shift'
      || input.worldModel.continuity.label === 'afterglow'
      || input.worldModel.continuity.label === 'recovery'
      || openLoops.length >= 2
      ? 'shifting'
      : 'stable'

  const narrative = dedupeTexts([
    focusObjectId ? `focus:${focusObjectId}` : '',
    `stability:${stability}`,
    input.worldModel.activeThread?.kind ? `thread:${input.worldModel.activeThread.kind}` : '',
    input.entityWorld.focusEntityId ? `entity:${input.entityWorld.focusEntityId}` : '',
    openLoops[0] ? `open-loop:${openLoops[0]}` : '',
  ]).slice(0, 6)

  return {
    focusObjectId,
    activeObjectIds,
    objects: sortedObjects,
    openLoops,
    stability,
    narrative,
    updatedAt: input.now,
  }
}
