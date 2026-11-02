import type { Message } from '@xsai/shared-chat'

import { Buffer } from 'node:buffer'
import { createHash } from 'node:crypto'

import { compactLifeHistoricalMemory } from './life-historical-memory-compaction'

export interface LifeProviderBudgetReport {
  estimator: 'utf8-decoded-content-upper-bound-v2'
  contextTokens: number
  outputReserve: number
  safetyReserve: number
  toolTokens: number
  beforeTokens: number
  afterTokens: number
  outputReserveReduction?: { requested: number, minimum: number, selected: number }
  droppedHistory: Array<{ index: number, hash: string }>
  compactedHistoricalMemory?: Array<{ index: number, sourceHash: string, omittedTurnIds: string[] }>
  deduplicatedHistoricalMemory?: Array<{ index: number, sourceHash: string, dictionaryEntries: number, references: number, savedBytes: number }>
}

export interface LifeProviderRequestLimits {
  contextTokens: number
  outputReserve: number
  completionTokenField: 'maxTokens' | 'maxCompletionTokens'
  contextSource: 'configured' | 'unknown-conservative-default'
}

export function resolveLifeProviderRequestLimits(config: Record<string, unknown> = {}): LifeProviderRequestLimits {
  const context = config.contextWindowTokens ?? config.contextLength
  const output = config.maxOutputTokens
  const tokenField = config.completionTokenField ?? 'maxTokens'
  if (context !== undefined && (!Number.isSafeInteger(context) || Number(context) < 2048 || Number(context) > 2_000_000))
    throw new TypeError('Invalid configured model context window')
  if (output !== undefined && (!Number.isSafeInteger(output) || Number(output) < 256 || Number(output) > 65536))
    throw new TypeError('Invalid configured model output limit')
  if (!['maxTokens', 'maxCompletionTokens'].includes(String(tokenField)))
    throw new TypeError('Invalid completion token limit field')
  const contextTokens = context === undefined ? 65536 : Number(context)
  const outputReserve = output === undefined ? Math.min(4096, Math.floor(contextTokens / 4)) : Number(output)
  if (contextTokens <= outputReserve + 1024)
    throw new TypeError('Configured context must fit the output and safety reserve')
  return { contextTokens, outputReserve, completionTokenField: tokenField as LifeProviderRequestLimits['completionTokenField'], contextSource: context === undefined ? 'unknown-conservative-default' : 'configured' }
}

export function lifeProviderOutputOptions(limits: LifeProviderRequestLimits) {
  // xsAI serializes camelCase unknown options into the provider request. Use
  // exactly one configured field so OpenAI reasoning routes can select the
  // completion limit while other compatible providers use max_tokens.
  return limits.completionTokenField === 'maxCompletionTokens'
    ? { maxCompletionTokens: limits.outputReserve, maxTokens: undefined }
    : { maxTokens: limits.outputReserve, maxCompletionTokens: undefined }
}

