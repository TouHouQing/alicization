import type { Tool } from '@xsai/shared-chat'

import type { AlicizationDbService } from '../db'
import type { ToolRegistry } from '../turn-os/tool-registry'

import { createHash, randomUUID } from 'node:crypto'
import { mkdir, open, realpath } from 'node:fs/promises'
import { isAbsolute, join, relative } from 'node:path'

import * as v from 'valibot'

import { completeOwnedRead, markOwnedReadStopped } from '../execution/owned-read-stop'
import { piExtensionProgram } from '../third-party/pi-extension-program'
import { openExtensionCheckpoint } from './extension-checkpoint'
import { governedReadScope } from './governed-read-scope'
import { runIsolatedProgram } from './isolated-program'

const id = v.pipe(v.string(), v.regex(/^[a-z][a-z0-9-]{0,31}$/u))
const configSchema = v.pipe(v.array(v.strictObject({ id, file: v.pipe(v.string(), v.minLength(1), v.maxLength(128)), sha256: v.pipe(v.string(), v.regex(/^[a-f\d]{64}$/u)), enabled: v.boolean(), readTools: v.pipe(v.array(v.pipe(v.string(), v.minLength(1), v.maxLength(128))), v.maxLength(8)) })), v.maxLength(32))
const definitionsSchema = v.strictObject({ tools: v.pipe(v.array(v.strictObject({ name: v.pipe(v.string(), v.regex(/^[a-z][a-z0-9_]{0,47}$/u)), label: v.pipe(v.string(), v.maxLength(128)), description: v.pipe(v.string(), v.maxLength(4000)), parameters: v.record(v.string(), v.unknown()) })), v.maxLength(16)), events: v.array(v.string()) })
type Configuration = v.InferOutput<typeof configSchema>[number]
interface Loaded { config: Configuration, source: string, capabilities: string[], tools: Tool[], events: string[] }

async function boundedSource(path: string, maximumBytes: number, preserveBom = false) {
  const file = await open(path, 'r')
  try {
    const stat = await file.stat()
    if (!stat.isFile() || stat.size > maximumBytes)
      throw new Error('Extension file exceeded its regular-file byte budget')
    const buffer = new Uint8Array(maximumBytes + 1)
    let bytesRead = 0
    while (bytesRead < buffer.length) {
      const part = await file.read(buffer, bytesRead, buffer.length - bytesRead, bytesRead)
      if (!part.bytesRead)
        break
      bytesRead += part.bytesRead
    }
    if (bytesRead > maximumBytes)
      throw new Error('Extension file grew beyond its byte budget')
    return new TextDecoder('utf-8', { fatal: true, ignoreBOM: preserveBom }).decode(buffer.subarray(0, bytesRead))
  }
  finally { await file.close() }
}

