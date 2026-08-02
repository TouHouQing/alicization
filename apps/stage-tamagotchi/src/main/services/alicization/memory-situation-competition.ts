import type {
  AlicizationMemorySituationCandidate,
  AlicizationMemorySituationCandidateSet,
} from '@proj-alicization/stage-shared'

import type { AlicizationMemoryDomain, AlicizationMemoryFact } from '../../../shared/eventa'
import type { OrganicMemoryPromptContext } from './runtime-soul'

import { normalizeAlicizationMemorySituationCandidateSet } from '@proj-alicization/stage-shared'

const validSituationSourceKinds = [
  'event-graph',
  'episodic-event',
  'conversation-turn',
  'fact',
  'consolidation',
  'procedure',
  'relationship',
  'self-model',
  'world-model',
] as const

function sanitizeText(raw: unknown, maxChars = 260) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function clamp01(value: number) {
  if (!Number.isFinite(value))
    return 0
  return Math.max(0, Math.min(1, Number(value.toFixed(2))))
}

function uniqueList(values: Array<string | null | undefined>, maxItems = 12, maxChars = 180) {
  const result: string[] = []
  const seen = new Set<string>()
  for (const value of values) {
    const normalized = sanitizeText(value, maxChars)
    if (!normalized)
      continue
    const key = normalized.toLowerCase()
    if (seen.has(key))
      continue
    seen.add(key)
    result.push(normalized)
    if (result.length >= maxItems)
      break
  }
  return result
}

function mergeSourceKinds(
  existing: AlicizationMemorySituationCandidate['sourceKinds'],
  additions: string[],
): AlicizationMemorySituationCandidate['sourceKinds'] {
  return uniqueList([...existing, ...additions], validSituationSourceKinds.length)
    .filter((item): item is AlicizationMemorySituationCandidate['sourceKinds'][number] =>
      (validSituationSourceKinds as readonly string[]).includes(item),
    )
}

function tokenOverlapScore(queryTexts: string[], candidateTexts: string[]) {
  const query = queryTexts.join(' ').toLowerCase()
  const candidate = candidateTexts.join(' ').toLowerCase()
  const tokens = uniqueList(query.split(/[^\p{L}\p{N}]+/u), 80)
    .filter(token => token.length >= 2)
  if (tokens.length === 0 || !candidate)
    return 0
  const matched = tokens.filter(token => candidate.includes(token)).length
  return clamp01(matched / Math.max(3, tokens.length))
}

function createCandidate(input: {
  candidateId: string
  sourceKinds: AlicizationMemorySituationCandidate['sourceKinds']
  situationKind: AlicizationMemorySituationCandidate['situationKind']
  selectedEvidenceIds: string[]
  queryTexts: string[]
  candidateTexts: string[]
  summary: string
  evidenceSummary?: string | null
  eraKey?: string | null
  relationshipArcKey?: string | null
  procedureKey?: string | null
  worldClaimKeys?: string[]
  baseConfidence?: number
  latencyCost?: number
}): AlicizationMemorySituationCandidate {
  return {
    candidateId: input.candidateId,
    sourceKinds: input.sourceKinds,
    situationKind: input.situationKind,
    eraKey: input.eraKey ?? null,
    relationshipArcKey: input.relationshipArcKey ?? null,
    procedureKey: input.procedureKey ?? null,
    selfModelKey: null,
    worldClaimKeys: input.worldClaimKeys ?? [],
    selectedEvidenceIds: uniqueList(input.selectedEvidenceIds, 24),
    competingCandidateIds: [],
    suppressionReasons: [],
    confidence: clamp01((input.baseConfidence ?? 0.35) + tokenOverlapScore(input.queryTexts, input.candidateTexts) * 0.5),
    latencyCost: input.latencyCost ?? 0.25,
    status: 'unresolved',
    statusReason: null,
    summary: sanitizeText(input.summary, 300),
    evidenceSummary: sanitizeText(input.evidenceSummary, 320) || null,
  }
}

function inferFactSituationKind(domain: AlicizationMemoryDomain | null | undefined): AlicizationMemorySituationCandidate['situationKind'] {
  if (domain === 'procedure')
    return 'procedure'
  if (domain === 'relationship')
    return 'relationship-arc'
  if (domain === 'self-model')
    return 'self-model'
  if (domain === 'world-model')
    return 'world-claim'
  return 'mixed'
}

