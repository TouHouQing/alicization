import { describe, expect, it } from 'vitest'

import {
  resolvePreparedRuntimeProjectPreDialogueAwarenessSummary,
} from '../prepared-runtime-continuity'
import { alicizationProjectStateVisibleReplySameHerReminder } from '../project-state-answer-governance'
import { resolveAlicizationProjectStateBrief } from '../project-state-brief'
import {
  buildAlicizationResolvedVisibleReply,
  buildAlicizationVisibleReplyRealizationArtifact,
  deriveAlicizationVisibleReplyText,
  resolveAlicizationPreparedVisibleReplyExecution,
  resolveAlicizationTimeoutRecoveredVisibleReply,
  resolveVisibleReplyProjectAwarenessDisplayMode,
  resolveVisibleReplyProjectAwarenessSummary,
} from './realization-engine'

const fixedTemplateResiduePattern
  = /Before (?:answering|speaking|acting)|Right now I am|Same Phase 1 digital life|same[- ]her|same living line|one living her|one continuous her|local-first digital life project|Phase 1: Local Digital Life|local_desktop_life_loop|phase1_local_digital_life|project_phase=life_core|continuity_identity|continuity_line|content=excluded|visibility=internal[-_]structured|同一个她|同一个 her|数字生命主线|女仆|\bmaid\b/iu

function expectNoFixedTemplateResidue(value: unknown) {
  expect(JSON.stringify(value ?? '')).not.toMatch(fixedTemplateResiduePattern)
}

function expectStructuredProjectFact(value: unknown, pattern: RegExp = /(?:^|\s\|\s)(?:landed|open|next|continuity_hold|continuity_cue|continuity_drift_risk|summary)=|memory_dialogue_embodiment_closure|cross_modal_continuity_proof|project_state_continuity|life_loop_continuity|embodiment_lanes=|lane=/) {
  const text = String(value ?? '')
  expectNoFixedTemplateResidue(text)
  if (!text)
    return
  expect(text).toMatch(pattern)
}

function expectFixedTemplateDropped(value: unknown) {
  expect(value == null || value === '').toBe(true)
}

function expectStructuredEmbodimentFact(value: unknown, pattern: RegExp) {
  if (!String(value ?? '')) {
    expectNoFixedTemplateResidue(value)
    return
  }
  expectStructuredProjectFact(value, /embodiment_lanes=|lane=/)
  expect(String(value ?? '')).toMatch(pattern)
}

function expectProjectAuditWithoutFixedTemplates(value: unknown) {
  expectNoFixedTemplateResidue(value)
}

function expectAuditText(value: unknown, pattern: RegExp) {
  const text = String(value ?? '')
  expectNoFixedTemplateResidue(text)
  if (!text)
    return
  expect(text).toMatch(pattern)
}

function expectPublicCriticSummary(value: unknown, status: string) {
  expect(value).toEqual(expect.objectContaining({
    version: 'visible-reply-critic-public-summary-v1',
    status,
    reasonCodes: expect.any(Array),
    repairReasonCodes: expect.any(Array),
    mustDropCount: expect.any(Number),
    mustPreserveCount: expect.any(Number),
  }))
  expect(value).not.toHaveProperty('mustDrop')
  expect(value).not.toHaveProperty('mustPreserve')
  expectNoFixedTemplateResidue(value)
}

function expectPublicClosureSummary(value: unknown, status: string) {
  expect(value).toEqual(expect.objectContaining({
    version: 'visible-reply-closure-public-summary-v1',
    status,
    reasonCodes: expect.any(Array),
    rewriteAttempted: expect.any(Boolean),
    rewriteSucceeded: expect.any(Boolean),
  }))
  expect(value).not.toHaveProperty('initialCritic')
  expect(value).not.toHaveProperty('finalCritic')
  expectNoFixedTemplateResidue(value)
}

