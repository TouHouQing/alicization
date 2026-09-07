import { describe, expect, it, vi } from 'vitest'

import {
  electronAlicizationGetSensorySnapshot,
  electronAlicizationKillSwitchGetState,
} from '../../../shared/eventa'
import { registerAlicizationSoulStateInvokeHandlers } from './runtime-invoke-handlers-soul-state'

function registerForTest() {
  const registerInvokeHandler = vi.fn()
  const scopeCalls: Array<{
    cardId: unknown
    options: Record<string, unknown> | undefined
  }> = []
  const withCardScope = async <T>(
    cardId: unknown,
    task: () => Promise<T>,
    options?: Record<string, unknown>,
  ) => {
    scopeCalls.push({ cardId, options })
    return await task()
  }

  registerAlicizationSoulStateInvokeHandlers({
    registerInvokeHandler,
    withCardScope,
    cardIdFrom: scope => scope?.cardId ?? 'card-active',
    bootstrap: vi.fn(async () => ({}) as any),
    getSoulSnapshot: () => ({}) as any,
    getWatching: () => false,
    initializeGenesis: vi.fn(async () => ({})),
    queueSoulMutation: vi.fn(async mutation => await mutation({}) as any),
    parseSoul: () => ({ frontmatter: {} as any, body: '' }),
    extractPersonaNotesFromBody: () => '',
    buildSoulBody: () => '',
    toSoulContent: () => '',
    snapshotFromContent: content => ({ content }) as any,
    clamp01: value => value,
    getScopedKillSwitchSnapshot: () => ({ state: 'ACTIVE' }),
    suspendKillSwitch: vi.fn(async () => ({ state: 'SUSPENDED' })),
    resumeKillSwitch: vi.fn(async () => ({ state: 'ACTIVE' })),
    sensoryBus: {
      getSnapshot: () => ({
        stale: false,
        running: false,
        sample: {
          collectedAt: 1,
        },
      }) as any,
      refreshNow: vi.fn(async () => {}),
    },
    isAlicizationKillSwitchSuspended: () => false,
    appendAuditLog: vi.fn(async () => {}),
    rememberPerceptionObservation: vi.fn(async () => {}),
    getActiveCardId: () => 'card-active',
    ensureVisualPresenceState: vi.fn(async () => ({})),
    getScreenCaptureDiagnosticsForWebContentsId: () => null,
  })

  const handlerFor = (channel: unknown) => {
    const registration = registerInvokeHandler.mock.calls.find(([registeredChannel]) => registeredChannel === channel)
    if (!registration)
      throw new Error('handler was not registered')
    return registration[1] as (...args: any[]) => Promise<unknown>
  }

  return {
    scopeCalls,
    killSwitchHandler: handlerFor(electronAlicizationKillSwitchGetState),
    sensoryHandler: handlerFor(electronAlicizationGetSensorySnapshot),
  }
}

describe('runtime soul-state invoke handlers', () => {
  it('lets the foreground kill-switch read bypass a running background card scope', async () => {
    const { killSwitchHandler, scopeCalls } = registerForTest()

    await killSwitchHandler({ cardId: 'card-active' })

    expect(scopeCalls.at(-1)).toMatchObject({
      cardId: 'card-active',
      options: {
        lane: 'foreground',
        skipQueueWhenScopeAlreadyActive: true,
      },
    })
  })

  it('lets the foreground sensory snapshot read bypass a running background card scope', async () => {
    const { sensoryHandler, scopeCalls } = registerForTest()

    await sensoryHandler({ cardId: 'card-active' }, undefined)

    expect(scopeCalls.at(-1)).toMatchObject({
      cardId: 'card-active',
      options: {
        lane: 'foreground',
        skipQueueWhenScopeAlreadyActive: true,
      },
    })
  })
})
