import type { ChatSlices, StreamingAssistantMessage } from '../types/chat'

export interface AlicizationRendererVisibleReplyGuardTarget {
  content?: StreamingAssistantMessage['content']
  slices: ChatSlices[]
  categorization?: unknown
  structured?: unknown
}

export interface AlicizationRendererVisibleReplyBlockResult {
  blocked: true
  streamingMessage: StreamingAssistantMessage
}

export function shouldBlockAlicizationRendererLocalVisibleReply(input: {
  isAlicizationUserTurn: boolean
}) {
  return input.isAlicizationUserTurn
}

export function removeAlicizationExecutionStatusSlices(slices: ChatSlices[]) {
  return slices.filter(slice => slice.type !== 'execution-status')
}

export function blockAlicizationRendererLocalVisibleReply(input: {
  buildingMessage: AlicizationRendererVisibleReplyGuardTarget
  setRuntimeBlocked: () => void
  resetStagedResolution: () => void
  resetSpeechDraft: () => void
  resetFinalAssistantDisplayText: () => void
  createEmptyStreamingMessage: () => StreamingAssistantMessage
}): AlicizationRendererVisibleReplyBlockResult {
  input.setRuntimeBlocked()
  input.resetStagedResolution()
  input.resetSpeechDraft()
  input.resetFinalAssistantDisplayText()
  input.buildingMessage.content = ''
  input.buildingMessage.slices = removeAlicizationExecutionStatusSlices(input.buildingMessage.slices)
  input.buildingMessage.categorization = undefined
  input.buildingMessage.structured = undefined

  return {
    blocked: true,
    streamingMessage: input.createEmptyStreamingMessage(),
  }
}
