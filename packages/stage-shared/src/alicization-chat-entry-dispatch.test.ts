import { describe, expect, it } from 'vitest'

import {
  assertAlicizationChatEntryPreDialogueSendIdentity,
  hasAlicizationChatEntryPreDialogueSendIdentity,
} from './alicization-chat-entry-dispatch'

describe('alicization chat entry dispatch contract', () => {
  it('accepts an explicit pre-dialogue identity when the digital-life project awareness line is present before a voice turn opens outward', () => {
    expect(hasAlicizationChatEntryPreDialogueSendIdentity({
      status: 'partial',
      summaryLine: 'Alicization is still in Phase 1 local digital life closure before this turn opens outward.',
      awarenessLine: 'Before speaking, remember this is still the same digital life project before local fluency takes over.',
      reasonPreview: [
        'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
      ],
    })).toBe(true)
  })

  it('accepts an explicit pre-dialogue identity when project awareness is preserved through project-state carry even if top-level text is thin', () => {
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
