import type {
  AlicizationDurabilityPulseSnapshot,
  AlicizationEntityWorldModelSnapshot,
  AlicizationVisualAttentionSnapshot,
  AlicizationVisualEpisode,
  AlicizationVisualSceneSnapshot,
  AlicizationVisualTarget,
  AlicizationWorldEntityKind,
  AlicizationWorldEntitySnapshot,
  AlicizationWorldModelSnapshot,
  AlicizationWorldRelationKind,
  AlicizationWorldRelationSnapshot,
} from '../../../shared/eventa'
import type { AlicizationProactiveLayeredContext } from './proactive-layered-context'

const entityLingeringTtlMs = 20 * 60_000
const maxEntities = 12

function clamp01(value: number) {
  if (!Number.isFinite(value))
    return 0
  return Math.max(0, Math.min(1, Number(value.toFixed(2))))
}

function sanitizeText(raw: unknown, maxChars = 160) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function normalizePid(raw: unknown) {
  const parsed = Number(raw)
  return Number.isFinite(parsed) && parsed > 0
    ? Math.floor(parsed)
    : null
}

function normalizeTarget(raw: AlicizationVisualTarget | null | undefined) {
  if (!raw)
    return null
  const appName = sanitizeText(raw.appName, 120)
  const processName = sanitizeText(raw.processName, 120)
  const title = sanitizeText(raw.title, 220)
  const pid = normalizePid(raw.pid)
  if (!appName && !processName && !title && pid === null)
    return null
  return {
    appName: appName || undefined,
    processName: processName || undefined,
    title: title || undefined,
    pid,
  }
}

function signature(parts: Array<string | number | null | undefined>) {
  return parts
    .map((part) => {
      if (typeof part === 'number')
        return String(part)
      return sanitizeText(part ?? '', 160).toLowerCase()
    })
    .filter(Boolean)
    .join('::')
}

function stableEntityId(kind: AlicizationWorldEntityKind, parts: Array<string | number | null | undefined>) {
  return `${kind}::${signature(parts) || 'unknown'}`
}

function isSeriousDurabilityPulse(pulse: AlicizationDurabilityPulseSnapshot | null | undefined) {
  return pulse?.kind === 'process-gone'
    || pulse?.kind === 'render-process-gone'
    || pulse?.kind === 'child-process-gone'
    || pulse?.kind === 'anr-likely'
}

function mergeEvidence(...collections: string[][]) {
  return [...new Set(collections.flat().map(item => sanitizeText(item, 120)).filter(Boolean))].slice(0, 8)
}

function buildEntity(input: {
  now: number
  previous?: AlicizationWorldEntitySnapshot
  id: string
  kind: AlicizationWorldEntityKind
  label: string
  summary?: string
  confidence: number
  salience: number
  source: AlicizationWorldEntitySnapshot['source']
  evidence: string[]
  target?: AlicizationVisualTarget | null
}): AlicizationWorldEntitySnapshot {
  return {
    id: input.id,
    kind: input.kind,
    status: 'active',
    label: sanitizeText(input.label, 120) || 'unknown',
    summary: sanitizeText(input.summary, 220) || undefined,
    confidence: clamp01(Math.max(input.confidence, input.previous?.confidence ?? 0)),
    salience: clamp01(Math.max(input.salience, input.previous?.salience ?? 0)),
    source: input.source,
    evidence: mergeEvidence(input.previous?.evidence ?? [], input.evidence),
    firstSeenAt: input.previous?.firstSeenAt ?? input.now,
    lastSeenAt: input.now,
    target: normalizeTarget(input.target),
  }
}

function makeRelation(fromId: string | null | undefined, toId: string | null | undefined, kind: AlicizationWorldRelationKind, confidence: number) {
  if (!fromId || !toId || fromId === toId)
    return null
  return {
    fromId,
    toId,
    kind,
    confidence: clamp01(confidence),
  } satisfies AlicizationWorldRelationSnapshot
}

function upsertEntity(
  entities: Map<string, AlicizationWorldEntitySnapshot>,
  entity: AlicizationWorldEntitySnapshot | null,
) {
  if (!entity)
    return
  const previous = entities.get(entity.id)
  if (!previous) {
    entities.set(entity.id, entity)
    return
  }

  entities.set(entity.id, {
    ...previous,
    ...entity,
    status: 'active',
    confidence: clamp01(Math.max(previous.confidence, entity.confidence)),
    salience: clamp01(Math.max(previous.salience, entity.salience)),
    evidence: mergeEvidence(previous.evidence, entity.evidence),
    firstSeenAt: Math.min(previous.firstSeenAt, entity.firstSeenAt),
    lastSeenAt: Math.max(previous.lastSeenAt, entity.lastSeenAt),
  })
}