// Unknown provider tokenizers use a conservative byte upper bound, including
// message framing, schemas, images and tool-call arguments. Never cut a request
// or a JSON fact block in the middle to make a generation appear successful.
export function boundLifeProviderRequest(messages: Message[], tools: unknown, options: { contextTokens?: number, outputReserve?: number, safetyReserve?: number, compactHistoricalDialogue?: boolean, allowOutputReserveReduction?: boolean } = {}) {
  const contextTokens = options.contextTokens ?? 65536
  const outputReserve = options.outputReserve ?? 4096
  const safetyReserve = options.safetyReserve ?? 1024
  if (![contextTokens, outputReserve, safetyReserve].every(value => Number.isSafeInteger(value) && value > 0) || contextTokens <= outputReserve + safetyReserve)
    throw new TypeError('Invalid provider context budget')
  const serializedCost = (value: unknown) => Buffer.byteLength(JSON.stringify(value) ?? '', 'utf8')
  const messageCost = (message: Message) => {
    if (typeof message.content !== 'string')
      return Math.max(64, serializedCost(message))
    const { content, ...metadata } = message
    // The provider decodes the outer JSON before tokenizing message text.
    // Keep inner fact JSON intact, and reserve framing plus all tool metadata.
    return Buffer.byteLength(content, 'utf8') + Math.max(64, serializedCost(metadata))
  }
  const cost = (items: Message[]) => 2 + items.reduce((total, message) => total + messageCost(message) + 1, 0)
  const toolTokens = serializedCost(tools ?? [])
  let budget = contextTokens - outputReserve - safetyReserve - toolTokens
  const report: LifeProviderBudgetReport = { estimator: 'utf8-decoded-content-upper-bound-v2', contextTokens, outputReserve, safetyReserve, toolTokens, beforeTokens: cost(messages), afterTokens: 0, droppedHistory: [] }
  const latestUser = messages.findLastIndex(message => message.role === 'user')
  if (latestUser < 0)
    throw new Error('Provider context has no current user request')
  const retained = messages.map((message, index) => ({ message, index }))
  while (cost(retained.map(item => item.message)) > budget) {
    // Keep identity, life state and the complete current tool exchange. Remove
    // only earlier conversation groups so tool results never lose their calls.
    const first = retained.findIndex(item => item.message.role === 'user' && item.index < latestUser)
    if (first < 0)
      break
    let end = first + 1
    while (end < retained.length && retained[end].message.role !== 'user') end++
    const group = retained.slice(first, end).filter(item => item.message.role !== 'system')
    const ids = new Set(group.map(item => item.index))
    for (const item of group)
      report.droppedHistory.push({ index: item.index, hash: createHash('sha256').update(JSON.stringify(item.message)).digest('hex') })
    for (let index = retained.length - 1; index >= 0; index--) {
      if (ids.has(retained[index].index))
        retained.splice(index, 1)
    }
  }
  if (options.compactHistoricalDialogue && cost(retained.map(item => item.message)) > budget) {
    for (const item of retained) {
      if (item.message.role !== 'system' || typeof item.message.content !== 'string')
        continue
      let envelope: { type?: string, data?: { workingMemory?: { version?: string, owner?: string, recentDialogue?: Array<{ turnId?: string }> } } }
      try {
        envelope = JSON.parse(item.message.content)
      }
      catch {
        continue
      }
      const memory = envelope?.data?.workingMemory
      if (envelope?.type !== 'alicization-turn-memory-context' || memory?.owner !== 'working-memory' || memory.version !== 'working-memory-owner-context-v1' || !Array.isArray(memory.recentDialogue) || !memory.recentDialogue.length)
        continue
      const sourceHash = createHash('sha256').update(item.message.content).digest('hex')
      const omittedTurnIds = memory.recentDialogue.map(turn => turn?.turnId).filter((id): id is string => typeof id === 'string')
      // This is a redundant projection of past dialogue, never the current
      // request, identity, corrections, emotional posture or retrieval proof.
      memory.recentDialogue = []
      item.message = { ...item.message, content: JSON.stringify(envelope) }
      ;(report.compactedHistoricalMemory ??= []).push({ index: item.index, sourceHash, omittedTurnIds })
      if (cost(retained.map(item => item.message)) <= budget)
        break
    }
  }
  // Exact historical text interning preserves every fact and source. Ordinary
  // dialogue can use it without granting permission to omit recent dialogue.
  if (cost(retained.map(item => item.message)) > budget) {
    for (const item of retained) {
      if (item.message.role !== 'system' || typeof item.message.content !== 'string')
        continue
      const compacted = compactLifeHistoricalMemory(item.message.content)
      if (!compacted)
        continue
      const sourceHash = createHash('sha256').update(item.message.content).digest('hex')
      item.message = { ...item.message, content: compacted.content }
      ;(report.deduplicatedHistoricalMemory ??= []).push({ index: item.index, sourceHash, dictionaryEntries: compacted.dictionaryEntries, references: compacted.references, savedBytes: compacted.savedBytes })
      if (cost(retained.map(item => item.message)) <= budget)
        break
    }
  }
  const result = retained.map(item => item.message)
  report.afterTokens = cost(result)
  if (report.afterTokens > budget && options.allowOutputReserveReduction) {
    // Keep required context and the safety reserve. The returned allocation
    // must also become the actual provider output cap, never just an estimate.
    const minimum = Math.min(2048, outputReserve)
    const selected = contextTokens - safetyReserve - toolTokens - report.afterTokens
    if (selected >= minimum && selected < outputReserve) {
      report.outputReserve = selected
      report.outputReserveReduction = { requested: outputReserve, minimum, selected }
      budget = contextTokens - selected - safetyReserve - toolTokens
    }
  }
  if (report.afterTokens > budget) {
    const requiredCosts = retained.map(item => `${['system', 'assistant', 'user', 'tool'].includes(item.message.role) ? item.message.role : 'other'}#${item.index}=${messageCost(item.message)}`).join(',')
    // Sizes identify the overgrown owner without logging its private content.
    throw new Error(`PROVIDER_CONTEXT_BUDGET_EXCEEDED: identity, current request and required evidence do not fit; budget=${budget}, required=${report.afterTokens}, tools=${toolTokens}, messages=[${requiredCosts}]`)
  }
  return { messages: result, report }
}

/** Couple the accepted context plan to the exact output cap sent on the wire. */
export function planLifeProviderRequest(messages: Message[], tools: unknown, limits: LifeProviderRequestLimits, options: { compactHistoricalDialogue?: boolean, allowOutputReserveReduction?: boolean } = {}) {
  const request = boundLifeProviderRequest(messages, tools, { ...limits, ...options })
  return { ...request, providerBudget: { ...limits, outputReserve: request.report.outputReserve } }
}