function inferFactSourceKinds(domain: AlicizationMemoryDomain | null | undefined): AlicizationMemorySituationCandidate['sourceKinds'] {
  if (domain === 'procedure')
    return ['fact', 'procedure']
  if (domain === 'relationship')
    return ['fact', 'relationship']
  if (domain === 'self-model')
    return ['fact', 'self-model']
  if (domain === 'world-model')
    return ['fact', 'world-model']
  return ['fact']
}

function factStatement(fact: AlicizationMemoryFact) {
  return sanitizeText(`${fact.subject} ${fact.predicate} ${fact.object}`, 300)
}

function factKey(fact: AlicizationMemoryFact) {
  return sanitizeText(fact.dedupeKey || `${fact.subject}:${fact.predicate}`, 180) || fact.id
}

function scoreCandidatePriority(candidate: AlicizationMemorySituationCandidate) {
  const graphSelectedBoost = candidate.sourceKinds.includes('event-graph') && candidate.status === 'selected'
    ? 0.28
    : 0
  const graphSourceBoost = candidate.sourceKinds.includes('event-graph')
    ? 0.1
    : 0
  const evidenceBoost = Math.min(0.12, candidate.selectedEvidenceIds.length * 0.025)
  const crossSourceBoost = Math.min(0.08, Math.max(0, candidate.sourceKinds.length - 1) * 0.025)
  const latencyPenalty = Math.min(0.18, candidate.latencyCost * 0.08)

  return Number((candidate.confidence + graphSelectedBoost + graphSourceBoost + evidenceBoost + crossSourceBoost - latencyPenalty).toFixed(4))
}

function hasTextualConflict(left: string | null | undefined, right: string | null | undefined) {
  const leftText = sanitizeText(left, 220).toLowerCase()
  const rightText = sanitizeText(right, 220).toLowerCase()
  if (!leftText || !rightText)
    return false
  if (leftText === rightText)
    return false
  if (leftText.includes(rightText) || rightText.includes(leftText))
    return false
  return true
}

function buildCandidateLifeContext(input: {
  candidate: AlicizationMemorySituationCandidate
  hostAttitude?: OrganicMemoryPromptContext['hostAttitude']
  affectiveResidue?: OrganicMemoryPromptContext['affectiveResidue']
  learningExecutionState?: OrganicMemoryPromptContext['learningExecutionState']
  personStateProjection?: OrganicMemoryPromptContext['personStateProjection']
  executionCallbackCarry?: OrganicMemoryPromptContext['executionCallbackCarry']
}) {
  const relationshipContext = sanitizeText(
    input.candidate.relationshipArcKey
    ?? input.candidate.summary
    ?? '',
    180,
  )
  const hostAttitude = sanitizeText(input.hostAttitude, 180)
  const affectiveResidue = sanitizeText(input.affectiveResidue?.summary, 180)
  const executionCarry = sanitizeText(
    input.learningExecutionState?.lastCompletedSummary
    ?? input.executionCallbackCarry?.summary
    ?? input.learningExecutionState?.lastFailureReason
    ?? input.learningExecutionState?.currentBlockedReason
    ?? '',
    180,
  )
  const embodimentCarry = sanitizeText(
    input.personStateProjection?.relationshipDoctrine
    ?? input.personStateProjection?.summary
    ?? '',
    180,
  )

  return {
    relationshipContext,
    hostAttitude,
    affectiveResidue,
    executionCarry,
    embodimentCarry,
  }
}

