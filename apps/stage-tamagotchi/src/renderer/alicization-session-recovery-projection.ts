import type { ChatHistoryItem } from '@proj-alicization/stage-ui/types/chat'

import {
  removeChatInfrastructureErrorMessage,
  upsertChatInfrastructureErrorMessage,
} from '@proj-alicization/stage-ui/stores/chat-tool-projection'

const sessionRecoveryErrorCode = 'SESSION_RECONCILE_FAILED'

function sessionRecoveryErrorId(sessionId: string) {
  return `${sessionId}:session-reconcile-error`
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

export function projectAlicizationSessionRecoveryFailure(
  messages: ChatHistoryItem[],
  input: {
    sessionId: string
    error: unknown
  },
) {
  return upsertChatInfrastructureErrorMessage(messages, {
    id: sessionRecoveryErrorId(input.sessionId),
    code: sessionRecoveryErrorCode,
    message: errorMessage(input.error),
    label: '会话恢复失败',
  })
}

export function clearAlicizationSessionRecoveryFailure(
  messages: ChatHistoryItem[],
  sessionId: string,
) {
  return removeChatInfrastructureErrorMessage(
    messages,
    sessionRecoveryErrorId(sessionId),
  )
}
