import type { AlicizationVisibleReplyExecution } from '../../../../shared/eventa'
import type { AlicizationPreparedMainChatExecutionResult } from '../main-chat-session-runtime'

import { looksLikeAlicizationStructuredPayloadText } from '@proj-alicization/stage-shared'
import { parseJsonObjectFromText } from '../runtime-transport-content'

export interface AlicizationVisibleReplyCriticArtifact {
  version: 'visible-reply-critic-v1'
  status: 'pass' | 'repair-required' | 'blocked'
  providerMindRequired: boolean
  scores: {
    memoryGateCompliance: number
    templateDiscipline: number
    truthSpecificity: number
    payoffCompletion: number
    personaAffectCoherence: number
  }
  reasonCodes: string[]
  repairReasonCodes: string[]
  mustDrop: string[]
  mustPreserve: string[]
}

function clamp01(value: number) {
  if (!Number.isFinite(value))
    return 0
  return Math.max(0, Math.min(1, Number(value.toFixed(2))))
}

function normalizeText(raw: unknown) {
  return typeof raw === 'string'
    ? raw.trim().replace(/\s+/g, ' ')
    : ''
}

function pushUnique(target: string[], value: string) {
  const normalized = value.trim()
  if (!normalized || target.includes(normalized))
    return
  target.push(normalized)
}

function deriveVisibleReplyText(rawText: string) {
  const normalizedText = normalizeText(rawText)
  if (!normalizedText)
    return ''
  const parsed = parseJsonObjectFromText(normalizedText)
  const structuredReply = normalizeText(parsed?.reply)
  if (structuredReply)
    return structuredReply
  return looksLikeAlicizationStructuredPayloadText(normalizedText)
    ? ''
    : normalizedText
}

function containsMemorySurface(text: string) {
  return /(?:记得|记起来|想起来|回想|以前|之前|上次|那次|过去|曾经|remember|recall|recalled|before|last time|previously)/iu.test(text)
}

function containsShellOpener(text: string) {
  return /^(?:我(?:会|来|先)?(?:直接|先直接)?(?:回答|接住|处理)|收到|我听到|我明白|让我(?:先|来)|I(?:'ll| will)?\s+(?:answer|respond|handle)|let me)/iu.test(text)
}

function containsDecorativePersonaShell(text: string) {
  return /(?:主人|亲爱的|宝贝|呜|唔|嗯……|……$|\([^)]*(?:动作|靠近|眨眼|微笑|低头)[^)]*\))/u.test(text)
}

function containsUnsupportedSurfaceSpecificity(input: {
  text: string
  prepared: AlicizationPreparedMainChatExecutionResult
}) {
  const governance = input.prepared.governance ?? null
  const liveSurface = normalizeText(governance?.liveSurface)
  const avoidScreen = governance?.screenReferenceMode === 'avoid'
  if (avoidScreen && liveSurface && input.text.includes(liveSurface))
    return liveSurface
  const forbiddenSurfaceNames = [
    'IntelliJ IDEA',
    'VS Code',
    'Chrome',
    'Safari',
    'Finder',
  ].filter(item => item !== liveSurface)
  if (avoidScreen) {
    const leaked = forbiddenSurfaceNames.find(item => input.text.includes(item))
    if (leaked)
      return leaked
  }
  return ''
}

