import type { IntentHandle, IntentOptions } from '@proj-alicization/pipelines-audio'

import { describe, expect, it, vi } from 'vitest'

import { createStageChatIntentBridge } from './stage-chat-intent-bridge'

function createIntentHandle(label: string) {
  return {
    intentId: `intent-${label}`,
    streamId: `stream-${label}`,
    priority: 0,
    ownerId: 'card-1',
    writeLiteral: vi.fn(),
    writeSpecial: vi.fn(),
    writeFlush: vi.fn(),
    end: vi.fn(),
    cancel: vi.fn(),
    stream: new ReadableStream(),
  } satisfies IntentHandle
}

describe('stage chat intent bridge', () => {
  it('reopens a prepared chat intent with embodiment script metadata before the first token is written', () => {
    const openCalls: Array<IntentOptions | undefined> = []
    const handles: IntentHandle[] = []
    const bridge = createStageChatIntentBridge({
      openIntent(options) {
        openCalls.push(options)
        const handle = createIntentHandle(String(openCalls.length))
        handles.push(handle)
        return handle
      },
    })

    bridge.prepare({
      ownerId: 'card-1',
      priority: 'normal',
      behavior: 'queue',
      metadata: {
        source: 'stage',
        intentSource: 'chat',
      },
    })

    bridge.attachEmbodimentScript({
      version: 'embodiment-script-v1',
      turnId: 'turn-1',
    })
    bridge.writeLiteral('你好')

    expect(openCalls).toHaveLength(2)
    expect(openCalls[1]?.metadata).toEqual({
      source: 'stage',
      intentSource: 'chat',
      embodimentScript: {
        version: 'embodiment-script-v1',
        turnId: 'turn-1',
      },
    })
    expect(handles[0]?.cancel).toHaveBeenCalledWith('metadata-upgrade')
    expect(handles[0]?.writeLiteral).not.toHaveBeenCalled()
    expect(handles[1]?.writeLiteral).toHaveBeenCalledWith('你好')
  })

  it('does not reopen the intent after token emission has started', () => {
    const openCalls: Array<IntentOptions | undefined> = []
    const handles: IntentHandle[] = []
    const bridge = createStageChatIntentBridge({
      openIntent(options) {
        openCalls.push(options)
        const handle = createIntentHandle(String(openCalls.length))
        handles.push(handle)
        return handle
      },
    })

    bridge.prepare({
      ownerId: 'card-1',
      priority: 'normal',
      behavior: 'queue',
      metadata: {
        source: 'stage',
      },
    })

    bridge.writeLiteral('先说一句')
    bridge.attachEmbodimentScript({
      version: 'embodiment-script-v1',
      turnId: 'turn-late',
    })

    expect(openCalls).toHaveLength(1)
    expect(handles[0]?.cancel).not.toHaveBeenCalled()
    expect(handles[0]?.writeLiteral).toHaveBeenCalledWith('先说一句')
  })
})
