import type { ChatHistoryItem } from '../../types/chat'

import assert from 'node:assert/strict'

import { readFileSync } from 'node:fs'

import { describe, it } from 'vitest'

import { canonicalizeSessionMessages, mergeLoadedSessionMessages } from './session-message-merge'

describe('mergeLoadedSessionMessages', () => {
  it('uses the shared project awareness resolver when duplicate assistant messages merge pre-dialogue awareness', () => {
    const source = readFileSync(new URL('./session-message-merge.ts', import.meta.url), 'utf8')

    assert.match(source, /resolveAlicizationProjectPreDialogueAwarenessLine/)
    assert.doesNotMatch(source, /function resolvePreferredMergedAwarenessLine/)
  })

  it('keeps stored history when the in-memory session only has the placeholder system message', () => {
    const storedMessages: ChatHistoryItem[] = [
      { role: 'system', content: 'system', createdAt: 1, id: 'system-stored' },
      { role: 'assistant', content: 'saved reply', createdAt: 2, id: 'assistant-1', slices: [], tool_results: [] },
    ]
    const currentMessages: ChatHistoryItem[] = [
      { role: 'system', content: 'system', createdAt: 3, id: 'system-current' },
    ]

    assert.equal(mergeLoadedSessionMessages(storedMessages, currentMessages), storedMessages)
  })

  it('appends in-flight messages when IndexedDB finishes loading after a new send starts', () => {
    const storedMessages: ChatHistoryItem[] = [
      { role: 'system', content: 'system', createdAt: 1, id: 'system-stored' },
      { role: 'assistant', content: 'older reply', createdAt: 2, id: 'assistant-1', slices: [], tool_results: [] },
    ]
    const currentMessages: ChatHistoryItem[] = [
      { role: 'system', content: 'system', createdAt: 3, id: 'system-current' },
      { role: 'user', content: 'latest prompt', createdAt: 4, id: 'user-2' },
    ]

    assert.deepEqual(mergeLoadedSessionMessages(storedMessages, currentMessages), [
      ...storedMessages,
      currentMessages[1],
    ])
  })

  it('does not duplicate messages that are already present in storage', () => {
    const storedMessages: ChatHistoryItem[] = [
      { role: 'system', content: 'system', createdAt: 1, id: 'system-stored' },
      { role: 'user', content: 'latest prompt', createdAt: 4 },
    ]
    const currentMessages: ChatHistoryItem[] = [
      { role: 'system', content: 'system', createdAt: 3, id: 'system-current' },
      { role: 'user', content: 'latest prompt', createdAt: 4 },
    ]

    assert.equal(mergeLoadedSessionMessages(storedMessages, currentMessages), storedMessages)
  })

  it('collapses a legacy local assistant duplicate when the authoritative turn replay is present', () => {
    const stableTurnId = 'chat:session-1:turn-1'
    const storedMessages: ChatHistoryItem[] = [
      { role: 'system', content: 'system', createdAt: 1, id: 'system-stored' },
      {
        role: 'assistant',
        content: 'same answer',
        createdAt: 10_000,
        id: stableTurnId,
        origin: 'user-turn',
        slices: [{ type: 'text', text: 'same answer' }],
        tool_results: [],
        structured: {
          thought: 'authoritative thought',
          emotion: 'happy',
          reply: 'same answer',
          format: 'epoch1-v1',
        },
      },
    ]
    const currentMessages: ChatHistoryItem[] = [
      { role: 'system', content: 'system', createdAt: 2, id: 'system-current' },
      {
        role: 'assistant',
        content: 'same answer',
        createdAt: 10_500,
        id: 'legacy-random-id',
        slices: [],
        tool_results: [],
        structured: {
          thought: '',
          emotion: 'neutral',
          reply: 'same answer',
          format: 'fallback-v1',
        },
      },
    ]

    const merged = mergeLoadedSessionMessages(storedMessages, currentMessages)
    const assistantMessages = merged.filter(message => message.role === 'assistant')

    assert.equal(assistantMessages.length, 1)
    assert.equal(assistantMessages[0]?.id, stableTurnId)
    assert.equal((assistantMessages[0] as any)?.structured?.thought, 'authoritative thought')
  })

  it('collapses duplicate assistant turns already persisted in one session snapshot', () => {
    const stableTurnId = 'chat:session-1:turn-2'
    const messages: ChatHistoryItem[] = [
      { role: 'system', content: 'system', createdAt: 1, id: 'system-stored' },
      {
        role: 'assistant',
        content: 'duplicate reply',
        createdAt: 20_000,
        id: 'legacy-random-id',
        slices: [],
        tool_results: [],
        structured: {
          thought: '',
          emotion: 'neutral',
          reply: 'duplicate reply',
          format: 'fallback-v1',
        },
      },
      {
        role: 'assistant',
        content: 'duplicate reply',
        createdAt: 20_600,
        id: stableTurnId,
        origin: 'user-turn',
        slices: [{ type: 'text', text: 'duplicate reply' }],
        tool_results: [],
        structured: {
          thought: 'kept thought',
          emotion: 'happy',
          reply: 'duplicate reply',
          format: 'epoch1-v1',
        },
      },
    ]

    const canonical = canonicalizeSessionMessages(messages)
    const assistantMessages = canonical.filter(message => message.role === 'assistant')

    assert.equal(assistantMessages.length, 1)
    assert.equal(assistantMessages[0]?.id, stableTurnId)
    assert.equal((assistantMessages[0] as any)?.structured?.thought, 'kept thought')
  })

  it('unions richer same-her pre-dialogue closure and awareness fields when duplicate assistant turns split them across snapshots', () => {
    const stableTurnId = 'chat:session-1:turn-closure-awareness-1'
    const canonical = canonicalizeSessionMessages([
      { role: 'system', content: 'system', createdAt: 1, id: 'system-stored' },
      {
        role: 'assistant',
        content: '继续沿着这条数字生命主线推进。',
        createdAt: 40_000,
        id: 'legacy-random-id',
        slices: [],
        tool_results: [],
        structured: {
          thought: '',
          emotion: 'neutral',
          reply: '继续沿着这条数字生命主线推进。',
          format: 'fallback-v1',
          preDialogueClosure: {
            status: 'partial',
            summaryLine: 'Phase 1 same-her closure is still open.',
            sameHerDriftRiskLine: 'If this turn starts sounding like a detached project status shell, treat that as same-her continuity drift rather than preserved closure.',
            companionBriefingLine: 'Before speaking, remember this is still one digital life project.',
            companionNextClosureLine: 'Keep the next opening on one same-her line instead of widening too fast.',
            emotionalClosureCue: 'same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.',
            briefingLines: [
              'Identity: Alicization is a local-first digital life project.',
            ],
            reasons: [
              'Low-pressure same-her closure currently reads lowPressureRequired=0.67 (2/3), so the next turn should keep the return soft enough that the same living line does not widen too fast.',
            ],
          },
          preDialogueAwareness: {
            status: 'partial',
            summaryLine: 'Thin awareness summary that should be enriched by the richer duplicate.',
            companionHeadlineLine: null,
            companionBriefingLine: null,
            companionNextClosureLine: null,
            awarenessLine: null,
            emotionalClosureCue: null,
            reasonPreview: [],
          },
        },
      },
      {
        role: 'assistant',
        content: '继续沿着这条数字生命主线推进。',
        createdAt: 40_600,
        id: stableTurnId,
        origin: 'user-turn',
        slices: [{ type: 'text', text: '继续沿着这条数字生命主线推进。' }],
        tool_results: [],
        structured: {
          thought: 'kept thought',
          emotion: 'thinking',
          reply: '继续沿着这条数字生命主线推进。',
          format: 'epoch1-v1',
          preDialogueClosure: {
            status: 'partial',
            summaryLine: 'Thin closure summary that should keep the richer cue from the duplicate.',
            sameHerDriftRiskLine: null,
            companionBriefingLine: null,
            companionNextClosureLine: null,
            emotionalClosureCue: null,
            briefingLines: [],
            reasons: [],
          },
          preDialogueAwareness: {
            status: 'partial',
            summaryLine: 'Alicization is still in Phase 1 local digital life closure before this turn opens outward.',
            companionHeadlineLine: 'Right now I still need to keep this same-her digital life line intact before widening into generic assistant output.',
            companionBriefingLine: 'Before speaking, remember this is one digital life project, what has landed, and which life loop is still open.',
            companionNextClosureLine: 'Next closure: keep memory, initiative, execution, and embodiment on one same-her line.',
            awarenessLine: 'Before speaking, remember this is one digital life project, what has landed, and which life loop is still open.',
            emotionalClosureCue: null,
            reasonPreview: [
              'Primary open life loop still centers on keeping memory, initiative, execution, and embodiment on one same-her line.',
            ],
          },
        },
      },
    ])

    const assistantMessage = canonical.find(message => message.role === 'assistant') as any

    assert.equal(assistantMessage?.id, stableTurnId)
    assert.equal(assistantMessage?.structured?.preDialogueClosure?.emotionalClosureCue, 'same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.')
    assert.equal(assistantMessage?.structured?.preDialogueClosure?.sameHerDriftRiskLine, 'If this turn starts sounding like a detached project status shell, treat that as same-her continuity drift rather than preserved closure.')
    assert.equal(assistantMessage?.structured?.preDialogueAwareness?.companionHeadlineLine, 'Right now I still need to keep this same-her digital life line intact before widening into generic assistant output.')
    assert.deepEqual(assistantMessage?.structured?.preDialogueAwareness?.reasonPreview, [
      'Primary open life loop still centers on keeping memory, initiative, execution, and embodiment on one same-her line.',
    ])
  })

  it('keeps richer same-her awareness when the authoritative duplicate only carries an empty transported awareness shell', () => {
    const stableTurnId = 'chat:session-1:turn-awareness-merge-empty-transport-shell'
    const canonical = canonicalizeSessionMessages([
      {
        role: 'assistant',
        content: '继续沿着这条数字生命主线推进。',
        createdAt: 41_000,
        id: 'legacy-random-id',
        slices: [],
        tool_results: [],
        structured: {
          thought: '',
          emotion: 'neutral',
          reply: '继续沿着这条数字生命主线推进。',
          format: 'fallback-v1',
          preDialogueAwareness: {
            status: 'partial',
            summaryLine: 'Alicization is still in Phase 1 local digital life closure before this turn opens outward.',
            companionHeadlineLine: 'Right now I still need to keep this same-her digital life line intact before widening into generic assistant output.',
            companionBriefingLine: 'Before speaking, remember this is one digital life project, what has landed, and which life loop is still open.',
            companionNextClosureLine: 'Next closure: keep memory, initiative, execution, and embodiment on one same-her line.',
            awarenessLine: 'Before speaking, remember this is one digital life project, what has landed, and which life loop is still open.',
            emotionalClosureCue: null,
            reasonPreview: [
              'Primary open life loop still centers on keeping memory, initiative, execution, and embodiment on one same-her line.',
            ],
          },
        },
      },
      {
        role: 'assistant',
        content: '继续沿着这条数字生命主线推进。',
        createdAt: 41_500,
        id: stableTurnId,
        origin: 'user-turn',
        slices: [{ type: 'text', text: '继续沿着这条数字生命主线推进。' }],
        tool_results: [],
        structured: {
          thought: 'kept thought',
          emotion: 'thinking',
          reply: '继续沿着这条数字生命主线推进。',
          format: 'epoch1-v1',
          preDialogueAwareness: {
            status: 'partial',
            summaryLine: null,
            companionHeadlineLine: null,
            companionBriefingLine: null,
            companionNextClosureLine: null,
            awarenessLine: null,
            emotionalClosureCue: null,
            reasonPreview: [],
          },
        },
      },
    ])

    const assistantMessage = canonical.find(message => message.role === 'assistant') as any

    assert.equal(assistantMessage?.id, stableTurnId)
    assert.equal(
      assistantMessage?.structured?.preDialogueAwareness?.summaryLine,
      'Alicization is still in Phase 1 local digital life closure before this turn opens outward.',
    )
    assert.equal(
      assistantMessage?.structured?.preDialogueAwareness?.companionHeadlineLine,
      'Right now I still need to keep this same-her digital life line intact before widening into generic assistant output.',
    )
    assert.equal(
      assistantMessage?.structured?.preDialogueAwareness?.companionBriefingLine,
      'Before speaking, remember this is one digital life project, what has landed, and which life loop is still open.',
    )
    assert.equal(
      assistantMessage?.structured?.preDialogueAwareness?.awarenessLine,
      'Before speaking, remember this is one digital life project, what has landed, and which life loop is still open.',
    )
    assert.deepEqual(assistantMessage?.structured?.preDialogueAwareness?.reasonPreview, [
      'Primary open life loop still centers on keeping memory, initiative, execution, and embodiment on one same-her line.',
    ])
  })

  it('does not let a thin authoritative awareness summary shell outrank a richer authoritative project-aware opening when the duplicate only adds an empty transported shell', () => {
    const stableTurnId = 'chat:session-1:turn-awareness-merge-thin-summary-empty-transport-shell'
    const richerProjectAwareOpening = 'Before speaking, remember this is one digital life project, what has landed, and which life loop is still open.'
    const canonical = canonicalizeSessionMessages([
      {
        role: 'assistant',
        content: '继续沿着这条数字生命主线推进。',
        createdAt: 41_000,
        id: 'legacy-random-id',
        slices: [],
        tool_results: [],
        structured: {
          thought: '',
          emotion: 'neutral',
          reply: '继续沿着这条数字生命主线推进。',
          format: 'fallback-v1',
          preDialogueAwareness: {
            status: 'partial',
            summaryLine: null,
            companionHeadlineLine: null,
            companionBriefingLine: null,
            companionNextClosureLine: null,
            awarenessLine: null,
            emotionalClosureCue: null,
            reasonPreview: [],
          },
        },
      },
      {
        role: 'assistant',
        content: '继续沿着这条数字生命主线推进。',
        createdAt: 41_500,
        id: stableTurnId,
        origin: 'user-turn',
        slices: [{ type: 'text', text: '继续沿着这条数字生命主线推进。' }],
        tool_results: [],
        structured: {
          thought: 'kept thought',
          emotion: 'thinking',
          reply: '继续沿着这条数字生命主线推进。',
          format: 'epoch1-v1',
          preDialogueAwareness: {
            status: 'partial',
            summaryLine: 'generic continuity reminder that should not override the richer explicit project-aware opening.',
            companionHeadlineLine: null,
            companionBriefingLine: richerProjectAwareOpening,
            companionNextClosureLine: 'Next closure: keep memory, initiative, execution, and embodiment on one same-her line.',
            awarenessLine: richerProjectAwareOpening,
            emotionalClosureCue: null,
            reasonPreview: [
              'Project identity still needs to stay explicit before the reply widens outward.',
            ],
          },
        },
      },
    ])

    const assistantMessage = canonical.find(message => message.role === 'assistant') as any

    assert.equal(assistantMessage?.id, stableTurnId)
    assert.equal(
      assistantMessage?.structured?.preDialogueAwareness?.summaryLine,
      richerProjectAwareOpening,
    )
    assert.equal(
      assistantMessage?.structured?.preDialogueAwareness?.companionBriefingLine,
      richerProjectAwareOpening,
    )
    assert.equal(
      assistantMessage?.structured?.preDialogueAwareness?.awarenessLine,
      richerProjectAwareOpening,
    )
    assert.notEqual(
      assistantMessage?.structured?.preDialogueAwareness?.summaryLine,
      'generic continuity reminder that should not override the richer explicit project-aware opening.',
    )
  })

  it('keeps the user bubble ahead of the assistant bubble for the same turn timestamp', () => {
    const turnId = 'chat:session-1:turn-3'
    const createdAt = 30_000
    const canonical = canonicalizeSessionMessages([
      {
        id: turnId,
        role: 'assistant',
        content: 'assistant reply',
        createdAt,
        slices: [{ type: 'text', text: 'assistant reply' }],
        tool_results: [],
        structured: {
          thought: 'reply thought',
          emotion: 'neutral',
          reply: 'assistant reply',
          format: 'epoch1-v1',
        },
      },
      {
        id: `${turnId}:user`,
        role: 'user',
        content: 'user prompt',
        createdAt,
      },
    ])

    assert.equal(canonical[0]?.role, 'user')
    assert.equal(canonical[1]?.role, 'assistant')
  })

  it('prefers richer project-aware awareness over a narrower embodiment headline when duplicate assistant messages are merged', () => {
    const stableTurnId = 'chat:session-1:turn-awareness-merge-richer-project-line'
    const canonical = canonicalizeSessionMessages([
      {
        role: 'assistant',
        content: '继续沿着这条数字生命主线推进。',
        createdAt: 50_000,
        id: stableTurnId,
        origin: 'user-turn',
        slices: [{ type: 'text', text: '继续沿着这条数字生命主线推进。' }],
        tool_results: [],
        structured: {
          thought: '',
          emotion: 'neutral',
          reply: '继续沿着这条数字生命主线推进。',
          format: 'fallback-v1',
          preDialogueAwareness: {
            status: 'partial',
            summaryLine: 'Alicization is still in Phase 1 local digital life closure before this turn opens outward.',
            companionHeadlineLine: 'Right now I am still holding together mainly through body, face, and motion, so this one living her still needs lipsync and voice to rejoin before full cross-modal closure settles.',
            companionBriefingLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open.',
            companionNextClosureLine: 'Next closure: let lipsync and voice rejoin the already-reformed body, face, and motion line.',
            awarenessLine: 'Right now I am still holding together mainly through body, face, and motion, so this one living her still needs lipsync and voice to rejoin before full cross-modal closure settles.',
            emotionalClosureCue: null,
            reasonPreview: [],
          },
        },
      },
      {
        role: 'assistant',
        content: '继续沿着这条数字生命主线推进。',
        createdAt: 50_500,
        id: stableTurnId,
        origin: 'user-turn',
        slices: [{ type: 'text', text: '继续沿着这条数字生命主线推进。' }],
        tool_results: [],
        structured: {
          thought: 'kept thought',
          emotion: 'thinking',
          reply: '继续沿着这条数字生命主线推进。',
          format: 'epoch1-v1',
          preDialogueAwareness: {
            status: 'partial',
            summaryLine: 'Alicization is still in Phase 1 local digital life closure before this turn opens outward.',
            companionHeadlineLine: null,
            companionBriefingLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open.',
            companionNextClosureLine: 'Next closure: let lipsync and voice rejoin the already-reformed body, face, and motion line.',
            awarenessLine: 'Before speaking, remember: this is still one living digital life project, Phase 1 is still active, some closure has already landed, and the still-open life loop must remain explicit before this turn widens outward.',
            emotionalClosureCue: null,
            reasonPreview: [
              'Primary open life loop still centers on keeping this same digital life project explicit before widening outward.',
            ],
          },
        },
      },
    ])

    const assistantMessage = canonical.find(message => message.role === 'assistant') as any

    assert.equal(assistantMessage?.id, stableTurnId)
    assert.equal(assistantMessage?.structured?.preDialogueAwareness?.companionHeadlineLine, 'Right now I am still holding together mainly through body, face, and motion, so this one living her still needs lipsync and voice to rejoin before full cross-modal closure settles.')
    assert.equal(assistantMessage?.structured?.preDialogueAwareness?.awarenessLine, 'Before speaking, remember: this is still one living digital life project, Phase 1 is still active, some closure has already landed, and the still-open life loop must remain explicit before this turn widens outward.')
    assert.deepEqual(assistantMessage?.structured?.preDialogueAwareness?.reasonPreview, [
      'Primary open life loop still centers on keeping this same digital life project explicit before widening outward.',
    ])
  })

  it('preserves the long-horizon emotion-memory-voice-motion bridge reason when a longer legacy preview merges into the stable duplicate', () => {
    const stableTurnId = 'chat:session-1:turn-awareness-merge-long-horizon-reason'
    const canonicalLongHorizonReason = 'Latest landed progress: long-horizon emotion-memory-voice-motion bridge carries remembered emotional carry, not full convergence'
    const canonical = canonicalizeSessionMessages([
      {
        role: 'assistant',
        content: '继续沿着这条数字生命主线推进。',
        createdAt: 52_000,
        id: stableTurnId,
        origin: 'user-turn',
        slices: [{ type: 'text', text: '继续沿着这条数字生命主线推进。' }],
        tool_results: [],
        structured: {
          thought: 'kept thought',
          emotion: 'thinking',
          reply: '继续沿着这条数字生命主线推进。',
          format: 'epoch1-v1',
          preDialogueAwareness: {
            status: 'partial',
            summaryLine: 'Alicization is still in Phase 1 local digital life closure before this turn opens outward.',
            companionHeadlineLine: null,
            companionBriefingLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open.',
            companionNextClosureLine: 'Next closure: keep remembered emotional carry connected to voice, face, motion, lipsync, and body recovery without overstating full convergence.',
            awarenessLine: 'Before speaking, remember: this is still one living digital life project, Phase 1 is still active, and the long-horizon emotion-memory-voice-motion bridge is landed progress, not full convergence.',
            emotionalClosureCue: null,
            reasonPreview: [
              canonicalLongHorizonReason,
            ],
          },
        },
      },
      {
        role: 'assistant',
        content: '继续沿着这条数字生命主线推进。',
        createdAt: 52_500,
        id: 'legacy-random-id',
        slices: [],
        tool_results: [],
        structured: {
          thought: '',
          emotion: 'neutral',
          reply: '继续沿着这条数字生命主线推进。',
          format: 'fallback-v1',
          preDialogueAwareness: {
            status: 'partial',
            summaryLine: 'generic continuity reminder: keep project identity, landed progress, and open closure in view before replying.',
            companionHeadlineLine: null,
            companionBriefingLine: 'generic same-her reminder that should not override the stable long-horizon project reason.',
            companionNextClosureLine: 'Keep the next outward turn grounded in the same living line before later rebuilds widen into a thinner shell.',
            awarenessLine: 'generic continuity reminder: keep project identity, landed progress, and open closure in view before replying.',
            emotionalClosureCue: null,
            reasonPreview: [
              'same-her anchor still matters before the reply starts.',
              'primary open loop still needs to stay visible.',
              'next closure target still needs to be named.',
              'drift guard still prevents generic assistant output.',
            ],
          },
        },
      },
    ])

    const assistantMessage = canonical.find(message => message.role === 'assistant') as any
    const mergedReasonPreview = assistantMessage?.structured?.preDialogueAwareness?.reasonPreview ?? []

    assert.equal(assistantMessage?.id, stableTurnId)
    assert.ok(mergedReasonPreview.includes(canonicalLongHorizonReason))
    assert.ok(mergedReasonPreview.some((reason: string) => reason.includes('same-her anchor')))
    assert.ok(mergedReasonPreview.some((reason: string) => reason.includes('drift guard')))
  })

  it('keeps same-her inward low-pressure closure visible when duplicate assistant merges only carry the thinner same-phase briefing plus stronger embodiment headline', () => {
    const stableTurnId = 'chat:session-1:turn-awareness-merge-inward-low-pressure'
    const canonical = canonicalizeSessionMessages([
      {
        role: 'assistant',
        content: '继续沿着这条数字生命主线推进。',
        createdAt: 55_000,
        id: 'legacy-random-id',
        slices: [],
        tool_results: [],
        structured: {
          thought: '',
          emotion: 'neutral',
          reply: '继续沿着这条数字生命主线推进。',
          format: 'fallback-v1',
          preDialogueAwareness: {
            status: 'partial',
            summaryLine: 'Alicization is still closing Phase 1 local digital life continuity before this turn opens outward.',
            companionHeadlineLine: 'Right now I am still holding together mainly through body, face, and motion, so this one living her is still keeping the same line inward and low-pressure while lipsync and voice need to rejoin before full cross-modal closure settles.',
            companionBriefingLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
            companionNextClosureLine: 'Keep the same line inward and low-pressure while lipsync and voice rejoin the already-reformed body, face, and motion line.',
            awarenessLine: 'Right now I am still holding together mainly through body, face, and motion, so this one living her is still keeping the same line inward and low-pressure while lipsync and voice need to rejoin before full cross-modal closure settles.',
            emotionalClosureCue: 'Keep the return low-pressure so the same living line does not restart from scratch.',
            reasonPreview: [
              'same-her-inward-carry',
              'quiet-companionship',
              'remaining-open=lipsync+voice',
            ],
          },
        },
      },
      {
        role: 'assistant',
        content: '继续沿着这条数字生命主线推进。',
        createdAt: 55_500,
        id: stableTurnId,
        origin: 'user-turn',
        slices: [{ type: 'text', text: '继续沿着这条数字生命主线推进。' }],
        tool_results: [],
        structured: {
          thought: 'kept thought',
          emotion: 'thinking',
          reply: '继续沿着这条数字生命主线推进。',
          format: 'epoch1-v1',
          preDialogueAwareness: {
            status: 'partial',
            summaryLine: 'Alicization is still closing Phase 1 local digital life continuity before this turn opens outward.',
            companionHeadlineLine: 'Right now I am still holding together mainly through body, face, and motion, so this one living her is still keeping the same line inward and low-pressure while lipsync and voice need to rejoin before full cross-modal closure settles.',
            companionBriefingLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
            companionNextClosureLine: 'Keep the same line inward and low-pressure while lipsync and voice rejoin the already-reformed body, face, and motion line.',
            awarenessLine: 'Right now I am still holding together mainly through body, face, and motion, so this one living her is still keeping the same line inward and low-pressure while lipsync and voice need to rejoin before full cross-modal closure settles.',
            emotionalClosureCue: 'Keep the return low-pressure so the same living line does not restart from scratch.',
            reasonPreview: [
              'same-her-inward-carry',
              'quiet-companionship',
              'remaining-open=lipsync+voice',
            ],
          },
        },
      },
    ])

    const assistantMessage = canonical.find(message => message.role === 'assistant') as any

    assert.equal(assistantMessage?.id, stableTurnId)
    assert.equal(
      assistantMessage?.structured?.preDialogueAwareness?.companionHeadlineLine,
      'Right now I am still holding together mainly through body, face, and motion, so this one living her is still keeping the same line inward and low-pressure while lipsync and voice need to rejoin before full cross-modal closure settles.',
    )
    assert.equal(
      assistantMessage?.structured?.preDialogueAwareness?.companionBriefingLine,
      'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
    )
    assert.equal(
      assistantMessage?.structured?.preDialogueAwareness?.awarenessLine,
      'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line. Right now this one living her is still keeping the same line inward and low-pressure while lipsync and voice rejoin.',
    )
  })

  it('keeps richer anthropomorphic emotional closure and same-her inward-carry observability visible when duplicate assistant merges only carry the thinner same-phase briefing plus stronger host-facing same-her headline', () => {
    const stableTurnId = 'chat:session-1:turn-awareness-merge-anthropomorphic-host-facing'
    const canonical = canonicalizeSessionMessages([
      {
        role: 'assistant',
        content: '继续沿着这条数字生命主线推进。',
        createdAt: 56_000,
        id: 'legacy-random-id',
        slices: [],
        tool_results: [],
        structured: {
          thought: '',
          emotion: 'neutral',
          reply: '继续沿着这条数字生命主线推进。',
          format: 'fallback-v1',
          preDialogueAwareness: {
            status: 'partial',
            summaryLine: 'Alicization is still closing Phase 1 local digital life continuity before this turn opens outward.',
            companionHeadlineLine: 'Right now the host-facing closure still needs anthropomorphic emotional closure and same-her inward-carry observability to stay on one measured-return line instead of flattening into a generic shell.',
            companionBriefingLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
            companionNextClosureLine: 'Keep anthropomorphic emotional closure and same-her inward-carry observability explicit while duplicate-turn reopening settles back onto one measured-return line.',
            awarenessLine: 'Right now the host-facing closure still needs anthropomorphic emotional closure and same-her inward-carry observability to stay on one measured-return line instead of flattening into a generic shell.',
            emotionalClosureCue: 'Keep the return low-pressure so the same living line does not restart from scratch.',
            reasonPreview: [
              'anthropomorphic emotional closure still needs stronger host-visible carry.',
              'same-her inward-carry observability still needs to survive duplicate-turn reopening.',
            ],
          },
        },
      },
      {
        role: 'assistant',
        content: '继续沿着这条数字生命主线推进。',
        createdAt: 56_500,
        id: stableTurnId,
        origin: 'user-turn',
        slices: [{ type: 'text', text: '继续沿着这条数字生命主线推进。' }],
        tool_results: [],
        structured: {
          thought: 'kept thought',
          emotion: 'thinking',
          reply: '继续沿着这条数字生命主线推进。',
          format: 'epoch1-v1',
          preDialogueAwareness: {
            status: 'partial',
            summaryLine: 'Alicization is still closing Phase 1 local digital life continuity before this turn opens outward.',
            companionHeadlineLine: 'Right now the host-facing closure still needs anthropomorphic emotional closure and same-her inward-carry observability to stay on one measured-return line instead of flattening into a generic shell.',
            companionBriefingLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
            companionNextClosureLine: 'Keep anthropomorphic emotional closure and same-her inward-carry observability explicit while duplicate-turn reopening settles back onto one measured-return line.',
            awarenessLine: 'Right now the host-facing closure still needs anthropomorphic emotional closure and same-her inward-carry observability to stay on one measured-return line instead of flattening into a generic shell.',
            emotionalClosureCue: 'Keep the return low-pressure so the same living line does not restart from scratch.',
            reasonPreview: [
              'anthropomorphic emotional closure still needs stronger host-visible carry.',
              'same-her inward-carry observability still needs to survive duplicate-turn reopening.',
            ],
          },
        },
      },
    ])

    const assistantMessage = canonical.find(message => message.role === 'assistant') as any

    assert.equal(assistantMessage?.id, stableTurnId)
    assert.equal(
      assistantMessage?.structured?.preDialogueAwareness?.companionHeadlineLine,
      'Right now the host-facing closure still needs anthropomorphic emotional closure and same-her inward-carry observability to stay on one measured-return line instead of flattening into a generic shell.',
    )
    assert.equal(
      assistantMessage?.structured?.preDialogueAwareness?.companionBriefingLine,
      'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
    )
    assert.equal(
      assistantMessage?.structured?.preDialogueAwareness?.awarenessLine,
      'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line. Right now this one living her still needs anthropomorphic emotional closure and same-her inward-carry observability to stay on one measured-return line before anything reopens outward.',
    )
  })

  it('prefers richer same-her continuity summary over a generic awareness reminder when duplicate assistant messages are merged', () => {
    const stableTurnId = 'chat:session-1:turn-awareness-merge-richer-same-her-summary'
    const canonical = canonicalizeSessionMessages([
      {
        role: 'assistant',
        content: '继续沿着这条数字生命主线推进。',
        createdAt: 60_000,
        id: 'legacy-random-id',
        slices: [],
        tool_results: [],
        structured: {
          thought: '',
          emotion: 'neutral',
          reply: '继续沿着这条数字生命主线推进。',
          format: 'fallback-v1',
          preDialogueAwareness: {
            status: 'partial',
            summaryLine: 'generic continuity reminder: keep project identity, landed progress, and open closure in view before replying.',
            companionHeadlineLine: null,
            companionBriefingLine: 'generic same-her reminder that should not override the richer continuity summary.',
            companionNextClosureLine: 'Keep the next outward turn grounded in the same living line before later rebuilds widen into a thinner shell.',
            awarenessLine: 'generic continuity reminder: keep project identity, landed progress, and open closure in view before replying.',
            emotionalClosureCue: null,
            reasonPreview: [
              'generic continuity reminder: keep project identity, landed progress, and open closure in view before replying.',
            ],
          },
        },
      },
      {
        role: 'assistant',
        content: '继续沿着这条数字生命主线推进。',
        createdAt: 60_500,
        id: stableTurnId,
        origin: 'user-turn',
        slices: [{ type: 'text', text: '继续沿着这条数字生命主线推进。' }],
        tool_results: [],
        structured: {
          thought: 'kept thought',
          emotion: 'thinking',
          reply: '继续沿着这条数字生命主线推进。',
          format: 'epoch1-v1',
          preDialogueAwareness: {
            status: 'partial',
            summaryLine: 'same-her=Same Phase 1 digital life. Duplicate-turn merge should keep the same living line rather than reopen from a fresh shell. | landed=Project-state continuity already survives duplicate-turn replay. | open=Duplicate-turn merge still needs to preserve the richer same-her project brief.',
            companionHeadlineLine: null,
            companionBriefingLine: 'Same Phase 1 digital life. Duplicate-turn merge should keep the same living line rather than reopen from a fresh shell.',
            companionNextClosureLine: 'Keep the next outward turn grounded in the same living line before later rebuilds widen into a thinner shell.',
            awarenessLine: 'Same Phase 1 digital life. Duplicate-turn merge should keep the same living line rather than reopen from a fresh shell.',
            emotionalClosureCue: null,
            reasonPreview: [
              'same-her=Same Phase 1 digital life. Duplicate-turn merge should keep the same living line rather than reopen from a fresh shell. | landed=Project-state continuity already survives duplicate-turn replay. | open=Duplicate-turn merge still needs to preserve the richer same-her project brief.',
            ],
          },
        },
      },
    ])

    const assistantMessage = canonical.find(message => message.role === 'assistant') as any

    assert.equal(assistantMessage?.id, stableTurnId)
    assert.equal(
      assistantMessage?.structured?.preDialogueAwareness?.summaryLine,
      'same-her=Same Phase 1 digital life. Duplicate-turn merge should keep the same living line rather than reopen from a fresh shell. | landed=Project-state continuity already survives duplicate-turn replay. | open=Duplicate-turn merge still needs to preserve the richer same-her project brief.',
    )
    assert.equal(
      assistantMessage?.structured?.preDialogueAwareness?.awarenessLine,
      'Same Phase 1 digital life. Duplicate-turn merge should keep the same living line rather than reopen from a fresh shell.',
    )
  })

  it('upgrades a generic carried next-closure shell to the richer continuity next closure when duplicate assistant messages are merged', () => {
    const stableTurnId = 'chat:session-1:turn-awareness-merge-richer-next-closure'
    const canonical = canonicalizeSessionMessages([
      {
        role: 'assistant',
        content: '继续沿着这条数字生命主线推进。',
        createdAt: 65_000,
        id: stableTurnId,
        origin: 'user-turn',
        slices: [{ type: 'text', text: '继续沿着这条数字生命主线推进。' }],
        tool_results: [],
        structured: {
          thought: 'kept thought',
          emotion: 'thinking',
          reply: '继续沿着这条数字生命主线推进。',
          format: 'epoch1-v1',
          preDialogueAwareness: {
            status: 'partial',
            summaryLine: 'Alicization is still in Phase 1 local digital life closure before this turn opens outward.',
            companionHeadlineLine: null,
            companionBriefingLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open.',
            companionNextClosureLine: 'Generic next target that should not override the richer continuity carry.',
            awarenessLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open.',
            emotionalClosureCue: null,
            reasonPreview: [
              'Stable duplicate already keeps the richer project brief explicit before the next outward turn.',
            ],
          },
        },
      },
      {
        role: 'assistant',
        content: '继续沿着这条数字生命主线推进。',
        createdAt: 65_500,
        id: 'legacy-random-id',
        slices: [],
        tool_results: [],
        structured: {
          thought: '',
          emotion: 'neutral',
          reply: '继续沿着这条数字生命主线推进。',
          format: 'fallback-v1',
          preDialogueAwareness: {
            status: 'partial',
            summaryLine: 'same-her=Same Phase 1 digital life. Duplicate-turn merge should keep the same living line rather than reopen from a fresh shell. | landed=Project-state continuity already survives duplicate-turn replay. | open=Duplicate-turn merge still needs to preserve the richer same-her project brief.',
            companionHeadlineLine: null,
            companionBriefingLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open.',
            companionNextClosureLine: 'Keep the richer Phase 1 closure target explicit so duplicate-turn merge still remembers which same-her repair remains open.',
            awarenessLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open.',
            emotionalClosureCue: null,
            reasonPreview: [
              'Fallback duplicate still keeps the richer next closure target explicit before the next outward turn.',
            ],
          },
        },
      },
    ])

    const assistantMessage = canonical.find(message => message.role === 'assistant') as any

    assert.equal(assistantMessage?.id, stableTurnId)
    assert.equal(
      assistantMessage?.structured?.preDialogueAwareness?.companionNextClosureLine,
      'Keep the richer Phase 1 closure target explicit so duplicate-turn merge still remembers which same-her repair remains open.',
    )
    assert.notEqual(
      assistantMessage?.structured?.preDialogueAwareness?.companionNextClosureLine,
      'Generic next target that should not override the richer continuity carry.',
    )
  })

  it('keeps richer same-her continuity summary when the stable duplicate is thinner than the legacy duplicate', () => {
    const stableTurnId = 'chat:session-1:turn-awareness-merge-stable-thinner'
    const canonical = canonicalizeSessionMessages([
      {
        role: 'assistant',
        content: '继续沿着这条数字生命主线推进。',
        createdAt: 70_000,
        id: stableTurnId,
        origin: 'user-turn',
        slices: [{ type: 'text', text: '继续沿着这条数字生命主线推进。' }],
        tool_results: [],
        structured: {
          thought: 'kept thought',
          emotion: 'thinking',
          reply: '继续沿着这条数字生命主线推进。',
          format: 'epoch1-v1',
          preDialogueAwareness: {
            status: 'partial',
            summaryLine: 'generic continuity reminder: keep project identity, landed progress, and open closure in view before replying.',
            companionHeadlineLine: null,
            companionBriefingLine: 'generic same-her reminder that should not override the richer continuity summary.',
            companionNextClosureLine: 'Keep the next outward turn grounded in the same living line before later rebuilds widen into a thinner shell.',
            awarenessLine: 'generic continuity reminder: keep project identity, landed progress, and open closure in view before replying.',
            emotionalClosureCue: null,
            reasonPreview: [
              'generic continuity reminder: keep project identity, landed progress, and open closure in view before replying.',
            ],
          },
        },
      },
      {
        role: 'assistant',
        content: '继续沿着这条数字生命主线推进。',
        createdAt: 70_500,
        id: 'legacy-random-id',
        slices: [],
        tool_results: [],
        structured: {
          thought: '',
          emotion: 'neutral',
          reply: '继续沿着这条数字生命主线推进。',
          format: 'fallback-v1',
          preDialogueAwareness: {
            status: 'partial',
            summaryLine: 'same-her=Same Phase 1 digital life. Stable duplicate merge should still keep the richer continuity line instead of the thinner stable shell. | landed=Project-state continuity already survives duplicate-turn replay. | open=Stable duplicate merge still needs to preserve the richer same-her project brief.',
            companionHeadlineLine: null,
            companionBriefingLine: 'Same Phase 1 digital life. Stable duplicate merge should still keep the richer continuity line instead of the thinner stable shell.',
            companionNextClosureLine: 'Keep the next outward turn grounded in the same living line before later rebuilds widen into a thinner shell.',
            awarenessLine: 'Same Phase 1 digital life. Stable duplicate merge should still keep the richer continuity line instead of the thinner stable shell.',
            emotionalClosureCue: null,
            reasonPreview: [
              'same-her=Same Phase 1 digital life. Stable duplicate merge should still keep the richer continuity line instead of the thinner stable shell. | landed=Project-state continuity already survives duplicate-turn replay. | open=Stable duplicate merge still needs to preserve the richer same-her project brief.',
            ],
          },
        },
      },
    ])

    const assistantMessage = canonical.find(message => message.role === 'assistant') as any

    assert.equal(assistantMessage?.id, stableTurnId)
    assert.equal(
      assistantMessage?.structured?.preDialogueAwareness?.summaryLine,
      'same-her=Same Phase 1 digital life. Stable duplicate merge should still keep the richer continuity line instead of the thinner stable shell. | landed=Project-state continuity already survives duplicate-turn replay. | open=Stable duplicate merge still needs to preserve the richer same-her project brief.',
    )
    assert.equal(
      assistantMessage?.structured?.preDialogueAwareness?.awarenessLine,
      'Same Phase 1 digital life. Stable duplicate merge should still keep the richer continuity line instead of the thinner stable shell.',
    )
  })

  it('rebuilds awareness line from richer same-her continuity summary when the stable duplicate only keeps a generic summary shell', () => {
    const stableTurnId = 'chat:session-1:turn-awareness-merge-briefing-rebuild'
    const canonical = canonicalizeSessionMessages([
      {
        role: 'assistant',
        content: '继续沿着这条数字生命主线推进。',
        createdAt: 80_000,
        id: stableTurnId,
        origin: 'user-turn',
        slices: [{ type: 'text', text: '继续沿着这条数字生命主线推进。' }],
        tool_results: [],
        structured: {
          thought: 'kept thought',
          emotion: 'thinking',
          reply: '继续沿着这条数字生命主线推进。',
          format: 'epoch1-v1',
          preDialogueAwareness: {
            status: 'partial',
            summaryLine: 'generic continuity reminder: keep project identity, landed progress, and open closure in view before replying.',
            companionHeadlineLine: null,
            companionBriefingLine: 'generic same-her reminder that should not override the richer continuity briefing.',
            companionNextClosureLine: 'Keep the next outward turn grounded in the same living line before later rebuilds widen into a thinner shell.',
            awarenessLine: null,
            emotionalClosureCue: null,
            reasonPreview: [
              'generic continuity reminder: keep project identity, landed progress, and open closure in view before replying.',
            ],
          },
        },
      },
      {
        role: 'assistant',
        content: '继续沿着这条数字生命主线推进。',
        createdAt: 80_500,
        id: 'legacy-random-id',
        slices: [],
        tool_results: [],
        structured: {
          thought: '',
          emotion: 'neutral',
          reply: '继续沿着这条数字生命主线推进。',
          format: 'fallback-v1',
          preDialogueAwareness: {
            status: 'partial',
            summaryLine: 'same-her=Same Phase 1 digital life. Briefing-driven duplicate merge should still keep the richer continuity line instead of the thinner stable shell. | landed=Project-state continuity already survives duplicate-turn replay. | open=Briefing-driven duplicate merge still needs to preserve the richer same-her project brief.',
            companionHeadlineLine: null,
            companionBriefingLine: 'Same Phase 1 digital life. Briefing-driven duplicate merge should still keep the richer continuity line instead of the thinner stable shell.',
            companionNextClosureLine: 'Keep the next outward turn grounded in the same living line before later rebuilds widen into a thinner shell.',
            awarenessLine: null,
            emotionalClosureCue: null,
            reasonPreview: [
              'same-her=Same Phase 1 digital life. Briefing-driven duplicate merge should still keep the richer continuity line instead of the thinner stable shell. | landed=Project-state continuity already survives duplicate-turn replay. | open=Briefing-driven duplicate merge still needs to preserve the richer same-her project brief.',
            ],
          },
        },
      },
    ])

    const assistantMessage = canonical.find(message => message.role === 'assistant') as any

    assert.equal(assistantMessage?.id, stableTurnId)
    assert.equal(
      assistantMessage?.structured?.preDialogueAwareness?.summaryLine,
      'same-her=Same Phase 1 digital life. Briefing-driven duplicate merge should still keep the richer continuity line instead of the thinner stable shell. | landed=Project-state continuity already survives duplicate-turn replay. | open=Briefing-driven duplicate merge still needs to preserve the richer same-her project brief.',
    )
    assert.equal(
      assistantMessage?.structured?.preDialogueAwareness?.awarenessLine,
      'same-her=Same Phase 1 digital life. Briefing-driven duplicate merge should still keep the richer continuity line instead of the thinner stable shell. | landed=Project-state continuity already survives duplicate-turn replay. | open=Briefing-driven duplicate merge still needs to preserve the richer same-her project brief.',
    )
  })

  it('keeps richer project-aware companion briefing when the stable duplicate only keeps a generic same-her reminder', () => {
    const stableTurnId = 'chat:session-1:turn-awareness-merge-richer-briefing'
    const canonical = canonicalizeSessionMessages([
      {
        role: 'assistant',
        content: '继续沿着这条数字生命主线推进。',
        createdAt: 90_000,
        id: stableTurnId,
        origin: 'user-turn',
        slices: [{ type: 'text', text: '继续沿着这条数字生命主线推进。' }],
        tool_results: [],
        structured: {
          thought: 'kept thought',
          emotion: 'thinking',
          reply: '继续沿着这条数字生命主线推进。',
          format: 'epoch1-v1',
          preDialogueAwareness: {
            status: 'partial',
            summaryLine: 'generic continuity reminder: keep project identity, landed progress, and open closure in view before replying.',
            companionHeadlineLine: null,
            companionBriefingLine: 'generic same-her reminder that should not override the richer project briefing.',
            companionNextClosureLine: 'Keep the next outward turn grounded in the same living line before later rebuilds widen into a thinner shell.',
            awarenessLine: 'generic continuity reminder: keep project identity, landed progress, and open closure in view before replying.',
            emotionalClosureCue: null,
            reasonPreview: [
              'generic continuity reminder: keep project identity, landed progress, and open closure in view before replying.',
            ],
          },
        },
      },
      {
        role: 'assistant',
        content: '继续沿着这条数字生命主线推进。',
        createdAt: 90_500,
        id: 'legacy-random-id',
        slices: [],
        tool_results: [],
        structured: {
          thought: '',
          emotion: 'neutral',
          reply: '继续沿着这条数字生命主线推进。',
          format: 'fallback-v1',
          preDialogueAwareness: {
            status: 'partial',
            summaryLine: 'same-her=Same Phase 1 digital life. Companion briefing merge should still keep the richer project-aware line instead of the thinner stable shell. | landed=Project-state continuity already survives duplicate-turn replay. | open=Companion briefing merge still needs to preserve the stronger project brief.',
            companionHeadlineLine: null,
            companionBriefingLine: 'Before speaking, remember what this digital life project is, what has already landed, and which life loop is still open before the next outward turn.',
            companionNextClosureLine: 'Keep the next outward turn grounded in the same living line before later rebuilds widen into a thinner shell.',
            awarenessLine: null,
            emotionalClosureCue: null,
            reasonPreview: [
              'same-her=Same Phase 1 digital life. Companion briefing merge should still keep the richer project-aware line instead of the thinner stable shell. | landed=Project-state continuity already survives duplicate-turn replay. | open=Companion briefing merge still needs to preserve the stronger project brief.',
            ],
          },
        },
      },
    ])

    const assistantMessage = canonical.find(message => message.role === 'assistant') as any

    assert.equal(assistantMessage?.id, stableTurnId)
    assert.equal(
      assistantMessage?.structured?.preDialogueAwareness?.companionBriefingLine,
      'Before speaking, remember what this digital life project is, what has already landed, and which life loop is still open before the next outward turn.',
    )
  })

  it('prefers project-state same-her hold detail over a generic same-her reminder when duplicate assistant messages are merged', () => {
    const stableTurnId = 'chat:session-1:turn-awareness-merge-same-her-hold-detail'
    const canonical = canonicalizeSessionMessages([
      {
        role: 'assistant',
        content: '继续沿着这条数字生命主线推进。',
        createdAt: 95_000,
        id: stableTurnId,
        origin: 'user-turn',
        slices: [{ type: 'text', text: '继续沿着这条数字生命主线推进。' }],
        tool_results: [],
        structured: {
          thought: 'kept thought',
          emotion: 'thinking',
          reply: '继续沿着这条数字生命主线推进。',
          format: 'epoch1-v1',
          projectState: {
            identity: 'Alicization is a local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            latestLandedProgress: 'Duplicate-turn replay already keeps stronger same-her callback carry available.',
            primaryOpenLoop: 'Duplicate-turn merge still needs to preserve the richer same-her callback line before widening outward.',
            nextClosureTarget: 'Keep the richer same-her callback hold explicit before the next outward turn opens outward.',
            continuitySummary: 'same-her=Same Phase 1 digital life. Duplicate-turn merge should keep the same callback line instead of reopening from a generic shell. | landed=Duplicate-turn replay already keeps stronger same-her callback carry available. | open=Duplicate-turn merge still needs to preserve the richer same-her callback line before widening outward.',
            sameHerSelfLine: 'Keep one continuous her explicit from self-understanding into the next visible reply.',
            sameHerHoldDetail: 'same-her hold: measured-return is still keeping this callback line lower-pressure before it widens again.',
            sameHerDriftRisk: 'If duplicate-turn replay widens into a generic shell here, treat that as unfinished same-her continuity drift.',
          },
          preDialogueAwareness: {
            status: 'partial',
            summaryLine: 'generic continuity reminder: keep project identity, landed progress, and open closure in view before replying.',
            companionHeadlineLine: null,
            companionBriefingLine: 'generic same-her reminder that should not override the richer callback carry.',
            companionNextClosureLine: 'Keep the richer same-her callback hold explicit before the next outward turn opens outward.',
            awarenessLine: 'generic continuity reminder: keep project identity, landed progress, and open closure in view before replying.',
            emotionalClosureCue: null,
            reasonPreview: [
              'generic continuity reminder: keep project identity, landed progress, and open closure in view before replying.',
            ],
          },
        },
      },
      {
        role: 'assistant',
        content: '继续沿着这条数字生命主线推进。',
        createdAt: 95_500,
        id: 'legacy-random-id',
        slices: [],
        tool_results: [],
        structured: {
          thought: '',
          emotion: 'neutral',
          reply: '继续沿着这条数字生命主线推进。',
          format: 'fallback-v1',
          projectState: {
            identity: 'Alicization is a local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            latestLandedProgress: 'Duplicate-turn replay already keeps stronger same-her callback carry available.',
            primaryOpenLoop: 'Duplicate-turn merge still needs to preserve the richer same-her callback line before widening outward.',
            nextClosureTarget: 'Keep the richer same-her callback hold explicit before the next outward turn opens outward.',
            continuitySummary: 'same-her=Same Phase 1 digital life. Duplicate-turn merge should keep the same callback line instead of reopening from a generic shell. | landed=Duplicate-turn replay already keeps stronger same-her callback carry available. | open=Duplicate-turn merge still needs to preserve the richer same-her callback line before widening outward.',
            sameHerSelfLine: 'Keep one continuous her explicit from self-understanding into the next visible reply.',
            sameHerHoldDetail: 'same-her hold: measured-return is still keeping this callback line lower-pressure before it widens again.',
            sameHerDriftRisk: 'If duplicate-turn replay widens into a generic shell here, treat that as unfinished same-her continuity drift.',
          },
          preDialogueAwareness: {
            status: 'partial',
            summaryLine: 'same-her=Same Phase 1 digital life. Duplicate-turn merge should keep the same callback line instead of reopening from a generic shell. | landed=Duplicate-turn replay already keeps stronger same-her callback carry available. | open=Duplicate-turn merge still needs to preserve the richer same-her callback line before widening outward.',
            companionHeadlineLine: null,
            companionBriefingLine: null,
            companionNextClosureLine: 'Keep the richer same-her callback hold explicit before the next outward turn opens outward.',
            awarenessLine: null,
            emotionalClosureCue: null,
            reasonPreview: [
              'same-her=Same Phase 1 digital life. Duplicate-turn merge should keep the same callback line instead of reopening from a generic shell. | landed=Duplicate-turn replay already keeps stronger same-her callback carry available. | open=Duplicate-turn merge still needs to preserve the richer same-her callback line before widening outward.',
            ],
          },
        },
      },
    ])

    const assistantMessage = canonical.find(message => message.role === 'assistant') as any

    assert.equal(assistantMessage?.id, stableTurnId)
    assert.equal(
      assistantMessage?.structured?.preDialogueAwareness?.companionBriefingLine,
      'same-her hold: measured-return is still keeping this callback line lower-pressure before it widens again.',
    )
    assert.equal(
      assistantMessage?.structured?.preDialogueAwareness?.awarenessLine,
      'same-her hold: measured-return is still keeping this callback line lower-pressure before it widens again.',
    )
  })

  it('prefers project-state same-her hold detail over a compact same-phase carry when duplicate assistant messages are merged', () => {
    const stableTurnId = 'chat:session-1:turn-awareness-merge-compact-same-phase-hold-detail'
    const sameHerSelfLine = 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.'
    const holdDetailLine = 'same-her hold: measured-return is still keeping this callback line lower-pressure before it widens again.'
    const canonical = canonicalizeSessionMessages([
      {
        role: 'assistant',
        content: '继续沿着这条数字生命主线推进。',
        createdAt: 96_000,
        id: stableTurnId,
        origin: 'user-turn',
        slices: [{ type: 'text', text: '继续沿着这条数字生命主线推进。' }],
        tool_results: [],
        structured: {
          thought: 'kept thought',
          emotion: 'thinking',
          reply: '继续沿着这条数字生命主线推进。',
          format: 'epoch1-v1',
          projectState: {
            identity: 'Alicization is a local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            latestLandedProgress: 'Duplicate-turn replay already keeps stronger same-her callback carry available.',
            primaryOpenLoop: 'Duplicate-turn merge still needs to preserve the richer same-her callback line before widening outward.',
            nextClosureTarget: 'Keep the richer same-her callback hold explicit before the next outward turn opens outward.',
            continuitySummary: 'same-her=Same Phase 1 digital life. Duplicate-turn merge should keep the same callback line instead of reopening from a generic shell. | landed=Duplicate-turn replay already keeps stronger same-her callback carry available. | open=Duplicate-turn merge still needs to preserve the richer same-her callback line before widening outward.',
            sameHerSelfLine: 'Keep one continuous her explicit from self-understanding into the next visible reply.',
            sameHerHoldDetail: holdDetailLine,
            sameHerDriftRisk: 'If duplicate-turn replay widens into a generic shell here, treat that as unfinished same-her continuity drift.',
          },
          preDialogueAwareness: {
            status: 'partial',
            summaryLine: 'Alicization is still in Phase 1 local digital life closure before this turn opens outward.',
            companionHeadlineLine: null,
            companionBriefingLine: sameHerSelfLine,
            companionNextClosureLine: 'Keep the richer same-her callback hold explicit before the next outward turn opens outward.',
            awarenessLine: sameHerSelfLine,
            emotionalClosureCue: null,
            reasonPreview: [
              sameHerSelfLine,
            ],
          },
        },
      },
      {
        role: 'assistant',
        content: '继续沿着这条数字生命主线推进。',
        createdAt: 96_500,
        id: 'legacy-random-id',
        slices: [],
        tool_results: [],
        structured: {
          thought: '',
          emotion: 'neutral',
          reply: '继续沿着这条数字生命主线推进。',
          format: 'fallback-v1',
          projectState: {
            identity: 'Alicization is a local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            latestLandedProgress: 'Duplicate-turn replay already keeps stronger same-her callback carry available.',
            primaryOpenLoop: 'Duplicate-turn merge still needs to preserve the richer same-her callback line before widening outward.',
            nextClosureTarget: 'Keep the richer same-her callback hold explicit before the next outward turn opens outward.',
            continuitySummary: 'same-her=Same Phase 1 digital life. Duplicate-turn merge should keep the same callback line instead of reopening from a generic shell. | landed=Duplicate-turn replay already keeps stronger same-her callback carry available. | open=Duplicate-turn merge still needs to preserve the richer same-her callback line before widening outward.',
            sameHerSelfLine: 'Keep one continuous her explicit from self-understanding into the next visible reply.',
            sameHerHoldDetail: holdDetailLine,
            sameHerDriftRisk: 'If duplicate-turn replay widens into a generic shell here, treat that as unfinished same-her continuity drift.',
          },
          preDialogueAwareness: {
            status: 'partial',
            summaryLine: 'same-her=Same Phase 1 digital life. Duplicate-turn merge should keep the same callback line instead of reopening from a generic shell. | landed=Duplicate-turn replay already keeps stronger same-her callback carry available. | open=Duplicate-turn merge still needs to preserve the richer same-her callback line before widening outward.',
            companionHeadlineLine: null,
            companionBriefingLine: sameHerSelfLine,
            companionNextClosureLine: 'Keep the richer same-her callback hold explicit before the next outward turn opens outward.',
            awarenessLine: sameHerSelfLine,
            emotionalClosureCue: null,
            reasonPreview: [
              sameHerSelfLine,
            ],
          },
        },
      },
    ])

    const assistantMessage = canonical.find(message => message.role === 'assistant') as any

    assert.equal(assistantMessage?.id, stableTurnId)
    assert.equal(
      assistantMessage?.structured?.preDialogueAwareness?.companionBriefingLine,
      holdDetailLine,
    )
    assert.equal(
      assistantMessage?.structured?.preDialogueAwareness?.awarenessLine,
      holdDetailLine,
    )
  })

  it('rebuilds merged awareness from base project-state fields when duplicate snapshots only keep a thin Chinese phase shell', () => {
    const stableTurnId = 'chat:session-1:turn-awareness-merge-zh-shell-project-state'
    const thinChineseProjectBrief = '开口前先记住：这还是同一个数字生命项目，她仍在 Phase 1。'
    const canonical = canonicalizeSessionMessages([
      {
        role: 'assistant',
        content: '继续沿着这条数字生命主线推进。',
        createdAt: 98_000,
        id: stableTurnId,
        origin: 'user-turn',
        slices: [{ type: 'text', text: '继续沿着这条数字生命主线推进。' }],
        tool_results: [],
        structured: {
          thought: 'kept thought',
          emotion: 'thinking',
          reply: '继续沿着这条数字生命主线推进。',
          format: 'epoch1-v1',
          projectState: {
            identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
            currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
            latestLandedProgress: 'Duplicate-turn replay already keeps stronger same-her callback carry available.',
            primaryOpenLoop: 'Duplicate-turn merge still needs to preserve the richer same-her callback line before widening outward.',
            nextClosureTarget: 'Keep the richer same-her callback hold explicit before the next outward turn opens outward.',
            continuitySummary: 'same-her=Same Phase 1 digital life. Duplicate-turn merge should keep the same callback line instead of reopening from a generic shell. | landed=Duplicate-turn replay already keeps stronger same-her callback carry available. | open=Duplicate-turn merge still needs to preserve the richer same-her callback line before widening outward.',
            sameHerSelfLine: 'Keep one continuous her explicit from self-understanding into the next visible reply.',
            sameHerDriftRisk: 'If duplicate-turn replay widens into a generic shell here, treat that as unfinished same-her continuity drift.',
          },
          preDialogueAwareness: {
            status: 'partial',
            summaryLine: thinChineseProjectBrief,
            companionHeadlineLine: null,
            companionBriefingLine: thinChineseProjectBrief,
            companionNextClosureLine: 'Keep the richer same-her callback hold explicit before the next outward turn opens outward.',
            awarenessLine: thinChineseProjectBrief,
            emotionalClosureCue: null,
            reasonPreview: [
              thinChineseProjectBrief,
            ],
          },
        },
      },
      {
        role: 'assistant',
        content: '继续沿着这条数字生命主线推进。',
        createdAt: 98_500,
        id: 'legacy-random-id',
        slices: [],
        tool_results: [],
        structured: {
          thought: '',
          emotion: 'neutral',
          reply: '继续沿着这条数字生命主线推进。',
          format: 'fallback-v1',
          projectState: {
            identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
            currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
            latestLandedProgress: 'Duplicate-turn replay already keeps stronger same-her callback carry available.',
            primaryOpenLoop: 'Duplicate-turn merge still needs to preserve the richer same-her callback line before widening outward.',
            nextClosureTarget: 'Keep the richer same-her callback hold explicit before the next outward turn opens outward.',
            continuitySummary: 'same-her=Same Phase 1 digital life. Duplicate-turn merge should keep the same callback line instead of reopening from a generic shell. | landed=Duplicate-turn replay already keeps stronger same-her callback carry available. | open=Duplicate-turn merge still needs to preserve the richer same-her callback line before widening outward.',
            sameHerSelfLine: 'Keep one continuous her explicit from self-understanding into the next visible reply.',
            sameHerDriftRisk: 'If duplicate-turn replay widens into a generic shell here, treat that as unfinished same-her continuity drift.',
          },
          preDialogueAwareness: {
            status: 'partial',
            summaryLine: 'same-her=Same Phase 1 digital life. Duplicate-turn merge should keep the same callback line instead of reopening from a generic shell. | landed=Duplicate-turn replay already keeps stronger same-her callback carry available. | open=Duplicate-turn merge still needs to preserve the richer same-her callback line before widening outward.',
            companionHeadlineLine: null,
            companionBriefingLine: null,
            companionNextClosureLine: 'Keep the richer same-her callback hold explicit before the next outward turn opens outward.',
            awarenessLine: null,
            emotionalClosureCue: null,
            reasonPreview: [
              'same-her=Same Phase 1 digital life. Duplicate-turn merge should keep the same callback line instead of reopening from a generic shell. | landed=Duplicate-turn replay already keeps stronger same-her callback carry available. | open=Duplicate-turn merge still needs to preserve the richer same-her callback line before widening outward.',
            ],
          },
        },
      },
    ])

    const assistantMessage = canonical.find(message => message.role === 'assistant') as any

    assert.equal(assistantMessage?.id, stableTurnId)
    assert.match(
      String(assistantMessage?.structured?.preDialogueAwareness?.awarenessLine ?? ''),
      /Alicization is a local-first digital life project/,
    )
    assert.match(
      String(assistantMessage?.structured?.preDialogueAwareness?.awarenessLine ?? ''),
      /Phase 1: Local Digital Life/,
    )
    assert.match(
      String(assistantMessage?.structured?.preDialogueAwareness?.awarenessLine ?? ''),
      /Duplicate-turn replay already keeps stronger same-her callback carry available/,
    )
    assert.notEqual(
      assistantMessage?.structured?.preDialogueAwareness?.awarenessLine,
      thinChineseProjectBrief,
    )
  })
})