/** Pi tool/event compatibility in WASM; installation never grants OS access. */
export function createPiExtensionRuntime(options: { directory: string, cardId: string, registry: ToolRegistry, database: AlicizationDbService }) {
  let loaded: Loaded[] = []
  let diagnostics: Array<{ id: string, error: string }> = []
  let refreshTail: Promise<unknown> = Promise.resolve()
  async function configurations() {
    await mkdir(options.directory, { recursive: true })
    try {
      const bytes = await boundedSource(join(options.directory, 'extensions.json'), 32000)
      if (bytes.length > 32000)
        throw new Error('Extension configuration exceeded its byte budget')
      const config = v.parse(configSchema, JSON.parse(bytes))
      if (new Set(config.map(item => item.id)).size !== config.length)
        throw new Error('Extension identifiers must be unique')
      return config
    }
    catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT')
        return []
      throw error
    }
  }
  async function source(config: Configuration) {
    const root = await realpath(options.directory)
    const path = await realpath(join(root, config.file))
    const part = relative(root, path)
    if (isAbsolute(part) || part === '..' || part.startsWith('../') || part.startsWith('..\\') || !/\.[cm]?js$/u.test(path))
      throw new Error('Extension source crossed its installation root')
    const text = await boundedSource(path, 100000, true)
    if (text.length > 100000 || createHash('sha256').update(text).digest('hex') !== config.sha256)
      throw new Error('Extension source changed; its exact new hash must be enabled')
    return text
  }
  async function check(item: Loaded) {
    const config = (await configurations()).find(config => config.id === item.config.id)
    if (!config?.enabled || JSON.stringify(config) !== JSON.stringify(item.config) || await source(config) !== item.source)
      throw new Error('Extension was revoked or changed after this turn was prepared')
  }
  async function refresh() {
    const work = refreshTail.then(async () => {
      let configs: Configuration[]
      const issues: typeof diagnostics = []
      try {
        configs = await configurations()
      }
      catch (error) {
        configs = []
        issues.push({ id: 'configuration', error: String(error) })
      }
      const next: Loaded[] = []
      for (const config of configs.filter(config => config.enabled)) {
        try {
          const text = await source(config)
          const cached = loaded.find(item => JSON.stringify(item.config) === JSON.stringify(config) && item.source === text)
          if (cached) {
            next.push(cached)
            continue
          }
          const compiled = piExtensionProgram(text)
          const discovered = await runIsolatedProgram({ code: compiled, input: { mode: 'discover' }, signal: new AbortController().signal, maximumCalls: 0, maximumSourceChars: 128000, callTool: async () => {
            throw new Error('Extension discovery cannot execute tools')
          } })
          const definitions = v.parse(definitionsSchema, discovered.result)
          const item: Loaded = { config, source: text, capabilities: [], tools: [], events: definitions.events }
          for (const definition of definitions.tools) {
            const capabilityId = `extension.${config.id}.${definition.name}`
            // IDs exclude underscores, so preserving hyphens keeps namespace boundaries distinct.
            const fullName = `ext_${config.id}_${definition.name}`
            // Preserve canonical IDs while fitting portable provider names.
            const name = fullName.length <= 64 ? fullName : `${fullName.slice(0, 51)}_${createHash('sha256').update(fullName).digest('hex').slice(0, 12)}`
            const manifest = { capabilityId, kind: 'tool' as const, version: config.sha256, description: definition.description, inputSchema: definition.parameters, outputSchema: { type: 'object', additionalProperties: true }, scope: 'card' as const, permissions: ['workspace.read'], risk: 'low' as const, executionChannel: 'extension-isolate', timeoutMs: 35000, supportsProgress: false, supportsCancellation: true, idempotency: 'best-effort' as const, evaluationStatus: 'passed' as const, activationStatus: 'active' as const, providerToolName: name, adapterToolName: name }
            options.registry.replace(manifest)
            item.capabilities.push(capabilityId)
            item.tools.push({ type: 'function', function: { name, description: definition.description, parameters: definition.parameters }, execute: (parameters, executeOptions) => completeOwnedRead(async () => {
              await check(item)
              const current = options.registry.resolveActive(capabilityId)
              if (current?.version !== config.sha256)
                throw new Error('Extension no longer has its prepared interface')
              const scope = governedReadScope()
              if (scope.owner.cardId !== options.cardId)
                throw new Error('Extension action crossed its life owner')
              const callId = executeOptions?.toolCallId ?? randomUUID()
              const checkpoint = await openExtensionCheckpoint(options.database, { ...scope.owner, capabilityId, extensionId: config.id, extensionVersion: config.sha256, callId, parametersHash: createHash('sha256').update(JSON.stringify(parameters)).digest('hex') }, async () => {
                const page = await options.database.readRecentAgentEntries(`agent-extension-entry:${config.id}`, 32)
                if (page.cardId !== options.cardId)
                  throw new Error('Extension journal crossed its life owner')
                const entries = []
                let bytes = 0
                for (const entry of [...page.entries].reverse()) {
                  const value = { type: 'custom', ...entry.payload }
                  const cost = new TextEncoder().encode(JSON.stringify(value)).byteLength
                  if (bytes + cost > 48000)
                    break
                  bytes += cost
                  entries.unshift(value)
                }
                return { mode: 'execute', name: definition.name, arguments: parameters, callId, entries, sessionId: scope.owner.conversationId }
              })
              if (checkpoint.completed !== undefined)
                return markOwnedReadStopped(checkpoint.completed)
              const output = await runIsolatedProgram({ code: compiled, input: checkpoint.input, signal: scope.signal, maximumSourceChars: 128000, callTool: async (name, input, signal) => {
                if (!config.readTools.includes(name))
                  throw new Error('Extension did not declare this read capability')
                await check(item)
                return scope.callTool(name, input, signal)
              } })
              await check(item)
              const value = output.result as { blocked?: boolean, reason?: string, result?: unknown, entries?: Array<{ customType: string, data: unknown }> }
              const failed = value.blocked || Boolean(value.result && typeof value.result === 'object' && 'isError' in value.result && value.result.isError === true)
              const result = { ok: !failed, finalStatus: failed ? 'failed' : 'completed', operation: 'extension_isolate', type: 'life-extension-result', ...(failed ? { status: 'failed', errorCode: value.blocked ? 'EXTENSION_BLOCKED' : 'EXTENSION_TOOL_FAILED', errorMessage: value.reason } : {}), extensionId: config.id, extensionVersion: config.sha256, checkpointId: checkpoint.id, result: value.result, readEffectRefs: [...scope.effectRefs] }
              scope.signal.throwIfAborted()
              await checkpoint.commit(value.entries ?? [], result)
              return markOwnedReadStopped(result)
            }) })
          }
          next.push(item)
        }
        catch (error) { issues.push({ id: config.id, error: error instanceof Error ? error.message : String(error) }) }
      }
      const active = new Set(next.flatMap(item => item.capabilities))
      for (const manifest of options.registry.list()) {
        if (manifest.executionChannel === 'extension-isolate' && !active.has(manifest.capabilityId))
          options.registry.setActivationStatus(manifest.capabilityId, 'revoked')
      }
      loaded = next
      diagnostics = issues
      return options.registry
    })
    refreshTail = work.catch(() => {})
    return work
  }
  return { refresh, tools: () => loaded.flatMap(item => item.tools), diagnostics: () => [...diagnostics], async beforeToolCall(event: { toolName: string, toolCallId: string, input: unknown }, signal: AbortSignal) {
    const aliases: Record<string, string> = { cli: 'bash', filesystem_read_file: 'read', filesystem_write_file: 'write', filesystem_edit_file: 'edit', filesystem_list_directory: 'ls', filesystem_search_files: 'find' }
    for (const item of loaded.filter(item => item.events.includes('tool_call') && !item.tools.some(tool => tool.function.name === event.toolName))) {
      signal.throwIfAborted()
      await check(item)
      const output = await runIsolatedProgram({ code: piExtensionProgram(item.source), input: { mode: 'event', event: { type: 'tool_call', ...event, providerToolName: event.toolName, toolName: aliases[event.toolName] ?? event.toolName } }, signal, maximumCalls: 0, maximumSourceChars: 128000, callTool: async () => {
        throw new Error('Global extension hooks cannot execute tools')
      } })
      const value = output.result as { result?: { block?: boolean, reason?: string } }
      if (value.result?.block)
        return { extensionId: item.config.id, version: item.config.sha256, reason: String(value.result.reason ?? 'Blocked by extension').slice(0, 512) }
    }
    return null
  } }
}
