import type {
  AlicizationVisibleArtifactLearningPolicy,
  AlicizationVisibleArtifactOrigin,
} from '@proj-alicization/stage-shared'

import type {
  WorkingMemoryLongTermCandidate,
  WorkingMemoryTurn,
} from './working-memory'

import {
  containsAlicizationFixedTemplateResidue,
  sanitizeAlicizationProviderFacingText,
} from '@proj-alicization/stage-shared'

import {
  clampWorkingMemoryScore,
  normalizeWorkingMemoryText,
} from './working-memory'

const correctionPattern = /我?不是(?:这个|这样|要)|不对|不想要|你(?:搞错|错了)|别这样|请?不要|请(?:改成|纠正)|别再|禁止|移除|清除/u
const preferencePattern = /我喜欢|我不喜欢|偏好|习惯|以后.*(要|不要|别).*(回复|方式|节奏)|希望.*(回复|方式|节奏)/u
const episodePattern = /上周|昨天|今天|那次|一起.*(玩|做|完成)|我们一起|共同经历|下次继续|联机/u
const procedurePattern = /以后.*(按|照).*流程|按.*(红测|实现|验证|流程|步骤)|流程推进|复用.*方式|先.*再/u
const relationshipPattern = /出错|超时|直接说明|关系边界|修复|透明/u
const commitmentPattern = /我会|我先|我已经|接下来|继续|开始|完成|修复|提交|commit|push|编译/u

function safeLongTermCandidateSummary(text: string) {
  const normalized = normalizeWorkingMemoryText(text, 260)
  if (!normalized)
    return ''
  return sanitizeAlicizationProviderFacingText(normalized, 260, '') || ''
}

function fixedTemplateContextForTurn(turn: WorkingMemoryTurn) {
  if (
    turn.role === 'user'
    && turn.visibility !== 'internal'
  ) {
    return undefined
  }

  return {
    provenance: 'internal-structured-fact' as const,
  }
}

export function resolveAlicizationLearningEligibility(input: {
  origin: AlicizationVisibleArtifactOrigin
  learningPolicy: AlicizationVisibleArtifactLearningPolicy
  contaminated: boolean
}) {
  const providerAuthored = input.origin === 'provider'
  return {
    allowLongTermCondensation:
      providerAuthored
      && input.learningPolicy.allowLongTermCondensation
      && !input.contaminated,
    allowPersonaLearning:
      providerAuthored
      && input.learningPolicy.allowPersonaLearning
      && !input.contaminated,
    allowTraining: false,
  }
}

function resolveWorkingMemoryTurnLearningEligibility(turn: WorkingMemoryTurn) {
  const hasTypedArtifactMetadata = turn.origin != null
    || turn.learningPolicy != null
    || turn.failureSurface != null
    || turn.contaminated === true
  if (!hasTypedArtifactMetadata)
    return null

  const origin = turn.failureSurface?.origin ?? turn.origin
  const learningPolicy = turn.learningPolicy ?? (turn.failureSurface
    ? {
        allowLongTermCondensation: false,
        allowPersonaLearning: false,
        allowTraining: false,
      }
    : null)
  if (!origin || !learningPolicy) {
    return {
      allowLongTermCondensation: false,
      allowPersonaLearning: false,
      allowTraining: false,
    }
  }

  return resolveAlicizationLearningEligibility({
    origin,
    learningPolicy,
    contaminated: turn.contaminated === true
      || containsAlicizationFixedTemplateResidue(
        turn.text,
        fixedTemplateContextForTurn(turn),
      ),
  })
}

export function shouldExcludeTurnFromLongTermCandidate(turn: WorkingMemoryTurn) {
  const learningEligibility = resolveWorkingMemoryTurnLearningEligibility(turn)
  if (learningEligibility && !learningEligibility.allowLongTermCondensation)
    return true
  if (turn.failureSurface)
    return true
  if (turn.failureKind)
    return true
  if (containsAlicizationFixedTemplateResidue(
    turn.text,
    fixedTemplateContextForTurn(turn),
  )) {
    return true
  }
  if (turn.role === 'tool' || turn.visibility === 'internal')
    return true
  return false
}

export function scoreWorkingMemoryRetention(turn: WorkingMemoryTurn) {
  if (turn.failureKind)
    return 0.05
  if (turn.role === 'user' && correctionPattern.test(turn.text))
    return 0.98
  if (commitmentPattern.test(turn.text))
    return 0.86
  if (turn.role === 'user')
    return 0.72
  if (turn.role === 'alice')
    return 0.58
  if (turn.role === 'tool')
    return 0.3
  return clampWorkingMemoryScore(turn.importance)
}

export function rankWorkingMemoryRetention(turns: WorkingMemoryTurn[]) {
  return turns
    .map(turn => ({
      ...turn,
      importance: turn.failureKind ? Math.min(turn.importance, scoreWorkingMemoryRetention(turn)) : Math.max(turn.importance, scoreWorkingMemoryRetention(turn)),
    }))
    .sort((left, right) => right.importance - left.importance || right.createdAt - left.createdAt)
}

export function createLongTermCandidatesFromWorkingTurns(turns: WorkingMemoryTurn[]): WorkingMemoryLongTermCandidate[] {
  const candidates: WorkingMemoryLongTermCandidate[] = []
  for (const turn of turns) {
    if (shouldExcludeTurnFromLongTermCandidate(turn))
      continue
    if (turn.role !== 'user')
      continue

    const text = normalizeWorkingMemoryText(turn.text, 400)
    if (!text)
      continue

    const summary = safeLongTermCandidateSummary(turn.text)
    if (!summary)
      continue

    const base = {
      sourceTurnIds: [turn.turnId],
      summary,
      sensitivity: 'personal' as const,
      allowTraining: false,
    }

    if (relationshipPattern.test(text)) {
      candidates.push({
        ...base,
        kind: 'relationship',
        reason: 'candidate:relationship-boundary',
        salience: 0.84,
        confidence: 0.82,
      })
      continue
    }

    if (preferencePattern.test(text)) {
      candidates.push({
        ...base,
        kind: 'preference',
        reason: 'candidate:preference',
        salience: 0.76,
        confidence: 0.78,
      })
      continue
    }

    if (episodePattern.test(text)) {
      candidates.push({
        ...base,
        kind: 'episode',
        reason: 'candidate:episode',
        salience: 0.8,
        confidence: 0.78,
      })
      continue
    }

    if (procedurePattern.test(text)) {
      candidates.push({
        ...base,
        kind: 'procedure',
        reason: 'candidate:procedure',
        salience: 0.78,
        confidence: 0.8,
      })
      continue
    }

    if (correctionPattern.test(text)) {
      candidates.push({
        ...base,
        kind: 'correction',
        reason: 'candidate:correction',
        salience: 0.82,
        confidence: 0.78,
      })
    }
  }
  return candidates
}
