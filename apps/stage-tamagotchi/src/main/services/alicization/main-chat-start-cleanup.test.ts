import { describe, expect, it } from 'vitest'

import { cleanupAlicizationAcceptedMainChatStartFailure } from './main-chat-start-cleanup'

describe('main chat start cleanup', () => {
  it('releases accepted-start owners without converting an internal failure into user cancellation', () => {
    const calls: string[] = []

    cleanupAlicizationAcceptedMainChatStartFailure({
      clearPreparationDeadline: () => calls.push('deadline-cleared'),
      finishRun: () => calls.push('run-finished'),
      releaseForeground: () => calls.push('foreground-released'),
    })

    expect(calls).toEqual([
      'deadline-cleared',
      'run-finished',
      'foreground-released',
    ])
  })
})
