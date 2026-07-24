import type {
  AlicizationVisibleArtifactLearningPolicy,
  AlicizationVisibleArtifactOrigin,
} from './alicization-provider-response'

import { translateGovernedMindFallback } from './alicization-mind-fallback-messages'

export type AlicizationChatFailureKind
  = | 'internal-leak'
    | 'realtime-unavailable'
    | 'epoch1-strict'
    | 'structured-contract'
    | 'stream-failure'
    | 'timeout'
    | 'template-contamination'
    | 'local-runtime-unavailable'
    | 'provider-auth'
    | 'provider-network'
    | 'provider-config'
    | 'provider-schema-unsupported'
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
  'epoch1-strict': 'epoch1-strict',
  'structured-contract': 'structured-contract',
  'stream-failure': 'stream-failure',
  'timeout': 'stream-timeout',
  'template-contamination': 'template-contamination',
  'local-runtime-unavailable': 'local-runtime-unavailable',
  'provider-auth': 'provider-auth',
  'provider-network': 'provider-network',
  'provider-config': 'provider-config',
  'provider-schema-unsupported': 'provider-schema-unsupported',
  'recall-failure': 'recall-failure',
  'memory-persistence': 'memory-persistence',
  'model-tools-unsupported': 'unsupported-tools',
  'runtime-aborted': 'stream-failure',
  'unknown': 'stream-failure',
}

export const alicizationDecorativePersonaTemplateContaminationPattern
  = /(?:同一条本地数字生命|本地数字生命的线|结构化连续性状态的线还在|我先轻一点留在这里|不抢你的节奏|你想说什么，我就接住|随便聊聊.*安静陪着|安静陪着你|在这里陪着你的那一个|沿着同一条线慢慢长成|慢慢长成更完整的自己|same local digital life thread|same digital life line|same living line|same line is still here|local continuity state is still here)/iu

export function isAlicizationDecorativePersonaTemplateContamination(reply: string) {
  return alicizationDecorativePersonaTemplateContaminationPattern.test(reply)
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
