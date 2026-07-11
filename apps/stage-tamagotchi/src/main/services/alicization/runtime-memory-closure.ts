import type {
  AlicizationEmotionalTransitionLedgerSnapshot,
  AlicizationEpisodicEventInput,
  AlicizationEpisodicEventRecord,
  AlicizationMemorySource,
  AlicizationMindTurnEventKind,
  AlicizationMindTurnEventRecord,
  AlicizationTaskThreadRecord,
} from '../../../shared/eventa'
import type { AlicizationDialogueSessionMirror } from './dialogue-session-manager'
import type {
  AlicizationEmbodimentContinuityLane,
  AlicizationEmbodimentContinuityLedger,
} from './embodiment-continuity-ledger'
import type {
  AlicizationHumanlikeMemoryCandidate,
  AlicizationHumanlikeMemoryHostCorrection,
} from './humanlike-memory'
import type { AlicizationKnowledgeAssimilationRuntime } from './knowledge-assimilation-runtime'
import type { AlicizationOutcomeClosureResult } from './outcome-reinforcement'
import type { AlicizationPersonStateUpdateSurface } from './person-state-update-surface'
import type { CardScopeOptions } from './runtime-soul'

import { buildAutobiographicalEpisodesFromPreparedMirror, buildAutobiographicalEpisodesFromSessionMirrorSync } from './autobiographical-episode-sync'
import { buildHumanlikeMemoryCandidate, sanitizeHumanlikeMemoryText } from './humanlike-memory'
import { attachSynthesizedReflections } from './outcome-reinforcement'
import { buildAlicizationPersonStateEvolutionEntry } from './person-state-evolution'
import { buildAlicizationPersonStateUpdateRecord, buildAlicizationPersonStateUpdateSurface } from './person-state-update-surface'
import { resolveAlicizationProjectStateBrief } from './project-state-brief'

function lowerHumanlikeMemoryText(...values: Array<string | null | undefined>) {
  return values.map(value => sanitizeHumanlikeMemoryText(value, 320)).filter(Boolean).join(' ').toLowerCase()
}

const memoryClosureFixedTemplateReplacement = 'relationship_continuity=present; source_template=excluded; visibility=memory-structured'
const memoryClosureFixedTemplateResiduePattern
  = /Before answering|same[- ]?her|same living line|same local-first digital life project|local-first digital life project|phase\s*1\s*:\s*local digital life|phase\s*1 local digital life|phase1_local_digital_life|phase-1-local-digital-life|digital[-_]life[-_]project|one continuous digital life|project_anchor=phase1_local_digital_life|同一个她|女仆|\bmaid\b/iu

function sanitizeMemoryClosureWritebackText(raw: unknown, maxChars = 640) {
  if (typeof raw !== 'string')
    return ''
  const normalized = raw.trim().replace(/\s+/g, ' ').slice(0, Math.max(0, maxChars)).trim()
  if (!normalized)
    return ''
  if (memoryClosureFixedTemplateResiduePattern.test(normalized))
    return memoryClosureFixedTemplateReplacement
  const sanitized = sanitizeHumanlikeMemoryText(normalized, maxChars)
  return memoryClosureFixedTemplateResiduePattern.test(sanitized)
    ? memoryClosureFixedTemplateReplacement
    : sanitized
}

function maxMemoryClosureWritebackCharsForKey(key: string) {
  if (/^(?:id|cardId|turnId|sessionId|decisionTraceId|activeThreadId|sourceKind|provenance|kind|origin|version)$/u.test(key))
    return 160
  if (/^(?:summary|lesson|relationshipMeaning|whatHappened|whatChanged|felt|sourceSummary|label|reason|actionSummary|projectStateContinuity|humanlikeMemoryCandidate)$/u.test(key))
    return 640
  return 420
}

function sanitizeMemoryClosureWritebackValue<T>(value: T, key = ''): T {
  if (typeof value === 'string')
    return sanitizeMemoryClosureWritebackText(value, maxMemoryClosureWritebackCharsForKey(key)) as T
  if (Array.isArray(value))
    return value.map(item => sanitizeMemoryClosureWritebackValue(item, key)) as T
  if (!value || typeof value !== 'object')
    return value

  const next: Record<string, unknown> = {}
  for (const [entryKey, entryValue] of Object.entries(value))
    next[entryKey] = sanitizeMemoryClosureWritebackValue(entryValue, entryKey)
  return next as T
}

interface CreateAlicizationRuntimeMemoryClosureOptions {
  now: () => number
  normalizeCardId: (raw: unknown) => string
  getActiveCardId: () => string
  withCardScope: <T>(nextCardIdRaw: unknown, task: () => Promise<T>, options?: CardScopeOptions) => Promise<T>
  errorMessageFrom: (error: unknown) => string | undefined
  ensureMindGovernanceDecisionTraceId: (raw: unknown, now?: number) => string
  knowledgeAssimilationRuntime: AlicizationKnowledgeAssimilationRuntime
  appendAuditLog: (input: {
    level: 'warning'
    category: string
    action: string
    message: string
    payload: Record<string, unknown>
  }, cardId?: string) => Promise<void>
  alicizationDb: {
    appendRelationshipOutcomes: (entries: AlicizationOutcomeClosureResult['relationshipOutcomes']) => Promise<unknown>
    appendEpisodicEvents: (events: AlicizationOutcomeClosureResult['episodicEvents'] | AlicizationEpisodicEventInput[]) => Promise<unknown>
    persistEpisodicReconsolidations?: (events: AlicizationEpisodicEventRecord[]) => Promise<unknown>
    appendPersonaReinforcementEvents: (events: AlicizationOutcomeClosureResult['reinforcementEvents']) => Promise<unknown>
    appendPersonStateEvolutionEntries: (entries: Array<{
      cardId: string
      decisionTraceId?: string | null
      turnId?: string | null
      sessionId?: string | null
      activeThreadId?: string | null
      sourceKind: 'relationship-outcome' | 'reinforcement' | 'person-state-update' | 'episodic-memory' | 'reflection'
      summary: string
      contexts?: string[] | null
      relationshipDoctrine?: string | null
      burdenLine?: string | null
      trustMeaning?: string | null
      dominantRung?: string | null
      sourceTrail?: Array<{
        kind: 'relationship-outcome' | 'reinforcement'
        sourceKind: 'reply' | 'proactive' | 'execution'
        summary: string
        createdAt: number
      }> | null
      shifts: Array<{
        kind: 'trust-shift' | 'closeness-shift' | 'repair-posture-shift' | 'autonomy-shift' | 'burden-shift' | 'execution-trust-shift' | 'relationship-doctrine-shift'
        delta: number
        rationale: string
      }>
      createdAt?: number
    }>) => Promise<unknown>
    upsertMemoryReflections: (reflections: AlicizationOutcomeClosureResult['reflections']) => Promise<unknown>
    upsertMemoryFacts: (facts: AlicizationOutcomeClosureResult['memoryFacts'], source: 'rule') => Promise<unknown>
    readMindHead: <T>(cardId: string, key: 'person-state-update-surface') => Promise<T | null>
    upsertMindHead: (cardId: string, key: 'person-state-update-surface', value: unknown) => Promise<unknown>
    appendMindTurnEvents: (events: Array<{
      decisionTraceId: string
      turnId?: string | null
      sessionId?: string | null
      origin?: 'user-turn' | 'subconscious-proactive' | 'system'
      kind: 'person-state-updated'
      payload: Record<string, unknown>
      createdAt: number
    }>) => Promise<unknown>
    listMindTurnEvents?: (input: {
      decisionTraceId?: string
      turnId?: string
      activeThreadId?: string
      kind?: AlicizationMindTurnEventKind
      limit?: number
    }) => Promise<AlicizationMindTurnEventRecord[]>
    applyMemoryFactCorrections?: (corrections: Array<{
      targetFactId: string
      nextValidationStatus: 'unverified' | 'provisional' | 'validated' | 'superseded'
      nextKnowledgeStage?: 'ephemeral-observation' | 'working-understanding' | 'validated-knowledge' | 'internalized-long-horizon-knowledge' | null
      sourceLabel?: string | null
      appendConflictsWith?: string[] | null
      appendSupersedes?: string[] | null
    }>) => Promise<unknown>
    listMemoryFacts?: () => Promise<Array<{
      id: string
      subject: string
      predicate: string
      object: string
      confidence: number
      source: AlicizationMemorySource
      dedupeKey: string
      createdAt: number
      updatedAt: number
      lastAccessAt: number | null
      accessCount: number
      knowledgeStage?: 'ephemeral-observation' | 'working-understanding' | 'validated-knowledge' | 'internalized-long-horizon-knowledge' | null
      validationStatus?: 'unverified' | 'provisional' | 'validated' | 'superseded' | null
      sourceLabel?: string | null
      conflictsWith?: string[] | null
      supersedes?: string[] | null
    }>>
  }
}

function uniqueClosureTexts(values: Array<string | null | undefined>, maxItems = 8) {
  const result: string[] = []
  for (const value of values) {
    const normalized = sanitizeHumanlikeMemoryText(value, 220)
    if (!normalized)
      continue
    if (result.some(item => item.toLowerCase() === normalized.toLowerCase()))
      continue
    result.push(normalized)
    if (result.length >= maxItems)
      break
  }
  return result
}

function clampHumanlikeReflectionConfidence(value: number, fallback = 0.72) {
  if (!Number.isFinite(value))
    return fallback
  return Math.max(0, Math.min(1, Number(value.toFixed(2))))
}

function normalizeEmotionalWritebackTag(raw: unknown, fallback: string) {
  const normalized = sanitizeHumanlikeMemoryText(raw, 64)
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9:-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
  return normalized || fallback
}

function buildEmotionalTransitionWritebackArtifacts(input: {
  cardId: string
  now: number
  ledger: AlicizationEmotionalTransitionLedgerSnapshot | null | undefined
}): Pick<AlicizationOutcomeClosureResult, 'episodicEvents' | 'reflections'> {
  const ledger = input.ledger ?? null
  if (!ledger?.memoryWriteback.shouldWrite || ledger.memoryWriteback.lane === 'none') {
    return {
      episodicEvents: [],
      reflections: [],
    }
  }

  const transitionKind = normalizeEmotionalWritebackTag(ledger.transitionKind, 'unknown')
  const memoryLane = normalizeEmotionalWritebackTag(ledger.memoryWriteback.lane, 'emotional-continuity')
  const initiativeMode = normalizeEmotionalWritebackTag(ledger.initiativeSuppression.mode, 'none')
  const embodimentTone = ledger.embodimentDrive.tone
    ? normalizeEmotionalWritebackTag(ledger.embodimentDrive.tone, 'body-tone')
    : ''
  const nextEmotion = normalizeEmotionalWritebackTag(ledger.nextEmotion, 'emotion')
  const previousEmotion = ledger.previousEmotion ? normalizeEmotionalWritebackTag(ledger.previousEmotion, 'previous-emotion') : ''
  const decisionTraceId = `emotional-transition:${ledger.turnId ?? 'turn-unknown'}:${Math.max(0, Math.floor(ledger.createdAt))}`
  const createdAt = Number.isFinite(ledger.createdAt) ? ledger.createdAt : input.now
  const decayCarryTtlMs = Math.max(0, Math.floor(Number(ledger.decayPolicy.carryTtlMs) || 0))
  const decayExpiresAt = Math.max(0, Math.floor(createdAt + decayCarryTtlMs))
  const transitionLine = `${ledger.previousEmotion ?? 'none'} -> ${ledger.nextEmotion}`
  const axisSummary = ledger.changedAxes.length > 0 ? ledger.changedAxes.join(', ') : 'none'
  const sourceSummaryParts = [
    `emotion_transition=${ledger.transitionKind}`,
    `emotion_memory_writeback=${ledger.memoryWriteback.lane}`,
    ledger.initiativeSuppression.mode !== 'none' ? `emotion_initiative=${ledger.initiativeSuppression.mode}` : '',
    ledger.embodimentDrive.tone ? `emotion_embodiment=${ledger.embodimentDrive.tone}` : '',
    `emotion_decay=${ledger.decayPolicy.mode}`,
    `emotion_decay_ttl_ms=${decayCarryTtlMs}`,
    `emotion_decay_expires_at=${decayExpiresAt}`,
  ].filter(Boolean)
  const emotionTags = [
    previousEmotion,
    nextEmotion,
    memoryLane,
    initiativeMode !== 'none' ? initiativeMode : '',
    embodimentTone,
    transitionKind,
  ].filter(Boolean)
  const tags = [
    'emotional-transition',
    `emotion-transition:${transitionKind}`,
    `emotion-memory:${memoryLane}`,
    initiativeMode !== 'none' ? `emotion-initiative:${initiativeMode}` : '',
    embodimentTone ? `emotion-embodiment:${embodimentTone}` : '',
    `emotion-decay:${normalizeEmotionalWritebackTag(ledger.decayPolicy.mode, 'decay')}`,
    `emotion-decay-ttl:${decayCarryTtlMs}`,
  ].filter(Boolean)
  const decayWindowLesson = `The emotional decay window lasts ${decayCarryTtlMs}ms and expires at ${decayExpiresAt} before this carry should be treated as released.`

  return {
    episodicEvents: [{
      cardId: input.cardId,
      decisionTraceId,
      turnId: ledger.turnId,
      sessionId: null,
      sourceKind: 'reflection',
      provenance: 'reconstructed',
      occurredAt: createdAt,
      whereSummary: null,
      withWhom: ['host'],
      threadAnchor: `emotional transition writeback: ${ledger.memoryWriteback.lane}`,
      whatHappened: `Emotional transition ${transitionLine} was marked for memory writeback.`,
      felt: ledger.traceSummary,
      emotionTags,
      whatChanged: `Changed emotional axes: ${axisSummary}; decay ${ledger.decayPolicy.mode} expires at ${decayExpiresAt}.`,
      relationshipMeaning: ledger.memoryWriteback.reason,
      lesson: [
        ledger.initiativeSuppression.reason,
        ledger.embodimentDrive.shouldDrive ? ledger.embodimentDrive.reason : '',
        decayWindowLesson,
      ].filter(Boolean).join(' '),
      sourceSummary: sourceSummaryParts.join(' | '),
      confidence: 0.82,
      salience: 0.72,
      sceneAttachment: 0.34,
      consolidationPriority: 0.76,
      relationshipShift: null,
      derivedFrom: ledger.replayLine
        ? [{ kind: 'turn', id: ledger.turnId ?? decisionTraceId, label: ledger.replayLine }]
        : [],
      tags,
      createdAt,
      updatedAt: createdAt,
    }],
    reflections: [{
      id: decisionTraceId,
      cardId: input.cardId,
      decisionTraceId,
      turnId: ledger.turnId,
      sessionId: null,
      sourceKind: 'maintenance',
      targetScope: ledger.memoryWriteback.lane === 'relationship-repair' ? 'relationship' : 'self',
      summary: `Emotional transition ${ledger.transitionKind} should stay recallable on ${ledger.memoryWriteback.lane}.`,
      lesson: `${ledger.memoryWriteback.reason} ${decayWindowLesson}`,
      status: 'confirmed',
      confidence: 0.82,
      supportingFactIds: [],
      supportingOutcomeIds: [],
      createdAt,
      updatedAt: createdAt,
    }],
  }
}

