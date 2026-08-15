import { existsSync, readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { runAlicizationMemoryOsTurn } from './memory-os/runtime'

describe('long-term memory transcript boundary', () => {
  it('does not expose raw conversation transcript recall contracts', () => {
    expect(existsSync(new URL('./memory-conversation-retrieval.ts', import.meta.url))).toBe(false)
  })

  it('removes legacy transcript fields at the MemoryOS boundary without removing owner records', () => {
    const result = runAlicizationMemoryOsTurn({
      context: {
        hostAttitude: 'focused',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [{ id: 'fact-owner', subject: 'Alice', predicate: 'values', object: 'continuity' }],
        recalledFragments: [],
        recalledConversationHistory: [{
          turnId: 'turn-raw',
          userText: 'raw user transcript must not cross MemoryOS',
          assistantText: 'raw assistant transcript must not cross MemoryOS',
        }],
        recollectionIntent: {
          searchConversations: true,
        },
        memoryDeliberation: {
          selectedConversationTurnIds: ['turn-raw'],
          selectedBundles: [{
            id: 'legacy-bundle',
            conversationTurnId: 'turn-raw',
          }],
        },
      } as any,
    })

    expect(result.context.retrievedFacts).toEqual([{
      id: 'fact-owner',
      subject: 'Alice',
      predicate: 'values',
      object: 'continuity',
    }])
    expect(result.context).not.toHaveProperty('recalledConversationHistory')
    expect(result.context.recollectionIntent).not.toHaveProperty('searchConversations')
    expect(result.context.memoryDeliberation).not.toHaveProperty('selectedConversationTurnIds')
    expect(result.context.memoryDeliberation?.selectedBundles?.[0]).not.toHaveProperty('conversationTurnId')
    expect(JSON.stringify(result.context)).not.toContain('raw user transcript')
    expect(JSON.stringify(result.context)).not.toContain('raw assistant transcript')
  })

  it('keeps conversation rows available only to the WorkingMemory history owner', () => {
    const dbSource = readFileSync(new URL('./db.ts', import.meta.url), 'utf8')
    const workingMemoryOwnerSource = readFileSync(
      new URL('./life-core/working-memory-history-owner.ts', import.meta.url),
      'utf8',
    )
    const sessionRuntimeSource = readFileSync(
      new URL('./main-chat-session-runtime.ts', import.meta.url),
      'utf8',
    )

    expect(dbSource).toContain('conversation_turns')
    expect(dbSource).toContain('listConversationTurnsBySession')
    expect(workingMemoryOwnerSource).toContain('WorkingMemoryHistoryOwner')
    expect(sessionRuntimeSource).toContain('createWorkingMemoryHistoryOwner')
    expect(sessionRuntimeSource).toContain('listConversationTurnsBySession')
  })
})
