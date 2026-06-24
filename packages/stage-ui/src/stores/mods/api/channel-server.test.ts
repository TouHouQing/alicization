import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

type EventHandler = (event: any) => void | Promise<void>

const mocks = vi.hoisted(() => {
  class MockClient {
    static instances: MockClient[] = []

    readonly listeners = new Map<string, Set<EventHandler>>()
    readonly send = vi.fn()
    readonly close = vi.fn()

    constructor(readonly options: any) {
      MockClient.instances.push(this)
    }

    onEvent(type: string, callback: EventHandler) {
      const listeners = this.listeners.get(type) ?? new Set<EventHandler>()
      listeners.add(callback)
      this.listeners.set(type, listeners)
    }

    offEvent(type: string, callback: EventHandler) {
      this.listeners.get(type)?.delete(callback)
    }

    emit(type: string, event: any) {
      for (const listener of this.listeners.get(type) ?? []) {
        void listener(event)
      }
    }
  }

  return {
    MockClient,
    resetClients: () => {
      MockClient.instances.length = 0
    },
    lastClient: () => MockClient.instances.at(-1),
  }
})

vi.mock('@proj-alicization/server-sdk', () => ({
  Client: mocks.MockClient,
  WebSocketEventSource: {
    StageTamagotchi: 'stage-tamagotchi',
    StageWeb: 'stage-web',
  },
}))

vi.mock('@proj-alicization/stage-shared', () => ({
  isStageTamagotchi: () => true,
  isStageWeb: () => false,
}))

vi.mock('@vueuse/core', async () => {
  const { ref } = await import('vue')

  return {
    useLocalStorage: (_key: string, defaultValue: string) => ref(defaultValue),
  }
})

vi.mock('../../devtools/websocket-inspector', () => ({
  useWebSocketInspectorStore: () => ({
    add: vi.fn(),
  }),
}))

const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

describe('mods server channel connection logging', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mocks.resetClients()
    consoleWarnSpy.mockClear()
    consoleLogSpy.mockClear()
  })

  it('keeps normal startup retries quiet before the first authenticated connection', async () => {
    const { useModsServerChannelStore } = await import('./channel-server')
    const store = useModsServerChannelStore()

    void store.initialize()

    const client = mocks.lastClient()
    expect(client).toBeTruthy()

    client?.options.onError(new Error('ECONNREFUSED'))
    client?.options.onClose()

    expect(consoleWarnSpy).not.toHaveBeenCalled()
  })

  it('warns after an authenticated connection has already become part of the life loop', async () => {
    const { useModsServerChannelStore } = await import('./channel-server')
    const store = useModsServerChannelStore()

    const initialized = store.initialize()
    const client = mocks.lastClient()
    expect(client).toBeTruthy()

    client?.emit('module:authenticated', {
      data: {
        authenticated: true,
      },
    })
    await initialized

    const error = new Error('WebSocket error')
    client?.options.onError(error)
    client?.options.onClose()

    expect(consoleWarnSpy).toHaveBeenCalledWith('WebSocket server connection error:', error)
    expect(consoleWarnSpy).toHaveBeenCalledWith('WebSocket server connection closed')
  })
})
