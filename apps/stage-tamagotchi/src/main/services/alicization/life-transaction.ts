import type { LifeMetaChange } from '../../../shared/life-contracts'

// These ports are created inside the existing writer's transaction. Repositories
// cannot enqueue work or begin transactions themselves.
import { AsyncLocalStorage } from 'node:async_hooks'

export interface LifeTransaction {
  cardId: string
  revision: number
  commitId: string
  now: number
  run: (sql: string, params?: unknown[]) => Promise<unknown>
  get: <T>(sql: string, params?: unknown[]) => Promise<T | undefined>
  all: <T>(sql: string, params?: unknown[]) => Promise<T[]>
  updateOwner: (change: LifeMetaChange) => Promise<void>
}

const transactionBrand: unique symbol = Symbol('life-transaction')
export interface LifeTransactionHandle { readonly [transactionBrand]: true }
const activeTransactions = new WeakMap<object, { handle: LifeTransactionHandle, afterCommit: Array<() => void> }>()
const transactionContext = new AsyncLocalStorage<{ database: object, handle: LifeTransactionHandle }>()

export async function withLifeTransactionHandle<T>(database: object, task: () => Promise<T>) {
  if (activeTransactions.has(database))
    throw new Error('Nested life transaction is not allowed')
  const handle: LifeTransactionHandle = { [transactionBrand]: true }
  const transaction = { handle, afterCommit: [] as Array<() => void> }
  activeTransactions.set(database, transaction)
  try {
    const result = await transactionContext.run({ database, handle }, task)
    for (const listener of transaction.afterCommit) {
      try { listener() }
      catch (error) { console.warn('[life-transaction] committed projection observer failed', error) }
    }
    return result
  }
  finally { activeTransactions.delete(database) }
}

export function activeLifeTransaction(database: object) {
  const context = transactionContext.getStore()
  if (!context || context.database !== database)
    return undefined
  const transaction = activeTransactions.get(database)
  if (!transaction)
    throw new Error('Life mutation requires an active writer transaction')
  return transaction.handle
}

export function assertLifeTransaction(database: object, handle: LifeTransactionHandle) {
  if (activeLifeTransaction(database) !== handle)
    throw new Error('Life transaction handle is stale or belongs to another connection')
}

export function afterLifeTransactionCommit(database: object, listener: () => void) {
  const transaction = activeTransactions.get(database)
  if (!transaction || activeLifeTransaction(database) !== transaction.handle)
    throw new Error('Commit observer requires an active transaction')
  transaction.afterCommit.push(listener)
}

export function assertLifeId(value: string) {
  if (typeof value !== 'string' || !value.trim() || value.length > 512)
    throw new TypeError('Life reference requires a bounded nonempty identifier')
}

export function assertLifeTime(value: number) {
  if (!Number.isSafeInteger(value) || value < 0)
    throw new TypeError('Life time must be a nonnegative safe epoch timestamp')
}

export function boundedJson(value: unknown) {
  const serialized = JSON.stringify(value)
  if (!serialized || serialized.length > 2_000_000)
    throw new TypeError('Life payload exceeds its storage budget')
  return serialized
}
