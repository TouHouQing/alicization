import { describe, expect, it, vi } from 'vitest'

import { createStartupFailureHandler } from './startup-failure'

describe('visible startup failure recovery', () => {
  it('shows one recovery message for concurrent failures, hides obstructing surfaces, and opens only the chosen trusted folder', async () => {
    const options = { translate: (key: string) => key, userDataPath: 'C:/profile', logsPath: 'C:/profile/logs', hideWindows: vi.fn(), showMessage: vi.fn(async () => ({ response: 0 })), openPath: vi.fn(async () => ''), quit: vi.fn(), report: vi.fn() }
    const fail = createStartupFailureHandler(options)
    await Promise.all([fail(new Error('State integrity failed')), fail(new Error('Another failed dependency'))])
    expect(options.hideWindows).toHaveBeenCalledOnce()
    expect(options.showMessage).toHaveBeenCalledOnce()
    expect(options.openPath).toHaveBeenCalledExactlyOnceWith('C:/profile/logs')
    expect(options.quit).toHaveBeenCalledOnce()
    expect(options.report).toHaveBeenCalledTimes(2)
  })

  it('can close without touching state and still exits if the diagnostic UI fails', async () => {
    const options = { translate: (key: string) => key, userDataPath: 'C:/profile', logsPath: 'C:/profile/logs', hideWindows: vi.fn(), showMessage: vi.fn(async () => ({ response: 2 })), openPath: vi.fn(async () => ''), quit: vi.fn(), report: vi.fn() }
    await createStartupFailureHandler(options)(new Error('Unsupported future schema'))
    expect(options.openPath).not.toHaveBeenCalled()
    expect(options.quit).toHaveBeenCalledOnce()
    options.showMessage.mockRejectedValueOnce(new Error('UI unavailable'))
    await createStartupFailureHandler(options)(new Error('State corrupt'))
    expect(options.quit).toHaveBeenCalledTimes(2)
    expect(options.report).toHaveBeenCalledWith(expect.objectContaining({ message: 'UI unavailable' }))
  })
})
