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
    responsibility: 'Background recovery owns timeout failure delivery and must not author replacement dialogue.',
  },
  {
    relativePath: 'runtime.ts',
    mode: 'prelude-preparation-owner',
    responsibility: 'The core runtime owns entry into chat prelude and execution preparation.',
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
