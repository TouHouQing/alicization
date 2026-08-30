import type { AlicizationMemoryProvenance } from '@proj-alicization/stage-shared'

import {
  buildAlicizationProviderFactBlock,
  containsAlicizationFixedTemplateResidue,
  sanitizeAlicizationProviderFacingText,
} from '@proj-alicization/stage-shared'

import { rankLongTermMemoryHybridEvidence } from './long-term-memory-hybrid-retrieval'
import { expandLongTermMemoryQuery } from './long-term-memory-query-expansion'

export type LongTermMemoryRecallMode
  = | 'none'
    | 'episodic'
    | 'relationship'
    | 'preference'
    | 'procedure'
    | 'task'
    | 'mixed'

export type LongTermMemoryTemporalFocus
  = | 'current'
    | 'recent'
    | 'recent-or-mid'
    | 'cross-session'
    | 'distant'
    | 'unspecified'

export interface LongTermMemoryRecallIntent {
  mode: LongTermMemoryRecallMode
  shouldRecall: boolean
  confidence: number
  rationale: string
  temporalFocus: LongTermMemoryTemporalFocus
  targetKinds: LongTermMemoryEvidenceKind[]
  queryHints: string[]
  riskFlags: string[]
}

export interface LongTermMemoryQueryPlan {
  rawQuery: string
  normalizedQuery: string
  keywordQueries: string[]
  phraseQueries: string[]
  charGramQueries: string[]
  semanticQueries: string[]
  episodicQueries: string[]
  temporalHints: string[]
  entityHints: string[]
  procedureHints: string[]
  threadHints: string[]
  negativeCues: string[]
  riskFlags: string[]
  targetKinds: LongTermMemoryEvidenceKind[]
}

export type LongTermMemoryEvidenceKind
  = | 'fact'
    | 'reflection'
    | 'episode'
    | 'consolidation'

export const longTermMemoryEvidenceVersion = 'long-term-memory-evidence-v1' as const

export interface LongTermMemoryEvidenceScope {
  userId: string
  cardId: string | null
}

export interface LongTermMemoryEvidenceCandidate {
  id: string
  kind: LongTermMemoryEvidenceKind
  summary: string
  source: string
  origin?: string | null
  scope?: LongTermMemoryEvidenceScope | null
  provenance?: AlicizationMemoryProvenance | null
  evidenceVersion?: string | null
  version?: string | null
  confidence: number
  reviewStatus?: 'confirmed' | 'candidate' | 'review-needed' | 'rejected' | 'pending' | string | null
  salience?: number | null
  updatedAt?: number | null
  occurredAt?: number | null
  threadId?: string | null
  threadAnchor?: string | null
  cues?: string[] | null
  entities?: string[] | null
  sensitivity?: 'public' | 'personal' | 'private' | 'secret' | null
}

export interface RankedLongTermMemoryEvidence {
  candidate: LongTermMemoryEvidenceCandidate
  score: number
  queryMatches: string[]
  rankReasons: string[]
  scope: LongTermMemoryEvidenceScope
  provenance: AlicizationMemoryProvenance
  evidenceVersion: string
  version: string
}

export interface LongTermMemoryEvidenceBundle {
  intent: LongTermMemoryRecallIntent
  plan: LongTermMemoryQueryPlan
  evidence: RankedLongTermMemoryEvidence[]
  confidence: number
  budgetClass: 'none' | 'light' | 'normal' | 'wide'
}

function normalizeText(raw: unknown, maxChars = 360) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, Math.max(0, maxChars)).trim()
}

function clamp01(raw: unknown) {
  const value = Number(raw)
  if (!Number.isFinite(value))
    return 0
  return Math.max(0, Math.min(1, value))
}

function normalizeEvidenceScope(
  raw: LongTermMemoryEvidenceScope | null | undefined,
  fallback?: LongTermMemoryEvidenceScope,
): LongTermMemoryEvidenceScope {
  const userId = normalizeText(raw?.userId, 160) || normalizeText(fallback?.userId, 160) || 'unknown'
  const cardId = normalizeText(raw?.cardId, 160) || normalizeText(fallback?.cardId, 160) || null
  return {
    userId,
    cardId,
  }
}

function inferEvidenceProvenance(candidate: LongTermMemoryEvidenceCandidate): AlicizationMemoryProvenance {
  if (candidate.provenance)
    return candidate.provenance
  if (candidate.origin === 'user-turn' || candidate.source === 'user-turn' || candidate.source === 'episodic_events')
    return 'observed'
  if (candidate.source === 'memory_reflections' || candidate.source === 'memory_consolidations')
    return 'inferred'
  return 'remembered'
}

