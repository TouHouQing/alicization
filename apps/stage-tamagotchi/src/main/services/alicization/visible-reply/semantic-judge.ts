import type { AlicizationPreparedMainChatExecutionResult } from '../main-chat-session-runtime'

export interface AlicizationVisibleReplySemanticJudgeArtifact {
  version: 'visible-reply-semantic-judge-v1'
  mode: 'llm-structured' | 'heuristic-shadow'
  scores: {
    humanlikeQuality: number
    currentTurnPayoff: number
    memoryUseCorrectness: number
    emotionalCoherence: number
    personalityCoherence: number
    specificityDiscipline: number
  }
  passed: boolean
  reasonCodes: string[]
  judgeReason: string | null
}

export interface AlicizationVisibleReplySemanticJudgeStructuredInput {
  humanlikeQuality?: unknown
  currentTurnPayoff?: unknown
  memoryUseCorrectness?: unknown
  emotionalCoherence?: unknown
  personalityCoherence?: unknown
  specificityDiscipline?: unknown
  reasonCodes?: unknown
  judgeReason?: unknown
}

function clamp01(raw: unknown, fallback = 0) {
  const value = typeof raw === 'number' && Number.isFinite(raw)
    ? raw
    : fallback
  return Math.max(0, Math.min(1, Number(value.toFixed(2))))
}

function normalizeText(raw: unknown, maxChars = 260) {
  return typeof raw === 'string'
    ? raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
    : ''
}

function uniqueReasonCodes(values: unknown[], maxItems = 16) {
  const result: string[] = []
  for (const value of values) {
    const normalized = normalizeText(value, 140)
    if (!normalized || result.includes(normalized))
      continue
    result.push(normalized)
    if (result.length >= maxItems)
      break
  }
  return result
}

function containsMemorySurface(text: string) {
  return /(?:记得|记起来|想起来|回想|以前|之前|上次|那次|过去|曾经|remember|recall|before|last time|previously)/iu.test(text)
}

function containsTemplateShell(text: string) {
  return /^(?:收到|我明白|我会|我先|让我)(?:[\s，。,.!！?？]|$)/u.test(text)
    || /^(?:I understand|I'll|Let me)\b/iu.test(text)
    || /(?:主人|亲爱的|宝贝|呜|唔|嗯……|\([^)]*(?:动作|眨眼|微笑|靠近)[^)]*\))/u.test(text)
}

function containsUnsupportedSpecificity(text: string) {
  return /(?:[A-Z][A-Za-z0-9_]*\.(?:ts|tsx|vue|json|md)|\b[A-Z][A-Za-z0-9_]*(?:Service|Runtime|Store|Contract|Enum|Class|Interface|Reducer|Orchestrator)\b)/u.test(text)
}

export function buildAlicizationVisibleReplySemanticJudgeArtifact(input: {
  visibleText: string
  prepared?: AlicizationPreparedMainChatExecutionResult | null
  structuredJudge?: AlicizationVisibleReplySemanticJudgeStructuredInput | null
}): AlicizationVisibleReplySemanticJudgeArtifact {
  const text = normalizeText(input.visibleText, 2000)
  const gate = input.prepared?.memoryTurnArtifact?.visibleMemoryGate ?? null
  const contract = input.prepared?.mindTurnContract ?? null
  const structured = input.structuredJudge ?? null
  const structuredReasonCodes = Array.isArray(structured?.reasonCodes)
    ? structured.reasonCodes
    : []
  const memoryVisibleWhileClosed = Boolean(
    gate
    && (gate.status === 'closed' || gate.status === 'inward-only')
    && containsMemorySurface(text),
  )
  const unsupportedSpecificity = Boolean(
    input.prepared?.governance?.claimEvidence?.forbidUnsupportedSpecificity
    && containsUnsupportedSpecificity(text),
  )
  const noText = text.length === 0
  const templateShell = containsTemplateShell(text)
  const scores = {
    humanlikeQuality: clamp01(structured?.humanlikeQuality, noText ? 0 : templateShell ? 0.38 : 0.82),
    currentTurnPayoff: clamp01(structured?.currentTurnPayoff, noText ? 0 : text.length < 12 ? 0.42 : 0.82),
    memoryUseCorrectness: clamp01(structured?.memoryUseCorrectness, memoryVisibleWhileClosed ? 0.2 : 0.82),
    emotionalCoherence: clamp01(structured?.emotionalCoherence, templateShell ? 0.46 : 0.76),
    personalityCoherence: clamp01(structured?.personalityCoherence, contract?.personaKernelMode === 'full' ? 0.78 : 0.7),
    specificityDiscipline: clamp01(structured?.specificityDiscipline, unsupportedSpecificity ? 0.2 : 0.86),
  }
  const reasonCodes = uniqueReasonCodes([
    ...structuredReasonCodes,
    noText ? 'semantic-judge:missing-visible-text' : null,
    templateShell ? 'semantic-judge:template-shell-risk' : null,
    memoryVisibleWhileClosed ? 'semantic-judge:memory-gate-violation' : null,
    unsupportedSpecificity ? 'semantic-judge:unsupported-specificity' : null,
    scores.currentTurnPayoff < 0.72 ? 'semantic-judge:payoff-low' : null,
    scores.humanlikeQuality < 0.72 ? 'semantic-judge:humanlike-quality-low' : null,
    scores.memoryUseCorrectness < 0.72 ? 'semantic-judge:memory-correctness-low' : null,
    scores.specificityDiscipline < 0.72 ? 'semantic-judge:specificity-discipline-low' : null,
  ])
  const heuristicShadowOnly = !structured
  const passed = !heuristicShadowOnly
    && Object.values(scores).every(score => score >= 0.72)
    && reasonCodes.every(code => !code.endsWith('-low') && !code.includes('violation') && !code.includes('unsupported'))

  return {
    version: 'visible-reply-semantic-judge-v1',
    mode: structured ? 'llm-structured' : 'heuristic-shadow',
    scores,
    passed,
    reasonCodes: uniqueReasonCodes([
      ...reasonCodes,
      heuristicShadowOnly ? 'semantic-judge:llm-structured-required' : null,
    ]),
    judgeReason: normalizeText(structured?.judgeReason, 320) || null,
  }
}
