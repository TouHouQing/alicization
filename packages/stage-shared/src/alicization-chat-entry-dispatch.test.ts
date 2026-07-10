import { describe, expect, it } from 'vitest'

import {
  assertAlicizationChatEntryPreDialogueSendIdentity,
  hasAlicizationChatEntryPreDialogueSendIdentity,
  sanitizeAlicizationChatEntryPreDialogueSendIdentity,
} from './alicization-chat-entry-dispatch'

describe('alicization chat entry dispatch contract', () => {
  it('sanitizes fixed-template residue before a chat entry forwards explicit pre-dialogue identity', () => {
    const sanitized = sanitizeAlicizationChatEntryPreDialogueSendIdentity({
      status: 'partial',
      summaryLine: 'Before speaking, remember this is still one continuous her.',
      awarenessLine: 'Alicization is a local-first digital life project building one continuous "her" rather than a better chat wrapper.',
      companionBriefingLine: 'Some closure has already landed.',
      projectState: {
        identity: 'Alicization is a local-first digital life project building one continuous her.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: '真实记忆入口已经接入。',
        nextClosureTarget: 'Keep memory, initiative, execution, and embodiment on one same-her line.',
      },
      reasonPreview: [
        'Right now I am still holding together mainly through body, face, and motion.',
        '真实记忆入口已经接入。',
      ],
    })

    const serialized = JSON.stringify(sanitized)
    expect(serialized).not.toMatch(/Before (?:answering|speaking|acting)|Right now I am|same-her|one continuous her|local-first digital life project|local_desktop_life_loop|content=excluded|visibility=internal/u)
    expect(sanitized.summaryLine).toBeNull()
    expect(sanitized.awarenessLine).toBeNull()
    expect(sanitized.projectState?.identity).toBeNull()
    expect(sanitized.projectState?.currentPhase).toBeNull()
    expect(sanitized.projectState?.nextClosureTarget).toBeNull()
    expect(sanitized.projectState?.latestLandedProgress).toBe('真实记忆入口已经接入。')
    expect(sanitized.reasonPreview).toEqual(['真实记忆入口已经接入。'])
  })

  it('accepts an explicit pre-dialogue identity when real memory governance facts are present before a voice turn opens outward', () => {
    expect(hasAlicizationChatEntryPreDialogueSendIdentity({
      status: 'partial',
      summaryLine: 'memory_governance_status=visible; short_term_owner=WorkingMemory; long_term_recall_owner=LongTermMemoryRecall',
      awarenessLine: 'provider_failure_surface=transparent; memory_workbench_policy=visible',
      reasonPreview: [
        '用户刚要求检查语义召回闭环，不要用固定模板遮盖失败。',
      ],
    })).toBe(true)
  })

  it('rejects fixed-template-only pre-dialogue identity even when project-state carry fields are non-empty before sanitization', () => {
    expect(hasAlicizationChatEntryPreDialogueSendIdentity({
      status: 'grounded',
      summaryLine: null,
      awarenessLine: null,
      reasonPreview: [],
      projectState: {
        identity: 'Alicization is a local-first digital life project building one continuous her.',
        currentPhase: 'Phase 1: Local Digital Life',
        nextClosureTarget: 'Keep memory, initiative, execution, and embodiment on one same-her line.',
      },
    })).toBe(false)
  })

  it('accepts an explicit pre-dialogue identity when real project-state carry survives sanitization even if top-level text is thin', () => {
    expect(hasAlicizationChatEntryPreDialogueSendIdentity({
      status: 'grounded',
      summaryLine: null,
      awarenessLine: null,
      reasonPreview: [],
      projectState: {
        latestLandedProgress: 'WorkingMemory owner 边界已接到对话入口。',
        primaryOpenLoop: 'LongTermMemoryRecall 还需要真实语义召回验证。',
        nextClosureTarget: '把 provider 失败透明暴露给用户。',
      },
    })).toBe(true)
  })

  it('rejects empty or missing pre-dialogue identity so voice turns cannot open outward without project awareness', () => {
    expect(hasAlicizationChatEntryPreDialogueSendIdentity(null)).toBe(false)
    expect(hasAlicizationChatEntryPreDialogueSendIdentity({
      status: 'partial',
      summaryLine: '   ',
      awarenessLine: null,
      reasonPreview: [],
    })).toBe(false)

    expect(() => assertAlicizationChatEntryPreDialogueSendIdentity(null, 'dispatchWebVoiceTurn'))
      .toThrowError('[alicization-chat-entry] dispatchWebVoiceTurn requires explicit preDialogueSendIdentity before voice dialogue dispatch.')
  })
})
