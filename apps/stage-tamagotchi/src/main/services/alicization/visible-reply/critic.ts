import type { AlicizationVisibleReplyExecution } from '../../../../shared/eventa'
import type { AlicizationPreparedMainChatExecutionResult } from '../main-chat-session-runtime'

import {
  looksLikeAlicizationStructuredPayloadText,
} from '@proj-alicization/stage-shared'

import { parseJsonObjectFromText } from '../runtime-transport-content'

export interface AlicizationVisibleReplyCriticArtifact {
  version: 'visible-reply-critic-v1'
  status: 'pass' | 'blocked'
  providerMindRequired: boolean
  reasonCodes: string[]
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

function carriesStructuredPayloadWithoutReply(rawText: string) {
  const normalizedText = normalizeText(rawText)
  if (!normalizedText || !looksLikeAlicizationStructuredPayloadText(normalizedText))
    return false
  const parsed = parseJsonObjectFromText(normalizedText)
  return !normalizeText(parsed?.reply)
}

export function buildAlicizationVisibleReplyCriticArtifact(input: {
  fullText: string
  visibleReplyExecution: AlicizationVisibleReplyExecution
  prepared: AlicizationPreparedMainChatExecutionResult
}): AlicizationVisibleReplyCriticArtifact {
  const reasonCodes: string[] = []
  const visibleText = deriveVisibleReplyText(input.fullText)
  const providerMindRequired = input.prepared.replyRealization?.replyRealizationMode === 'provider-mind-required'
    || input.prepared.mindTurnContract?.replyRealizationMode === 'provider-mind-required'

  if (providerMindRequired && (
    input.visibleReplyExecution.providerMindExecuted === false
    || input.visibleReplyExecution.actualVisibleReplyAuthority === 'local-deterministic-fallback'
    || input.visibleReplyExecution.mode === 'local-fallback'
  )) {
    pushUnique(reasonCodes, 'non-human-authored-visible-reply')
  }

  if (carriesStructuredPayloadWithoutReply(input.fullText))
    pushUnique(reasonCodes, 'structured-payload-visible-reply')

  if (!visibleText)
    pushUnique(reasonCodes, 'missing-visible-reply')

  const blocked = reasonCodes.length > 0

  return {
    version: 'visible-reply-critic-v1',
    status: blocked ? 'blocked' : 'pass',
    providerMindRequired,
    reasonCodes,
  }
}

export function shouldBlockAlicizationVisibleReply(
  artifact: AlicizationVisibleReplyCriticArtifact | null | undefined,
) {
  return artifact?.status === 'blocked'
}