function joinEmbodimentLanes(lanes: AlicizationEmbodimentContinuityLane[]) {
  return lanes.length > 0 ? lanes.join('+') : 'none'
}

function buildEmbodimentContinuityWritebackArtifacts(input: {
  cardId: string
  now: number
  ledger: AlicizationEmbodimentContinuityLedger | null | undefined
}): Pick<AlicizationOutcomeClosureResult, 'episodicEvents' | 'reflections'> {
  const ledger = input.ledger ?? null
  if (!ledger?.memoryWriteback.shouldWrite || ledger.memoryWriteback.lane === 'none') {
    return {
      episodicEvents: [],
      reflections: [],
    }
  }

  const memoryLane = normalizeEmotionalWritebackTag(ledger.memoryWriteback.lane, 'cross-modal-continuity')
  const continuityPhase = normalizeEmotionalWritebackTag(ledger.continuityPhase, 'unknown')
  const carryingLanes = ledger.carryingLanes
  const droppedLanes = ledger.droppedLanes
  const pendingRejoinLanes = ledger.pendingRejoinLanes
  const rejoinedLanes = ledger.rejoinedLanes
  const decisionTraceId = `embodiment-continuity:${ledger.turnId ?? 'turn-unknown'}:${Math.max(0, Math.floor(ledger.createdAt))}`
  const createdAt = Number.isFinite(ledger.createdAt) ? ledger.createdAt : input.now
  const carryLine = `${joinEmbodimentLanes(carryingLanes)} carried continuity`
  const droppedLine = droppedLanes.length > 0 ? `${joinEmbodimentLanes(droppedLanes)} dropped` : 'no lane dropped'
  const rejoinLine = rejoinedLanes.length > 0
    ? `${joinEmbodimentLanes(rejoinedLanes)} rejoined`
    : `${joinEmbodimentLanes(pendingRejoinLanes)} still need rejoin`
  const sourceSummaryParts = [
    `embodiment_phase=${ledger.continuityPhase}`,
    `embodiment_memory_writeback=${ledger.memoryWriteback.lane}`,
    `embodiment_carrying=${joinEmbodimentLanes(carryingLanes)}`,
    `embodiment_dropped=${joinEmbodimentLanes(droppedLanes)}`,
    `embodiment_missing_lanes=${joinEmbodimentLanes(pendingRejoinLanes)}`,
    `embodiment_rejoined=${joinEmbodimentLanes(rejoinedLanes)}`,
    ledger.sourceTags.length > 0 ? `embodiment_sources=${ledger.sourceTags.join('+')}` : '',
  ].filter(Boolean)
  const tags = [
    'embodiment-continuity',
    `embodiment-phase-${continuityPhase}`,
    `embodiment-memory-${memoryLane}`,
    ...carryingLanes.map(lane => `embodiment-carry-${lane}`),
    ...droppedLanes.map(lane => `embodiment-dropped-${lane}`),
    ...pendingRejoinLanes.map(lane => `embodiment-partial-${lane}`),
    ...rejoinedLanes.map(lane => `embodiment-rejoined-${lane}`),
  ]
  const lesson = [
    ledger.selfRevisionCandidate.shouldPropose
      ? `Self-evolution should inspect ${ledger.selfRevisionCandidate.reasonCodes.join(', ')}.`
      : '',
    `Embodiment rejoin lanes: ${joinEmbodimentLanes(pendingRejoinLanes.length > 0 ? pendingRejoinLanes : rejoinedLanes)}.`,
  ].filter(Boolean).join(' ')

  return {
    episodicEvents: [{
      cardId: input.cardId,
      decisionTraceId,
      turnId: ledger.turnId,
      sessionId: null,
      sourceKind: 'reflection',
      provenance: 'reconstructed',
      occurredAt: createdAt,
      whereSummary: null,
      withWhom: ['host'],
      threadAnchor: `embodiment continuity writeback: ${ledger.memoryWriteback.lane}`,
      whatHappened: ledger.replayLine || `${carryLine} while ${droppedLine}; ${rejoinLine}.`,
      felt: ledger.traceSummary,
      emotionTags: ['embodiment-continuity', continuityPhase, memoryLane],
      whatChanged: `Embodiment continuity phase ${ledger.continuityPhase}; ${carryLine}; ${droppedLine}; ${rejoinLine}.`,
      relationshipMeaning: ledger.memoryWriteback.reason,
      lesson,
      sourceSummary: sourceSummaryParts.join(' | '),
      confidence: ledger.continuityPhase === 'fully-rejoined' ? 0.84 : 0.8,
      salience: ledger.continuityPhase === 'fully-rejoined' ? 0.68 : 0.76,
      sceneAttachment: 0.42,
      consolidationPriority: ledger.continuityPhase === 'fully-rejoined' ? 0.68 : 0.78,
      relationshipShift: null,
      derivedFrom: ledger.replayLine
        ? [{ kind: 'turn', id: ledger.turnId ?? decisionTraceId, label: ledger.replayLine }]
        : [],
      tags,
      createdAt,
      updatedAt: createdAt,
    }],
    reflections: [{
      id: decisionTraceId,
      cardId: input.cardId,
      decisionTraceId,
      turnId: ledger.turnId,
      sessionId: null,
      sourceKind: 'maintenance',
      targetScope: 'self',
      summary: `Embodiment continuity ${ledger.continuityPhase} should stay recallable on ${ledger.memoryWriteback.lane}.`,
      lesson: `${ledger.memoryWriteback.reason} ${lesson}`,
      status: 'confirmed',
      confidence: ledger.continuityPhase === 'fully-rejoined' ? 0.84 : 0.8,
      supportingFactIds: [],
      supportingOutcomeIds: [],
      createdAt,
      updatedAt: createdAt,
    }],
  }
}

function closureTextContains(text: string, pattern: RegExp) {
  return pattern.test(text.toLowerCase())
}

const humanlikeContinuityCuePattern = /same[- ]?her|same[- ]?person|same living line|one continuous|continuous digital life|tool shell|generic shell|generic task|断线|工具壳|同一个她|同一条线|持续的人|持续人格|数字生命/u
const humanlikeUnfinishedCuePattern = /unfinished|partial|open loop|not complete|closure|没收完|未完成|闭环|还缺|继续推进/u
const humanlikeEmbodimentCuePattern = /embodiment|body|face|gaze|blink|voice|pause|lipsync|motion|身体|表情|视线|眨眼|声音|停顿|动作/u
const humanlikeInitiativeStrategyCarryPattern = /future follow-ups|follow-up timing|clearer opening|fresher opening|leave more room|less eager|quieter timing|memory-led|still receiving them|reopening this line/u

function closureEventHasRuntimeEmbodimentTag(event: AlicizationOutcomeClosureResult['episodicEvents'][number]) {
  return (event.tags ?? []).some(tag => /^(?:body-|continuity-|residue-|facial-|action-|resident-mode-)/u.test(sanitizeHumanlikeMemoryText(tag, 60)))
}

function readClosureTagValue(tags: string[] | null | undefined, prefix: string) {
  for (const rawTag of tags ?? []) {
    const tag = sanitizeHumanlikeMemoryText(rawTag, 60)
    if (!tag.startsWith(prefix))
      continue
    return sanitizeHumanlikeMemoryText(tag, 48)
  }
  return ''
}

function readClosureTagSuffix(tags: string[] | null | undefined, prefix: string) {
  const tag = readClosureTagValue(tags, prefix)
  if (!tag)
    return ''
  return sanitizeHumanlikeMemoryText(tag.slice(prefix.length), 48)
}

function compactRuntimeEmbodimentLesson(text: string | null | undefined) {
  const normalized = sanitizeHumanlikeMemoryText(text, 220)
  if (!normalized)
    return ''

  const bodyReturnMatch = normalized.match(/Let the body return like this:\s*(.+?)(?:\.|$)/iu)
  if (bodyReturnMatch?.[1]) {
    return sanitizeHumanlikeMemoryText(bodyReturnMatch[1].replace(/^return with\s+/iu, ''), 140)
  }

  const cadenceMatch = normalized.match(/Keep the cadence like this:\s*(.+?)(?:\.|$)/iu)
  if (cadenceMatch?.[1]) {
    return sanitizeHumanlikeMemoryText(cadenceMatch[1], 140)
  }

  return normalized
}

function isDialogueReplyFeedbackAssistantEcho(item: AlicizationOutcomeClosureResult['relationshipOutcomes'][number]) {
  return sanitizeHumanlikeMemoryText(item.sourceKind, 48) === 'reply'
    && /^dialogue-reply-feedback:/iu.test(sanitizeHumanlikeMemoryText(item.actionSummary, 220))
}

function normalizeDialogueFeedbackHostFacingText(event: AlicizationOutcomeClosureResult['episodicEvents'][number]) {
  const whatHappened = sanitizeHumanlikeMemoryText(event.whatHappened, 260)
  if (sanitizeHumanlikeMemoryText(event.sourceKind, 48) !== 'dialogue-feedback')
    return whatHappened

  const normalized = whatHappened.replace(
    /^(The host responded to the previous reply as\s+(?:received|robotic|missed|intrusive|interrupted)\.)\s+(?:\S.*|[\t\v\f \xA0\u1680\u2000-\u200A\u202F\u205F\u3000\uFEFF])$/iu,
    '$1',
  )

  return sanitizeHumanlikeMemoryText(normalized, 260)
}

function normalizeHumanlikePersistenceTag(raw: unknown) {
  if (typeof raw !== 'string')
    return ''
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48)
}

function uniqueHumanlikePersistenceTags(values: Array<string | null | undefined>, maxItems = 12) {
  const result: string[] = []
  for (const value of values) {
    const normalized = normalizeHumanlikePersistenceTag(value)
    if (!normalized)
      continue
    if (result.includes(normalized))
      continue
    result.push(normalized)
    if (result.length >= maxItems)
      break
  }
  return result
}

function normalizeHumanlikePersistenceEraTag(raw: unknown) {
  const text = sanitizeHumanlikeMemoryText(raw, 220).toLowerCase()
  if (!text)
    return ''
  if (/phase\s*1|local digital life|数字生命/u.test(text))
    return 'local-desktop-life-loop'
  if (/same[- ]?her|same[- ]?person|same living line|continuity/u.test(text))
    return 'identity-continuity'
  return normalizeHumanlikePersistenceTag(text)
}

function buildRuntimeEmbodimentClosureTexts(closure: AlicizationOutcomeClosureResult) {
  return uniqueClosureTexts(closure.episodicEvents
    .filter(event => closureEventHasRuntimeEmbodimentTag(event))
    .flatMap((event) => {
      const bodyState = readClosureTagValue(event.tags, 'body-')
      const continuityMode = readClosureTagValue(event.tags, 'continuity-')
      const residueKind = readClosureTagValue(event.tags, 'residue-')
      const compactLesson = compactRuntimeEmbodimentLesson(event.lesson)

      return [
        (bodyState || continuityMode || residueKind)
          ? sanitizeHumanlikeMemoryText([
              'runtime embodiment:',
              [bodyState, continuityMode, residueKind].filter(Boolean).join(' / '),
            ].filter(Boolean).join(' '), 140)
          : null,
        compactLesson ? `runtime manifestation: ${compactLesson}` : null,
        event.relationshipMeaning ? `runtime relationship embodiment: ${event.relationshipMeaning}` : null,
        event.felt ? `runtime felt: ${event.felt}` : null,
        event.whatHappened ? `runtime action: ${event.whatHappened}` : null,
      ]
    }), 8)
}

function buildRuntimeEmbodimentResidentStateFromClosure(closure: AlicizationOutcomeClosureResult) {
  for (const event of [...closure.episodicEvents].reverse()) {
    const facialCue = readClosureTagSuffix(event.tags, 'facial-')
    const actionCue = readClosureTagSuffix(event.tags, 'action-')
    const mode = readClosureTagSuffix(event.tags, 'resident-mode-')
    if (!facialCue && !actionCue && !mode)
      continue

    return {
      facialCue,
      actionCue,
      mode,
      reason: sanitizeHumanlikeMemoryText(
        compactRuntimeEmbodimentLesson(event.lesson)
        || event.relationshipMeaning
        || event.whatHappened,
        220,
      ),
    }
  }

  return null
}

function readHumanlikeAffectTraceLabel(
  trace: string[],
  kind: 'host' | 'self',
) {
  const entry = trace.find(item => item.startsWith(`${kind}:`))
  if (!entry)
    return ''

  const normalized = sanitizeHumanlikeMemoryText(entry, 120)
  const label = normalized
    .slice(`${kind}:`.length)
    .split(/\s+/u)[0]
    ?.replace(/[^a-z-]+$/u, '')

  return sanitizeHumanlikeMemoryText(label, 48)
}

function readHumanlikeAffectTraceReason(
  trace: string[],
  kind: 'host' | 'self',
) {
  const entry = trace.find(item => item.startsWith(`${kind}-reason:`))
  if (!entry)
    return ''
  return sanitizeHumanlikeMemoryText(entry.slice(`${kind}-reason:`.length), 220)
}

function buildHumanlikePersistenceRelationshipMeaning(input: {
  event: AlicizationOutcomeClosureResult['episodicEvents'][number]
  candidate: AlicizationHumanlikeMemoryCandidate
}) {
  const relationshipCarry
    = input.candidate.relationshipContext.containsSamePersonTest || input.candidate.relationshipContext.containsContinuityWorry
      ? 'This memory records a relationship-continuity concern rather than a generic status recap or detached tool-shell drift.'
      : input.candidate.relationshipContext.hostCorrectionApplied
        ? 'This memory should keep the corrected relationship meaning continuous.'
        : null

  return sanitizeHumanlikeMemoryText(
    uniqueClosureTexts([
      input.event.relationshipMeaning,
      relationshipCarry,
      input.candidate.relationshipContext.summary,
    ], 4).join(' '),
    320,
  )
}