function buildArtifactKind(input: {
  scene: AlicizationVisualSceneSnapshot | null
  context: AlicizationProactiveLayeredContext
}) {
  if (input.scene?.contentKind === 'video' || input.scene?.contentKind === 'music' || input.context.content.kind === 'video' || input.context.content.kind === 'music')
    return 'media' as const
  if (input.scene?.contentKind === 'chat' || input.context.content.kind === 'chat')
    return 'conversation' as const
  return 'artifact' as const
}

function buildArtifactLabel(input: {
  scene: AlicizationVisualSceneSnapshot | null
  worldModel: AlicizationWorldModelSnapshot
  target: AlicizationVisualTarget | null
  context: AlicizationProactiveLayeredContext
}) {
  return sanitizeText(
    input.scene?.summary
    ?? input.worldModel.activeThread?.title
    ?? input.target?.title
    ?? input.context.content.summary
    ?? input.context.system.foregroundWindow?.title
    ?? '',
    140,
  )
}

function worldThreadEntityId(worldModel: AlicizationWorldModelSnapshot) {
  const thread = worldModel.activeThread
  if (!thread)
    return null
  return stableEntityId('task', [
    thread.kind,
    thread.title,
    thread.target?.pid ?? null,
  ])
}

export function buildEntityWorldModel(input: {
  now: number
  context: AlicizationProactiveLayeredContext
  scene: AlicizationVisualSceneSnapshot | null
  attention: AlicizationVisualAttentionSnapshot | null
  worldModel: AlicizationWorldModelSnapshot
  previousModel?: AlicizationEntityWorldModelSnapshot | null
  workingMemoryEpisodes?: AlicizationVisualEpisode[]
  durabilityPulse?: AlicizationDurabilityPulseSnapshot | null
}): AlicizationEntityWorldModelSnapshot {
  const previousEntities = Array.isArray(input.previousModel?.entities)
    ? input.previousModel.entities
    : []
  const entities = new Map<string, AlicizationWorldEntitySnapshot>()
  const relations = new Map<string, AlicizationWorldRelationSnapshot>()
  const activeEntityIds: string[] = []
  const focusTarget = normalizeTarget(
    input.attention?.target
    ?? input.scene?.target
    ?? input.worldModel.focusTarget
    ?? input.context.system.foregroundWindow,
  )

  const appLabel = sanitizeText(focusTarget?.appName ?? '', 80)
  const processLabel = sanitizeText(focusTarget?.processName ?? focusTarget?.appName ?? '', 80)
  const windowLabel = sanitizeText(focusTarget?.title ?? processLabel ?? appLabel, 160)
  const appId = appLabel ? stableEntityId('app', [appLabel]) : null
  const processId = processLabel || focusTarget?.pid
    ? stableEntityId('process', [focusTarget?.pid ?? null, processLabel, appLabel])
    : null
  const windowId = windowLabel
    ? stableEntityId('window', [focusTarget?.pid ?? null, windowLabel, processLabel])
    : null

  const previousById = new Map(previousEntities.map(entity => [entity.id, entity]))

  if (appId) {
    upsertEntity(entities, buildEntity({
      now: input.now,
      previous: previousById.get(appId),
      id: appId,
      kind: 'app',
      label: appLabel,
      confidence: Math.max(input.scene?.confidence ?? 0, input.attention?.confidence ?? 0.4),
      salience: 0.42 + Math.max(input.scene?.confidence ?? 0, input.attention?.confidence ?? 0.2) * 0.32,
      source: input.scene ? 'scene' : 'attention',
      evidence: [
        input.scene ? `scene:${input.scene.source}` : '',
        input.attention ? `attention:${input.attention.source}` : '',
      ],
      target: focusTarget,
    }))
    activeEntityIds.push(appId)
  }

  if (processId) {
    upsertEntity(entities, buildEntity({
      now: input.now,
      previous: previousById.get(processId),
      id: processId,
      kind: 'process',
      label: processLabel || 'foreground-process',
      summary: focusTarget?.pid ? `pid:${focusTarget.pid}` : undefined,
      confidence: Math.max(input.scene?.confidence ?? 0, input.attention?.confidence ?? 0.36),
      salience: 0.48 + Math.max(input.scene?.confidence ?? 0, input.attention?.confidence ?? 0.2) * 0.28,
      source: input.scene ? 'scene' : 'attention',
      evidence: [
        focusTarget?.pid ? `pid:${focusTarget.pid}` : '',
        input.scene?.source ? `scene:${input.scene.source}` : '',
      ],
      target: focusTarget,
    }))
    activeEntityIds.push(processId)
  }

  if (windowId) {
    upsertEntity(entities, buildEntity({
      now: input.now,
      previous: previousById.get(windowId),
      id: windowId,
      kind: 'window',
      label: windowLabel,
      summary: sanitizeText(input.scene?.summary ?? input.worldModel.activeThread?.summary ?? '', 220) || undefined,
      confidence: Math.max(input.scene?.confidence ?? 0.2, input.attention?.confidence ?? 0.2),
      salience: 0.54 + Math.max(input.scene?.confidence ?? 0.18, input.attention?.confidence ?? 0.18) * 0.24,
      source: input.scene ? 'scene' : input.attention ? 'attention' : 'world-thread',
      evidence: [
        input.scene?.summary ? `summary:${sanitizeText(input.scene.summary, 72)}` : '',
        input.attention?.source ? `attention:${input.attention.source}` : '',
      ],
      target: focusTarget,
    }))
    activeEntityIds.push(windowId)
  }

  const taskId = worldThreadEntityId(input.worldModel)
  if (input.worldModel.activeThread && taskId) {
    const thread = input.worldModel.activeThread
    upsertEntity(entities, buildEntity({
      now: input.now,
      previous: previousById.get(taskId),
      id: taskId,
      kind: 'task',
      label: thread.title,
      summary: thread.summary,
      confidence: thread.confidence,
      salience: clamp01(0.56 + thread.significance * 0.36),
      source: thread.source === 'working-memory' ? 'working-memory' : thread.source === 'durability-pulse' ? 'durability' : 'world-thread',
      evidence: [
        `thread:${thread.kind}`,
        thread.unresolved ? 'unresolved' : '',
        input.worldModel.continuity.afterglowOpen ? 'afterglow' : '',
      ],
      target: thread.target ?? focusTarget,
    }))
    activeEntityIds.push(taskId)
  }

  const artifactKind = buildArtifactKind({
    scene: input.scene,
    context: input.context,
  })
  const artifactLabel = buildArtifactLabel({
    scene: input.scene,
    worldModel: input.worldModel,
    target: focusTarget,
    context: input.context,
  })
  const shouldMaterializeArtifact = Boolean(artifactLabel)
    && (
      artifactKind !== 'artifact'
      || input.context.content.kind !== 'unknown'
      || input.scene?.contentKind !== 'unknown'
      || input.worldModel.activeThread?.unresolved
    )
  const artifactId = shouldMaterializeArtifact
    ? stableEntityId(artifactKind, [
        input.scene?.contentKind ?? input.context.content.kind,
        artifactLabel,
      ])
    : null

  if (artifactId) {
    upsertEntity(entities, buildEntity({
      now: input.now,
      previous: previousById.get(artifactId),
      id: artifactId,
      kind: artifactKind,
      label: artifactLabel,
      summary: sanitizeText(input.scene?.summary ?? input.worldModel.activeThread?.summary ?? '', 220) || undefined,
      confidence: Math.max(input.scene?.confidence ?? 0, input.worldModel.activeThread?.confidence ?? 0.24, input.context.content.confidence ?? 0),
      salience: clamp01(
        0.44
        + Math.max(input.scene?.confidence ?? 0, input.context.content.confidence ?? 0) * 0.24
        + (input.worldModel.activeThread?.unresolved ? 0.18 : 0),
      ),
      source: input.scene ? 'scene' : 'world-thread',
      evidence: [
        `content:${input.scene?.contentKind ?? input.context.content.kind}`,
        input.context.content.summary ? `semantic:${sanitizeText(input.context.content.summary, 72)}` : '',
      ],
      target: focusTarget,
    }))
    activeEntityIds.push(artifactId)
  }

  if (isSeriousDurabilityPulse(input.durabilityPulse)) {
    const pulseTarget = normalizeTarget(input.durabilityPulse)
    const pulseId = stableEntityId('process', [
      pulseTarget?.pid ?? input.durabilityPulse?.pid ?? null,
      pulseTarget?.processName ?? input.durabilityPulse?.processName ?? '',
      pulseTarget?.appName ?? input.durabilityPulse?.appName ?? '',
    ])
    upsertEntity(entities, buildEntity({
      now: input.now,
      previous: previousById.get(pulseId),
      id: pulseId,
      kind: 'process',
      label: sanitizeText(input.durabilityPulse?.processName ?? input.durabilityPulse?.appName ?? 'foreground-process', 120) || 'foreground-process',
      summary: sanitizeText(input.durabilityPulse?.detail ?? input.durabilityPulse?.title ?? input.worldModel.activeThread?.summary ?? '', 220) || undefined,
      confidence: 0.96,
      salience: 0.98,
      source: 'durability',
      evidence: [
        input.durabilityPulse?.kind ? `pulse:${input.durabilityPulse.kind}` : '',
        input.durabilityPulse?.source ? `source:${input.durabilityPulse.source}` : '',
      ],
      target: pulseTarget,
    }))
    activeEntityIds.push(pulseId)
  }

  const relationList = [
    makeRelation(appId, processId, 'hosts', 0.92),
    makeRelation(processId, windowId, 'hosts', 0.92),
    makeRelation(windowId, taskId, 'focuses', Math.max(input.attention?.confidence ?? 0.5, input.scene?.confidence ?? 0.5)),
    makeRelation(taskId, artifactId, 'about', Math.max(input.scene?.confidence ?? 0.5, input.worldModel.activeThread?.confidence ?? 0.5)),
    makeRelation(windowId, artifactId, 'contains', Math.max(input.scene?.confidence ?? 0.44, input.context.content.confidence ?? 0.44)),
  ]

  for (const relation of relationList) {
    if (!relation)
      continue
    relations.set(`${relation.fromId}:${relation.kind}:${relation.toId}`, relation)
  }

  const previousFocusEntityId = input.previousModel?.focusEntityId ?? null
  if (input.worldModel.continuity.afterglowOpen && previousFocusEntityId && taskId) {
    const relation = makeRelation(previousFocusEntityId, taskId, 'continues', 0.72)
    if (relation)
      relations.set(`${relation.fromId}:${relation.kind}:${relation.toId}`, relation)
  }

  for (const previous of previousEntities) {
    if (entities.has(previous.id))
      continue
    const ageMs = input.now - previous.lastSeenAt
    if (ageMs > entityLingeringTtlMs)
      continue
    entities.set(previous.id, {
      ...previous,
      status: ageMs <= 5 * 60_000 ? 'lingering' : 'stale',
      confidence: clamp01(previous.confidence * 0.9),
      salience: clamp01(previous.salience * 0.84),
    })
  }

  const latestEpisode = (input.workingMemoryEpisodes ?? [])
    .slice()
    .sort((left, right) => right.endedAt - left.endedAt)[0]
  if (latestEpisode && input.now - latestEpisode.endedAt <= 10 * 60_000) {
    const memoryTaskId = stableEntityId('task', [latestEpisode.scene, latestEpisode.attentionTarget ?? latestEpisode.summary])
    if (!entities.has(memoryTaskId)) {
      entities.set(memoryTaskId, {
        id: memoryTaskId,
        kind: 'task',
        status: 'lingering',
        label: sanitizeText(latestEpisode.attentionTarget ?? latestEpisode.summary, 120) || 'recent-thread',
        summary: sanitizeText(latestEpisode.summary, 220) || undefined,
        confidence: clamp01(latestEpisode.confidence * 0.82),
        salience: clamp01(0.28 + latestEpisode.confidence * 0.24 + (latestEpisode.sedimentCandidate ? 0.14 : 0)),
        source: 'working-memory',
        evidence: mergeEvidence([
          `episode:${latestEpisode.scene}`,
          `tension:${latestEpisode.emotionalTension}`,
        ]),
        firstSeenAt: latestEpisode.beganAt,
        lastSeenAt: latestEpisode.endedAt,
        target: null,
      })
    }
  }

  const focusEntityId
    = artifactId
      ?? taskId
      ?? windowId
      ?? processId
      ?? appId
      ?? (input.previousModel?.focusEntityId ?? null)

  const openLoops = [
    ...input.worldModel.epistemicState.openQuestions,
    input.worldModel.activeThread?.unresolved
      ? sanitizeText(input.worldModel.activeThread.summary, 160)
      : '',
    input.previousModel?.focusEntityId
    && input.previousModel.focusEntityId !== focusEntityId
    && input.worldModel.epistemicState.certainty !== 'grounded'
      ? 'current attention may still be transitioning away from an older anchor'
      : '',
  ]
    .map(item => sanitizeText(item, 160))
    .filter(Boolean)
    .slice(0, 6)

  return {
    focusEntityId,
    activeEntityIds: [...new Set(activeEntityIds)].slice(0, 8),
    entities: [...entities.values()]
      .sort((left, right) => {
        const leftRank = (left.status === 'active' ? 2 : left.status === 'lingering' ? 1 : 0)
        const rightRank = (right.status === 'active' ? 2 : right.status === 'lingering' ? 1 : 0)
        return (rightRank * 10 + right.salience) - (leftRank * 10 + left.salience)
      })
      .slice(0, maxEntities),
    relations: [...relations.values()].slice(0, 16),
    openLoops,
    updatedAt: input.now,
  }
}
