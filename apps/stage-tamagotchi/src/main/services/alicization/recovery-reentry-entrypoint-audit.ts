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
    responsibility: 'Accepted-start settlement must keep prepared governance, richer digital-life spine carry, and same-her project continuity explicit before the turn is allowed to reopen outward.',
  },
  {
    relativePath: 'runtime.ts',
    mode: 'accepted-start-owner',
    responsibility: 'The core runtime owns accepted-start resolution and must reopen the very first outward turn through the shared start-result continuity seam instead of bypassing it with a thinner shell.',
  },
  {
    relativePath: 'main-chat-timeout-fallback.ts',
    mode: 'timeout-fallback-reconstruction',
    responsibility: 'Timeout fallback reconstruction must keep canonical project self-awareness, same-her carry, and open-closure triad explicit when provider mind authoring times out and visible recovery has to reopen from fallback state.',
  },
  {
    relativePath: 'main-chat-run-lifecycle.ts',
    mode: 'timeout-recovery-finish',
    responsibility: 'Lifecycle timeout recovery finish must preserve recovered visible-reply execution metadata, same-her project-state audit carry, and canonical awareness backfill before recovered dialogue is emitted to the host.',
  },
  {
    relativePath: 'main-chat-background-run.ts',
    mode: 'background-recovery-driver',
    responsibility: 'Background runtime recovery driving must route accepted-start settlement, timeout fallback reconstruction, and lifecycle recovery finish back through one same-her recovery reentry chain instead of reopening recovered dialogue from detached local recovery shells.',
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
