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
    responsibility: 'Execution callback runtime owns callback facts and recall inputs.',
  },
  {
    relativePath: 'current-conscious-frame.ts',
    mode: 'callback-conscious-frame-surface',
    responsibility: 'Current conscious-frame shaping may consume callback facts without authoring reply text.',
  },
  {
    relativePath: 'runtime-execution-delivery.ts',
    mode: 'callback-delivery-surface',
    responsibility: 'Execution delivery owns host-facing callback state.',
  },
  {
    relativePath: 'execution-delivery-surface.ts',
    mode: 'callback-payoff-surface',
    responsibility: 'Execution delivery surfaces expose completed action facts to the dialogue owner.',
  },
  {
    relativePath: 'main-chat-execution-surface.ts',
    mode: 'callback-capability-project-briefing',
    responsibility: 'Main-chat execution surfaces expose available capability and callback facts.',
  },
  {
    relativePath: 'main-chat-execution-reply-obligation.ts',
    mode: 'follow-up-obligation-authority',
    responsibility: 'Execution-result follow-up ownership tracks whether a callback needs a Provider-authored response.',
  },
  {
    relativePath: 'response-surface-contract.ts',
    mode: 'follow-up-response-contract-surface',
    responsibility: 'Response contracts transport execution follow-up facts without supplying visible wording.',
  },
  {
    relativePath: 'memory-ledger-runtime.ts',
    mode: 'ledger-follow-up-recall',
    responsibility: 'Execution ledger recall owns durable execution history retrieval.',
  },
  {
    relativePath: 'main-chat-session-runtime.ts',
    mode: 'session-follow-up-assembly',
    responsibility: 'Main chat session runtime assembles callback and ledger facts for Provider planning.',
  },
  {
    relativePath: 'execution-interaction-learning.ts',
    mode: 'afterglow-learning-authority',
    responsibility: 'Execution interaction learning owns reviewed post-execution learning signals.',
  },
  {
    relativePath: 'runtime-delivery-reminders.ts',
    mode: 'callback-persistence-surface',
    responsibility: 'Reminder delivery persists callback facts through the guarded turn writer.',
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
