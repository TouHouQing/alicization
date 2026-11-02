import type { ToolRegistry } from '../turn-os/tool-registry'

import { executionDigest } from './acceptance-compiler'
import { executionOperationInterface } from './execution-operation-interface'
import { isProcedureBrowserInteraction } from './procedure-browser-interaction'
import { isProcedureDesktopOperation } from './procedure-desktop-interaction'
import { procedurePageCount } from './procedure-page-routes'

const operations = new Set([
  'tool.filesystem_read_file',
  'tool.filesystem_list_directory',
  'tool.filesystem_write_file',
  'tool.browser_open_url',
  'tool.browser_read_page',
  'tool.browser_type_text',
  'tool.browser_upload_files',
  'tool.browser_click_element',
  'tool.browser_wait',
  'tool.desktop_list_interactables',
  'tool.desktop_type_text',
  'tool.desktop_click_element',
  'coding_agent.codex',
  'coding_agent.claude_code',
  'coding_agent.cli',
])

/** Keep the transferable vocabulary explicit; interaction needs its own evaluator. */
export function transferableProcedureOperation(registry: ToolRegistry, id: string) {
  const manifest = registry.resolveActive(id)
  if (!manifest || !operations.has(id) || !manifest.effects)
    throw new Error('The procedure uses an unavailable or nontransferable operation')
  return executionOperationInterface(registry, id)
}

export function isProcedurePageUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 4096 || /[\u0000-\u0020\u007F]/u.test(value))
    return false
  try {
    const url = new URL(value)
    return ['http:', 'https:'].includes(url.protocol) && Boolean(url.hostname) && !url.username && !url.password
  }
  catch { return false }
}

export function procedureEvaluatorVersion(template: { tools: Array<{ id: string }>, steps: Array<Record<string, unknown>> }) {
  if (template.tools.some(tool => isProcedureDesktopOperation(tool.id)))
    return 'windows-desktop-replay-v1' as const
  if (template.tools.some(tool => tool.id === 'tool.browser_upload_files'))
    return 'browser-upload-replay-v1' as const
  if (template.tools.some(tool => isProcedureBrowserInteraction(tool.id)))
    return 'browser-interaction-replay-v1' as const
  if (template.tools.some(tool => tool.id.startsWith('coding_agent.')))
    return 'computer-procedure-replay-v2' as const
  return template.tools.some(tool => tool.id.startsWith('tool.browser_')) ? procedurePageCount(template) > 1 ? 'browser-procedure-replay-v2' as const : 'browser-procedure-replay-v1' as const : 'file-procedure-replay-v1' as const
}

export function procedureEvaluationCases(template: { tools: Array<{ id: string }>, steps: Array<Record<string, unknown>> }) {
  return [
    'different-input-1',
    'different-input-2',
    'invalid-arguments',
    'interface-change',
    'cancellation',
    ...(template.tools.some(tool => isProcedureDesktopOperation(tool.id)) ? ['control-missing', 'control-ambiguous', 'save-refused', 'saved-content-changed', 'window-closed'] : []),
    ...(procedurePageCount(template) > 1 ? [...Array.from({ length: procedurePageCount(template) }, (_, index) => [`page-${index + 1}-changed`, `page-${index + 1}-missing`]).flat(), 'page-results-swapped'] : template.tools.some(tool => tool.id.startsWith('tool.browser_')) ? ['page-changed', 'page-missing'] : []),
    ...(template.tools.some(tool => tool.id.startsWith('coding_agent.')) ? ['delegation-refused', 'delegation-no-result', 'delegation-interrupted'] : []),
    ...(template.tools.some(tool => isProcedureBrowserInteraction(tool.id)) ? ['control-missing', 'control-ambiguous', 'submission-refused'] : []),
    ...(template.tools.some(tool => tool.id === 'tool.browser_upload_files') ? ['upload-changed-bytes'] : []),
  ]
}

export function procedureRisk(template: { tools: Array<{ id: string, version: string, interfaceHash: string }> }, registry: ToolRegistry) {
  const levels = ['low', 'medium', 'high', 'critical'] as const
  let maximum = 0
  for (const tool of template.tools) {
    if (executionDigest(tool) !== executionDigest(transferableProcedureOperation(registry, tool.id)))
      throw new Error('Procedure risk requires its unchanged operation interface')
    maximum = Math.max(maximum, levels.indexOf(registry.resolveActive(tool.id)!.risk))
  }
  return levels[maximum]
}

/** Skill metadata follows the same versioned manifests used at action dispatch. */
export function procedureRequiredPermissions(template: { tools: Array<{ id: string, version: string, interfaceHash: string }> }, registry: ToolRegistry) {
  const permissions = new Set<string>()
  for (const tool of template.tools) {
    if (executionDigest(tool) !== executionDigest(transferableProcedureOperation(registry, tool.id)))
      throw new Error('Procedure permissions require its unchanged operation interface')
    for (const permission of registry.resolveActive(tool.id)!.permissions)
      permissions.add(permission)
  }
  return [...permissions].sort()
}
