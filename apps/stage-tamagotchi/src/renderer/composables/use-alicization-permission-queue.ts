import type { AlicizationSafetyPermissionClosed, AlicizationSafetyPermissionDecision, AlicizationSafetyPermissionRequest } from '../../shared/eventa'

import { computed, onScopeDispose, ref } from 'vue'

/** The main process decides permission; the renderer owns only its live display. */
export function useAlicizationPermissionQueue(options: {
  isCurrentCard: (cardId: string) => boolean
  resolve: (decision: AlicizationSafetyPermissionDecision) => Promise<unknown>
}) {
  const current = ref<AlicizationSafetyPermissionRequest | null>(null)
  const pending = ref<AlicizationSafetyPermissionRequest[]>([])
  const resolvingToken = ref<string | null>(null)
  const timers = new Map<string, ReturnType<typeof setTimeout>>()
  const resolving = computed(() => Boolean(current.value && resolvingToken.value === current.value.token))

  function next() {
    if (current.value)
      return
    current.value = pending.value.shift() ?? null
  }

  function close(input: Pick<AlicizationSafetyPermissionClosed, 'cardId' | 'token' | 'requestId'>) {
    const matches = (request: AlicizationSafetyPermissionRequest) => request.cardId === input.cardId && request.token === input.token && request.requestId === input.requestId
    clearTimeout(timers.get(input.token))
    timers.delete(input.token)
    pending.value = pending.value.filter(request => !matches(request))
    if (current.value && matches(current.value))
      current.value = null
    next()
  }

  function push(request: AlicizationSafetyPermissionRequest) {
    const remaining = request.createdAt + request.timeoutMs - Date.now()
    if (!options.isCurrentCard(request.cardId) || !Number.isFinite(remaining) || remaining <= 0 || timers.has(request.token))
      return
    timers.set(request.token, setTimeout(() => close(request), Math.min(remaining, 2_147_483_647)))
    pending.value.push(request)
    next()
  }

  async function decide(input: { allow: boolean, rememberSession: boolean }) {
    const request = current.value
    if (!request || resolving.value)
      return
    resolvingToken.value = request.token
    try {
      await options.resolve({ cardId: request.cardId, token: request.token, requestId: request.requestId, allow: input.allow, rememberSession: input.allow && request.supportsRememberSession && input.rememberSession, reason: input.allow ? 'user-approved' : 'user-denied' })
    }
    finally {
      if (resolvingToken.value === request.token)
        resolvingToken.value = null
      close(request)
    }
  }

  function clear() {
    for (const timer of timers.values())
      clearTimeout(timer)
    timers.clear()
    current.value = null
    pending.value = []
    resolvingToken.value = null
  }

  onScopeDispose(clear)
  return { current, pending, resolving, push, close, decide, clear }
}