export function buildAlicizationVisibleReplyCriticArtifact(input: {
  fullText: string
  visibleReplyExecution: AlicizationVisibleReplyExecution
  prepared: AlicizationPreparedMainChatExecutionResult
}): AlicizationVisibleReplyCriticArtifact {
  const reasonCodes: string[] = []
  const repairReasonCodes: string[] = []
  const mustDrop: string[] = []
  const mustPreserve: string[] = []
  const visibleText = deriveVisibleReplyText(input.fullText)
  const gate = input.prepared.memoryTurnArtifact?.visibleMemoryGate ?? null
  const providerMindRequired = input.visibleReplyExecution.expectedVisibleReplyAuthority === 'llm-mind'
    || input.visibleReplyExecution.expectedVisibleReplyAuthority === 'llm-second-pass-rewrite'
    || input.prepared.replyRealization?.replyRealizationMode === 'provider-mind-required'

  if (providerMindRequired && (
    input.visibleReplyExecution.providerMindExecuted === false
    || input.visibleReplyExecution.actualVisibleReplyAuthority === 'local-deterministic-fallback'
    || input.visibleReplyExecution.mode === 'local-fallback'
  )) {
    pushUnique(reasonCodes, 'non-human-authored-visible-reply')
    pushUnique(repairReasonCodes, 'non-human-authored-visible-reply')
  }

  if (!visibleText) {
    pushUnique(reasonCodes, 'missing-visible-reply')
    pushUnique(repairReasonCodes, 'missing-visible-reply')
  }

  if (gate && (gate.status === 'closed' || gate.status === 'inward-only') && containsMemorySurface(visibleText)) {
    pushUnique(reasonCodes, `visible-memory-gate-violation:${gate.status}`)
    pushUnique(repairReasonCodes, `visible-memory-gate-violation:${gate.status}`)
    pushUnique(mustDrop, 'visible memory narration while memory gate is closed or inward-only')
  }

  if (gate?.status === 'gist-only' && visibleText.length > 260 && containsMemorySurface(visibleText)) {
    pushUnique(reasonCodes, 'gist-only-memory-overexpanded')
    pushUnique(repairReasonCodes, 'gist-only-memory-overexpanded')
    pushUnique(mustDrop, 'archive-style or overexpanded visible memory')
  }

  if (containsShellOpener(visibleText)) {
    pushUnique(reasonCodes, 'dialogue-shell-opener')
    pushUnique(repairReasonCodes, 'dialogue-shell-opener')
    pushUnique(mustDrop, 'empty shell opener before payoff')
  }

  if (containsDecorativePersonaShell(visibleText)) {
    pushUnique(reasonCodes, 'decorative-persona-template')
    pushUnique(repairReasonCodes, 'decorative-persona-template')
    pushUnique(mustDrop, 'decorative roleplay, pet-name, or body-action shell')
  }

  const unsupportedSurface = containsUnsupportedSurfaceSpecificity({
    text: visibleText,
    prepared: input.prepared,
  })
  if (unsupportedSurface) {
    pushUnique(reasonCodes, 'unsupported-surface-specificity')
    pushUnique(repairReasonCodes, 'unsupported-surface-specificity')
    pushUnique(mustDrop, unsupportedSurface)
  }

  const scores = {
    memoryGateCompliance: clamp01(reasonCodes.some(code => code.startsWith('visible-memory-gate-violation') || code === 'gist-only-memory-overexpanded') ? 0.2 : 1),
    templateDiscipline: clamp01(reasonCodes.some(code => code === 'dialogue-shell-opener' || code === 'decorative-persona-template') ? 0.35 : 1),
    truthSpecificity: clamp01(reasonCodes.includes('unsupported-surface-specificity') ? 0.25 : 1),
    payoffCompletion: clamp01(!visibleText ? 0 : visibleText.length < 8 ? 0.45 : 1),
    personaAffectCoherence: clamp01(reasonCodes.includes('decorative-persona-template') ? 0.38 : 1),
  }
  const blocked = reasonCodes.includes('non-human-authored-visible-reply')
  const repairRequired = blocked || reasonCodes.length > 0

  if (visibleText && !containsShellOpener(visibleText))
    pushUnique(mustPreserve, 'current-turn payoff and any safe LLM-authored substance')

  return {
    version: 'visible-reply-critic-v1',
    status: blocked
      ? 'blocked'
      : repairRequired
        ? 'repair-required'
        : 'pass',
    providerMindRequired,
    scores,
    reasonCodes,
    repairReasonCodes,
    mustDrop,
    mustPreserve,
  }
}

export function shouldForceAlicizationVisibleReplyRepair(
  artifact: AlicizationVisibleReplyCriticArtifact | null | undefined,
) {
  return artifact?.status === 'blocked' || artifact?.status === 'repair-required'
}