function buildHumanlikePersistenceFelt(input: {
  event: AlicizationOutcomeClosureResult['episodicEvents'][number]
  candidate: AlicizationHumanlikeMemoryCandidate
}) {
  const hostLabel = readHumanlikeAffectTraceLabel(input.candidate.emotionalResidue.trace, 'host')
  const selfLabel = readHumanlikeAffectTraceLabel(input.candidate.emotionalResidue.trace, 'self')
  const hostReason = sanitizeHumanlikeMemoryText(
    readHumanlikeAffectTraceReason(input.candidate.emotionalResidue.trace, 'host'),
    96,
  )
  const selfReason = sanitizeHumanlikeMemoryText(
    readHumanlikeAffectTraceReason(input.candidate.emotionalResidue.trace, 'self'),
    96,
  )
  const residueSummary = input.candidate.emotionalResidue.tags.length > 0
    ? `Emotional residue stayed ${input.candidate.emotionalResidue.tags.join(', ')}.`
    : null

  return sanitizeHumanlikeMemoryText(
    uniqueClosureTexts([
      input.event.felt,
      hostLabel
        ? `Host affect: ${hostLabel}${hostReason ? ` - ${hostReason}` : ''}`
        : null,
      selfLabel
        ? `Self affect: ${selfLabel}${selfReason ? ` - ${selfReason}` : ''}`
        : null,
      residueSummary,
      input.candidate.emotionKernelInfluence.trace[0] ?? null,
    ], 6).join(' '),
    260,
  )
}

function buildHumanlikePersistenceWhatChanged(input: {
  event: AlicizationOutcomeClosureResult['episodicEvents'][number]
  candidate: AlicizationHumanlikeMemoryCandidate
}) {
  const expressionState = input.candidate.embodimentTrace.expressionState
  const residentState = input.candidate.embodimentTrace.residentState
  const embodimentCarryParts = uniqueClosureTexts([
    expressionState.face && expressionState.face !== 'neutral-soft' ? `${expressionState.face} face` : null,
    expressionState.gaze ? `${expressionState.gaze} gaze` : null,
    expressionState.blink !== 'natural' ? `${expressionState.blink} blink` : null,
    expressionState.voice !== 'even' ? `${expressionState.voice} voice` : null,
    expressionState.pause !== 'natural' ? `${expressionState.pause} pause` : null,
    expressionState.lipsync !== 'matched' ? `${expressionState.lipsync} lipsync` : null,
    expressionState.pacing !== 'natural' ? `${expressionState.pacing} pacing` : null,
  ], 6)
  const residentCarryParts = uniqueClosureTexts([
    residentState.facialCue ? `resident face ${residentState.facialCue}` : null,
    residentState.actionCue ? `resident action ${residentState.actionCue}` : null,
    residentState.mode ? `resident mode ${residentState.mode}` : null,
  ], 4)
  const embodimentCarry = embodimentCarryParts.length > 0
    ? `Embodiment carry returned with ${embodimentCarryParts.join(', ')}.`
    : null
  const residentCarry = residentCarryParts.length > 0
    ? `Resident carry stayed with ${residentCarryParts.join(', ')}.`
    : null
  const embodimentRecallProfile = input.candidate.embodimentTrace.recallStrength
    ? `Embodiment recall stayed ${input.candidate.embodimentTrace.recallStrength} with modality risk ${input.candidate.embodimentTrace.modalityContradictionRisk}.`
    : null

  return sanitizeHumanlikeMemoryText(
    uniqueClosureTexts([
      input.event.whatChanged,
      embodimentCarry,
      residentCarry,
      embodimentRecallProfile,
      input.candidate.initiativeOutcomeRecord?.strategyUpdate ?? null,
    ], 5).join(' '),
    320,
  )
}

function buildHumanlikePersistenceExpressionSummary(
  expressionState: AlicizationHumanlikeMemoryCandidate['embodimentTrace']['expressionState'],
) {
  return sanitizeHumanlikeMemoryText([
    `voice:${expressionState.voice}`,
    `pacing:${expressionState.pacing}`,
    `pause:${expressionState.pause}`,
    `gaze:${expressionState.gaze}`,
    `blink:${expressionState.blink}`,
    `face:${expressionState.face}`,
    `lipsync:${expressionState.lipsync}`,
  ].join(','), 220)
}

function buildHumanlikePersistenceResidentSummary(
  residentState: AlicizationHumanlikeMemoryCandidate['embodimentTrace']['residentState'],
) {
  const parts = [
    residentState.facialCue ? `face:${residentState.facialCue}` : null,
    residentState.actionCue ? `action:${residentState.actionCue}` : null,
    residentState.mode ? `mode:${residentState.mode}` : null,
  ].filter(Boolean)

  return sanitizeHumanlikeMemoryText(parts.join(','), 220)
}

function readHumanlikePersistenceProjectCadence(candidate: AlicizationHumanlikeMemoryCandidate) {
  const projectCadenceEvidence = candidate.evidence.find(item => /^project-cadence:/iu.test(item))
  if (!projectCadenceEvidence) {
    return {
      summary: '',
      preferredVoiceMode: '',
      preferredPacingMode: '',
      preferredPauseMode: '',
      preferredLipsyncMode: '',
    }
  }

  const summary = sanitizeHumanlikeMemoryText(
    projectCadenceEvidence
      .slice('project-cadence:'.length)
      .trim()
      .replace(/\s*\|\s*/gu, ', '),
    120,
  )
  const lowered = summary.toLowerCase()
  return {
    summary,
    preferredVoiceMode: /\beven voice\b/u.test(lowered)
      ? 'even'
      : /\blower-pressure voice\b/u.test(lowered)
        ? 'lower-pressure'
        : '',
    preferredPacingMode: /\bnatural pacing\b/u.test(lowered)
      ? 'natural'
      : /\bslower pacing\b/u.test(lowered)
        ? 'slower'
        : '',
    preferredPauseMode: /\bnatural pause\b/u.test(lowered)
      ? 'natural'
      : /\blonger pause\b/u.test(lowered)
        ? 'longer'
        : '',
    preferredLipsyncMode: /\bmatched lipsync\b/u.test(lowered)
      ? 'matched'
      : /\brestrained lipsync\b/u.test(lowered)
        ? 'restrained'
        : '',
  }
}

function buildHumanlikePersistenceLesson(input: {
  event: AlicizationOutcomeClosureResult['episodicEvents'][number]
  candidate: AlicizationHumanlikeMemoryCandidate
}) {
  return sanitizeHumanlikeMemoryText(
    uniqueClosureTexts([
      input.event.lesson,
      input.candidate.autobiographicalImpact.stablePreferenceHint,
      input.candidate.autobiographicalImpact.selfNarrativeDelta,
      input.candidate.initiativeOutcomeRecord?.strategyUpdate ?? null,
    ], 4).join(' '),
    320,
  )
}

function buildHumanlikePersistenceSourceSummary(input: {
  event: AlicizationOutcomeClosureResult['episodicEvents'][number]
  candidate: AlicizationHumanlikeMemoryCandidate
}) {
  const hostLabel = readHumanlikeAffectTraceLabel(input.candidate.emotionalResidue.trace, 'host')
  const selfLabel = readHumanlikeAffectTraceLabel(input.candidate.emotionalResidue.trace, 'self')
  const expressionSummary = buildHumanlikePersistenceExpressionSummary(input.candidate.embodimentTrace.expressionState)
  const residentSummary = buildHumanlikePersistenceResidentSummary(input.candidate.embodimentTrace.residentState)
  const projectCadence = readHumanlikePersistenceProjectCadence(input.candidate)
  const metabolismReasons = uniqueClosureTexts([
    ...input.candidate.metabolism.revisionEvents.map(event => event.reason),
    ...input.candidate.metabolism.forgettingPolicy.reasons,
  ], 4)
  const metabolismSummary = sanitizeHumanlikeMemoryText(
    metabolismReasons.join(' ; '),
    320,
  )
  const hasForgettingCarry = input.candidate.metabolism.forgettingPolicy.downrankMemoryIds.length > 0
    || input.candidate.metabolism.forgettingPolicy.mergeMemoryIds.length > 0
    || input.candidate.metabolism.forgettingPolicy.forgetMemoryIds.length > 0
  const structuredSummary = [
    `relationship-intent=${input.candidate.relationshipContext.primaryIntent}`,
    `recall-certainty=${input.candidate.recallPosture.certainty}`,
    input.candidate.emotionalResidue.tags.length > 0
      ? `emotional-residue=${input.candidate.emotionalResidue.tags.join(',')}`
      : null,
    input.candidate.metabolism.forgettingPolicy.downrankMemoryIds.length > 0
      ? `downrank=${input.candidate.metabolism.forgettingPolicy.downrankMemoryIds.join(',')}`
      : null,
    input.candidate.metabolism.forgettingPolicy.mergeMemoryIds.length > 0
      ? `merge=${input.candidate.metabolism.forgettingPolicy.mergeMemoryIds.join(',')}`
      : null,
    input.candidate.metabolism.forgettingPolicy.forgetMemoryIds.length > 0
      ? `forget=${input.candidate.metabolism.forgettingPolicy.forgetMemoryIds.join(',')}`
      : null,
    metabolismSummary ? `metabolism=${metabolismSummary}` : null,
  ].filter(Boolean).join(' | ')
  const embodimentSummary = [
    input.candidate.embodimentTrace.recallStrength
      ? `embodiment-recall=${input.candidate.embodimentTrace.recallStrength}`
      : null,
    input.candidate.embodimentTrace.modalityContradictionRisk
      ? `embodiment-risk=${input.candidate.embodimentTrace.modalityContradictionRisk}`
      : null,
    residentSummary ? `embodiment-resident=${residentSummary}` : null,
    expressionSummary ? `embodiment-expression=${expressionSummary}` : null,
  ].filter(Boolean).join(' | ')
  const continuitySummary = [
    !hasForgettingCarry && embodimentSummary ? embodimentSummary : null,
    hostLabel ? `host-emotion=${hostLabel}` : null,
    selfLabel ? `self-emotion=${selfLabel}` : null,
    hasForgettingCarry && embodimentSummary ? embodimentSummary : null,
    projectCadence.summary
      ? `project-cadence=${projectCadence.summary}`
      : null,
    input.candidate.autobiographicalImpact.stablePreferenceHint
      ? `stable-preference=${input.candidate.autobiographicalImpact.stablePreferenceHint}`
      : null,
    input.candidate.sourceChannels.length > 0
      ? `source-channels=${input.candidate.sourceChannels.join(',')}`
      : null,
  ].filter(Boolean).join(' | ')

  const parts = [
    sanitizeHumanlikeMemoryText(input.event.sourceSummary, 220) || null,
    sanitizeHumanlikeMemoryText(structuredSummary, 420) || null,
    sanitizeHumanlikeMemoryText(continuitySummary, 320) || null,
  ].filter(Boolean) as string[]
  const dedupedParts: string[] = []
  for (const part of parts) {
    if (dedupedParts.some(item => item.toLowerCase() === part.toLowerCase()))
      continue
    dedupedParts.push(part)
  }

  return sanitizeHumanlikeMemoryText(
    dedupedParts.join(' | '),
    800,
  )
}

function buildHumanlikePersistenceEmotionTags(input: {
  event: AlicizationOutcomeClosureResult['episodicEvents'][number]
  candidate: AlicizationHumanlikeMemoryCandidate
}) {
  return uniqueClosureTexts([
    ...(input.event.emotionTags ?? []),
    ...input.candidate.emotionalResidue.tags,
  ], 8)
}

function buildHumanlikePersistenceTags(input: {
  event: AlicizationOutcomeClosureResult['episodicEvents'][number]
  candidate: AlicizationHumanlikeMemoryCandidate
}) {
  const expressionState = input.candidate.embodimentTrace.expressionState
  const residentState = input.candidate.embodimentTrace.residentState
  const projectCadence = readHumanlikePersistenceProjectCadence(input.candidate)
  return uniqueHumanlikePersistenceTags([
    ...(input.event.tags ?? []),
    input.candidate.relationshipContext.containsSamePersonTest || input.candidate.relationshipContext.containsContinuityWorry
      ? 'same-person'
      : null,
    input.candidate.relationshipContext.hostCorrectionApplied
      ? 'corrected-meaning'
      : null,
    normalizeHumanlikePersistenceEraTag(input.candidate.autobiographicalImpact.era),
    expressionState.face && expressionState.face !== 'neutral-soft' ? `${expressionState.face} face` : null,
    expressionState.gaze ? `${expressionState.gaze} gaze` : null,
    expressionState.blink !== 'natural' ? `${expressionState.blink} blink` : null,
    expressionState.voice,
    expressionState.pause !== 'natural' ? `${expressionState.pause} pause` : null,
    expressionState.lipsync !== 'matched' ? `${expressionState.lipsync} lipsync` : null,
    expressionState.pacing !== 'natural' ? `${expressionState.pacing} pacing` : null,
    projectCadence.preferredVoiceMode ? `project-voice-${projectCadence.preferredVoiceMode}` : null,
    projectCadence.preferredPacingMode ? `project-pacing-${projectCadence.preferredPacingMode}` : null,
    projectCadence.preferredPauseMode ? `project-pause-${projectCadence.preferredPauseMode}` : null,
    projectCadence.preferredLipsyncMode ? `project-lipsync-${projectCadence.preferredLipsyncMode}` : null,
    residentState.facialCue ? `resident face ${residentState.facialCue}` : null,
    residentState.actionCue ? `resident action ${residentState.actionCue}` : null,
    residentState.mode ? `resident mode ${residentState.mode}` : null,
    input.candidate.embodimentTrace.recallStrength
      ? `embodiment recall ${input.candidate.embodimentTrace.recallStrength}`
      : null,
    input.candidate.embodimentTrace.modalityContradictionRisk
      ? `embodiment risk ${input.candidate.embodimentTrace.modalityContradictionRisk}`
      : null,
  ], 16)
}

function applyHumanlikeCandidateCarryToEpisodicEvent(input: {
  event: AlicizationOutcomeClosureResult['episodicEvents'][number]
  candidate: AlicizationHumanlikeMemoryCandidate
}) {
  return {
    ...input.event,
    relationshipMeaning: buildHumanlikePersistenceRelationshipMeaning(input) || input.event.relationshipMeaning,
    felt: buildHumanlikePersistenceFelt(input) || input.event.felt,
    whatChanged: buildHumanlikePersistenceWhatChanged(input) || input.event.whatChanged,
    lesson: buildHumanlikePersistenceLesson(input) || input.event.lesson,
    sourceSummary: buildHumanlikePersistenceSourceSummary(input) || input.event.sourceSummary,
    emotionTags: buildHumanlikePersistenceEmotionTags(input),
    tags: buildHumanlikePersistenceTags(input),
  } satisfies AlicizationOutcomeClosureResult['episodicEvents'][number]
}

