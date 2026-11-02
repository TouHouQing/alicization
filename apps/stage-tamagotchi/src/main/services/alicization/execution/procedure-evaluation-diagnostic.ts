import type { LifeStateView } from '../../../../shared/life-contracts'

const codes = new Set(['CODEX_ABORTED', 'CODEX_PROVIDER_UNAVAILABLE', 'CODEX_EXECUTE_FAILED', 'CODEX_PROTOCOL_INCOMPLETE', 'CODEX_EMPTY_OUTPUT', 'CODEX_INTERRUPTED', 'CODEX_STARTUP_TIMEOUT', 'CODEX_EXECUTION_TIMEOUT', 'CODEX_ACTIVE_STEP_TIMEOUT', 'CODEX_PROCESS_TREE_UNVERIFIED', 'CODEX_DISPATCH_REVOKED', 'CLI_ABORTED', 'CLI_TIMEOUT', 'CLI_EXECUTE_FAILED', 'CLI_PROCESS_TREE_UNVERIFIED', 'CLAUDE_CODE_ABORTED', 'CLAUDE_CODE_TIMEOUT', 'CLAUDE_CODE_EXECUTE_FAILED', 'CLAUDE_CODE_PROCESS_TREE_UNVERIFIED', 'WORK_DELEGATION_NOT_APPROVED'])
const capabilities = new Set(['coding_agent.cli', 'coding_agent.codex', 'coding_agent.claude_code', 'tool.filesystem_read_file', 'tool.filesystem_write_file', 'tool.filesystem_list_directory', 'tool.browser_open_url', 'tool.browser_read_page', 'tool.browser_type_text', 'tool.browser_click_element', 'tool.browser_wait', 'tool.desktop_list_interactables', 'tool.desktop_type_text', 'tool.desktop_click_element'])

/** Failure causes survive fixture disposal without persisting commands or content. */
export function procedureEvaluationDiagnostic(view: LifeStateView, planId: string) {
  const plan = view.execution?.plans.find(item => item.id === planId)
  const goal = view.obligations.find(item => item.threadId === plan?.rootThreadId)
  let nativeFailure: { code: string, detail: string } | undefined
  const details = (plan?.steps ?? []).slice(0, 5).map((step) => {
    const result = view.execution?.results.findLast(item => item.planId === planId && item.stepId === step.id)
    const effect = view.effects.find(item => item.id === result?.effectId)
    const output = effect?.receipt?.output
    const code = output && typeof output === 'object' && 'errorCode' in output ? output.errorCode : null
    const nativeCode = step.capabilityId.startsWith('tool.desktop_') && typeof code === 'string' && /^[A-Z][A-Z_0-9]{1,95}$/u.test(code)
    if (nativeCode && code === 'WINDOWS_UIA_OPERATION_FAILED' && output && typeof output === 'object' && 'errorMessage' in output && typeof output.errorMessage === 'string')
      nativeFailure = { code, detail: output.errorMessage.slice(-240) }
    return [capabilities.has(step.capabilityId) ? step.capabilityId : 'other', step.state, effect?.status ?? 'absent', typeof code === 'string' && (codes.has(code) || nativeCode) ? code : code ? 'OTHER' : null]
  })
  const value = { goal: goal?.status ?? 'absent', verdict: goal?.verification?.verdict ?? 'absent', steps: details, omitted: Math.max(0, (plan?.steps.length ?? 0) - details.length), ...(nativeFailure ? { nativeFailure } : {}) }
  while (JSON.stringify(value).length > 512 && value.steps.length) {
    value.steps.pop()
    value.omitted++
  }
  return JSON.stringify(value)
}