function enrichCandidateWithLifeContext(input: {
  candidate: AlicizationMemorySituationCandidate
  hostAttitude?: OrganicMemoryPromptContext['hostAttitude']
  affectiveResidue?: OrganicMemoryPromptContext['affectiveResidue']
  learningExecutionState?: OrganicMemoryPromptContext['learningExecutionState']
  personStateProjection?: OrganicMemoryPromptContext['personStateProjection']
  executionCallbackCarry?: OrganicMemoryPromptContext['executionCallbackCarry']
}) {
  const {
    relationshipContext,
    hostAttitude,
    affectiveResidue,
    executionCarry,
    embodimentCarry,
  } = buildCandidateLifeContext(input)
  const relationshipRelevant = Boolean(input.candidate.relationshipArcKey)
    || input.candidate.situationKind === 'relationship-arc'
    || input.candidate.situationKind === 'mixed'
  const procedureRelevant = Boolean(input.candidate.procedureKey)
    || input.candidate.situationKind === 'procedure'
    || input.candidate.situationKind === 'task-thread'
    || (
      input.executionCallbackCarry?.threadAnchor != null
      && input.candidate.summary.toLowerCase().includes('callback')
    )
  const selfModelRelevant = input.candidate.situationKind === 'self-model'
    || input.candidate.situationKind === 'relationship-arc'
    || input.candidate.situationKind === 'mixed'
  const additions = [
    relationshipRelevant && relationshipContext ? `relationship-context=${relationshipContext}` : null,
    selfModelRelevant && hostAttitude ? `host-attitude=${hostAttitude}` : null,
    selfModelRelevant && affectiveResidue ? `affective-residue=${affectiveResidue}` : null,
    procedureRelevant && executionCarry ? `execution-carry=${executionCarry}` : null,
    selfModelRelevant && embodimentCarry ? `embodiment-carry=${embodimentCarry}` : null,
  ]

  return {
    ...input.candidate,
    sourceKinds: mergeSourceKinds(input.candidate.sourceKinds, [
      relationshipRelevant && relationshipContext ? 'relationship' : '',
      procedureRelevant && (input.candidate.procedureKey || executionCarry) ? 'procedure' : '',
      selfModelRelevant && (hostAttitude || affectiveResidue || embodimentCarry) ? 'self-model' : '',
    ]),
    evidenceSummary: sanitizeText(uniqueList([
      input.candidate.evidenceSummary,
      ...additions,
    ], 10).join(' | '), 520) || null,
  } satisfies AlicizationMemorySituationCandidate
}

function inferCandidateSuppression(input: {
  candidate: AlicizationMemorySituationCandidate
  winner: AlicizationMemorySituationCandidate | null
  priority: number
}) {
  const reasons: string[] = []
  if (input.candidate.suppressionReasons.some(reason => /suppressed|wrong-thread|stale-thread|conflict|contradict/u.test(reason)))
    reasons.push('source-marked-suppressed')

  if (input.winner) {
    if (
      input.candidate.relationshipArcKey
      && input.winner.relationshipArcKey
      && hasTextualConflict(input.candidate.relationshipArcKey, input.winner.relationshipArcKey)
    ) {
      reasons.push(`wrong-relationship-arc:${input.winner.candidateId}`)
    }
    if (
      input.candidate.eraKey
      && input.winner.eraKey
      && hasTextualConflict(input.candidate.eraKey, input.winner.eraKey)
    ) {
      reasons.push(`wrong-era:${input.winner.candidateId}`)
    }
    if (
      input.candidate.procedureKey
      && input.winner.procedureKey
      && hasTextualConflict(input.candidate.procedureKey, input.winner.procedureKey)
      && input.candidate.confidence < input.winner.confidence + 0.08
    ) {
      reasons.push(`wrong-procedure-thread:${input.winner.candidateId}`)
    }
  }

  if (
    input.candidate.worldClaimKeys.length > 0
    && /contradict|conflict|superseded|expired|矛盾|过期/u.test(`${input.candidate.evidenceSummary ?? ''} ${input.candidate.statusReason ?? ''}`)
  ) {
    reasons.push('world-claim-contradicted-or-expired')
  }

  if (reasons.length === 0)
    return null

  const strongEnoughToNotice = input.priority >= 0.22 || input.candidate.confidence >= 0.35
  if (!strongEnoughToNotice)
    return null

  return uniqueList(reasons, 8)
}

