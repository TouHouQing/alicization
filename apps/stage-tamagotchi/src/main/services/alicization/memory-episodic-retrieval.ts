import type {
  AlicizationEpisodicEventRecord,
  AlicizationEpisodicReconsolidationSnapshot,
} from '../../../shared/eventa'

import {
  deriveMemoryContradictionSignal,
  deriveMemoryInterferencePenalty,
  deriveMemorySupersessionSignal,
} from './humanlike-memory'
import { scoreSemanticGraphWalk, scoreSemanticRecall } from './memory-semantic-retrieval'
import { deriveEpisodicMemoryTier, scoreMemoryTierReachability } from './memory-tiering'
import { normalizeOrganicMemoryText } from './organic-memory-hygiene'

const dayMs = 24 * 60 * 60 * 1000

export interface AlicizationMemoryRecollectionIntentLite {
  mode: 'none' | 'conversation-history' | 'autobiographical-history' | 'relationship-history' | 'execution-procedure' | 'experience-pattern'
  temporalFocus: 'recent' | 'recent-or-mid' | 'cross-session' | 'experience-matched' | 'distant'
  searchEpisodes: boolean
  searchConversations: boolean
  searchProceduralExperience: boolean
  queryHints: string[]
  rationale: string
  confidence: number
  recollectionAgenda?: {
    whyRecallNow: string
    goalSimilarity: number
    relationshipNeed: number
    affectivePull: number
    sceneFamiliarity: number
    candidateTimeScopes: Array<{
      scope: 'recent' | 'recent-or-mid' | 'cross-session' | 'experience-matched' | 'distant'
      weight: number
      rationale?: string | null
    }>
    candidateEraFacets: Array<{
      facet: 'phase' | 'relationship-era' | 'task-era' | 'self-era' | 'window'
      weight: number
      rationale?: string | null
    }>
    candidateProcedureLines: string[]
    uncertaintyTolerance: 'low' | 'medium' | 'high'
  } | null
}

export interface AlicizationRankedEpisodicCandidate {
  event: AlicizationEpisodicEventRecord
  score: number
  adjustedScore: number
  affectScore: number
  relationshipScore: number
  falseMemoryRisk: boolean
  interferencePenalty: number
  contradictionSignal: ReturnType<typeof deriveMemoryContradictionSignal>
}

function clamp01(value: number) {
  if (Number.isNaN(value))
    return 0
  return Math.min(1, Math.max(0, value))
}

function tokenizeEpisodeText(text: string) {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .map(token => token.trim())
      .filter(token => token.length >= 2),
  )
}

