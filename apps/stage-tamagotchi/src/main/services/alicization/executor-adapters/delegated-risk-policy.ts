import type { AlicizationClaudeCodeCommandInput } from '@proj-alicization/stage-shared'

export function requiresDelegatedPermissionApproval(command?: AlicizationClaudeCodeCommandInput | null) {
  return command?.allowTools === true && ['bypassPermissions', 'dontAsk', 'delegate'].includes(command.permissionMode ?? '')
}
