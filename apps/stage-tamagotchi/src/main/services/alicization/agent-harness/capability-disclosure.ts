import type { Message, Tool } from '@xsai/shared-chat'

import type { AlicizationActionRuntimeState } from '../turn-os/runtime-state'
import type { ToolRegistry } from '../turn-os/tool-registry'

import { Buffer } from 'node:buffer'

import { tool } from '@xsai/tool'
import { z } from 'zod'

import { executionDigest } from '../execution/acceptance-compiler'
import { selectSkills } from '../third-party/codex-skill-selector'
import { searchHermesCatalog } from '../third-party/hermes-tool-catalog'
import { capabilitySearchVocabulary } from './capability-search-vocabulary'

export const capabilitySearchName = 'life_search_capabilities'
export const capabilityDescribeName = 'life_describe_capabilities'
const bridges = new Set([capabilitySearchName, capabilityDescribeName])
const core = new Set([...bridges, 'life_read_tool_observation', 'life_list_learned_procedures', 'life_use_learned_procedure'])

function catalog(tools: Tool[], registry: ToolRegistry) {
  const active = new Map(registry.list().filter(entry => registry.resolveActive(entry.capabilityId)).map(entry => [entry.providerToolName, entry]))
  return tools.filter(item => active.has(item.function.name) && !bridges.has(item.function.name))
    .map((item) => {
      const registration = active.get(item.function.name)!
      // A registry version/policy change also invalidates an old description,
      // even while this turn still holds its originally prepared tool object.
      const schemaHash = executionDigest({ interface: item.function, capabilityId: registration.capabilityId, version: registration.version, inputSchema: registration.inputSchema, permissions: registration.permissions, risk: registration.risk, effects: registration.effects })
      const vocabulary = capabilitySearchVocabulary(registration.capabilityId)
      return { name: item.function.name, description: [item.function.description ?? '', vocabulary].filter(Boolean).join('\n'), parameters: item.function.parameters, schemaHash }
    })
}

/** Rebuilt from live executable interfaces. Describing never grants permission. */
export function createCapabilityDiscoveryTools(getTools: () => Tool[], registry: ToolRegistry) {
  return [
    tool({
      name: capabilitySearchName,
      description: 'Find available operations by short precise keywords or exact tool name. Up to three matching live interfaces become callable on your next step. Returns metadata only; operations still need ordinary admission. Use life_describe_capabilities for other exact names. An empty result means no matching operation. Avoid long natural-language queries.',
      parameters: z.object({ query: z.string().min(1).max(256), limit: z.number().int().min(1).max(10).optional() }).strict(),
      execute: async ({ query, limit }) => ({ type: 'life-capability-search', tools: searchHermesCatalog(catalog(getTools(), registry), query, limit).map(entry => ({ name: entry.name, description: entry.description.slice(0, 200), schemaHash: entry.schemaHash })) }),
    }),
    tool({
      name: capabilityDescribeName,
      description: 'Load one to three exact live operation interfaces found with life_search_capabilities. The operations become callable on the next step. This reads metadata only; ordinary authorization, risk policy, cancellation and independent verification still apply when an operation is invoked.',
      parameters: z.object({ names: z.array(z.string().min(1).max(128)).min(1).max(3) }).strict(),
      execute: async ({ names }) => {
        if (new Set(names).size !== names.length)
          throw new Error('Capability description contains duplicate names')
        const live = catalog(getTools(), registry)
        const described = names.map((name) => {
          const entry = live.find(item => item.name === name)
          if (!entry)
            throw new Error(`Capability ${name} is unavailable`)
          return entry
        })
        if (Buffer.byteLength(JSON.stringify(described)) > 24_000)
          throw new Error('Capability descriptions exceed the page budget; request fewer interfaces')
        return { type: 'life-capability-descriptions', tools: described }
      },
    }),
  ]
}

/** A projection of settled action receipts; never trust a model-authored system block. */
export function discloseCapabilities(input: {
  tools: Tool[] | undefined
  registry: ToolRegistry
  messages: Message[]
  actions: Record<string, AlicizationActionRuntimeState>
}) {
  const tools = input.tools
  const bytes = (value: Tool[] | undefined) => Buffer.byteLength(JSON.stringify(value?.map(item => ({ type: item.type, function: item.function })) ?? []))
  const beforeBytes = bytes(tools)
  if (!tools || tools.length <= 16 || beforeBytes <= 12_000 || ![...bridges].every(name => tools.some(item => item.function.name === name)))
    return { tools, report: null }
  const currentUser = input.messages.findLastIndex(message => message.role === 'user')
  const query = input.messages[currentUser]?.content
  const userText = typeof query === 'string' ? query : ''
  const live = catalog(tools, input.registry)
  const selected = new Set(core)
  // Small automatic shortlist avoids two discovery turns for common actions.
  const ranked = selectSkills(userText, live.map((entry, id) => ({ id, name: entry.name, shortDescription: '', description: entry.description })), 4)
  for (const item of ranked)
    selected.add(live[item.id]!.name)
  for (const entry of live) {
    if (userText.includes(entry.name))
      selected.add(entry.name)
  }
  const calls = new Map<string, string>()
  for (const message of input.messages.slice(currentUser + 1)) {
    if (message.role === 'assistant') {
      for (const call of message.tool_calls ?? []) {
        if (call.id && call.function.name)
          calls.set(call.id, call.function.name)
      }
    }
  }
  const described = new Set<string>()
  for (const action of Object.values(input.actions).sort((a, b) => a.lastSequence - b.lastSequence)) {
    if (action.status !== 'completed' || action.lastObservation?.outcome !== 'success' || !action.lastObservation.terminal || action.lastObservation.observationId !== action.terminalObservationId || action.lastObservation.toolCallId !== action.toolCallId || !action.toolCallId)
      continue
    const operation = calls.get(action.toolCallId)
    const output = action.lastObservation.output as { type?: unknown, tools?: unknown } | undefined
    const expected = operation === capabilitySearchName ? 'life-capability-search' : operation === capabilityDescribeName ? 'life-capability-descriptions' : null
    if (!expected || output?.type !== expected || !Array.isArray(output.tools))
      continue
    for (const item of output.tools.slice(0, 3)) {
      if (item && typeof item === 'object' && live.some(entry => entry.name === item.name && entry.schemaHash === item.schemaHash)) {
        described.delete(item.name)
        described.add(item.name)
      }
    }
  }
  // Retain the most recent descriptions; older ones remain discoverable.
  for (const name of [...described].slice(-6))
    selected.add(name)
  const projected = tools.filter(item => selected.has(item.function.name))
  const afterBytes = bytes(projected)
  if (afterBytes >= beforeBytes)
    return { tools, report: null }
  return { tools: projected, report: { available: tools.length, offered: projected.length, beforeBytes, afterBytes, described: [...described].slice(-6) } }
}
