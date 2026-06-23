export type AlicizationExecutionFollowUpContinuityMode
  = 'callback-runtime-authority'
    | 'callback-conscious-frame-surface'
    | 'callback-delivery-surface'
    | 'callback-payoff-surface'
    | 'callback-capability-project-briefing'
    | 'follow-up-obligation-authority'
    | 'follow-up-response-contract-surface'
    | 'ledger-follow-up-recall'
    | 'session-follow-up-assembly'
    | 'afterglow-learning-authority'
    | 'callback-persistence-surface'

export interface AlicizationExecutionFollowUpContinuityAuditEntry {
  relativePath: string
  mode: AlicizationExecutionFollowUpContinuityMode
  responsibility: string
}

export const alicizationExecutionFollowUpContinuityAuditRegistry = [
  {
    relativePath: 'execution-callback-runtime.ts',
    mode: 'callback-runtime-authority',
    responsibility: 'Execution callback runtime must rebuild callback recall, system-block carry, and same-her callback continuity before host-visible callback speech lands.',
  },
  {
    relativePath: 'current-conscious-frame.ts',
    mode: 'callback-conscious-frame-surface',
    responsibility: 'Current conscious-frame shaping must keep callback doctrine, same-her anti-shell carry, and callback-specific closure pressure explicit before callback-facing reply planning widens outward.',
  },
  {
    relativePath: 'runtime-execution-delivery.ts',
    mode: 'callback-delivery-surface',
    responsibility: 'Execution callback delivery runtime must keep callback return inside the same Phase 1 digital-life line while callback continuity is converted into host-facing delivery state.',
  },
  {
    relativePath: 'execution-delivery-surface.ts',
    mode: 'callback-payoff-surface',
    responsibility: 'Execution payoff prompts must keep callback payoff authority on the same living line instead of letting callback delivery reopen as detached result-shell narration.',
  },
  {
    relativePath: 'main-chat-execution-surface.ts',
    mode: 'callback-capability-project-briefing',
    responsibility: 'Execution capability surfaces must keep callback-aware same-her project briefing explicit while explaining callback payoff, so capability narration does not detach from the living execution-return line.',
  },
  {
    relativePath: 'main-chat-execution-reply-obligation.ts',
    mode: 'follow-up-obligation-authority',
    responsibility: 'Execution-result follow-up obligation must keep fresh callback payoff on the same digital-life line instead of reopening as detached task-shell narration.',
  },
  {
    relativePath: 'response-surface-contract.ts',
    mode: 'follow-up-response-contract-surface',
    responsibility: 'Response-surface contracts must propagate execution follow-up carry and callback doctrine into host-visible answer shaping once callback payoff is already the active obligation.',
  },
  {
    relativePath: 'memory-ledger-runtime.ts',
    mode: 'ledger-follow-up-recall',
    responsibility: 'Execution ledger recall must keep older execution history on the same project boundary so follow-up without a fresh callback still reopens one living line.',
  },
  {
    relativePath: 'main-chat-session-runtime.ts',
    mode: 'session-follow-up-assembly',
    responsibility: 'Main chat session-runtime must assemble fresh callback and ledger-backed execution follow-up carry into live reply preparation before the turn speaks outward.',
  },
  {
    relativePath: 'execution-interaction-learning.ts',
    mode: 'afterglow-learning-authority',
    responsibility: 'Execution interaction learning must keep callback-afterglow restraint and same-her drift pressure explicit so post-execution warmth does not widen into generic task payoff.',
  },
  {
    relativePath: 'runtime-delivery-reminders.ts',
    mode: 'callback-persistence-surface',
    responsibility: 'Reminder and execution-callback delivery persistence must keep callback-afterglow hold and callback continuity visible while host-facing callback carry is delayed or replayed later.',
  },
] as const satisfies readonly AlicizationExecutionFollowUpContinuityAuditEntry[]

export function resolveAlicizationExecutionFollowUpContinuityAuditRegistry() {
  return alicizationExecutionFollowUpContinuityAuditRegistry
}

export function resolveAlicizationExecutionFollowUpContinuityAuditFiles() {
  return alicizationExecutionFollowUpContinuityAuditRegistry.map(entry => entry.relativePath)
}

export function resolveAlicizationExecutionFollowUpContinuityMode(relativePath: string) {
  return alicizationExecutionFollowUpContinuityAuditRegistry.find(entry => entry.relativePath === relativePath)?.mode ?? null
}
