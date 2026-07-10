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

const correctionPattern = /不是这个|不想要|不要固定|固定模板|你搞错|你错了|别这样|不要这样/u
const correctionContextPattern = /我需要.*(固定回复|固定模板|人格|记忆|回复)|(固定回复|固定模板|人格|记忆).*(我需要)/u
const preferencePattern = /我喜欢|我不喜欢|偏好|习惯|以后.*(要|不要|别).*(回复|方式|节奏)|希望.*(回复|方式|节奏)/u
const episodePattern = /上周|昨天|今天|那次|一起.*(玩|做|完成)|我们一起|共同经历|下次继续|联机/u
const procedurePattern = /以后.*(按|照).*流程|按.*(红测|实现|验证|流程|步骤)|流程推进|复用.*方式|先.*再/u
const relationshipPattern = /出错|超时|直接说明|关系边界|修复|透明|不要固定安抚|固定安抚模板/u
const commitmentPattern = /我会|我先|我已经|接下来|继续|开始|完成|修复|提交|commit|push|编译/u
const fallbackTemplatePattern = /我在。同一条本地数字生命的线还在|同一条本地数字生命的线还在|我先轻一点留在这里|你想说什么，我就接住/u

function isTemplateRejectionCorrection(text: string) {
  return /(?:不要|别|不想要|禁止|移除|清除|别再|不要再)[^。.!?]*(?:固定模板|固定回复|模板化|same-her|one continuous her|Before (?:answering|speaking|acting)|Right now I am|local-first digital life project|同一个她|同一个\s*her|数字生命主线)/iu.test(text)
}

function safeLongTermCandidateSummary(text: string) {
  const normalized = normalizeWorkingMemoryText(text, 260)
  if (!normalized)
    return ''
  if (isTemplateRejectionCorrection(normalized))
    return '不要使用固定模板；用户反对模板化人格/记忆回复。'
  return sanitizeAlicizationProviderFacingText(normalized, 260, '') || ''
}

export function shouldExcludeTurnFromLongTermCandidate(turn: WorkingMemoryTurn) {
  if (turn.failureKind)
    return true
  if (fallbackTemplatePattern.test(turn.text))
    return true
  if (containsAlicizationFixedTemplateResidue(turn.text) && !isTemplateRejectionCorrection(turn.text))
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
        reason: 'User stated a relationship boundary or repair preference that should shape future replies.',
        salience: 0.84,
        confidence: 0.82,
      })
      continue
    }

    if (preferencePattern.test(text)) {
      candidates.push({
        ...base,
        kind: 'preference',
        reason: 'User stated a stable preference that should be remembered for future dialogue.',
        salience: 0.76,
        confidence: 0.78,
      })
      continue
    }

    if (episodePattern.test(text)) {
      candidates.push({
        ...base,
        kind: 'episode',
        reason: 'User referred to a shared event or durable episode worth recalling later.',
        salience: 0.8,
        confidence: 0.78,
      })
      continue
    }

    if (procedurePattern.test(text)) {
      candidates.push({
        ...base,
        kind: 'procedure',
        reason: 'User approved or described a reusable procedure for future work.',
        salience: 0.78,
        confidence: 0.8,
      })
      continue
    }

    if (correctionPattern.test(text) || correctionContextPattern.test(text)) {
      candidates.push({
        ...base,
        kind: 'correction',
        reason: 'User corrected Alicization behavior, memory use, or persona expression during the current dialogue.',
        salience: 0.82,
        confidence: 0.78,
      })
    }
  }
  return candidates
}
