import type {
  AlicizationExecutionCapabilityInquiry,
  AlicizationExecutionRoutingIntent,
} from '@proj-alicization/stage-shared'
import type { Message } from '@xsai/shared-chat'

import type { AlicizationMainChatActionObligationKind } from './main-chat-action-obligation'

import { shouldAttachAlicizationProjectStateContext } from '@proj-alicization/stage-shared'

function readLatestUserText(messages: Message[]) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index]
    if (message?.role !== 'user')
      continue
    return typeof message.content === 'string'
      ? message.content.trim().replace(/\s+/g, ' ').slice(0, 500)
      : ''
  }
  return ''
}

function looksLikeExecutionOrToolStatusTurn(latestUserText: string) {
  const normalized = latestUserText.trim().replace(/\s+/g, ' ').toLowerCase()
  if (!normalized)
    return false

  return /(?:命令|工具|执行|command|tool|execution).{0,24}(?:失败|报错|错误|超时|完成|结束|结果|状态|fail|failed|error|timeout|done|finish|status|result)|(?:失败|报错|错误|超时|完成|结束|结果|状态|fail|failed|error|timeout|done|finish|status|result).{0,24}(?:命令|工具|执行|command|tool|execution)/iu.test(normalized)
}

export function shouldIncludeProjectStateProviderContext(input: {
  actionKind?: AlicizationMainChatActionObligationKind | null
  answerSubject?: string | null
  executionCapabilityInquiry?: AlicizationExecutionCapabilityInquiry | null
  executionReplyObligation?: unknown
  executionRoutingIntent?: AlicizationExecutionRoutingIntent | null
  latestUserText?: string | null
  messages?: Message[] | null
}) {
  const latestUserText = (
    typeof input.latestUserText === 'string' && input.latestUserText.trim()
      ? input.latestUserText
      : input.messages
        ? readLatestUserText(input.messages)
        : ''
  ).trim()

  if (looksLikeExecutionOrToolStatusTurn(latestUserText))
    return true
  if (input.executionCapabilityInquiry?.active || input.executionCapabilityInquiry?.capabilityQuestion)
    return true

  return shouldAttachAlicizationProjectStateContext({
    latestUserText,
    answerSubject: input.answerSubject,
    executionReplyRequired: Boolean(input.executionReplyObligation),
    executionRoutingRequired: Boolean(input.executionRoutingIntent),
    executionCapabilityQuestion: Boolean(input.executionCapabilityInquiry?.active || input.executionCapabilityInquiry?.capabilityQuestion),
    actionKind: input.actionKind,
  })
}