export function buildMemorySituationCompetition(input: {
  producedAt?: number
  queryTexts: string[]
  eventGraphCandidates?: AlicizationMemorySituationCandidateSet | null
  retrievedFacts?: OrganicMemoryPromptContext['retrievedFacts']
  recalledEpisodes?: NonNullable<OrganicMemoryPromptContext['recalledEpisodes']>
  recalledConversationHistory?: NonNullable<OrganicMemoryPromptContext['recalledConversationHistory']>
  consolidatedMemories?: NonNullable<OrganicMemoryPromptContext['consolidatedMemories']>
  proceduralMemories?: NonNullable<OrganicMemoryPromptContext['proceduralMemories']>
  hostAttitude?: OrganicMemoryPromptContext['hostAttitude']
  affectiveResidue?: OrganicMemoryPromptContext['affectiveResidue']
  learningExecutionState?: OrganicMemoryPromptContext['learningExecutionState']
  personStateProjection?: OrganicMemoryPromptContext['personStateProjection']
  executionCallbackCarry?: OrganicMemoryPromptContext['executionCallbackCarry']
}) {
  const queryTexts = uniqueList(input.queryTexts, 8)
  const candidates: AlicizationMemorySituationCandidate[] = [
    ...(normalizeAlicizationMemorySituationCandidateSet(input.eventGraphCandidates)?.candidates ?? []),
  ]

  for (const fact of input.retrievedFacts ?? []) {
    const domain = fact.memoryDomain ?? null
    const statement = factStatement(fact)
    const key = factKey(fact)
    candidates.push(createCandidate({
      candidateId: `fact:${fact.id}`,
      sourceKinds: inferFactSourceKinds(domain),
      situationKind: inferFactSituationKind(domain),
      selectedEvidenceIds: [fact.id],
      queryTexts,
      candidateTexts: [fact.subject, fact.predicate, fact.object, fact.sourceLabel ?? '', fact.dedupeKey],
      summary: statement,
      evidenceSummary: uniqueList([
        `source=${fact.source}`,
        fact.sourceLabel,
        fact.provenance ? `provenance=${fact.provenance}` : null,
        fact.validationStatus ? `validation=${fact.validationStatus}` : null,
        fact.knowledgeStage ? `stage=${fact.knowledgeStage}` : null,
        `confidence=${fact.confidence.toFixed(2)}`,
      ], 8).join(' | '),
      procedureKey: domain === 'procedure' ? key : null,
      relationshipArcKey: domain === 'relationship' ? key : null,
      worldClaimKeys: domain === 'world-model' ? [fact.id] : [],
      baseConfidence: fact.confidence ?? 0.45,
      latencyCost: 0.12,
    }))
  }

  for (const procedure of input.proceduralMemories ?? []) {
    candidates.push(createCandidate({
      candidateId: `procedure:${procedure.id}`,
      sourceKinds: ['procedure'],
      situationKind: 'procedure',
      selectedEvidenceIds: [procedure.id],
      queryTexts,
      candidateTexts: [procedure.label, procedure.approach, ...(procedure.pitfalls ?? []), ...(procedure.cues ?? [])],
      summary: `${procedure.label}: ${procedure.approach}`,
      evidenceSummary: uniqueList([...(procedure.cues ?? []), ...(procedure.pitfalls ?? [])], 8).join(' | '),
      procedureKey: procedure.id,
      baseConfidence: procedure.confidence ?? 0.55,
      latencyCost: 0.16,
    }))
  }

  for (const episode of input.recalledEpisodes ?? []) {
    candidates.push(createCandidate({
      candidateId: `episode:${episode.id}`,
      sourceKinds: ['episodic-event'],
      situationKind: episode.relationshipMeaning ? 'relationship-arc' : 'episodic-scene',
      selectedEvidenceIds: [episode.id],
      queryTexts,
      candidateTexts: [
        episode.threadAnchor ?? '',
        episode.whereSummary ?? '',
        episode.whatHappened,
        episode.relationshipMeaning ?? '',
        episode.lesson ?? '',
        ...(episode.tags ?? []),
      ],
      summary: episode.whatHappened,
      evidenceSummary: uniqueList([episode.threadAnchor, episode.relationshipMeaning, episode.lesson, episode.sourceSummary], 8).join(' | '),
      eraKey: episode.whereSummary ?? null,
      relationshipArcKey: episode.relationshipMeaning ?? null,
      procedureKey: episode.threadAnchor ?? null,
      baseConfidence: episode.confidence ?? 0.48,
      latencyCost: 0.28,
    }))
  }

  for (const turn of input.recalledConversationHistory ?? []) {
    const id = turn.turnId ?? `${turn.sessionId}:${turn.createdAt}`
    candidates.push(createCandidate({
      candidateId: `conversation:${id}`,
      sourceKinds: ['conversation-turn'],
      situationKind: 'mixed',
      selectedEvidenceIds: [id],
      queryTexts,
      candidateTexts: [turn.userText, turn.assistantText],
      summary: uniqueList([turn.userText, turn.assistantText], 2).join(' | '),
      evidenceSummary: `session=${turn.sessionId}`,
      baseConfidence: 0.42,
      latencyCost: 0.22,
    }))
  }

  for (const consolidation of input.consolidatedMemories ?? []) {
    candidates.push(createCandidate({
      candidateId: `consolidation:${consolidation.id}`,
      sourceKinds: ['consolidation'],
      situationKind: consolidation.facet === 'relationship-era'
        ? 'relationship-arc'
        : consolidation.facet === 'task-era'
          ? 'task-thread'
          : consolidation.facet === 'self-era'
            ? 'self-model'
            : consolidation.kind === 'procedural'
              ? 'procedure'
              : 'mixed',
      selectedEvidenceIds: [consolidation.id, ...(consolidation.derivedEventIds ?? [])],
      queryTexts,
      candidateTexts: [consolidation.periodKey, consolidation.summary, consolidation.lesson ?? '', ...(consolidation.cues ?? [])],
      summary: consolidation.summary,
      evidenceSummary: uniqueList([consolidation.periodKey, consolidation.lesson, ...(consolidation.cues ?? [])], 8).join(' | '),
      eraKey: consolidation.periodKey,
      procedureKey: consolidation.kind === 'procedural' ? consolidation.id : null,
      relationshipArcKey: consolidation.facet === 'relationship-era' ? consolidation.id : null,
      baseConfidence: consolidation.confidence ?? 0.5,
      latencyCost: consolidation.memoryTier === 'hot' ? 0.18 : consolidation.memoryTier === 'warm' ? 0.28 : 0.4,
    }))
  }

  const contextEnrichedCandidates = candidates.map(candidate =>
    enrichCandidateWithLifeContext({
      candidate,
      hostAttitude: input.hostAttitude,
      affectiveResidue: input.affectiveResidue,
      learningExecutionState: input.learningExecutionState,
      personStateProjection: input.personStateProjection,
      executionCallbackCarry: input.executionCallbackCarry,
    }),
  )

  const ranked = contextEnrichedCandidates
    .filter(candidate => candidate.summary)
    .sort((left, right) => {
      const leftPriority = scoreCandidatePriority(left)
      const rightPriority = scoreCandidatePriority(right)
      if (rightPriority !== leftPriority)
        return rightPriority - leftPriority
      const leftGraphSelected = left.sourceKinds.includes('event-graph') && left.status === 'selected'
      const rightGraphSelected = right.sourceKinds.includes('event-graph') && right.status === 'selected'
      if (leftGraphSelected !== rightGraphSelected)
        return rightGraphSelected ? 1 : -1
      if (right.confidence !== left.confidence)
        return right.confidence - left.confidence
      return left.latencyCost - right.latencyCost
    })
    .slice(0, 12)

  const winner = ranked[0] ?? null
  const winnerId = winner?.candidateId ?? null
  const withStatuses: AlicizationMemorySituationCandidate[] = ranked.map((candidate, index): AlicizationMemorySituationCandidate => {
    const priority = scoreCandidatePriority(candidate)
    const suppressionReasons = index === 0
      ? []
      : inferCandidateSuppression({
          candidate,
          winner,
          priority,
        })
    const nextStatus: AlicizationMemorySituationCandidate['status'] = index === 0
      ? 'selected'
      : suppressionReasons
        ? 'suppressed'
        : candidate.latencyCost >= 0.55 && priority >= 0.48
          ? 'delayed'
          : priority < 0.24
            ? 'unresolved'
            : 'rejected'
    return {
      ...candidate,
      competingCandidateIds: ranked
        .filter(other => other.candidateId !== candidate.candidateId)
        .map(other => other.candidateId)
        .slice(0, 8),
      suppressionReasons: index === 0
        ? candidate.suppressionReasons
        : uniqueList([
            ...candidate.suppressionReasons,
            ...(suppressionReasons ?? []),
            winnerId ? `lost-to:${winnerId}` : 'no-winning-candidate',
          ], 8),
      status: nextStatus,
      statusReason: index === 0
        ? 'highest cross-source situation priority for current query'
        : nextStatus === 'suppressed'
          ? 'plausible memory was suppressed because it conflicts with the current selected situation'
          : nextStatus === 'delayed'
            ? 'plausible but too latency-expensive for the current recall slot'
            : nextStatus === 'unresolved'
              ? 'insufficient query overlap or evidence strength for current situation'
              : 'lower cross-source situation priority than selected candidate',
    }
  })

  return {
    version: 'memory-situation-candidates-v1',
    producedAt: input.producedAt ?? Date.now(),
    queryTexts,
    candidates: withStatuses,
    selected: withStatuses.filter(item => item.status === 'selected'),
    rejected: withStatuses.filter(item => item.status === 'rejected'),
    suppressed: withStatuses.filter(item => item.status === 'suppressed'),
    delayed: withStatuses.filter(item => item.status === 'delayed'),
    unresolved: withStatuses.filter(item => item.status === 'unresolved'),
  } satisfies AlicizationMemorySituationCandidateSet
}
