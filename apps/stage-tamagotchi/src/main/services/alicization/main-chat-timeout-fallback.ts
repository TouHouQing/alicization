import type { AlicizationPersonaKernelSnapshot } from '@proj-alicization/stage-shared'
import type { Message } from '@xsai/shared-chat'

import type {
  AlicizationChatStartPayload,
  AlicizationMindTurnGovernance,
  AlicizationRuntimeDigest,
} from '../../../shared/eventa'
import type { AlicizationDialogueSessionMirror } from './dialogue-session-manager'
import type { AlicizationMainChatActionObligationKind } from './main-chat-action-obligation'

import { buildAlicizationMindAuthoringFailureArtifact } from './visible-reply/facade'

function readLatestUserText(messages: Message[]) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index]
    if (message?.role !== 'user')
      continue
    return typeof message.content === 'string'
      ? message.content.trim().replace(/\s+/g, ' ').slice(0, 120)
      : ''
  }
  return ''
}

export function buildAlicizationMainGatewayTimeoutFallbackReply(input: {
  messages: Message[]
  turnId?: string
  actionKind?: AlicizationMainChatActionObligationKind | null
  digitalLifeSpine?: unknown
  governance?: AlicizationMindTurnGovernance | null
  personaKernel?: AlicizationPersonaKernelSnapshot | null
  preDialogueSendIdentity?: AlicizationChatStartPayload['preDialogueSendIdentity'] | null
  runtimeDigest?: AlicizationRuntimeDigest | null
  sessionMirror?: AlicizationDialogueSessionMirror | null
}) {
  const latestUserText = readLatestUserText(input.messages)

  return JSON.stringify({
    ...buildAlicizationMindAuthoringFailureArtifact({
      stage: 'main-gateway-timeout',
      reason: 'main-gateway-timeout-recovery-exhausted',
      turnId: input.turnId ?? null,
      failureKind: 'timeout',
      userText: latestUserText,
      reasonCodes: [
        'infra-status-only-timeout-fallback',
        input.actionKind ? `action:${input.actionKind}` : null,
      ].filter((item): item is string => Boolean(item)),
    }),
    latestUserText: latestUserText ? '[withheld]' : null,
  })
}