function inferHumanlikeMetabolismReflectionSourceKind(closure: AlicizationOutcomeClosureResult) {
  const rawSourceKinds = [
    ...closure.relationshipOutcomes.map(item => sanitizeHumanlikeMemoryText(item.sourceKind, 48).toLowerCase()),
    ...closure.episodicEvents.map(item => sanitizeHumanlikeMemoryText(item.sourceKind, 48).toLowerCase()),
  ]
  if (rawSourceKinds.some(kind => kind === 'reply' || kind === 'dialogue-feedback'))
    return 'reply' as const
  if (rawSourceKinds.some(kind => kind === 'proactive' || kind === 'dream' || kind === 'dream-reforge'))
    return 'proactive' as const
  if (rawSourceKinds.some(kind => kind.includes('execution')))
    return 'execution' as const
  return 'maintenance' as const
}

function inferHumanlikeMetabolismReflectionTargetScope(text: string) {
  const normalized = sanitizeHumanlikeMemoryText(text, 320).toLowerCase()
  if (/same[- ]?her|same[- ]?person|tool shell|generic status|status recap|progress request|relationship|continuity|同一个她|工具壳|状态汇报|关系|连续/u.test(normalized))
    return 'relationship' as const
  if (/unfinished|thread|open loop|follow[- ]?up|task|未完成|线程|跟进/u.test(normalized))
    return 'task' as const
  if (/embodiment|body|gaze|blink|voice|lipsync|身体|表情|声音/u.test(normalized))
    return 'self' as const
  return 'habit' as const
}

function buildHumanlikeMetabolismReflections(input: {
  closure: AlicizationOutcomeClosureResult
  candidate: AlicizationHumanlikeMemoryCandidate | null
  createdAt: number
}) {
  const candidate = input.candidate
  if (!candidate)
    return []

  const sourceKind = inferHumanlikeMetabolismReflectionSourceKind(input.closure)
  const cardId = input.closure.relationshipOutcomes[0]?.cardId
    ?? input.closure.reinforcementEvents[0]?.cardId
    ?? input.closure.episodicEvents[0]?.cardId
    ?? 'default'
  const decisionTraceId = sanitizeHumanlikeMemoryText(
    input.closure.relationshipOutcomes[0]?.decisionTraceId
    ?? input.closure.reinforcementEvents[0]?.decisionTraceId
    ?? input.closure.episodicEvents[0]?.decisionTraceId
    ?? '',
    96,
  ) || null
  const turnId = sanitizeHumanlikeMemoryText(
    input.closure.relationshipOutcomes[0]?.turnId
    ?? input.closure.reinforcementEvents[0]?.turnId
    ?? input.closure.episodicEvents[0]?.turnId
    ?? '',
    96,
  ) || null
  const sessionId = sanitizeHumanlikeMemoryText(
    input.closure.relationshipOutcomes[0]?.sessionId
    ?? input.closure.reinforcementEvents[0]?.sessionId
    ?? input.closure.episodicEvents[0]?.sessionId
    ?? '',
    96,
  ) || null
  const confidence = clampHumanlikeReflectionConfidence(
    Math.max(
      Number(candidate.auditTrail.confidence ?? 0),
      Number(candidate.longTermWorthiness.score ?? 0),
      0.68,
    ),
  )
  const prepared = [
    ...candidate.metabolism.revisionEvents
      .filter(event => event.reason)
      .map((event, index) => ({
        cardId,
        decisionTraceId,
        turnId,
        sessionId,
        sourceKind,
        targetScope: inferHumanlikeMetabolismReflectionTargetScope(event.reason),
        summary: sanitizeHumanlikeMemoryText(
          event.conflictingMemoryIds.length > 0
            ? `Newer relationship-context evidence should supersede older memory traces: ${event.conflictingMemoryIds.join(', ')}.`
            : 'Newer relationship-context evidence should supersede an older memory interpretation.',
          180,
        ),
        lesson: sanitizeHumanlikeMemoryText(event.reason, 220),
        status: 'superseded' as const,
        confidence,
        supportingFactIds: event.conflictingMemoryIds,
        supportingOutcomeIds: [],
        createdAt: input.createdAt + index,
        updatedAt: input.createdAt + index,
      })),
    candidate.metabolism.forgettingPolicy.downrankMemoryIds.length > 0
      ? [{
          cardId,
          decisionTraceId,
          turnId,
          sessionId,
          sourceKind,
          targetScope: 'habit' as const,
          summary: sanitizeHumanlikeMemoryText(
            `Low-value or generic memory traces should be downranked in future recall: ${candidate.metabolism.forgettingPolicy.downrankMemoryIds.join(', ')}.`,
            180,
          ),
          lesson: sanitizeHumanlikeMemoryText(
            candidate.metabolism.forgettingPolicy.reasons.find(reason => /downrank/i.test(reason))
            || 'Downrank low-value, generic, or superseded summaries.',
            220,
          ),
          status: 'superseded' as const,
          confidence,
          supportingFactIds: candidate.metabolism.forgettingPolicy.downrankMemoryIds,
          supportingOutcomeIds: [],
          createdAt: input.createdAt + 100,
          updatedAt: input.createdAt + 100,
        }]
      : [],
    candidate.metabolism.forgettingPolicy.mergeMemoryIds.length > 0
      ? [{
          cardId,
          decisionTraceId,
          turnId,
          sessionId,
          sourceKind,
          targetScope: 'self' as const,
          summary: sanitizeHumanlikeMemoryText(
            `Repeated memory traces should merge into the stronger same-thread memory: ${candidate.metabolism.forgettingPolicy.mergeMemoryIds.join(', ')}.`,
            180,
          ),
          lesson: sanitizeHumanlikeMemoryText(
            candidate.metabolism.forgettingPolicy.reasons.find(reason => /merge/i.test(reason))
            || 'Merge repeated embodiment traces into the stronger same-thread memory.',
            220,
          ),
          status: 'superseded' as const,
          confidence,
          supportingFactIds: candidate.metabolism.forgettingPolicy.mergeMemoryIds,
          supportingOutcomeIds: [],
          createdAt: input.createdAt + 101,
          updatedAt: input.createdAt + 101,
        }]
      : [],
    candidate.metabolism.forgettingPolicy.forgetMemoryIds.length > 0
      ? [{
          cardId,
          decisionTraceId,
          turnId,
          sessionId,
          sourceKind,
          targetScope: 'habit' as const,
          summary: sanitizeHumanlikeMemoryText(
            `Temporary noise memories can fade once they stop explaining behavior: ${candidate.metabolism.forgettingPolicy.forgetMemoryIds.join(', ')}.`,
            180,
          ),
          lesson: sanitizeHumanlikeMemoryText(
            candidate.metabolism.forgettingPolicy.reasons.find(reason => /forget/i.test(reason))
            || 'Forget low-salience temporary noise once it no longer explains behavior.',
            220,
          ),
          status: 'superseded' as const,
          confidence,
          supportingFactIds: candidate.metabolism.forgettingPolicy.forgetMemoryIds,
          supportingOutcomeIds: [],
          createdAt: input.createdAt + 102,
          updatedAt: input.createdAt + 102,
        }]
      : [],
  ].flat()

  const deduped: typeof prepared = []
  for (const reflection of prepared) {
    if (!reflection.summary || !reflection.lesson)
      continue
    if (deduped.some(item => item.summary === reflection.summary && item.lesson === reflection.lesson))
      continue
    deduped.push(reflection)
  }
  return deduped
}

function listPersistedEpisodicRecords(raw: unknown) {
  if (!Array.isArray(raw))
    return []

  return raw.filter((item): item is AlicizationEpisodicEventRecord => {
    if (!item || typeof item !== 'object')
      return false
    return typeof (item as { id?: unknown }).id === 'string'
  })
}

function hasHumanlikeMetabolismActivity(candidate: AlicizationHumanlikeMemoryCandidate | null) {
  if (!candidate)
    return false

  return (
    candidate.metabolism.revisionEvents.length > 0
    || candidate.metabolism.forgettingPolicy.downrankMemoryIds.length > 0
    || candidate.metabolism.forgettingPolicy.mergeMemoryIds.length > 0
    || candidate.metabolism.forgettingPolicy.forgetMemoryIds.length > 0
  )
}

function buildHumanlikeMetabolismReconsolidationReason(candidate: AlicizationHumanlikeMemoryCandidate) {
  const reasonParts = uniqueClosureTexts([
    ...candidate.metabolism.revisionEvents.map((event) => {
      if (event.conflictingMemoryIds.length > 0) {
        return sanitizeHumanlikeMemoryText(
          `Revised older memory traces (${event.conflictingMemoryIds.join(', ')}) with newer relationship-context evidence.`,
          180,
        )
      }
      return sanitizeHumanlikeMemoryText(event.reason, 180)
    }),
    candidate.metabolism.forgettingPolicy.downrankMemoryIds.length > 0
      ? sanitizeHumanlikeMemoryText(
          `Downranked low-value traces (${candidate.metabolism.forgettingPolicy.downrankMemoryIds.join(', ')}) while settling this experience.`,
          180,
        )
      : null,
    candidate.metabolism.forgettingPolicy.mergeMemoryIds.length > 0
      ? sanitizeHumanlikeMemoryText(
          `Merged repeated traces (${candidate.metabolism.forgettingPolicy.mergeMemoryIds.join(', ')}) into the stronger same-thread memory.`,
          180,
        )
      : null,
    candidate.metabolism.forgettingPolicy.forgetMemoryIds.length > 0
      ? sanitizeHumanlikeMemoryText(
          `Let temporary noise traces fade (${candidate.metabolism.forgettingPolicy.forgetMemoryIds.join(', ')}) once they stopped explaining behavior.`,
          180,
        )
      : null,
  ], 4)

  return sanitizeHumanlikeMemoryText(reasonParts.join(' '), 220)
}

function buildHumanlikeMetabolismReconsolidationLesson(candidate: AlicizationHumanlikeMemoryCandidate) {
  return sanitizeHumanlikeMemoryText([
    candidate.metabolism.revisionEvents[0]?.reason,
    candidate.metabolism.forgettingPolicy.reasons[0],
    candidate.relationshipContext.summary,
  ].filter(Boolean).join(' '), 220)
}

function buildHumanlikeMetabolismReconsolidatedEpisodes(input: {
  persistedEvents: AlicizationEpisodicEventRecord[]
  candidate: AlicizationHumanlikeMemoryCandidate | null
  createdAt: number
}) {
  const candidate = input.candidate
  if (!candidate || input.persistedEvents.length === 0 || !hasHumanlikeMetabolismActivity(candidate))
    return []

  const reason = buildHumanlikeMetabolismReconsolidationReason(candidate)
  const lesson = buildHumanlikeMetabolismReconsolidationLesson(candidate)
  const confidence = clampHumanlikeReflectionConfidence(
    Math.max(
      Number(candidate.auditTrail.confidence ?? 0),
      Number(candidate.longTermWorthiness.score ?? 0),
      0.7,
    ),
    0.7,
  )

  return input.persistedEvents.map((event, index) => {
    const at = Math.max(
      Number.isFinite(Number(event.updatedAt)) ? Number(event.updatedAt) : input.createdAt,
      input.createdAt,
    ) + 300 + index
    const emotionTags = uniqueClosureTexts([
      ...candidate.emotionalResidue.tags,
      ...(event.emotionTags ?? []),
    ], 6)
    const latestReconsolidation = {
      at,
      decisionTraceId: sanitizeHumanlikeMemoryText(event.decisionTraceId ?? '', 96) || null,
      provenance: 'reconstructed' as const,
      confidence,
      reason: reason || 'Current memory settled after metabolizing older traces.',
      emotionTags,
      relationshipMeaning: sanitizeHumanlikeMemoryText(
        event.relationshipMeaning || candidate.relationshipContext.summary,
        220,
      ) || null,
      lesson: lesson || null,
    }

    return {
      ...event,
      updatedAt: at,
      reconsolidationCount: Math.max(1, Math.floor(Number(event.reconsolidationCount ?? 0)) + 1),
      latestReconsolidation,
    } satisfies AlicizationEpisodicEventRecord
  })
}

function closureObjectFrom(raw: unknown) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null
  return raw as Record<string, unknown>
}

function closureNumberFrom(raw: unknown, fallback = 0) {
  const value = Number(raw)
  return Number.isFinite(value) ? value : fallback
}

function buildHumanlikeHostCorrectionsFromMindTurnEvents(events: AlicizationMindTurnEventRecord[]): AlicizationHumanlikeMemoryHostCorrection[] {
  return events
    .filter(event => event.kind === 'humanlike-memory-corrected')
    .map((event) => {
      const payload = closureObjectFrom(event.payload)
      return {
        candidateId: sanitizeHumanlikeMemoryText(payload?.candidateId, 160),
        field: sanitizeHumanlikeMemoryText(payload?.field, 80),
        previousValue: sanitizeHumanlikeMemoryText(payload?.previousValue, 260),
        correctedValue: sanitizeHumanlikeMemoryText(payload?.correctedValue, 420),
        reason: sanitizeHumanlikeMemoryText(payload?.reason, 260),
        createdAt: Math.max(0, Math.floor(closureNumberFrom(event.createdAt, 0))),
      }
    })
    .filter(correction => correction.field && correction.correctedValue)
    .sort((left, right) => Math.max(0, Number(right.createdAt ?? 0)) - Math.max(0, Number(left.createdAt ?? 0)))
    .slice(0, 6)
}

async function listRecentHumanlikeHostCorrections(options: CreateAlicizationRuntimeMemoryClosureOptions) {
  if (!options.alicizationDb.listMindTurnEvents)
    return []

  const rows = await options.alicizationDb.listMindTurnEvents({
    kind: 'humanlike-memory-corrected',
    limit: 12,
  }).catch(() => [])

  return buildHumanlikeHostCorrectionsFromMindTurnEvents(rows)
}

