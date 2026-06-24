export type AlicizationChatStartDeepHelperOwnerMode
  = 'prelude-preparation-owner'
    | 'timeout-fallback-owner'

export interface AlicizationChatStartDeepHelperOwnerAuditEntry {
  relativePath: string
  mode: AlicizationChatStartDeepHelperOwnerMode
  responsibility: string
}

const alicizationChatStartDeepHelperOwnerAuditTargets = [
  'buildAlicizationMainGatewayTimeoutFallbackReply',
  'prepareMainChatExecution',
  'prepareMainChatPrelude',
] as const

export const alicizationChatStartDeepHelperOwnerAuditRegistry = [
  {
    relativePath: 'main-chat-background-run.ts',
    mode: 'timeout-fallback-owner',
    responsibility: 'Background recovery owns the last local timeout fallback generation seam and must only pass through the already-selected pre-dialogue identity fragment instead of inventing a new project-awareness shell there.',
  },
  {
    relativePath: 'runtime.ts',
    mode: 'prelude-preparation-owner',
    responsibility: 'The core runtime chat-start seam owns direct entry into deeper prelude/preparation helpers and must normalize same-her project awareness before spawning either helper.',
  },
] as const satisfies readonly AlicizationChatStartDeepHelperOwnerAuditEntry[]

export function resolveAlicizationChatStartDeepHelperOwnerAuditTargets() {
  return [...alicizationChatStartDeepHelperOwnerAuditTargets]
}

export function resolveAlicizationChatStartDeepHelperOwnerAuditRegistry() {
  return alicizationChatStartDeepHelperOwnerAuditRegistry
}

export function resolveAlicizationChatStartDeepHelperOwnerAuditFiles() {
  return alicizationChatStartDeepHelperOwnerAuditRegistry.map(entry => entry.relativePath)
}

export function resolveAlicizationChatStartDeepHelperOwnerMode(relativePath: string) {
  return alicizationChatStartDeepHelperOwnerAuditRegistry.find(entry => entry.relativePath === relativePath)?.mode ?? null
}