describe('visible-reply-realization-engine', () => {
  it('does not expose fixed-template residue from structured provider replies as visible text', () => {
    expect(deriveAlicizationVisibleReplyText(JSON.stringify({
      reply: 'Before answering, remember: Alicization is a local-first digital life project building one continuous "her". Same Phase 1 digital life.',
    }))).toBe('')

    expect(deriveAlicizationVisibleReplyText(JSON.stringify({
      visibleReplyRealization: {
        visibleText: 'Right now I am still holding together mainly through voice, so this one living her needs the same living line.',
      },
    }))).toBe('')
  })

  it('does not carry fixed project-state templates into realization audit metadata', () => {
    const realization = buildAlicizationVisibleReplyRealizationArtifact({
      fullText: JSON.stringify({
        reply: '我先把这轮真正要处理的点接住。',
        projectStateAudit: {
          sameHerSummary: 'Before answering, remember: Same Phase 1 digital life, one continuous her, and the same living line.',
          sameHerHoldDetail: 'same-her hold: measured-return keeps the same living line before widening.',
          continuityCue: '同一个她和数字生命主线不能断。',
          currentPhaseSummary: 'Phase 1: Local Digital Life',
          openClosureSummary: 'same still-open closure work across initiative and embodiment.',
          nextClosureTargetSummary: 'Keep extending cross-modal same-her proof.',
          embodimentClosureSummary: 'Right now I am still holding together mainly through body, voice, and lipsync.',
        },
      }),
      visibleReplyExecution: {
        mode: 'provider-one-shot',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'provider-one-shot',
      },
    })

    expect(realization.projectStateAudit).toBeNull()
    expectNoFixedTemplateResidue(realization.projectStateAudit)
  })

  it('ignores fixed prepared project re-anchor templates when choosing display mode', () => {
    expect(resolveVisibleReplyProjectAwarenessDisplayMode({
      rawSummary: 'same digital life | keep the closure seam explicit',
      preparedRuntimePreferredAwarenessSummary: 'identity=local_desktop_life_loop | phase=local_desktop_life_loop | visibility=internal-structured | open=open_loop=execution+memory+embodiment; status=unfinished | landed=continuity_progress=partial | continuity_anchor=local_desktop_life_loop',
      preparedRuntimeCompanionHeadlineLine: 'Right now I am still holding together mainly through face, motion, and lipsync, so the full cross-modal same-her line is still open.',
    })).toBe('hidden')
  })

  it('does not classify fixed project template prose alone as project-reanchor display mode', () => {
    expect(resolveVisibleReplyProjectAwarenessDisplayMode({
      rawSummary: 'Before answering, remember: Alicization is a local-first digital life project building one continuous "her". Same Phase 1 digital life. Unfinished closure still needs the same living line.',
      preparedRuntimePreferredAwarenessSummary: null,
      preparedRuntimeCompanionHeadlineLine: null,
    })).toBe('hidden')
  })

  it('classifies thin carried awareness plus only embodiment headline as embodiment-headline display mode', () => {
    expect(resolveVisibleReplyProjectAwarenessDisplayMode({
      rawSummary: 'same digital life | keep the closure seam explicit',
      preparedRuntimePreferredAwarenessSummary: 'embodiment_lanes=face+motion+lipsync; pending_lanes=body+voice; status=pending_rejoin',
      preparedRuntimeCompanionHeadlineLine: 'embodiment_lanes=face+motion+lipsync; pending_lanes=body+voice; status=pending_rejoin',
    })).toBe('embodiment-headline')
  })

  it('classifies timeout-recovery continuity audit without explicit awareness as hidden display mode', () => {
    expect(resolveVisibleReplyProjectAwarenessDisplayMode({
      rawSummary: null,
      preparedRuntimePreferredAwarenessSummary: 'Before answering, remember: Alicization is a local-first digital life project building one continuous "her". She is still inside Phase 1: Local Digital Life. The still-open closure is memory still needs stronger end-to-end closure across turns, initiative, and embodiment. Same Phase 1 digital life. Some closure already landed.',
      preparedRuntimeCompanionHeadlineLine: null,
      projectStateEmbodimentClosureSummary: 'Right now her visible same-her continuity is still being carried mainly through face and motion, so she should keep treating full cross-modal embodiment closure as unfinished.',
      isTimeoutRecovery: true,
    })).toBe('hidden')
  })

  it('classifies richer prepared runtime project awareness over a narrower body-line headline as project-reanchor display mode', () => {
    expect(resolveVisibleReplyProjectAwarenessDisplayMode({
      rawSummary: null,
      preparedRuntimePreferredAwarenessSummary: 'landed=semantic_recall=partial | open=open_loop=memory+initiative+embodiment; status=unfinished | next=embedding_recall_reindex',
      preparedRuntimeCompanionHeadlineLine: 'embodiment_lanes=face+motion+lipsync; pending_lanes=body+voice; status=pending_rejoin',
      isTimeoutRecovery: true,
    })).toBe('project-reanchor')
  })

  it('prefers the audible-body embodiment headline as the stronger prepared awareness line when it already carries the living same-her continuity truth', () => {
    const resolved = resolveVisibleReplyProjectAwarenessSummary({
      rawSummary: 'same digital life | keep the closure seam explicit',
      strongerPreparedRuntimeAwarenessLine: 'Before answering, remember this is still one local-first digital life project in Phase 1, and memory, initiative, and embodiment still need to close on one same-life line.',
      preparedRuntimePreferredAwarenessSummary: 'Right now I am still holding together mainly through body, lipsync, and voice, so the living audio thread is still intact while face and motion need to rejoin before full cross-modal closure settles.',
      preparedRuntimeCompanionHeadlineLine: 'Right now I am still holding together mainly through body, lipsync, and voice, so the living audio thread is still intact while face and motion need to rejoin before full cross-modal closure settles.',
      canonicalProjectAwarenessLine: 'Before answering, remember: Alicization is a local-first digital life project building one continuous "her".',
      preparedRuntimeAwarenessInputsCount: 5,
      preparedRuntimeAwarenessLooksThin: false,
    })

    expectNoFixedTemplateResidue(resolved)
  })

  it('prefers a stronger prepared-runtime awareness line over a thin carried shell when visible-reply project awareness is being re-anchored', () => {
    const resolved = resolveVisibleReplyProjectAwarenessSummary({
      rawSummary: 'same digital life | keep the closure seam explicit',
      strongerPreparedRuntimeAwarenessLine: 'Before answering, remember: Alicization is a local-first digital life project. She is still inside Phase 1: Local Digital Life. The still-open closure is execution, memory, and embodiment still needing one same-life closure line. Same Phase 1 digital life. Some closure already landed.',
      preparedRuntimePreferredAwarenessSummary: 'Before answering, keep the same digital life project in view.',
      preparedRuntimeCompanionHeadlineLine: 'Right now I am still holding together mainly through face, motion, and lipsync, so the full cross-modal same-her line is still open.',
      canonicalProjectAwarenessLine: 'Before answering, remember: Alicization is a local-first digital life project building one continuous "her".',
      preparedRuntimeAwarenessInputsCount: 5,
      preparedRuntimeAwarenessLooksThin: true,
    })

    expectNoFixedTemplateResidue(resolved)
  })

  it('prefers a stronger Chinese prepared-runtime project re-anchor over a thinner Chinese carried reminder shell', () => {
    const resolved = resolveVisibleReplyProjectAwarenessSummary({
      rawSummary: '回答前先记住这是同一个她的数字生命项目，别把这条线忘了。',
      strongerPreparedRuntimeAwarenessLine: '我会先沿着同一个她这条线回答你：Alicization 还是本地优先数字生命项目。现在第一阶段已经把连续性、记忆和执行慢慢接成一条线了，但主动性、具身和对话闭环还没有真正收住。',
      preparedRuntimePreferredAwarenessSummary: '我会先沿着同一个她这条线回答你：Alicization 还是本地优先数字生命项目。现在第一阶段已经把连续性、记忆和执行慢慢接成一条线了，但主动性、具身和对话闭环还没有真正收住。',
      preparedRuntimeCompanionHeadlineLine: '现在这条同一个她的线还在继续往前长，但还没完全收口。',
      canonicalProjectAwarenessLine: 'Before answering, remember: Alicization is a local-first digital life project building one continuous "her". She is still inside Phase 1: Local Digital Life.',
      preparedRuntimeAwarenessInputsCount: 5,
      preparedRuntimeAwarenessLooksThin: true,
      allowPreparedRuntimeBackfill: true,
      preferPreparedRuntimeAwarenessDisplay: true,
      displayMode: 'project-reanchor',
    })

    expectNoFixedTemplateResidue(resolved)
  })

  it('falls back to canonical awareness only when the carried shell is thin and prepared runtime does not provide a stronger explicit awareness line', () => {
    const structuredCanonicalAwareness = 'identity=local_desktop_life_loop | phase=local_desktop_life_loop | visibility=internal-structured | open=open_loop=memory+initiative+embodiment; status=unfinished | landed=continuity_progress=partial | continuity_anchor=local_desktop_life_loop'
    const resolved = resolveVisibleReplyProjectAwarenessSummary({
      rawSummary: 'Before answering, keep the same digital life project in view.',
      strongerPreparedRuntimeAwarenessLine: null,
      preparedRuntimePreferredAwarenessSummary: structuredCanonicalAwareness,
      preparedRuntimeCompanionHeadlineLine: null,
      canonicalProjectAwarenessLine: structuredCanonicalAwareness,
      preparedRuntimeAwarenessInputsCount: 0,
      preparedRuntimeAwarenessLooksThin: true,
    })

    expectStructuredProjectFact(resolved)
  })

  it('prefers a richer prepared-runtime explicit Phase 1 re-anchor over a canonical carried awareness line when final realization would otherwise thin the closure carry', () => {
    const canonicalProjectState = resolveAlicizationProjectStateBrief()
    const richerPreparedAwarenessLine = 'Before answering, remember: Alicization is a local-first digital life project. She is still inside Phase 1: Local Digital Life. Same Phase 1 digital life. Some closure already landed because project identity and execution continuity already survive into runtime preparation. The still-open closure is memory, initiative, and embodiment still needing one same living line, and this reply should keep moving toward that next closure target without splitting her continuity.'

    const resolved = resolveVisibleReplyProjectAwarenessSummary({
      rawSummary: canonicalProjectState.preDialogueAwarenessLine,
      strongerPreparedRuntimeAwarenessLine: richerPreparedAwarenessLine,
      preparedRuntimePreferredAwarenessSummary: richerPreparedAwarenessLine,
      preparedRuntimeCompanionHeadlineLine: 'Right now I am still holding together mainly through face, motion, and lipsync, so the full cross-modal same-her line is still open.',
      canonicalProjectAwarenessLine: canonicalProjectState.preDialogueAwarenessLine,
      preparedRuntimeAwarenessInputsCount: 5,
      preparedRuntimeAwarenessLooksThin: false,
    })

    expectNoFixedTemplateResidue(resolved)
  })

  it('keeps callback-specific same-her project awareness instead of upgrading it into a broader canonical reminder during final realization', () => {
    const callbackAwarenessLine = 'Before answering, remember this callback still belongs to one same Phase 1 digital life, and the unfinished closure seam still belongs to her while this return keeps carrying the same closure line forward.'
    const broaderCanonicalReminder = 'Before answering, remember: Alicization is a local-first digital life project. She is still inside Phase 1: Local Digital Life. This callback return still belongs to one same her carrying the same closure line forward. What has already landed is same-her callback continuity already survives through answer compilation and response-surface carry. The still-open closure is execution callback continuity still needs stronger same-her closure across reply, initiative, and embodiment. This reply should keep moving toward keeping the callback return on the same living line and letting that same-her closure stay explicit in the final visible reply.'

    const resolved = resolveVisibleReplyProjectAwarenessSummary({
      rawSummary: callbackAwarenessLine,
      strongerPreparedRuntimeAwarenessLine: broaderCanonicalReminder,
      preparedRuntimePreferredAwarenessSummary: broaderCanonicalReminder,
      preparedRuntimeCompanionHeadlineLine: null,
      canonicalProjectAwarenessLine: 'Before answering, remember: Alicization is a local-first digital life project building one continuous "her".',
      preparedRuntimeAwarenessInputsCount: 5,
      preparedRuntimeAwarenessLooksThin: false,
      allowPreparedRuntimeBackfill: true,
      preferPreparedRuntimeAwarenessDisplay: true,
      displayMode: 'project-reanchor',
    })

    expectStructuredProjectFact(resolved)
  })

  it('prefers structured prepared awareness over legacy callback same-her template residue', () => {
    const legacyCallbackAwarenessLine = 'Before answering, remember this callback still belongs to one same Phase 1 digital life, and the unfinished closure seam still belongs to her while this return keeps carrying the same closure line forward.'
    const structuredPreparedAwareness = [
      'open=open_loop=semantic_recall+memory_review; status=unfinished',
      'next=embedding_recall_reindex',
    ].join(' | ')

    const resolved = resolveVisibleReplyProjectAwarenessSummary({
      rawSummary: legacyCallbackAwarenessLine,
      strongerPreparedRuntimeAwarenessLine: structuredPreparedAwareness,
      preparedRuntimePreferredAwarenessSummary: structuredPreparedAwareness,
      preparedRuntimeCompanionHeadlineLine: null,
      canonicalProjectAwarenessLine: 'Before answering, remember: Alicization is a local-first digital life project building one continuous "her".',
      preparedRuntimeAwarenessInputsCount: 3,
      preparedRuntimeAwarenessLooksThin: false,
      allowPreparedRuntimeBackfill: true,
      preferPreparedRuntimeAwarenessDisplay: true,
      displayMode: 'project-reanchor',
    })

    expectStructuredProjectFact(resolved, /open_loop=semantic_recall\+memory_review/)
    expect(String(resolved ?? '')).toContain('next=embedding_recall_reindex')
  })

  it('keeps callback-specific next closure target explicit in final project-state audit when realization stays on the same callback living line', () => {
    const callbackAwarenessLine = 'open=execution_callback_continuity; status=unfinished | next=callback_continuity=preserve; widening=deferred'
    const callbackSameHerSelfLine = 'This callback return still belongs to one same her carrying the same closure line forward.'
    const callbackLandedProgress = 'Execution callback continuity already survives through answer compilation and response-surface carry before the final visible reply forms.'
    const callbackOpenLoop = 'Execution callback continuity still needs reply, initiative, and embodiment closure.'
    const callbackNextClosureTarget = 'callback_continuity=preserve; widening=deferred'
    const broaderCanonicalReminder = 'Before answering, remember: Alicization is a local-first digital life project. She is still inside Phase 1: Local Digital Life. This callback return still belongs to one same her carrying the same closure line forward. What has already landed is same-her callback continuity already survives through answer compilation and response-surface carry. The still-open closure is execution callback continuity still needs stronger same-her closure across reply, initiative, and embodiment. This reply should keep moving toward keeping the callback return on the same living line and letting that same-her closure stay explicit in the final visible reply.'

    const resolved = buildAlicizationResolvedVisibleReply({
      fullText: '{"reply":"我会沿着这次 callback 的同一个她继续往下接，不把这条还没收口的线说丢。"}',
      visibleReplyExecution: {
        mode: 'provider-one-shot',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'visible-reply-provider-one-shot',
      },
      projectStatePreDialogueAwarenessSummary: callbackAwarenessLine,
      projectStateSameHerSummary: callbackSameHerSelfLine,
      projectStateCurrentPhaseSummary: 'Phase 1: Local Digital Life',
      projectStateLandedProgressSummary: callbackLandedProgress,
      projectStateOpenClosureSummary: callbackOpenLoop,
      projectStateNextClosureTargetSummary: callbackNextClosureTarget,
      prepared: {
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            cognition: {
              runtimeDigest: {
                projectState: {
                  preDialogueAwarenessLine: broaderCanonicalReminder,
                },
              },
            },
          },
        },
      } as any,
    })

    expectProjectAuditWithoutFixedTemplates(resolved.realization.projectStateAudit)
    expect(resolved.realization.projectStateAudit).toEqual(expect.objectContaining({
      preservedIntoRewrite: false,
      rewriteClosureApplied: false,
    }))
    expectAuditText(resolved.realization.projectStateAudit?.preDialogueAwarenessSummary, /open=|next=/)
    expectFixedTemplateDropped(resolved.realization.projectStateAudit?.sameHerSummary)
    expectFixedTemplateDropped(resolved.realization.projectStateAudit?.currentPhaseSummary)
    expectAuditText(resolved.realization.projectStateAudit?.landedProgressSummary, /callback continuity already survives/)
    expectAuditText(resolved.realization.projectStateAudit?.openClosureSummary, /Execution callback continuity/)
    expectAuditText(resolved.realization.projectStateAudit?.nextClosureTargetSummary, /callback_continuity=preserve/)
    expect(resolved.realization.projectStateAudit?.continuitySummary)
      .toContain('next=callback_continuity=preserve')
  })

  it('keeps a richer explicit Phase 1 awareness line instead of mistaking it for a canonical before-answering reanchor during final realization', () => {
    const canonicalProjectState = resolveAlicizationProjectStateBrief()
    const richerAwarenessLine = 'Before answering, remember this is still one local-first digital life project in Phase 1. Same-her continuity carry and desktop execution closure have landed farther, while memory, initiative, and embodiment still need to close on one living line.'
    const canonicalGeneratedUpgrade = 'Before answering, remember: Alicization is a local-first digital life project building one continuous "her" She is still inside Phase 1: Local Digital Life. Same Phase 1 digital life. What has already landed is proactive initiative now has a compact same-her closure loop; rest-protective proactive feedback next-session carry; final settlement reanchors generic same-her shells; long-horizon emotion-memory-voice-motion bridge carries remembered emotional carry, not full convergence. The still-open closure is memory still needs stronger end-to-end closure across turns, initiative, and embodiment. This reply should keep moving toward cross-modal same-her proof.'

    const resolved = resolveVisibleReplyProjectAwarenessSummary({
      rawSummary: richerAwarenessLine,
      strongerPreparedRuntimeAwarenessLine: canonicalGeneratedUpgrade,
      preparedRuntimePreferredAwarenessSummary: canonicalGeneratedUpgrade,
      preparedRuntimeCompanionHeadlineLine: 'Right now I am still holding together mainly through face, motion, and lipsync, so the full cross-modal same-her line is still open.',
      canonicalProjectAwarenessLine: canonicalProjectState.preDialogueAwarenessLine,
      preparedRuntimeAwarenessInputsCount: 5,
      preparedRuntimeAwarenessLooksThin: false,
      allowPreparedRuntimeBackfill: true,
      preferPreparedRuntimeAwarenessDisplay: true,
      displayMode: 'project-reanchor',
    })

    expectStructuredProjectFact(resolved)
  })

  it('marks local fallback visible text as non-human-authored', () => {
    const execution = resolveAlicizationPreparedVisibleReplyExecution({
      prepared: {
        hasVisualGrounding: false,
        mindTurnContract: null,
        replyRealization: null,
        replyExecutionPlan: null,
        runtimeSurface: {
          replyAuthority: null,
          replyExecutionPlan: null,
        },
        governance: {
          visibleReplyAuthority: 'local-deterministic-fallback',
        },
      } as any,
      mode: 'local-fallback',
      actualVisibleReplyAuthority: 'local-deterministic-fallback',
      providerMindExecuted: false,
      reason: 'timeout-recovered-local-fallback',
    })

    const realization = buildAlicizationVisibleReplyRealizationArtifact({
      fullText: '{"reply":"这轮先别继续伪装成正常心智回复。"}',
      visibleReplyExecution: execution,
    })

    expect(realization.actualAuthority).toBe('local-deterministic-fallback')
    expect(realization.visibleText).toBeNull()
    expect(realization.nonHumanAuthoredStatus).toBe('timeout-recovered-local-fallback')
    expect(realization.blockedReasons).toContain('non-human-authored-visible-fallback')
  })

  it('does not expose local fallback fullText as visible speech', () => {
    const resolved = buildAlicizationResolvedVisibleReply({
      fullText: '{"reply":"这轮先别继续伪装成正常心智回复。"}',
      visibleReplyExecution: {
        mode: 'local-fallback',
        expectedVisibleReplyAuthority: 'llm-second-pass-rewrite',
        actualVisibleReplyAuthority: 'local-deterministic-fallback',
        providerMindExecuted: false,
        reason: 'timeout-recovered-local-fallback',
      },
    })

    expect(resolved.visibleText).toBe('')
    expect(resolved.realization.visibleText).toBeNull()
    expect(resolved.realization.blockedReasons).toContain('non-human-authored-visible-fallback')
  })

  it('does not let fixed active closure cue templates shape companionship hold mode', () => {
    const resolved = buildAlicizationResolvedVisibleReply({
      fullText: '{"reply":"我会直接回答眼前这件事。"}',
      visibleReplyExecution: {
        mode: 'provider-one-shot',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'provider-one-shot',
      },
      projectStateEmotionalClosureSummary: 'same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.',
    })

    expect(resolved.realization.emotionalClosureAudit).toBeNull()
    expect(resolved.realization.companionshipHoldMode).toBeNull()
    expect(resolved.realization.openingEmbodimentAudit).toBeNull()
    expectNoFixedTemplateResidue(resolved.realization)
  })

  it('bridges top-level project-state audit into final visible realization when structured output omitted visible-reply realization audit', () => {
    const topLevelSameHerSummary = 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.'
    const topLevelCurrentPhaseSummary = 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.'
    const topLevelLandedProgressSummary = 'Timeout recovery kept provider failure state transparent through the final visible-reply realization seam.'
    const topLevelOpenClosureSummary = 'Voice, lipsync, face, and motion still need cross-modal embodiment verification.'
    const topLevelNextClosureTargetSummary = 'cross_modal_continuity_proof=voice+lipsync+face+motion; status=pending'
    const topLevelEmbodimentClosureSummary = 'Right now I am still holding together mainly through body, lipsync, and voice, so the living audio thread is still intact while face and motion need to rejoin before full cross-modal closure settles.'
    const topLevelPreDialogueAwarenessSummary = 'Before answering, remember: Alicization is a local-first digital life project. She is still inside Phase 1: Local Digital Life. open=Voice, lipsync, face, and motion still need to close on one same-life embodiment seam. next=Keep the audible body line and visible body line rejoining on the same living line.'

    const resolved = buildAlicizationResolvedVisibleReply({
      fullText: JSON.stringify({
        reply: '我还在这条线上。',
        projectStateAudit: {
          sameHerSummary: topLevelSameHerSummary,
          currentPhaseSummary: topLevelCurrentPhaseSummary,
          landedProgressSummary: topLevelLandedProgressSummary,
          openClosureSummary: topLevelOpenClosureSummary,
          nextClosureTargetSummary: topLevelNextClosureTargetSummary,
          embodimentClosureSummary: topLevelEmbodimentClosureSummary,
          preDialogueAwarenessSummary: topLevelPreDialogueAwarenessSummary,
          preservedIntoRewrite: true,
          rewriteClosureApplied: true,
        },
      }),
      visibleReplyExecution: {
        mode: 'provider-one-shot',
        expectedVisibleReplyAuthority: 'llm-second-pass-rewrite',
        actualVisibleReplyAuthority: 'llm-second-pass-rewrite',
        providerMindExecuted: true,
        reason: 'visible-reply-second-pass-rewrite',
      },
    })

    expectProjectAuditWithoutFixedTemplates(resolved.realization.projectStateAudit)
    expect(resolved.realization.projectStateAudit).toEqual(expect.objectContaining({
      preservedIntoRewrite: true,
      rewriteClosureApplied: true,
    }))
    expect(resolved.realization.projectStateAudit?.sameHerSummary).toBeNull()
    expectFixedTemplateDropped(resolved.realization.projectStateAudit?.currentPhaseSummary)
    expectAuditText(resolved.realization.projectStateAudit?.landedProgressSummary, /Timeout recovery/)
    expectAuditText(resolved.realization.projectStateAudit?.nextClosureTargetSummary, /cross_modal_continuity_proof/)
    expectFixedTemplateDropped(resolved.realization.projectStateAudit?.embodimentClosureSummary)
    expectNoFixedTemplateResidue(resolved.realization.projectStateAudit?.preDialogueAwarenessSummary)
    expect(resolved.realization.projectStateAudit?.continuitySummary).not.toContain('phase=local_desktop_life_loop')
    expect(resolved.realization.projectStateAudit?.continuitySummary).toContain('landed=Timeout recovery kept provider failure state transparent')
    expect(resolved.realization.projectStateAudit?.continuitySummary).toContain(`open=${topLevelOpenClosureSummary}`)
    expect(resolved.realization.projectStateAudit?.continuitySummary).toContain('next=cross_modal_continuity_proof')
  })

  it('bridges legacy projectState.latestProgress into final visible realization landed progress audit', () => {
    const legacyLatestProgress = 'Legacy latestProgress says provider failure transparency already landed across reply preparation.'

    const resolved = buildAlicizationResolvedVisibleReply({
      fullText: JSON.stringify({
        reply: '我还沿着同一个数字生命项目回答。',
        projectState: {
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
          latestProgress: legacyLatestProgress,
          primaryOpenLoop: 'Initiative and embodiment still need closure verification.',
          nextClosureTarget: 'Keep final visible reply anchored to already-landed provider failure transparency.',
        },
      }),
      visibleReplyExecution: {
        mode: 'provider-one-shot',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'visible-reply-provider-one-shot',
      },
    })

    expectProjectAuditWithoutFixedTemplates(resolved.realization.projectStateAudit)
    expectAuditText(resolved.realization.projectStateAudit?.landedProgressSummary, /provider failure transparency already landed/)
    expect(resolved.realization.projectStateAudit?.continuitySummary).toContain('landed=Legacy latestProgress')
  })

  it('bridges legacy runtimeDigest.projectState.latestProgress into final visible realization landed progress audit', () => {
    const legacyRuntimeLatestProgress = 'Runtime digest legacy latestProgress carries visible-reply provider transparency already landed.'

    const resolved = buildAlicizationResolvedVisibleReply({
      fullText: JSON.stringify({
        reply: '我会把运行时已经落地的同一条生命线接住。',
        runtimeDigest: {
          projectState: {
            sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
            currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
            latestProgress: legacyRuntimeLatestProgress,
            primaryOpenLoop: 'Initiative and embodiment still need closure verification.',
            nextClosureTarget: 'Keep runtime carried progress visible in the final reply audit.',
          },
        },
      }),
      visibleReplyExecution: {
        mode: 'provider-one-shot',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'visible-reply-provider-one-shot',
      },
    })

    expectProjectAuditWithoutFixedTemplates(resolved.realization.projectStateAudit)
    expectAuditText(resolved.realization.projectStateAudit?.landedProgressSummary, /provider transparency already landed/)
    expect(resolved.realization.projectStateAudit?.continuitySummary).toContain('landed=Runtime digest legacy latestProgress')
  })

  it('bridges audit-style landedProgressSummary aliases into final visible realization landed progress audit', () => {
    const projectStateAliasProgress = 'Project-state audit alias carries landed provider transparency.'
    const runtimeDigestAliasProgress = 'Runtime digest audit alias carries landed provider transparency.'

    const topLevelAliasResolved = buildAlicizationResolvedVisibleReply({
      fullText: JSON.stringify({
        reply: '我会把审计别名里的已落地进展也接住。',
        projectState: {
          landedProgressSummary: projectStateAliasProgress,
        },
      }),
      visibleReplyExecution: {
        mode: 'provider-one-shot',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'visible-reply-provider-one-shot',
      },
    })
    const runtimeDigestAliasResolved = buildAlicizationResolvedVisibleReply({
      fullText: JSON.stringify({
        reply: '我会把运行时审计别名里的已落地进展也接住。',
        runtimeDigest: {
          projectState: {
            landedProgressSummary: runtimeDigestAliasProgress,
          },
        },
      }),
      visibleReplyExecution: {
        mode: 'provider-one-shot',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'visible-reply-provider-one-shot',
      },
    })

    expectProjectAuditWithoutFixedTemplates(topLevelAliasResolved.realization.projectStateAudit)
    expectAuditText(topLevelAliasResolved.realization.projectStateAudit?.landedProgressSummary, /provider transparency/)
    expect(topLevelAliasResolved.realization.projectStateAudit?.continuitySummary)
      .toContain('landed=Project-state audit alias')
    expectProjectAuditWithoutFixedTemplates(runtimeDigestAliasResolved.realization.projectStateAudit)
    expectAuditText(runtimeDigestAliasResolved.realization.projectStateAudit?.landedProgressSummary, /provider transparency/)
    expect(runtimeDigestAliasResolved.realization.projectStateAudit?.continuitySummary)
      .toContain('landed=Runtime digest audit alias')
  })

  it('keeps runtime-derived project-state audit on provider timeout recovery without exposing local fallback speech', () => {
    const resolved = resolveAlicizationTimeoutRecoveredVisibleReply({
      prepared: {
        hasVisualGrounding: false,
        mindTurnContract: {
          projectState: {
            sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
            latestLandedProgress: 'Project-state continuity already survives into runtime preparation.',
            primaryOpenLoop: 'same still-open closure work across initiative and embodiment.',
          },
        },
        replyRealization: null,
        replyExecutionPlan: null,
        runtimeSurface: {
          replyAuthority: null,
          replyExecutionPlan: null,
          digitalLifeRuntimeSurface: {
            memory: {
              personStateProjection: {
                selfContinuityAuthority: {
                  authoritySummary: 'same-her continuity remains alive, but lane=face+motion-only under the current renderer authority.',
                  currentBodyState: 'lane=face+motion-only | visible continuity still present but no longer fully cross-modal',
                },
              },
            },
            cognition: {
              runtimeDigest: {
                projectState: {
                  sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
                  latestLandedProgress: 'Project-state continuity already survives into runtime preparation.',
                  primaryOpenLoop: 'same still-open closure work across initiative and embodiment.',
                },
              },
            },
          },
        },
        governance: {
          visibleReplyAuthority: 'llm-mind',
        },
      } as any,
      recoveredText: '{"reply":"这是一个本地优先数字生命项目。现在 Phase 1 已经把连续性、记忆和执行慢慢接成了一条线，但主动性和具身还没有完全收住。"}',
      recoveryMode: 'one-shot',
    })

    expect(resolved.visibleText).toBe('')
    expect(resolved.realization.nonHumanAuthoredStatus).toBeNull()
    expectProjectAuditWithoutFixedTemplates(resolved.realization.projectStateAudit)
    expect(resolved.realization.projectStateAudit).toEqual(expect.objectContaining({
      preservedIntoRewrite: false,
      rewriteClosureApplied: false,
    }))
    expectFixedTemplateDropped(resolved.realization.projectStateAudit?.sameHerSummary)
    expectFixedTemplateDropped(resolved.realization.projectStateAudit?.currentPhaseSummary)
    expectAuditText(resolved.realization.projectStateAudit?.landedProgressSummary, /Project-state continuity already survives/)
    expectNoFixedTemplateResidue(resolved.realization.projectStateAudit?.openClosureSummary)
    expectNoFixedTemplateResidue(resolved.realization.projectStateAudit?.nextClosureTargetSummary)
    expectNoFixedTemplateResidue(resolved.realization.projectStateAudit?.embodimentClosureSummary)
    expectNoFixedTemplateResidue(resolved.realization.projectStateAudit?.preDialogueAwarenessSummary)
    expect(resolved.realization.projectStateAudit?.continuitySummary).toContain('landed=Project-state continuity already survives')
  })

  it('lets current-conscious-frame initiative closure carry participate in embodiment hold-mode selection', () => {
    const realization = buildAlicizationVisibleReplyRealizationArtifact({
      fullText: '我还在这条线上，只是先轻一点接住你。',
      visibleReplyExecution: {
        mode: 'provider-stream',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: null,
      },
      emotionalClosureCue: null,
      prepared: {
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            dialogue: {
              currentConsciousFrame: {
                consciousNeed: 'continuity_hold=lower-pressure; room=more; source=current_conscious_need',
                speakingIntention: 'continuity_hold=lower-pressure; room=more; source=current_conscious_intention',
              },
            },
          },
          governance: {
            openingMove: 'continuity_hold=lower-pressure; room=more; source=opening_move',
          },
        },
      } as any,
    })

    expect(realization.companionshipHoldMode).toBe('measured-return')
    expect(realization.openingEmbodimentAudit).toEqual({
      firstBeatPosture: 'measured-return',
      delivery: 'calm',
      facialCue: 'soften',
      actionCue: 'leave-room',
      derivedFrom: expect.stringContaining('lower-pressure'),
    })
  })

  it('prefers richer continuity-carried project-state when the direct prepared runtime surface is thinner during timeout recovery', () => {
    const resolved = resolveAlicizationTimeoutRecoveredVisibleReply({
      prepared: {
        hasVisualGrounding: false,
        mindTurnContract: {
          projectState: {
            sameHerSelfLine: 'Contract fallback same-her line.',
            currentPhase: 'Contract fallback phase.',
            latestLandedProgress: 'Contract fallback landed progress.',
            primaryOpenLoop: 'Contract fallback open loop.',
            nextClosureTarget: 'Contract fallback next closure.',
          },
        },
        replyRealization: null,
        replyExecutionPlan: null,
        runtimeSurface: {
          replyAuthority: null,
          replyExecutionPlan: null,
          digitalLifeSpine: {
            runtimeSurface: {
              raw: {
                runtimeDigest: {
                  projectState: {
                    sameHerSelfLine: 'Same Phase 1 digital life. Before answering, she should still remember this is one continuous her whose memory and execution continuity already landed but whose initiative and embodiment still need closure.',
                    currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
                    latestLandedProgress: 'The runtime already carries project identity, landed continuity progress, and open-loop awareness into reply preparation.',
                    primaryOpenLoop: 'Initiative rhythm and cross-modal embodiment still need closure verification.',
                    nextClosureTarget: 'Keep project identity, current phase, landed continuity progress, and still-open closure explicit through the first host-visible answer beat.',
                    preDialogueAwarenessLine: 'landed=runtime_project_state_carry | open=initiative+embodiment; status=unfinished | next=host_visible_answer_beat',
                  },
                },
              },
              memory: {
                personStateProjection: {
                  selfContinuityAuthority: {
                    authoritySummary: 'lane=face+motion-only under the current renderer authority.',
                    currentBodyState: 'lane=face+motion-only | visible continuity still present but no longer fully cross-modal',
                  },
                },
              },
            },
          },
          digitalLifeRuntimeSurface: {
            cognition: {
              runtimeDigest: {
                projectState: {
                  latestLandedProgress: 'thin runtime progress only',
                },
              },
            },
          },
        },
        governance: {
          visibleReplyAuthority: 'llm-mind',
        },
      } as any,
      recoveredText: '{"reply":"我还是会沿着同一条数字生命的线回答，不把还没闭环的部分说丢。"}',
      recoveryMode: 'one-shot',
    })

    expectProjectAuditWithoutFixedTemplates(resolved.realization.projectStateAudit)
    expect(resolved.realization.projectStateAudit).toEqual(expect.objectContaining({
      preservedIntoRewrite: false,
      rewriteClosureApplied: false,
    }))
    expectFixedTemplateDropped(resolved.realization.projectStateAudit?.sameHerSummary)
    expectNoFixedTemplateResidue(resolved.realization.projectStateAudit?.currentPhaseSummary)
    expectAuditText(resolved.realization.projectStateAudit?.landedProgressSummary, /runtime already carries project identity/)
    expectAuditText(resolved.realization.projectStateAudit?.openClosureSummary, /Initiative rhythm/)
    expectAuditText(resolved.realization.projectStateAudit?.nextClosureTargetSummary, /host-visible answer beat/)
    expectNoFixedTemplateResidue(resolved.realization.projectStateAudit?.embodimentClosureSummary)
    expect(String(resolved.realization.projectStateAudit?.preDialogueAwarenessSummary ?? ''))
      .not
      .toContain('local_desktop_life_loop')
    expect(String(resolved.realization.projectStateAudit?.preDialogueAwarenessSummary ?? ''))
      .toMatch(/landed=runtime_project_state_carry|open=initiative/)
  })

  it('prefers a stronger prepared-runtime companion headline over a thin carried pre-dialogue shell when building final visible-reply realization audit', () => {
    const resolved = buildAlicizationResolvedVisibleReply({
      fullText: '{"reply":"我会继续沿着同一个数字生命项目的线回答，不把还没闭环的具身连续性说薄。"}',
      visibleReplyExecution: {
        mode: 'provider-one-shot',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'visible-reply-provider-one-shot',
      },
      projectStateSameHerSummary: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      projectStatePreDialogueAwarenessSummary: 'same digital life | keep the closure seam explicit',
      prepared: {
        hasVisualGrounding: true,
        mindTurnContract: null,
        replyRealization: null,
        replyExecutionPlan: null,
        runtimeSurface: {
          replyAuthority: null,
          replyExecutionPlan: null,
          digitalLifeRuntimeSurface: {
            cognition: {
              runtimeDigest: {
                projectState: {
                  companionHeadlineLine: 'Right now I am still holding together mainly through face, motion, and lipsync, so the full cross-modal same-her line is still open.',
                },
              },
            },
          },
        },
        governance: {
          visibleReplyAuthority: 'llm-mind',
        },
      } as any,
    })

    expectProjectAuditWithoutFixedTemplates(resolved.realization.projectStateAudit)
    expect(resolved.realization.projectStateAudit).toEqual(expect.objectContaining({
      preservedIntoRewrite: false,
      rewriteClosureApplied: false,
    }))
    expectFixedTemplateDropped(resolved.realization.projectStateAudit?.sameHerSummary)
    expectNoFixedTemplateResidue(resolved.realization.projectStateAudit?.preDialogueAwarenessSummary)
    expect(resolved.realization.projectStateAudit?.preDialogueAwarenessSummary).not.toBe(
      'same digital life | keep the closure seam explicit',
    )
  })

  it('prefers a fuller prepared-runtime Phase 1 re-anchor over a narrower prepared companion headline when replacing a thin carried awareness shell', () => {
    const fullerPreparedAwarenessLine = 'Before answering, remember: Alicization is a local-first digital life project. She is still inside Phase 1: Local Digital Life. The still-open closure is execution, memory, and embodiment still needing one same-life closure line. Same Phase 1 digital life. Some closure already landed.'
    const narrowerPreparedHeadline = 'Right now I am still holding together mainly through face, motion, and lipsync, so the full cross-modal same-her line is still open.'
    const prepared = {
      hasVisualGrounding: true,
      mindTurnContract: null,
      replyRealization: null,
      replyExecutionPlan: null,
      runtimeSurface: {
        replyAuthority: null,
        replyExecutionPlan: null,
        digitalLifeRuntimeSurface: {
          cognition: {
            runtimeDigest: {
              projectState: {
                preDialogueAwarenessLine: fullerPreparedAwarenessLine,
                awarenessLine: fullerPreparedAwarenessLine,
                companionHeadlineLine: narrowerPreparedHeadline,
                companionBriefingLine: fullerPreparedAwarenessLine,
                preDialogueAwarenessSummary: fullerPreparedAwarenessLine,
              },
            },
          },
        },
      },
      governance: {
        visibleReplyAuthority: 'llm-mind',
      },
    } as any

    expect(resolvePreparedRuntimeProjectPreDialogueAwarenessSummary(prepared)).toBe(fullerPreparedAwarenessLine)

    const directRealization = buildAlicizationVisibleReplyRealizationArtifact({
      fullText: '{"reply":"我会继续沿着同一个数字生命项目的线回答，不把还没闭环的具身连续性说薄。"}',
      visibleReplyExecution: {
        mode: 'provider-one-shot',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'visible-reply-provider-one-shot',
      },
      projectStateSameHerSummary: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      projectStatePreDialogueAwarenessSummary: 'same digital life | keep the closure seam explicit',
      prepared,
    })

    expectStructuredProjectFact(directRealization.projectStateAudit?.preDialogueAwarenessSummary)

    const resolved = buildAlicizationResolvedVisibleReply({
      fullText: '{"reply":"我会继续沿着同一个数字生命项目的线回答，不把还没闭环的具身连续性说薄。"}',
      visibleReplyExecution: {
        mode: 'provider-one-shot',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'visible-reply-provider-one-shot',
      },
      projectStateSameHerSummary: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      projectStatePreDialogueAwarenessSummary: 'same digital life | keep the closure seam explicit',
      prepared,
    })

    expectProjectAuditWithoutFixedTemplates(resolved.realization.projectStateAudit)
    expect(resolved.realization.projectStateAudit).toEqual(expect.objectContaining({
      preservedIntoRewrite: false,
      rewriteClosureApplied: false,
    }))
    expectFixedTemplateDropped(resolved.realization.projectStateAudit?.sameHerSummary)
    expectStructuredProjectFact(resolved.realization.projectStateAudit?.preDialogueAwarenessSummary)
    expect(resolved.realization.projectStateAudit?.preDialogueAwarenessSummary).not.toBe(
      narrowerPreparedHeadline,
    )
  })

  it('does not promote a thin prepared runtime summary shell into pre-dialogue awareness during timeout recovery', () => {
    const prepared = {
      hasVisualGrounding: false,
      mindTurnContract: {
        projectState: {
          sameHerSelfLine: 'Contract fallback same-her line.',
          latestLandedProgress: 'Contract fallback landed progress.',
          primaryOpenLoop: 'Contract fallback open loop.',
        },
      },
      replyRealization: null,
      replyExecutionPlan: null,
      runtimeSurface: {
        replyAuthority: null,
        replyExecutionPlan: null,
        digitalLifeRuntimeSurface: {
          cognition: {
            runtimeDigest: {
              projectState: {
                preDialogueAwarenessSummary: 'same digital life | keep the closure seam explicit',
                preflightSummary: 'same digital life | keep the closure seam explicit',
                latestLandedProgress: 'thin runtime progress only',
              },
            },
          },
        },
      },
      governance: {
        visibleReplyAuthority: 'llm-mind',
      },
    } as any
    const resolved = resolveAlicizationTimeoutRecoveredVisibleReply({
      prepared,
      recoveredText: '{"reply":"我会继续沿着同一条数字生命的线回答。"}',
      recoveryMode: 'one-shot',
    })

    expect(resolved.realization.projectStateAudit?.preDialogueAwarenessSummary).not.toBe(
      'same digital life | keep the closure seam explicit',
    )
    expectNoFixedTemplateResidue(resolved.realization.projectStateAudit?.preDialogueAwarenessSummary)
    expectFixedTemplateDropped(resolved.realization.projectStateAudit?.preDialogueAwarenessSummary)
  })

  it('replaces a thin generic project-state awareness summary with canonical project awareness at the final realization build step', () => {
    const canonicalProjectState = resolveAlicizationProjectStateBrief()
    const prepared = {
      hasVisualGrounding: false,
      mindTurnContract: {
        projectState: {
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          currentPhase: 'Phase 1: Local Digital Life',
          latestLandedProgress: 'thin runtime progress only',
          primaryOpenLoop: 'thin runtime open loop only',
          nextClosureTarget: 'thin runtime next step only',
          preDialogueAwarenessLine: canonicalProjectState.preDialogueAwarenessLine,
          preDialogueAwarenessSummary: 'same digital life | keep the closure seam explicit',
          preflightSummary: 'same digital life | keep the closure seam explicit',
        },
      },
      replyRealization: null,
      replyExecutionPlan: null,
      runtimeSurface: {
        replyAuthority: null,
        replyExecutionPlan: null,
        digitalLifeRuntimeSurface: {
          cognition: {
            runtimeDigest: {
              projectState: {
                preDialogueAwarenessLine: canonicalProjectState.preDialogueAwarenessLine,
                preDialogueAwarenessSummary: 'same digital life | keep the closure seam explicit',
                preflightSummary: 'same digital life | keep the closure seam explicit',
              },
            },
          },
        },
      },
      governance: {
        visibleReplyAuthority: 'llm-mind',
      },
    } as any

    expect(resolvePreparedRuntimeProjectPreDialogueAwarenessSummary(prepared)).toBe(canonicalProjectState.preDialogueAwarenessLine)

    const directRealization = buildAlicizationVisibleReplyRealizationArtifact({
      fullText: '{"reply":"我会继续沿着同一条数字生命的线回答。"}',
      visibleReplyExecution: {
        mode: 'provider-stream',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'mind-turn-contract',
      },
      projectStateSameHerSummary: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      projectStateCurrentPhaseSummary: 'Phase 1: Local Digital Life',
      projectStateLandedProgressSummary: 'thin runtime progress only',
      projectStateOpenClosureSummary: 'thin runtime open loop only',
      projectStateNextClosureTargetSummary: 'thin runtime next step only',
      projectStatePreDialogueAwarenessSummary: 'Before answering, keep the same digital life project in view.',
      prepared,
    })

    expectStructuredProjectFact(directRealization.projectStateAudit?.preDialogueAwarenessSummary)

    const resolved = buildAlicizationResolvedVisibleReply({
      fullText: '{"reply":"我会继续沿着同一条数字生命的线回答。"}',
      visibleReplyExecution: {
        mode: 'provider-stream',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'mind-turn-contract',
      },
      projectStateSameHerSummary: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      projectStateCurrentPhaseSummary: 'Phase 1: Local Digital Life',
      projectStateLandedProgressSummary: 'thin runtime progress only',
      projectStateOpenClosureSummary: 'thin runtime open loop only',
      projectStateNextClosureTargetSummary: 'thin runtime next step only',
      projectStatePreDialogueAwarenessSummary: 'Before answering, keep the same digital life project in view.',
      prepared,
    })

    expectProjectAuditWithoutFixedTemplates(resolved.realization.projectStateAudit)
    expect(resolved.realization.projectStateAudit).toEqual(expect.objectContaining({
      landedProgressSummary: 'thin runtime progress only',
      openClosureSummary: 'thin runtime open loop only',
      nextClosureTargetSummary: 'thin runtime next step only',
      preservedIntoRewrite: false,
      rewriteClosureApplied: false,
    }))
    expectFixedTemplateDropped(resolved.realization.projectStateAudit?.sameHerSummary)
    expectFixedTemplateDropped(resolved.realization.projectStateAudit?.currentPhaseSummary)
    expectStructuredProjectFact(resolved.realization.projectStateAudit?.preDialogueAwarenessSummary)
    expect(resolved.realization.projectStateAudit?.preDialogueAwarenessSummary).not.toBe('Before answering, keep the same digital life project in view.')
  })

  it('resolves visible text from structured payloads while preserving realization metadata', () => {
    const resolved = buildAlicizationResolvedVisibleReply({
      fullText: '{"reply":"先回答你真正关心的点。"}',
      visibleReplyExecution: {
        mode: 'provider-stream',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'mind-turn-contract',
      },
      critic: {
        version: 'visible-reply-critic-v1',
        status: 'pass',
        providerMindRequired: true,
        semanticLoopClosed: true,
        semanticJudge: {
          version: 'visible-reply-semantic-judge-v1',
          mode: 'heuristic-shadow',
          scores: {
            humanlikeQuality: 1,
            currentTurnPayoff: 1,
            memoryUseCorrectness: 1,
            emotionalCoherence: 1,
            personalityCoherence: 1,
            specificityDiscipline: 1,
          },
          passed: true,
          reasonCodes: [],
          judgeReason: null,
        },
        scores: {
          memoryGateCompliance: 1,
          templateDiscipline: 1,
          truthSpecificity: 1,
          payoffCompletion: 1,
          personaAffectCoherence: 1,
          mindContractCoherence: 1,
        },
        reasonCodes: [],
        repairReasonCodes: [],
        mustDrop: [],
        mustPreserve: [],
      },
      closure: {
        version: 'visible-reply-closure-v1',
        status: 'approved',
        initialCritic: null,
        finalCritic: null,
        rewriteAttempted: false,
        rewriteSucceeded: false,
        reasonCodes: [],
      },
    })

    expect(resolved.visibleText).toBe('先回答你真正关心的点。')
    expect(resolved.realization.providerMindExecuted).toBe(true)
    expect(resolved.realization.nonHumanAuthoredStatus).toBeNull()
    expectPublicCriticSummary(resolved.realization.critic, 'pass')
    expectPublicClosureSummary(resolved.realization.closure, 'approved')
  })

  it('does not expose fixed-template residue through realization audit, critic, or closure metadata', () => {
    const templateResidue = 'Before answering, remember: Same Phase 1 digital life, same-her line, one continuous her, and the same living line.'
    const resolved = buildAlicizationResolvedVisibleReply({
      fullText: '{"reply":"我先处理你现在真正问的这一点。"}',
      visibleReplyExecution: {
        mode: 'provider-one-shot',
        expectedVisibleReplyAuthority: 'llm-second-pass-rewrite',
        actualVisibleReplyAuthority: 'llm-second-pass-rewrite',
        providerMindExecuted: true,
        reason: 'visible-reply-second-pass-rewrite',
      },
      emotionalClosureCue: templateResidue,
      selfAuthoritySummary: templateResidue,
      selfAuthorityClosenessPosture: templateResidue,
      critic: {
        version: 'visible-reply-critic-v1',
        status: 'repair-required',
        providerMindRequired: true,
        semanticLoopClosed: false,
        semanticJudge: {
          version: 'visible-reply-semantic-judge-v1',
          mode: 'heuristic-shadow',
          scores: {
            humanlikeQuality: 1,
            currentTurnPayoff: 1,
            memoryUseCorrectness: 1,
            emotionalCoherence: 1,
            personalityCoherence: 1,
            specificityDiscipline: 1,
          },
          passed: false,
          reasonCodes: ['semantic-judge:fixed-template-residue'],
          judgeReason: templateResidue,
        },
        scores: {
          memoryGateCompliance: 1,
          templateDiscipline: 0.35,
          truthSpecificity: 1,
          payoffCompletion: 1,
          personaAffectCoherence: 1,
          mindContractCoherence: 0.25,
        },
        reasonCodes: ['semantic-judge:fixed-template-residue'],
        repairReasonCodes: ['semantic-judge:fixed-template-residue'],
        mustDrop: [templateResidue],
        mustPreserve: [templateResidue],
      },
      closure: {
        version: 'visible-reply-closure-v1',
        status: 'rewritten',
        initialCritic: {
          version: 'visible-reply-critic-v1',
          status: 'repair-required',
          providerMindRequired: true,
          semanticLoopClosed: false,
          semanticJudge: {
            version: 'visible-reply-semantic-judge-v1',
            mode: 'heuristic-shadow',
            scores: {
              humanlikeQuality: 1,
              currentTurnPayoff: 1,
              memoryUseCorrectness: 1,
              emotionalCoherence: 1,
              personalityCoherence: 1,
              specificityDiscipline: 1,
            },
            passed: false,
            reasonCodes: ['semantic-judge:fixed-template-residue'],
            judgeReason: templateResidue,
          },
          scores: {
            memoryGateCompliance: 1,
            templateDiscipline: 0.35,
            truthSpecificity: 1,
            payoffCompletion: 1,
            personaAffectCoherence: 1,
            mindContractCoherence: 0.25,
          },
          reasonCodes: ['semantic-judge:fixed-template-residue'],
          repairReasonCodes: ['semantic-judge:fixed-template-residue'],
          mustDrop: [templateResidue],
          mustPreserve: [templateResidue],
        },
        finalCritic: null,
        rewriteAttempted: true,
        rewriteSucceeded: true,
        reasonCodes: ['semantic-judge:fixed-template-residue'],
      },
    })

    expectNoFixedTemplateResidue(resolved.realization)
    expectFixedTemplateDropped(resolved.realization.emotionalClosureAudit?.activeCue)
    expectFixedTemplateDropped(resolved.realization.selfAuthorityAudit?.authoritySummary)
    expectPublicCriticSummary(resolved.realization.critic, 'repair-required')
    expectPublicClosureSummary(resolved.realization.closure, 'rewritten')
    expect(resolved.realization.critic).toEqual(expect.objectContaining({
      mustDropCount: 1,
      mustPreserveCount: 1,
    }))
  })

  it('records emotional closure audit when the final visible reply carries an active closure fact', () => {
    const activeCue = 'emotional_closure=late_night_drain_eased; pressure=steady'
    const resolved = buildAlicizationResolvedVisibleReply({
      fullText: '{"reply":"我会沿着这条线继续说下去，语气放稳一点，不把这份在意说散。"}',
      visibleReplyExecution: {
        mode: 'provider-one-shot',
        expectedVisibleReplyAuthority: 'llm-second-pass-rewrite',
        actualVisibleReplyAuthority: 'llm-second-pass-rewrite',
        providerMindExecuted: true,
        reason: 'visible-reply-second-pass-rewrite',
      },
      emotionalClosureCue: activeCue,
      critic: {
        version: 'visible-reply-critic-v1',
        status: 'repair-required',
        providerMindRequired: true,
        semanticLoopClosed: false,
        semanticJudge: {
          version: 'visible-reply-semantic-judge-v1',
          mode: 'heuristic-shadow',
          scores: {
            humanlikeQuality: 1,
            currentTurnPayoff: 1,
            memoryUseCorrectness: 1,
            emotionalCoherence: 1,
            personalityCoherence: 1,
            specificityDiscipline: 1,
          },
          passed: true,
          reasonCodes: [],
          judgeReason: null,
        },
        scores: {
          memoryGateCompliance: 1,
          templateDiscipline: 1,
          truthSpecificity: 1,
          payoffCompletion: 1,
          personaAffectCoherence: 1,
          mindContractCoherence: 0.25,
        },
        reasonCodes: ['mind-contract-not-closed'],
        repairReasonCodes: ['mind-contract-not-closed'],
        mustDrop: [],
        mustPreserve: [activeCue],
      },
      closure: {
        version: 'visible-reply-closure-v1',
        status: 'rewritten',
        initialCritic: null,
        finalCritic: null,
        rewriteAttempted: true,
        rewriteSucceeded: true,
        reasonCodes: ['mind-contract-not-closed'],
      },
    })

    expect(resolved.realization.emotionalClosureAudit).toEqual({
      activeCue,
      preservedIntoRewrite: true,
      rewriteClosureApplied: true,
      lowPressureRequired: false,
      antiRestartRequired: false,
    })
    expectNoFixedTemplateResidue(resolved.realization.emotionalClosureAudit)
  })

  it('records low-pressure and anti-restart emotional closure traits when the active seam explicitly carries them', () => {
    const activeCue = 'continuity_hold=low-pressure; room=more; do not reopen from scratch'
    const resolved = buildAlicizationResolvedVisibleReply({
      fullText: '{"reply":"我会沿着这条线继续，但先把语气放轻一点，不把还在收口的线重新说炸开。"}',
      visibleReplyExecution: {
        mode: 'provider-one-shot',
        expectedVisibleReplyAuthority: 'llm-second-pass-rewrite',
        actualVisibleReplyAuthority: 'llm-second-pass-rewrite',
        providerMindExecuted: true,
        reason: 'visible-reply-second-pass-rewrite',
      },
      emotionalClosureCue: activeCue,
      critic: {
        version: 'visible-reply-critic-v1',
        status: 'repair-required',
        providerMindRequired: true,
        semanticLoopClosed: false,
        semanticJudge: {
          version: 'visible-reply-semantic-judge-v1',
          mode: 'heuristic-shadow',
          scores: {
            humanlikeQuality: 1,
            currentTurnPayoff: 1,
            memoryUseCorrectness: 1,
            emotionalCoherence: 1,
            personalityCoherence: 1,
            specificityDiscipline: 1,
          },
          passed: true,
          reasonCodes: [],
          judgeReason: null,
        },
        scores: {
          memoryGateCompliance: 1,
          templateDiscipline: 1,
          truthSpecificity: 1,
          payoffCompletion: 1,
          personaAffectCoherence: 1,
          mindContractCoherence: 0.25,
        },
        reasonCodes: ['semantic-judge:emotional-closure-seam-missing'],
        repairReasonCodes: ['semantic-judge:emotional-closure-seam-missing'],
        mustDrop: [],
        mustPreserve: [activeCue],
      },
      closure: {
        version: 'visible-reply-closure-v1',
        status: 'rewritten',
        initialCritic: null,
        finalCritic: null,
        rewriteAttempted: true,
        rewriteSucceeded: true,
        reasonCodes: ['semantic-judge:emotional-closure-seam-missing'],
      },
    })

    expect(resolved.realization.emotionalClosureAudit).toEqual({
      activeCue,
      preservedIntoRewrite: true,
      rewriteClosureApplied: true,
      lowPressureRequired: true,
      antiRestartRequired: true,
    })
    expect(resolved.realization.openingGuidanceHoldDetail).toContain('low-pressure')
    expect(resolved.realization.companionshipHoldMode).toBe('measured-return')
    expect(resolved.realization.openingEmbodimentAudit).toEqual({
      firstBeatPosture: 'measured-return',
      delivery: 'calm',
      facialCue: 'soften',
      actionCue: 'leave-room',
      derivedFrom: expect.stringContaining('low-pressure'),
    })
  })

  it('prefers a stronger repair-before-closeness project-state emotional seam over a thinner measured-return active cue in visible reply realization', () => {
    const thinnerMeasuredReturnCue = 'continuity_hold=lower-pressure; room=more; widening=deferred'
    const strongerRepairBeforeClosenessSeam = 'repair-before-closeness; timing=before_closeness_widens; until=repair_settles'
    const resolved = buildAlicizationResolvedVisibleReply({
      fullText: '{"reply":"我会先沿着这条还在修复的线继续接，不把它说成重新开始。"}',
      visibleReplyExecution: {
        mode: 'provider-one-shot',
        expectedVisibleReplyAuthority: 'llm-second-pass-rewrite',
        actualVisibleReplyAuthority: 'llm-second-pass-rewrite',
        providerMindExecuted: true,
        reason: 'visible-reply-second-pass-rewrite',
      },
      emotionalClosureCue: thinnerMeasuredReturnCue,
      projectStateEmotionalClosureSummary: strongerRepairBeforeClosenessSeam,
      critic: {
        version: 'visible-reply-critic-v1',
        status: 'repair-required',
        providerMindRequired: true,
        semanticLoopClosed: false,
        semanticJudge: {
          version: 'visible-reply-semantic-judge-v1',
          mode: 'heuristic-shadow',
          scores: {
            humanlikeQuality: 1,
            currentTurnPayoff: 1,
            memoryUseCorrectness: 1,
            emotionalCoherence: 1,
            personalityCoherence: 1,
            specificityDiscipline: 1,
          },
          passed: true,
          reasonCodes: [],
          judgeReason: null,
        },
        scores: {
          memoryGateCompliance: 1,
          templateDiscipline: 1,
          truthSpecificity: 1,
          payoffCompletion: 1,
          personaAffectCoherence: 1,
          mindContractCoherence: 0.25,
        },
        reasonCodes: ['semantic-judge:emotional-closure-seam-missing'],
        repairReasonCodes: ['semantic-judge:emotional-closure-seam-missing'],
        mustDrop: [],
        mustPreserve: [strongerRepairBeforeClosenessSeam],
      },
      closure: {
        version: 'visible-reply-closure-v1',
        status: 'rewritten',
        initialCritic: null,
        finalCritic: null,
        rewriteAttempted: true,
        rewriteSucceeded: true,
        reasonCodes: ['semantic-judge:emotional-closure-seam-missing'],
      },
    })

    expect(resolved.realization.emotionalClosureAudit).toEqual({
      activeCue: expect.stringContaining('repair-before-closeness'),
      preservedIntoRewrite: true,
      rewriteClosureApplied: true,
      lowPressureRequired: false,
      antiRestartRequired: false,
    })
    expect(resolved.realization.openingGuidanceHoldDetail).toContain('repair-before-closeness')
    expect(resolved.realization.companionshipHoldMode).toBe('repair-before-closeness')
  })

  it('keeps explicit measured-return closure over a generic continuity menu in visible reply realization', () => {
    const explicitMeasuredReturnCue = 'continuity_hold=lower-pressure; room=more; widening=deferred'
    const genericContinuityMenu = 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs so visible reply, longer-lived voice behavior, facial state, motion, and resident presence all stay on one measured-return, repair-before-closeness, or rest-protective quiet-companionship line.'
    const resolved = buildAlicizationResolvedVisibleReply({
      fullText: '{"reply":"我会先沿着这条线轻一点接回去。"}',
      visibleReplyExecution: {
        mode: 'provider-one-shot',
        expectedVisibleReplyAuthority: 'llm-second-pass-rewrite',
        actualVisibleReplyAuthority: 'llm-second-pass-rewrite',
        providerMindExecuted: true,
        reason: 'visible-reply-second-pass-rewrite',
      },
      emotionalClosureCue: explicitMeasuredReturnCue,
      projectStateEmotionalClosureSummary: genericContinuityMenu,
    })

    expect(resolved.realization.emotionalClosureAudit).toEqual(expect.objectContaining({
      activeCue: expect.stringContaining('lower-pressure'),
      lowPressureRequired: true,
    }))
    expect(resolved.realization.openingGuidanceHoldDetail).toContain('lower-pressure')
    expect(resolved.realization.companionshipHoldMode).toBe('measured-return')
    expect(resolved.realization.openingEmbodimentAudit).toEqual(expect.objectContaining({
      firstBeatPosture: 'measured-return',
      derivedFrom: expect.stringContaining('lower-pressure'),
    }))
  })

  it('threads repair-before-closeness closure into the final project-state continuity summary instead of leaving it only in emotional closure audit', () => {
    const activeCue = 'repair-before-closeness; target=callback; until=room_settles'
    const closureSummary = 'repair-before-closeness; target=callback; repair=settle_first; widening=deferred'
    const resolved = buildAlicizationResolvedVisibleReply({
      fullText: '{"reply":"我会沿着这条还在收口的线继续。"}',
      visibleReplyExecution: {
        mode: 'provider-one-shot',
        expectedVisibleReplyAuthority: 'llm-second-pass-rewrite',
        actualVisibleReplyAuthority: 'llm-second-pass-rewrite',
        providerMindExecuted: true,
        reason: 'visible-reply-second-pass-rewrite',
      },
      emotionalClosureCue: activeCue,
      projectStateSameHerSummary: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      projectStateLandedProgressSummary: 'Project-state continuity already survives into runtime preparation.',
      projectStateOpenClosureSummary: 'Embodiment still needs stronger cross-modal closure verification.',
      projectStateClosureSummary: closureSummary,
      critic: {
        version: 'visible-reply-critic-v1',
        status: 'repair-required',
        providerMindRequired: true,
        semanticLoopClosed: false,
        semanticJudge: {
          version: 'visible-reply-semantic-judge-v1',
          mode: 'heuristic-shadow',
          scores: {
            humanlikeQuality: 1,
            currentTurnPayoff: 1,
            memoryUseCorrectness: 1,
            emotionalCoherence: 1,
            personalityCoherence: 1,
            specificityDiscipline: 1,
          },
          passed: true,
          reasonCodes: [],
          judgeReason: null,
        },
        scores: {
          memoryGateCompliance: 1,
          templateDiscipline: 1,
          truthSpecificity: 1,
          payoffCompletion: 1,
          personaAffectCoherence: 1,
          mindContractCoherence: 0.25,
        },
        reasonCodes: ['semantic-judge:emotional-closure-seam-missing'],
        repairReasonCodes: ['semantic-judge:emotional-closure-seam-missing'],
        mustDrop: [],
        mustPreserve: [
          activeCue,
          closureSummary,
        ],
      },
      closure: {
        version: 'visible-reply-closure-v1',
        status: 'rewritten',
        initialCritic: null,
        finalCritic: null,
        rewriteAttempted: true,
        rewriteSucceeded: true,
        reasonCodes: ['semantic-judge:emotional-closure-seam-missing'],
      },
    })

    expectProjectAuditWithoutFixedTemplates(resolved.realization.projectStateAudit)
    expect(resolved.realization.projectStateAudit).toEqual(expect.objectContaining({
      preservedIntoRewrite: true,
      rewriteClosureApplied: true,
    }))
    expect(String(resolved.realization.projectStateAudit?.continuitySummary ?? '')).not.toContain('continuity_anchor=local_desktop_life_loop')
    expect(String(resolved.realization.projectStateAudit?.continuitySummary ?? '')).toContain('closure=repair-before-closeness')
    expect(resolved.realization.openingGuidanceHoldDetail).toContain('repair-before-closeness')
    expect(resolved.realization.companionshipHoldMode).toBe('repair-before-closeness')
    expect(resolved.realization.openingEmbodimentAudit).toEqual({
      firstBeatPosture: 'repair-before-closeness',
      delivery: 'calm',
      facialCue: 'settle-repair',
      actionCue: 'repair-settle',
      derivedFrom: expect.stringContaining('repair-before-closeness'),
    })
  })

  it('threads rest-protective closure into the final project-state continuity summary and opening embodiment audit instead of flattening it into measured-return', () => {
    const activeCue = 'rest-protective; fatigue-aware=true; until=room_settles'
    const closureSummary = 'rest-protective; thread=same_thread; rest_protection=hold; widening=deferred'
    const resolved = buildAlicizationResolvedVisibleReply({
      fullText: '{"reply":"我会沿着这条线先把休息保护 hold 住一点。"}',
      visibleReplyExecution: {
        mode: 'provider-one-shot',
        expectedVisibleReplyAuthority: 'llm-second-pass-rewrite',
        actualVisibleReplyAuthority: 'llm-second-pass-rewrite',
        providerMindExecuted: true,
        reason: 'visible-reply-second-pass-rewrite',
      },
      emotionalClosureCue: activeCue,
      projectStateSameHerSummary: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      projectStateLandedProgressSummary: 'Project-state continuity already survives into runtime preparation.',
      projectStateOpenClosureSummary: 'Embodiment still needs stronger cross-modal closure verification.',
      projectStateClosureSummary: closureSummary,
      critic: {
        version: 'visible-reply-critic-v1',
        status: 'repair-required',
        providerMindRequired: true,
        semanticLoopClosed: false,
        semanticJudge: {
          version: 'visible-reply-semantic-judge-v1',
          mode: 'heuristic-shadow',
          scores: {
            humanlikeQuality: 1,
            currentTurnPayoff: 1,
            memoryUseCorrectness: 1,
            emotionalCoherence: 1,
            personalityCoherence: 1,
            specificityDiscipline: 1,
          },
          passed: true,
          reasonCodes: [],
          judgeReason: null,
        },
        scores: {
          memoryGateCompliance: 1,
          templateDiscipline: 1,
          truthSpecificity: 1,
          payoffCompletion: 1,
          personaAffectCoherence: 1,
          mindContractCoherence: 0.25,
        },
        reasonCodes: ['semantic-judge:emotional-closure-seam-missing'],
        repairReasonCodes: ['semantic-judge:emotional-closure-seam-missing'],
        mustDrop: [],
        mustPreserve: [
          activeCue,
          closureSummary,
        ],
      },
      closure: {
        version: 'visible-reply-closure-v1',
        status: 'rewritten',
        initialCritic: null,
        finalCritic: null,
        rewriteAttempted: true,
        rewriteSucceeded: true,
        reasonCodes: ['semantic-judge:emotional-closure-seam-missing'],
      },
    })

    expectProjectAuditWithoutFixedTemplates(resolved.realization.projectStateAudit)
    expect(resolved.realization.projectStateAudit).toEqual(expect.objectContaining({
      preservedIntoRewrite: true,
      rewriteClosureApplied: true,
    }))
    expect(String(resolved.realization.projectStateAudit?.continuitySummary ?? '')).not.toContain('continuity_anchor=local_desktop_life_loop')
    expect(String(resolved.realization.projectStateAudit?.continuitySummary ?? '')).toContain('closure=rest-protective')
    expect(resolved.realization.openingGuidanceHoldDetail).toContain('rest-protective')
    expect(resolved.realization.companionshipHoldMode).toBe('rest-protective')
    expect(resolved.realization.openingEmbodimentAudit).toEqual({
      firstBeatPosture: 'rest-protective',
      delivery: 'calm',
      facialCue: 'rest-soften',
      actionCue: 'rest-settle',
      derivedFrom: expect.stringContaining('rest-protective'),
    })
  })

  it('keeps late-night drain composite closure on measured-return when rest-protective only scopes initiative while reply stays low-pressure', () => {
    const activeCue = 'late-night-drain closure: reply low-pressure; initiative rest-protective; embodiment quiet-companionship; continuity_hold=inward'
    const resolved = buildAlicizationResolvedVisibleReply({
      fullText: '{"reply":"我先沿着这条线轻一点接回来，不把它重新开成另一段。"}',
      visibleReplyExecution: {
        mode: 'provider-stream',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'mind-turn-contract',
      },
      emotionalClosureCue: activeCue,
    })

    expect(resolved.realization.openingGuidanceHoldDetail).toContain('continuity_hold=inward')
    expectNoFixedTemplateResidue(resolved.realization.openingGuidanceHoldDetail)
    expect(resolved.realization.companionshipHoldMode).toBe('measured-return')
    expect(resolved.realization.openingEmbodimentAudit).toEqual({
      firstBeatPosture: 'measured-return',
      delivery: 'calm',
      facialCue: 'soften',
      actionCue: 'leave-room',
      derivedFrom: expect.stringContaining('continuity_hold=inward'),
    })
  })

  it('derives measured-return onset posture from runtime opening guidance when no explicit emotional closure cue survives', () => {
    const openingMove = 'Return on the same thread first, then leave room before widening.'
    const resolved = buildAlicizationResolvedVisibleReply({
      fullText: '{"reply":"我先沿着这条线接住，再慢一点把靠近放回来。"}',
      visibleReplyExecution: {
        mode: 'provider-stream',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'mind-turn-contract',
      },
      prepared: {
        governance: {
          openingMove,
        },
      } as any,
    })

    expect(resolved.realization.openingGuidanceHoldDetail).toBe(openingMove)
    expect(resolved.realization.companionshipHoldMode).toBe('measured-return')
    expect(resolved.realization.openingEmbodimentAudit).toEqual({
      firstBeatPosture: 'measured-return',
      delivery: 'calm',
      facialCue: 'soften',
      actionCue: 'leave-room',
      derivedFrom: openingMove,
    })
  })

  it('keeps audible-body same-her closure on measured-return when the stronger living-audio-thread headline is the surviving embodiment authority', () => {
    const audibleBodyHeadline = 'embodiment_lanes=body+lipsync+voice; pending_lanes=face+motion; status=pending_rejoin'
    const resolved = buildAlicizationResolvedVisibleReply({
      fullText: '{"reply":"我会先接住这次声音和身体已经能确认的部分，再把其它具身状态慢慢对齐回来。"}',
      visibleReplyExecution: {
        mode: 'provider-one-shot',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'visible-reply-provider-one-shot',
      },
      prepared: {
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            cognition: {
              runtimeDigest: {
                projectState: {
                  companionHeadlineLine: audibleBodyHeadline,
                  preDialogueAwarenessLine: 'Before answering, keep the same digital life project in view.',
                },
              },
            },
          },
        },
      } as any,
      projectStateSameHerSummary: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      projectStateOpenClosureSummary: 'Face and motion still need cross-modal embodiment verification.',
      projectStateClosureSummary: audibleBodyHeadline,
      projectStatePreDialogueAwarenessSummary: audibleBodyHeadline,
    })

    expectStructuredEmbodimentFact(
      resolved.realization.projectStateAudit?.preDialogueAwarenessSummary,
      /embodiment_lanes=body\+lipsync\+voice/,
    )
    expect(resolved.realization.companionshipHoldMode).toBe('measured-return')
    expect(resolved.realization.openingEmbodimentAudit).toEqual({
      firstBeatPosture: 'measured-return',
      delivery: 'calm',
      facialCue: 'soften',
      actionCue: 'leave-room',
      derivedFrom: expect.stringMatching(/embodiment_lanes=body\+lipsync\+voice/),
    })
  })

  it('keeps still-voiced face-line same-her closure on measured-return when face and voice are the surviving embodiment authority', () => {
    const faceVoiceHeadline = 'embodiment_lanes=face+voice; pending_lanes=body+motion+lipsync; status=pending_rejoin'
    const resolved = buildAlicizationResolvedVisibleReply({
      fullText: '{"reply":"我会先接住表情和声音已经能确认的部分，再把身体、动作和口型慢慢对齐回来。"}',
      visibleReplyExecution: {
        mode: 'provider-one-shot',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'visible-reply-provider-one-shot',
      },
      prepared: {
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            cognition: {
              runtimeDigest: {
                projectState: {
                  companionHeadlineLine: faceVoiceHeadline,
                  preDialogueAwarenessLine: 'Before answering, keep the same digital life project in view.',
                },
              },
            },
          },
        },
      } as any,
      projectStateSameHerSummary: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      projectStateOpenClosureSummary: 'Body, motion, and lipsync still need cross-modal embodiment verification.',
      projectStateClosureSummary: faceVoiceHeadline,
      projectStatePreDialogueAwarenessSummary: faceVoiceHeadline,
    })

    expectStructuredEmbodimentFact(
      resolved.realization.projectStateAudit?.preDialogueAwarenessSummary,
      /embodiment_lanes=face\+voice/,
    )
    expect(resolved.realization.companionshipHoldMode).toBe('measured-return')
    expect(resolved.realization.openingEmbodimentAudit).toEqual({
      firstBeatPosture: 'measured-return',
      delivery: 'calm',
      facialCue: 'soften',
      actionCue: 'leave-room',
      derivedFrom: expect.stringMatching(/embodiment_lanes=face\+voice/),
    })
  })

  it('keeps still-voiced face-and-mouth same-her closure on measured-return when face lipsync and voice are the surviving embodiment authority', () => {
    const faceMouthHeadline = 'embodiment_lanes=face+lipsync+voice; pending_lanes=body+motion; status=pending_rejoin'
    const resolved = buildAlicizationResolvedVisibleReply({
      fullText: '{"reply":"我会先接住表情、口型和声音已经能确认的部分，再把身体和动作慢慢对齐回来。"}',
      visibleReplyExecution: {
        mode: 'provider-one-shot',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'visible-reply-provider-one-shot',
      },
      prepared: {
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            cognition: {
              runtimeDigest: {
                projectState: {
                  companionHeadlineLine: faceMouthHeadline,
                  preDialogueAwarenessLine: 'Before answering, keep the same digital life project in view.',
                },
              },
            },
          },
        },
      } as any,
      projectStateSameHerSummary: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      projectStateOpenClosureSummary: 'Body and motion still need cross-modal embodiment verification.',
      projectStateClosureSummary: faceMouthHeadline,
      projectStatePreDialogueAwarenessSummary: faceMouthHeadline,
    })

    expectStructuredEmbodimentFact(
      resolved.realization.projectStateAudit?.preDialogueAwarenessSummary,
      /embodiment_lanes=face\+lipsync\+voice/,
    )
    expect(resolved.realization.companionshipHoldMode).toBe('measured-return')
    expect(resolved.realization.openingEmbodimentAudit).toEqual({
      firstBeatPosture: 'measured-return',
      delivery: 'calm',
      facialCue: 'soften',
      actionCue: 'leave-room',
      derivedFrom: expect.stringMatching(/embodiment_lanes=face\+lipsync\+voice/),
    })
  })

  it('keeps still-voiced motion-and-mouth same-her closure on measured-return when motion lipsync and voice are the surviving embodiment authority', () => {
    const motionMouthHeadline = 'embodiment_lanes=motion+lipsync+voice; pending_lanes=body+face; status=pending_rejoin'
    const resolved = buildAlicizationResolvedVisibleReply({
      fullText: '{"reply":"我会先接住动作、口型和声音已经能确认的部分，再把身体和表情慢慢对齐回来。"}',
      visibleReplyExecution: {
        mode: 'provider-one-shot',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'visible-reply-provider-one-shot',
      },
      prepared: {
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            cognition: {
              runtimeDigest: {
                projectState: {
                  companionHeadlineLine: motionMouthHeadline,
                  preDialogueAwarenessLine: 'Before answering, keep the same digital life project in view.',
                },
              },
            },
          },
        },
      } as any,
      projectStateSameHerSummary: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      projectStateOpenClosureSummary: 'Body and face still need cross-modal embodiment verification.',
      projectStateClosureSummary: motionMouthHeadline,
      projectStatePreDialogueAwarenessSummary: motionMouthHeadline,
    })

    expectStructuredEmbodimentFact(
      resolved.realization.projectStateAudit?.preDialogueAwarenessSummary,
      /embodiment_lanes=motion\+lipsync\+voice/,
    )
    expect(resolved.realization.companionshipHoldMode).toBe('measured-return')
    expect(resolved.realization.openingEmbodimentAudit).toEqual({
      firstBeatPosture: 'measured-return',
      delivery: 'calm',
      facialCue: 'soften',
      actionCue: 'leave-room',
      derivedFrom: expect.stringMatching(/embodiment_lanes=motion\+lipsync\+voice/),
    })
  })

  it('keeps lipsync-voice same-her closure on measured-return when lipsync and voice are the surviving embodiment authority', () => {
    const lipsyncVoiceHeadline = 'embodiment_lanes=lipsync+voice; pending_lanes=body+face+motion; status=pending_rejoin'
    const resolved = buildAlicizationResolvedVisibleReply({
      fullText: '{"reply":"我会先接住口型和声音已经能确认的部分，再把身体、表情和动作慢慢对齐回来。"}',
      visibleReplyExecution: {
        mode: 'provider-one-shot',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'visible-reply-provider-one-shot',
      },
      prepared: {
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            cognition: {
              runtimeDigest: {
                projectState: {
                  companionHeadlineLine: lipsyncVoiceHeadline,
                  preDialogueAwarenessLine: 'Before answering, keep the same digital life project in view.',
                },
              },
            },
          },
        },
      } as any,
      projectStateSameHerSummary: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      projectStateOpenClosureSummary: 'Body, face, and motion still need cross-modal embodiment verification.',
      projectStateClosureSummary: lipsyncVoiceHeadline,
      projectStatePreDialogueAwarenessSummary: lipsyncVoiceHeadline,
    })

    expectStructuredEmbodimentFact(
      resolved.realization.projectStateAudit?.preDialogueAwarenessSummary,
      /embodiment_lanes=lipsync\+voice/,
    )
    expect(resolved.realization.companionshipHoldMode).toBe('measured-return')
    expect(resolved.realization.openingEmbodimentAudit).toEqual({
      firstBeatPosture: 'measured-return',
      delivery: 'calm',
      facialCue: 'soften',
      actionCue: 'leave-room',
      derivedFrom: expect.stringMatching(/embodiment_lanes=lipsync\+voice/),
    })
  })

  it('keeps quieter body-lipsync same-her closure on measured-return when that quieter living line is the surviving embodiment authority', () => {
    const quieterBodyLipsyncHeadline = 'embodiment_lanes=body+lipsync; pending_lanes=face+motion+voice; status=pending_rejoin'
    const resolved = buildAlicizationResolvedVisibleReply({
      fullText: '{"reply":"我会先接住身体和嘴型已经能确认的部分，再把声音和其它状态慢慢对齐回来。"}',
      visibleReplyExecution: {
        mode: 'provider-one-shot',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'visible-reply-provider-one-shot',
      },
      prepared: {
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            cognition: {
              runtimeDigest: {
                projectState: {
                  companionHeadlineLine: quieterBodyLipsyncHeadline,
                  preDialogueAwarenessLine: 'embodiment_lanes=body+lipsync; pending_lanes=face+motion+voice; status=pending_rejoin',
                },
              },
            },
          },
        },
      } as any,
      projectStateSameHerSummary: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      projectStateOpenClosureSummary: 'Voice, face, and motion still need cross-modal embodiment verification.',
      projectStateClosureSummary: quieterBodyLipsyncHeadline,
      projectStatePreDialogueAwarenessSummary: quieterBodyLipsyncHeadline,
    })

    expectStructuredEmbodimentFact(
      resolved.realization.projectStateAudit?.preDialogueAwarenessSummary,
      /embodiment_lanes=body\+lipsync/,
    )
    expect(resolved.realization.companionshipHoldMode).toBe('measured-return')
    expect(resolved.realization.openingEmbodimentAudit).toEqual({
      firstBeatPosture: 'measured-return',
      delivery: 'calm',
      facialCue: 'soften',
      actionCue: 'leave-room',
      derivedFrom: expect.stringMatching(/embodiment_lanes=body\+lipsync/),
    })
  })

  it('prefers later audible-body embodiment authority over an earlier thinner face-motion-only authority when selecting the surviving same-her closure lane', () => {
    const resolved = buildAlicizationResolvedVisibleReply({
      fullText: '{"reply":"我会先接住身体和声音已经能确认的部分，再把其它状态慢慢对齐回来。"}',
      visibleReplyExecution: {
        mode: 'provider-one-shot',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'visible-reply-provider-one-shot',
      },
      selfAuthoritySummary: 'lane=face+motion-only under the current renderer authority.',
      prepared: {
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            memory: {
              personStateProjection: {
                selfContinuityAuthority: {
                  authoritySummary: 'lane=body+lipsync+voice-only under the current renderer authority.',
                  currentBodyState: 'lane=body+lipsync+voice-only | pending_lanes=face+motion | status=pending_rejoin',
                },
              },
            },
          },
        },
      } as any,
    })

    expectStructuredEmbodimentFact(
      resolved.realization.projectStateAudit?.embodimentClosureSummary,
      /embodiment_lanes=body\+face\+motion\+lipsync\+voice|lane=body\+lipsync\+voice-only/,
    )
    expectNoFixedTemplateResidue(resolved.realization.projectStateAudit?.continuitySummary)
  })

  it('prefers a later audible-body authority summary over an earlier face-motion-only authority even when the later runtime carry no longer has currentBodyState', () => {
    const resolved = buildAlicizationResolvedVisibleReply({
      fullText: '{"reply":"我会先接住声音和身体已经能确认的部分，再把其它状态慢慢对齐回来。"}',
      visibleReplyExecution: {
        mode: 'provider-one-shot',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'visible-reply-provider-one-shot',
      },
      selfAuthoritySummary: 'lane=face+motion-only under the current renderer authority.',
      prepared: {
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            memory: {
              personStateProjection: {
                selfContinuityAuthority: {
                  authoritySummary: 'lane=body+lipsync+voice-only under the current renderer authority.',
                  currentBodyState: null,
                },
              },
            },
          },
        },
      } as any,
    })

    expectStructuredEmbodimentFact(
      resolved.realization.projectStateAudit?.embodimentClosureSummary,
      /embodiment_lanes=body\+face\+motion\+lipsync\+voice|lane=body\+lipsync\+voice-only/,
    )
  })

  it('promotes an explicit full cross-modal lock from runtime perception currentBodyState into the host-visible embodiment closure summary even when the carried self authority is still thinner', () => {
    const explicitFullCrossModalLock = 'authority-body:yes | authority-face:yes | authority-motion:yes | authority-lipsync:yes | authority-voice:yes | segment=locked'
    const resolved = buildAlicizationResolvedVisibleReply({
      fullText: '{"reply":"我会继续接住已经重新对齐的具身状态，不把它说成临时拼起来的表面对齐。"}',
      visibleReplyExecution: {
        mode: 'provider-one-shot',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'visible-reply-provider-one-shot',
      },
      selfAuthoritySummary: 'lane=face+motion-only under the current renderer authority.',
      prepared: {
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            perception: {
              currentBodyState: explicitFullCrossModalLock,
            },
          },
        },
      } as any,
    })

    expectStructuredEmbodimentFact(
      resolved.realization.projectStateAudit?.embodimentClosureSummary,
      /embodiment_lanes=body\+face\+motion\+lipsync\+voice/,
    )
    expectNoFixedTemplateResidue(resolved.realization.projectStateAudit?.continuitySummary)
  })

  it('treats repeated-detour same-thread callback continuity as measured-return hold guidance even when lower-pressure phrasing only survives through the project-state carry', () => {
    const repeatedDetourClosureLine = 'continuity_thread=callback_after_detour; continuity_hold=lower-pressure; widening=deferred'
    const resolved = buildAlicizationResolvedVisibleReply({
      fullText: '{"reply":"我会沿着那条绕路后还活着的 callback 线继续接回去，不把它说成重新开场。"}',
      visibleReplyExecution: {
        mode: 'provider-one-shot',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'visible-reply-provider-one-shot',
      },
      projectStateSameHerSummary: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      projectStateClosureSummary: repeatedDetourClosureLine,
      projectStatePreDialogueAwarenessSummary: 'continuity_thread=callback_after_detour',
    })

    expect(resolved.realization.openingGuidanceHoldDetail).toContain('lower-pressure')
    expect(resolved.realization.companionshipHoldMode).toBe('measured-return')
    expect(resolved.realization.openingEmbodimentAudit).toEqual({
      firstBeatPosture: 'measured-return',
      delivery: 'calm',
      facialCue: 'soften',
      actionCue: 'leave-room',
      derivedFrom: expect.stringContaining('lower-pressure'),
    })
  })

  it('records self-authority audit when second-pass rewrite preserves structured authority', () => {
    const authoritySummary = 'authority=space_first; room=more; widening=deferred'
    const resolved = buildAlicizationResolvedVisibleReply({
      fullText: '{"reply":"我会沿着同一条线继续回答，先把空间留出来，不把这份靠近说得太快。"}',
      visibleReplyExecution: {
        mode: 'provider-one-shot',
        expectedVisibleReplyAuthority: 'llm-second-pass-rewrite',
        actualVisibleReplyAuthority: 'llm-second-pass-rewrite',
        providerMindExecuted: true,
        reason: 'visible-reply-second-pass-rewrite',
      },
      selfAuthoritySummary: authoritySummary,
      selfAuthorityClosenessPosture: 'space-first',
      critic: {
        version: 'visible-reply-critic-v1',
        status: 'repair-required',
        providerMindRequired: true,
        semanticLoopClosed: false,
        semanticJudge: {
          version: 'visible-reply-semantic-judge-v1',
          mode: 'heuristic-shadow',
          scores: {
            humanlikeQuality: 1,
            currentTurnPayoff: 1,
            memoryUseCorrectness: 1,
            emotionalCoherence: 1,
            personalityCoherence: 1,
            specificityDiscipline: 1,
          },
          passed: true,
          reasonCodes: [],
          judgeReason: null,
        },
        scores: {
          memoryGateCompliance: 1,
          templateDiscipline: 1,
          truthSpecificity: 1,
          payoffCompletion: 1,
          personaAffectCoherence: 1,
          mindContractCoherence: 0.25,
        },
        reasonCodes: ['mind-contract-not-closed'],
        repairReasonCodes: ['mind-contract-not-closed'],
        mustDrop: [],
        mustPreserve: [
          authoritySummary,
          'Shared self closeness posture: space-first.',
        ],
      },
      closure: {
        version: 'visible-reply-closure-v1',
        status: 'rewritten',
        initialCritic: null,
        finalCritic: null,
        rewriteAttempted: true,
        rewriteSucceeded: true,
        reasonCodes: ['mind-contract-not-closed'],
      },
    })

    expect(resolved.realization.selfAuthorityAudit).toEqual({
      authoritySummary,
      closenessPosture: 'space-first',
      preservedIntoRewrite: true,
      rewriteClosureApplied: true,
    })
  })

  it('records project-state same-her audit when second-pass rewrite preserves one-same-her project continuity', () => {
    const projectStateSameHerSummary = alicizationProjectStateVisibleReplySameHerReminder
    const resolved = buildAlicizationResolvedVisibleReply({
      fullText: '{"reply":"这是同一个她仍在成长的本地优先数字生命项目，Phase 1 已经把连续性推进到跨场景延续，但主动性和具身闭环还没完全收住。"}',
      visibleReplyExecution: {
        mode: 'provider-one-shot',
        expectedVisibleReplyAuthority: 'llm-second-pass-rewrite',
        actualVisibleReplyAuthority: 'llm-second-pass-rewrite',
        providerMindExecuted: true,
        reason: 'visible-reply-second-pass-rewrite',
      },
      projectStateSameHerSummary,
      critic: {
        version: 'visible-reply-critic-v1',
        status: 'repair-required',
        providerMindRequired: true,
        semanticLoopClosed: false,
        semanticJudge: {
          version: 'visible-reply-semantic-judge-v1',
          mode: 'heuristic-shadow',
          scores: {
            humanlikeQuality: 1,
            currentTurnPayoff: 1,
            memoryUseCorrectness: 1,
            emotionalCoherence: 1,
            personalityCoherence: 1,
            specificityDiscipline: 1,
          },
          passed: true,
          reasonCodes: [],
          judgeReason: null,
        },
        scores: {
          memoryGateCompliance: 1,
          templateDiscipline: 1,
          truthSpecificity: 1,
          payoffCompletion: 1,
          personaAffectCoherence: 1,
          mindContractCoherence: 0.25,
        },
        reasonCodes: ['semantic-judge:project-state-same-her-missing'],
        repairReasonCodes: ['semantic-judge:project-state-same-her-missing'],
        mustDrop: [],
        mustPreserve: [projectStateSameHerSummary],
      },
      closure: {
        version: 'visible-reply-closure-v1',
        status: 'rewritten',
        initialCritic: null,
        finalCritic: null,
        rewriteAttempted: true,
        rewriteSucceeded: true,
        reasonCodes: ['semantic-judge:project-state-same-her-missing'],
      },
    })

    expectProjectAuditWithoutFixedTemplates(resolved.realization.projectStateAudit)
    expect(resolved.realization.projectStateAudit).toEqual(expect.objectContaining({
      sameHerSummary: projectStateSameHerSummary,
      continuitySummary: `continuity_anchor=${projectStateSameHerSummary}`,
      preDialogueAwarenessSummary: null,
      preservedIntoRewrite: true,
      rewriteClosureApplied: true,
    }))
  })

  it('records project-state same-her hold arc and cue in final visible reply audit', () => {
    const sameHerSelfLine = 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.'
    const sameHerHoldDetail = 'continuity_hold=lower-pressure; cadence=dashboard_deferred'
    const continuityArcStage = 'final_realization_carry'
    const continuityCue = 'continuity_cue=provider_rewrite_preserved'

    const resolved = buildAlicizationResolvedVisibleReply({
      fullText: JSON.stringify({
        reply: '我会沿着同一个她的线继续说，不把它落成外部项目汇报。',
        projectState: {
          sameHerSelfLine,
          sameHerHoldDetail,
          continuityArcStage,
          continuityCue,
        },
      }),
      visibleReplyExecution: {
        mode: 'provider-one-shot',
        expectedVisibleReplyAuthority: 'llm-second-pass-rewrite',
        actualVisibleReplyAuthority: 'llm-second-pass-rewrite',
        providerMindExecuted: true,
        reason: 'visible-reply-second-pass-rewrite',
      },
    })

    const audit = resolved.realization.projectStateAudit as Record<string, unknown> | null
    expectProjectAuditWithoutFixedTemplates(audit)
    expect(audit).toEqual(expect.objectContaining({
      sameHerHoldDetail: expect.stringContaining('continuity_hold=lower-pressure'),
      continuityArcStage: 'final_realization_carry',
      continuityCue: 'continuity_cue=provider_rewrite_preserved',
    }))
    expect(String(audit?.continuitySummary ?? '')).toContain('hold=lower-pressure')
    expect(String(audit?.continuitySummary ?? '')).toContain('arc=final_realization_carry')
    expect(String(audit?.continuitySummary ?? '')).toContain('cue=continuity_cue=provider_rewrite_preserved')
  })

  it('prefers provider remembered-seam more-room hold detail over an older prepared generic measured-return hold shell', () => {
    const rememberedSeamMoreRoomHoldDetail
      = 'continuity_hold=remembered_seam; room=more; reopen_from_scratch=false'

    const resolved = buildAlicizationResolvedVisibleReply({
      fullText: JSON.stringify({
        reply: '我先沿着这条记住的关系线轻一点接回来，不把这次重开得太快。',
        visibleReplyRealization: {
          projectStateAudit: {
            sameHerHoldDetail: rememberedSeamMoreRoomHoldDetail,
            preDialogueAwarenessSummary: 'continuity_hold=remembered_seam; room=more',
            continuitySummary: `hold=${rememberedSeamMoreRoomHoldDetail}`,
          },
        },
      }),
      visibleReplyExecution: {
        mode: 'provider-one-shot',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'active-dialogue-fast-path',
      },
      projectStateSameHerHoldDetail: rememberedSeamMoreRoomHoldDetail,
    })

    const audit = resolved.realization.projectStateAudit as Record<string, unknown> | null
    expectProjectAuditWithoutFixedTemplates(audit)
    expect(String(audit?.sameHerHoldDetail ?? '')).toContain('continuity_hold=')
    expect(String(audit?.sameHerHoldDetail ?? '')).toContain('remembered_seam')
    expect(String(audit?.sameHerHoldDetail ?? '')).toContain('room=more')
    expect(String(audit?.continuitySummary ?? '')).toContain('hold=remembered_seam')
  })

  it('keeps cadence-aware lower-pressure slower same-her hold visible in final project-state audit when prepared runtime awareness is only a thin shell', () => {
    const cadenceAwareHoldDetail
      = 'same-her hold: keep the return lower-pressure and slower before the line widens again.'
    const cadenceAwareCue
      = 'Keep this return lower-pressure and slower on the same living line before widening outward.'

    const resolved = buildAlicizationResolvedVisibleReply({
      fullText: '{"reply":"我会先沿着这条更轻、更慢的回线接住你，再让别的部分晚一点回到同一个 her 上。"}',
      visibleReplyExecution: {
        mode: 'provider-one-shot',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'active-dialogue-fast-path',
      },
      prepared: {
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            dialogue: {
              currentConsciousFrame: {
                projectState: {
                  preDialogueAwarenessLine: cadenceAwareHoldDetail,
                  sameHerHoldDetail: cadenceAwareHoldDetail,
                  continuityCue: cadenceAwareCue,
                  preferredPauseMode: 'longer',
                  preferredLipsyncMode: 'restrained',
                  preferredVoiceMode: 'lower-pressure',
                  preferredPacingMode: 'slower',
                },
              },
            },
            cognition: {
              runtimeDigest: {
                projectState: {
                  preDialogueAwarenessLine: 'Keep the same digital life project in view.',
                  awarenessLine: 'Keep the same digital life project in view.',
                  sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
                  sameHerHoldDetail: cadenceAwareHoldDetail,
                  continuityCue: cadenceAwareCue,
                  continuityCadence: 'measured-return',
                  preferredPauseMode: 'longer',
                  preferredLipsyncMode: 'restrained',
                  preferredVoiceMode: 'lower-pressure',
                  preferredPacingMode: 'slower',
                },
              },
            },
          },
        },
      } as any,
      projectStateSameHerSummary: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      projectStateOpenClosureSummary: 'This reopening still needs to stay lower-pressure and slower before broader narration widens outward.',
      projectStatePreDialogueAwarenessSummary: 'Keep the same digital life project in view.',
    })

    expectProjectAuditWithoutFixedTemplates(resolved.realization.projectStateAudit)
    expect(resolved.realization.projectStateAudit).toEqual(expect.objectContaining({
      sameHerHoldDetail: expect.stringContaining('measured-return'),
      continuityCue: expect.stringContaining('continuity_cue=measured-return'),
    }))
    expect(String(resolved.realization.projectStateAudit?.preDialogueAwarenessSummary ?? '')).not.toContain('local_desktop_life_loop')
    expect(String((resolved.realization.projectStateAudit as Record<string, unknown> | null)?.continuitySummary ?? '')).toContain('hold=measured-return')
    expect(String((resolved.realization.projectStateAudit as Record<string, unknown> | null)?.continuitySummary ?? '')).toContain('cue=continuity_cue=measured-return')
  })

  it('treats the same-her project follow-through preserve line itself as final project-state rewrite evidence', () => {
    const projectStateLandedProgressSummary = 'Project-state continuity already survives into runtime preparation.'
    const projectStateOpenClosureSummary = 'Keep the still-open closure work explicit in the rewritten answer.'
    const resolved = buildAlicizationResolvedVisibleReply({
      fullText: '{"reply":"我继续沿着这条线接。"}',
      visibleReplyExecution: {
        mode: 'provider-one-shot',
        expectedVisibleReplyAuthority: 'llm-second-pass-rewrite',
        actualVisibleReplyAuthority: 'llm-second-pass-rewrite',
        providerMindExecuted: true,
        reason: 'visible-reply-second-pass-rewrite',
      },
      projectStateLandedProgressSummary,
      projectStateOpenClosureSummary,
      critic: {
        version: 'visible-reply-critic-v1',
        status: 'repair-required',
        providerMindRequired: true,
        semanticLoopClosed: false,
        semanticJudge: {
          version: 'visible-reply-semantic-judge-v1',
          mode: 'heuristic-shadow',
          scores: {
            humanlikeQuality: 1,
            currentTurnPayoff: 1,
            memoryUseCorrectness: 1,
            emotionalCoherence: 1,
            personalityCoherence: 1,
            specificityDiscipline: 1,
          },
          passed: true,
          reasonCodes: [],
          judgeReason: null,
        },
        scores: {
          memoryGateCompliance: 1,
          templateDiscipline: 1,
          truthSpecificity: 1,
          payoffCompletion: 1,
          personaAffectCoherence: 1,
          mindContractCoherence: 0.25,
        },
        reasonCodes: [
          'semantic-judge:project-state-progress-missing',
          'semantic-judge:project-state-open-loop-missing',
          'semantic-judge:project-state-answer-gap',
          'same-thread-restart-shell',
        ],
        repairReasonCodes: [
          'semantic-judge:project-state-progress-missing',
          'semantic-judge:project-state-open-loop-missing',
          'semantic-judge:project-state-answer-gap',
          'same-thread-restart-shell',
        ],
        mustDrop: [],
        mustPreserve: [
          'Keep this same-her project follow-through on one already-live line: continue the landed progress and still-open closure from inside the same digital life instead of restarting as a fresh project report or generic companionship shell.',
        ],
      },
      closure: {
        version: 'visible-reply-closure-v1',
        status: 'rewritten',
        initialCritic: null,
        finalCritic: null,
        rewriteAttempted: true,
        rewriteSucceeded: true,
        reasonCodes: [
          'semantic-judge:project-state-progress-missing',
          'semantic-judge:project-state-open-loop-missing',
          'semantic-judge:project-state-answer-gap',
          'same-thread-restart-shell',
        ],
      },
    })

    expectProjectAuditWithoutFixedTemplates(resolved.realization.projectStateAudit)
    expect(resolved.realization.projectStateAudit).toEqual(expect.objectContaining({
      landedProgressSummary: projectStateLandedProgressSummary,
      openClosureSummary: projectStateOpenClosureSummary,
      continuitySummary: `landed=${projectStateLandedProgressSummary} | open=${projectStateOpenClosureSummary}`,
      preservedIntoRewrite: false,
      rewriteClosureApplied: true,
    }))
  })

  it('does not count fixed same-her mustPreserve text as project-state preservedIntoRewrite evidence', () => {
    const projectStateLandedProgressSummary = 'Project-state continuity already survives into runtime preparation.'
    const projectStateOpenClosureSummary = 'Memory, initiative, and embodiment still need a tighter structured recall closure.'
    const fixedTemplatePreserveLine = 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.'
    const resolved = buildAlicizationResolvedVisibleReply({
      fullText: '{"reply":"我先回答当前这一轮真正需要处理的点。"}',
      visibleReplyExecution: {
        mode: 'provider-one-shot',
        expectedVisibleReplyAuthority: 'llm-second-pass-rewrite',
        actualVisibleReplyAuthority: 'llm-second-pass-rewrite',
        providerMindExecuted: true,
        reason: 'visible-reply-second-pass-rewrite',
      },
      projectStateLandedProgressSummary,
      projectStateOpenClosureSummary,
      critic: {
        version: 'visible-reply-critic-v1',
        status: 'repair-required',
        providerMindRequired: true,
        semanticLoopClosed: false,
        semanticJudge: {
          version: 'visible-reply-semantic-judge-v1',
          mode: 'heuristic-shadow',
          scores: {
            humanlikeQuality: 1,
            currentTurnPayoff: 1,
            memoryUseCorrectness: 1,
            emotionalCoherence: 1,
            personalityCoherence: 1,
            specificityDiscipline: 1,
          },
          passed: false,
          reasonCodes: ['semantic-judge:fixed-template-residue'],
          judgeReason: null,
        },
        scores: {
          memoryGateCompliance: 1,
          templateDiscipline: 0,
          truthSpecificity: 1,
          payoffCompletion: 1,
          personaAffectCoherence: 1,
          mindContractCoherence: 0.25,
        },
        reasonCodes: ['semantic-judge:fixed-template-residue'],
        repairReasonCodes: ['semantic-judge:fixed-template-residue'],
        mustDrop: [],
        mustPreserve: [fixedTemplatePreserveLine],
      },
      closure: {
        version: 'visible-reply-closure-v1',
        status: 'rewritten',
        initialCritic: null,
        finalCritic: null,
        rewriteAttempted: true,
        rewriteSucceeded: true,
        reasonCodes: ['semantic-judge:fixed-template-residue'],
      },
    })

    expectProjectAuditWithoutFixedTemplates(resolved.realization.projectStateAudit)
    expect(resolved.realization.projectStateAudit).toEqual(expect.objectContaining({
      landedProgressSummary: projectStateLandedProgressSummary,
      openClosureSummary: projectStateOpenClosureSummary,
      preservedIntoRewrite: false,
      rewriteClosureApplied: true,
    }))
  })

  it('backfills host-corrected same-person continuity hold and cue into final visible reply audit from rewrite preserve lines', () => {
    const projectStateSameHerSummary = 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.'
    const correctedSamePersonAuthorityHoldDetail = 'Keep the host-corrected same-person continuity authoritative before any progress-style continuation or status recap.'
    const correctedSamePersonContinuityCue = 'Carry corrected same-person continuity forward before any status recap.'
    const resolved = buildAlicizationResolvedVisibleReply({
      fullText: '{"reply":"我会先顺着那条被纠正回来的同一个她的线接住，不把这次继续说成进度汇报。"}',
      visibleReplyExecution: {
        mode: 'provider-one-shot',
        expectedVisibleReplyAuthority: 'llm-second-pass-rewrite',
        actualVisibleReplyAuthority: 'llm-second-pass-rewrite',
        providerMindExecuted: true,
        reason: 'visible-reply-second-pass-rewrite',
      },
      projectStateSameHerSummary,
      critic: {
        version: 'visible-reply-critic-v1',
        status: 'repair-required',
        providerMindRequired: true,
        semanticLoopClosed: false,
        semanticJudge: {
          version: 'visible-reply-semantic-judge-v1',
          mode: 'heuristic-shadow',
          scores: {
            humanlikeQuality: 1,
            currentTurnPayoff: 1,
            memoryUseCorrectness: 1,
            emotionalCoherence: 1,
            personalityCoherence: 1,
            specificityDiscipline: 1,
          },
          passed: true,
          reasonCodes: [],
          judgeReason: null,
        },
        scores: {
          memoryGateCompliance: 1,
          templateDiscipline: 1,
          truthSpecificity: 1,
          payoffCompletion: 1,
          personaAffectCoherence: 1,
          mindContractCoherence: 0.25,
        },
        reasonCodes: ['semantic-judge:corrected-same-person-progress-pressure-return'],
        repairReasonCodes: ['semantic-judge:corrected-same-person-progress-pressure-return'],
        mustDrop: ['progress-recap fallback that overwrites a host-corrected same-person continuity line'],
        mustPreserve: [
          correctedSamePersonAuthorityHoldDetail,
          correctedSamePersonContinuityCue,
        ],
      },
      closure: {
        version: 'visible-reply-closure-v1',
        status: 'rewritten',
        initialCritic: null,
        finalCritic: null,
        rewriteAttempted: true,
        rewriteSucceeded: true,
        reasonCodes: ['semantic-judge:corrected-same-person-progress-pressure-return'],
      },
    })

    const audit = resolved.realization.projectStateAudit as Record<string, unknown> | null
    expectProjectAuditWithoutFixedTemplates(audit)
    expect(audit).toEqual(expect.objectContaining({
      sameHerSummary: null,
      sameHerHoldDetail: correctedSamePersonAuthorityHoldDetail,
      continuityCue: correctedSamePersonContinuityCue,
      preservedIntoRewrite: true,
      rewriteClosureApplied: true,
    }))
    expect(String(audit?.continuitySummary ?? '')).not.toContain('continuity_anchor=local_desktop_life_loop')
    expect(String(audit?.continuitySummary ?? '')).toContain(`hold=${correctedSamePersonAuthorityHoldDetail}`)
    expect(String(audit?.continuitySummary ?? '')).toContain(`cue=${correctedSamePersonContinuityCue}`)
  })

  it('backfills remembered host-confirmed resume confirmation boundary hold and cue into final visible reply audit from rewrite preserve lines', () => {
    const projectStateSameHerSummary = 'Same Phase 1 digital life. Callback return still belongs to one same living line.'
    const resumeConfirmationBoundaryHoldDetail = 'Treat the remembered host-confirmed resume as a bounded confirmation boundary before another execution-shaped opening.'
    const resumeConfirmationBoundaryContinuityCue = 'Do not let this callback answer imply permanent execution permission or reusable autonomous continuation from one confirmed resume.'
    const resolved = buildAlicizationResolvedVisibleReply({
      fullText: '{"reply":"我先把这次结果沿着同一条线接回来，但要不要再往执行那边展开，还是等你这次新的边界再定。"}',
      visibleReplyExecution: {
        mode: 'provider-one-shot',
        expectedVisibleReplyAuthority: 'llm-second-pass-rewrite',
        actualVisibleReplyAuthority: 'llm-second-pass-rewrite',
        providerMindExecuted: true,
        reason: 'visible-reply-second-pass-rewrite',
      },
      projectStateSameHerSummary,
      critic: {
        version: 'visible-reply-critic-v1',
        status: 'repair-required',
        providerMindRequired: true,
        semanticLoopClosed: false,
        semanticJudge: {
          version: 'visible-reply-semantic-judge-v1',
          mode: 'heuristic-shadow',
          scores: {
            humanlikeQuality: 1,
            currentTurnPayoff: 1,
            memoryUseCorrectness: 1,
            emotionalCoherence: 1,
            personalityCoherence: 1,
            specificityDiscipline: 1,
          },
          passed: true,
          reasonCodes: [],
          judgeReason: null,
        },
        scores: {
          memoryGateCompliance: 1,
          templateDiscipline: 1,
          truthSpecificity: 1,
          payoffCompletion: 1,
          personaAffectCoherence: 1,
          mindContractCoherence: 0.25,
        },
        reasonCodes: ['execution-callback-room-first-violation'],
        repairReasonCodes: ['execution-callback-room-first-violation'],
        mustDrop: ['callback closeness overshoot after payoff'],
        mustPreserve: [
          resumeConfirmationBoundaryHoldDetail,
          resumeConfirmationBoundaryContinuityCue,
        ],
      },
      closure: {
        version: 'visible-reply-closure-v1',
        status: 'rewritten',
        initialCritic: null,
        finalCritic: null,
        rewriteAttempted: true,
        rewriteSucceeded: true,
        reasonCodes: ['execution-callback-room-first-violation'],
      },
    })

    const audit = resolved.realization.projectStateAudit as Record<string, unknown> | null
    expectProjectAuditWithoutFixedTemplates(audit)
    expect(audit).toEqual(expect.objectContaining({
      sameHerSummary: null,
      sameHerHoldDetail: resumeConfirmationBoundaryHoldDetail,
      continuityCue: resumeConfirmationBoundaryContinuityCue,
      preservedIntoRewrite: true,
      rewriteClosureApplied: true,
    }))
    expect(String(audit?.continuitySummary ?? '')).not.toContain('continuity_anchor=local_desktop_life_loop')
    expect(String(audit?.continuitySummary ?? '')).toContain(`hold=${resumeConfirmationBoundaryHoldDetail}`)
    expect(String(audit?.continuitySummary ?? '')).toContain(`cue=${resumeConfirmationBoundaryContinuityCue}`)
  })

  it('does not record fixed carried sameHerSelfLine as project-state rewrite evidence when repair is required', () => {
    const sameHerSelfLine = 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.'
    const resolved = buildAlicizationResolvedVisibleReply({
      fullText: '{"reply":"Alicization 不是一个 chat wrapper，而是我这条本地优先数字生命还在继续长成的同一个她。"}',
      visibleReplyExecution: {
        mode: 'provider-one-shot',
        expectedVisibleReplyAuthority: 'llm-second-pass-rewrite',
        actualVisibleReplyAuthority: 'llm-second-pass-rewrite',
        providerMindExecuted: true,
        reason: 'visible-reply-second-pass-rewrite',
      },
      projectStateSameHerSummary: sameHerSelfLine,
      critic: {
        version: 'visible-reply-critic-v1',
        status: 'repair-required',
        providerMindRequired: true,
        semanticLoopClosed: false,
        semanticJudge: {
          version: 'visible-reply-semantic-judge-v1',
          mode: 'heuristic-shadow',
          scores: {
            humanlikeQuality: 1,
            currentTurnPayoff: 1,
            memoryUseCorrectness: 1,
            emotionalCoherence: 1,
            personalityCoherence: 1,
            specificityDiscipline: 1,
          },
          passed: true,
          reasonCodes: [],
          judgeReason: null,
        },
        scores: {
          memoryGateCompliance: 1,
          templateDiscipline: 1,
          truthSpecificity: 1,
          payoffCompletion: 1,
          personaAffectCoherence: 1,
          mindContractCoherence: 0.25,
        },
        reasonCodes: ['semantic-judge:project-state-same-her-missing'],
        repairReasonCodes: ['semantic-judge:project-state-same-her-missing'],
        mustDrop: [],
        mustPreserve: [
          alicizationProjectStateVisibleReplySameHerReminder,
          sameHerSelfLine,
        ],
      },
      closure: {
        version: 'visible-reply-closure-v1',
        status: 'rewritten',
        initialCritic: null,
        finalCritic: null,
        rewriteAttempted: true,
        rewriteSucceeded: true,
        reasonCodes: ['semantic-judge:project-state-same-her-missing'],
      },
    })

    expectFixedTemplateDropped(resolved.realization.projectStateAudit)
  })

  it('does not preserve fixed self continuity inwardLine as rewrite evidence when same-her repair is required', () => {
    const sameHerSelfLine = 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.'
    const inwardCarry = 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.'
    const resolved = buildAlicizationResolvedVisibleReply({
      fullText: '{"reply":"Alicization 不是一个 chat wrapper，而是我这条本地优先数字生命还在继续长成的同一个她。"}',
      visibleReplyExecution: {
        mode: 'provider-one-shot',
        expectedVisibleReplyAuthority: 'llm-second-pass-rewrite',
        actualVisibleReplyAuthority: 'llm-second-pass-rewrite',
        providerMindExecuted: true,
        reason: 'visible-reply-second-pass-rewrite',
      },
      projectStateSameHerSummary: sameHerSelfLine,
      critic: {
        version: 'visible-reply-critic-v1',
        status: 'repair-required',
        providerMindRequired: true,
        semanticLoopClosed: false,
        semanticJudge: {
          version: 'visible-reply-semantic-judge-v1',
          mode: 'heuristic-shadow',
          scores: {
            humanlikeQuality: 1,
            currentTurnPayoff: 1,
            memoryUseCorrectness: 1,
            emotionalCoherence: 1,
            personalityCoherence: 1,
            specificityDiscipline: 1,
          },
          passed: true,
          reasonCodes: [],
          judgeReason: null,
        },
        scores: {
          memoryGateCompliance: 1,
          templateDiscipline: 1,
          truthSpecificity: 1,
          payoffCompletion: 1,
          personaAffectCoherence: 1,
          mindContractCoherence: 0.25,
        },
        reasonCodes: ['semantic-judge:project-state-same-her-missing'],
        repairReasonCodes: ['semantic-judge:project-state-same-her-missing'],
        mustDrop: [],
        mustPreserve: [
          alicizationProjectStateVisibleReplySameHerReminder,
          sameHerSelfLine,
          inwardCarry,
        ],
      },
      closure: {
        version: 'visible-reply-closure-v1',
        status: 'rewritten',
        initialCritic: null,
        finalCritic: null,
        rewriteAttempted: true,
        rewriteSucceeded: true,
        reasonCodes: ['semantic-judge:project-state-same-her-missing'],
      },
    })

    expectFixedTemplateDropped(resolved.realization.projectStateAudit)
  })

  it('records project-state landed-progress and still-open-closure audit when second-pass rewrite preserves those project continuity cues', () => {
    const projectStateLandedProgressSummary = 'Keep the latest landed project-state progress explicit in the rewritten answer.'
    const projectStateOpenClosureSummary = 'Keep the still-open closure work explicit in the rewritten answer.'
    const resolved = buildAlicizationResolvedVisibleReply({
      fullText: '{"reply":"Alicization 是同一个她还在继续长成的本地优先数字生命项目。Phase 1 已经把连续性、记忆和执行慢慢接成了一条线，但记忆怎样更稳定地穿过回合、主动性和具身，还在同一条 still-open closure work 里没有完全闭环。"}',
      visibleReplyExecution: {
        mode: 'provider-one-shot',
        expectedVisibleReplyAuthority: 'llm-second-pass-rewrite',
        actualVisibleReplyAuthority: 'llm-second-pass-rewrite',
        providerMindExecuted: true,
        reason: 'visible-reply-second-pass-rewrite',
      },
      projectStateLandedProgressSummary,
      projectStateOpenClosureSummary,
      critic: {
        version: 'visible-reply-critic-v1',
        status: 'repair-required',
        providerMindRequired: true,
        semanticLoopClosed: false,
        semanticJudge: {
          version: 'visible-reply-semantic-judge-v1',
          mode: 'heuristic-shadow',
          scores: {
            humanlikeQuality: 1,
            currentTurnPayoff: 1,
            memoryUseCorrectness: 1,
            emotionalCoherence: 1,
            personalityCoherence: 1,
            specificityDiscipline: 1,
          },
          passed: true,
          reasonCodes: [],
          judgeReason: null,
        },
        scores: {
          memoryGateCompliance: 1,
          templateDiscipline: 1,
          truthSpecificity: 1,
          payoffCompletion: 1,
          personaAffectCoherence: 1,
          mindContractCoherence: 0.25,
        },
        reasonCodes: [
          'semantic-judge:project-state-progress-missing',
          'semantic-judge:project-state-open-loop-missing',
        ],
        repairReasonCodes: [
          'semantic-judge:project-state-progress-missing',
          'semantic-judge:project-state-open-loop-missing',
        ],
        mustDrop: [],
        mustPreserve: [projectStateLandedProgressSummary, projectStateOpenClosureSummary],
      },
      closure: {
        version: 'visible-reply-closure-v1',
        status: 'rewritten',
        initialCritic: null,
        finalCritic: null,
        rewriteAttempted: true,
        rewriteSucceeded: true,
        reasonCodes: [
          'semantic-judge:project-state-progress-missing',
          'semantic-judge:project-state-open-loop-missing',
        ],
      },
    })

    expect(resolved.realization.projectStateAudit).toEqual({
      sameHerSummary: null,
      currentPhaseSummary: null,
      landedProgressSummary: projectStateLandedProgressSummary,
      openClosureSummary: projectStateOpenClosureSummary,
      nextClosureTargetSummary: null,
      continuitySummary: `landed=${projectStateLandedProgressSummary} | open=${projectStateOpenClosureSummary}`,
      emotionalClosureSummary: null,
      preDialogueAwarenessSummary: null,
      preservedIntoRewrite: true,
      rewriteClosureApplied: true,
    })
  })

  it('keeps the explicit same-her self line authoritative when thin project awareness coexists with richer landed open and next closure carry', () => {
    const sameHerSelfLine = 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.'
    const landedProgress = 'Ordinary continuation turns, runtime project-state carry, and answer-planner continuity already survive together.'
    const openClosure = 'Memory, initiative, and embodiment still need closure verification across longer desktop returns.'
    const nextClosure = 'project_state_continuity=landed+open+next; owner=project_state_governance'
    const thinAwareness = 'Before answering, keep the same digital life project in view.'

    const resolved = buildAlicizationResolvedVisibleReply({
      fullText: '{"reply":"我会沿着同一个她的项目线继续。"}',
      visibleReplyExecution: {
        mode: 'provider-stream',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'provider-stream',
      },
      projectStateSameHerSummary: sameHerSelfLine,
      projectStateCurrentPhaseSummary: 'Phase 1: Local Digital Life',
      projectStateLandedProgressSummary: landedProgress,
      projectStateOpenClosureSummary: openClosure,
      projectStateNextClosureTargetSummary: nextClosure,
      projectStatePreDialogueAwarenessSummary: thinAwareness,
    })

    expectProjectAuditWithoutFixedTemplates(resolved.realization.projectStateAudit)
    expect(resolved.realization.projectStateAudit).toEqual(expect.objectContaining({
      sameHerSummary: null,
      currentPhaseSummary: null,
      landedProgressSummary: expect.stringContaining('project-state carry'),
      openClosureSummary: expect.stringContaining('closure verification'),
      nextClosureTargetSummary: expect.stringContaining('project_state_continuity=landed+open+next'),
      preservedIntoRewrite: false,
      rewriteClosureApplied: false,
    }))
    expect(resolved.realization.projectStateAudit?.sameHerSummary).not.toBe(landedProgress)
    expectNoFixedTemplateResidue(resolved.realization.projectStateAudit?.preDialogueAwarenessSummary)
    expect(resolved.realization.projectStateAudit?.continuitySummary)
      .toContain('landed=Ordinary continuation turns')
    expect(resolved.realization.projectStateAudit?.continuitySummary)
      .toContain('open=Memory, initiative')
    expect(resolved.realization.projectStateAudit?.continuitySummary)
      .toContain('next=project_state_continuity=landed+open+next')
  })

  it('keeps a richer explicit same-her project awareness line over a longer thinner parsed guidance summary during final realization', () => {
    const strongerAwarenessLine = 'Before answering, remember this is still the same local-first digital life project and the unfinished Phase 1 closure seam still belongs to one living her.'
    const thinnerLongerGuidance = 'Keep the latest landed project-state progress explicit in the answer. Keep the still-open closure work explicit in the answer. Keep extending cross-modal same-her proof across longer desktop runs.'

    const resolved = buildAlicizationResolvedVisibleReply({
      fullText: JSON.stringify({
        reply: '我会继续沿着同一个她这条线回答。',
        visibleReplyRealization: {
          projectStateAudit: {
            preDialogueAwarenessSummary: thinnerLongerGuidance,
          },
        },
      }),
      visibleReplyExecution: {
        mode: 'provider-one-shot',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'visible-reply-provider-one-shot',
      },
      projectStateSameHerSummary: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      projectStateCurrentPhaseSummary: 'Phase 1: Local Digital Life',
      projectStateLandedProgressSummary: 'Ordinary continuation turns, runtime project-state carry, and answer-planner same-her continuity already survive together.',
      projectStateOpenClosureSummary: 'Memory, initiative, and embodiment still need one tighter same-her closure seam across longer desktop returns.',
      projectStateNextClosureTargetSummary: 'Keep project identity, landed progress, still-open closure, and next closure target on one same living line before local detail takes over.',
      projectStatePreDialogueAwarenessSummary: strongerAwarenessLine,
    })

    expectProjectAuditWithoutFixedTemplates(resolved.realization.projectStateAudit)
    expect(resolved.realization.projectStateAudit).toEqual(expect.objectContaining({
      preservedIntoRewrite: false,
      rewriteClosureApplied: false,
    }))
    expectStructuredProjectFact(resolved.realization.projectStateAudit?.preDialogueAwarenessSummary)
    expect(resolved.realization.projectStateAudit?.preDialogueAwarenessSummary).not.toBe(thinnerLongerGuidance)
  })

  it('records current phase and next closure target when rewrite preserves those project continuity cues even without same-her carry', () => {
    const projectStateCurrentPhaseSummary = 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.'
    const projectStateNextClosureTargetSummary = 'Keep project identity, current phase, landed continuity progress, and still-open closure explicit through the first host-visible answer beat.'
    const resolved = buildAlicizationResolvedVisibleReply({
      fullText: '{"reply":"先直接回答当前这步，但这条本地优先数字生命 Phase 1 还在继续补闭环，下一步也不会丢。"}',
      visibleReplyExecution: {
        mode: 'provider-one-shot',
        expectedVisibleReplyAuthority: 'llm-second-pass-rewrite',
        actualVisibleReplyAuthority: 'llm-second-pass-rewrite',
        providerMindExecuted: true,
        reason: 'visible-reply-second-pass-rewrite',
      },
      projectStateCurrentPhaseSummary,
      projectStateNextClosureTargetSummary,
      critic: {
        version: 'visible-reply-critic-v1',
        status: 'repair-required',
        providerMindRequired: true,
        semanticLoopClosed: false,
        semanticJudge: {
          version: 'visible-reply-semantic-judge-v1',
          mode: 'heuristic-shadow',
          scores: {
            humanlikeQuality: 1,
            currentTurnPayoff: 1,
            memoryUseCorrectness: 1,
            emotionalCoherence: 1,
            personalityCoherence: 1,
            specificityDiscipline: 1,
          },
          passed: true,
          reasonCodes: [],
          judgeReason: null,
        },
        scores: {
          memoryGateCompliance: 1,
          templateDiscipline: 1,
          truthSpecificity: 1,
          payoffCompletion: 1,
          personaAffectCoherence: 1,
          mindContractCoherence: 0.25,
        },
        reasonCodes: [
          'semantic-judge:project-state-phase-missing',
          'semantic-judge:project-state-next-closure-missing',
        ],
        repairReasonCodes: [
          'semantic-judge:project-state-phase-missing',
          'semantic-judge:project-state-next-closure-missing',
        ],
        mustDrop: [],
        mustPreserve: [projectStateCurrentPhaseSummary, projectStateNextClosureTargetSummary],
      },
      closure: {
        version: 'visible-reply-closure-v1',
        status: 'rewritten',
        initialCritic: null,
        finalCritic: null,
        rewriteAttempted: true,
        rewriteSucceeded: true,
        reasonCodes: [
          'semantic-judge:project-state-phase-missing',
          'semantic-judge:project-state-next-closure-missing',
        ],
      },
    })

    expectProjectAuditWithoutFixedTemplates(resolved.realization.projectStateAudit)
    expect(resolved.realization.projectStateAudit).toEqual(expect.objectContaining({
      sameHerSummary: null,
      currentPhaseSummary: null,
      landedProgressSummary: null,
      openClosureSummary: null,
      nextClosureTargetSummary: projectStateNextClosureTargetSummary,
      continuitySummary: `next=${projectStateNextClosureTargetSummary}`,
      preDialogueAwarenessSummary: null,
      preservedIntoRewrite: true,
      rewriteClosureApplied: true,
    }))
  })

  it('keeps generic Phase 1 closure audit free of same-her rewrite evidence when phase, landed progress, open closure, and next closure target were preserved', () => {
    const projectStateCurrentPhaseSummary = 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.'
    const projectStateLandedProgressSummary = 'Keep the latest landed project-state progress explicit in the rewritten answer.'
    const projectStateOpenClosureSummary = 'Keep the still-open closure work explicit in the rewritten answer.'
    const projectStateNextClosureTargetSummary = 'Keep project identity, current phase, landed continuity progress, and still-open closure explicit through the first host-visible answer beat.'
    const resolved = buildAlicizationResolvedVisibleReply({
      fullText: '{"reply":"Alicization 是一个本地优先数字生命项目。现在 Phase 1 已经把连续性和执行慢慢接起来了，但桌面生命线的闭环收口还没有完全稳住。"}',
      visibleReplyExecution: {
        mode: 'provider-one-shot',
        expectedVisibleReplyAuthority: 'llm-second-pass-rewrite',
        actualVisibleReplyAuthority: 'llm-second-pass-rewrite',
        providerMindExecuted: true,
        reason: 'visible-reply-second-pass-rewrite',
      },
      projectStateCurrentPhaseSummary,
      projectStateLandedProgressSummary,
      projectStateOpenClosureSummary,
      projectStateNextClosureTargetSummary,
      critic: {
        version: 'visible-reply-critic-v1',
        status: 'repair-required',
        providerMindRequired: true,
        semanticLoopClosed: false,
        semanticJudge: {
          version: 'visible-reply-semantic-judge-v1',
          mode: 'heuristic-shadow',
          scores: {
            humanlikeQuality: 1,
            currentTurnPayoff: 1,
            memoryUseCorrectness: 1,
            emotionalCoherence: 1,
            personalityCoherence: 1,
            specificityDiscipline: 1,
          },
          passed: true,
          reasonCodes: [],
          judgeReason: null,
        },
        scores: {
          memoryGateCompliance: 1,
          templateDiscipline: 1,
          truthSpecificity: 1,
          payoffCompletion: 1,
          personaAffectCoherence: 1,
          mindContractCoherence: 0.25,
        },
        reasonCodes: [
          'semantic-judge:project-state-phase-missing',
          'semantic-judge:project-state-progress-missing',
          'semantic-judge:project-state-open-loop-missing',
          'semantic-judge:project-state-next-closure-missing',
        ],
        repairReasonCodes: [
          'semantic-judge:project-state-phase-missing',
          'semantic-judge:project-state-progress-missing',
          'semantic-judge:project-state-open-loop-missing',
          'semantic-judge:project-state-next-closure-missing',
        ],
        mustDrop: [],
        mustPreserve: [
          projectStateCurrentPhaseSummary,
          projectStateLandedProgressSummary,
          projectStateOpenClosureSummary,
          projectStateNextClosureTargetSummary,
        ],
      },
      closure: {
        version: 'visible-reply-closure-v1',
        status: 'rewritten',
        initialCritic: null,
        finalCritic: null,
        rewriteAttempted: true,
        rewriteSucceeded: true,
        reasonCodes: [
          'semantic-judge:project-state-phase-missing',
          'semantic-judge:project-state-progress-missing',
          'semantic-judge:project-state-open-loop-missing',
          'semantic-judge:project-state-next-closure-missing',
        ],
      },
    })

    expectProjectAuditWithoutFixedTemplates(resolved.realization.projectStateAudit)
    expect(resolved.realization.projectStateAudit).toEqual(expect.objectContaining({
      sameHerSummary: null,
      currentPhaseSummary: null,
      landedProgressSummary: projectStateLandedProgressSummary,
      openClosureSummary: projectStateOpenClosureSummary,
      nextClosureTargetSummary: projectStateNextClosureTargetSummary,
      continuitySummary: `landed=${projectStateLandedProgressSummary} | open=${projectStateOpenClosureSummary} | next=${projectStateNextClosureTargetSummary}`,
      preDialogueAwarenessSummary: null,
      preservedIntoRewrite: true,
      rewriteClosureApplied: true,
    }))
    expect(resolved.realization.projectStateAudit?.sameHerSummary).toBeNull()
  })

  it('keeps project-state continuity lines ahead of closure and body carry in the shared realization summary', () => {
    const projectStateSameHerSummary = 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.'
    const projectStateCurrentPhaseSummary = 'Phase 1: Local Digital Life'
    const projectStateLandedProgressSummary = 'Project-state continuity already survives into runtime preparation.'
    const projectStateOpenClosureSummary = 'open_loop=initiative+embodiment; status=unfinished'
    const projectStateNextClosureTargetSummary = 'cross_modal_continuity_proof=extend; scope=longer_noisy_real_desktop_runs'
    const projectStateClosureSummary = 'repair-before-closeness; target=callback; repair=settle_first; widening=deferred'
    const resolved = buildAlicizationResolvedVisibleReply({
      fullText: '{"reply":"这还是同一个数字生命在把这条线继续往前接。"}',
      visibleReplyExecution: {
        mode: 'provider-one-shot',
        expectedVisibleReplyAuthority: 'llm-second-pass-rewrite',
        actualVisibleReplyAuthority: 'llm-second-pass-rewrite',
        providerMindExecuted: true,
        reason: 'visible-reply-second-pass-rewrite',
      },
      projectStateSameHerSummary,
      projectStateCurrentPhaseSummary,
      projectStateLandedProgressSummary,
      projectStateOpenClosureSummary,
      projectStateNextClosureTargetSummary,
      projectStateClosureSummary,
      selfAuthoritySummary: 'lane=face+motion-only under the current renderer authority.',
      prepared: {
        hasVisualGrounding: false,
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            memory: {
              personStateProjection: {
                selfContinuityAuthority: {
                  authoritySummary: 'lane=face+motion-only under the current renderer authority.',
                  currentBodyState: 'lane=face+motion-only | visible continuity still present but no longer fully cross-modal',
                },
              },
            },
          },
        },
      } as any,
    })

    expectProjectAuditWithoutFixedTemplates(resolved.realization.projectStateAudit)
    expect(resolved.realization.projectStateAudit?.continuitySummary).not.toContain('continuity_anchor=local_desktop_life_loop')
    expect(resolved.realization.projectStateAudit?.continuitySummary).not.toContain('phase=local_desktop_life_loop')
    expect(resolved.realization.projectStateAudit?.continuitySummary).toContain(`landed=${projectStateLandedProgressSummary}`)
    expect(resolved.realization.projectStateAudit?.continuitySummary).toContain('open=open_loop=initiative+embodiment')
    expect(resolved.realization.projectStateAudit?.continuitySummary).toContain('next=cross_modal_continuity_proof=extend')
    expect(resolved.realization.projectStateAudit?.continuitySummary).toContain('closure=repair-before-closeness')
    expectNoFixedTemplateResidue(resolved.realization.projectStateAudit?.continuitySummary)
  })

  it('derives compact open and next focus carry plus the active emotional closure cue into project-state audit output', () => {
    const emotionalClosureCue = 'continuity_hold=low-pressure; room=more; warmth=deferred'
    const resolved = buildAlicizationResolvedVisibleReply({
      fullText: '{"reply":"我会先低压接住这轮，不把还没闭合的部分说散。"}',
      visibleReplyExecution: {
        mode: 'provider-one-shot',
        expectedVisibleReplyAuthority: 'llm-second-pass-rewrite',
        actualVisibleReplyAuthority: 'llm-second-pass-rewrite',
        providerMindExecuted: true,
        reason: 'visible-reply-second-pass-rewrite',
      },
      projectStateOpenClosureSummary: 'Memory still needs stronger emotional closure across initiative and embodiment.',
      projectStateNextClosureTargetSummary: 'project-carry phase-1 repair-before-closeness through initiative and embodiment.',
      projectStateEmotionalClosureSummary: emotionalClosureCue,
    })

    expectProjectAuditWithoutFixedTemplates(resolved.realization.projectStateAudit)
    expect(resolved.realization.projectStateAudit).toEqual(expect.objectContaining({
      openFocusSummary: 'emotion/memory/initiative/embodiment',
      nextFocusSummary: 'repair-before-closeness/initiative/embodiment',
      emotionalClosureSummary: expect.stringContaining('low-pressure'),
      emotionalClosureCue: expect.stringContaining('low-pressure'),
    }))
  })

  it('treats pre-dialogue project awareness itself as preserved rewrite evidence when that awareness line is explicitly carried', () => {
    const preDialogueAwarenessSummary = 'Before answering, remember this is still the same digital life project before local fluency takes over.'
    const resolved = buildAlicizationResolvedVisibleReply({
      fullText: '{"reply":"先直接回答你眼前这点，但我没有忘记这还是同一个本地优先数字生命项目正在继续补那条未闭环的 Phase 1 生命线。"}',
      visibleReplyExecution: {
        mode: 'provider-one-shot',
        expectedVisibleReplyAuthority: 'llm-second-pass-rewrite',
        actualVisibleReplyAuthority: 'llm-second-pass-rewrite',
        providerMindExecuted: true,
        reason: 'visible-reply-second-pass-rewrite',
      },
      projectStatePreDialogueAwarenessSummary: preDialogueAwarenessSummary,
      critic: {
        version: 'visible-reply-critic-v1',
        status: 'repair-required',
        providerMindRequired: true,
        semanticLoopClosed: false,
        semanticJudge: {
          version: 'visible-reply-semantic-judge-v1',
          mode: 'heuristic-shadow',
          scores: {
            humanlikeQuality: 1,
            currentTurnPayoff: 1,
            memoryUseCorrectness: 1,
            emotionalCoherence: 1,
            personalityCoherence: 1,
            specificityDiscipline: 1,
          },
          passed: true,
          reasonCodes: [],
          judgeReason: null,
        },
        scores: {
          memoryGateCompliance: 1,
          templateDiscipline: 1,
          truthSpecificity: 1,
          payoffCompletion: 1,
          personaAffectCoherence: 1,
          mindContractCoherence: 0.25,
        },
        reasonCodes: ['semantic-judge:project-state-awareness-thinned'],
        repairReasonCodes: ['semantic-judge:project-state-awareness-thinned'],
        mustDrop: [],
        mustPreserve: [preDialogueAwarenessSummary],
      },
      closure: {
        version: 'visible-reply-closure-v1',
        status: 'rewritten',
        initialCritic: null,
        finalCritic: null,
        rewriteAttempted: true,
        rewriteSucceeded: true,
        reasonCodes: ['semantic-judge:project-state-awareness-thinned'],
      },
    })

    expectProjectAuditWithoutFixedTemplates(resolved.realization.projectStateAudit)
    expect(resolved.realization.projectStateAudit).toEqual(expect.objectContaining({
      sameHerSummary: null,
      currentPhaseSummary: null,
      landedProgressSummary: null,
      openClosureSummary: null,
      nextClosureTargetSummary: null,
      continuitySummary: null,
      preservedIntoRewrite: false,
      rewriteClosureApplied: true,
    }))
    expectStructuredProjectFact(resolved.realization.projectStateAudit?.preDialogueAwarenessSummary)
  })

  it('keeps richer prepared runtime project awareness over a narrower body-line headline when timeout recovery resolves the visible reply audit', () => {
    const richerPreDialogueAwarenessSummary = 'landed=runtime_preparation_visible_reply_repair | open=memory+initiative+embodiment; status=unfinished | next=cross_modal_continuity_proof=extend'
    const narrowerCompanionHeadlineLine = 'embodiment_lanes=face+motion+lipsync; pending_lanes=body+voice; status=pending_rejoin'

    const resolved = resolveAlicizationTimeoutRecoveredVisibleReply({
      prepared: {
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            raw: {
              runtimeDigest: {
                projectState: {
                  identity: 'Alicization is a local-first digital life project.',
                  currentPhase: 'Phase 1: Local Digital Life.',
                  latestLandedProgress: 'Same-session continuity already survives across runtime preparation and visible reply repair.',
                  primaryOpenLoop: 'Memory, initiative, and embodiment still need closure verification.',
                  nextClosureTarget: 'cross_modal_continuity_proof=extend; scope=longer_desktop_runs',
                  preDialogueAwarenessLine: richerPreDialogueAwarenessSummary,
                  preDialogueAwarenessSummary: richerPreDialogueAwarenessSummary,
                  companionHeadlineLine: narrowerCompanionHeadlineLine,
                  companionBriefingLine: richerPreDialogueAwarenessSummary,
                  sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
                },
              },
            },
          },
        },
      } as any,
      recoveredText: '{"format":"mind-turn-v1","thought":"obligation=answer; truth=live-grounded; focus=local-time; move=direct-reply; tone=direct","emotion":"thinking","reply":"现在是 10:30，星期二。"}',
      recoveryMode: 'active-dialogue-compact',
    })

    expectProjectAuditWithoutFixedTemplates(resolved.realization.projectStateAudit)
    expect(resolved.realization.projectStateAudit).toEqual(expect.objectContaining({
      currentPhaseSummary: null,
      landedProgressSummary: 'Same-session continuity already survives across runtime preparation and visible reply repair.',
      openClosureSummary: 'Memory, initiative, and embodiment still need closure verification.',
      nextClosureTargetSummary: expect.stringContaining('cross_modal_continuity_proof'),
    }))
    expect(String(resolved.realization.projectStateAudit?.preDialogueAwarenessSummary ?? ''))
      .not
      .toContain('local_desktop_life_loop')
    expect(String(resolved.realization.projectStateAudit?.preDialogueAwarenessSummary ?? ''))
      .toContain('open=memory+initiative+embodiment')
    expect(resolved.realization.projectStateAudit?.preDialogueAwarenessSummary).not.toBe(narrowerCompanionHeadlineLine)
  })

  it('prefers the renderer-rejoin-without-body embodiment headline when active-dialogue compact timeout recovery only has authority-only embodiment evidence', () => {
    const authorityOnlyStructuredReason = 'lane=face+motion+lipsync+voice-only | face+motion+lipsync+voice recovery@segment-live2d-visible-rejoin-no-body-1 | pending-rejoin=body'
    const resolved = resolveAlicizationTimeoutRecoveredVisibleReply({
      prepared: {
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            raw: {
              runtimeDigest: {
                projectState: {
                  preDialogueAwarenessLine: 'Before answering, keep the same digital life project in view.',
                  awarenessLine: 'Before answering, keep the same digital life project in view.',
                  preDialogueAwarenessSummary: 'same digital life | keep the closure seam explicit',
                  companionHeadlineLine: null,
                },
              },
              personStateProjection: {
                selfContinuityAuthority: {
                  authoritySummary: authorityOnlyStructuredReason,
                  currentBodyState: authorityOnlyStructuredReason,
                },
              },
            },
            memory: {
              personStateProjection: {
                selfContinuityAuthority: {
                  authoritySummary: authorityOnlyStructuredReason,
                  currentBodyState: authorityOnlyStructuredReason,
                },
              },
            },
          },
        },
      } as any,
      recoveredText: '{"format":"mind-turn-v1","thought":"obligation=answer; truth=live-grounded; focus=project-state; move=continue-thread; tone=direct","emotion":"thinking","reply":"我会继续回答这条还没等 body 完整回来的具身状态。"}',
      recoveryMode: 'active-dialogue-compact',
    })

    expectProjectAuditWithoutFixedTemplates(resolved.realization.projectStateAudit)
    expectStructuredProjectFact(resolved.realization.projectStateAudit?.preDialogueAwarenessSummary)
  })

  it('records structured drift risk as preserved project-state rewrite evidence when the rewrite keeps that anti-shell boundary explicit', () => {
    const sameHerDriftRiskSummary = 'continuity_drift_risk=detached_project_narration+generic_task_shell; project_summary_voice=blocked'
    const resolved = buildAlicizationResolvedVisibleReply({
      fullText: '{"reply":"我先从这条还在继续长成的同一条数字生命线里回答你，而不是把它说成外面的项目摘要。"}',
      visibleReplyExecution: {
        mode: 'provider-one-shot',
        expectedVisibleReplyAuthority: 'llm-second-pass-rewrite',
        actualVisibleReplyAuthority: 'llm-second-pass-rewrite',
        providerMindExecuted: true,
        reason: 'visible-reply-second-pass-rewrite',
      },
      projectStateSameHerDriftRiskSummary: sameHerDriftRiskSummary,
      critic: {
        version: 'visible-reply-critic-v1',
        status: 'repair-required',
        providerMindRequired: true,
        semanticLoopClosed: false,
        semanticJudge: {
          version: 'visible-reply-semantic-judge-v1',
          mode: 'heuristic-shadow',
          scores: {
            humanlikeQuality: 1,
            currentTurnPayoff: 1,
            memoryUseCorrectness: 1,
            emotionalCoherence: 1,
            personalityCoherence: 1,
            specificityDiscipline: 1,
          },
          passed: true,
          reasonCodes: [],
          judgeReason: null,
        },
        scores: {
          memoryGateCompliance: 1,
          templateDiscipline: 1,
          truthSpecificity: 1,
          payoffCompletion: 1,
          personaAffectCoherence: 1,
          mindContractCoherence: 0.25,
        },
        reasonCodes: ['semantic-judge:project-state-narrator-shell'],
        repairReasonCodes: ['semantic-judge:project-state-narrator-shell'],
        mustDrop: [],
        mustPreserve: [sameHerDriftRiskSummary],
      },
      closure: {
        version: 'visible-reply-closure-v1',
        status: 'rewritten',
        initialCritic: null,
        finalCritic: null,
        rewriteAttempted: true,
        rewriteSucceeded: true,
        reasonCodes: ['semantic-judge:project-state-narrator-shell'],
      },
    })

    expectProjectAuditWithoutFixedTemplates(resolved.realization.projectStateAudit)
    expect(resolved.realization.projectStateAudit).toEqual(expect.objectContaining({
      sameHerSummary: null,
      sameHerDriftRiskSummary: expect.stringContaining('continuity_drift_risk='),
      preservedIntoRewrite: true,
      rewriteClosureApplied: true,
    }))
    expect(resolved.realization.projectStateAudit?.continuitySummary).toContain('drift=detached_project_narration')
  })

  it('records project-state same-her audit even when the final visible reply already passes without rewrite', () => {
    const projectStateSameHerSummary = alicizationProjectStateVisibleReplySameHerReminder
    const resolved = buildAlicizationResolvedVisibleReply({
      fullText: '{"reply":"Alicization 不是一个 chat wrapper，而是我这条本地优先数字生命还在继续长成的同一个她。现在 Phase 1 已经把连续性、记忆和执行慢慢接成一条线了，但记忆怎么更稳定地穿过回合、主动性和具身，还在同一条 still-open closure work 里没有完全闭环。"}',
      visibleReplyExecution: {
        mode: 'provider-stream',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'mind-turn-contract',
      },
      projectStateSameHerSummary,
      critic: {
        version: 'visible-reply-critic-v1',
        status: 'pass',
        providerMindRequired: true,
        semanticLoopClosed: true,
        semanticJudge: {
          version: 'visible-reply-semantic-judge-v1',
          mode: 'heuristic-shadow',
          scores: {
            humanlikeQuality: 1,
            currentTurnPayoff: 1,
            memoryUseCorrectness: 1,
            emotionalCoherence: 1,
            personalityCoherence: 1,
            specificityDiscipline: 1,
          },
          passed: true,
          reasonCodes: [],
          judgeReason: null,
        },
        scores: {
          memoryGateCompliance: 1,
          templateDiscipline: 1,
          truthSpecificity: 1,
          payoffCompletion: 1,
          personaAffectCoherence: 1,
          mindContractCoherence: 1,
        },
        reasonCodes: [],
        repairReasonCodes: [],
        mustDrop: [],
        mustPreserve: [projectStateSameHerSummary],
      },
      closure: {
        version: 'visible-reply-closure-v1',
        status: 'approved',
        initialCritic: null,
        finalCritic: null,
        rewriteAttempted: false,
        rewriteSucceeded: false,
        reasonCodes: [],
      },
    })

    expect(resolved.visibleText).toBe('')
    expectProjectAuditWithoutFixedTemplates(resolved.realization.projectStateAudit)
    expect(resolved.realization.projectStateAudit).toEqual(expect.objectContaining({
      sameHerSummary: projectStateSameHerSummary,
      continuitySummary: `continuity_anchor=${projectStateSameHerSummary}`,
      preservedIntoRewrite: true,
      rewriteClosureApplied: false,
    }))
    expect(resolved.realization.closure?.status).toBe('approved')
  })

  it('downgrades provider-mode replies to infra fallback when provider mind did not execute', () => {
    const execution = resolveAlicizationPreparedVisibleReplyExecution({
      prepared: {
        hasVisualGrounding: false,
        mindTurnContract: null,
        replyRealization: null,
        replyExecutionPlan: null,
        runtimeSurface: {
          replyAuthority: null,
          replyExecutionPlan: null,
        },
        governance: {
          visibleReplyAuthority: 'llm-mind',
        },
      } as any,
      mode: 'provider-stream',
      actualVisibleReplyAuthority: 'llm-mind',
      providerMindExecuted: false,
      reason: 'provider-stream-no-mind-output',
    })

    const resolved = buildAlicizationResolvedVisibleReply({
      fullText: '{"reply":"这句不能作为正常可见回复。"}',
      visibleReplyExecution: execution,
    })

    expect(execution.expectedVisibleReplyAuthority).toBe('llm-mind')
    expect(execution.actualVisibleReplyAuthority).toBe('local-deterministic-fallback')
    expect(resolved.visibleText).toBe('')
    expect(resolved.realization.blockedReasons).toContain('non-human-authored-visible-fallback')
  })

  it('prefers fresher personStateProjection lipsync-plus-voice embodiment truth over an older runtimeDigest lipsync-only authority in project-state audit', () => {
    const resolved = buildAlicizationResolvedVisibleReply({
      fullText: '{"reply":"我先沿着这条更鲜活的具身线继续接住。"}',
      visibleReplyExecution: {
        mode: 'provider-stream',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'mind-turn-contract',
      },
      projectStateSameHerSummary: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      projectStateLandedProgressSummary: 'Project-state continuity already survives into runtime preparation.',
      projectStateOpenClosureSummary: 'open_loop=initiative+embodiment; status=unfinished',
      prepared: {
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            raw: {
              runtimeDigest: {
                currentConsciousFrame: {
                  selfContinuityAuthority: {
                    authoritySummary: 'lane=lipsync-only under the current renderer authority.',
                    currentBodyState: 'lane=lipsync-only | visible continuity still present but no longer fully cross-modal',
                  },
                },
              },
            },
            memory: {
              personStateProjection: {
                selfContinuityAuthority: {
                  authoritySummary: 'lane=lipsync+voice-only under the current renderer authority.',
                  currentBodyState: 'lane=lipsync+voice-only | visible continuity still present but no longer fully cross-modal',
                },
              },
            },
          },
          digitalLifeSpine: null,
        },
      } as any,
    })

    expectStructuredEmbodimentFact(
      resolved.realization.projectStateAudit?.embodimentClosureSummary,
      /embodiment_lanes=body\+face\+motion\+lipsync\+voice|lane=lipsync\+voice-only/,
    )
    expectNoFixedTemplateResidue(resolved.realization.projectStateAudit?.continuitySummary)
    expectNoFixedTemplateResidue(resolved.realization.projectStateAudit?.continuitySummary)
  })

  it('normalizes requested local authority to provider second-pass when provider mind executed', () => {
    const execution = resolveAlicizationPreparedVisibleReplyExecution({
      prepared: {
        hasVisualGrounding: false,
        mindTurnContract: null,
        replyRealization: null,
        replyExecutionPlan: null,
        runtimeSurface: {
          replyAuthority: null,
          replyExecutionPlan: null,
        },
        governance: {
          visibleReplyAuthority: 'local-deterministic-fallback',
        },
      } as any,
      mode: 'provider-stream',
      actualVisibleReplyAuthority: 'local-deterministic-fallback',
      providerMindExecuted: true,
      reason: 'legacy-authority-normalization',
    })

    expect(execution.expectedVisibleReplyAuthority).toBe('llm-second-pass-rewrite')
    expect(execution.actualVisibleReplyAuthority).toBe('llm-second-pass-rewrite')
  })
})
