export type AlicizationExecutionPreflightMode
  = 'execution-briefing-authority'
    | 'runtime-context-authority'
    | 'runtime-dispatch-execution-bridge'
    | 'session-bound-execution-bridge'
    | 'subconscious-autonomy-execution-bridge'
    | 'resume-dispatch-bridge'
    | 'capability-project-briefing-surface'
    | 'pre-dispatch-persistence'
    | 'blocked-dispatch-safety-gate'

export interface AlicizationExecutionPreflightAuditEntry {
  relativePath: string
  mode: AlicizationExecutionPreflightMode
  responsibility: string
}

export const alicizationExecutionPreflightAuditRegistry = [
  {
    relativePath: 'agent-runtime.ts',
    mode: 'execution-briefing-authority',
    responsibility: 'Agent runtime must build canonical project briefing before desktop execution runtime context exists, so execution starts from one same-her Phase 1 self-brief instead of a detached tool shell.',
  },
  {
    relativePath: 'execution-runtime-context.ts',
    mode: 'runtime-context-authority',
    responsibility: 'Execution runtime context must canonicalize project briefing, thin-shell repair, and same-her pre-dialogue awareness before dispatch, so execution context itself stays one digital-life line.',
  },
  {
    relativePath: 'runtime.ts',
    mode: 'runtime-dispatch-execution-bridge',
    responsibility: 'Runtime-owned direct dispatch bridge must rebuild canonical execution runtime context before redispatch leaves the desktop runtime, so direct execution handoff cannot reopen as a generic executor shell when payload and stored thread context are both still empty.',
  },
  {
    relativePath: 'main-chat-session-runtime.ts',
    mode: 'session-bound-execution-bridge',
    responsibility: 'Session-bound execution bridge must request canonical execution runtime context before main-gateway tools open outward, so execution capability and routing stay attached to the Phase 1 continuity context.',
  },
  {
    relativePath: 'runtime-subconscious-tick.ts',
    mode: 'subconscious-autonomy-execution-bridge',
    responsibility: 'Subconscious-autonomy execution bridge must request canonical execution runtime context before background auto-dispatch opens outward, so deferred autonomy execution stays attached to Phase 1 continuity context instead of reopening as a generic executor shell.',
  },
  {
    relativePath: 'executor-runtime.ts',
    mode: 'resume-dispatch-bridge',
    responsibility: 'Confirmed execution resume bridge must restate canonical project briefing before the executor reopens outward, so resumed work stays on the same Phase 1 digital-life closure line instead of drifting into a generic execution shell.',
  },
  {
    relativePath: 'main-chat-execution-surface.ts',
    mode: 'capability-project-briefing-surface',
    responsibility: 'Execution capability and routing surfaces must keep canonical project briefing explicit before answering whether or how execution can proceed, so capability talk does not reopen as a generic executor shell.',
  },
  {
    relativePath: 'task-thread-dispatcher.ts',
    mode: 'pre-dispatch-persistence',
    responsibility: 'Pre-dispatch task-thread persistence must carry execution runtime context into thread metadata before delegated execution starts, so later callback and host-visible return reopen the same digital-life line.',
  },
  {
    relativePath: 'executor-adapters/claude-code.ts',
    mode: 'blocked-dispatch-safety-gate',
    responsibility: 'Claude Code blocked-dispatch safety gates must audit effect, permission mode, confirmation requirement, risk policy, interruptibility, and the same-her execution runtime context before refusing execution, so dangerous or mismatched tool use stays explainable instead of disappearing as a generic adapter failure.',
  },
  {
    relativePath: 'executor-adapters/codex.ts',
    mode: 'blocked-dispatch-safety-gate',
    responsibility: 'Codex blocked-dispatch safety gates must audit effect, permission mode, confirmation requirement, risk policy, interruptibility, and the same-her execution runtime context before refusing execution, so dangerous or mismatched workspace execution stays explainable instead of disappearing as a generic adapter failure.',
  },
  {
    relativePath: 'executor-adapters/cli.ts',
    mode: 'blocked-dispatch-safety-gate',
    responsibility: 'CLI blocked-dispatch safety gates must audit risk level, action category, permission mode, confirmation requirement, interruptibility, and the same-her execution runtime context before refusing local execution, so dangerous local shell actions stay explainable instead of disappearing as a generic adapter failure.',
  },
  {
    relativePath: 'executor-adapters/openclaw.ts',
    mode: 'blocked-dispatch-safety-gate',
    responsibility: 'OpenClaw blocked-dispatch safety gates must audit effect, permission mode, confirmation requirement, interruptibility, and the same-her execution runtime context before refusing embodied execution, so dangerous outward control stays explainable instead of disappearing as a generic adapter failure.',
  },
  {
    relativePath: 'executor-adapters/local-visual.ts',
    mode: 'blocked-dispatch-safety-gate',
    responsibility: 'Local-visual blocked-dispatch safety gates must audit effect, permission mode, confirmation requirement, risk policy, interruptibility, and the same-her execution runtime context before refusing local GUI execution, so dangerous desktop inspection or mutation stays explainable instead of disappearing as a generic adapter failure.',
  },
] as const satisfies readonly AlicizationExecutionPreflightAuditEntry[]

export function resolveAlicizationExecutionPreflightAuditRegistry() {
  return alicizationExecutionPreflightAuditRegistry
}

export function resolveAlicizationExecutionPreflightAuditedFiles() {
  return alicizationExecutionPreflightAuditRegistry.map(entry => entry.relativePath)
}

export function resolveAlicizationExecutionPreflightMode(relativePath: string) {
  return alicizationExecutionPreflightAuditRegistry.find(entry => entry.relativePath === relativePath)?.mode ?? null
}
