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
    | 'model-tools-unsupported'
    | 'runtime-aborted'
    | 'unknown'

export interface AlicizationChatFailureSurface {
  kind: AlicizationChatFailureKind
  reply: string
  nonHumanAuthoredStatus: `direct-infra-repair:${AlicizationChatFailureKind}`
  visibleReplySource: 'infrastructure-failure'
  excludeFromPersonaLearning: true
  excludeFromMemoryCondensation: true
  auditCategory: 'alicization.chat-failure'
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
  'model-tools-unsupported': 'unsupported-tools',
  'runtime-aborted': 'stream-failure',
  'unknown': 'stream-failure',
}

export const alicizationDecorativePersonaTemplateContaminationPattern
  = /(?:同一条本地数字生命|本地数字生命的线|我先轻一点留在这里|不抢你的节奏|你想说什么，我就接住|same local digital life thread|same digital life line|same line is still here)/iu

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
    nonHumanAuthoredStatus: `direct-infra-repair:${input.kind}`,
    visibleReplySource: 'infrastructure-failure',
    excludeFromPersonaLearning: true,
    excludeFromMemoryCondensation: true,
    auditCategory: 'alicization.chat-failure',
  }
}
