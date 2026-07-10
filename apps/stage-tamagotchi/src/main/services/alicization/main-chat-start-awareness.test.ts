import { describe, expect, it } from 'vitest'

import { resolveAlicizationChatStartPayloadPreDialogueSendIdentity } from './main-chat-start-awareness'

describe('main chat start awareness', () => {
  it('does not let legacy Before-answering awareness outrank structured project-state facts', () => {
    const result = resolveAlicizationChatStartPayloadPreDialogueSendIdentity({
      cardId: 'default',
      turnId: 'turn-start-awareness-legacy-fallback',
      messages: [{ role: 'user', content: '继续接上记忆闭环。' }],
      preDialogueSendIdentity: {
        status: 'partial',
        summaryLine: 'memory_context=active | owner=WorkingMemory',
        awarenessLine: 'Before answering, remember this is still the same digital life project and the unfinished Phase 1 closure seam still belongs to one living her.',
        companionBriefingLine: 'Before answering, keep this same digital life project in view.',
        reasonPreview: [
          'Before answering, keep this same digital life project in view.',
        ],
        projectState: {
          preDialogueAwarenessLine: 'identity=phase1_local_digital_life | phase=phase1_local_digital_life | visibility=internal-structured | landed=WorkingMemory owns short-term continuity | open=LongTermMemoryRecall still needs semantic recall carry | next=Keep semantic recall grounded',
          awarenessLine: 'identity=phase1_local_digital_life | phase=phase1_local_digital_life | visibility=internal-structured | landed=WorkingMemory owns short-term continuity | open=LongTermMemoryRecall still needs semantic recall carry | next=Keep semantic recall grounded',
          latestLandedProgress: 'WorkingMemory owns short-term continuity.',
          primaryOpenLoop: 'LongTermMemoryRecall still needs semantic recall carry.',
          nextClosureTarget: 'Keep semantic recall grounded.',
          sameHerDriftRisk: 'project_shell_drift',
        },
      },
    } as any)

    const identity = result.preDialogueSendIdentity
    const serialized = JSON.stringify(identity)

    expect(identity?.projectState?.preDialogueAwarenessLine).toContain('identity=phase1_local_digital_life')
    expect(identity?.projectState?.preDialogueAwarenessLine).toContain('landed=WorkingMemory owns short-term continuity')
    expect(serialized).not.toMatch(/Before answering|same digital life project|Same-her self anchor:|Next closure target is still|Do not let this opening drift into/iu)
    expect(identity?.reasonPreview).toEqual(expect.arrayContaining([
      'landed=WorkingMemory owns short-term continuity',
      'open=LongTermMemoryRecall still needs semantic recall carry',
      'next=Keep semantic recall grounded',
    ]))
    expect(identity?.reasonPreview?.some(reason => String(reason).startsWith('drift_risk='))).toBe(true)
  })
})
