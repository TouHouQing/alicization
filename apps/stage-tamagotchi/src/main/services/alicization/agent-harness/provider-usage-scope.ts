import { AsyncLocalStorage } from 'node:async_hooks'

interface ProviderUsageScope { cardId: string, turnId: string, rootTurnId: string, requestId?: string }
const scopes = new AsyncLocalStorage<ProviderUsageScope>()

export const currentProviderUsageScope = () => scopes.getStore()
export const withProviderUsageScope = <T>(scope: ProviderUsageScope, task: () => Promise<T>) => scopes.run(scope, task)
