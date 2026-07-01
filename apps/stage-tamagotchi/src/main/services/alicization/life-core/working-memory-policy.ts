import type {
  WorkingMemoryLongTermCandidate,
  WorkingMemoryTurn,
} from './working-memory'

import {
  clampWorkingMemoryScore,
  normalizeWorkingMemoryText,
} from './working-memory'

const correctionPattern = /不是这个|不想要|不要固定|固定模板|你搞错|你错了|别这样|不要这样/u
const correctionContextPattern = /我需要.*(固定回复|固定模板|人格|记忆|回复)|(固定回复|固定模板|人格|记忆).*(我需要)/u
const commitmentPattern = /我会|我先|我已经|接下来|继续|开始|完成|修复|提交|commit|push|编译/u
const fallbackTemplatePattern = /我在。同一条本地数字生命的线还在|同一条本地数字生命的线还在|我先轻一点留在这里|你想说什么，我就接住/u

export function shouldExcludeTurnFromLongTermCandidate(turn: WorkingMemoryTurn) {
  if (turn.failureKind)
    return true
  if (fallbackTemplatePattern.test(turn.text))
    return true
  if (turn.role === 'tool' || turn.visibility === 'internal')
    return true
  return false
}

export function scoreWorkingMemoryRetention(turn: WorkingMemoryTurn) {
  if (turn.failureKind)
    return 0.05
  if (turn.role === 'user' && (correctionPattern.test(turn.text) || correctionContextPattern.test(turn.text)))
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
    if (turn.role === 'user' && (correctionPattern.test(turn.text) || correctionContextPattern.test(turn.text))) {
      candidates.push({
        sourceTurnIds: [turn.turnId],
        kind: 'correction',
        summary: normalizeWorkingMemoryText(turn.text, 260),
        reason: 'User corrected Alicization behavior, memory use, or persona expression during the current dialogue.',
        salience: 0.82,
        sensitivity: 'personal',
        confidence: 0.78,
        allowTraining: false,
      })
    }
  }
  return candidates
}
