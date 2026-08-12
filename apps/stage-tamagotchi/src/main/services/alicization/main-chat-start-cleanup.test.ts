import { describe, expect, it, vi } from 'vitest'

import { cleanupAlicizationAcceptedMainChatStartFailure } from './main-chat-start-cleanup'

describe('main chat start cleanup', () => {
  it('releases every accepted-start owner after agent turn opening fails', () => {
    const calls: string[] = []

    cleanupAlicizationAcceptedMainChatStartFailure({
      clearPreparationDeadline: () => calls.push('deadline-cleared'),
      abortController: () => calls.push('controller-aborted'),
      finishRun: () => calls.push('run-finished'),
      releaseForeground: () => calls.push('foreground-released'),
    })

    expect(calls).toEqual([
      'deadline-cleared',
      'controller-aborted',
      'run-finished',
      'foreground-released',
    ])
  })

  it('does not abort a controller that was already cancelled', () => {
    const abortController = vi.fn()

    cleanupAlicizationAcceptedMainChatStartFailure({
      clearPreparationDeadline: vi.fn(),
      abortController,
      controllerAlreadyAborted: true,
      finishRun: vi.fn(),
      releaseForeground: vi.fn(),
    })

    expect(abortController).not.toHaveBeenCalled()
  })
})