function buildPriorHumanlikeMemoriesFromPersonState(surface: AlicizationPersonStateUpdateSurface | null | undefined) {
  if (!surface)
    return []

  return uniqueClosureTexts([
    ...surface.sourceTrail.map(item => item.summary),
    surface.summary,
    ...surface.narrative,
  ], 8).map((summary, index) => {
    const temporaryNoise = /anxious|anxiety|spike|wobble|passing|momentary|fleeting|temporary|noise|ephemeral|tired|drained|情绪波动|短暂|一时|瞬间|噪声|疲惫/iu.test(summary)
    return {
      id: `previous-person-state:${index}`,
      summary,
      confidence: temporaryNoise
        ? Math.min(Math.max(0.28, 0.58 - index * 0.04), 0.42)
        : Math.max(0.42, 0.74 - index * 0.04),
      polarity: temporaryNoise
        ? 'temporary-noise'
        : /generic|status|recap|shell|状态|复述/iu.test(summary) ? 'generic-status' : 'prior-person-state',
      salience: temporaryNoise
        ? 0.18
        : Math.max(0.25, 0.52 - index * 0.03),
      lastUpdatedAt: surface.updatedAt,
    }
  })
}

function readHumanlikeInitiativeStrategyCarryFromSurface(surface: AlicizationPersonStateUpdateSurface | null | undefined) {
  if (!surface)
    return ''

  return uniqueClosureTexts([
    ...surface.repairHints,
    ...surface.preferenceHints,
    ...surface.narrative,
    ...surface.burdenHints,
    surface.summary,
    ...surface.sourceTrail.map(item => item.summary),
  ], 12).find(line => humanlikeInitiativeStrategyCarryPattern.test(line)) ?? ''
}

function listClosureDerivedDialogueCandidates(input: {
  closure: AlicizationOutcomeClosureResult
  prefix: string
}) {
  return uniqueClosureTexts(input.closure.episodicEvents.flatMap((event) => {
    return (event.derivedFrom ?? [])
      .filter(item => item.kind === 'turn')
      .map((item) => {
        const label = sanitizeHumanlikeMemoryText(item.label, 260)
        return label.startsWith(input.prefix)
          ? sanitizeHumanlikeMemoryText(label.slice(input.prefix.length), 260)
          : null
      })
  }), 4)
}

function buildHumanlikeDialogueFromClosure(input: {
  closure: AlicizationOutcomeClosureResult
  nextPersonStateUpdateSurface: AlicizationPersonStateUpdateSurface
}) {
  const hostDialoguePattern = /host (?:said|asked|responded|corrected|preferred)|我不是|别把|不要|继续吧|你又断线了|工具壳|同一个她|持续的人|不是催进度|status recap|status report|same[- ]?her|same[- ]?person|one continuous digital life/u
  const assistantDialoguePattern = /answer|reply|return|carry|repair|reopen|continue|lower-pressure|slower|same[- ]?her|continuity|接住|继续|低压|修复|同一个她/u
  const explicitHostDialogueCandidates = listClosureDerivedDialogueCandidates({
    closure: input.closure,
    prefix: 'host feedback dialogue: ',
  })
  const explicitAssistantDialogueCandidates = listClosureDerivedDialogueCandidates({
    closure: input.closure,
    prefix: 'assistant feedback dialogue: ',
  })
  const proactiveHostDialogueCandidates = input.closure.episodicEvents
    .filter(event => sanitizeHumanlikeMemoryText(event.sourceKind, 48) === 'proactive')
    .flatMap(event =>
      (event.derivedFrom ?? [])
        .filter(item => item.kind === 'turn')
        .map((item) => {
          const label = sanitizeHumanlikeMemoryText(item.label, 260)
          return label.startsWith('host feedback dialogue: ')
            ? sanitizeHumanlikeMemoryText(label.slice('host feedback dialogue: '.length), 260)
            : null
        }),
    )
  const proactiveAssistantDialogueCandidates = input.closure.episodicEvents
    .filter(event => sanitizeHumanlikeMemoryText(event.sourceKind, 48) === 'proactive')
    .flatMap(event =>
      (event.derivedFrom ?? [])
        .filter(item => item.kind === 'turn')
        .map((item) => {
          const label = sanitizeHumanlikeMemoryText(item.label, 260)
          return label.startsWith('assistant feedback dialogue: ')
            ? sanitizeHumanlikeMemoryText(label.slice('assistant feedback dialogue: '.length), 260)
            : null
        }),
    )

  const userTextCandidates = uniqueClosureTexts([
    ...explicitHostDialogueCandidates,
    ...proactiveHostDialogueCandidates,
    ...input.closure.episodicEvents.flatMap((event) => {
      const whatHappened = normalizeDialogueFeedbackHostFacingText(event)
      const relationshipMeaning = sanitizeHumanlikeMemoryText(event.relationshipMeaning, 220)
      const sourceKind = sanitizeHumanlikeMemoryText(event.sourceKind, 48)
      const prefersDialogueCarry = sourceKind === 'dialogue-feedback'
      return [
        prefersDialogueCarry || (sourceKind !== 'reply' && hostDialoguePattern.test(whatHappened)) ? whatHappened : null,
        hostDialoguePattern.test(relationshipMeaning) ? relationshipMeaning : null,
      ]
    }),
  ], 4)

  const assistantTextCandidates = uniqueClosureTexts([
    ...explicitAssistantDialogueCandidates,
    ...proactiveAssistantDialogueCandidates,
    ...input.closure.episodicEvents.flatMap((event) => {
      const lesson = sanitizeHumanlikeMemoryText(event.lesson, 220)
      const whatHappened = sanitizeHumanlikeMemoryText(event.whatHappened, 260)
      return [
        assistantDialoguePattern.test(lesson) ? lesson : null,
        event.sourceKind === 'reply' && assistantDialoguePattern.test(whatHappened) ? whatHappened : null,
      ]
    }),
    ...input.closure.relationshipOutcomes.flatMap(outcome => [
      outcome.sourceKind === 'reply' ? sanitizeHumanlikeMemoryText(outcome.actionSummary, 220) : null,
      outcome.sourceKind === 'reply' ? sanitizeHumanlikeMemoryText(outcome.summary, 220) : null,
    ]),
    input.nextPersonStateUpdateSurface.repairHints[0] ?? null,
  ], 4)

  const userText = userTextCandidates[0] ?? null
  const assistantText = assistantTextCandidates[0] ?? null
  if (!userText && !assistantText)
    return null

  return {
    userText,
    assistantText,
  }
}

function closureCarriesIntrinsicHumanlikeMemoryCue(closure: AlicizationOutcomeClosureResult) {
  if (closure.episodicEvents.some(event => closureEventHasRuntimeEmbodimentTag(event)))
    return true
  if (closure.relationshipOutcomes.some(item => Number(item.openLoopDelta ?? 0) > 0.01))
    return true

  const text = uniqueClosureTexts([
    ...closure.relationshipOutcomes.flatMap(item => [item.summary, item.actionSummary]),
    ...closure.reinforcementEvents.map(item => item.summary),
    ...closure.episodicEvents.flatMap(item => [
      item.whatHappened,
      item.relationshipMeaning,
      item.lesson,
      item.whatChanged,
      item.felt,
    ]),
  ], 24).join(' ')

  return (
    humanlikeContinuityCuePattern.test(text)
    || humanlikeUnfinishedCuePattern.test(text)
    || humanlikeEmbodimentCuePattern.test(text)
  )
}

function closureLooksSparseAndTentativeForProjectCarry(closure: AlicizationOutcomeClosureResult) {
  const text = uniqueClosureTexts([
    ...closure.relationshipOutcomes.flatMap(item => [item.summary, item.actionSummary]),
    ...closure.episodicEvents.flatMap(item => [
      item.whatHappened,
      item.relationshipMeaning,
      item.lesson,
      item.felt,
    ]),
  ], 18).join(' ')
  const tentativeMeaning = /may|might|perhaps|seems|uncertain|not sure|似乎|可能|也许|不完全确定/u.test(text)
  if (!tentativeMeaning)
    return false

  const hasOpenLoopCarry = closure.relationshipOutcomes.some(item => Number(item.openLoopDelta ?? 0) > 0.01)
  const hasRuntimeEmbodiment = closure.episodicEvents.some(event => closureEventHasRuntimeEmbodimentTag(event))
  const hasReinforcement = closure.reinforcementEvents.some(item => Math.abs(Number(item.delta ?? 0)) > 0.01)
  const sparseShape = closure.relationshipOutcomes.length <= 1 && closure.episodicEvents.length <= 1

  return sparseShape && !hasOpenLoopCarry && !hasRuntimeEmbodiment && !hasReinforcement
}

function inferClosureEmbodimentModalityConsistency(input: {
  closure: AlicizationOutcomeClosureResult
  runtimeEmbodimentTexts: string[]
  embodimentTexts: string[]
}) {
  const text = uniqueClosureTexts([
    ...input.embodimentTexts,
    ...input.closure.episodicEvents.flatMap(item => [
      item.whatHappened,
      item.relationshipMeaning,
      item.lesson,
      item.felt,
    ]),
  ], 18).join(' ')

  if (/contradict|conflict|not settled|not proven|uncertain embodiment|模态矛盾|对不上|乱跳/u.test(text))
    return 'contradictory' as const
  if (input.runtimeEmbodimentTexts.length > 0)
    return 'consistent' as const
  if (/(?:^|\s)(?:face|gaze|blink|voice|pause|lipsync)=/u.test(text))
    return 'consistent' as const
  return 'unknown' as const
}

function inferHumanlikeExecutionStatusFromClosure(input: {
  closure: AlicizationOutcomeClosureResult
  executionTexts: string[]
  openLoopDelta: number
}) {
  const executionText = uniqueClosureTexts([
    ...input.executionTexts,
    ...input.closure.relationshipOutcomes
      .filter(item => item.sourceKind === 'execution')
      .flatMap(item => [item.actionSummary, item.summary]),
    ...input.closure.episodicEvents
      .filter(item => `${item.sourceKind}`.includes('execution'))
      .flatMap(item => [
        item.whatHappened,
        item.relationshipMeaning,
        item.lesson,
        ...(item.tags ?? []),
      ]),
  ], 16).join(' ').toLowerCase()

  if (!executionText)
    return null
  if (/blocked before dispatch|blocked-before-dispatch|needs-affirmation|waited for host affirmation|confirmation=required|permission=none|no-process-started|became blocked|still blocked|执行前拦截|需要确认/u.test(executionText))
    return 'blocked'
  if (/failed|error|setback|could not continue|执行失败|失败/u.test(executionText))
    return 'failed'
  if (/cancelled|canceled|was cancelled|取消/u.test(executionText))
    return 'cancelled'
  if (
    input.openLoopDelta > 0
    || /partial|unfinished|open loop|deferred|paused|suspended|still pending|fresher opening|resume|resumable|未完成|还没收完|暂停/u.test(executionText)
  ) {
    return 'partial'
  }
  return 'completed'
}