function normalizeEvidenceVersion(candidate: LongTermMemoryEvidenceCandidate) {
  const requestedVersion = normalizeText(candidate.evidenceVersion ?? candidate.version, 80)
  return requestedVersion || longTermMemoryEvidenceVersion
}

function withEvidenceContract(
  item: RankedLongTermMemoryEvidence,
  fallbackScope?: LongTermMemoryEvidenceScope,
): RankedLongTermMemoryEvidence {
  const scope = normalizeEvidenceScope(fallbackScope ?? item.scope ?? item.candidate.scope)
  const provenance = item.provenance ?? inferEvidenceProvenance(item.candidate)
  const version = normalizeEvidenceVersion(item.candidate)
  return {
    ...item,
    scope,
    provenance,
    evidenceVersion: item.evidenceVersion ?? version,
    version: item.version ?? version,
  }
}

function uniqueTexts(values: Array<string | null | undefined>, maxItems = 10, maxChars = 120) {
  const result: string[] = []
  for (const value of values) {
    const normalized = normalizeText(value, maxChars)
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

function containsAny(text: string, patterns: RegExp[]) {
  return patterns.some(pattern => pattern.test(text))
}

function deriveTemporalFocus(text: string): LongTermMemoryTemporalFocus {
  if (/刚刚|刚才|这轮|当前|现在/u.test(text))
    return 'current'
  if (/很久|去年|更早/u.test(text))
    return 'distant'
  if (/昨天|刚|最近|上次|前几天/u.test(text))
    return 'recent'
  if (/上周|这周|上个月|前段时间/u.test(text))
    return 'recent-or-mid'
  if (/以前|之前|那次|还记得|记不记得|我们.*过/u.test(text))
    return 'cross-session'
  return 'unspecified'
}

export function deriveLongTermMemoryRecallIntent(input: {
  currentUserText: string
  workingMemoryQueryHints?: string[]
  currentThreadTitle?: string | null
  activeTask?: string | null
}): LongTermMemoryRecallIntent {
  const normalized = normalizeText(input.currentUserText, 600)
  const hints = uniqueTexts(input.workingMemoryQueryHints ?? [], 8, 120)
  const temporalFocus = deriveTemporalFocus(normalized)
  const targetKinds: LongTermMemoryEvidenceKind[] = []
  const riskFlags: string[] = []
  let mode: LongTermMemoryRecallMode = 'none'
  let confidence = 0.16
  let rationale = 'recall:none'

  const recollectionCue = containsAny(normalized, [
    /记得|记不记得|还记得|想起|回想|上次|之前|以前|那次/u,
    /说过|提到|告诉过|刚才.*(?:说|提|告诉|表达|喜欢|偏好)/u,
  ])
  const gameCue = containsAny(normalized, [/游戏|打游戏|开黑|联机|steam|minecraft|mc\b|原神|崩铁|lol|瓦|valorant/iu])
  const correctionCue = containsAny(normalized, [/你[搞弄说记]错|不是(?:这个|这样|那样)|我纠正过|别再/u])
  const preferenceCue = containsAny(normalized, [/喜欢|偏好|习惯|以后.*(别|不要|要)|记住我/u])
  const procedureCue = containsAny(normalized, [/怎么做|按上次|照之前|流程|步骤|方案|继续.*做|接着.*做/u])
  const taskCue = containsAny(normalized, [/继续|接着|上次.*任务|刚才.*任务|开发|commit|编译|测试|计划|文档/u])

  if (gameCue || (recollectionCue && /玩|一起/u.test(normalized))) {
    mode = 'episodic'
    confidence = recollectionCue ? 0.82 : 0.68
    rationale = 'recall:episodic'
    targetKinds.push('episode', 'consolidation', 'fact')
  }
  else if (correctionCue && recollectionCue) {
    mode = 'relationship'
    confidence = 0.86
    rationale = 'recall:relationship'
    targetKinds.push('reflection', 'fact', 'consolidation')
  }
  else if (preferenceCue) {
    mode = 'preference'
    confidence = 0.76
    rationale = 'recall:preference'
    targetKinds.push('fact', 'reflection')
  }
  else if (procedureCue) {
    mode = 'procedure'
    confidence = 0.72
    rationale = 'recall:procedure'
    targetKinds.push('fact', 'consolidation', 'episode')
  }
  else if (taskCue && (recollectionCue || hints.length > 0 || input.activeTask || input.currentThreadTitle)) {
    mode = 'task'
    confidence = recollectionCue ? 0.7 : 0.58
    rationale = 'recall:task'
    targetKinds.push('consolidation', 'episode', 'fact')
  }
  else if (recollectionCue) {
    mode = 'mixed'
    confidence = 0.72
    rationale = 'recall:mixed'
    targetKinds.push('fact', 'reflection', 'episode', 'consolidation')
  }

  if (mode !== 'none' && targetKinds.length > 1 && correctionCue && (gameCue || taskCue)) {
    mode = 'mixed'
    rationale = 'recall:mixed'
  }

  if (mode !== 'none' && confidence < 0.7)
    riskFlags.push('low-recall-confidence')
  if (temporalFocus === 'unspecified' && recollectionCue)
    riskFlags.push('temporal-underspecified')
  if (!normalized)
    riskFlags.push('empty-query')

  return {
    mode,
    shouldRecall: mode !== 'none' && confidence >= 0.5,
    confidence: clamp01(confidence),
    rationale,
    temporalFocus,
    targetKinds: uniqueTexts(targetKinds, 4, 40) as LongTermMemoryEvidenceKind[],
    queryHints: uniqueTexts([
      normalized,
      ...hints,
      input.currentThreadTitle ?? '',
      input.activeTask ?? '',
    ], 8, 140),
    riskFlags: uniqueTexts(riskFlags, 6, 80),
  }
}

export function buildLongTermMemoryQueryPlan(input: {
  intent: LongTermMemoryRecallIntent
  currentUserText: string
  workingMemoryQueryHints?: string[]
  currentThreadTitle?: string | null
  activeTask?: string | null
}): LongTermMemoryQueryPlan {
  const expansion = expandLongTermMemoryQuery({
    rawQuery: input.currentUserText,
    workingMemoryQueryHints: input.workingMemoryQueryHints,
  })
  const normalizedQuery = expansion.normalizedQuery
  const hints = uniqueTexts(input.workingMemoryQueryHints ?? [], 8, 120)
  const temporalHints = uniqueTexts([
    ...expansion.temporalHints,
    input.intent.temporalFocus === 'recent' ? '最近 上次 昨天' : '',
    input.intent.temporalFocus === 'recent-or-mid' ? '上周 这周 前段时间' : '',
    input.intent.temporalFocus === 'cross-session' ? '以前 之前 那次 共同经历' : '',
    input.intent.temporalFocus === 'distant' ? '很久以前 更早' : '',
  ], 4, 80)
  const entityHints = uniqueTexts([
    ...expansion.entityHints,
    /游戏|打游戏|开黑/u.test(normalizedQuery) ? '游戏 共同游玩' : '',
    /commit|编译|测试|开发|文档/u.test(normalizedQuery) ? '开发任务 代码 文档 测试' : '',
  ], 6, 100)
  const procedureHints = uniqueTexts([
    ...expansion.procedureHints,
    /继续|接着/u.test(normalizedQuery) ? '继续 上次任务 未完成事项' : '',
    /怎么做|步骤|流程|方案/u.test(normalizedQuery) ? '流程 步骤 方法' : '',
  ], 6, 100)
  const threadHints = uniqueTexts([
    input.currentThreadTitle ?? '',
    input.activeTask ?? '',
    ...hints,
  ], 6, 160)

  return {
    rawQuery: input.currentUserText,
    normalizedQuery,
    keywordQueries: uniqueTexts([
      normalizedQuery,
      ...hints,
      ...expansion.phraseQueries,
      ...expansion.charGramQueries,
      ...entityHints,
      ...temporalHints,
    ], 10, 160),
    phraseQueries: expansion.phraseQueries,
    charGramQueries: expansion.charGramQueries,
    semanticQueries: uniqueTexts([
      input.intent.mode === 'episodic' ? `${normalizedQuery} 共同经历 上次发生的事情` : '',
      input.intent.mode === 'relationship' ? normalizedQuery : '',
      input.intent.mode === 'preference' ? `${normalizedQuery} 用户稳定偏好` : '',
      input.intent.mode === 'procedure' ? `${normalizedQuery} 可复用流程` : '',
      input.intent.mode === 'task' ? `${normalizedQuery} 未完成任务 连续上下文` : '',
      input.intent.mode === 'mixed' ? normalizedQuery : '',
    ], 6, 180),
    episodicQueries: uniqueTexts([
      input.intent.targetKinds.includes('episode') ? normalizedQuery : '',
      input.intent.mode === 'episodic' ? '一起做过的事情 上次共同经历' : '',
      ...temporalHints,
    ], 6, 160),
    temporalHints,
    entityHints,
    procedureHints,
    threadHints,
    negativeCues: expansion.negativeCues,
    riskFlags: uniqueTexts([
      ...input.intent.riskFlags,
      ...expansion.negativeCues.map(cue => `negative:${cue}`),
      ...expansion.riskFlags,
    ], 10, 120),
    targetKinds: input.intent.targetKinds,
  }
}

export function buildLongTermMemoryEvidenceBundle(input: {
  intent: LongTermMemoryRecallIntent
  plan: LongTermMemoryQueryPlan
  candidates: LongTermMemoryEvidenceCandidate[]
  now: number
  limit?: number
  semanticScores?: Record<string, number>
  scope?: LongTermMemoryEvidenceScope
}): LongTermMemoryEvidenceBundle {
  if (!input.intent.shouldRecall) {
    return {
      intent: input.intent,
      plan: input.plan,
      evidence: [],
      confidence: input.intent.confidence,
      budgetClass: 'none',
    }
  }

  const limit = Math.max(1, Math.min(8, Math.floor(input.limit ?? 5)))
  const candidates = input.candidates.filter((candidate) => {
    if (candidate.reviewStatus != null && candidate.reviewStatus !== 'confirmed')
      return false
    return !containsAlicizationFixedTemplateResidue(candidate.summary, {
      origin: candidate.origin,
      source: candidate.source,
    })
  })
  const ranked = rankLongTermMemoryHybridEvidence({
    intent: input.intent,
    plan: input.plan,
    candidates,
    now: input.now,
    limit,
    semanticScores: input.semanticScores,
  }).map(item => withEvidenceContract(item, input.scope))

  const confidence = ranked.length === 0
    ? input.intent.confidence * 0.4
    : clamp01((ranked.reduce((sum, item) => sum + item.score, 0) / ranked.length + input.intent.confidence) / 2)

  return {
    intent: input.intent,
    plan: input.plan,
    evidence: ranked,
    confidence,
    budgetClass: ranked.length === 0 ? 'none' : ranked.length <= 2 ? 'light' : ranked.length <= 5 ? 'normal' : 'wide',
  }
}

export function buildLongTermMemoryRecallBlock(input: {
  bundle: LongTermMemoryEvidenceBundle
  maxItems?: number
}) {
  const evidence = input.bundle.evidence.slice(0, Math.max(0, Math.min(8, Math.floor(input.maxItems ?? 5))))
  const riskFlags = input.bundle.intent.riskFlags
  const hasExplicitFailure = riskFlags.some(flag => flag.includes('failed') || flag.includes('error'))
  const evidenceFacts = evidence
    .map((item) => {
      const summary = sanitizeAlicizationProviderFacingText(item.candidate.summary, 260)
      if (!summary)
        return null

      return {
        id: item.candidate.id,
        kind: item.candidate.kind,
        summary,
        source: item.candidate.source,
        scope: item.scope,
        provenance: item.provenance,
        confidence: item.candidate.confidence,
        sensitivity: item.candidate.sensitivity,
        score: item.score,
        queryMatches: item.queryMatches,
        rankReasons: item.rankReasons,
        evidenceVersion: item.evidenceVersion,
        version: item.version,
      }
    })
    .filter(item => item !== null)

  if (!input.bundle.intent.shouldRecall || evidenceFacts.length === 0) {
    if (!hasExplicitFailure)
      return null

    return buildAlicizationProviderFactBlock('alicization-long-term-memory-recall', {
      owner: 'LongTermMemoryRecall',
      status: 'failed',
      intent: {
        mode: input.bundle.intent.mode,
        shouldRecall: input.bundle.intent.shouldRecall,
        confidence: input.bundle.intent.confidence,
        rationale: sanitizeAlicizationProviderFacingText(input.bundle.intent.rationale, 260) || null,
        temporalFocus: input.bundle.intent.temporalFocus,
        targetKinds: input.bundle.intent.targetKinds,
      },
      confidence: input.bundle.confidence,
      budget: input.bundle.budgetClass,
      riskFlags,
      evidence: [],
    })
  }

  return buildAlicizationProviderFactBlock('alicization-long-term-memory-recall', {
    owner: 'LongTermMemoryRecall',
    status: 'recalled',
    intent: {
      mode: input.bundle.intent.mode,
      shouldRecall: input.bundle.intent.shouldRecall,
      confidence: input.bundle.intent.confidence,
      rationale: sanitizeAlicizationProviderFacingText(input.bundle.intent.rationale, 260) || null,
      temporalFocus: input.bundle.intent.temporalFocus,
      targetKinds: input.bundle.intent.targetKinds,
    },
    confidence: input.bundle.confidence,
    budget: input.bundle.budgetClass,
    riskFlags,
    evidence: evidenceFacts,
  })
}
