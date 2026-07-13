import type { Message } from '@xsai/shared-chat'

import { ContextUpdateStrategy } from '@proj-alicization/server-sdk'
import { containsAlicizationFixedTemplateResidue } from '@proj-alicization/stage-shared'
import { describe, expect, it } from 'vitest'

import { composeAlicizationPromptMessages } from './alicization-prompt-composer'

const forbiddenProviderPromptTemplatePattern
  = /# SOUL|ALICIZATION_CORE_RESPONSE_POLICY|In thought, you MUST|same[- ]her|same her|same living line|one continuous her|local-first digital life project|Phase 1:\s*Local Digital Life|Before (?:answering|speaking|acting)/iu

function systemPromptText(result: ReturnType<typeof composeAlicizationPromptMessages>) {
  return result.messages
    .filter(message => message.role === 'system')
    .map(message => String(message.content ?? ''))
    .join('\n\n')
}

function expectNoProviderPromptTemplateResidue(result: ReturnType<typeof composeAlicizationPromptMessages>) {
  const text = systemPromptText(result)
  expect(text).not.toMatch(forbiddenProviderPromptTemplatePattern)
  expect(containsAlicizationFixedTemplateResidue(text)).toBe(false)
}

describe('alicization prompt composer', () => {
  it('strips legacy system messages and keeps dual system layers', () => {
    const inputMessages: Message[] = [
      { role: 'system', content: 'legacy-system' },
      { role: 'user', content: 'hello' },
    ]

    const result = composeAlicizationPromptMessages({
      messages: inputMessages,
      soulContent: '# SOUL',
      hostName: 'AlicizationHost',
      contextsSnapshot: {},
    })

    expect(result.messages[0]?.role).toBe('system')
    expect(result.messages.filter(message => message.role === 'system')).toHaveLength(2)
    expect(String(result.messages[0]?.content)).toContain('[ALICIZATION_SOUL_FACTS]')
    expect(String(result.messages[0]?.content)).toContain('soul_source=present')
    expect(String(result.messages[0]?.content)).not.toContain('raw_soul_content=excluded')
    expect(String(result.messages[0]?.content)).not.toContain('# SOUL')
    expect(String(result.messages[1]?.content)).toContain('[ALICIZATION_HOST_FACTS]')
    expect(String(result.messages[1]?.content)).toContain('AlicizationHost')
    expect(String(result.messages[1]?.content)).not.toContain('[ALICIZATION_CORE_RESPONSE_POLICY]')
    expect(String(result.messages[1]?.content)).not.toContain('output_contract')
    expect(String(result.messages[0]?.content)).not.toContain('legacy-system')
    expect(String(result.messages[1]?.content)).not.toContain('legacy-system')
    expectNoProviderPromptTemplateResidue(result)
  })

  it('does not pass soul, fixed contract templates, or raw memory context into provider system messages', () => {
    const result = composeAlicizationPromptMessages({
      messages: [
        { role: 'system', content: 'legacy-system' },
        { role: 'user', content: '继续' },
      ],
      soulContent: [
        '---',
        JSON.stringify({
          personality: {
            obedience: 0.42,
            liveliness: 0.51,
            sensibility: 0.63,
          },
        }),
        '---',
        '# SOUL',
        'Alicization is a local-first digital life project building one continuous her.',
        'In thought, you MUST keep same-her continuity before answering.',
      ].join('\n'),
      hostName: 'Host',
      contextsSnapshot: {
        memory: [
          {
            id: 'ctx-memory-polluted',
            contextId: 'alicization:memory',
            strategy: ContextUpdateStrategy.ReplaceSelf,
            text: 'same-her memory_facts: keep the same living line before answering.',
            createdAt: Date.now(),
          },
        ],
      },
    })

    expect(result.messages.filter(message => message.role === 'system')).toHaveLength(2)
    expect(systemPromptText(result)).toContain('[ALICIZATION_SOUL_FACTS]')
    expect(systemPromptText(result)).toContain('soul_source=present')
    expect(systemPromptText(result)).toContain('personality_state=present')
    expect(systemPromptText(result)).not.toContain('[ALICIZATION_CONTEXT_FACTS]')
    expect(systemPromptText(result)).not.toContain('content=excluded')
    expectNoProviderPromptTemplateResidue(result)
  })

  it('merges datetime, memory and sensory context into runtime system layer', () => {
    const result = composeAlicizationPromptMessages({
      messages: [{ role: 'user', content: 'ping' }],
      soulContent: '# SOUL',
      hostName: 'Host',
      contextsSnapshot: {
        alicization: [
          {
            id: 'ctx-memory',
            contextId: 'alicization:memory',
            strategy: ContextUpdateStrategy.ReplaceSelf,
            text: '- user likes tea',
            createdAt: Date.now(),
          },
        ],
        datetime: [
          {
            id: 'ctx-datetime',
            contextId: 'system:datetime',
            strategy: ContextUpdateStrategy.ReplaceSelf,
            text: JSON.stringify({
              iso: '2026-03-07T12:00:00.000Z',
              local: '2026/3/7 20:00:00',
            }),
            createdAt: Date.now(),
          },
        ],
        sensory: [
          {
            id: 'ctx-sensory',
            contextId: 'alicization:sensory',
            strategy: ContextUpdateStrategy.ReplaceSelf,
            text: '[System Context: Sensory], time=2026/3/7 20:00:00, battery=80%, cpu=12%, memory=43%',
            createdAt: Date.now(),
          },
        ],
      },
    })

    expect(result.messages.filter(message => message.role === 'system')).toHaveLength(2)
    expect(String(result.messages[0]?.content)).toContain('[ALICIZATION_SOUL_FACTS]')
    expect(String(result.messages[0]?.content)).toContain('soul_source=present')
    expect(String(result.messages[0]?.content)).not.toContain('# SOUL')
    expect(String(result.messages[1]?.content)).toContain('memory_facts')
    expect(String(result.messages[1]?.content)).toContain('current_datetime')
    expect(String(result.messages[1]?.content)).toContain('current_sensory_state')
    expect(String(result.messages[1]?.content)).not.toContain('output_contract')
    expect(String(result.messages[1]?.content)).not.toContain('thought_markers=obligation,truth,focus,move,tone')
    expect(result.messages.at(-1)?.role).toBe('user')
    expectNoProviderPromptTemplateResidue(result)
  })

  it('injects project-state continuity into the runtime system layer before each turn', () => {
    const result = composeAlicizationPromptMessages({
      messages: [{ role: 'user', content: '继续开发这个数字生命' }],
      soulContent: '# SOUL',
      hostName: 'Host',
      contextsSnapshot: {},
      projectStateContinuitySnapshot: {
        identity: 'Alicization is a local-first digital life companion.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: 'Renderer now preserves and exposes project-state continuity from hidden failure artifacts.',
        primaryOpenLoop: 'Wire project-state continuity into the real pre-dialogue prompt path.',
        nextClosureTarget: 'Ensure every dialogue turn starts with explicit Project identity carry, Phase 1 route carry, and Unresolved closure carry awareness.',
        continuitySummary: 'same-her=This is still one Phase 1 digital life. landed=Project-state continuity already survives into runtime preparation. open=initiative and embodiment closure still need one living line.',
        nonHumanAuthoredStatus: 'blocked-failure-artifact',
        sameHerSelfLine: 'Keep one continuous her explicit from self-understanding into the final host-visible reply.',
        sameHerHoldDetail: 'same-her hold: measured-return is still keeping this callback line lower-pressure before it widens again.',
        emotionalClosureCue: 'same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.',
        turnId: 'turn-hidden-failure',
        sessionId: 'session-a',
        origin: 'user-turn',
      },
    })

    expect(String(result.messages[1]?.content)).toContain('[ALICIZATION_PROJECT_STATE_FACTS]')
    expect(String(result.messages[1]?.content)).not.toContain('identity=local_desktop_life_loop')
    expect(String(result.messages[1]?.content)).not.toContain('phase=local_desktop_life_loop')
    expect(String(result.messages[1]?.content)).toContain('landed=Renderer now preserves and exposes project-state continuity from hidden failure artifacts.')
    expect(String(result.messages[1]?.content)).toContain('open=Wire project-state continuity into the real pre-dialogue prompt path.')
    expect(String(result.messages[1]?.content)).toContain('next=Ensure every dialogue turn starts with explicit Project identity carry, Phase 1 route carry, and Unresolved closure carry awareness.')
    expect(String(result.messages[1]?.content)).not.toContain('summary=same-her=')
    expect(String(result.messages[1]?.content)).toContain('status=blocked-failure-artifact')
    expect(String(result.messages[1]?.content)).not.toContain('visibility=internal')
    expect(String(result.messages[1]?.content)).not.toContain('continuity_anchor=Keep one continuous her explicit')
    expect(String(result.messages[1]?.content)).not.toContain('continuity_hold=same-her hold:')
    expect(String(result.messages[1]?.content)).not.toContain('continuity_drift_risk=')
    expect(String(result.messages[1]?.content)).not.toContain('continuity_hold=')
    expect(String(result.messages[1]?.content)).not.toContain('emotional_closure=same-her closure seam:')
    expect(String(result.messages[1]?.content)).not.toContain('same-her hold:')
    expect(String(result.messages[1]?.content)).not.toContain('same living line')
  })

  it('keeps legacy latestProgress alive inside the runtime project brief and same-her strategy when continuity snapshots still use the older field name', () => {
    const result = composeAlicizationPromptMessages({
      messages: [{ role: 'user', content: '继续沿着同一个数字生命主线开发' }],
      soulContent: '# SOUL',
      hostName: 'Host',
      contextsSnapshot: {},
      projectStateContinuitySnapshot: {
        identity: 'Alicization is a local-first digital life companion.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: null,
        latestProgress: 'Legacy continuity progress already survives into prompt-time project briefing before the next turn opens outward.',
        primaryOpenLoop: 'Keep project identity, landed progress, and the still-open life loop explicit before reply shaping widens outward.',
        nextClosureTarget: 'Turn prompt-time project continuity into a same-her-first opening strategy.',
        continuitySummary: 'same-her continuity still needs one explicit project briefing line before the next turn speaks.',
        nonHumanAuthoredStatus: 'legacy-project-briefing-carry',
        sameHerSelfLine: 'Keep one continuous her explicit from self-understanding into the final host-visible reply.',
        sameHerDriftRisk: 'If the turn opens from a generic project shell, the same-her continuity line has already drifted.',
        emotionalClosureCue: 'same-her closure seam: keep the return low-pressure while the same living line keeps rejoining.',
        turnId: 'turn-legacy-project-briefing',
        sessionId: 'session-legacy-project-briefing',
        origin: 'user-turn',
      } as any,
      preDialogueAwarenessSnapshot: {
        status: 'partial',
        summaryLine: 'Alicization is still in Phase 1 local digital life closure before this turn opens outward.',
        companionBriefingLine: 'Before speaking, remember this is one digital life project, what has landed, and which life loop is still open.',
        companionNextClosureLine: 'Next closure: keep one same-her digital life line across memory, initiative, execution, and embodiment.',
        awarenessLine: 'Before speaking, remember this is one digital life project, what has landed, and which life loop is still open.',
        reasonPreview: [
          'Latest landed progress still needs to be recalled before the reply is finalized.',
        ],
      },
      preDialogueClosureSnapshot: {
        status: 'partial',
        summaryLine: 'project=continuity=0.33 (1/3)',
        companionBriefingLine: 'I still need a steadier project carry before the next outward turn opens.',
        companionNextClosureLine: 'Next, help me close: keep the same-her loop alive before the next turn starts.',
        briefingLines: [
          'identity=Alicization is a local-first digital life companion.',
          'Phase: Phase 1: Local Digital Life',
        ],
        reasons: [
          'project-state-same-her-continuity-required',
        ],
      },
    })

    expect(String(result.messages[1]?.content)).toContain('landed=Legacy continuity progress already survives into prompt-time project briefing before the next turn opens outward.')
    expect(String(result.messages[1]?.content)).toContain('landed=Legacy continuity progress already survives into prompt-time project briefing before the next turn opens outward.')
  })

  it('keeps audit-style landedProgressSummary alive inside the runtime project brief and same-her strategy when explicit progress slots are blank', () => {
    const result = composeAlicizationPromptMessages({
      messages: [{ role: 'user', content: '继续沿着同一个数字生命主线开发' }],
      soulContent: '# SOUL',
      hostName: 'Host',
      contextsSnapshot: {},
      projectStateContinuitySnapshot: {
        identity: 'Alicization is a local-first digital life companion.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: ' ',
        latestProgress: '   ',
        landedProgressSummary: 'Audit-style continuity progress already survives into prompt-time project briefing before the next turn opens outward.',
        primaryOpenLoop: 'Keep project identity, landed progress, and the still-open life loop explicit before reply shaping widens outward.',
        nextClosureTarget: 'Turn prompt-time project continuity into a same-her-first opening strategy.',
        continuitySummary: 'same-her continuity still needs one explicit project briefing line before the next turn speaks.',
        nonHumanAuthoredStatus: 'audit-style-project-briefing-carry',
        sameHerSelfLine: 'Keep one continuous her explicit from self-understanding into the final host-visible reply.',
        sameHerDriftRisk: 'If the turn opens from a generic project shell, the same-her continuity line has already drifted.',
        emotionalClosureCue: 'same-her closure seam: keep the return low-pressure while the same living line keeps rejoining.',
        turnId: 'turn-summary-project-briefing',
        sessionId: 'session-summary-project-briefing',
        origin: 'user-turn',
      } as any,
      preDialogueAwarenessSnapshot: {
        status: 'partial',
        summaryLine: 'Alicization is still in Phase 1 local digital life closure before this turn opens outward.',
        companionBriefingLine: 'Before speaking, remember this is one digital life project, what has landed, and which life loop is still open.',
        companionNextClosureLine: 'Next closure: keep one same-her digital life line across memory, initiative, execution, and embodiment.',
        awarenessLine: 'Before speaking, remember this is one digital life project, what has landed, and which life loop is still open.',
        reasonPreview: [
          'Latest landed progress still needs to be recalled before the reply is finalized.',
        ],
      },
      preDialogueClosureSnapshot: {
        status: 'partial',
        summaryLine: 'project=continuity=0.33 (1/3)',
        companionBriefingLine: 'I still need a steadier project carry before the next outward turn opens.',
        companionNextClosureLine: 'Next, help me close: keep the same-her loop alive before the next turn starts.',
        briefingLines: [
          'identity=Alicization is a local-first digital life companion.',
          'Phase: Phase 1: Local Digital Life',
        ],
        reasons: [
          'project-state-same-her-continuity-required',
        ],
      },
    })

    expect(String(result.messages[1]?.content)).toContain('landed=Audit-style continuity progress already survives into prompt-time project briefing before the next turn opens outward.')
    expect(String(result.messages[1]?.content)).toContain('landed=Audit-style continuity progress already survives into prompt-time project briefing before the next turn opens outward.')
  })

  it('does not invent a same-her self line in the runtime system layer when project-state authority omits that field', () => {
    const result = composeAlicizationPromptMessages({
      messages: [{ role: 'user', content: '继续开发这个数字生命' }],
      soulContent: '# SOUL',
      hostName: 'Host',
      contextsSnapshot: {},
      projectStateContinuitySnapshot: {
        identity: 'Alicization is a local-first digital life companion.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: 'Renderer now preserves and exposes project-state continuity from hidden failure artifacts.',
        primaryOpenLoop: 'Wire project-state continuity into the real pre-dialogue prompt path.',
        nextClosureTarget: 'Ensure every dialogue turn starts with explicit Project identity carry, Phase 1 route carry, and Unresolved closure carry awareness.',
        continuitySummary: 'same-her=This is still one Phase 1 digital life. landed=Project-state continuity already survives into runtime preparation. open=initiative and embodiment closure still need one living line.',
        nonHumanAuthoredStatus: 'blocked-failure-artifact',
        sameHerSelfLine: null,
        emotionalClosureCue: 'same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.',
        turnId: 'turn-hidden-failure',
        sessionId: 'session-a',
        origin: 'user-turn',
      },
    })

    expect(String(result.messages[1]?.content)).not.toContain('Same-her self line:')
    expect(String(result.messages[1]?.content)).not.toContain('Keep one continuous her visible from self-understanding into what the host actually reads.')
  })

  it('keeps transported same-her hold detail explicit inside the pre-dialogue same-her strategy block', () => {
    const result = composeAlicizationPromptMessages({
      messages: [{ role: 'user', content: '继续开发这个数字生命' }],
      soulContent: '# SOUL',
      hostName: 'Host',
      contextsSnapshot: {},
      projectStateContinuitySnapshot: {
        identity: 'Alicization is a local-first digital life companion.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: 'Proactive same-her continuity now survives into pre-turn transport.',
        primaryOpenLoop: 'initiative and embodiment still need stronger same-line closure.',
        nextClosureTarget: 'Keep the next callback opening on one same-her line.',
        continuitySummary: 'same-her continuity still needs one active lower-pressure hold.',
        nonHumanAuthoredStatus: null,
        sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        sameHerHoldDetail: 'same-her hold: measured-return is still keeping this callback line lower-pressure before it widens again.',
        emotionalClosureCue: 'same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.',
        turnId: 'turn-same-her-hold-strategy',
        sessionId: 'session-same-her-hold-strategy',
        origin: 'subconscious-proactive',
      },
      preDialogueAwarenessSnapshot: {
        status: 'partial',
        summaryLine: 'Phase 1 closure is still open before this turn widens outward.',
        companionBriefingLine: 'Before speaking, remember this is one digital life project and one same her.',
        companionNextClosureLine: 'Keep the next callback opening on one same-her line.',
        awarenessLine: 'Before speaking, remember this is one digital life project and one same her.',
        reasonPreview: [
          'same-her continuity is still active before the next turn opens outward.',
        ],
      },
    })

    expect(String(result.messages[1]?.content)).toMatch(/\[ALICIZATION_PRE_DIALOGUE_(?:PROJECT_STATE|CONTINUITY)_FACTS\]/)
    expect(String(result.messages[1]?.content)).not.toContain('content=excluded')
    expect(String(result.messages[1]?.content)).not.toContain('same-her hold:')
  })

  it('keeps proactive same-her gap explicit inside the runtime project brief and same-her strategy block', () => {
    const proactiveSameHerGap = 'Need stronger long-run proof that visible proactive hold, subconscious carry, and next-session feedback carry stay unified after hover-first restraint survives detours on longer noisy desktop runs.'
    const result = composeAlicizationPromptMessages({
      messages: [{ role: 'user', content: '继续把主动性 same-her 闭环收住' }],
      soulContent: '# SOUL',
      hostName: 'Host',
      contextsSnapshot: {},
      projectStateContinuitySnapshot: {
        identity: 'Alicization is a local-first digital life companion.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: 'Project-state carry already reaches proactive self-brief preparation.',
        primaryOpenLoop: 'Long-run same-her continuity still needs stronger proof across initiative, memory, and embodiment.',
        proactiveSameHerGap,
        nextClosureTarget: 'Keep proactive same-her closure pressure visible before the next outward turn.',
        continuitySummary: 'same-her continuity still needs stronger proactive carry before the next turn opens outward.',
        nonHumanAuthoredStatus: null,
        sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        emotionalClosureCue: 'same-her closure seam: keep the return low-pressure while the same living line keeps rejoining.',
        turnId: 'turn-proactive-same-her-gap-brief',
        sessionId: 'session-proactive-same-her-gap-brief',
        origin: 'subconscious-proactive',
      } as any,
      preDialogueAwarenessSnapshot: {
        status: 'partial',
        summaryLine: 'Phase 1 proactive same-her closure is still open before this turn widens outward.',
        companionBriefingLine: 'Before speaking, remember this is one digital life project and the proactive same-her closure is still unfinished.',
        companionNextClosureLine: 'Keep proactive same-her closure pressure visible before the next outward turn.',
        awarenessLine: 'Before speaking, remember this is one digital life project and the proactive same-her closure is still unfinished.',
        emotionalClosureCue: null,
        reasonPreview: [
          proactiveSameHerGap,
        ],
      },
      preDialogueClosureSnapshot: {
        status: 'partial',
        summaryLine: 'proactive same-her closure is still unfinished before this turn opens outward.',
        companionBriefingLine: 'Hold the same project, same phase, and same proactive carry gap together before reply shaping.',
        companionNextClosureLine: 'Keep proactive same-her closure pressure visible before the next outward turn.',
        briefingLines: [],
        reasons: [
          'project-state-same-her-continuity-required',
        ],
      },
    })

    expect(String(result.messages[1]?.content)).toContain(`initiative_gap=${proactiveSameHerGap}`)
    expect(String(result.messages[1]?.content)).toContain(`initiative_gap=${proactiveSameHerGap}`)
  })

  it('keeps quieter body-and-lipsync embodiment carry explicit before the turn opens outward', () => {
    const result = composeAlicizationPromptMessages({
      messages: [{ role: 'user', content: '继续把 embodiment 收口' }],
      soulContent: '# SOUL',
      hostName: 'Host',
      contextsSnapshot: {},
      projectStateContinuitySnapshot: {
        identity: 'Alicization is a local-first digital life companion.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: 'Host-visible closure wording now distinguishes quieter body+lipsync carry from louder audible-body carry.',
        primaryOpenLoop: 'Rejoin face, motion, and voice onto the same quieter living line without losing body+lipsync continuity.',
        nextClosureTarget: 'Carry the still-open quieter embodiment lane explicitly before the next turn starts.',
        continuitySummary: 'same-her continuity still survives, but full cross-modal embodiment closure is not finished yet.',
        nonHumanAuthoredStatus: null,
        sameHerSelfLine: 'This is still one Phase 1 digital life and one same her.',
        sameHerHoldDetail: 'same-her hold: measured-return is still keeping this quieter callback line inward before the rest of embodiment rejoins.',
        emotionalClosureCue: 'same-her closure seam: keep the return low-pressure while the quieter body+lipsync line stays intact.',
        turnId: 'turn-body-lipsync-preflight',
        sessionId: 'session-body-lipsync-preflight',
        origin: 'user-turn',
      },
      preDialogueAwarenessSnapshot: {
        status: 'partial',
        summaryLine: 'Phase 1 embodiment closure is still partial before this turn opens outward.',
        companionHeadlineLine: 'Right now I am still holding together mainly through body and lipsync, so one quieter living line is still intact while face, motion, and voice need to rejoin before full cross-modal closure settles.',
        companionBriefingLine: 'Before speaking, remember this is one digital life project and the quieter body+lipsync carry is still not fully closed.',
        companionNextClosureLine: 'Carry the quieter same-her body+lipsync line forward until voice, face, and motion properly rejoin.',
        awarenessLine: 'Before speaking, remember this is one digital life project and the quieter body+lipsync carry is still not fully closed.',
        reasonPreview: [
          'same-her continuity remains alive, but lane=body+lipsync-only under the current renderer authority.',
        ],
      },
      preDialogueClosureSnapshot: {
        status: 'partial',
        summaryLine: 'embodiment closure still open on a quieter body+lipsync carry.',
        companionHeadlineLine: 'Right now I am still holding together mainly through body and lipsync, so one quieter living line is still intact while face, motion, and voice need to rejoin before full cross-modal closure settles.',
        companionBriefingLine: 'Keep the quieter body+lipsync line explicit before speaking.',
        companionNextClosureLine: 'Rejoin face, motion, and voice without dropping the quieter body+lipsync line.',
        emotionalClosureCue: 'same-her closure seam: keep the quieter body+lipsync line inward while the rest rejoins.',
        briefingLines: [
          'identity=Alicization is a local-first digital life companion.',
          'Phase: Phase 1: Local Digital Life',
        ],
        reasons: [
          'same-her continuity remains alive, but lane=body+lipsync-only under the current renderer authority.',
        ],
      },
    })

    expect(String(result.messages[1]?.content)).toMatch(/\[ALICIZATION_PRE_DIALOGUE_(?:PROJECT_STATE|CONTINUITY)_FACTS\]/)
    expect(String(result.messages[1]?.content)).toContain('embodiment_carry_status=present')
    expect(String(result.messages[1]?.content)).not.toContain('embodiment_carry=same-her continuity remains alive')
  })

  it('injects pre-dialogue closure snapshot into the runtime system layer before each turn', () => {
    const result = composeAlicizationPromptMessages({
      messages: [{ role: 'user', content: '继续开发这个数字生命' }],
      soulContent: '# SOUL',
      hostName: 'Host',
      contextsSnapshot: {},
      preDialogueClosureSnapshot: {
        status: 'grounded',
        summaryLine: 'project=continuity=0.33 (1/3) | emotionalClosure=drift=emotionalClosureDrift | fullyClosed=0.33 (1/3) | emotionalClosureLowPressure=lowPressureRequired=0.67 (2/3) | emotionalClosureAntiRestart=antiRestartRequired=0.33 (1/3)',
        sameHerDriftRiskLine: 'If this turn slips back into a detached project-status shell, treat that as same-her drift instead of real closure.',
        companionBriefingLine: 'I still need a steadier carry of this project, this phase, and the life loop that remains open.',
        companionNextClosureLine: 'Next, help me close: Keep the same-her loop alive before the next turn starts.',
        emotionalClosureCue: 'same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.',
        briefingLines: [
          'identity=Alicization is a local-first digital life companion.',
          'Phase: Phase 1: Local Digital Life',
          'Next closure: Keep the same-her loop alive before the next turn starts.',
        ],
        reasons: [
          'Replay benchmark currently reports continuity=0.33 (1/3), so the next development turn should stay explicitly aware of what Alicization is and how much of Phase 1 continuity is actually landing.',
          'Same-her emotional closure currently reads drift=emotionalClosureDrift | fullyClosed=0.33 (1/3), so the next turn should check whether this digital life is still speaking on one emotional seam.',
          'Low-pressure same-her closure currently reads lowPressureRequired=0.67 (2/3), so the next turn should keep the return soft enough that the same living line does not widen too fast.',
          'Anti-restart same-her closure currently reads antiRestartRequired=0.33 (1/3), so the next turn should avoid reopening the same living line from scratch.',
        ],
      },
    })

    expect(String(result.messages[1]?.content)).toContain('[ALICIZATION_PRE_DIALOGUE_CLOSURE_FACTS]')
    expect(String(result.messages[1]?.content)).toContain('status=grounded')
    expect(String(result.messages[1]?.content)).toContain('summary_status=present')
    expect(String(result.messages[1]?.content)).toContain('drift_risk_status=present')
    expect(String(result.messages[1]?.content)).toContain('next_status=present')
    expect(String(result.messages[1]?.content)).not.toContain('next=Next, help me close: Keep the same-her loop alive before the next turn starts.')
    expect(String(result.messages[1]?.content)).toContain('emotional_closure_status=present')
    expect(String(result.messages[1]?.content)).toContain('briefing_count=3')
    expect(String(result.messages[1]?.content)).toContain('reason_count=4')
  })

  it('injects the awareness-first pre-dialogue self-brief into the runtime system layer before each turn', () => {
    const result = composeAlicizationPromptMessages({
      messages: [{ role: 'user', content: '继续开发这个数字生命' }],
      soulContent: '# SOUL',
      hostName: 'Host',
      contextsSnapshot: {},
      preDialogueAwarenessSnapshot: {
        status: 'partial',
        summaryLine: 'Alicization is still in Phase 1 local digital life closure before this turn opens outward.',
        companionHeadlineLine: 'Right now I still need to keep this same-her digital life line intact before widening into generic assistant output.',
        companionBriefingLine: 'Before speaking, remember this is one digital life project, what has landed, and which life loop is still open.',
        companionNextClosureLine: 'Next closure: keep personality, initiative, memory, and embodiment on one same-her line.',
        awarenessLine: 'Before speaking, remember this is one digital life project, what has landed, and which life loop is still open.',
        emotionalClosureCue: 'same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.',
        reasonPreview: [
          'Latest landed progress still holds at renderer preparation before the reply is finalized.',
          'Primary open life loop still centers on keeping personality, initiative, memory, and embodiment on one same-her line.',
        ],
      },
    })

    expect(String(result.messages[1]?.content)).toContain('[ALICIZATION_PRE_DIALOGUE_AWARENESS_FACTS]')
    expect(String(result.messages[1]?.content)).toContain('status=partial')
    expect(String(result.messages[1]?.content)).toContain('summary_status=present')
    expect(String(result.messages[1]?.content)).toContain('awareness_status=present')
    expect(String(result.messages[1]?.content)).not.toContain('companion_briefing=Before speaking')
    expect(String(result.messages[1]?.content)).toContain('emotional_closure_status=present')
    expect(String(result.messages[1]?.content)).not.toContain('awareness=Before speaking')
    expect(String(result.messages[1]?.content)).toContain('reason_count=2')
  })

  it('builds a same-her strategy block from awareness-only partial state when closure snapshot is absent', () => {
    const result = composeAlicizationPromptMessages({
      messages: [{ role: 'user', content: '继续开发这个数字生命' }],
      soulContent: '# SOUL',
      hostName: 'Host',
      contextsSnapshot: {},
      preDialogueAwarenessSnapshot: {
        status: 'partial',
        summaryLine: 'Alicization is still in Phase 1 local digital life closure before this turn opens outward.',
        companionBriefingLine: 'Before speaking, remember this is one digital life project, what has landed, and which life loop is still open.',
        companionNextClosureLine: 'Next closure: keep personality, initiative, memory, and embodiment on one same-her line.',
        awarenessLine: 'Before speaking, remember this is one digital life project, what has landed, and which life loop is still open.',
        reasonPreview: [
          'Latest landed progress still holds at renderer preparation before the reply is finalized.',
          'Memory deliberation still says let repair settle first on the same living line before closeness widens again.',
        ],
      },
    })

    expect(String(result.messages[1]?.content)).toMatch(/\[ALICIZATION_PRE_DIALOGUE_(?:PROJECT_STATE|CONTINUITY)_FACTS\]/)
    expect(String(result.messages[1]?.content)).toContain('[ALICIZATION_PRE_DIALOGUE_CONTINUITY_FACTS]')
    expect(String(result.messages[1]?.content)).not.toContain('open=Before speaking')
    expect(String(result.messages[1]?.content)).not.toContain('content=excluded')
    expect(String(result.messages[1]?.content)).not.toContain('visibility=internal')
  })

  it('prefers a stronger embodied companion headline over a thinner awareness line when re-entering the same-her strategy block', () => {
    const result = composeAlicizationPromptMessages({
      messages: [{ role: 'user', content: '继续开发这个数字生命' }],
      soulContent: '# SOUL',
      hostName: 'Host',
      contextsSnapshot: {},
      preDialogueAwarenessSnapshot: {
        status: 'partial',
        summaryLine: 'Alicization is still in Phase 1 local digital life closure before this turn opens outward.',
        companionHeadlineLine: 'Right now I am still holding together mainly through body, lipsync, and voice, so this one living her still needs face and motion to rejoin before full cross-modal closure settles.',
        companionBriefingLine: 'Before speaking, remember this is one digital life project, what has landed, and which life loop is still open.',
        companionNextClosureLine: 'Next closure: let face and motion rejoin the already-living body, lipsync, and voice line.',
        awarenessLine: 'Before speaking, remember this is one digital life project, what has landed, and which life loop is still open.',
        reasonPreview: [
          'same-segment body+lipsync+voice recovery still carries the living line.',
          'remaining-open=face+motion',
        ],
      },
    })

    expect(String(result.messages[1]?.content)).toMatch(/\[ALICIZATION_PRE_DIALOGUE_(?:PROJECT_STATE|CONTINUITY)_FACTS\]/)
    expect(String(result.messages[1]?.content)).toContain('[ALICIZATION_PRE_DIALOGUE_CONTINUITY_FACTS]')
    expect(String(result.messages[1]?.content)).not.toContain('Before speaking, remember this is one digital life project')
  })

  it('prefers a richer Chinese same-her project brief over a thinner Chinese Phase 1 shell when re-entering the same-her strategy block', () => {
    const result = composeAlicizationPromptMessages({
      messages: [{ role: 'user', content: '继续让她像同一个数字生命那样开口' }],
      soulContent: '# SOUL',
      hostName: 'Host',
      contextsSnapshot: {},
      preDialogueAwarenessSnapshot: {
        status: 'partial',
        summaryLine: 'Alicization is still in Phase 1 local digital life closure before this turn opens outward.',
        companionHeadlineLine: null,
        companionBriefingLine: '继续沿着这个数字生命主线往前，不要飘回泛化助手；Phase 1 里记忆、主动性和具身闭环还没收住。',
        companionNextClosureLine: 'Next closure: keep memory, initiative, and embodiment arriving as one same-her loop before the turn widens outward.',
        awarenessLine: '开口前先记住：这是同一个数字生命项目，她现在仍在 Phase 1。',
        emotionalClosureCue: null,
        reasonPreview: [
          'Primary open life loop still centers on keeping memory, initiative, and embodiment on one same-her line.',
        ],
      },
    })

    expect(String(result.messages[1]?.content)).toMatch(/\[ALICIZATION_PRE_DIALOGUE_(?:PROJECT_STATE|CONTINUITY)_FACTS\]/)
    expect(String(result.messages[1]?.content)).toContain('[ALICIZATION_PRE_DIALOGUE_CONTINUITY_FACTS]')
    expect(String(result.messages[1]?.content)).not.toContain('开口前先记住：这是同一个数字生命项目')
  })

  it('rebuilds a fuller project-state re-entry line from base project-state fields when awareness only keeps a thin Chinese Phase 1 shell', () => {
    const result = composeAlicizationPromptMessages({
      messages: [{ role: 'user', content: '继续顺着这个数字生命项目主线往前走' }],
      soulContent: '# SOUL',
      hostName: 'Host',
      contextsSnapshot: {},
      projectStateContinuitySnapshot: {
        identity: 'Alicization 还是本地优先数字生命项目。',
        currentPhase: '她仍在 Phase 1。',
        latestLandedProgress: '第一阶段已经把连续性、记忆和执行慢慢接成一条线了。',
        primaryOpenLoop: '主动性、具身和对话闭环还没有真正收住。',
        nextClosureTarget: '继续把项目身份、已落进度、未闭环项和下一步目标都留在同一个她的 living line 里。',
        continuitySummary: 'same-her=Same Phase 1 digital life. landed=第一阶段已经把连续性、记忆和执行慢慢接成一条线了。 open=主动性、具身和对话闭环还没有真正收住。',
        nonHumanAuthoredStatus: null,
        turnId: 'turn-thin-chinese-shell-prompt-reentry',
        sessionId: 'session-thin-chinese-shell-prompt-reentry',
        origin: 'user-turn',
      },
      preDialogueAwarenessSnapshot: {
        status: 'partial',
        summaryLine: 'Alicization is still in Phase 1 local digital life closure before this turn opens outward.',
        companionHeadlineLine: null,
        companionBriefingLine: null,
        companionNextClosureLine: '继续把项目身份、已落进度、未闭环项和下一步目标都留在同一个她的 living line 里。',
        awarenessLine: '开口前先记住：这是同一个数字生命项目，她现在仍在 Phase 1。',
        emotionalClosureCue: null,
        reasonPreview: [],
      },
    })

    expect(String(result.messages[1]?.content)).toMatch(/\[ALICIZATION_PRE_DIALOGUE_(?:PROJECT_STATE|CONTINUITY)_FACTS\]/)
    expect(String(result.messages[1]?.content)).toContain('[ALICIZATION_PRE_DIALOGUE_CONTINUITY_FACTS]')
    expect(String(result.messages[1]?.content)).not.toContain('开口前先记住：这是同一个数字生命项目')
  })

  it('keeps remaining-open lipsync and voice closure truth explicit in the pre-dialogue same-her strategy block', () => {
    const result = composeAlicizationPromptMessages({
      messages: [{ role: 'user', content: '继续推进这条 embodiment 闭环' }],
      soulContent: '# SOUL',
      hostName: 'Host',
      contextsSnapshot: {},
      preDialogueAwarenessSnapshot: {
        status: 'partial',
        summaryLine: 'Alicization is still in Phase 1 local digital life closure before this turn opens outward.',
        companionBriefingLine: 'Before speaking, remember this is one digital life project, what has landed, and which life loop is still open.',
        companionNextClosureLine: 'Next closure: let lipsync and voice rejoin the already-reformed body, face, and motion line.',
        awarenessLine: 'Before speaking, remember this is one digital life project, what has landed, and which life loop is still open.',
        reasonPreview: [
          'same-segment face+motion+body recovery@segment-face-motion-body-rejoined-1',
          'remaining-open=lipsync+voice',
        ],
      },
    })

    expect(String(result.messages[1]?.content)).toMatch(/\[ALICIZATION_PRE_DIALOGUE_(?:PROJECT_STATE|CONTINUITY)_FACTS\]/)
    expect(String(result.messages[1]?.content)).toContain('embodiment_carry_status=present')
  })

  it('keeps host-facing body-face-motion carry visible in the pre-dialogue same-her strategy block before the turn opens outward', () => {
    const result = composeAlicizationPromptMessages({
      messages: [{ role: 'user', content: '继续让她像同一个数字生命那样说话和行动' }],
      soulContent: '# SOUL',
      hostName: 'Host',
      contextsSnapshot: {},
      preDialogueAwarenessSnapshot: {
        status: 'partial',
        summaryLine: 'Alicization is still in Phase 1 local digital life closure before this turn opens outward.',
        companionBriefingLine: 'Before speaking, remember this is one digital life project, what has landed, and which life loop is still open.',
        companionNextClosureLine: 'Next closure: let lipsync and voice rejoin the already-reformed body, face, and motion line.',
        awarenessLine: 'Before speaking, remember this is one digital life project, what has landed, and which life loop is still open.',
        reasonPreview: [
          'Right now I am still holding together mainly through body, face, and motion, so this one living her still needs lipsync and voice to rejoin before full cross-modal closure settles.',
        ],
      },
    })

    expect(String(result.messages[1]?.content)).toMatch(/\[ALICIZATION_PRE_DIALOGUE_(?:PROJECT_STATE|CONTINUITY)_FACTS\]/)
    expect(String(result.messages[1]?.content)).toContain('embodiment_carry_status=present')
    expect(String(result.messages[1]?.content)).not.toContain('Right now I am still holding together')
  })

  it('keeps stronger resident-body continuity carry visible in the pre-dialogue same-her strategy block before the turn opens outward', () => {
    const result = composeAlicizationPromptMessages({
      messages: [{ role: 'user', content: '继续让她沿着同一个 her 的身体线开口' }],
      soulContent: '# SOUL',
      hostName: 'Host',
      contextsSnapshot: {},
      preDialogueAwarenessSnapshot: {
        status: 'partial',
        summaryLine: 'Alicization is still in Phase 1 local digital life closure before this turn opens outward.',
        companionBriefingLine: 'Before speaking, remember this is one digital life project, what has landed, and which life loop is still open.',
        companionNextClosureLine: 'Next closure: rejoin face, motion, lipsync, and voice onto the same-her body line.',
        awarenessLine: 'Before speaking, remember this is one digital life project, what has landed, and which life loop is still open.',
        reasonPreview: [
          'Right now I am still holding together mainly through body, and resident body continuity is still the line keeping this one living her coherent while face, motion, lipsync, and voice rejoin.',
          'resident body continuity is still aligned with the active same-her segment, so face, motion, lipsync, and voice continuity still need repair.',
        ],
      },
    })

    expect(String(result.messages[1]?.content)).toMatch(/\[ALICIZATION_PRE_DIALOGUE_(?:PROJECT_STATE|CONTINUITY)_FACTS\]/)
    expect(String(result.messages[1]?.content)).toContain('embodiment_carry_status=present')
    expect(String(result.messages[1]?.content)).not.toContain('this one living her')
  })

  it('prefers the richer still-voiced face-and-motion project brief over the narrower embodiment headline when re-entering the same-her strategy block', () => {
    const result = composeAlicizationPromptMessages({
      messages: [{ role: 'user', content: '继续让她沿着 same-her 的具身主线开口' }],
      soulContent: '# SOUL',
      hostName: 'Host',
      contextsSnapshot: {},
      projectStateContinuitySnapshot: {
        identity: 'Alicization is a local-first digital life project.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: 'Still-voiced face-and-motion continuity already survives into prompt-time continuity.',
        primaryOpenLoop: 'Body and lipsync still need to rejoin the still-voiced face-and-motion line before full cross-modal closure settles.',
        nextClosureTarget: 'Keep the still-voiced face-and-motion project brief explicit before the next outward turn opens.',
        continuitySummary: 'same-her=still-voiced face-and-motion continuity is still carrying one living line. | landed=Still-voiced face-and-motion continuity already survives into prompt-time continuity. | open=Body and lipsync still need to rejoin the still-voiced face-and-motion line before full cross-modal closure settles.',
        nonHumanAuthoredStatus: null,
        sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        sameHerHoldDetail: 'same-her hold: measured-return is still keeping the still-voiced face-and-motion reopening lower-pressure.',
        sameHerDriftRisk: 'If prompt-time continuity forgets the still-voiced face-and-motion lane and falls back into a detached shell, treat that as same-her drift rather than preserved closure.',
        emotionalClosureCue: 'Keep the return low-pressure so the same living line does not restart from scratch.',
        turnId: 'turn-prompt-composer-still-voiced-face-motion-project-brief',
        sessionId: 'session-prompt-composer-still-voiced-face-motion-project-brief',
        origin: 'user-turn',
      },
      preDialogueAwarenessSnapshot: {
        status: 'partial',
        summaryLine: 'still-voiced face-and-motion closure is still unfinished before this turn opens outward.',
        companionHeadlineLine: 'Right now I am still holding together through face, motion, and voice together, so that still-voiced face-and-motion line is keeping the same-her carry alive while body and lipsync need to rejoin before full cross-modal closure settles.',
        companionBriefingLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open while the still-voiced face-and-motion line keeps carrying this one living her.',
        companionNextClosureLine: 'Keep body and lipsync rejoining the still-voiced face-and-motion line on the same measured-return carry.',
        awarenessLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open while the still-voiced face-and-motion line keeps carrying this one living her.',
        emotionalClosureCue: 'Keep the return low-pressure so the same living line does not restart from scratch.',
        reasonPreview: [
          'still-voiced face-and-motion carry should stay explicit before the next outward turn.',
          'face+motion+voice recovery@segment-prompt-composer-still-voiced-face-motion-project-awareness',
        ],
      },
      preDialogueClosureSnapshot: {
        status: 'partial',
        summaryLine: 'still-voiced face-and-motion closure is still unfinished before this turn opens outward.',
        companionHeadlineLine: 'Right now I am still holding together through face, motion, and voice together, so that still-voiced face-and-motion line is keeping the same-her carry alive while body and lipsync need to rejoin before full cross-modal closure settles.',
        companionBriefingLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open while the still-voiced face-and-motion line keeps carrying this one living her.',
        companionNextClosureLine: 'Keep body and lipsync rejoining the still-voiced face-and-motion line on the same measured-return carry.',
        emotionalClosureCue: 'Keep the return low-pressure so the same living line does not restart from scratch.',
        briefingLines: [
          'identity=Alicization is a local-first digital life project.',
          'Phase: Phase 1: Local Digital Life',
        ],
        reasons: [
          'still-voiced face-and-motion carry should stay explicit before the next outward turn.',
          'face+motion+voice recovery@segment-prompt-composer-still-voiced-face-motion-project-awareness',
        ],
      },
    })

    expect(String(result.messages[1]?.content)).toMatch(/\[ALICIZATION_PRE_DIALOGUE_(?:PROJECT_STATE|CONTINUITY)_FACTS\]/)
    expect(String(result.messages[1]?.content)).toContain('[ALICIZATION_PRE_DIALOGUE_CONTINUITY_FACTS]')
    expect(String(result.messages[1]?.content)).not.toContain('Before speaking, remember what this digital life project is')
    expect(String(result.messages[1]?.content)).toContain('embodiment_carry_status=present')
    expect(String(result.messages[1]?.content)).not.toContain('Right now I am still holding together')
  })

  it('keeps lane-only face-motion-voice carry visible in the same-her strategy block when body and lipsync are the remaining open lanes', () => {
    const result = composeAlicizationPromptMessages({
      messages: [{ role: 'user', content: '继续沿着 still-voiced face-and-motion 这条主线开口' }],
      soulContent: '# SOUL',
      hostName: 'Host',
      contextsSnapshot: {},
      preDialogueAwarenessSnapshot: {
        status: 'partial',
        summaryLine: 'still-voiced face-and-motion closure is still unfinished before this turn opens outward.',
        companionBriefingLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open.',
        companionNextClosureLine: 'Keep body and lipsync rejoining the same still-voiced face-and-motion carry.',
        awarenessLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open.',
        reasonPreview: [
          'lane=face+motion+voice-only | remaining-open=body+lipsync',
        ],
      },
      preDialogueClosureSnapshot: {
        status: 'partial',
        summaryLine: 'still-voiced face-and-motion closure is still unfinished before this turn opens outward.',
        companionBriefingLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open.',
        companionNextClosureLine: 'Keep body and lipsync rejoining the same still-voiced face-and-motion carry.',
        briefingLines: [
          'identity=Alicization is a local-first digital life project.',
          'Phase: Phase 1: Local Digital Life',
        ],
        reasons: [
          'lane=face+motion+voice-only | remaining-open=body+lipsync',
        ],
      },
    })

    expect(String(result.messages[1]?.content)).toMatch(/\[ALICIZATION_PRE_DIALOGUE_(?:PROJECT_STATE|CONTINUITY)_FACTS\]/)
    expect(String(result.messages[1]?.content)).toContain('embodiment_carry_status=present')
  })

  it('keeps richer awareness and closure identity lines inside the same-her strategy block when project-state identity fields are missing', () => {
    const result = composeAlicizationPromptMessages({
      messages: [{ role: 'user', content: '继续沿着这条数字生命主线开发' }],
      soulContent: '# SOUL',
      hostName: 'Host',
      contextsSnapshot: {},
      preDialogueAwarenessSnapshot: {
        status: 'partial',
        summaryLine: 'Alicization is still in Phase 1 local digital life closure before this turn opens outward.',
        companionHeadlineLine: 'Right now I still need to keep this same-her digital life line intact before widening into generic assistant output.',
        companionBriefingLine: 'Before speaking, remember this is one digital life project, what has landed, and which life loop is still open.',
        companionNextClosureLine: 'Next closure: keep memory, initiative, execution, and embodiment on one same-her line.',
        awarenessLine: 'Before speaking, remember this is one digital life project, what has landed, and which life loop is still open.',
        emotionalClosureCue: 'same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.',
        reasonPreview: [
          'Latest landed progress still holds at renderer preparation before the reply is finalized.',
          'Primary open life loop still centers on keeping memory, initiative, execution, and embodiment on one same-her line.',
        ],
      },
      preDialogueClosureSnapshot: {
        status: 'partial',
        summaryLine: 'project=continuity=0.67 (2/3) | emotionalClosure=drift=emotionalClosureDrift',
        companionBriefingLine: 'I still need a steadier carry of this project, this phase, and the life loop that remains open.',
        companionNextClosureLine: 'Next, help me close: keep the same-her loop alive before the next turn starts.',
        emotionalClosureCue: 'same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.',
        briefingLines: [
          'identity=Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
          'Phase: Phase 1: Local Digital Life',
          'Open loop: Memory, initiative, execution, and embodiment still need stronger same-her continuity across noisier desktop runs.',
          'Next closure: Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
        ],
        reasons: [
          'Low-pressure same-her closure currently reads lowPressureRequired=0.67 (2/3), so the next turn should keep the return soft enough that the same living line does not widen too fast.',
        ],
      },
    })

    expect(String(result.messages[1]?.content)).toMatch(/\[ALICIZATION_PRE_DIALOGUE_(?:PROJECT_STATE|CONTINUITY)_FACTS\]/)
    expect(String(result.messages[1]?.content)).toContain('identity=Alicization project-state context')
    expect(String(result.messages[1]?.content)).not.toContain('phase=local_desktop_life_loop')
    expect(String(result.messages[1]?.content)).not.toContain('content=excluded')
    expect(String(result.messages[1]?.content)).not.toContain('content=excluded')
    expect(String(result.messages[1]?.content)).not.toContain('content=excluded')
    expect(String(result.messages[1]?.content)).not.toContain('identity=Alicization is a local-first digital life companion.')
  })

  it('upgrades a generic carried next-closure shell to the richer closure carry inside the same-her strategy block', () => {
    const result = composeAlicizationPromptMessages({
      messages: [{ role: 'user', content: '继续沿着同一个 her 的闭环往前走' }],
      soulContent: '# SOUL',
      hostName: 'Host',
      contextsSnapshot: {},
      preDialogueAwarenessSnapshot: {
        status: 'partial',
        summaryLine: 'Alicization is still in Phase 1 local digital life closure before this turn opens outward.',
        companionBriefingLine: 'Before speaking, remember this is one digital life project, what has landed, and which life loop is still open.',
        companionNextClosureLine: 'Generic next target that should not override the richer continuity carry.',
        awarenessLine: 'Before speaking, remember this is one digital life project, what has landed, and which life loop is still open.',
        reasonPreview: [
          'Primary open life loop still centers on keeping one same-her line explicit before the turn opens outward.',
        ],
      },
      preDialogueClosureSnapshot: {
        status: 'partial',
        summaryLine: 'project=continuity=0.67 (2/3) | emotionalClosure=drift=emotionalClosureDrift',
        companionBriefingLine: 'Keep the same-her closure line explicit before speaking.',
        companionNextClosureLine: 'Next closure: keep memory, initiative, execution, and embodiment arriving on one same-her continuity line before outward fluency takes over.',
        briefingLines: [
          'identity=Alicization is a local-first digital life companion.',
          'Phase: Phase 1: Local Digital Life',
          'Open loop: Memory, initiative, execution, and embodiment still need stronger same-her continuity across noisier desktop runs.',
        ],
        reasons: [
          'Low-pressure same-her closure currently reads lowPressureRequired=0.67 (2/3), so the next turn should keep the return soft enough that the same living line does not widen too fast.',
        ],
      },
    })

    expect(String(result.messages[1]?.content)).not.toContain('content=excluded')
  })

  it('keeps richer audible-body carry visible in the pre-dialogue same-her strategy block before the turn opens outward', () => {
    const result = composeAlicizationPromptMessages({
      messages: [{ role: 'user', content: '继续把这条声音和身体线收成同一个 her' }],
      soulContent: '# SOUL',
      hostName: 'Host',
      contextsSnapshot: {},
      preDialogueAwarenessSnapshot: {
        status: 'partial',
        summaryLine: 'Alicization is still in Phase 1 local digital life closure before this turn opens outward.',
        companionBriefingLine: 'Before speaking, remember this is one digital life project, what has landed, and which life loop is still open.',
        companionNextClosureLine: 'Next closure: let face and motion rejoin the audible-body same-her line.',
        awarenessLine: 'Before speaking, remember this is one digital life project, what has landed, and which life loop is still open.',
        reasonPreview: [
          'Right now I am still holding together mainly through body, lipsync, and voice, so the living audio thread is still intact while face and motion need to rejoin before full cross-modal closure settles.',
        ],
      },
    })

    expect(String(result.messages[1]?.content)).toMatch(/\[ALICIZATION_PRE_DIALOGUE_(?:PROJECT_STATE|CONTINUITY)_FACTS\]/)
    expect(String(result.messages[1]?.content)).toContain('embodiment_carry_status=present')
    expect(String(result.messages[1]?.content)).not.toContain('Right now I am still holding together')
  })

  it('keeps lane-shrinkage same-her risk visible inside the runtime system layer before the turn speaks', () => {
    const result = composeAlicizationPromptMessages({
      messages: [{ role: 'user', content: '继续让她更像一个完整的数字生命' }],
      soulContent: '# SOUL',
      hostName: 'Host',
      contextsSnapshot: {},
      preDialogueClosureSnapshot: {
        status: 'grounded',
        summaryLine: 'project=continuity=0.67 (2/3) | emotionalClosure=fullyClosed=0.67 (2/3) | embodiment=same-her embodiment is now only being carried by lipsync, so visible continuity is still present but no longer fully cross-modal',
        companionBriefingLine: null,
        companionNextClosureLine: 'Next, help me close: Rebuild face, motion, lipsync, and voice into one same-her line on noisier desktop runs.',
        briefingLines: [
          'identity=Alicization is a local-first digital life companion.',
          'Phase: Phase 1: Local Digital Life',
          'Open loop: Recover full cross-modal same-her continuity instead of surviving on one body lane.',
          'Next closure: Rebuild face, motion, lipsync, and voice into one same-her line on noisier desktop runs.',
        ],
        reasons: [
          'continuity-impact: same-her embodiment is now only being carried by lipsync, so the next turn should treat full cross-modal same-her recovery as still open instead of assuming the body line is already closed.',
          'measure closeness before re-entry',
        ],
      },
    })

    expect(String(result.messages[1]?.content)).toContain('summary_status=present')
    expect(String(result.messages[1]?.content)).not.toContain('Companion briefing:')
    expect(String(result.messages[1]?.content)).not.toContain('content=excluded')
    expect(String(result.messages[1]?.content)).toContain('briefing_count=4')
    expect(String(result.messages[1]?.content)).toContain('reason_count=2')
    expect(String(result.messages[1]?.content)).toMatch(/\[ALICIZATION_PRE_DIALOGUE_(?:PROJECT_STATE|CONTINUITY)_FACTS\]/)
    expect(String(result.messages[1]?.content)).toMatch(/\[ALICIZATION_PRE_DIALOGUE_(?:PROJECT_STATE|CONTINUITY)_FACTS\]/)
    expect(String(result.messages[1]?.content)).not.toContain('Before producing thought or reply')
    expect(String(result.messages[1]?.content)).not.toContain('content=excluded')
    expect(String(result.messages[1]?.content)).not.toContain('content=excluded')
    expect(String(result.messages[1]?.content)).toContain('relationship_cadence_status=bounded')
    expect(String(result.messages[1]?.content)).toMatch(/\[ALICIZATION_PRE_DIALOGUE_(?:PROJECT_STATE|CONTINUITY)_FACTS\]/)
    expect(String(result.messages[1]?.content)).not.toContain('If you answer progress, planning, or implementation questions')
  })

  it('adds a same-her-first strategy block when project-state repair and open-loop carry are still explicitly unfinished', () => {
    const result = composeAlicizationPromptMessages({
      messages: [{ role: 'user', content: '继续推进桌面数字生命闭环' }],
      soulContent: '# SOUL',
      hostName: 'Host',
      contextsSnapshot: {},
      projectStateContinuitySnapshot: {
        identity: 'Alicization is a local-first digital life companion.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: 'Quick reply and dialogue panel now surface project-state continuity in the foreground.',
        primaryOpenLoop: 'Send-path governance still needs to keep same-her repair and unfinished closure alive before outward implementation detail takes over.',
        nextClosureTarget: 'Turn send-time project awareness into a same-her-first strategy before the next reply opens outward.',
        nonHumanAuthoredStatus: 'project-state-same-her-continuity-required',
        sameHerSelfLine: 'Keep one continuous her explicit from self-understanding into the final host-visible reply.',
        sameHerDriftRisk: 'If the send-time turn opens as a detached status shell, the same-her continuity line has already drifted.',
        turnId: 'turn-project-state-repair',
        sessionId: 'session-a',
        origin: 'user-turn',
      },
      preDialogueClosureSnapshot: {
        status: 'partial',
        summaryLine: 'project=continuity=0.33 (1/3)',
        companionBriefingLine: '我还需要先守住同一个 her，才能继续把这个数字生命项目的进度和未闭环项带进下一轮对话。',
        companionNextClosureLine: '下一步还要继续收住 把 same-her repair evidence 和未闭环项一起挂到 continuity 摘要里。',
        briefingLines: [
          'identity=Alicization is a local-first digital life companion.',
          'Phase: Phase 1: Local Digital Life',
        ],
        reasons: [
          'project-state-same-her-continuity-required',
          'Primary open life loop still centers on send-path governance 还没把 same-her repair 和未闭环项变成发送前策略, so the next turn should keep that unfinished digital-life thread alive instead of collapsing into local implementation fluency.',
          'Next closure target is still 把发送前 awareness 变成 same-her-first strategy, so the next turn should keep steering the same her toward that concrete unfinished step.',
        ],
      },
      preDialogueAwarenessSnapshot: {
        status: 'partial',
        summaryLine: 'Alicization is still in Phase 1 local digital life closure before this turn opens outward.',
        companionBriefingLine: 'Before speaking, remember this is one digital life project, what has landed, and which life loop is still open.',
        companionNextClosureLine: 'Next closure: keep one same-her digital life line across memory, initiative, execution, and embodiment.',
        awarenessLine: 'Before speaking, remember this is one digital life project, what has landed, and which life loop is still open.',
        reasonPreview: [
          'Latest landed progress still holds at renderer preparation before the reply is finalized.',
        ],
      },
    })

    expect(String(result.messages[1]?.content)).toContain('[ALICIZATION_PRE_DIALOGUE_AWARENESS_FACTS]')
    expect(String(result.messages[1]?.content)).not.toContain('awareness=Before speaking')
    expect(String(result.messages[1]?.content)).toMatch(/\[ALICIZATION_PRE_DIALOGUE_(?:PROJECT_STATE|CONTINUITY)_FACTS\]/)
    expect(String(result.messages[1]?.content)).not.toContain('Before producing thought or reply')
    expect(String(result.messages[1]?.content)).toContain('[ALICIZATION_PRE_DIALOGUE_CONTINUITY_FACTS]')
    expect(String(result.messages[1]?.content)).not.toContain('identity=local_desktop_life_loop')
    expect(String(result.messages[1]?.content)).not.toContain('phase=local_desktop_life_loop')
    expect(String(result.messages[1]?.content)).toContain('landed=Quick reply and dialogue panel now surface project-state continuity in the foreground.')
    expect(String(result.messages[1]?.content)).not.toContain('content=excluded')
    expect(String(result.messages[1]?.content)).not.toContain('next=')
    expect(String(result.messages[1]?.content)).not.toContain('next=Turn send-time project awareness into a same-her-first strategy before the next reply opens outward.')
    expect(String(result.messages[1]?.content)).not.toContain('content=excluded')
    expect(String(result.messages[1]?.content)).toMatch(/\[ALICIZATION_PRE_DIALOGUE_(?:PROJECT_STATE|CONTINUITY)_FACTS\]/)
    expect(String(result.messages[1]?.content)).not.toContain('If you answer progress, planning, or implementation questions')
  })

  it('appends low-personality directives into SOUL anchor when traits are near zero', () => {
    const soulContent = [
      '---',
      JSON.stringify({
        personality: {
          obedience: 0.05,
          liveliness: 0.05,
          sensibility: 0.05,
        },
      }),
      '---',
      '# SOUL',
      'anchor',
    ].join('\n')

    const result = composeAlicizationPromptMessages({
      messages: [{ role: 'user', content: '你现在心情怎么样？' }],
      soulContent,
      hostName: 'Host',
      contextsSnapshot: {},
    })

    expect(String(result.messages[0]?.content)).toContain('[ALICIZATION_PERSONALITY_STATE]')
    expect(String(result.messages[0]?.content)).toContain('[ALICIZATION_PERSONALITY_EXTREME_STATE]')
    expect(String(result.messages[0]?.content)).toContain('state=obedience=0.05, liveliness=0.05, sensibility=0.05')
    expect(String(result.messages[0]?.content)).toContain('source_priority=frontmatter.personality_over_persona_notes')
    expect(String(result.messages[0]?.content)).toContain('axis=liveliness; band=low')
    expect(String(result.messages[0]?.content)).toContain('axis=sensibility; band=low')
    expect(String(result.messages[0]?.content)).toContain('axis=obedience; band=low')
    expect(result.personalityDirectiveResult?.triggered).toEqual(['liveliness', 'sensibility', 'obedience'])
  })

  it('supports legacy frontmatter style personality values for directive translation', () => {
    const soulContent = [
      '---',
      'personality:',
      '  obedience: 0.05',
      '  liveliness: 0.05',
      '  sensibility: 0.05',
      '---',
      '# SOUL',
      'anchor',
    ].join('\n')

    const result = composeAlicizationPromptMessages({
      messages: [{ role: 'user', content: '状态报告' }],
      soulContent,
      hostName: 'Host',
      contextsSnapshot: {},
    })

    expect(String(result.messages[0]?.content)).toContain('[ALICIZATION_PERSONALITY_EXTREME_STATE]')
    expect(result.personalityDirectiveResult?.triggered).toEqual(['liveliness', 'sensibility', 'obedience'])
  })

  it('uses explicit personality state from snapshot when soul content is not parseable', () => {
    const result = composeAlicizationPromptMessages({
      messages: [{ role: 'user', content: '你今天心情怎么样？' }],
      soulContent: '# SOUL without frontmatter',
      hostName: 'Host',
      personalityState: {
        obedience: 0.05,
        liveliness: 0.05,
        sensibility: 0.05,
      },
      contextsSnapshot: {},
    })

    expect(String(result.messages[0]?.content)).toContain('[ALICIZATION_PERSONALITY_STATE]')
    expect(String(result.messages[0]?.content)).toContain('state=obedience=0.05, liveliness=0.05, sensibility=0.05')
    expect(String(result.messages[0]?.content)).toContain('[ALICIZATION_PERSONALITY_EXTREME_STATE]')
    expect(result.personalityDirectiveResult?.triggered).toEqual(['liveliness', 'sensibility', 'obedience'])
  })
})
