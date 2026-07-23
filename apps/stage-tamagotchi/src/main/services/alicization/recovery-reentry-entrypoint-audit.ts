export type AlicizationRecoveryReentryAuditMode
  = 'accepted-start-settlement'
    | 'accepted-start-owner'
    | 'timeout-fallback-reconstruction'
    | 'timeout-recovery-finish'
    | 'background-recovery-driver'

export interface AlicizationRecoveryReentryAuditEntry {
  relativePath: string
  mode: AlicizationRecoveryReentryAuditMode
  responsibility: string
}

export const alicizationRecoveryReentryAuditRegistry = [
  {
    relativePath: 'main-chat-start-result.ts',
    mode: 'accepted-start-settlement',
    responsibility: 'Accepted-start settlement owns the initial result handoff.',
  },
  {
    relativePath: 'runtime.ts',
    mode: 'accepted-start-owner',
    responsibility: 'The core runtime owns accepted-start resolution.',
  },
  {
    relativePath: 'main-chat-timeout-fallback.ts',
    mode: 'timeout-fallback-reconstruction',
    responsibility: 'Timeout fallback owns the explicit infrastructure failure payload and must not synthesize dialogue.',
  },
  {
    relativePath: 'main-chat-run-lifecycle.ts',
    mode: 'timeout-recovery-finish',
    responsibility: 'Run lifecycle owns completion of timeout recovery and failure delivery.',
  },
  {
    relativePath: 'main-chat-background-run.ts',
    mode: 'background-recovery-driver',
    responsibility: 'Background runtime recovery coordinates accepted-start settlement and timeout completion.',
  },
] as const satisfies readonly AlicizationRecoveryReentryAuditEntry[]

export function resolveAlicizationRecoveryReentryAuditRegistry() {
  return alicizationRecoveryReentryAuditRegistry
}

export function resolveAlicizationRecoveryReentryAuditedFiles() {
  return alicizationRecoveryReentryAuditRegistry.map(entry => entry.relativePath)
}

export function resolveAlicizationRecoveryReentryAuditMode(relativePath: string) {
  return alicizationRecoveryReentryAuditRegistry.find(entry => entry.relativePath === relativePath)?.mode ?? null
}
