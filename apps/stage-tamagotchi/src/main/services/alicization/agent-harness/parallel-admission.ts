import type { AlicizationModelAction } from '../turn-os/event-loop'
import type { ToolRegistry } from '../turn-os/tool-registry'

const readers = new Set(['tool.filesystem_read_file', 'tool.filesystem_list_directory', 'tool.filesystem_search_files', 'mcp.filesystem::read_file', 'mcp.filesystem::list_directory', 'mcp.filesystem::search_files'])

/** Never infer concurrency from a plugin's description or a model argument. */
export function isParallelReadAction(action: AlicizationModelAction, registry: ToolRegistry) {
  const invocation = registry.resolveProviderInvocation(action.providerToolName, action.input)
  const manifest = invocation && registry.resolveActive(invocation.capabilityId)
  return !!manifest && manifest.capabilityId === action.capabilityId && readers.has(manifest.capabilityId)
    && manifest.effects?.sideEffect === 'read' && manifest.effects.retryClass === 'read-only'
    && manifest.supportsCancellation && manifest.risk === 'low'
    && manifest.permissions.length === 1 && manifest.permissions[0] === 'workspace.read'
}
