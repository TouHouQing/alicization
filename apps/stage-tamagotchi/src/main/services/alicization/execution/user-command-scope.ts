import type { AlicizationMainGatewayWorkCoordinator } from '../main-gateway-work-coordinator'

/** Explicit host controls preempt background deliberation before waiting for its card scope. */
export function createExecutionUserCommandScope(options: {
  coordinator: AlicizationMainGatewayWorkCoordinator
  scope: <T>(cardId: string, task: () => Promise<T>, options: { lane: 'foreground', label: string, skipQueueWhenScopeAlreadyActive: boolean }) => Promise<T>
  settled: () => void
  entered?: () => void
}) {
  return async <T>(cardId: string, task: () => Promise<T>) => {
    const foreground = options.coordinator.openForeground({ turnId: `execution-control:${cardId}` })
    try {
      options.entered?.()
      return await options.scope(cardId, task, { lane: 'foreground', label: 'execution-user-control', skipQueueWhenScopeAlreadyActive: true })
    }
    finally {
      foreground.release()
      options.settled()
    }
  }
}
