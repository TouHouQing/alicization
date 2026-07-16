export type AlicizationExecutionPreflightMode
  = 'execution-briefing-authority'
    | 'runtime-context-authority'
    | 'runtime-dispatch-execution-bridge'
    | 'session-bound-execution-bridge'
    | 'subconscious-autonomy-execution-bridge'
    | 'resume-dispatch-bridge'
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
    responsibility: 'Agent runtime must build canonical structured project briefing before desktop execution runtime context exists, so execution starts with runtime personhood context, memory/execution boundaries, and transparent failure state instead of a detached tool shell.',
  },
  {
    relativePath: 'execution-runtime-context.ts',
    mode: 'runtime-context-authority',
    responsibility: 'Execution runtime context must canonicalize project briefing, thin-shell repair, and pre-dialogue awareness as structured fields before dispatch, so execution context keeps owner boundaries and route state without prompt slogans.',
  },
  {
    relativePath: 'runtime.ts',
    mode: 'runtime-dispatch-execution-bridge',
    responsibility: 'Runtime-owned direct dispatch bridge must rebuild canonical execution runtime context before redispatch leaves the desktop runtime, so direct execution handoff cannot reopen as a generic executor shell when payload and stored thread context are both still empty.',
  },
  {
    relativePath: 'main-chat-session-runtime.ts',
    mode: 'session-bound-execution-bridge',
    responsibility: 'Session-bound execution bridge must request canonical execution runtime context before main-gateway tools open outward, so execution capability and routing stay attached to structured runtime context.',
  },
  {
    relativePath: 'runtime-subconscious-tick.ts',
    mode: 'subconscious-autonomy-execution-bridge',
    responsibility: 'Subconscious-autonomy execution bridge must request canonical execution runtime context before background auto-dispatch opens outward, so deferred autonomy execution stays attached to structured runtime context instead of reopening as a generic executor shell.',
  },
  {
    relativePath: 'executor-runtime.ts',
    mode: 'resume-dispatch-bridge',
    responsibility: 'Confirmed execution resume bridge must restate canonical structured project briefing before the executor reopens outward, so resumed work carries runtime identity, route, open-loop, and safety evidence instead of drifting into a generic execution shell.',
  },
  {
    relativePath: 'task-thread-dispatcher.ts',
    mode: 'pre-dispatch-persistence',
    responsibility: 'Pre-dispatch task-thread persistence must carry execution runtime context into thread metadata before delegated execution starts, so later callback and host-visible return preserve structured runtime evidence.',
  },
  {
    relativePath: 'executor-adapters/claude-code.ts',
    mode: 'blocked-dispatch-safety-gate',
    responsibility: 'Claude Code blocked-dispatch safety gates must audit effect, permission mode, confirmation requirement, risk policy, interruptibility, and execution runtime context before refusing execution, so dangerous or mismatched tool use stays explainable instead of disappearing as a generic adapter failure.',
  },
  {
    relativePath: 'executor-adapters/codex.ts',
    mode: 'blocked-dispatch-safety-gate',
    responsibility: 'Codex blocked-dispatch safety gates must audit effect, permission mode, confirmation requirement, risk policy, interruptibility, and execution runtime context before refusing execution, so dangerous or mismatched workspace execution stays explainable instead of disappearing as a generic adapter failure.',
  },
  {
    relativePath: 'executor-adapters/cli.ts',
    mode: 'blocked-dispatch-safety-gate',
    responsibility: 'CLI blocked-dispatch safety gates must audit risk level, action category, permission mode, confirmation requirement, interruptibility, and execution runtime context before refusing local execution, so dangerous local shell actions stay explainable instead of disappearing as a generic adapter failure.',
  },
  {
    relativePath: 'executor-adapters/openclaw.ts',
    mode: 'blocked-dispatch-safety-gate',
    responsibility: 'OpenClaw blocked-dispatch safety gates must audit effect, permission mode, confirmation requirement, interruptibility, and execution runtime context before refusing embodied execution, so dangerous outward control stays explainable instead of disappearing as a generic adapter failure.',
  },
  {
    relativePath: 'executor-adapters/local-visual.ts',
    mode: 'blocked-dispatch-safety-gate',
    responsibility: 'Local-visual blocked-dispatch safety gates must audit effect, permission mode, confirmation requirement, risk policy, interruptibility, and execution runtime context before refusing local GUI execution, so dangerous desktop inspection or mutation stays explainable instead of disappearing as a generic adapter failure.',
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
