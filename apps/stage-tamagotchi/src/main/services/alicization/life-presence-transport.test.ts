import { defineEventa } from '@moeru/eventa'
import { describe, expect, it, vi } from 'vitest'

import { createLifePresenceTransport } from './life-presence-transport'

describe('spontaneous body events to explicitly attached native stage routes', () => {
  it('shares identity with trusted utility windows while keeping body events on the stage', () => {
    const stageEmit = vi.fn()
    const editorEmit = vi.fn()
    const transport = createLifePresenceTransport(window => ({ context: { emit: window.id === 1 ? stageEmit : editorEmit }, dispose: vi.fn() }) as never)
    const window = (id: number) => ({ id, isDestroyed: () => false, once: vi.fn() })
    const soul = defineEventa<{ revision: number }>('persona:changed')
    const body = defineEventa<{ phase: string }>('body:phase')
    transport.attach(window(1) as never)
    transport.attach(window(2) as never, new Set([soul]))
    transport.emit(soul, { revision: 4 })
    transport.emit(body, { phase: 'working' })
    expect(editorEmit).toHaveBeenCalledExactlyOnceWith(soul, { revision: 4 })
    expect(stageEmit).toHaveBeenCalledTimes(2)
    transport.dispose()
  })
  it('routes without an invoke sender, attaches once and disposes destroyed stages', () => {
    const emit = vi.fn()
    const dispose = vi.fn()
    const factory = vi.fn(() => ({ context: { emit }, dispose }))
    const transport = createLifePresenceTransport(factory as never)
    let closed: (() => void) | undefined
    const window = { id: 1, isDestroyed: () => false, once: (_event: string, handler: () => void) => { closed = handler } }
    transport.attach(window as never)
    transport.attach(window as never)
    const pulse = defineEventa<{ phase: string }>('body:phase')
    transport.emit(pulse, { phase: 'working' })
    expect(factory).toHaveBeenCalledOnce()
    expect(emit).toHaveBeenCalledExactlyOnceWith(pulse, { phase: 'working' })
    closed?.()
    transport.emit(pulse, { phase: 'finished' })
    expect(emit).toHaveBeenCalledOnce()
    expect(dispose).toHaveBeenCalledOnce()
    transport.dispose()
    expect(dispose).toHaveBeenCalledOnce()
  })
})
