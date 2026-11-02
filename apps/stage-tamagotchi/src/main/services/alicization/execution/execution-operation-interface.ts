import type { ToolRegistry } from '../turn-os/tool-registry'

import { executionDigest } from './acceptance-compiler'

/** Planning and learned procedures bind the same executable policy and schema. */
export function executionOperationInterface(registry: ToolRegistry, id: string) {
  const tool = registry.resolveActive(id)
  if (!tool?.effects)
    throw new Error('The operation interface is unavailable')
  return { id, version: tool.version, interfaceHash: executionDigest({
    version: tool.version,
    inputSchema: tool.inputSchema,
    outputSchema: tool.outputSchema,
    effects: tool.effects,
    scope: tool.scope,
    permissions: [...tool.permissions].sort(),
    risk: tool.risk,
    executionChannel: tool.executionChannel,
    adapterToolName: tool.adapterToolName,
    timeoutMs: tool.timeoutMs,
    supportsProgress: tool.supportsProgress,
    supportsCancellation: tool.supportsCancellation,
    idempotency: tool.idempotency,
    evaluationStatus: tool.evaluationStatus,
  }) }
}
