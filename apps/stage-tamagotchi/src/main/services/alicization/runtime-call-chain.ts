import { AsyncLocalStorage } from 'node:async_hooks'

import { errorMessageFrom } from '@moeru/std'

export interface AlicizationRuntimeCallFrameSnapshot {
  callId: string
  depth: number
  startedAt: number
  finishedAt: number
  durationMs: number
  status: 'completed' | 'failed'
  metadata: Record<string, unknown> | null
  errorMessage: string | null
}

export interface AlicizationRuntimeCallChainSnapshot {
  currentChain: string[]
  currentDepth: number
  history: AlicizationRuntimeCallFrameSnapshot[]
  maxDepth: number
  phaseOrder: string[]
}

interface AlicizationRuntimeCallChainOptions {
  getNow?: () => number
  maxDepth?: number
}

export class AlicizationRuntimeCircularCallError extends Error {
  readonly callId: string
  readonly chain: string[]

  constructor(callId: string, chain: string[]) {
    super(`Circular runtime call detected: ${[...chain, callId].join(' -> ')}`)
    this.name = 'AlicizationRuntimeCircularCallError'
    this.callId = callId
    this.chain = [...chain]
  }
}

export class AlicizationRuntimeCallChainTooDeepError extends Error {
  readonly callId: string
  readonly chain: string[]
  readonly maxDepth: number

  constructor(callId: string, chain: string[], maxDepth: number) {
    super(`Runtime call chain too deep (${chain.length} >= ${maxDepth}): ${[...chain, callId].join(' -> ')}`)
    this.name = 'AlicizationRuntimeCallChainTooDeepError'
    this.callId = callId
    this.chain = [...chain]
    this.maxDepth = maxDepth
  }
}

function sanitizeCallId(raw: unknown) {
  return typeof raw === 'string' ? raw.trim() : ''
}

function normalizeMetadata(raw?: Record<string, unknown>) {
  if (!raw)
    return null
  const entries = Object.entries(raw).filter(([, value]) => value !== undefined)
  if (entries.length === 0)
    return null
  return Object.fromEntries(entries)
}

export function createAlicizationRuntimeCallChain(options: AlicizationRuntimeCallChainOptions = {}) {
  const getNow = options.getNow ?? Date.now
  const maxDepth = Math.max(1, Math.floor(options.maxDepth ?? 12))
  const callChainStorage = new AsyncLocalStorage<string[]>()
  const history: AlicizationRuntimeCallFrameSnapshot[] = []
  const phaseOrder: string[] = []

  async function track<T>(
    rawCallId: string,
    task: () => Promise<T> | T,
    metadata?: Record<string, unknown>,
  ): Promise<T> {
    const callId = sanitizeCallId(rawCallId)
    if (!callId)
      return await task()

    const parentChain = callChainStorage.getStore() ?? []
    if (parentChain.includes(callId))
      throw new AlicizationRuntimeCircularCallError(callId, parentChain)
    if (parentChain.length >= maxDepth)
      throw new AlicizationRuntimeCallChainTooDeepError(callId, parentChain, maxDepth)

    const startedAt = getNow()
    const depth = parentChain.length
    if (!phaseOrder.includes(callId))
      phaseOrder.push(callId)
    const currentChain = [...parentChain, callId]

    return await callChainStorage.run(currentChain, async () => {
      try {
        const value = await task()
        const finishedAt = getNow()
        history.push({
          callId,
          depth,
          startedAt,
          finishedAt,
          durationMs: Math.max(0, finishedAt - startedAt),
          status: 'completed',
          metadata: normalizeMetadata(metadata),
          errorMessage: null,
        })
        return value
      }
      catch (error) {
        const finishedAt = getNow()
        history.push({
          callId,
          depth,
          startedAt,
          finishedAt,
          durationMs: Math.max(0, finishedAt - startedAt),
          status: 'failed',
          metadata: normalizeMetadata(metadata),
          errorMessage: errorMessageFrom(error) ?? 'unknown-runtime-call-error',
        })
        throw error
      }
    })
  }

  function snapshot(): AlicizationRuntimeCallChainSnapshot {
    const currentChain = callChainStorage.getStore() ?? []
    return {
      currentChain: [...currentChain],
      currentDepth: currentChain.length,
      history: history.map(frame => ({
        ...frame,
        metadata: frame.metadata ? { ...frame.metadata } : null,
      })),
      maxDepth,
      phaseOrder: [...phaseOrder],
    }
  }

  return {
    snapshot,
    track,
  }
}
