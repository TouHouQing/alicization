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
} from '@proj-alicization/stage-shared'

import {
  clampWorkingMemoryScore,
} from './working-memory'

const correctionPattern = /我?不是(?:这个|这样|要)|不对|不想要|你(?:搞错|错了)|别这样|请?不要|请(?:改成|纠正)|别再|禁止|移除|清除/u
const commitmentPattern = /我会|我先|我已经|接下来|继续|开始|完成|修复|提交|commit|push|编译/u

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
        [
          turn.memoryEvidence?.summary ?? '',
          turn.memoryEvidence?.reason ?? '',
          ...(turn.memoryEvidence?.evidenceSnippets ?? []),
        ].join('\n'),
        {
          provenance: 'internal-structured-fact',
        },
      ),
  })
}

export function shouldExcludeTurnFromLongTermCandidate(turn: WorkingMemoryTurn) {
  if (!turn.memoryEvidence)
    return true
  const learningEligibility = resolveWorkingMemoryTurnLearningEligibility(turn)
  if (learningEligibility && !learningEligibility.allowLongTermCondensation)
    return true
  if (turn.failureSurface)
    return true
  if (turn.failureKind)
    return true
  if (containsAlicizationFixedTemplateResidue(
    [
      turn.memoryEvidence.summary,
      turn.memoryEvidence.reason,
      ...turn.memoryEvidence.evidenceSnippets,
    ].join('\n'),
    {
      provenance: 'internal-structured-fact',
    },
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

    const memoryEvidence = turn.memoryEvidence
    if (!memoryEvidence)
      continue

    candidates.push({
      sourceTurnIds: [turn.turnId],
      kind: memoryEvidence.kind,
      summary: memoryEvidence.summary,
      reason: memoryEvidence.reason,
      evidenceSnippets: memoryEvidence.evidenceSnippets,
      salience: memoryEvidence.salience,
      sensitivity: memoryEvidence.sensitivity,
      confidence: memoryEvidence.confidence,
      allowTraining: false,
      memoryEvidence,
    })
  }
  return candidates
}