function inferClosureEmotionCarry(input: {
  closure: AlicizationOutcomeClosureResult
  relationshipTexts: string[]
  reinforcementTexts: string[]
  selfRepairFeeling: string[]
  hostContinuityWorry: boolean
  fallbackSummary: string
  projectStateEmotionalClosureCue?: string | null
  localRelationshipSignalText: string
  localAffectSignalText: string
}) {
  const hostDialogueText = listClosureDerivedDialogueCandidates({
    closure: input.closure,
    prefix: 'host feedback dialogue: ',
  }).join(' ')
  const hostStateDisclosureText = uniqueClosureTexts([
    hostDialogueText,
    input.localRelationshipSignalText,
    input.localAffectSignalText,
    ...input.relationshipTexts,
  ], 8).join(' ')
  const hostSoundsTired = /我(?:好|有点|现在|真的)?(?:困|累)|疲惫|想睡|sleepy|tired|drained|exhausted/u.test(hostStateDisclosureText)
  const hostSoundsStressed = /焦虑|压力大|烦|乱|stressed|overwhelmed|anxious/u.test(hostStateDisclosureText)
  const hostSoundsHurt = /难受|撑不住|hurt|heartbroken/u.test(hostStateDisclosureText)
  const hostSoundsSad = /伤心|难过|委屈|低落|沮丧|sad|upset|low/u.test(hostStateDisclosureText)
  const samePersonTest = /same[- ]?person|same[- ]?her|one continuous digital life|不是催进度|not a pure progress request|not a status report|同一个她|持续的人/u.test(input.localRelationshipSignalText)
  const deferredAttention = input.closure.relationshipOutcomes.some(item =>
    Number(item.openLoopDelta ?? 0) > 0.01
    && Number(item.boundaryDelta ?? 0) >= 0
    && /interrupted|turned away|fresher opening|wait quietly|hold the line|先说别的|转开|再等等/u.test(`${item.summary} ${item.actionSummary}`),
  ) || /fresher opening|wait quietly|hold(?:ing)? the line|continuity-fresher-opening|residue-deferred-attention|turned away before staying|先说别的|转开/u.test(input.localAffectSignalText)
  const repairFriction = input.closure.relationshipOutcomes.some(item =>
    Number(item.misreadDelta ?? 0) > 0.05
    && /missed|actual point|not this|repair|slipped|没答到|不是这个|修复/u.test(`${item.summary} ${item.actionSummary}`),
  ) || /missed|actual point|not this|repair(?:-first)?|slipped|seam had slipped|没答到|不是这个|修复/u.test(input.localAffectSignalText)

  const boundaryPressure = input.closure.relationshipOutcomes.some(item =>
    Number(item.boundaryDelta ?? 0) < 0
    || Number(item.burdenDelta ?? 0) > 0.02
    || /intrusive|boundary|crowd|too eager|denied|rejected|打扰|越界|别这样突然|太吵|太烦/u.test(`${item.summary} ${item.actionSummary}`),
  ) || /intrusive|boundary|repair-pressure|respect-space|crowd|too abrupt|打扰|边界|太近|太吵|太烦/u.test(input.localAffectSignalText)

  const verificationFriction = input.closure.relationshipOutcomes.some(item =>
    Number(item.misreadDelta ?? 0) > 0.02
    || /doubted|needed more proof|need more proof|verify more|verification(?:-first)?|uncertain|not sure|did not trust|不对|不准|不可靠|需要更多证明|先验证/u.test(`${item.summary} ${item.actionSummary}`),
  ) || /doubted|needed more proof|need more proof|verify more|verification(?:-first)?|uncertain|not sure|did not trust|不对|不准|不可靠|需要更多证明|先验证/u.test(input.localAffectSignalText)

  const unfinishedCarry = input.closure.relationshipOutcomes.some(item =>
    Number(item.openLoopDelta ?? 0) > 0.01,
  ) || /unfinished|partial|open loop|deferred|unfinishedness|未完成|还缺|闭环|继续推进/u.test(input.localAffectSignalText)

  const receivedWarmth = !input.hostContinuityWorry && !boundaryPressure && !verificationFriction && (
    input.closure.reinforcementEvents.some(item => item.valence === 'reinforce' && Number(item.delta ?? 0) > 0)
    || input.closure.relationshipOutcomes.some(item =>
      Number(item.trustDelta ?? 0) > 0.02
      || Number(item.closenessDelta ?? 0) > 0.02
      || /valued|useful|helpful|validated|received|relief|有用|有帮助|被接住/u.test(`${item.summary} ${item.actionSummary}`),
    )
    || /valued|useful|helpful|validated|received|relief|permission|有用|有帮助|被接住/u.test(input.localAffectSignalText)
  )

  const selfRepairActive = boundaryPressure
    || input.hostContinuityWorry
    || unfinishedCarry
    || /guilt|亏欠|unfinished|未完成|slight|repair|not this|missed|boundary|uncertain|careful|打扰|修复/u.test(input.localAffectSignalText)

  const hostEmotion = input.hostContinuityWorry
    ? {
        label: 'worried-continuity',
        summary: uniqueClosureTexts([
          'The host is worried the reply could drift into a disconnected tool-shell pattern instead of staying relationship-continuous.',
          input.relationshipTexts[0] ?? null,
        ], 2).join(' '),
        intensity: 0.78,
      }
    : deferredAttention
      ? {
          label: 'deferred-attention',
          summary: uniqueClosureTexts([
            'The host let this line pause for now, so it should stay quietly held until a fresher opening returns.',
            input.relationshipTexts[0] ?? null,
          ], 2).join(' '),
          intensity: 0.46,
        }
      : repairFriction
        ? {
            label: 'repair-friction',
            summary: uniqueClosureTexts([
              'The host needed the line to recenter around the actual point before it could continue.',
              input.relationshipTexts[0] ?? null,
            ], 2).join(' '),
            intensity: 0.64,
          }
        : samePersonTest
          ? {
              label: 'same-person-attention',
              summary: uniqueClosureTexts([
                'The host is checking whether this still belongs to the current thread.',
                input.relationshipTexts[0] ?? null,
              ], 2).join(' '),
              intensity: 0.58,
            }
          : hostSoundsTired
            ? {
                label: 'host-tired',
                summary: uniqueClosureTexts([
                  'The host sounds tired and needs lower-pressure companionship that stays gentle around the present condition.',
                  input.relationshipTexts[0] ?? null,
                ], 2).join(' '),
                intensity: 0.68,
              }
            : hostSoundsHurt
              ? {
                  label: 'host-hurt',
                  summary: uniqueClosureTexts([
                    'The host sounds hurt and needs gentler contact around the present condition before anything wider.',
                    input.relationshipTexts[0] ?? null,
                  ], 2).join(' '),
                  intensity: 0.7,
                }
              : hostSoundsSad
                ? {
                    label: 'host-sad',
                    summary: uniqueClosureTexts([
                      'The host sounds low and needs gentler presence around the present condition instead of a wider shift.',
                      input.relationshipTexts[0] ?? null,
                    ], 2).join(' '),
                    intensity: 0.62,
                  }
                : hostSoundsStressed
                  ? {
                      label: 'host-stressed',
                      summary: uniqueClosureTexts([
                        'The host sounds overloaded and needs lighter, steadier presence around the present condition.',
                        input.relationshipTexts[0] ?? null,
                      ], 2).join(' '),
                      intensity: 0.66,
                    }
                  : boundaryPressure
                    ? {
                        label: 'boundary-pressure',
                        summary: uniqueClosureTexts([
                          'The host needed more room, lighter timing, or less interruption pressure around this closure.',
                          input.relationshipTexts[0] ?? null,
                        ], 2).join(' '),
                        intensity: 0.74,
                      }
                    : verificationFriction
                      ? {
                          label: 'verification-friction',
                          summary: uniqueClosureTexts([
                            'The host needed more proof before this closure could sound fully settled.',
                            input.relationshipTexts[0] ?? null,
                          ], 2).join(' '),
                          intensity: 0.58,
                        }
                      : receivedWarmth
                        ? {
                            label: 'received-warmth',
                            summary: uniqueClosureTexts([
                              'The host received this return warmly enough for it to feel genuinely useful without extra pressure.',
                              input.relationshipTexts[0] ?? null,
                            ], 2).join(' '),
                            intensity: 0.36,
                          }
                        : {
                            label: 'relationship-context',
                            summary: input.relationshipTexts[0] ?? input.fallbackSummary,
                            intensity: unfinishedCarry ? 0.52 : 0.48,
                          }

  const selfEmotion = selfRepairActive
    ? {
        label: 'careful-repair',
        summary: uniqueClosureTexts([
          ...input.selfRepairFeeling,
          boundaryPressure ? 'I should lower the pressure and repair the line before widening.' : null,
          verificationFriction ? 'I should verify more before sounding fully sure next time.' : null,
          unfinishedCarry ? 'The line still feels unfinished, so I should stay attentive without pushing.' : null,
        ], 4).join(' ') || 'Keep the memory repair-aware and traceable.',
        intensity: boundaryPressure ? 0.68 : unfinishedCarry ? 0.62 : 0.56,
      }
    : deferredAttention
      ? {
          label: 'quiet-hold',
          summary: uniqueClosureTexts([
            ...input.selfRepairFeeling,
            'I should keep the line quietly held and wait for a fresher opening before returning to it.',
          ], 4).join(' '),
          intensity: 0.42,
        }
      : receivedWarmth
        ? {
            label: 'grounded-relief',
            summary: uniqueClosureTexts([
              ...input.selfRepairFeeling,
              'I felt steadier because the return landed usefully without needing extra pressure.',
            ], 4).join(' '),
            intensity: 0.34,
          }
        : verificationFriction
          ? {
              label: 'verification-attention',
              summary: uniqueClosureTexts([
                ...input.selfRepairFeeling,
                'I should stay a little more verification-aware before widening confidence.',
              ], 4).join(' '),
              intensity: 0.52,
            }
          : {
              label: 'continuity-attention',
              summary: uniqueClosureTexts(input.selfRepairFeeling, 4).join(' ') || 'Keep the memory repair-aware and traceable.',
              intensity: 0.46,
            }

  return {
    hostEmotion,
    selfEmotion,
  }
}

function readDirectProjectCadenceFromClosure(closure: AlicizationOutcomeClosureResult) {
  const tags = closure.episodicEvents.flatMap(event => event.tags ?? [])
  const preferredVoiceModeFromTags = tags.includes('project-voice-lower-pressure')
    ? 'lower-pressure'
    : tags.includes('project-voice-even')
      ? 'even'
      : null
  const preferredPacingModeFromTags = tags.includes('project-pacing-slower')
    ? 'slower'
    : tags.includes('project-pacing-natural')
      ? 'natural'
      : null
  const preferredPauseModeFromTags = tags.includes('project-pause-longer')
    ? 'longer'
    : tags.includes('project-pause-natural')
      ? 'natural'
      : null
  const preferredLipsyncModeFromTags = tags.includes('project-lipsync-restrained')
    ? 'restrained'
    : tags.includes('project-lipsync-matched')
      ? 'matched'
      : null
  if (preferredVoiceModeFromTags || preferredPacingModeFromTags || preferredPauseModeFromTags || preferredLipsyncModeFromTags) {
    return {
      preferredVoiceMode: preferredVoiceModeFromTags,
      preferredPacingMode: preferredPacingModeFromTags,
      preferredPauseMode: preferredPauseModeFromTags,
      preferredLipsyncMode: preferredLipsyncModeFromTags,
    }
  }

  const cadenceText = lowerHumanlikeMemoryText(
    ...closure.episodicEvents.flatMap(event => [
      (() => {
        const latestReconsolidation = closureObjectFrom(event)?.latestReconsolidation
        if (!latestReconsolidation || typeof latestReconsolidation !== 'object' || Array.isArray(latestReconsolidation))
          return null
        return sanitizeHumanlikeMemoryText(
          (latestReconsolidation as Record<string, unknown>).lesson,
          220,
        ) || null
      })(),
      event.sourceSummary,
      event.lesson,
      event.whatChanged,
      event.relationshipMeaning,
    ]),
  )
  const carriesExplicitProjectCadence = /project-cadence[:=]|project cadence[:=]/u.test(cadenceText)
  const preferredVoiceMode = carriesExplicitProjectCadence
    ? /\beven voice\b/u.test(cadenceText)
      ? 'even'
      : /\blower-pressure voice\b/u.test(cadenceText)
        ? 'lower-pressure'
        : null
    : null
  const preferredPacingMode = carriesExplicitProjectCadence
    ? /\bnatural pacing\b/u.test(cadenceText)
      ? 'natural'
      : /\bslower pacing\b/u.test(cadenceText)
        ? 'slower'
        : null
    : null
  const preferredPauseMode = carriesExplicitProjectCadence
    ? /\bnatural pause\b/u.test(cadenceText)
      ? 'natural'
      : /\blonger pause\b/u.test(cadenceText)
        ? 'longer'
        : null
    : null
  const preferredLipsyncMode = carriesExplicitProjectCadence
    ? /\bmatched lipsync\b/u.test(cadenceText)
      ? 'matched'
      : /\brestrained lipsync\b/u.test(cadenceText)
        ? 'restrained'
        : null
    : null
  return {
    preferredVoiceMode,
    preferredPacingMode,
    preferredPauseMode,
    preferredLipsyncMode,
  }
}

