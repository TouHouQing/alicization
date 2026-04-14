import type { Message } from '@xsai/shared-chat'
import type { AlicizationPersonaKernelSnapshot } from '@proj-alicization/stage-shared'

import type {
  AlicizationMindTurnGovernance,
  AlicizationRuntimeDigest,
} from '../../../shared/eventa'
import type { AlicizationDialogueSessionMirror } from './dialogue-session-manager'
import type { AlicizationMainChatActionObligationKind } from './main-chat-action-obligation'

import { buildAlicizationActiveDialogueFallbackReply } from './main-chat-active-dialogue-loop'

export function buildAlicizationMainGatewayTimeoutFallbackReply(input: {
  messages: Message[]
  turnId?: string
  actionKind?: AlicizationMainChatActionObligationKind | null
  governance?: AlicizationMindTurnGovernance | null
  personaKernel?: AlicizationPersonaKernelSnapshot | null
  runtimeDigest?: AlicizationRuntimeDigest | null
  sessionMirror?: AlicizationDialogueSessionMirror | null
}) {
  return buildAlicizationActiveDialogueFallbackReply({
    actionKind: input.actionKind,
    conversationMessages: input.messages,
    governance: input.governance,
    personaKernel: input.personaKernel,
    runtimeDigest: input.runtimeDigest,
    sessionMirror: input.sessionMirror,
    turnId: input.turnId,
  })
}
