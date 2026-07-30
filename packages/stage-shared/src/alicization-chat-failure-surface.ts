import type {
  AlicizationVisibleArtifactLearningPolicy,
  AlicizationVisibleArtifactOrigin,
} from './alicization-provider-response'

import { translateGovernedMindFallback } from './alicization-mind-fallback-messages'

export type AlicizationChatFailureKind
  = | 'internal-leak'
    | 'realtime-unavailable'
    | 'structured-contract'
    | 'stream-failure'
    | 'timeout'
    | 'local-runtime-unavailable'
    | 'provider-auth'
    | 'provider-network'
    | 'provider-config'
    | 'provider-schema-unsupported'
    | 'required-tool-missing'
    | 'recall-failure'
    | 'memory-persistence'
    | 'model-tools-unsupported'
    | 'runtime-aborted'
    | 'unknown'

export interface AlicizationChatFailureSurface extends AlicizationVisibleArtifactLearningPolicy {
  kind: AlicizationChatFailureKind
  reply: string
  origin: Extract<AlicizationVisibleArtifactOrigin, 'failure-surface'>
  allowLongTermCondensation: false
  allowPersonaLearning: false
  allowTraining: false
  nonHumanAuthoredStatus: `direct-infra-repair:${AlicizationChatFailureKind}`
  visibleReplySource: 'infrastructure-failure'
  excludeFromPersonaLearning: true
  excludeFromMemoryCondensation: true
  auditCategory: 'alicization.chat-failure'
}

export type AlicizationChatMemoryFailureStage
  = | 'long-term-memory-recall'
    | 'working-memory-history'
    | 'working-memory-long-term-queue'

export interface AlicizationChatMemoryFailureSurface extends AlicizationChatFailureSurface {
  stage: AlicizationChatMemoryFailureStage
  cardId: string
  turnId: string
  occurredAt: number
  errorSummary: string
}

const failureKindRepairPath: Record<AlicizationChatFailureKind, string> = {
  'internal-leak': 'internal-leak',
  'realtime-unavailable': 'realtime-unavailable',
  'structured-contract': 'structured-contract',
  'stream-failure': 'stream-failure',
  'timeout': 'stream-timeout',
  'local-runtime-unavailable': 'local-runtime-unavailable',
  'provider-auth': 'provider-auth',
  'provider-network': 'provider-network',
  'provider-config': 'provider-config',
  'provider-schema-unsupported': 'provider-schema-unsupported',
  'required-tool-missing': 'required-tool-missing',
  'recall-failure': 'recall-failure',
  'memory-persistence': 'memory-persistence',
  'model-tools-unsupported': 'unsupported-tools',
  'runtime-aborted': 'stream-failure',
  'unknown': 'stream-failure',
}

export function resolveAlicizationChatFailureSurface(input: {
  kind: AlicizationChatFailureKind
  userText?: string
}): AlicizationChatFailureSurface {
  const repairPath = failureKindRepairPath[input.kind]
  return {
    kind: input.kind,
    reply: translateGovernedMindFallback(`mind-repair.${repairPath}`, undefined, input.userText),
    origin: 'failure-surface',
    allowLongTermCondensation: false,
    allowPersonaLearning: false,
    allowTraining: false,
    nonHumanAuthoredStatus: `direct-infra-repair:${input.kind}`,
    visibleReplySource: 'infrastructure-failure',
    excludeFromPersonaLearning: true,
    excludeFromMemoryCondensation: true,
    auditCategory: 'alicization.chat-failure',
  }
}
