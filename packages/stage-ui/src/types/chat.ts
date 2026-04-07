import type { ContextUpdate, MetadataEventSource, WebSocketEventInputs } from '@proj-alicization/server-sdk'
import type { AssistantMessage, CommonContentPart, CompletionToolCall, Message, SystemMessage, ToolMessage, UserMessage } from '@xsai/shared-chat'

import type {
  AlicizationDialogueEmbodimentEnvelope,
  AlicizationDialoguePerformancePayload,
  AlicizationDialogueSpeechTimeline,
  AlicizationDialogueStructuredFormat,
  AlicizationDigitalLifeEnvelope,
  AlicizationDigitalLifeSpineDigest,
  AlicizationMindTurnGovernance,
  AlicizationProactiveMetadata,
} from '../stores/alicization-bridge'

export interface ChatSlicesText {
  type: 'text'
  text: string
}

export interface ChatSlicesToolCall {
  type: 'tool-call'
  toolCall: CompletionToolCall
}

export interface ChatSlicesToolCallResult {
  type: 'tool-call-result'
  id: string
  result?: unknown
}

export interface ChatSlicesExecutionStatus {
  type: 'execution-status'
  phase: 'planning' | 'tool-running' | 'tool-failed' | 'completed'
  label: string
  source?: 'builtin' | 'mcp'
  category?: 'news' | 'weather' | 'finance' | 'sports'
}

export type ChatSlices = ChatSlicesText | ChatSlicesToolCall | ChatSlicesToolCallResult | ChatSlicesExecutionStatus

export interface ChatAssistantStructuredPayload {
  thought: string
  emotion: string
  reply: string
  performance?: AlicizationDialoguePerformancePayload
  userSentimentScore?: number
  sentimentConfidenceRaw?: number
  sentimentConfidence?: number
  format: AlicizationDialogueStructuredFormat
  parsePath?: 'json' | 'repair-json' | 'act' | 'fallback'
  repairTimedOut?: boolean
  contractFailed?: boolean
  embodiment?: AlicizationDialogueEmbodimentEnvelope | null
  speechTimeline?: AlicizationDialogueSpeechTimeline | null
  digitalLife?: AlicizationDigitalLifeEnvelope | null
  digitalLifeSpine?: AlicizationDigitalLifeSpineDigest | null
  proactive?: AlicizationProactiveMetadata
  governance?: AlicizationMindTurnGovernance | null
  policyLocked?: string
}

export interface ChatAssistantMessage extends AssistantMessage {
  origin?: 'user-turn' | 'subconscious-proactive'
  slices: ChatSlices[]
  tool_results: {
    id: string
    result?: unknown
  }[]
  categorization?: {
    speech: string
    reasoning: string
  }
  structured?: ChatAssistantStructuredPayload
}

export type ChatMessage = ChatAssistantMessage | SystemMessage | ToolMessage | UserMessage

export interface ErrorMessage {
  role: 'error'
  content: string
}

export interface ContextMessage extends ContextUpdate<Record<string, unknown>, string | CommonContentPart[]> {
  metadata?: {
    source: MetadataEventSource
  }
  createdAt: number
}

export type ChatHistoryItem = (ChatMessage | ErrorMessage) & { context?: ContextMessage } & { createdAt?: number, id?: string }

export interface ChatStreamEventContext {
  sessionId?: string
  message: ChatHistoryItem
  contexts: Record<string, ContextMessage[]>
  composedMessage: Array<Message>
  input?: WebSocketEventInputs
}

export type ChatStreamEvent
  = | { type: 'before-compose', message: string, sessionId: string, context: Omit<ChatStreamEventContext, 'composedMessage'> }
    | { type: 'after-compose', message: string, sessionId: string, context: ChatStreamEventContext }
    | { type: 'before-send', message: string, sessionId: string, context: ChatStreamEventContext }
    | { type: 'after-send', message: string, sessionId: string, context: ChatStreamEventContext }
    | { type: 'token-literal', literal: string, sessionId: string, context: ChatStreamEventContext }
    | { type: 'token-special', special: string, sessionId: string, context: ChatStreamEventContext }
    | { type: 'stream-end', sessionId: string, context: ChatStreamEventContext }
    | { type: 'assistant-end', message: string, sessionId: string, context: ChatStreamEventContext }
    | { type: 'assistant-message', message: ChatAssistantMessage, sessionId: string, messageText: string, context: ChatStreamEventContext }

export type StreamingAssistantMessage = ChatAssistantMessage & { context?: ContextMessage } & { createdAt?: number, id?: string }
