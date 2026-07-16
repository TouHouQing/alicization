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
  confidencePolicy: 'direct' | 'tentative' | 'inward-only'
  riskFlags: string[]
  targetKinds: LongTermMemoryEvidenceKind[]
}

export type LongTermMemoryEvidenceKind
  = | 'fact'
    | 'reflection'
    | 'episode'
    | 'consolidation'

export interface LongTermMemoryEvidenceCandidate {
  id: string
  kind: LongTermMemoryEvidenceKind
  summary: string
  source: string
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
  visibleMode: 'explicit' | 'inward-only' | 'tentative'
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
  if (/昨天|刚|最近|上次|前几天/u.test(text))
    return 'recent'
  if (/上周|这周|上个月|前段时间/u.test(text))
    return 'recent-or-mid'
  if (/以前|之前|那次|还记得|记不记得|我们.*过/u.test(text))
    return 'cross-session'
  if (/很久|去年|更早/u.test(text))
    return 'distant'
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
  let rationale = 'No durable memory signal.'

  const recollectionCue = containsAny(normalized, [/记得|记不记得|还记得|想起|回想|上次|之前|以前|那次/u])
  const gameCue = containsAny(normalized, [/游戏|打游戏|开黑|联机|steam|minecraft|mc\b|原神|崩铁|lol|瓦|valorant/iu])
  const correctionCue = containsAny(normalized, [/固定模板|固定回复|模板化|人格|数字生命|不要固定|不想要|你搞错|不是这个/u])
  const preferenceCue = containsAny(normalized, [/我喜欢|我不喜欢|偏好|习惯|以后.*(别|不要|要)|记住我/u])
  const procedureCue = containsAny(normalized, [/怎么做|按上次|照之前|流程|步骤|方案|继续.*做|接着.*做/u])
  const taskCue = containsAny(normalized, [/继续|接着|上次.*任务|刚才.*任务|开发|commit|编译|测试|计划|文档/u])

  if (gameCue || (recollectionCue && /玩|一起/u.test(normalized))) {
    mode = 'episodic'
    confidence = recollectionCue ? 0.82 : 0.68
    rationale = 'User utterance can benefit from shared episodic memory.'
    targetKinds.push('episode', 'consolidation', 'fact')
  }
  else if (correctionCue) {
    mode = 'relationship'
    confidence = 0.86
    rationale = 'User is referring to persona, boundary, or correction memory.'
    targetKinds.push('reflection', 'fact', 'consolidation')
  }
  else if (preferenceCue) {
    mode = 'preference'
    confidence = 0.76
    rationale = 'User utterance contains stable preference or habit cues.'
    targetKinds.push('fact', 'reflection')
  }
  else if (procedureCue) {
    mode = 'procedure'
    confidence = 0.72
    rationale = 'User may expect a previously established procedure.'
    targetKinds.push('fact', 'consolidation', 'episode')
  }
  else if (taskCue && (recollectionCue || hints.length > 0 || input.activeTask || input.currentThreadTitle)) {
    mode = 'task'
    confidence = recollectionCue ? 0.7 : 0.58
    rationale = 'User likely wants continuity with an active or previous task.'
    targetKinds.push('consolidation', 'episode', 'fact')
  }

  if (mode !== 'none' && targetKinds.length > 1 && correctionCue && (gameCue || taskCue))
    mode = 'mixed'

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
    /固定模板|固定回复|人格|数字生命/u.test(normalizedQuery) ? 'Alicization 人格 固定模板 用户纠正' : '',
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
      input.intent.mode === 'relationship' ? `${normalizedQuery} 用户纠正 人格边界 回复方式` : '',
      input.intent.mode === 'preference' ? `${normalizedQuery} 用户稳定偏好` : '',
      input.intent.mode === 'procedure' ? `${normalizedQuery} 可复用流程` : '',
      input.intent.mode === 'task' ? `${normalizedQuery} 未完成任务 连续上下文` : '',
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
    confidencePolicy: expansion.confidencePolicy,
    riskFlags: uniqueTexts([
      ...input.intent.riskFlags,
      ...expansion.negativeCues.map(cue => `negative:${cue}`),
      expansion.confidencePolicy === 'tentative' ? 'tentative-query' : '',
      expansion.confidencePolicy === 'inward-only' ? 'inward-only-query' : '',
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
    return !containsAlicizationFixedTemplateResidue(candidate.summary)
  })
  const ranked = rankLongTermMemoryHybridEvidence({
    intent: input.intent,
    plan: input.plan,
    candidates,
    now: input.now,
    limit,
    semanticScores: input.semanticScores,
  })

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
        confidence: item.candidate.confidence,
        score: item.score,
        visibility: item.visibleMode,
        queryMatches: item.queryMatches,
        rankReasons: item.rankReasons,
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
