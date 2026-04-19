import type { Message } from '@xsai/shared-chat'
import type { AlicizationPersonaKernelSnapshot } from '@proj-alicization/stage-shared'

import type {
  AlicizationMindTurnGovernance,
  AlicizationRuntimeDigest,
} from '../../../shared/eventa'
import type { AlicizationDialogueSessionMirror } from './dialogue-session-manager'
import type { AlicizationMainChatActionObligationKind } from './main-chat-action-obligation'

import {
  buildAlicizationActiveDialogueFallbackReply,
  buildAlicizationActiveDialogueGovernedReply,
  deriveAlicizationActiveDialogueFastPathDecision,
  shouldAlicizationActiveDialogueStayLLMAuthored,
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
}) {
  const latestUserText = sanitizeText(input.latestUserText, 120)
  const zh = countCjkChars(latestUserText) > 0
  return zh
    ? `这轮没把完整回答带出来。你把同一句再发一次，我就继续回。`
    : `This turn did not carry the full reply through. Send the same line again and I'll continue from there.`
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
  const decision = deriveAlicizationActiveDialogueFastPathDecision({
    conversationMessages: input.messages,
    prepared: {
      waitForTools: false,
      hasVisualGrounding: false,
      governance: input.governance ?? null,
      personaKernel: input.personaKernel ?? null,
      messages: input.messages,
      sessionMirror: input.sessionMirror ?? null,
      runtimeSurface: {
        action: input.actionKind ? { kind: input.actionKind } : null,
        governance: input.governance ?? null,
        digitalLifeSpine: input.digitalLifeSpine ?? null,
      },
    } as any,
    runtimeDigest: input.runtimeDigest ?? null,
  })

  if (decision && shouldAlicizationActiveDialogueStayLLMAuthored(decision)) {
    return buildAlicizationActiveDialogueGovernedReply({
      decision,
      reply: buildDialogueInfraRepairReply({
        latestUserText: decision.latestUserText,
        turnId: input.turnId,
      }),
      suppressGovernedLead: true,
    })
  }

  if (!decision && input.actionKind !== 'execute' && input.actionKind !== 'continue-task') {
    const fallbackDecision = {
      lane: 'dialogue',
      strategy: 'local-only',
      timeoutMs: 0,
      resolvedTimeZone: 'UTC',
      resolvedTimeZoneSource: 'process-env',
      latestUserText,
      previousUserText: '',
      previousAssistantText: '',
      continuityAnchor: '',
      runtimeDigest: input.runtimeDigest ?? null,
      sessionMirror: input.sessionMirror ?? null,
      governance: input.governance ?? null,
      personaKernel: input.personaKernel ?? null,
      digitalLifeSpine: input.digitalLifeSpine ?? null,
      reasonCodes: ['infra-repair-only-timeout-fallback'],
    } as const

    return buildAlicizationActiveDialogueGovernedReply({
      decision: fallbackDecision as any,
      reply: buildDialogueInfraRepairReply({
        latestUserText,
        turnId: input.turnId,
      }),
      suppressGovernedLead: true,
    })
  }

  return buildAlicizationActiveDialogueFallbackReply({
    actionKind: input.actionKind,
    conversationMessages: input.messages,
    digitalLifeSpine: input.digitalLifeSpine,
    governance: input.governance,
    personaKernel: input.personaKernel,
    runtimeDigest: input.runtimeDigest,
    sessionMirror: input.sessionMirror,
    turnId: input.turnId,
  })
}
