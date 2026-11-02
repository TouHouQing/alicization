import type { Tool } from '@xsai/shared-chat'

import { awaitAlicizationPromiseWithAbort } from './main-chat-stream-primitives'

export interface ProviderToolInputProjection { input: Record<string, unknown>, projection: Record<string, unknown> | null }
type Projector = (input: Record<string, unknown>, signal: AbortSignal) => Promise<ProviderToolInputProjection>
const inputProjector = Symbol('alicization-provider-tool-input-projector')
type ProjectedTool = Tool & { [inputProjector]?: Projector }

/** Local metadata survives tool adapters but is absent from provider JSON. */
export function withProviderToolInputProjection(tool: Tool, project: Projector): Tool {
  return Object.assign(tool, { [inputProjector]: project })
}

export async function projectProviderToolInput(tool: Tool | undefined, input: Record<string, unknown>, signal: AbortSignal, record: (projection: Record<string, unknown>) => void) {
  const project = (tool as ProjectedTool | undefined)?.[inputProjector]
  if (!project)
    return input
  signal.throwIfAborted()
  const result = await awaitAlicizationPromiseWithAbort(project(input, signal), signal)
  signal.throwIfAborted()
  if (result.projection)
    record(result.projection)
  return result.input
}