function buildHumanlikeMemoryCandidateFromClosure(input: {
  closure: AlicizationOutcomeClosureResult
  previousPersonStateUpdateSurface?: AlicizationPersonStateUpdateSurface | null
  nextPersonStateUpdateSurface: AlicizationPersonStateUpdateSurface
  personStateUpdateRecord: ReturnType<typeof buildAlicizationPersonStateUpdateRecord>
  hostCorrections?: AlicizationHumanlikeMemoryHostCorrection[]
  now: number
}) {
  const closure = input.closure
  const projectStateContinuity = input.nextPersonStateUpdateSurface.projectStateContinuity
  const directProjectCadence = readDirectProjectCadenceFromClosure(closure)
  const shouldBlendProjectContinuityIntoCandidate
    = closureCarriesIntrinsicHumanlikeMemoryCue(closure)
      && !closureLooksSparseAndTentativeForProjectCarry(closure)
  const relationshipTexts = uniqueClosureTexts([
    ...listClosureDerivedDialogueCandidates({
      closure,
      prefix: 'host feedback dialogue: ',
    }),
    ...closure.episodicEvents.flatMap(item => [item.relationshipMeaning, item.lesson, item.whatChanged, normalizeDialogueFeedbackHostFacingText(item)]),
    ...closure.relationshipOutcomes.flatMap(item => [
      item.summary,
      isDialogueReplyFeedbackAssistantEcho(item) ? null : item.actionSummary,
    ]),
    shouldBlendProjectContinuityIntoCandidate ? projectStateContinuity?.sameHerDriftRisk ?? null : null,
    shouldBlendProjectContinuityIntoCandidate ? projectStateContinuity?.openClosureSummary ?? null : null,
  ], 10)
  const executionTexts = uniqueClosureTexts([
    ...closure.relationshipOutcomes
      .filter(item => item.sourceKind === 'execution')
      .flatMap(item => [item.actionSummary, item.summary]),
    ...closure.episodicEvents
      .filter(item => `${item.sourceKind}`.includes('execution'))
      .flatMap(item => [item.whatHappened, item.relationshipMeaning, item.lesson]),
  ], 8)
  const reinforcementTexts = uniqueClosureTexts(closure.reinforcementEvents.map(item => item.summary), 6)
  const allText = uniqueClosureTexts([
    ...relationshipTexts,
    ...executionTexts,
    ...reinforcementTexts,
    shouldBlendProjectContinuityIntoCandidate ? projectStateContinuity?.proactiveSameHerGap ?? null : null,
    shouldBlendProjectContinuityIntoCandidate ? projectStateContinuity?.emotionalClosureCue ?? null : null,
  ], 18).join(' ')

  if (!allText)
    return null

  const localHostContinuityText = uniqueClosureTexts([
    ...listClosureDerivedDialogueCandidates({
      closure,
      prefix: 'host feedback dialogue: ',
    }),
    ...closure.relationshipOutcomes.flatMap(item => [
      item.summary,
      isDialogueReplyFeedbackAssistantEcho(item) ? null : item.actionSummary,
    ]),
    ...closure.episodicEvents.flatMap(item => [item.relationshipMeaning, normalizeDialogueFeedbackHostFacingText(item)]),
  ], 12).join(' ')
  const localAffectSignalText = uniqueClosureTexts([
    ...listClosureDerivedDialogueCandidates({
      closure,
      prefix: 'host feedback dialogue: ',
    }),
    ...closure.relationshipOutcomes.flatMap(item => [item.summary, item.actionSummary]),
    ...closure.reinforcementEvents.map(item => item.summary),
    ...closure.episodicEvents.flatMap(item => [item.whatHappened, item.relationshipMeaning, item.lesson, item.felt, ...(item.emotionTags ?? [])]),
  ], 18).join(' ')
  const hostContinuityWorry = closureTextContains(
    localHostContinuityText,
    /worr|disconnect|tool shell|generic task|generic shell|断线|工具壳|担心|滑成/u,
  )
  const selfRepairFeeling = uniqueClosureTexts([
    ...closure.episodicEvents.map(item => item.felt),
    ...reinforcementTexts,
    shouldBlendProjectContinuityIntoCandidate ? projectStateContinuity?.emotionalClosureCue ?? null : null,
  ], 6)
  const structuredEmbodimentTexts = shouldBlendProjectContinuityIntoCandidate
    ? uniqueClosureTexts([
        projectStateContinuity?.sameHerHoldDetail
          ? /^continuity hold:/iu.test(projectStateContinuity.sameHerHoldDetail)
            ? projectStateContinuity.sameHerHoldDetail
            : `continuity hold: ${projectStateContinuity.sameHerHoldDetail}`
          : null,
        projectStateContinuity?.continuityRestraint
          ? `continuity restraint: ${projectStateContinuity.continuityRestraint}, lower-pressure voice, slower pacing, longer pause, restrained lipsync`
          : null,
      ], 8)
    : []
  const runtimeEmbodimentTexts = buildRuntimeEmbodimentClosureTexts(closure)
  const runtimeResidentState = buildRuntimeEmbodimentResidentStateFromClosure(closure)
  const directEmbodimentTexts = uniqueClosureTexts([
    ...closure.episodicEvents.flatMap(item => [
      item.relationshipMeaning,
      item.lesson,
      item.whatHappened,
      item.felt,
    ]),
    ...relationshipTexts,
  ], 8)
  const thinEmbodimentCue = runtimeEmbodimentTexts.length === 0
    && /body-aware|lacks concrete|modality proof|not proven|not settled|uncertain embodiment|身体|模态/u.test(directEmbodimentTexts.join(' '))
  const embodimentTexts = uniqueClosureTexts([
    ...runtimeEmbodimentTexts,
    ...(thinEmbodimentCue ? directEmbodimentTexts : structuredEmbodimentTexts),
    ...(thinEmbodimentCue ? structuredEmbodimentTexts : directEmbodimentTexts),
    shouldBlendProjectContinuityIntoCandidate ? projectStateContinuity?.emotionalClosureCue ?? null : null,
  ], 8).filter(item => /continuity hold|identity continuity|embodiment|body|face|voice|pause|lipsync|motion|blink|gaze|accompanying|quiet-accompaniment|protective-watch|active-dialogue|ambient-covision|rest-protective|repair|cadence|身体|表情|声音|停顿|动作/u.test(item))
  const dialogue = buildHumanlikeDialogueFromClosure({
    closure,
    nextPersonStateUpdateSurface: input.nextPersonStateUpdateSurface,
  })
  const openLoopDelta = closure.relationshipOutcomes.reduce((sum, item) => sum + Math.max(0, Number(item.openLoopDelta ?? 0)), 0)
  const executionStatus = inferHumanlikeExecutionStatusFromClosure({
    closure,
    executionTexts,
    openLoopDelta,
  })
  const executionProposalTexts = uniqueClosureTexts([
    ...closure.relationshipOutcomes
      .filter(item => item.sourceKind === 'execution' && /^execution-proposal:/iu.test(sanitizeHumanlikeMemoryText(item.actionSummary, 180)))
      .flatMap(item => [item.actionSummary, item.summary]),
    ...closure.episodicEvents
      .filter(item => item.sourceKind === 'execution-proposal')
      .flatMap(item => [item.whatHappened, item.relationshipMeaning, item.lesson, ...(item.tags ?? [])]),
  ], 10).join(' ')
  const proactiveOutcomes = closure.relationshipOutcomes.filter(item => item.sourceKind === 'proactive')
  const proactiveDismissed = proactiveOutcomes.some(item =>
    /actively rejected|crossed a boundary|dismissed|too eager|打扰|越界|拒绝/u.test(`${item.summary} ${item.actionSummary}`),
  )
  const proactiveIgnored = proactiveOutcomes.some(item =>
    /did not earn a reply window|get lighter|ignored|turned away|没拿到回复窗口|忽略/u.test(`${item.summary} ${item.actionSummary}`),
  )
  const proactiveRejected = proactiveDismissed || (!proactiveIgnored && proactiveOutcomes.some(item =>
    Number(item.boundaryDelta ?? 0) < 0
    || Number(item.burdenDelta ?? 0) > 0
    || Number(item.misreadDelta ?? 0) > 0
    || /rejected|crossed a boundary|dismissed|too eager|打扰|越界|拒绝/u.test(`${item.summary} ${item.actionSummary}`),
  )
  )
  const proactiveAccepted = proactiveOutcomes.some(item =>
    Number(item.trustDelta ?? 0) > 0
    || Number(item.repairDelta ?? 0) > 0
    || Number(item.openLoopDelta ?? 0) > 0
    || /received without obvious resistance|accepted|reply-within-120s|window is open|被接住|接受/u.test(`${item.summary} ${item.actionSummary}`),
  )
  const executionProposalDenied = /execution-proposal/u.test(executionProposalTexts)
    && /feedback:denied|explicitly declined|host-prefers-explicit-consent|lower pressure|lower-pressure/u.test(executionProposalTexts)
  const executionProposalAffirmed = /execution-proposal/u.test(executionProposalTexts)
    && !executionProposalDenied
    && /feedback:affirmed|explicitly allowed|host-accepts-bounded-proposals|give explicit consent|giving explicit consent/u.test(executionProposalTexts)
  const executionProposalInterrupted = /execution-proposal/u.test(executionProposalTexts)
    && !executionProposalDenied
    && !executionProposalAffirmed
    && /feedback:interrupted|still pending|fresher opening|host-prefers-fresher-opening/u.test(executionProposalTexts)
  const initiativeOutcome = proactiveIgnored
    ? {
        outcome: 'ignored',
        userReaction: 'ignored',
      }
    : proactiveRejected
      ? {
          outcome: 'rejected',
          userReaction: 'rejected',
        }
      : proactiveAccepted
        ? {
            outcome: 'continue-progress',
            userReaction: 'accepted',
          }
        : executionProposalDenied
          ? {
              outcome: 'rejected',
              userReaction: 'rejected',
            }
          : executionProposalInterrupted
            ? {
                outcome: 'ignored',
                userReaction: 'ignored',
              }
            : executionProposalAffirmed
              ? {
                  outcome: 'accepted',
                  userReaction: 'accepted',
                }
              : null
  const emotionalCarry = inferClosureEmotionCarry({
    closure,
    relationshipTexts,
    reinforcementTexts,
    selfRepairFeeling,
    hostContinuityWorry,
    fallbackSummary: input.nextPersonStateUpdateSurface.summary,
    projectStateEmotionalClosureCue: shouldBlendProjectContinuityIntoCandidate ? projectStateContinuity?.emotionalClosureCue ?? null : null,
    localRelationshipSignalText: localHostContinuityText,
    localAffectSignalText,
  })
  const embodimentModalityConsistency = inferClosureEmbodimentModalityConsistency({
    closure,
    runtimeEmbodimentTexts,
    embodimentTexts,
  })
  const initiativeStrategyCarry = readHumanlikeInitiativeStrategyCarryFromSurface(input.previousPersonStateUpdateSurface)
    || readHumanlikeInitiativeStrategyCarryFromSurface(input.nextPersonStateUpdateSurface)

  const candidate = buildHumanlikeMemoryCandidate({
    now: input.now,
    turnId: input.personStateUpdateRecord.turnId ?? `turn:${input.personStateUpdateRecord.decisionTraceId ?? input.now}`,
    sessionId: input.personStateUpdateRecord.sessionId,
    dialogue,
    execution: executionTexts.length > 0
      ? {
          summary: executionTexts.join(' | '),
          status: executionStatus ?? (openLoopDelta > 0 ? 'partial' : 'completed'),
        }
      : null,
    hostEmotion: emotionalCarry.hostEmotion,
    selfEmotion: {
      ...emotionalCarry.selfEmotion,
      summary: uniqueClosureTexts([
        emotionalCarry.selfEmotion.summary,
        input.nextPersonStateUpdateSurface.repairHints[0] ?? null,
      ], 4).join(' | ') || emotionalCarry.selfEmotion.summary,
    },
    embodiment: embodimentTexts.length > 0
      ? {
          summary: embodimentTexts.join(' | '),
          recallStrength: openLoopDelta > 0 ? 'strongly-moved' : 'lightly-noticed',
          modalityConsistency: embodimentModalityConsistency,
          residentState: runtimeResidentState,
        }
      : null,
    affectiveResidue: closure.affectiveResidue ?? null,
    relationship: {
      threadAnchor: closure.episodicEvents.find(item => sanitizeHumanlikeMemoryText(item.threadAnchor, 120))?.threadAnchor ?? 'humanlike memory closure',
      summary: relationshipTexts.join(' | ') || input.nextPersonStateUpdateSurface.summary,
    },
    priorMemories: buildPriorHumanlikeMemoriesFromPersonState(input.previousPersonStateUpdateSurface ?? null),
    hostCorrections: input.hostCorrections,
    initiative: initiativeOutcome,
    initiativeStrategyCarry,
    autobiographical: {
      currentEra: projectStateContinuity?.currentPhase ?? 'local desktop memory-dialogue loop',
      lesson: uniqueClosureTexts(((input.hostCorrections?.length ?? 0) > 0
        ? [
            closure.episodicEvents[0]?.lesson,
            input.nextPersonStateUpdateSurface.repairHints[0] ?? null,
            shouldBlendProjectContinuityIntoCandidate ? projectStateContinuity?.sameHerSelfLine ?? null : null,
          ]
        : [
            shouldBlendProjectContinuityIntoCandidate ? projectStateContinuity?.sameHerSelfLine ?? null : null,
            closure.episodicEvents[0]?.lesson,
            input.nextPersonStateUpdateSurface.repairHints[0] ?? null,
          ]), 3).join(' | '),
    },
    projectStatePreferredVoiceMode: directProjectCadence.preferredVoiceMode,
    projectStatePreferredPacingMode: directProjectCadence.preferredPacingMode,
    projectStatePreferredPauseMode: directProjectCadence.preferredPauseMode,
    projectStatePreferredLipsyncMode: directProjectCadence.preferredLipsyncMode,
  })

  const proactiveSameHerGap = shouldBlendProjectContinuityIntoCandidate
    ? sanitizeHumanlikeMemoryText(projectStateContinuity?.proactiveSameHerGap, 220)
    : ''
  if (!proactiveSameHerGap)
    return candidate

  const projectStateProactiveGapEvidence = `project-state-proactive-gap:${proactiveSameHerGap}`

  return {
    ...candidate,
    evidence: uniqueClosureTexts([
      projectStateProactiveGapEvidence,
      ...candidate.evidence,
    ], 12),
    emotionalResidue: {
      ...candidate.emotionalResidue,
      trace: uniqueClosureTexts([
        projectStateProactiveGapEvidence,
        ...candidate.emotionalResidue.trace,
      ], 8),
    },
    auditTrail: {
      ...candidate.auditTrail,
      sourceEvidence: uniqueClosureTexts([
        projectStateProactiveGapEvidence,
        ...candidate.auditTrail.sourceEvidence,
      ], 12),
    },
  }
}

function buildHumanlikeSurfaceSensitivityHint(candidate: AlicizationHumanlikeMemoryCandidate) {
  if (candidate.relationshipContext.hostCorrectionApplied || candidate.recallPosture.certainty === 'corrected') {
    return 'Do not fall back to the older misread after a host correction; keep the corrected relationship meaning continuous.'
  }
  if (candidate.recallPosture.certainty === 'tentative') {
    return 'Keep uncertainty explicit instead of pretending this recall is already fully settled.'
  }
  if (candidate.relationshipContext.containsSamePersonTest || candidate.relationshipContext.containsContinuityWorry) {
    return 'Do not flatten continuity into a generic status recap or tool-shell frame.'
  }
  return ''
}

function readHumanlikeSurfaceLeadLine(raw: string | null | undefined) {
  const normalized = sanitizeHumanlikeMemoryText(raw, 260)
  if (!normalized)
    return ''
  return sanitizeHumanlikeMemoryText(
    normalized
      .split(/\s*\|\s*/u)
      .map(part => sanitizeHumanlikeMemoryText(part, 220))
      .find(Boolean),
    220,
  )
}

function applyHumanlikeMemoryCandidateToPersonStateSurface(input: {
  surface: AlicizationPersonStateUpdateSurface
  candidate: AlicizationHumanlikeMemoryCandidate | null
}) {
  const candidate = input.candidate
  if (!candidate)
    return input.surface

  const autobiographicalLead = readHumanlikeSurfaceLeadLine(candidate.autobiographicalImpact.selfNarrativeDelta)
  const relationshipLead = readHumanlikeSurfaceLeadLine(candidate.relationshipContext.summary)
  const naturalRecallLead = sanitizeHumanlikeMemoryText(candidate.naturalRecallLine, 260)
  const initiativeStrategyLead = readHumanlikeSurfaceLeadLine(candidate.initiativeOutcomeRecord?.strategyUpdate)
  const correctedCarryPriority = candidate.relationshipContext.hostCorrectionApplied || candidate.recallPosture.certainty === 'corrected'
  const summaryLeadCandidates = correctedCarryPriority
    ? [
        autobiographicalLead,
        relationshipLead,
        naturalRecallLead,
        initiativeStrategyLead,
        input.surface.summary,
      ]
    : [
        autobiographicalLead,
        initiativeStrategyLead,
        input.surface.summary,
        relationshipLead,
      ]

  return {
    ...input.surface,
    summary: sanitizeHumanlikeMemoryText(
      uniqueClosureTexts(summaryLeadCandidates, correctedCarryPriority ? 4 : 3).join(' '),
      420,
    ),
    preferenceHints: uniqueClosureTexts([
      candidate.autobiographicalImpact.stablePreferenceHint,
      input.surface.preferenceHints[0] ?? null,
      ...input.surface.preferenceHints.slice(1),
    ], 6),
    sensitivityHints: uniqueClosureTexts([
      buildHumanlikeSurfaceSensitivityHint(candidate),
      ...input.surface.sensitivityHints,
    ], 6),
    repairHints: uniqueClosureTexts([
      initiativeStrategyLead,
      candidate.emotionKernelInfluence.toneGuidance,
      ...input.surface.repairHints,
    ], 6),
    burdenHints: uniqueClosureTexts([
      input.surface.burdenHints[0] ?? null,
      initiativeStrategyLead,
      candidate.initiativeOpportunity.antiSpamReason,
      ...input.surface.burdenHints.slice(1),
    ], 6),
    narrative: uniqueClosureTexts([
      autobiographicalLead,
      initiativeStrategyLead,
      naturalRecallLead,
      relationshipLead,
      ...input.surface.narrative,
    ], 8),
  }
}

function applyHumanlikeMetabolismToPersonStateSurface(input: {
  surface: AlicizationPersonStateUpdateSurface
  previousSurface?: AlicizationPersonStateUpdateSurface | null
  candidate: AlicizationHumanlikeMemoryCandidate | null
}) {
  const candidate = input.candidate
  if (!candidate || !input.previousSurface)
    return input.surface

  const forgottenIds = new Set(
    candidate.metabolism.forgettingPolicy.forgetMemoryIds
      .filter(id => /^previous-person-state:\d+$/u.test(id)),
  )
  if (forgottenIds.size === 0)
    return input.surface

  const forgottenPriorSummaries = new Set(
    buildPriorHumanlikeMemoriesFromPersonState(input.previousSurface)
      .filter(memory => forgottenIds.has(memory.id))
      .map(memory => sanitizeHumanlikeMemoryText(memory.summary, 180).toLowerCase())
      .filter(Boolean),
  )
  if (forgottenPriorSummaries.size === 0)
    return input.surface

  const shouldKeepSummary = (raw: string | null | undefined) => {
    const normalized = sanitizeHumanlikeMemoryText(raw, 180).toLowerCase()
    return normalized ? !forgottenPriorSummaries.has(normalized) : false
  }

  return {
    ...input.surface,
    narrative: input.surface.narrative.filter(item => shouldKeepSummary(item)),
    sourceTrail: input.surface.sourceTrail.filter(entry => shouldKeepSummary(entry.summary)),
  }
}