function uniqueStringArray(values: Array<string | null | undefined>, maxItems = 12) {
  const result: string[] = []
  for (const value of values) {
    if (typeof value !== 'string')
      continue
    const normalized = value.trim()
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

function scoreTokenOverlap(tokens: Set<string>, text: string) {
  if (tokens.size === 0)
    return 0
  const haystack = tokenizeEpisodeText(text)
  if (haystack.size === 0)
    return 0
  let overlap = 0
  for (const token of haystack) {
    if (tokens.has(token))
      overlap += 1
  }
  return overlap / haystack.size
}

function buildReconsolidationSearchText(event: AlicizationEpisodicEventRecord) {
  return [
    event.threadAnchor,
    event.latestReconsolidation?.reason,
    event.latestReconsolidation?.relationshipMeaning,
    event.latestReconsolidation?.lesson,
    ...(event.latestReconsolidation?.emotionTags ?? []),
  ].filter(Boolean).join(' ')
}

function deriveExecutionCallbackCarryMode(event: AlicizationEpisodicEventRecord) {
  const haystack = [
    event.threadAnchor,
    event.whatHappened,
    event.whatChanged,
    event.relationshipMeaning,
    event.lesson,
    event.sourceSummary,
    ...event.tags,
    ...event.emotionTags,
  ].filter(Boolean).join(' ').toLowerCase()
  if (!/execution-callback|callback|soft-handoff|result-mode|result-lead/u.test(haystack))
    return null
  if (/repair-before-closeness|repair first|let repair settle|callback repair/u.test(haystack))
    return 'repair-before-closeness' as const
  if (/lower-pressure|leave room|keep room|space first|bounded/u.test(haystack))
    return 'lower-pressure' as const
  if (/trust warming|trust warmed|trust open|soft handoff/u.test(haystack))
    return 'trust-warming' as const
  return 'execution-callback' as const
}

function readLegacyEventMetadata(event: AlicizationEpisodicEventRecord) {
  const metadata = (event as unknown as { metadata?: unknown }).metadata
  return metadata && typeof metadata === 'object' && !Array.isArray(metadata)
    ? metadata as Record<string, unknown>
    : null
}

function isProjectStateCarryText(raw: unknown) {
  if (typeof raw !== 'string')
    return false
  const normalized = raw.trim().toLowerCase()
  if (!normalized)
    return false
  return /alicization|digital life|local-first|phase 1|same-her|same living|one living|project[-\s]?carry|project state|pre[-\s]?dialogue|preflight|unfinished closure|still-open|closure seam|life loop|task-shell|generic task shell|数字生命|同一个她|同一条线|闭环|具身/u.test(normalized)
}

function readProjectStateCarryText(event: AlicizationEpisodicEventRecord) {
  const metadata = readLegacyEventMetadata(event)
  const formalEventCarryText = [
    event.threadAnchor,
    event.whatHappened,
    event.whatChanged,
    event.relationshipMeaning,
    event.lesson,
    event.sourceSummary,
    event.latestReconsolidation?.reason,
    event.latestReconsolidation?.relationshipMeaning,
    event.latestReconsolidation?.lesson,
    ...event.tags,
    ...event.emotionTags,
  ].filter(isProjectStateCarryText)

  return [
    ...formalEventCarryText,
    typeof metadata?.projectStatePreDialogueAwarenessLine === 'string' ? metadata.projectStatePreDialogueAwarenessLine : '',
    typeof metadata?.projectStateSameHerSelfLine === 'string' ? metadata.projectStateSameHerSelfLine : '',
    typeof metadata?.projectStatePreflightSummary === 'string' ? metadata.projectStatePreflightSummary : '',
    typeof metadata?.projectIdentity === 'string' ? metadata.projectIdentity : '',
    typeof metadata?.projectPhase === 'string' ? metadata.projectPhase : '',
    typeof metadata?.projectPrimaryOpenLoop === 'string' ? metadata.projectPrimaryOpenLoop : '',
    typeof metadata?.projectNextClosureTarget === 'string' ? metadata.projectNextClosureTarget : '',
  ]
    .filter(Boolean)
    .join(' ')
}

function scoreAgendaTimeScope(input: {
  ageDays: number
  recollectionIntent?: AlicizationMemoryRecollectionIntentLite | null
}) {
  const scopes = input.recollectionIntent?.recollectionAgenda?.candidateTimeScopes ?? []
  if (scopes.length === 0)
    return 0

  const matchScope = (scope: typeof scopes[number]['scope']) => {
    switch (scope) {
      case 'recent':
        return input.ageDays <= 1 ? 1 : input.ageDays <= 3 ? 0.56 : 0.08
      case 'recent-or-mid':
        return input.ageDays <= 14 ? 1 : input.ageDays <= 30 ? 0.62 : 0.14
      case 'cross-session':
        return input.ageDays >= 2 ? Math.min(1, 0.42 + input.ageDays / 21) : 0.1
      case 'experience-matched':
        return input.ageDays >= 1 ? Math.min(1, 0.36 + input.ageDays / 14) : 0.22
      case 'distant':
        return input.ageDays >= 14 ? Math.min(1, 0.34 + input.ageDays / 45) : 0.04
      default:
        return 0
    }
  }

  return Math.max(...scopes.map(scope => clamp01(scope.weight) * matchScope(scope.scope)))
}

function scoreAgendaProcedureLines(input: {
  haystack: string
  recollectionIntent?: AlicizationMemoryRecollectionIntentLite | null
}) {
  const lines = input.recollectionIntent?.recollectionAgenda?.candidateProcedureLines ?? []
  if (lines.length === 0)
    return 0
  const needle = tokenizeEpisodeText(lines.join(' '))
  const haystack = tokenizeEpisodeText(input.haystack)
  if (needle.size === 0 || haystack.size === 0)
    return 0
  let overlap = 0
  for (const token of haystack) {
    if (needle.has(token))
      overlap += 1
  }
  return overlap / Math.max(needle.size, haystack.size)
}

export function rankAlicizationEpisodicEvents(input: {
  events: AlicizationEpisodicEventRecord[]
  recallSeed: string
  limit: number
  nowTs: number
  sessionId?: string | null
  turnId?: string | null
  threadAnchors?: string[]
  affectAnchors?: string[]
  relationshipAnchors?: string[]
  sceneAnchor?: string | null
  salienceBias?: number | null
  carryAsMemory?: boolean
  allowDream?: boolean
  recollectionIntent?: AlicizationMemoryRecollectionIntentLite | null
  correctionShapingRationale?: string
  graphBoostByEventId?: Map<string, number> | null
  projectStatePrimaryOpenLoop?: string | null
}) {
  const threadTokens = tokenizeEpisodeText((input.threadAnchors ?? []).join(' '))
  const affectTokens = tokenizeEpisodeText((input.affectAnchors ?? []).join(' '))
  const relationshipTokens = tokenizeEpisodeText((input.relationshipAnchors ?? []).join(' '))
  const sceneTokens = tokenizeEpisodeText(input.sceneAnchor ?? '')
  const recallTokens = tokenizeEpisodeText(input.recallSeed)
  const allowDream = input.allowDream === true
  const salienceBias = clamp01(Number(input.salienceBias ?? 0.5))
  const recollectionIntent = input.recollectionIntent ?? null
  const correctionShapingRationale = (
    (input.affectAnchors?.length ?? 0) > 0
    || (input.relationshipAnchors?.length ?? 0) > 0
  )
    ? normalizeOrganicMemoryText(input.correctionShapingRationale ?? recollectionIntent?.rationale ?? '', 200)
    : ''
  const semanticGraph = scoreSemanticGraphWalk({
    nodes: input.events.map(event => ({
      id: event.id,
      primaryText: event.whatHappened,
      semanticTexts: [
        event.threadAnchor ?? '',
        event.whereSummary ?? '',
        event.relationshipMeaning ?? '',
        event.lesson ?? '',
        event.sourceSummary ?? '',
        ...event.tags,
        ...event.emotionTags,
      ],
      groupKeys: [
        event.sessionId ?? '',
        event.threadAnchor ?? '',
        event.memoryTier ?? '',
        event.sourceKind,
      ],
      neighborKeys: [
        ...event.tags,
        ...event.emotionTags,
        ...event.derivedFrom.map(item => `${item.kind}:${item.id ?? ''}`),
      ],
    })),
    queryTexts: [
      input.recallSeed,
      ...(recollectionIntent?.queryHints ?? []),
      ...(recollectionIntent?.recollectionAgenda?.candidateProcedureLines ?? []),
      correctionShapingRationale,
    ],
    getId: node => node.id,
  })
  const persistentGraphBoostByEventId = input.graphBoostByEventId ?? null
  const projectStatePrimaryOpenLoop = typeof input.projectStatePrimaryOpenLoop === 'string'
    ? input.projectStatePrimaryOpenLoop.trim().toLowerCase()
    : ''
  const anthropomorphicMemoryClosureStillOpen = projectStatePrimaryOpenLoop.includes('memory still needs stronger end-to-end closure')

  const ranked = input.events
    .filter((event) => {
      if (!allowDream && event.provenance === 'dreamt')
        return false
      if ((event.provenance === 'dreamt' || event.latestReconsolidation?.provenance === 'dreamt') && !allowDream)
        return false
      return true
    })
    .map((event) => {
      const latestProvenance = event.latestReconsolidation?.provenance ?? event.provenance
      const memoryText = [
        event.threadAnchor,
        event.whereSummary,
        event.whatHappened,
        event.felt,
        event.whatChanged,
        event.relationshipMeaning,
        event.lesson,
        event.sourceSummary,
        readProjectStateCarryText(event),
        ...event.withWhom,
        ...event.emotionTags,
        ...event.tags,
      ].filter(Boolean).join(' ')
      const reconsolidationText = buildReconsolidationSearchText(event)
      const lexicalScore = scoreTokenOverlap(recallTokens, memoryText)
      const reconsolidationLexicalScore = scoreTokenOverlap(recallTokens, reconsolidationText)
      const threadScore = scoreTokenOverlap(threadTokens, `${event.threadAnchor ?? ''} ${event.whatHappened} ${event.tags.join(' ')}`)
      const reconsolidationThreadScore = scoreTokenOverlap(threadTokens, reconsolidationText)
      const affectScore = scoreTokenOverlap(affectTokens, `${event.felt ?? ''} ${event.emotionTags.join(' ')} ${event.whatChanged ?? ''}`)
      const reconsolidationAffectScore = scoreTokenOverlap(affectTokens, reconsolidationText)
      const relationshipScore = scoreTokenOverlap(relationshipTokens, `${event.withWhom.join(' ')} ${event.relationshipMeaning ?? ''} ${event.whatChanged ?? ''}`)
      const reconsolidationRelationshipScore = scoreTokenOverlap(relationshipTokens, reconsolidationText)
      const sceneScore = scoreTokenOverlap(sceneTokens, `${event.whereSummary ?? ''} ${event.threadAnchor ?? ''}`)
      const intentTokens = tokenizeEpisodeText((recollectionIntent?.queryHints ?? []).join(' '))
      const intentScore = scoreTokenOverlap(
        intentTokens,
        `${event.whereSummary ?? ''} ${event.threadAnchor ?? ''} ${event.whatHappened} ${event.lesson ?? ''} ${event.relationshipMeaning ?? ''} ${event.sourceSummary ?? ''} ${event.tags.join(' ')}`,
      )
      const reconsolidationIntentScore = scoreTokenOverlap(intentTokens, reconsolidationText)
      const recencyScore = Math.exp(-Math.max(0, input.nowTs - event.occurredAt) / (28 * dayMs))
      const recallRecencyScore = event.lastRecalledAt
        ? Math.exp(-Math.max(0, input.nowTs - event.lastRecalledAt) / (7 * dayMs))
        : 0
      const reconsolidationRecencyScore = event.latestReconsolidation?.at
        ? Math.exp(-Math.max(0, input.nowTs - event.latestReconsolidation.at) / (14 * dayMs))
        : 0
      const ageDays = Math.max(0, (input.nowTs - event.occurredAt) / dayMs)
      const executionCallbackCarryMode = deriveExecutionCallbackCarryMode(event)
      const projectStateCarryText = readProjectStateCarryText(event).toLowerCase()
      const projectStateCarryTagged = projectStateCarryText.length > 0
      const executionCallbackProjectCarryTagged = projectStateCarryTagged
        && (
          projectStateCarryText.includes('continuity-execution-callback-project-carry')
          || projectStateCarryText.includes('execution-callback project-carry')
          || projectStateCarryText.includes('callback project-carry')
        )
      const continuityTagged = event.sourceKind === 'maintenance'
        || event.tags.some(tag => /afterthought|continuity|session-mirror|dream/u.test(tag))
        || /session mirror|dream continuity|afterthought/u.test(`${event.sourceSummary ?? ''} ${event.whatChanged ?? ''}`)
      const anthropomorphicContinuityCarrier = continuityTagged
        || Boolean(event.relationshipMeaning?.trim())
        || Boolean(event.lesson?.trim())
        || Boolean(event.threadAnchor?.trim())
      const projectClosureContinuityBoost = anthropomorphicMemoryClosureStillOpen
        && anthropomorphicContinuityCarrier
        && (
          threadScore >= 0.08
          || relationshipScore >= 0.08
          || intentScore >= 0.08
          || reconsolidationThreadScore >= 0.08
          || reconsolidationRelationshipScore >= 0.08
        )
        ? continuityTagged
          ? 0.08
          : event.relationshipMeaning && event.lesson
            ? 0.06
            : 0.04
        : 0
      const distantBoost = recollectionIntent?.temporalFocus === 'cross-session' && ageDays >= 2 ? 0.12 : 0
      const experienceMatchedBoost = recollectionIntent?.temporalFocus === 'experience-matched' && ageDays >= 1 ? 0.1 : 0
      const agendaTimeBoost = scoreAgendaTimeScope({
        ageDays,
        recollectionIntent,
      }) * 0.14
      const agendaProcedureBoost = scoreAgendaProcedureLines({
        haystack: `${event.threadAnchor ?? ''} ${event.whatHappened} ${event.lesson ?? ''} ${event.relationshipMeaning ?? ''} ${event.tags.join(' ')}`,
        recollectionIntent,
      }) * (0.08 + clamp01(recollectionIntent?.recollectionAgenda?.goalSimilarity ?? 0) * 0.14)
      const agendaRelationshipBoost = clamp01(recollectionIntent?.recollectionAgenda?.relationshipNeed ?? 0) >= 0.32
        && relationshipScore > 0.12
        ? clamp01(recollectionIntent?.recollectionAgenda?.relationshipNeed ?? 0) * 0.08
        : 0
      const agendaAffectBoost = clamp01(recollectionIntent?.recollectionAgenda?.affectivePull ?? 0) >= 0.28
        && affectScore > 0.1
        ? clamp01(recollectionIntent?.recollectionAgenda?.affectivePull ?? 0) * 0.06
        : 0
      const afterglowCarryBoost = continuityTagged
        && ageDays <= 7
        && (threadScore > 0.08 || intentScore > 0.08 || agendaProcedureBoost > 0.04 || relationshipScore > 0.08)
        ? event.sourceKind === 'maintenance'
          ? 0.26
          : 0.12
        : 0
      const crossSessionAfterglowBoost = continuityTagged
        && Boolean(input.sessionId && event.sessionId && input.sessionId !== event.sessionId)
        && input.carryAsMemory
        ? event.sourceKind === 'maintenance'
          ? 0.16
          : 0.06
        : 0
      const sessionMirrorCarryBoost = continuityTagged
        && event.sourceKind === 'maintenance'
        && input.carryAsMemory
        && (
          recollectionIntent?.temporalFocus === 'experience-matched'
          || recollectionIntent?.temporalFocus === 'cross-session'
        )
        && (threadScore >= 0.14 || intentScore >= 0.12 || agendaProcedureBoost >= 0.08)
        ? 0.12
        : 0
      const executionCallbackCarryBoost = executionCallbackCarryMode
        && ageDays <= 14
        && (
          recollectionIntent?.mode === 'execution-procedure'
          || recollectionIntent?.temporalFocus === 'experience-matched'
          || threadScore >= 0.1
          || intentScore >= 0.08
          || agendaProcedureBoost >= 0.04
          || relationshipScore >= 0.08
        )
        ? executionCallbackCarryMode === 'lower-pressure'
          ? 0.18
          : executionCallbackCarryMode === 'trust-warming'
            ? 0.16
            : 0.1
        : 0
      const executionCallbackCrossSessionBoost = executionCallbackCarryMode
        && Boolean(input.sessionId && event.sessionId && input.sessionId !== event.sessionId)
        && input.carryAsMemory
        ? executionCallbackCarryMode === 'lower-pressure' ? 0.08 : 0.06
        : 0
      const projectStateCarryBoost = executionCallbackCarryMode
        && projectStateCarryTagged
        && (
          intentScore >= 0.08
          || reconsolidationIntentScore >= 0.08
          || lexicalScore >= 0.08
          || relationshipScore >= 0.08
          || correctionShapingRationale.includes('project')
          || correctionShapingRationale.includes('phase 1')
          || correctionShapingRationale.includes('same digital life')
        )
        ? executionCallbackProjectCarryTagged
          ? 0.12
          : 0.08
        : 0
      const proceduralBoost = recollectionIntent?.searchProceduralExperience
        && (
          event.sourceKind === 'execution-proposal'
          || event.sourceKind === 'execution-result'
          || /execution|proposal|result|cli|codex|claude|patch|fix|workflow|步骤/iu.test(`${event.whatHappened} ${event.lesson ?? ''}`)
        )
        ? 0.14
        : 0
      const relationshipTriggerBoost = (
        recollectionIntent?.mode === 'relationship-history'
        || recollectionIntent?.mode === 'autobiographical-history'
      ) && relationshipScore > 0.18
        ? 0.08
        : 0
      const moodCongruentBoost = affectScore > 0.18 && (
        recollectionIntent?.mode === 'relationship-history'
        || recollectionIntent?.mode === 'autobiographical-history'
      )
        ? 0.06
        : 0
      const sceneAttachmentBoost = sceneScore > 0.14
        ? Math.min(0.12, event.sceneAttachment * 0.12 + sceneScore * 0.08)
        : 0
      const tierBoost = scoreMemoryTierReachability({
        tier: event.memoryTier ?? deriveEpisodicMemoryTier(event, input.nowTs),
        vagueQuery: recallTokens.size <= 3,
        temporalFocus: recollectionIntent?.temporalFocus ?? null,
        longHorizonPreferred: recollectionIntent?.temporalFocus === 'cross-session'
          || recollectionIntent?.temporalFocus === 'distant'
          || recollectionIntent?.temporalFocus === 'experience-matched',
      })
      const semanticScore = scoreSemanticRecall({
        queryTexts: [
          input.recallSeed,
          ...(recollectionIntent?.queryHints ?? []),
          ...(recollectionIntent?.recollectionAgenda?.candidateProcedureLines ?? []),
          correctionShapingRationale,
        ],
        candidateTexts: [
          event.threadAnchor ?? '',
          event.whereSummary ?? '',
          event.whatHappened,
          event.relationshipMeaning ?? '',
          event.lesson ?? '',
          event.sourceSummary ?? '',
          ...event.tags,
          ...event.emotionTags,
        ],
      })
      const semanticGraphBoost = Math.max(
        semanticGraph.graphBoostById.get(event.id) ?? 0,
        persistentGraphBoostByEventId?.get(event.id) ?? 0,
      )
      const familiarityScore = clamp01(event.sceneAttachment * 0.55 + Math.min(0.45, event.recallCount / 10))
      const reconsolidationConfidenceScore = clamp01(event.latestReconsolidation?.confidence ?? 0)
      const reconsolidationCountScore = event.reconsolidationCount > 0
        ? clamp01(Math.min(1, event.reconsolidationCount / 4))
        : 0
      const reconsolidationRebindingBoost = event.reconsolidationCount > 0
        && (input.carryAsMemory || recollectionIntent?.temporalFocus === 'experience-matched')
        && (threadScore >= 0.12 || reconsolidationThreadScore >= 0.12)
        ? Math.min(0.3, 0.14 + reconsolidationRecencyScore * 0.08 + reconsolidationCountScore * 0.08)
        : 0
      const emotionalAmplification = affectScore > 0.24
        ? Math.min(0.14, event.salience * 0.18 + affectScore * 0.12)
        : 0
      const sessionBoost = input.sessionId && event.sessionId === input.sessionId ? 0.06 : 0
      const turnBoost = input.turnId && event.turnId === input.turnId ? 0.04 : 0
      const carryBoost = input.carryAsMemory && (event.provenance === 'remembered' || event.provenance === 'observed') ? 0.04 : 0
      const reconsolidationCarryBoost = input.carryAsMemory && event.reconsolidationCount > 0 ? 0.04 : 0
      const provenancePenalty = latestProvenance === 'dreamt'
        ? 0.06
        : latestProvenance === 'reconstructed'
          ? 0.03
          : 0
      const unstableReconstructionPenalty = latestProvenance === 'reconstructed'
        && lexicalScore < 0.08
        && threadScore < 0.12
        && reconsolidationLexicalScore < 0.12
        ? 0.04
        : 0

      const score
        = lexicalScore * 0.18
          + semanticScore * 0.16
          + semanticGraphBoost * 0.14
          + reconsolidationLexicalScore * 0.08
          + threadScore * 0.26
          + reconsolidationThreadScore * 0.08
          + affectScore * 0.18
          + reconsolidationAffectScore * 0.06
          + relationshipScore * 0.17
          + reconsolidationRelationshipScore * 0.07
          + sceneScore * 0.07
          + intentScore * 0.14
          + reconsolidationIntentScore * 0.08
          + event.salience * (0.12 + salienceBias * 0.08)
          + recencyScore * 0.08
          + recallRecencyScore * 0.08
          + reconsolidationRecencyScore * 0.08
          + familiarityScore * 0.06
          + reconsolidationConfidenceScore * 0.05
          + reconsolidationCountScore * 0.05
          + reconsolidationRebindingBoost
          + emotionalAmplification
          + sessionBoost
          + turnBoost
          + carryBoost
          + reconsolidationCarryBoost
          + distantBoost
          + experienceMatchedBoost
          + agendaTimeBoost
          + agendaProcedureBoost
          + agendaRelationshipBoost
          + agendaAffectBoost
          + afterglowCarryBoost
          + crossSessionAfterglowBoost
          + sessionMirrorCarryBoost
          + executionCallbackCarryBoost
          + executionCallbackCrossSessionBoost
          + projectStateCarryBoost
          + proceduralBoost
          + relationshipTriggerBoost
          + moodCongruentBoost
          + sceneAttachmentBoost
          + tierBoost
          + projectClosureContinuityBoost
          - provenancePenalty
          - unstableReconstructionPenalty

      return {
        event,
        score,
        affectScore,
        relationshipScore,
        falseMemoryRisk: threadScore < 0.12 && affectScore > 0.24 && relationshipScore < 0.08,
      }
    })
    .filter(item => item.score >= 0.18)
    .sort((left, right) => {
      if (left.score !== right.score)
        return right.score - left.score
      if (left.event.salience !== right.event.salience)
        return right.event.salience - left.event.salience
      return right.event.occurredAt - left.event.occurredAt
    })

  return ranked
    .map((item, index) => ({
      ...item,
      interferencePenalty: deriveMemoryInterferencePenalty({
        current: item.event,
        strongerMatches: ranked.slice(0, index).map(candidate => candidate.event),
      }),
      contradictionSignal: deriveMemoryContradictionSignal({
        current: item.event,
        strongerMatches: ranked
          .filter(candidate => candidate.event.id !== item.event.id)
          .map(candidate => candidate.event),
      }),
    }))
    .map(item => ({
      ...item,
      adjustedScore: item.score - item.interferencePenalty - item.contradictionSignal.penalty,
    }))
    .filter(item => item.adjustedScore >= 0.15)
    .filter((item, _index, items) => !items.some((candidate) => {
      if (candidate.event.id === item.event.id)
        return false
      return deriveMemorySupersessionSignal({
        current: item.event,
        candidate: candidate.event,
      }).suppressCurrent
    }))
    .sort((left, right) => {
      if (left.adjustedScore !== right.adjustedScore)
        return right.adjustedScore - left.adjustedScore
      if (left.score !== right.score)
        return right.score - left.score
      if (left.event.salience !== right.event.salience)
        return right.event.salience - left.event.salience
      return right.event.occurredAt - left.event.occurredAt
    })
    .slice(0, input.limit)
}

export function buildAlicizationRecalledEpisodicEvents(input: {
  selected: AlicizationRankedEpisodicCandidate[]
  recalledAt: number
  affectAnchors?: string[]
  relationshipAnchors?: string[]
  carryAsMemory?: boolean
  correctionShapingRationale?: string
  reconsolidationDecisionTraceId?: string | null
}) {
  return input.selected.map((item) => {
    const mergedEmotionTags = uniqueStringArray([
      ...item.event.emotionTags,
      ...(item.contradictionSignal.unresolved ? ['contradiction-pressure'] : []),
      ...(input.affectAnchors ?? []),
    ], 8)
    const nextConfidence = clamp01(
      item.falseMemoryRisk
        ? item.event.confidence * 0.82 + item.adjustedScore * 0.12
        : item.contradictionSignal.unresolved
          ? item.event.confidence * 0.76 + item.adjustedScore * 0.1
          : item.event.confidence * 0.88 + item.adjustedScore * 0.18,
    )
    const reconsolidation: AlicizationEpisodicReconsolidationSnapshot = {
      at: input.recalledAt,
      decisionTraceId: typeof input.reconsolidationDecisionTraceId === 'string' && input.reconsolidationDecisionTraceId.trim()
        ? input.reconsolidationDecisionTraceId.trim()
        : item.event.latestReconsolidation?.decisionTraceId ?? null,
      provenance: item.falseMemoryRisk || item.contradictionSignal.unresolved ? 'reconstructed' : item.event.provenance,
      confidence: nextConfidence,
      reason: item.falseMemoryRisk
        ? 'Affect-heavy recall needed reconstruction because the thread anchor was weak.'
        : item.contradictionSignal.unresolved
          ? item.contradictionSignal.reason
          : 'Recall re-bound this memory to the current thread, affect, and relationship context.',
      emotionTags: mergedEmotionTags,
      relationshipMeaning: item.contradictionSignal.unresolved
        ? normalizeOrganicMemoryText(
          [
            item.event.relationshipMeaning,
            'Another remembered variant of this same thread is still pulling in a different direction.',
          ].filter(Boolean).join(' '),
          180,
        ) || null
        : item.event.relationshipMeaning || normalizeOrganicMemoryText((input.relationshipAnchors ?? []).join(' / '), 180) || null,
      lesson: item.contradictionSignal.unresolved
        ? normalizeOrganicMemoryText(
          [
            item.event.lesson,
            'Conflicting remembered variants remain unresolved, so answer this memory with uncertainty rather than certainty.',
          ].filter(Boolean).join(' '),
          200,
        ) || null
        : normalizeOrganicMemoryText(
          [
            item.event.lesson,
            input.correctionShapingRationale,
          ].filter(Boolean).join(' '),
          200,
        ) || (input.carryAsMemory ? 'This memory still matters to the current bond and should shape tone with care.' : null),
    }

    return {
      ...item.event,
      confidence: nextConfidence,
      emotionTags: mergedEmotionTags,
      relationshipMeaning: reconsolidation.relationshipMeaning ?? null,
      lesson: reconsolidation.lesson ?? null,
      updatedAt: input.recalledAt,
      lastRecalledAt: input.recalledAt,
      recallCount: item.event.recallCount + 1,
      reconsolidationCount: item.event.reconsolidationCount + 1,
      latestReconsolidation: reconsolidation,
    } satisfies AlicizationEpisodicEventRecord
  })
}
