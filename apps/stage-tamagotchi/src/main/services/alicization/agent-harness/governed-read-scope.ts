import { AsyncLocalStorage } from 'node:async_hooks'

interface GovernedReadScope {
  owner: { cardId: string, turnId: string, actionId: string, conversationId: string }
  signal: AbortSignal
  effectRefs: string[]
  callTool: (name: string, parameters: unknown, signal: AbortSignal) => Promise<unknown>
}

const scopes = new AsyncLocalStorage<GovernedReadScope>()

export const withGovernedReadScope = <T>(scope: GovernedReadScope, task: () => T | Promise<T>) => scopes.run(scope, async () => task())

export function governedReadScope() {
  const scope = scopes.getStore()
  if (!scope)
    throw new Error('Program execution requires the owning life turn')
  scope.signal.throwIfAborted()
  return scope
}