function shouldApplyHumanlikeMemoryCandidateToPersonStateSurface(candidate: AlicizationHumanlikeMemoryCandidate | null) {
  if (!candidate)
    return false

  return (
    candidate.longTermWorthiness.shouldPersist
    || candidate.relationshipContext.hostCorrectionApplied
    || candidate.initiativeOutcomeRecord !== null
  )
}

function applyHumanlikeMemoryCandidateToClosurePersistence(input: {
  closure: AlicizationOutcomeClosureResult
  candidate: AlicizationHumanlikeMemoryCandidate | null
}) {
  const candidate = input.candidate
  if (!candidate || input.closure.episodicEvents.length === 0)
    return input.closure

  const shouldDownrankCurrentEpisode = (
    !candidate.longTermWorthiness.shouldPersist
    && !candidate.relationshipContext.hostCorrectionApplied
    && candidate.initiativeOutcomeRecord === null
  )
  if (!shouldDownrankCurrentEpisode) {
    return {
      ...input.closure,
      episodicEvents: input.closure.episodicEvents.map(event => applyHumanlikeCandidateCarryToEpisodicEvent({
        event,
        candidate,
      })),
    } satisfies AlicizationOutcomeClosureResult
  }

  return {
    ...input.closure,
    episodicEvents: input.closure.episodicEvents.map(event => ({
      ...event,
      consolidationPriority: Math.min(
        Number.isFinite(Number(event.consolidationPriority))
          ? Number(event.consolidationPriority)
          : 0.28,
        0.18,
      ),
    })),
  } satisfies AlicizationOutcomeClosureResult
}

export function createAlicizationRuntimeMemoryClosure(options: CreateAlicizationRuntimeMemoryClosureOptions) {
  async function persistOutcomeClosure(cardIdRaw: unknown, input: AlicizationOutcomeClosureResult) {
    const cardId = options.normalizeCardId(cardIdRaw)
    const closure = attachSynthesizedReflections(input)
    const emotionalWritebackArtifacts = buildEmotionalTransitionWritebackArtifacts({
      cardId,
      now: options.now(),
      ledger: closure.emotionalTransitionLedger ?? null,
    })
    if (emotionalWritebackArtifacts.episodicEvents.length > 0)
      closure.episodicEvents.push(...emotionalWritebackArtifacts.episodicEvents)
    if (emotionalWritebackArtifacts.reflections.length > 0)
      closure.reflections.push(...emotionalWritebackArtifacts.reflections)
    const embodimentWritebackArtifacts = buildEmbodimentContinuityWritebackArtifacts({
      cardId,
      now: options.now(),
      ledger: closure.embodimentContinuityLedger ?? null,
    })
    if (embodimentWritebackArtifacts.episodicEvents.length > 0)
      closure.episodicEvents.push(...embodimentWritebackArtifacts.episodicEvents)
    if (embodimentWritebackArtifacts.reflections.length > 0)
      closure.reflections.push(...embodimentWritebackArtifacts.reflections)
    if (
      closure.relationshipOutcomes.length === 0
      && closure.reinforcementEvents.length === 0
      && closure.memoryFacts.length === 0
      && closure.reflections.length === 0
      && closure.episodicEvents.length === 0
    ) {
      return
    }

    const task = async () => {
      if (closure.relationshipOutcomes.length > 0)
        await options.alicizationDb.appendRelationshipOutcomes(closure.relationshipOutcomes)
      if (closure.reinforcementEvents.length > 0)
        await options.alicizationDb.appendPersonaReinforcementEvents(closure.reinforcementEvents)
      const previousPersonStateUpdateSurface = await options.alicizationDb.readMindHead<AlicizationPersonStateUpdateSurface>(cardId, 'person-state-update-surface').catch(() => null)
      const basePersonStateUpdateSurface = buildAlicizationPersonStateUpdateSurface({
        closure,
        previous: previousPersonStateUpdateSurface,
        now: options.now(),
      })
      const provisionalPersonStateUpdateRecord = buildAlicizationPersonStateUpdateRecord({
        closure,
        surface: basePersonStateUpdateSurface,
      })
      const rawHumanlikeMemoryCandidate = (
        closure.relationshipOutcomes.length > 0
        || closure.reinforcementEvents.length > 0
        || closure.episodicEvents.length > 0
      )
        ? buildHumanlikeMemoryCandidateFromClosure({
            closure,
            previousPersonStateUpdateSurface,
            nextPersonStateUpdateSurface: basePersonStateUpdateSurface,
            personStateUpdateRecord: provisionalPersonStateUpdateRecord,
            hostCorrections: await listRecentHumanlikeHostCorrections(options),
            now: options.now(),
          })
        : null
      const humanlikeMemoryCandidate = rawHumanlikeMemoryCandidate
        ? sanitizeMemoryClosureWritebackValue(rawHumanlikeMemoryCandidate, 'humanlikeMemoryCandidate')
        : null
      const humanlikeMetabolismReflections = buildHumanlikeMetabolismReflections({
        closure,
        candidate: humanlikeMemoryCandidate,
        createdAt: provisionalPersonStateUpdateRecord.createdAt,
      })
      const closureForPersistence = applyHumanlikeMemoryCandidateToClosurePersistence({
        closure,
        candidate: humanlikeMemoryCandidate,
      })
      const episodicEventsToPersist = sanitizeMemoryClosureWritebackValue(closureForPersistence.episodicEvents, 'episodicEvents')
      const persistedEpisodicEvents = episodicEventsToPersist.length > 0
        ? listPersistedEpisodicRecords(await options.alicizationDb.appendEpisodicEvents(episodicEventsToPersist))
        : []
      const metabolismReconsolidatedEpisodes = buildHumanlikeMetabolismReconsolidatedEpisodes({
        persistedEvents: persistedEpisodicEvents,
        candidate: humanlikeMemoryCandidate,
        createdAt: provisionalPersonStateUpdateRecord.createdAt,
      })
      if (metabolismReconsolidatedEpisodes.length > 0)
        await options.alicizationDb.persistEpisodicReconsolidations?.(metabolismReconsolidatedEpisodes)
      const reflectionsToPersist = sanitizeMemoryClosureWritebackValue(
        [...closure.reflections, ...humanlikeMetabolismReflections],
        'memoryReflections',
      )
      if (reflectionsToPersist.length > 0)
        await options.alicizationDb.upsertMemoryReflections(reflectionsToPersist)
      const candidateAppliedPersonStateSurface = shouldApplyHumanlikeMemoryCandidateToPersonStateSurface(humanlikeMemoryCandidate)
        ? applyHumanlikeMemoryCandidateToPersonStateSurface({
            surface: basePersonStateUpdateSurface,
            candidate: humanlikeMemoryCandidate,
          })
        : basePersonStateUpdateSurface
      const nextPersonStateUpdateSurface = applyHumanlikeMetabolismToPersonStateSurface({
        surface: candidateAppliedPersonStateSurface,
        previousSurface: previousPersonStateUpdateSurface,
        candidate: humanlikeMemoryCandidate,
      })
      const personStateSurfaceToPersist = sanitizeMemoryClosureWritebackValue(nextPersonStateUpdateSurface, 'personStateUpdateSurface')
      await options.alicizationDb.upsertMindHead(cardId, 'person-state-update-surface', personStateSurfaceToPersist)
      if (
        closure.relationshipOutcomes.length > 0
        || closure.reinforcementEvents.length > 0
        || closure.episodicEvents.length > 0
      ) {
        const personStateUpdateRecord = buildAlicizationPersonStateUpdateRecord({
          closure,
          surface: nextPersonStateUpdateSurface,
        })
        const evolutionEntry = buildAlicizationPersonStateEvolutionEntry({
          closure,
          previous: previousPersonStateUpdateSurface,
          next: nextPersonStateUpdateSurface,
          record: personStateUpdateRecord,
        })
        if (evolutionEntry)
          await options.alicizationDb.appendPersonStateEvolutionEntries(sanitizeMemoryClosureWritebackValue([evolutionEntry], 'personStateEvolutionEntries'))
        await options.alicizationDb.appendMindTurnEvents([sanitizeMemoryClosureWritebackValue({
          decisionTraceId: options.ensureMindGovernanceDecisionTraceId(personStateUpdateRecord.decisionTraceId, personStateUpdateRecord.createdAt),
          turnId: personStateUpdateRecord.turnId,
          sessionId: personStateUpdateRecord.sessionId,
          origin: personStateUpdateRecord.origin,
          kind: 'person-state-updated',
          payload: {
            version: personStateUpdateRecord.version,
            updatedAt: personStateUpdateRecord.updatedAt,
            summary: personStateUpdateRecord.summary,
            projectStateContinuity: personStateUpdateRecord.projectStateContinuity ?? null,
            dominantContexts: personStateUpdateRecord.dominantContexts,
            relationshipShift: personStateUpdateRecord.relationshipShift,
            reinforcementBias: personStateUpdateRecord.reinforcementBias,
            preferenceHints: personStateUpdateRecord.preferenceHints,
            sensitivityHints: personStateUpdateRecord.sensitivityHints,
            repairHints: personStateUpdateRecord.repairHints,
            burdenHints: personStateUpdateRecord.burdenHints,
            narrative: personStateUpdateRecord.narrative,
            sourceTrail: personStateUpdateRecord.sourceTrail,
            sourceKinds: personStateUpdateRecord.sourceKinds,
            sourceCounts: personStateUpdateRecord.sourceCounts,
            affectiveResidue: personStateUpdateRecord.affectiveResidue ?? null,
            activeThreadId: personStateUpdateRecord.activeThreadId,
            humanlikeMemoryCandidate,
          },
          createdAt: personStateUpdateRecord.createdAt,
        }, 'mindTurnEvent')])
      }
      if (closure.memoryFacts.length > 0) {
        const existingFacts = options.alicizationDb.listMemoryFacts
          ? await options.alicizationDb.listMemoryFacts().catch(() => [])
          : []
        const assimilation = options.knowledgeAssimilationRuntime.assimilateMemoryFactsDetailed({
          facts: closure.memoryFacts,
          source: 'rule',
          existingFacts,
        })
        if (assimilation.corrections.length > 0 && options.alicizationDb.applyMemoryFactCorrections)
          await options.alicizationDb.applyMemoryFactCorrections(sanitizeMemoryClosureWritebackValue(assimilation.corrections, 'memoryFactCorrections'))
        await options.alicizationDb.upsertMemoryFacts(sanitizeMemoryClosureWritebackValue(assimilation.facts, 'memoryFacts'), 'rule')
      }
    }

    try {
      if (cardId === options.getActiveCardId()) {
        await task()
      }
      else {
        await options.withCardScope(cardId, async () => {
          await task()
        }, {
          label: `outcome-closure.persist:${cardId}`,
        })
      }
    }
    catch (error) {
      await options.appendAuditLog({
        level: 'warning',
        category: 'alicization.memory',
        action: 'outcome-closure-persist-failed',
        message: 'Failed to persist mind-memory closure records from a runtime outcome.',
        payload: {
          cardId,
          reason: options.errorMessageFrom(error) ?? 'unknown-error',
          relationshipOutcomes: closure.relationshipOutcomes.length,
          episodicEvents: closure.episodicEvents.length,
          reinforcementEvents: closure.reinforcementEvents.length,
          reflections: closure.reflections.length,
          memoryFacts: closure.memoryFacts.length,
        },
      }, cardId)
    }
  }

  async function persistAutobiographicalEpisodes(cardIdRaw: unknown, input: {
    label: string
    events: AlicizationEpisodicEventInput[]
  }) {
    const cardId = options.normalizeCardId(cardIdRaw)
    if (input.events.length === 0)
      return

    const task = async () => {
      await options.alicizationDb.appendEpisodicEvents(sanitizeMemoryClosureWritebackValue(input.events, 'autobiographicalEpisodes'))
    }

    try {
      if (cardId === options.getActiveCardId()) {
        await task()
      }
      else {
        await options.withCardScope(cardId, async () => {
          await task()
        }, {
          label: `${input.label}:${cardId}`,
        })
      }
    }
    catch (error) {
      await options.appendAuditLog({
        level: 'warning',
        category: 'alicization.memory',
        action: 'autobiographical-episode-sync-failed',
        message: 'Failed to backfill autobiographical episodes from continuity or execution sync.',
        payload: {
          cardId,
          label: input.label,
          count: input.events.length,
          reason: options.errorMessageFrom(error) ?? 'unknown-error',
        },
      }, cardId)
    }
  }

  async function persistPreparedMirrorAutobiographicalEpisodes(input: {
    cardId: string
    decisionTraceId?: string | null
    turnId?: string | null
    sessionId: string
    previousMirror?: AlicizationDialogueSessionMirror | null
    mirror: AlicizationDialogueSessionMirror
  }) {
    const projectStateBrief = resolveAlicizationProjectStateBrief()
    const events = buildAutobiographicalEpisodesFromPreparedMirror({
      ...input,
      projectStatePreDialogueAwarenessLine: projectStateBrief.preDialogueAwarenessLine ?? null,
      projectStatePreflightSummary: projectStateBrief.preflightSummary ?? null,
      projectStateEmotionalClosureCue: projectStateBrief.emotionalClosureCue ?? null,
      projectStatePrimaryOpenLoop: projectStateBrief.openLoops[0] ?? null,
      projectStateSameHerSelfLine: projectStateBrief.sameHerSelfLine ?? null,
    })
    await persistAutobiographicalEpisodes(input.cardId, {
      label: 'prepared-session-mirror.autobio',
      events,
    })
  }

  async function persistSessionMirrorAutobiographicalEpisodes(input: {
    cardId: string
    decisionTraceId?: string | null
    source: string
    turnId?: string | null
    sessionId: string
    previousMirror?: AlicizationDialogueSessionMirror | null
    mirror: AlicizationDialogueSessionMirror
    taskThread?: AlicizationTaskThreadRecord | null
  }) {
    const events = buildAutobiographicalEpisodesFromSessionMirrorSync(input)
    await persistAutobiographicalEpisodes(input.cardId, {
      label: 'session-mirror.autobio',
      events,
    })
  }

  return {
    persistOutcomeClosure,
    persistAutobiographicalEpisodes,
    persistPreparedMirrorAutobiographicalEpisodes,
    persistSessionMirrorAutobiographicalEpisodes,
  }
}

export type AlicizationRuntimeMemoryClosure = ReturnType<typeof createAlicizationRuntimeMemoryClosure>
