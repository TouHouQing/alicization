import type { Message } from '@xsai/shared-chat'
import type { AlicizationPersonaKernelSnapshot } from '@proj-alicization/stage-shared'

import type {
  AlicizationMindTurnGovernance,
  AlicizationRuntimeDigest,
} from '../../../shared/eventa'
import type { AlicizationDialogueSessionMirror } from './dialogue-session-manager'
import type { AlicizationMainChatActionObligationKind } from './main-chat-action-obligation'

import {
  buildAlicizationActiveDialogueGovernedReply,
} from './main-chat-active-dialogue-loop'

function sanitizeText(raw: unknown, maxChars = 160) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function countCjkChars(raw: string) {
  return [...raw].filter(char => /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u.test(char)).length
}

function readLatestUserText(messages: Message[]) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index]
    if (message?.role !== 'user')
      continue
    return sanitizeText(message.content, 120)
  }
  return ''
}

function buildDialogueInfraRepairReply(input: {
  latestUserText: string
  turnId?: string
  reason?: string
}) {
  const zh = countCjkChars(sanitizeText(input.latestUserText, 120)) > 0
  return zh
    ? '主模型这轮没有完成心智回复，我不能用本地固定句子替它回答。'
    : 'The main model did not complete this mind-authored turn, so no local fixed reply was used.'
}

function buildTimeoutInfraDecision(input: {
  latestUserText: string
  governance?: AlicizationMindTurnGovernance | null
  personaKernel?: AlicizationPersonaKernelSnapshot | null
  runtimeDigest?: AlicizationRuntimeDigest | null
  sessionMirror?: AlicizationDialogueSessionMirror | null
}) {
  return {
    lane: 'dialogue',
    strategy: 'local-only',
    timeoutMs: 0,
    resolvedTimeZone: 'UTC',
    resolvedTimeZoneSource: 'process-env',
    latestUserText: input.latestUserText,
    previousUserText: '',
    previousAssistantText: '',
    continuityAnchor: '',
    runtimeDigest: input.runtimeDigest ?? null,
    sessionMirror: input.sessionMirror ?? null,
    governance: input.governance ?? null,
    personaKernel: input.personaKernel ?? null,
    digitalLifeSpine: null,
    reasonCodes: ['infra-status-only-timeout-fallback', 'normal-reply-requires-provider-mind'],
  } as const
}

export function buildAlicizationMainGatewayTimeoutFallbackReply(input: {
  messages: Message[]
  turnId?: string
  actionKind?: AlicizationMainChatActionObligationKind | null
  digitalLifeSpine?: unknown
  governance?: AlicizationMindTurnGovernance | null
  personaKernel?: AlicizationPersonaKernelSnapshot | null
  runtimeDigest?: AlicizationRuntimeDigest | null
  sessionMirror?: AlicizationDialogueSessionMirror | null
}) {
  const latestUserText = readLatestUserText(input.messages)
  return buildAlicizationActiveDialogueGovernedReply({
    decision: buildTimeoutInfraDecision({
      latestUserText,
      governance: input.governance ?? null,
      personaKernel: input.personaKernel ?? null,
      runtimeDigest: input.runtimeDigest ?? null,
      sessionMirror: input.sessionMirror ?? null,
    }) as any,
    reply: buildDialogueInfraRepairReply({
      latestUserText,
      turnId: input.turnId,
    }),
    suppressGovernedLead: true,
    visibleReplyAuthority: 'llm-second-pass-rewrite',
  })
}
