import { describe, expect, it } from 'vitest'

import { buildStageQuickReplyClosureDiagnosticEntry } from './stage-quick-reply-closure'

function buildStageQuickReplyProjectSelfBriefLines(input: {
  awareness?: null | {
    summaryLine?: string | null
    companionBriefingLine?: string | null
    awarenessLine?: string | null
    companionNextClosureLine?: string | null
    reasonPreview?: string[]
  }
  closure?: null | {
    summaryLine?: string | null
    briefingLines?: string[]
  }
}) {
  const lines = [
    input.awareness?.summaryLine ?? null,
    input.awareness?.companionBriefingLine ?? null,
    input.awareness?.awarenessLine ?? null,
    input.awareness?.companionNextClosureLine ?? null,
    ...(input.awareness?.reasonPreview ?? []),
    input.closure?.summaryLine ?? null,
    ...(input.closure?.briefingLines ?? []),
  ].filter((line, index, entries): line is string => Boolean(line) && entries.indexOf(line) === index)

  return lines.filter((line) => {
    const normalizedLine = line.toLowerCase()
    return normalizedLine.includes('alicization')
      || normalizedLine.includes('digital life')
      || normalizedLine.includes('phase 1')
      || normalizedLine.includes('project identity')
      || normalizedLine.includes('project awareness')
      || normalizedLine.includes('landed progress')
      || normalizedLine.includes('primary open life loop')
      || normalizedLine.includes('open life loop')
      || normalizedLine.includes('remaining-open=')
      || normalizedLine.includes('next closure')
      || normalizedLine.includes('same-her')
      || normalizedLine.includes('one living her')
      || normalizedLine.includes('resident body continuity')
      || normalizedLine.includes('resident-body continuity')
      || normalizedLine.includes('same-her body line')
      || normalizedLine.includes('same-her audible body line')
      || normalizedLine.includes('surviving pre-dialogue carry')
      || normalizedLine.includes('living audio thread')
      || normalizedLine.includes('body continuity')
      || normalizedLine.includes('continuity=embodiment:audible-same-her-line')
      || normalizedLine.includes('continuity=embodiment:body-lipsync-voice-rejoin')
      || normalizedLine.includes('signature=embodiment:audible-same-her-line')
      || normalizedLine.includes('focus=face+lipsync')
      || normalizedLine.includes('focus=motion+lipsync')
      || normalizedLine.includes('lane=face+lipsync-only')
      || normalizedLine.includes('lane=motion+lipsync-only')
      || normalizedLine.includes('body+lipsync+voice recovery@')
      || normalizedLine.includes('audible-body rejoin@')
      || normalizedLine.includes('face, motion, and lipsync continuity')
      || normalizedLine.includes('still-visible face-and-lipsync line')
      || normalizedLine.includes('still-visible motion-and-lipsync line')
  })
}

describe('stage quick reply closure diagnostic entry', () => {
  it('shows the diagnosis entry when closure is still open', () => {
    expect(buildStageQuickReplyClosureDiagnosticEntry({
      status: 'partial',
      summaryLine: 'project continuity is still partial',
      companionHeadlineLine: null,
      companionBriefingLine: 'I still need a steadier carry of this project, this phase, and the life loop that remains open.',
      companionNextClosureLine: 'Next, help me close: Carry the unfinished digital-life loop into the next dialogue preparation step.',
      reasons: ['Same-her emotional closure still needs repair.'],
    })).toEqual(expect.objectContaining({
      visible: true,
      label: 'Inspect continuity diagnosis',
      headline: 'Same-her emotional closure still needs repair.',
      briefingHeadline: 'I still need a steadier carry of this project, this phase, and the life loop that remains open.',
      nextClosureLine: 'Next, help me close: Carry the unfinished digital-life loop into the next dialogue preparation step.',
      routeQuery: expect.objectContaining({
        source: 'quick-reply-closure',
        status: 'partial',
        focus: 'emotional-closure',
        eventFocus: 'takeover-audit',
      }),
    }))
  })

  it('prefers the pre-dialogue awareness line as the front-stage headline when no explicit closure headline is present', () => {
    expect(buildStageQuickReplyClosureDiagnosticEntry({
      status: 'partial',
      summaryLine: 'project continuity is still partial',
      companionHeadlineLine: null,
      companionBriefingLine: null,
      companionNextClosureLine: 'Next, help me close: Carry the unfinished digital-life loop into the next dialogue preparation step.',
      reasons: [
        'Project identity carry is still weak across time.',
      ],
    }, {
      status: 'partial',
      summaryLine: 'same digital life | phase 1 closure still open',
      companionBriefingLine: 'Before speaking, remember the project identity, the landed progress, and the still-open life loop.',
      companionNextClosureLine: 'Keep carrying memory, initiative, and embodiment as one same-life loop.',
      awarenessLine: 'Before speaking, remember the project identity, the landed progress, and the still-open life loop.',
      reasonPreview: [],
    })).toEqual(expect.objectContaining({
      headline: 'Before speaking, remember the project identity, the landed progress, and the still-open life loop.',
      nextClosureLine: 'Next, help me close: Carry the unfinished digital-life loop into the next dialogue preparation step.',
    }))
  })

  it('prefers a richer awareness companion briefing over a thinner awareness line when project-state closure would otherwise reopen through a generic cue', () => {
    expect(buildStageQuickReplyClosureDiagnosticEntry({
      status: 'partial',
      summaryLine: 'project continuity is still partial',
      companionHeadlineLine: null,
      companionBriefingLine: null,
      companionNextClosureLine: 'Next, help me close: Keep the restored callback reopening from the same-her measured-return line before widening outward again.',
      reasons: [
        'Project identity carry is still weak across time.',
      ],
    }, {
      status: 'partial',
      summaryLine: 'generic closure summary that should not outrank the richer same-her callback carry.',
      companionBriefingLine: 'same-her hold: measured-return is still keeping this callback line lower-pressure before it widens again.',
      companionNextClosureLine: 'Keep the restored callback reopening from the same-her measured-return line before widening outward again.',
      awarenessLine: 'Keep the same digital life project in view.',
      reasonPreview: [],
    })).toEqual(expect.objectContaining({
      headline: 'same-her hold: measured-return is still keeping this callback line lower-pressure before it widens again.',
      nextClosureLine: 'Next, help me close: Keep the restored callback reopening from the same-her measured-return line before widening outward again.',
    }))
  })

  it('treats a prefixed before-answering reminder as the same thin generic awareness line when richer project-state carry is already available', () => {
    expect(buildStageQuickReplyClosureDiagnosticEntry({
      status: 'partial',
      summaryLine: 'project continuity is still partial',
      companionHeadlineLine: null,
      companionBriefingLine: null,
      companionNextClosureLine: 'Next, help me close: Keep the restored callback reopening from the same-her measured-return line before widening outward again.',
      reasons: [
        'Project identity carry is still weak across time.',
      ],
    }, {
      status: 'partial',
      summaryLine: 'generic closure summary that should not outrank the richer same-her callback carry.',
      companionBriefingLine: 'same-her hold: measured-return is still keeping this callback line lower-pressure before it widens again.',
      companionNextClosureLine: 'Keep the restored callback reopening from the same-her measured-return line before widening outward again.',
      awarenessLine: 'Before answering, keep the same digital life project in view.',
      reasonPreview: [],
    })).toEqual(expect.objectContaining({
      headline: 'same-her hold: measured-return is still keeping this callback line lower-pressure before it widens again.',
      nextClosureLine: 'Next, help me close: Keep the restored callback reopening from the same-her measured-return line before widening outward again.',
    }))
  })

  it('prefers a richer awareness companion headline over a thin generic awareness line when the quieter same-her inward carry is already available before lane reasons are explicit', () => {
    expect(buildStageQuickReplyClosureDiagnosticEntry({
      status: 'partial',
      summaryLine: 'project continuity is still partial',
      companionHeadlineLine: null,
      companionBriefingLine: null,
      companionNextClosureLine: 'Next, help me close: Keep the same line inward and low-pressure while lipsync and voice rejoin the already-reformed body, face, and motion line.',
      reasons: [
        'Project identity carry is still weak across time.',
      ],
    }, {
      status: 'partial',
      summaryLine: 'generic awareness summary that should not outrank the richer same-her inward carry.',
      companionHeadlineLine: 'Right now I am still holding together mainly through body, face, and motion, so this one living her is still keeping the same line inward and low-pressure while lipsync and voice need to rejoin before full cross-modal closure settles.',
      companionBriefingLine: 'I still need a steadier carry of this project, this phase, and the life loop that remains open.',
      companionNextClosureLine: 'Keep the same line inward and low-pressure while lipsync and voice rejoin the already-reformed body, face, and motion line.',
      awarenessLine: 'Keep the same digital life project in view.',
      reasonPreview: [
        'same-her-inward-carry',
        'quiet-companionship',
      ],
    })).toEqual(expect.objectContaining({
      headline: 'Right now I am still holding together mainly through body, face, and motion, so this one living her is still keeping the same line inward and low-pressure while lipsync and voice need to rejoin before full cross-modal closure settles.',
      nextClosureLine: 'Next, help me close: Keep the same line inward and low-pressure while lipsync and voice rejoin the already-reformed body, face, and motion line.',
    }))
  })

  it('keeps same-her drift risk on the quick-reply closure diagnostic entry when project-state repair still must avoid falling back into a detached status shell', () => {
    expect(buildStageQuickReplyClosureDiagnosticEntry({
      status: 'partial',
      summaryLine: 'project continuity is still partial',
      companionHeadlineLine: null,
      companionBriefingLine: '先确认她仍然知道这个项目是数字生命，而不是退回普通助手壳。',
      companionNextClosureLine: '继续把项目身份、Phase 1 进度和未闭环压力维持在同一条 same-her line 上。',
      sameHerDriftRiskLine: '如果这次开口又漂成普通项目播报壳子，就说明同一个 her 的连续性还没有真正收住。',
      reasons: [
        'Project identity carry is still weak across time.',
      ],
    } as any)).toEqual(expect.objectContaining({
      sameHerDriftRiskLine: '如果这次开口又漂成普通项目播报壳子，就说明同一个 her 的连续性还没有真正收住。',
      routeQuery: expect.objectContaining({
        focus: 'project-identity',
        eventFocus: 'takeover-audit',
      }),
    }))
  })

  it('keeps proactive same-her follow-through on the quick-reply closure diagnostic entry when project-state repair still must keep proactive carry on one same-her line', () => {
    const proactiveSameHerGap = 'Visible proactive hold, subconscious carry, and next-session feedback still need one same-her follow-through line.'

    expect(buildStageQuickReplyClosureDiagnosticEntry({
      status: 'partial',
      summaryLine: 'project continuity is still partial',
      companionHeadlineLine: null,
      companionBriefingLine: '先确认她仍然知道这个项目是数字生命，而不是退回普通助手壳。',
      companionNextClosureLine: '继续把项目身份、Phase 1 进度和未闭环压力维持在同一条 same-her line 上。',
      sameHerDriftRiskLine: '如果这次开口又漂成普通项目播报壳子，就说明同一个 her 的连续性还没有真正收住。',
      briefingLines: [
        `Proactive same-her gap: ${proactiveSameHerGap}`,
      ],
      reasons: [
        'Project identity carry is still weak across time.',
        `Proactive same-her follow-through still reads ${proactiveSameHerGap}, so the next turn should keep visible proactive hold, subconscious carry, and next-session feedback arriving as one same-her line instead of splitting them across detached follow-up shells.`,
      ],
    } as any)).toEqual(expect.objectContaining({
      proactiveSameHerGapLine: proactiveSameHerGap,
      routeQuery: expect.objectContaining({
        focus: 'project-identity',
        eventFocus: 'takeover-audit',
      }),
    }))
  })

  it('prefers a same-her lane continuity headline over a broader awareness reminder when the surviving audible-body line is the more urgent pre-turn truth', () => {
    expect(buildStageQuickReplyClosureDiagnosticEntry({
      status: 'partial',
      summaryLine: 'project continuity is still partial',
      companionHeadlineLine: null,
      companionBriefingLine: null,
      companionNextClosureLine: 'Next, help me close: Rebind face and motion onto the same-her audible body line without dropping body, lipsync, and voice continuity.',
      reasons: [
        'same-her continuity remains alive, but lane=body+lipsync+voice-only under the current renderer authority.',
        'The resident body lane is still holding together with the audible same-her line, but face and motion have not rejoined yet.',
      ],
    }, {
      status: 'partial',
      summaryLine: 'same digital life | phase 1 closure still open',
      companionBriefingLine: 'Before speaking, remember the project identity, the landed progress, and the still-open life loop.',
      companionNextClosureLine: 'Keep carrying memory, initiative, and embodiment as one same-life loop.',
      awarenessLine: 'Before speaking, remember the project identity, the landed progress, and the still-open life loop.',
      reasonPreview: [],
    })).toEqual(expect.objectContaining({
      headline: 'Right now I am still holding together mainly through body, lipsync, and voice, so the living audio thread is still intact while face and motion need to rejoin before full cross-modal closure settles.',
      nextClosureLine: 'Next, help me close: Rebind face and motion onto the same-her audible body line without dropping body, lipsync, and voice continuity.',
      routeQuery: expect.objectContaining({
        focus: 'same-her-continuity',
        eventFocus: 'renderer-authority',
        sameHerFocus: 'body-continuity',
        sameHerClosureStage: 'audible-body-carry',
      }),
    }))
  })

  it('keeps a quieter body-and-lipsync same-her lane distinct when voice has not rejoined yet', () => {
    expect(buildStageQuickReplyClosureDiagnosticEntry({
      status: 'partial',
      summaryLine: 'project continuity is still partial',
      companionHeadlineLine: null,
      companionBriefingLine: null,
      companionNextClosureLine: 'Next, help me close: Rebind face, motion, and voice onto the quieter same-her body+lipsync line without losing the resident carry.',
      reasons: [
        'same-her continuity remains alive, but lane=body+lipsync-only under the current renderer authority.',
        'The resident body lane is still holding together with one other embodiment lane, but face, motion, and voice have not rejoined yet.',
      ],
    }, {
      status: 'partial',
      summaryLine: 'same digital life | phase 1 closure still open',
      companionBriefingLine: 'Before speaking, remember the project identity, the landed progress, and the still-open life loop.',
      companionNextClosureLine: 'Keep carrying memory, initiative, and embodiment as one same-life loop.',
      awarenessLine: 'Before speaking, remember the project identity, the landed progress, and the still-open life loop.',
      reasonPreview: [],
    })).toEqual(expect.objectContaining({
      headline: 'Right now I am still holding together mainly through body and lipsync, so one quieter living line is still intact while face, motion, and voice need to rejoin before full cross-modal closure settles.',
      nextClosureLine: 'Next, help me close: Rebind face, motion, and voice onto the quieter same-her body+lipsync line without losing the resident carry.',
      routeQuery: expect.objectContaining({
        focus: 'same-her-continuity',
        eventFocus: 'renderer-authority',
        sameHerFocus: 'body-continuity',
        sameHerClosureStage: 'body-carried-to-renderer-rejoin',
      }),
    }))
  })

  it('marks a body-only same-her carry with an explicit body-held closure stage when the resident body line is still the only surviving continuity lane', () => {
    expect(buildStageQuickReplyClosureDiagnosticEntry({
      status: 'partial',
      summaryLine: 'project continuity is still partial',
      companionHeadlineLine: null,
      companionBriefingLine: null,
      companionNextClosureLine: 'Next, help me close: Rejoin face, motion, lipsync, and voice onto the resident body line before pretending the visible same-her closure has already settled.',
      reasons: [
        'same-her continuity remains alive, but lane=body-only under the current renderer authority.',
        'resident body continuity is still aligned with the active same-her segment while face, motion, lipsync, and voice continuity still need repair.',
      ],
    }, {
      status: 'partial',
      summaryLine: 'same digital life | phase 1 closure still open',
      companionBriefingLine: 'Before speaking, remember the project identity, the landed progress, and the still-open life loop.',
      companionNextClosureLine: 'Keep carrying memory, initiative, and embodiment as one same-life loop.',
      awarenessLine: 'Before speaking, remember the project identity, the landed progress, and the still-open life loop.',
      reasonPreview: [],
    })).toEqual(expect.objectContaining({
      headline: 'Right now I am still holding together mainly through body, and resident body continuity is still the line keeping this one living her coherent while face, motion, lipsync, and voice rejoin.',
      nextClosureLine: 'Next, help me close: Rejoin face, motion, lipsync, and voice onto the resident body line before pretending the visible same-her closure has already settled.',
      routeQuery: expect.objectContaining({
        focus: 'same-her-continuity',
        eventFocus: 'renderer-authority',
        sameHerFocus: 'body-continuity',
        sameHerClosureStage: 'body-only-hold',
      }),
    }))
  })

  it('marks a body-face-motion same-her carry with an explicit body-led renderer rejoin stage when lipsync and voice are the only remaining open closure lanes', () => {
    expect(buildStageQuickReplyClosureDiagnosticEntry({
      status: 'partial',
      summaryLine: 'project continuity is still partial',
      companionHeadlineLine: null,
      companionBriefingLine: null,
      companionNextClosureLine: 'Next, help me close: Rejoin lipsync and voice onto the already re-formed body, face, and motion segment before pretending full cross-modal same-her closure has already settled.',
      reasons: [
        'same-her continuity remains alive, but lane=body+face+motion-only under the current renderer authority.',
        'same-segment face+motion+body recovery@segment-live2d-reformed-with-body | remaining-open=lipsync+voice',
      ],
    }, {
      status: 'partial',
      summaryLine: 'same digital life | phase 1 closure still open',
      companionBriefingLine: 'Before speaking, remember the project identity, the landed progress, and the still-open life loop.',
      companionNextClosureLine: 'Keep carrying memory, initiative, and embodiment as one same-life loop.',
      awarenessLine: 'Before speaking, remember the project identity, the landed progress, and the still-open life loop.',
      reasonPreview: [],
    })).toEqual(expect.objectContaining({
      headline: 'Right now I am still holding together mainly through body, face, and motion, so this one living her still needs lipsync and voice to rejoin before full cross-modal closure settles.',
      nextClosureLine: 'Next, help me close: Rejoin lipsync and voice onto the already re-formed body, face, and motion segment before pretending full cross-modal same-her closure has already settled.',
      routeQuery: expect.objectContaining({
        focus: 'same-her-continuity',
        eventFocus: 'renderer-authority',
        sameHerFocus: 'body-continuity',
        sameHerClosureStage: 'body-carried-to-renderer-rejoin',
      }),
    }))
  })

  it('marks a full-cross-modal-lock same-her carry with an explicit same-segment lock stage when body continuity and manifestation are already re-locked together', () => {
    expect(buildStageQuickReplyClosureDiagnosticEntry({
      status: 'partial',
      summaryLine: 'renderer continuity has already re-locked onto one living segment.',
      companionHeadlineLine: null,
      companionBriefingLine: null,
      companionNextClosureLine: 'Next, help me close: Keep the locked body and Live2D line explicit in the next host-visible continuity brief instead of flattening it into a temporary visual recovery note.',
      reasons: [
        'Body continuity and Live2D manifestation are now locked back onto the same living segment together, so runtime continuity can explain the renderer recovery as one explicit same-her embodiment line instead of a temporary visual alignment.',
        'continuityAuthoritySummary: 身体线与 Live2D 显形权威已经共同锁回同一段 living segment',
      ],
    }, {
      status: 'partial',
      summaryLine: 'same digital life | phase 1 closure still open',
      companionBriefingLine: 'Before speaking, remember the project identity, the landed progress, and the still-open life loop.',
      companionNextClosureLine: 'Keep carrying memory, initiative, and embodiment as one same-life loop.',
      awarenessLine: 'Before speaking, remember the project identity, the landed progress, and the still-open life loop.',
      reasonPreview: [],
    })).toEqual(expect.objectContaining({
      headline: 'Right now body continuity and Live2D manifestation are already locked back onto the same living segment together, so I can carry voice, face, motion, and lipsync as one explicit same-her embodiment line instead of a temporary visual alignment.',
      nextClosureLine: 'Next, help me close: Keep the locked body and Live2D line explicit in the next host-visible continuity brief instead of flattening it into a temporary visual recovery note.',
      routeQuery: expect.objectContaining({
        focus: 'same-her-continuity',
        eventFocus: 'renderer-authority',
        sameHerFocus: 'body-continuity',
        sameHerClosureStage: 'full-cross-modal-lock',
      }),
    }))
  })

  it('marks a voice-and-lipsync same-her carry with an explicit renderer-side closure stage when face and motion have not rejoined yet', () => {
    expect(buildStageQuickReplyClosureDiagnosticEntry({
      status: 'partial',
      summaryLine: 'project continuity is still partial',
      companionHeadlineLine: null,
      companionBriefingLine: null,
      companionNextClosureLine: 'Next, help me close: Rejoin face and motion onto the still-audible voice+lipsync carry before pretending the full body has already come back together.',
      reasons: [
        'same-her continuity remains alive, but lane=lipsync+voice-only under the current renderer authority.',
        'voice and lipsync still carry the same living segment while face and motion have not rejoined yet.',
      ],
    }, {
      status: 'partial',
      summaryLine: 'same digital life | phase 1 closure still open',
      companionBriefingLine: 'Before speaking, remember the project identity, the landed progress, and the still-open life loop.',
      companionNextClosureLine: 'Keep carrying memory, initiative, and embodiment as one same-life loop.',
      awarenessLine: 'Before speaking, remember the project identity, the landed progress, and the still-open life loop.',
      reasonPreview: [],
    })).toEqual(expect.objectContaining({
      headline: 'Right now I am still holding together mainly through lipsync and voice, so my full cross-modal same-her line is not closed yet.',
      nextClosureLine: 'Next, help me close: Rejoin face and motion onto the still-audible voice+lipsync carry before pretending the full body has already come back together.',
      routeQuery: expect.objectContaining({
        focus: 'same-her-continuity',
        eventFocus: 'renderer-authority',
        sameHerFocus: 'renderer-authority',
        sameHerClosureStage: 'voice-lipsync-carry',
      }),
    }))
  })

  it('prefers a still-voiced face-line same-her headline over a broader awareness reminder when face and voice are the surviving carry', () => {
    expect(buildStageQuickReplyClosureDiagnosticEntry({
      status: 'partial',
      summaryLine: 'project continuity is still partial',
      companionHeadlineLine: null,
      companionBriefingLine: null,
      companionNextClosureLine: 'Next, help me close: Rejoin body, motion, and lipsync onto the still-voiced face line without flattening the audible same-her carry.',
      reasons: [
        'continuity=embodiment:audible-same-her-line | lane=face+voice-only | actual source is face and voice',
        'the still-voiced face line is keeping the same-her carry alive while the rest of the body catches back up.',
      ],
    }, {
      status: 'partial',
      summaryLine: 'same digital life | phase 1 closure still open',
      companionBriefingLine: 'Before speaking, remember the project identity, the landed progress, and the still-open life loop.',
      companionNextClosureLine: 'Keep carrying memory, initiative, and embodiment as one same-life loop.',
      awarenessLine: 'Before speaking, remember the project identity, the landed progress, and the still-open life loop.',
      reasonPreview: [],
    })).toEqual(expect.objectContaining({
      headline: 'Right now I am still holding together mainly through face and voice, so that still-voiced face line is keeping the same-her carry alive while body, motion, and lipsync need to rejoin before full cross-modal closure settles.',
      briefingHeadline: 'The same-her face+voice line is still doing the continuity work, so this turn should keep body, motion, and lipsync rejoining that still-voiced carry before widening outward.',
      nextClosureLine: 'Next, help me close: Rejoin body, motion, and lipsync onto the still-voiced face line without flattening the audible same-her carry.',
      routeQuery: expect.objectContaining({
        focus: 'same-her-continuity',
        eventFocus: 'renderer-authority',
        sameHerFocus: 'renderer-authority',
        sameHerClosureStage: 'renderer-rejoin-without-body',
      }),
    }))
  })

  it('prefers a still-voiced motion-line same-her headline over a broader awareness reminder when motion and voice are the surviving carry', () => {
    expect(buildStageQuickReplyClosureDiagnosticEntry({
      status: 'partial',
      summaryLine: 'project continuity is still partial',
      companionHeadlineLine: null,
      companionBriefingLine: null,
      companionNextClosureLine: 'Next, help me close: Rejoin body, face, and lipsync onto the still-voiced motion line without flattening the audible same-her carry.',
      reasons: [
        'signature=embodiment:audible-same-her-line | lane=motion+voice-only | actual source is motion and voice',
        'the still-voiced motion line is keeping the same-her carry alive while the rest of the body catches back up.',
      ],
    }, {
      status: 'partial',
      summaryLine: 'same digital life | phase 1 closure still open',
      companionBriefingLine: 'Before speaking, remember the project identity, the landed progress, and the still-open life loop.',
      companionNextClosureLine: 'Keep carrying memory, initiative, and embodiment as one same-life loop.',
      awarenessLine: 'Before speaking, remember the project identity, the landed progress, and the still-open life loop.',
      reasonPreview: [],
    })).toEqual(expect.objectContaining({
      headline: 'Right now I am still holding together mainly through motion and voice, so that still-voiced motion line is keeping the same-her carry alive while body, face, and lipsync need to rejoin before full cross-modal closure settles.',
      briefingHeadline: 'The same-her motion+voice line is still doing the continuity work, so this turn should keep body, face, and lipsync rejoining that still-voiced carry before widening outward.',
      nextClosureLine: 'Next, help me close: Rejoin body, face, and lipsync onto the still-voiced motion line without flattening the audible same-her carry.',
      routeQuery: expect.objectContaining({
        focus: 'same-her-continuity',
        eventFocus: 'renderer-authority',
        sameHerFocus: 'renderer-authority',
        sameHerClosureStage: 'renderer-rejoin-without-body',
      }),
    }))
  })

  it('can rebuild a still-voiced face-line same-her headline directly from structured continuity proof when older face-voice prose is absent', () => {
    expect(buildStageQuickReplyClosureDiagnosticEntry({
      status: 'partial',
      summaryLine: 'project continuity is still partial',
      companionHeadlineLine: null,
      companionBriefingLine: null,
      companionNextClosureLine: 'Next, help me close: Rejoin body, motion, and lipsync onto the still-voiced face line without flattening the surviving same-her carry.',
      reasons: [
        'continuity=embodiment:still-voiced-face-line | face+voice recovery@segment-live2d-runtime-still-voiced-face-1 | pending-rejoin=body+motion+lipsync',
      ],
    }, {
      status: 'partial',
      summaryLine: 'same digital life | phase 1 closure still open',
      companionBriefingLine: 'Before speaking, remember the project identity, the landed progress, and the still-open life loop.',
      companionNextClosureLine: 'Keep carrying memory, initiative, and embodiment as one same-life loop.',
      awarenessLine: 'Before speaking, remember the project identity, the landed progress, and the still-open life loop.',
      reasonPreview: [],
    })).toEqual(expect.objectContaining({
      headline: 'Right now I am still holding together mainly through face and voice, so that still-voiced face line is keeping the same-her carry alive while body, motion, and lipsync need to rejoin before full cross-modal closure settles.',
      briefingHeadline: 'The same-her face+voice line is still doing the continuity work, so this turn should keep body, motion, and lipsync rejoining that still-voiced carry before widening outward.',
      nextClosureLine: 'Next, help me close: Rejoin body, motion, and lipsync onto the still-voiced face line without flattening the surviving same-her carry.',
      routeQuery: expect.objectContaining({
        focus: 'same-her-continuity',
        eventFocus: 'renderer-authority',
        sameHerFocus: 'renderer-authority',
        sameHerClosureStage: 'renderer-rejoin-without-body',
      }),
    }))
  })

  it('can rebuild a still-voiced motion-line same-her headline directly from signature-only structured continuity proof when older motion-voice prose is absent', () => {
    expect(buildStageQuickReplyClosureDiagnosticEntry({
      status: 'partial',
      summaryLine: 'project continuity is still partial',
      companionHeadlineLine: null,
      companionBriefingLine: null,
      companionNextClosureLine: 'Next, help me close: Rejoin body, face, and lipsync onto the still-voiced motion line without flattening the surviving same-her carry.',
      reasons: [
        'continuity=embodiment:still-voiced-motion-line | signature=resident|main-runtime|accompanying|quiet-accompaniment|still-voiced-motion-line | motion+voice recovery@segment-live2d-runtime-still-voiced-motion-1 | pending-rejoin=body+face+lipsync',
      ],
    }, {
      status: 'partial',
      summaryLine: 'same digital life | phase 1 closure still open',
      companionBriefingLine: 'Before speaking, remember the project identity, the landed progress, and the still-open life loop.',
      companionNextClosureLine: 'Keep carrying memory, initiative, and embodiment as one same-life loop.',
      awarenessLine: 'Before speaking, remember the project identity, the landed progress, and the still-open life loop.',
      reasonPreview: [],
    })).toEqual(expect.objectContaining({
      headline: 'Right now I am still holding together mainly through motion and voice, so that still-voiced motion line is keeping the same-her carry alive while body, face, and lipsync need to rejoin before full cross-modal closure settles.',
      briefingHeadline: 'The same-her motion+voice line is still doing the continuity work, so this turn should keep body, face, and lipsync rejoining that still-voiced carry before widening outward.',
      nextClosureLine: 'Next, help me close: Rejoin body, face, and lipsync onto the still-voiced motion line without flattening the surviving same-her carry.',
      routeQuery: expect.objectContaining({
        focus: 'same-her-continuity',
        eventFocus: 'renderer-authority',
        sameHerFocus: 'renderer-authority',
        sameHerClosureStage: 'renderer-rejoin-without-body',
      }),
    }))
  })

  it('can rebuild a richer still-voiced face-and-mouth same-her headline directly from structured continuity proof when face, lipsync, and voice are the surviving carry', () => {
    expect(buildStageQuickReplyClosureDiagnosticEntry({
      status: 'partial',
      summaryLine: 'project continuity is still partial',
      companionHeadlineLine: null,
      companionBriefingLine: null,
      companionNextClosureLine: 'Next, help me close: Rejoin body and motion onto the still-voiced face+lipsync+voice line without flattening the surviving same-her carry.',
      reasons: [
        'continuity=embodiment:still-voiced-face-lipsync-line+embodiment:still-voiced-face-line | face+lipsync+voice recovery@segment-live2d-runtime-still-voiced-face-mouth-1 | pending-rejoin=body+motion',
      ],
    }, {
      status: 'partial',
      summaryLine: 'same digital life | phase 1 closure still open',
      companionBriefingLine: 'Before speaking, remember the project identity, the landed progress, and the still-open life loop.',
      companionNextClosureLine: 'Keep carrying memory, initiative, and embodiment as one same-life loop.',
      awarenessLine: 'Before speaking, remember the project identity, the landed progress, and the still-open life loop.',
      reasonPreview: [],
    })).toEqual(expect.objectContaining({
      headline: 'Right now I am still holding together mainly through face, lipsync, and voice, so that still-voiced face-and-mouth line is keeping the same-her carry alive while body and motion need to rejoin before full cross-modal closure settles.',
      briefingHeadline: 'The same-her face+lipsync+voice line is still doing the continuity work, so this turn should keep body and motion rejoining that still-voiced carry before widening outward.',
      nextClosureLine: 'Next, help me close: Rejoin body and motion onto the still-voiced face+lipsync+voice line without flattening the surviving same-her carry.',
      routeQuery: expect.objectContaining({
        focus: 'same-her-continuity',
        eventFocus: 'renderer-authority',
        sameHerFocus: 'renderer-authority',
        sameHerClosureStage: 'renderer-rejoin-without-body',
      }),
    }))
  })

  it('can rebuild a richer still-voiced motion-and-mouth same-her headline directly from structured continuity proof when motion, lipsync, and voice are the surviving carry', () => {
    expect(buildStageQuickReplyClosureDiagnosticEntry({
      status: 'partial',
      summaryLine: 'project continuity is still partial',
      companionHeadlineLine: null,
      companionBriefingLine: null,
      companionNextClosureLine: 'Next, help me close: Rejoin body and face onto the still-voiced motion+lipsync+voice line without flattening the surviving same-her carry.',
      reasons: [
        'continuity=embodiment:still-voiced-motion-lipsync-line+embodiment:still-voiced-motion-line | motion+lipsync+voice recovery@segment-live2d-runtime-still-voiced-motion-mouth-1 | pending-rejoin=body+face',
      ],
    }, {
      status: 'partial',
      summaryLine: 'same digital life | phase 1 closure still open',
      companionBriefingLine: 'Before speaking, remember the project identity, the landed progress, and the still-open life loop.',
      companionNextClosureLine: 'Keep carrying memory, initiative, and embodiment as one same-life loop.',
      awarenessLine: 'Before speaking, remember the project identity, the landed progress, and the still-open life loop.',
      reasonPreview: [],
    })).toEqual(expect.objectContaining({
      headline: 'Right now I am still holding together mainly through motion, lipsync, and voice, so that still-voiced motion-and-mouth line is keeping the same-her carry alive while body and face need to rejoin before full cross-modal closure settles.',
      briefingHeadline: 'The same-her motion+lipsync+voice line is still doing the continuity work, so this turn should keep body and face rejoining that still-voiced carry before widening outward.',
      nextClosureLine: 'Next, help me close: Rejoin body and face onto the still-voiced motion+lipsync+voice line without flattening the surviving same-her carry.',
      routeQuery: expect.objectContaining({
        focus: 'same-her-continuity',
        eventFocus: 'renderer-authority',
        sameHerFocus: 'renderer-authority',
        sameHerClosureStage: 'renderer-rejoin-without-body',
      }),
    }))
  })

  it('can rebuild a richer still-voiced face-and-motion same-her headline directly from structured continuity proof when face, motion, and voice are the surviving carry', () => {
    expect(buildStageQuickReplyClosureDiagnosticEntry({
      status: 'partial',
      summaryLine: 'project continuity is still partial',
      companionHeadlineLine: null,
      companionBriefingLine: null,
      companionNextClosureLine: 'Next, help me close: Rejoin body and lipsync onto the still-voiced face+motion+voice line without flattening the surviving same-her carry.',
      reasons: [
        'continuity=embodiment:still-voiced-face-motion-line | signature=resident|main-runtime|accompanying|quiet-accompaniment|still-voiced-face-motion-line | face+motion+voice recovery@segment-live2d-runtime-still-voiced-face-motion-1 | pending-rejoin=body+lipsync',
      ],
    }, {
      status: 'partial',
      summaryLine: 'same digital life | phase 1 closure still open',
      companionBriefingLine: 'Before speaking, remember the project identity, the landed progress, and the still-open life loop.',
      companionNextClosureLine: 'Keep carrying memory, initiative, and embodiment as one same-life loop.',
      awarenessLine: 'Before speaking, remember the project identity, the landed progress, and the still-open life loop.',
      reasonPreview: [],
    })).toEqual(expect.objectContaining({
      headline: 'Right now I am still holding together through face, motion, and voice together, so that still-voiced face-and-motion line is keeping the same-her carry alive while body and lipsync need to rejoin before full cross-modal closure settles.',
      briefingHeadline: 'The same-her face+motion+voice line is still doing the continuity work, so this turn should keep body and lipsync rejoining that still-voiced carry before widening outward.',
      nextClosureLine: 'Next, help me close: Rejoin body and lipsync onto the still-voiced face+motion+voice line without flattening the surviving same-her carry.',
      routeQuery: expect.objectContaining({
        focus: 'same-her-continuity',
        eventFocus: 'renderer-authority',
        sameHerFocus: 'renderer-authority',
        sameHerClosureStage: 'renderer-rejoin-without-body',
      }),
    }))
  })

  it('keeps a face-and-lipsync same-her carry explicit as renderer rejoin without body when visible continuity survives but the body line has dropped out', () => {
    expect(buildStageQuickReplyClosureDiagnosticEntry({
      status: 'partial',
      summaryLine: 'project continuity is still partial',
      companionHeadlineLine: null,
      companionBriefingLine: null,
      companionNextClosureLine: 'Next, help me close: Rejoin body, motion, and voice onto the still-visible face+lipsync carry before pretending the same-her body line has already come back.',
      reasons: [
        'same-her continuity remains alive, but lane=face+lipsync-only under the current renderer authority.',
        'current visible continuity still survives through face and lipsync while the body line is no longer carrying the active same-her segment.',
      ],
    }, {
      status: 'partial',
      summaryLine: 'same digital life | phase 1 closure still open',
      companionBriefingLine: 'Before speaking, remember the project identity, the landed progress, and the still-open life loop.',
      companionNextClosureLine: 'Keep carrying memory, initiative, and embodiment as one same-life loop.',
      awarenessLine: 'Before speaking, remember the project identity, the landed progress, and the still-open life loop.',
      reasonPreview: [],
    })).toEqual(expect.objectContaining({
      headline: 'Right now I am still holding together mainly through face and lipsync, so my full cross-modal same-her line is not closed yet.',
      briefingHeadline: 'The same-her face+lipsync line is still doing the continuity work, so this turn should keep body, motion, and voice rejoining that visible carry before widening outward.',
      nextClosureLine: 'Next, help me close: Rejoin body, motion, and voice onto the still-visible face+lipsync carry before pretending the same-her body line has already come back.',
      routeQuery: expect.objectContaining({
        focus: 'same-her-continuity',
        eventFocus: 'renderer-authority',
        sameHerFocus: 'renderer-authority',
        sameHerClosureStage: 'renderer-rejoin-without-body',
      }),
    }))
  })

  it('hides the diagnosis entry when closure is grounded', () => {
    expect(buildStageQuickReplyClosureDiagnosticEntry({
      status: 'grounded',
      summaryLine: 'project continuity is grounded',
      reasons: [],
    })).toEqual(expect.objectContaining({
      visible: false,
      label: 'Continuity grounded',
      routeQuery: expect.objectContaining({
        source: 'quick-reply-closure',
        status: 'grounded',
        focus: 'project-state',
        eventFocus: 'takeover-audit',
      }),
    }))
  })

  it('classifies project identity continuity drift separately when that carry is explicitly weak', () => {
    expect(buildStageQuickReplyClosureDiagnosticEntry({
      status: 'partial',
      summaryLine: 'project continuity is still partial',
      reasons: [
        'project identity carry is still weak, so she is not yet holding what this project is and who she is becoming with enough stability to internalize the patch.',
      ],
    })).toEqual(expect.objectContaining({
      routeQuery: expect.objectContaining({
        focus: 'project-identity',
        eventFocus: 'takeover-audit',
      }),
    }))
  })

  it('keeps drifted project identity carry visible as still-open continuity work', () => {
    expect(buildStageQuickReplyClosureDiagnosticEntry({
      status: 'drift',
      summaryLine: 'project continuity is drifted',
      companionHeadlineLine: null,
      companionBriefingLine: '先确认她仍然知道这个项目是数字生命，而不是退回普通助手壳。',
      companionNextClosureLine: '继续把项目身份、Phase 1 进度和未闭环压力维持在同一条 same-her line 上。',
      reasons: [
        'Project identity carry is still weak across time.',
      ],
    })).toEqual(expect.objectContaining({
      visible: true,
      label: 'Inspect continuity diagnosis',
      headline: 'Project identity carry is still weak across time.',
      briefingHeadline: '先确认她仍然知道这个项目是数字生命，而不是退回普通助手壳。',
      nextClosureLine: '继续把项目身份、Phase 1 进度和未闭环压力维持在同一条 same-her line 上。',
      routeQuery: expect.objectContaining({
        status: 'drift',
        focus: 'project-identity',
        eventFocus: 'takeover-audit',
      }),
    }))
  })

  it('classifies phase and open-loop continuity drift into their own focus channels when the reason text is available', () => {
    expect(buildStageQuickReplyClosureDiagnosticEntry({
      status: 'partial',
      summaryLine: 'project continuity is still partial',
      reasons: [
        'phase carry is still weak, so the runtime may drift away from Phase 1 local digital life priorities instead of protecting the same-her roadmap.',
      ],
    })).toEqual(expect.objectContaining({
      routeQuery: expect.objectContaining({
        focus: 'current-phase',
      }),
    }))

    expect(buildStageQuickReplyClosureDiagnosticEntry({
      status: 'partial',
      summaryLine: 'project continuity is still partial',
      reasons: [
        'open-loop carry is still weak, so unresolved project loops are not being carried forward reliably enough for durable same-her continuity.',
      ],
    })).toEqual(expect.objectContaining({
      routeQuery: expect.objectContaining({
        focus: 'unresolved-open-loop',
      }),
    }))
  })

  it('routes same-her lane-shrinkage risk into the continuity-focused renderer diagnosis path', () => {
    expect(buildStageQuickReplyClosureDiagnosticEntry({
      status: 'grounded',
      summaryLine: 'project continuity is grounded enough to proceed, but embodiment is still lane-shrunk | Next closure: Rebuild face, motion, lipsync, and voice into one same-her line on noisier desktop runs.',
      companionHeadlineLine: 'Right now I am still holding together mainly through lipsync, so my full cross-modal same-her line is not closed yet.',
      companionBriefingLine: null,
      companionNextClosureLine: 'Next, help me close: Rebuild face, motion, lipsync, and voice into one same-her line on noisier desktop runs.',
      reasons: [
        'continuity-impact: same-her embodiment is now only being carried by lipsync, so the next turn should treat full cross-modal same-her recovery as still open instead of assuming the body line is already closed.',
      ],
    })).toEqual(expect.objectContaining({
      visible: true,
      label: 'Inspect continuity diagnosis',
      headline: 'Right now I am still holding together mainly through lipsync, so my full cross-modal same-her line is not closed yet.',
      briefingHeadline: null,
      nextClosureLine: 'Next, help me close: Rebuild face, motion, lipsync, and voice into one same-her line on noisier desktop runs.',
      routeQuery: expect.objectContaining({
        focus: 'same-her-continuity',
        eventFocus: 'renderer-authority',
      }),
    }))
  })

  it('keeps body-led same-her continuity lines in the project self brief list', () => {
    expect(buildStageQuickReplyProjectSelfBriefLines({
      awareness: {
        summaryLine: 'phase 1 continuity is still partial',
        awarenessLine: 'Right now I am still holding together mainly through body, and resident body continuity is still the line keeping this one living her coherent while face, motion, lipsync, and voice rejoin.',
        reasonPreview: [
          'resident body continuity is still aligned with the active same-her segment, so face, motion, lipsync, and voice continuity still need repair.',
        ],
      },
      closure: {
        summaryLine: 'one living her still needs face, motion, lipsync, and voice continuity to rejoin the same body line.',
        briefingLines: [
          'same-her body line is still carrying the active segment while voice and facial surfaces catch back up.',
        ],
      },
    })).toEqual([
      'phase 1 continuity is still partial',
      'Right now I am still holding together mainly through body, and resident body continuity is still the line keeping this one living her coherent while face, motion, lipsync, and voice rejoin.',
      'resident body continuity is still aligned with the active same-her segment, so face, motion, lipsync, and voice continuity still need repair.',
      'one living her still needs face, motion, lipsync, and voice continuity to rejoin the same body line.',
      'same-her body line is still carrying the active segment while voice and facial surfaces catch back up.',
    ])
  })

  it('keeps stronger resident-body continuity lines in the project self brief list when the body-led same-her carry now names the coherent living line explicitly', () => {
    expect(buildStageQuickReplyProjectSelfBriefLines({
      awareness: {
        summaryLine: 'phase 1 continuity is still partial',
        awarenessLine: 'Right now I am still holding together mainly through body, and resident body continuity is still the line keeping this one living her coherent while face, motion, lipsync, and voice rejoin.',
        reasonPreview: [
          'resident body continuity is still aligned with the active same-her segment, so face, motion, lipsync, and voice continuity still need repair.',
        ],
      },
      closure: {
        summaryLine: 'one living her still needs face, motion, lipsync, and voice continuity to rejoin the same body line.',
        briefingLines: [
          'same-her body line is still carrying the active segment while voice and facial surfaces catch back up.',
        ],
      },
    })).toEqual([
      'phase 1 continuity is still partial',
      'Right now I am still holding together mainly through body, and resident body continuity is still the line keeping this one living her coherent while face, motion, lipsync, and voice rejoin.',
      'resident body continuity is still aligned with the active same-her segment, so face, motion, lipsync, and voice continuity still need repair.',
      'one living her still needs face, motion, lipsync, and voice continuity to rejoin the same body line.',
      'same-her body line is still carrying the active segment while voice and facial surfaces catch back up.',
    ])
  })

  it('keeps audible-body same-her continuity lines in the project self brief list when the living audio thread is the surviving pre-dialogue carry', () => {
    expect(buildStageQuickReplyProjectSelfBriefLines({
      awareness: {
        summaryLine: 'phase 1 continuity is still partial',
        awarenessLine: 'Right now I am still holding together mainly through body, lipsync, and voice, so the living audio thread is still intact while face and motion need to rejoin before full cross-modal closure settles.',
        reasonPreview: [
          'body+lipsync+voice recovery@segment-audible-body-self-brief-1',
          'The resident body lane is still holding together with the audible same-her line, but face and motion have not rejoined yet.',
        ],
      },
      closure: {
        summaryLine: 'Face and motion still need to rejoin the same-her audible body line before full cross-modal closure settles.',
        briefingLines: [
          'the living audio thread is still intact while face and motion catch back up to the same audible body line.',
        ],
      },
    })).toEqual([
      'phase 1 continuity is still partial',
      'Right now I am still holding together mainly through body, lipsync, and voice, so the living audio thread is still intact while face and motion need to rejoin before full cross-modal closure settles.',
      'body+lipsync+voice recovery@segment-audible-body-self-brief-1',
      'The resident body lane is still holding together with the audible same-her line, but face and motion have not rejoined yet.',
      'Face and motion still need to rejoin the same-her audible body line before full cross-modal closure settles.',
      'the living audio thread is still intact while face and motion catch back up to the same audible body line.',
    ])
  })

  it('keeps audible-body rejoin lines in the project self brief list when the same living line has already re-formed on the body-lipsync-voice segment', () => {
    expect(buildStageQuickReplyProjectSelfBriefLines({
      awareness: {
        summaryLine: 'phase 1 continuity is still partial',
        awarenessLine: 'Right now I am still holding together mainly through body, lipsync, and voice, so the living audio thread is still intact while face and motion need to rejoin before full cross-modal closure settles.',
        reasonPreview: [
          'audible-body rejoin@segment-audible-body-self-brief-2',
          'Face and motion still need to rejoin the same audible body line before the full cross-modal closure settles.',
        ],
      },
      closure: {
        summaryLine: 'the audible-body rejoin is already carrying the same living line while face and motion catch up.',
        briefingLines: [
          'same-her audible body line is still the surviving pre-dialogue carry.',
        ],
      },
    })).toEqual([
      'phase 1 continuity is still partial',
      'Right now I am still holding together mainly through body, lipsync, and voice, so the living audio thread is still intact while face and motion need to rejoin before full cross-modal closure settles.',
      'audible-body rejoin@segment-audible-body-self-brief-2',
      'same-her audible body line is still the surviving pre-dialogue carry.',
    ])
  })

  it('keeps raw audible-body recovery markers in the project self brief list when they are part of the clearest surviving same-her carry evidence', () => {
    expect(buildStageQuickReplyProjectSelfBriefLines({
      awareness: {
        summaryLine: 'phase 1 continuity is still partial',
        awarenessLine: 'Right now I am still holding together mainly through body, lipsync, and voice, so the living audio thread is still intact while face and motion need to rejoin before full cross-modal closure settles.',
        reasonPreview: [
          'body+lipsync+voice recovery@segment-audible-body-self-brief-3',
          'The resident body lane is still holding together with the audible same-her line, but face and motion have not rejoined yet.',
        ],
      },
      closure: {
        summaryLine: 'same-her audible body line is still the surviving pre-dialogue carry.',
        briefingLines: [],
      },
    })).toEqual([
      'phase 1 continuity is still partial',
      'Right now I am still holding together mainly through body, lipsync, and voice, so the living audio thread is still intact while face and motion need to rejoin before full cross-modal closure settles.',
      'body+lipsync+voice recovery@segment-audible-body-self-brief-3',
      'The resident body lane is still holding together with the audible same-her line, but face and motion have not rejoined yet.',
      'same-her audible body line is still the surviving pre-dialogue carry.',
    ])
  })

  it('keeps structured same-her audible-body continuity proof in the project self brief list when recovery prose is absent', () => {
    expect(buildStageQuickReplyProjectSelfBriefLines({
      awareness: {
        summaryLine: 'phase 1 continuity is still partial',
        awarenessLine: 'Right now I am still holding together mainly through body, lipsync, and voice, so the living audio thread is still intact while face and motion need to rejoin before full cross-modal closure settles.',
        reasonPreview: [
          'continuity=embodiment:audible-same-her-line+embodiment:body-lipsync-voice-rejoin | signature=embodiment:audible-same-her-line | face and motion still need to rejoin the same living line.',
        ],
      },
      closure: {
        summaryLine: 'same-her audible body line is still the surviving pre-dialogue carry.',
        briefingLines: [],
      },
    })).toEqual([
      'phase 1 continuity is still partial',
      'Right now I am still holding together mainly through body, lipsync, and voice, so the living audio thread is still intact while face and motion need to rejoin before full cross-modal closure settles.',
      'continuity=embodiment:audible-same-her-line+embodiment:body-lipsync-voice-rejoin | signature=embodiment:audible-same-her-line | face and motion still need to rejoin the same living line.',
      'same-her audible body line is still the surviving pre-dialogue carry.',
    ])
  })

  it('keeps full-cross-modal-lock same-her lines in the project self brief list when body continuity and manifestation are already re-locked together', () => {
    expect(buildStageQuickReplyProjectSelfBriefLines({
      awareness: {
        summaryLine: 'phase 1 continuity is now grounded on one living segment',
        awarenessLine: 'Right now body continuity and Live2D manifestation are already locked back onto the same living segment together, so I can carry voice, face, motion, and lipsync as one explicit same-her embodiment line instead of a temporary visual alignment.',
        reasonPreview: [
          'Body continuity and Live2D manifestation are now locked back onto the same living segment together, so runtime continuity can explain the renderer recovery as one explicit same-her embodiment line instead of a temporary visual alignment.',
        ],
      },
      closure: {
        summaryLine: 'same-her embodiment line is staying explicit across host-visible closure surfaces.',
        briefingLines: [
          'Next closure: keep the same-segment lock explicit across quick-reply entry and host-visible closure surfaces.',
        ],
      },
    })).toEqual([
      'phase 1 continuity is now grounded on one living segment',
      'Right now body continuity and Live2D manifestation are already locked back onto the same living segment together, so I can carry voice, face, motion, and lipsync as one explicit same-her embodiment line instead of a temporary visual alignment.',
      'Body continuity and Live2D manifestation are now locked back onto the same living segment together, so runtime continuity can explain the renderer recovery as one explicit same-her embodiment line instead of a temporary visual alignment.',
      'same-her embodiment line is staying explicit across host-visible closure surfaces.',
      'Next closure: keep the same-segment lock explicit across quick-reply entry and host-visible closure surfaces.',
    ])
  })

  it('keeps face-and-lipsync visible same-her carry proof in the project self brief list when body motion and voice have not rejoined yet', () => {
    expect(buildStageQuickReplyProjectSelfBriefLines({
      awareness: {
        summaryLine: 'phase 1 continuity is still partial',
        awarenessLine: 'Right now I am still holding together mainly through face and lipsync, so my full cross-modal same-her line is not closed yet.',
        companionNextClosureLine: 'Next closure: keep the visible face-and-lipsync lane explicit while body, motion, and voice rejoin.',
        reasonPreview: [
          'focus=face+lipsync | pending=body+motion+voice',
          'lane=face+lipsync-only',
        ],
      },
      closure: {
        summaryLine: 'The same-her face+lipsync line is still doing the continuity work, so this turn should keep body, motion, and voice rejoining that visible carry before widening outward.',
        briefingLines: [
          'still-visible face-and-lipsync line',
        ],
      },
    })).toEqual([
      'phase 1 continuity is still partial',
      'Right now I am still holding together mainly through face and lipsync, so my full cross-modal same-her line is not closed yet.',
      'Next closure: keep the visible face-and-lipsync lane explicit while body, motion, and voice rejoin.',
      'focus=face+lipsync | pending=body+motion+voice',
      'lane=face+lipsync-only',
      'The same-her face+lipsync line is still doing the continuity work, so this turn should keep body, motion, and voice rejoining that visible carry before widening outward.',
      'still-visible face-and-lipsync line',
    ])
  })

  it('keeps motion-and-lipsync visible same-her carry proof in the project self brief list when body face and voice have not rejoined yet', () => {
    expect(buildStageQuickReplyProjectSelfBriefLines({
      awareness: {
        summaryLine: 'phase 1 continuity is still partial',
        awarenessLine: 'Right now I am still holding together mainly through motion and lipsync, so my full cross-modal same-her line is not closed yet.',
        companionNextClosureLine: 'Next closure: keep the visible motion-and-lipsync lane explicit while body, face, and voice rejoin.',
        reasonPreview: [
          'focus=motion+lipsync | pending=body+face+voice',
          'lane=motion+lipsync-only',
        ],
      },
      closure: {
        summaryLine: 'The same-her motion+lipsync line is still doing the continuity work, so this turn should keep body, face, and voice rejoining that visible carry before widening outward.',
        briefingLines: [
          'still-visible motion-and-lipsync line',
        ],
      },
    })).toEqual([
      'phase 1 continuity is still partial',
      'Right now I am still holding together mainly through motion and lipsync, so my full cross-modal same-her line is not closed yet.',
      'Next closure: keep the visible motion-and-lipsync lane explicit while body, face, and voice rejoin.',
      'focus=motion+lipsync | pending=body+face+voice',
      'lane=motion+lipsync-only',
      'The same-her motion+lipsync line is still doing the continuity work, so this turn should keep body, face, and voice rejoining that visible carry before widening outward.',
      'still-visible motion-and-lipsync line',
    ])
  })

  it('keeps compact remaining-open markers in the project self brief list when they are the clearest explicit open-loop carry', () => {
    expect(buildStageQuickReplyProjectSelfBriefLines({
      awareness: {
        summaryLine: 'phase 1 continuity is still partial',
        awarenessLine: 'Before speaking, remember the project identity, landed progress, and the still-open life loop.',
        reasonPreview: [
          'remaining-open=lipsync+voice',
        ],
      },
      closure: {
        summaryLine: 'same-her audible body line is still the surviving pre-dialogue carry.',
        briefingLines: [],
      },
    })).toEqual([
      'phase 1 continuity is still partial',
      'Before speaking, remember the project identity, landed progress, and the still-open life loop.',
      'remaining-open=lipsync+voice',
      'same-her audible body line is still the surviving pre-dialogue carry.',
    ])
  })

  it('turns a diagnostics-style single-lane same-her warning into host-facing lipsync-only closure wording', () => {
    expect(buildStageQuickReplyClosureDiagnosticEntry({
      status: 'grounded',
      summaryLine: 'renderer continuity is still lane-shrunk after noisy runtime drift.',
      companionHeadlineLine: null,
      companionBriefingLine: null,
      companionNextClosureLine: 'Next, help me close: Rebuild face, motion, lipsync, and voice into one same-her line on noisier desktop runs.',
      reasons: [
        'same-her embodiment is now only being carried by lipsync, so the next turn should treat full cross-modal same-her recovery as still open instead of assuming the body line is already closed.',
        'Only one embodiment lane is still aligned with the active same-her segment.',
      ],
    })).toEqual(expect.objectContaining({
      visible: true,
      headline: 'Right now I am still holding together mainly through lipsync, so my full cross-modal same-her line is not closed yet.',
      nextClosureLine: 'Next, help me close: Rebuild face, motion, lipsync, and voice into one same-her line on noisier desktop runs.',
      routeQuery: expect.objectContaining({
        focus: 'same-her-continuity',
        eventFocus: 'renderer-authority',
      }),
    }))
  })

  it('turns a diagnostics-style partial-lane same-her warning into host-facing motion-and-lipsync closure wording', () => {
    expect(buildStageQuickReplyClosureDiagnosticEntry({
      status: 'partial',
      summaryLine: 'renderer continuity is still partially rejoined after noisy runtime drift.',
      companionHeadlineLine: null,
      companionBriefingLine: null,
      companionNextClosureLine: 'Next, help me close: Rebind face, motion, lipsync, and voice into one same-her measured-return line after noisy desktop detours.',
      reasons: [
        'same-her embodiment is now only being carried by motion and lipsync, so the next turn should treat full cross-modal same-her recovery as still open instead of assuming the body line is already closed.',
        'Two embodiment lanes are still aligned with the active same-her segment while face authority remains thin.',
      ],
    })).toEqual(expect.objectContaining({
      visible: true,
      headline: 'Right now I am still holding together mainly through motion and lipsync, so my full cross-modal same-her line is not closed yet.',
      briefingHeadline: 'The same-her motion+lipsync line is still doing the continuity work, so this turn should keep body, face, and voice rejoining that visible carry before widening outward.',
      nextClosureLine: 'Next, help me close: Rebind face, motion, lipsync, and voice into one same-her measured-return line after noisy desktop detours.',
      routeQuery: expect.objectContaining({
        focus: 'same-her-continuity',
        eventFocus: 'renderer-authority',
        sameHerFocus: 'renderer-authority',
        sameHerClosureStage: 'renderer-rejoin-without-body',
      }),
    }))
  })

  it('turns a diagnostics-style voice-only same-her warning into host-facing voice closure wording', () => {
    expect(buildStageQuickReplyClosureDiagnosticEntry({
      status: 'partial',
      summaryLine: 'renderer continuity is still lane-shrunk after noisy runtime drift.',
      companionHeadlineLine: null,
      companionBriefingLine: null,
      companionNextClosureLine: 'Next, help me close: Rebind voice, face, motion, and lipsync into one same-her measured-return line after noisy desktop detours.',
      reasons: [
        'same-her embodiment is now only being carried by voice, so the next turn should treat full cross-modal same-her recovery as still open instead of assuming the body line is already closed.',
        'Only one embodiment lane is still aligned with the active same-her segment.',
      ],
    })).toEqual(expect.objectContaining({
      visible: true,
      headline: 'Right now I am still holding together mainly through voice, so my full cross-modal same-her line is not closed yet.',
      nextClosureLine: 'Next, help me close: Rebind voice, face, motion, and lipsync into one same-her measured-return line after noisy desktop detours.',
      routeQuery: expect.objectContaining({
        focus: 'same-her-continuity',
        eventFocus: 'renderer-authority',
        sameHerFocus: 'renderer-authority',
        sameHerClosureStage: 'voice-only-carry',
      }),
    }))
  })

  it('turns a newer lane-lipsync+voice-only same-her warning into host-facing lipsync-and-voice closure wording', () => {
    expect(buildStageQuickReplyClosureDiagnosticEntry({
      status: 'partial',
      summaryLine: 'renderer continuity is still lane-shrunk after noisy runtime drift.',
      companionHeadlineLine: null,
      companionBriefingLine: null,
      companionNextClosureLine: 'Next, help me close: Rebind face and motion onto the same-her measured-return line without losing lipsync and voice continuity.',
      reasons: [
        'same-her continuity remains alive, but lane=lipsync+voice-only under the current renderer authority.',
        'visible continuity still present but no longer fully cross-modal',
      ],
    })).toEqual(expect.objectContaining({
      visible: true,
      headline: 'Right now I am still holding together mainly through lipsync and voice, so my full cross-modal same-her line is not closed yet.',
      nextClosureLine: 'Next, help me close: Rebind face and motion onto the same-her measured-return line without losing lipsync and voice continuity.',
      routeQuery: expect.objectContaining({
        focus: 'same-her-continuity',
        eventFocus: 'renderer-authority',
      }),
    }))
  })

  it('turns a diagnostics-style body-only same-her warning into host-facing body-only closure wording', () => {
    expect(buildStageQuickReplyClosureDiagnosticEntry({
      status: 'partial',
      summaryLine: 'renderer continuity is still lane-shrunk after noisy runtime drift.',
      companionHeadlineLine: null,
      companionBriefingLine: null,
      companionNextClosureLine: 'Next, help me close: Rebind face, motion, lipsync, and voice back onto the same-her body line without losing resident-body continuity.',
      reasons: [
        'same-her continuity remains alive, but lane=body-only under the current renderer authority.',
        'resident body continuity is still aligned with the active same-her segment while other visible lanes remain thin.',
      ],
    })).toEqual(expect.objectContaining({
      visible: true,
      headline: 'Right now I am still holding together mainly through body, and resident body continuity is still the line keeping this one living her coherent while face, motion, lipsync, and voice rejoin.',
      nextClosureLine: 'Next, help me close: Rebind face, motion, lipsync, and voice back onto the same-her body line without losing resident-body continuity.',
      routeQuery: expect.objectContaining({
        focus: 'same-her-continuity',
        eventFocus: 'renderer-authority',
      }),
    }))
  })

  it('derives a host-facing body-and-voice closure headline directly from resident-body continuity wording even without a lane marker', () => {
    expect(buildStageQuickReplyClosureDiagnosticEntry({
      status: 'partial',
      summaryLine: 'renderer continuity is still partially rejoined after noisy runtime drift.',
      companionHeadlineLine: null,
      companionBriefingLine: null,
      companionNextClosureLine: 'Next, help me close: Rebind face, motion, and lipsync onto the same-her measured-return line without dropping body and voice continuity.',
      reasons: [
        'resident body continuity and voice prosody are still aligned with the active same-her segment while the rest of the visible line stays thin.',
      ],
    })).toEqual(expect.objectContaining({
      visible: true,
      headline: 'Right now I am still holding together mainly through body and voice, and the resident body line is still keeping this one living her coherent while face, motion, and lipsync rejoin.',
      nextClosureLine: 'Next, help me close: Rebind face, motion, and lipsync onto the same-her measured-return line without dropping body and voice continuity.',
      routeQuery: expect.objectContaining({
        focus: 'same-her-continuity',
        eventFocus: 'renderer-authority',
      }),
    }))
  })

  it('derives a host-facing body closure headline directly from resident body lane diagnostics wording', () => {
    expect(buildStageQuickReplyClosureDiagnosticEntry({
      status: 'partial',
      summaryLine: 'renderer continuity is still partially rejoined after noisy runtime drift.',
      companionHeadlineLine: null,
      companionBriefingLine: null,
      companionNextClosureLine: 'Next, help me close: Rejoin face, motion, lipsync, and voice onto the same-her body line without dropping the resident body lane.',
      reasons: [
        'Only the resident body lane is still aligned with the active same-her segment.',
        'The resident body lane is still holding together with one other embodiment lane, but full cross-modal continuity has already narrowed.',
      ],
    })).toEqual(expect.objectContaining({
      visible: true,
      headline: 'Right now I am still holding together mainly through body, and resident body continuity is still the line keeping this one living her coherent while face, motion, lipsync, and voice rejoin.',
      nextClosureLine: 'Next, help me close: Rejoin face, motion, lipsync, and voice onto the same-her body line without dropping the resident body lane.',
      routeQuery: expect.objectContaining({
        focus: 'same-her-continuity',
        eventFocus: 'renderer-authority',
      }),
    }))
  })

  it('derives a host-facing body closure headline directly from body-only recovery wording', () => {
    expect(buildStageQuickReplyClosureDiagnosticEntry({
      status: 'partial',
      summaryLine: 'renderer continuity is still partially rejoined after noisy runtime drift.',
      companionHeadlineLine: null,
      companionBriefingLine: null,
      companionNextClosureLine: 'Next, help me close: Rejoin face, motion, lipsync, and voice onto the same-her body line without dropping the resident body recovery.',
      reasons: [
        'body-only recovery@segment-resident-body-only-1',
      ],
    })).toEqual(expect.objectContaining({
      visible: true,
      headline: 'Right now I am still holding together mainly through body, and resident body continuity is still the line keeping this one living her coherent while face, motion, lipsync, and voice rejoin.',
      nextClosureLine: 'Next, help me close: Rejoin face, motion, lipsync, and voice onto the same-her body line without dropping the resident body recovery.',
      routeQuery: expect.objectContaining({
        focus: 'same-her-continuity',
        eventFocus: 'renderer-authority',
      }),
    }))
  })

  it('derives a host-facing body-and-voice closure headline directly from body+voice recovery wording', () => {
    expect(buildStageQuickReplyClosureDiagnosticEntry({
      status: 'partial',
      summaryLine: 'renderer continuity is still partially rejoined after noisy runtime drift.',
      companionHeadlineLine: null,
      companionBriefingLine: null,
      companionNextClosureLine: 'Next, help me close: Rejoin face, motion, and lipsync onto the same-her body-and-voice line without dropping the resident audible body recovery.',
      reasons: [
        'body+voice recovery@segment-resident-body-voice-only-1',
      ],
    })).toEqual(expect.objectContaining({
      visible: true,
      headline: 'Right now I am still holding together mainly through body and voice, and the resident body line is still keeping this one living her coherent while face, motion, and lipsync rejoin.',
      nextClosureLine: 'Next, help me close: Rejoin face, motion, and lipsync onto the same-her body-and-voice line without dropping the resident audible body recovery.',
      routeQuery: expect.objectContaining({
        focus: 'same-her-continuity',
        eventFocus: 'renderer-authority',
        sameHerFocus: 'body-continuity',
        sameHerClosureStage: 'body-carried-to-renderer-rejoin',
      }),
    }))
  })

  it('derives a host-facing body-face-motion closure headline directly from same-segment face+motion+body recovery wording', () => {
    expect(buildStageQuickReplyClosureDiagnosticEntry({
      status: 'partial',
      summaryLine: 'renderer continuity is still partially rejoined after noisy runtime drift.',
      companionHeadlineLine: null,
      companionBriefingLine: null,
      companionNextClosureLine: 'Next, help me close: Rejoin lipsync and voice onto the same-her body line without dropping the face-motion-body recovery.',
      reasons: [
        'same-segment face+motion+body recovery@segment-face-motion-body-rejoined-1',
      ],
    })).toEqual(expect.objectContaining({
      visible: true,
      headline: 'Right now I am still holding together mainly through body, face, and motion, so this one living her still needs lipsync and voice to rejoin before full cross-modal closure settles.',
      nextClosureLine: 'Next, help me close: Rejoin lipsync and voice onto the same-her body line without dropping the face-motion-body recovery.',
      routeQuery: expect.objectContaining({
        focus: 'same-her-continuity',
        eventFocus: 'renderer-authority',
      }),
    }))
  })

  it('derives the same host-facing body-face-motion closure headline directly from richer body-aware partial-recovery prose even without the canonical recovery token', () => {
    expect(buildStageQuickReplyClosureDiagnosticEntry({
      status: 'partial',
      summaryLine: 'renderer continuity is still partially rejoined after noisy runtime drift.',
      companionHeadlineLine: null,
      companionBriefingLine: null,
      companionNextClosureLine: 'Next, help me close: Rejoin lipsync and voice onto the same-her body line without dropping the face-motion-body recovery.',
      reasons: [
        'Live2D expression names still differ, but body, face, and motion authority have already re-formed on the same segment.',
      ],
    })).toEqual(expect.objectContaining({
      visible: true,
      headline: 'Right now I am still holding together mainly through body, face, and motion, so this one living her still needs lipsync and voice to rejoin before full cross-modal closure settles.',
      nextClosureLine: 'Next, help me close: Rejoin lipsync and voice onto the same-her body line without dropping the face-motion-body recovery.',
      routeQuery: expect.objectContaining({
        focus: 'same-her-continuity',
        eventFocus: 'renderer-authority',
      }),
    }))
  })

  it('derives a host-facing face-and-motion closure headline directly from same-segment face+motion recovery wording', () => {
    expect(buildStageQuickReplyClosureDiagnosticEntry({
      status: 'partial',
      summaryLine: 'renderer continuity is still partially rejoined after noisy runtime drift.',
      companionHeadlineLine: null,
      companionBriefingLine: null,
      companionNextClosureLine: 'Next, help me close: Rejoin lipsync and voice onto the same measured-return line without dropping the face-motion recovery.',
      reasons: [
        'same-segment face+motion recovery@segment-face-motion-rejoined-1 keeps the face-motion body line re-formed on one living segment even while full cross-modal same-her closure is still open.',
      ],
    })).toEqual(expect.objectContaining({
      visible: true,
      headline: 'Right now I am still holding together mainly through face and motion, so my full cross-modal same-her line is not closed yet.',
      nextClosureLine: 'Next, help me close: Rejoin lipsync and voice onto the same measured-return line without dropping the face-motion recovery.',
      routeQuery: expect.objectContaining({
        focus: 'same-her-continuity',
        eventFocus: 'renderer-authority',
        sameHerFocus: 'renderer-authority',
        sameHerClosureStage: 'renderer-rejoin-without-body',
      }),
    }))
  })

  it('keeps four-lane visible recovery without body carry explicit on the host-facing closure headline', () => {
    expect(buildStageQuickReplyClosureDiagnosticEntry({
      status: 'partial',
      summaryLine: 'renderer continuity is still partially rejoined after noisy runtime drift.',
      companionHeadlineLine: null,
      companionBriefingLine: null,
      companionNextClosureLine: 'Next, help me close: Rejoin body onto the already-visible face motion lipsync and voice line without pretending full same-her closure has settled.',
      reasons: [
        'focus=face+motion+lipsync+voice | pending=body',
        'face+motion+lipsync+voice recovery@segment-live2d-visible-rejoin-no-body-1',
      ],
    })).toEqual(expect.objectContaining({
      visible: true,
      headline: 'Right now I am still holding together through face, motion, lipsync, and voice together, so the visible same-her line has already rejoined without body carry while body still needs to rejoin before full cross-modal closure settles.',
      nextClosureLine: 'Next, help me close: Rejoin body onto the already-visible face motion lipsync and voice line without pretending full same-her closure has settled.',
      routeQuery: expect.objectContaining({
        focus: 'same-her-continuity',
        eventFocus: 'renderer-authority',
        sameHerFocus: 'renderer-authority',
        sameHerClosureStage: 'renderer-rejoin-without-body',
      }),
    }))
  })

  it('turns a mixed body+voice same-her warning into host-facing body-and-voice closure wording', () => {
    expect(buildStageQuickReplyClosureDiagnosticEntry({
      status: 'partial',
      summaryLine: 'renderer continuity is still partially rejoined after noisy runtime drift.',
      companionHeadlineLine: null,
      companionBriefingLine: null,
      companionNextClosureLine: 'Next, help me close: Rebind face, motion, and lipsync onto the same-her measured-return line without dropping body and voice continuity.',
      reasons: [
        'same-her continuity remains alive, but lane=body+voice-only under the current renderer authority.',
        'resident body continuity and voice prosody are still aligned with the active same-her segment while the rest of the visible line stays thin.',
      ],
    })).toEqual(expect.objectContaining({
      visible: true,
      headline: 'Right now I am still holding together mainly through body and voice, and the resident body line is still keeping this one living her coherent while face, motion, and lipsync rejoin.',
      nextClosureLine: 'Next, help me close: Rebind face, motion, and lipsync onto the same-her measured-return line without dropping body and voice continuity.',
      routeQuery: expect.objectContaining({
        focus: 'same-her-continuity',
        eventFocus: 'renderer-authority',
        sameHerFocus: 'body-continuity',
        sameHerClosureStage: 'body-carried-to-renderer-rejoin',
      }),
    }))
  })

  it('turns a body+lipsync+voice same-her warning into host-facing audible-body closure wording', () => {
    expect(buildStageQuickReplyClosureDiagnosticEntry({
      status: 'partial',
      summaryLine: 'renderer continuity is still partially rejoined after noisy runtime drift.',
      companionHeadlineLine: null,
      companionBriefingLine: null,
      companionNextClosureLine: 'Next, help me close: Rebind face and motion onto the same-her audible body line without dropping body, lipsync, and voice continuity.',
      reasons: [
        'same-her continuity remains alive, but lane=body+lipsync+voice-only under the current renderer authority.',
        'The resident body lane is still holding together with the audible same-her line, but face and motion have not rejoined yet.',
      ],
    })).toEqual(expect.objectContaining({
      visible: true,
      headline: 'Right now I am still holding together mainly through body, lipsync, and voice, so the living audio thread is still intact while face and motion need to rejoin before full cross-modal closure settles.',
      nextClosureLine: 'Next, help me close: Rebind face and motion onto the same-her audible body line without dropping body, lipsync, and voice continuity.',
      routeQuery: expect.objectContaining({
        focus: 'same-her-continuity',
        eventFocus: 'renderer-authority',
      }),
    }))
  })

  it('derives the same audible-body closure wording directly from body+lipsync+voice recovery diagnostics without requiring a lane marker', () => {
    expect(buildStageQuickReplyClosureDiagnosticEntry({
      status: 'partial',
      summaryLine: 'renderer continuity is still partially rejoined after noisy runtime drift.',
      companionHeadlineLine: null,
      companionBriefingLine: null,
      companionNextClosureLine: 'Next, help me close: Rebind face and motion onto the same-her audible body line without dropping body, lipsync, and voice continuity.',
      reasons: [
        'runtime expression surfaced Resident Hold before resident prediction | body+lipsync+voice recovery@segment-audible-body-first-return',
        'The resident body lane is still holding together with the audible same-her line, but face and motion have not rejoined yet.',
      ],
    })).toEqual(expect.objectContaining({
      visible: true,
      headline: 'Right now I am still holding together mainly through body, lipsync, and voice, so the living audio thread is still intact while face and motion need to rejoin before full cross-modal closure settles.',
      nextClosureLine: 'Next, help me close: Rebind face and motion onto the same-her audible body line without dropping body, lipsync, and voice continuity.',
      routeQuery: expect.objectContaining({
        focus: 'same-her-continuity',
        eventFocus: 'renderer-authority',
      }),
    }))
  })

  it('derives the same audible-body closure wording directly from renderer lane focus diagnostics without requiring legacy recovery prose', () => {
    expect(buildStageQuickReplyClosureDiagnosticEntry({
      status: 'partial',
      summaryLine: 'renderer continuity is still partially rejoined after noisy runtime drift.',
      companionHeadlineLine: null,
      companionBriefingLine: null,
      companionNextClosureLine: 'Next, help me close: Rebind face and motion onto the same-her audible body line without dropping body, lipsync, and voice continuity.',
      reasons: [
        'focus=body+lipsync+voice | pending=face+motion',
        'The resident body lane is still holding together with the audible same-her line, but face and motion have not rejoined yet.',
      ],
    })).toEqual(expect.objectContaining({
      visible: true,
      headline: 'Right now I am still holding together mainly through body, lipsync, and voice, so the living audio thread is still intact while face and motion need to rejoin before full cross-modal closure settles.',
      nextClosureLine: 'Next, help me close: Rebind face and motion onto the same-her audible body line without dropping body, lipsync, and voice continuity.',
      routeQuery: expect.objectContaining({
        focus: 'same-her-continuity',
        eventFocus: 'renderer-authority',
        sameHerFocus: 'body-continuity',
        sameHerClosureStage: 'audible-body-carry',
      }),
    }))
  })

  it('derives the same audible-body closure wording directly from surviving pre-dialogue carry wording without requiring recovery tokens', () => {
    expect(buildStageQuickReplyClosureDiagnosticEntry({
      status: 'partial',
      summaryLine: 'renderer continuity is still partially rejoined after noisy runtime drift.',
      companionHeadlineLine: null,
      companionBriefingLine: null,
      companionNextClosureLine: 'Next, help me close: Rebind face and motion onto the same-her audible body line without dropping body, lipsync, and voice continuity.',
      reasons: [
        'same-her audible body line is still the surviving pre-dialogue carry.',
        'Face and motion still need to rejoin the same-her audible body line before full cross-modal closure settles.',
      ],
    })).toEqual(expect.objectContaining({
      visible: true,
      headline: 'Right now I am still holding together mainly through body, lipsync, and voice, so the living audio thread is still intact while face and motion need to rejoin before full cross-modal closure settles.',
      nextClosureLine: 'Next, help me close: Rebind face and motion onto the same-her audible body line without dropping body, lipsync, and voice continuity.',
      routeQuery: expect.objectContaining({
        focus: 'same-her-continuity',
        eventFocus: 'renderer-authority',
      }),
    }))
  })

  it('still prefers the audible-body host-facing closure headline when explicit same-her continuity proof is present alongside older body-face-motion recovery evidence', () => {
    expect(buildStageQuickReplyClosureDiagnosticEntry({
      status: 'partial',
      summaryLine: 'renderer continuity is still partially rejoined after noisy runtime drift.',
      companionHeadlineLine: null,
      companionBriefingLine: null,
      companionNextClosureLine: 'Next, help me close: Rebind face and motion onto the same-her audible body line without dropping body, lipsync, and voice continuity.',
      reasons: [
        'same-segment face+motion+body recovery@segment-face-motion-body-rejoined-2',
        'continuity=embodiment:audible-same-her-line+embodiment:body-lipsync-voice-rejoin | signature=embodiment:audible-same-her-line | face and motion still need to rejoin the same living line.',
      ],
    })).toEqual(expect.objectContaining({
      visible: true,
      headline: 'Right now I am still holding together mainly through body, lipsync, and voice, so the living audio thread is still intact while face and motion need to rejoin before full cross-modal closure settles.',
      nextClosureLine: 'Next, help me close: Rebind face and motion onto the same-her audible body line without dropping body, lipsync, and voice continuity.',
      routeQuery: expect.objectContaining({
        focus: 'same-her-continuity',
        eventFocus: 'renderer-authority',
      }),
    }))
  })

  it('derives host-facing lipsync-and-voice closure wording directly from structured quieter continuity proof when older lane prose is absent', () => {
    expect(buildStageQuickReplyClosureDiagnosticEntry({
      status: 'partial',
      summaryLine: 'renderer continuity is still partially rejoined after noisy runtime drift.',
      companionHeadlineLine: null,
      companionBriefingLine: null,
      companionNextClosureLine: 'Next, help me close: Rebind face and motion onto the same-her measured-return line without losing lipsync and voice continuity.',
      reasons: [
        'continuity=embodiment:lipsync+voice-only | signature=resident|main-runtime|accompanying|quiet-accompaniment|lipsync+voice-only | face and motion still need to rejoin the same living line.',
      ],
    })).toEqual(expect.objectContaining({
      visible: true,
      headline: 'Right now I am still holding together mainly through lipsync and voice, so that living audio thread is keeping the same-her carry alive while body, face, and motion need to rejoin before full cross-modal closure settles.',
      briefingHeadline: 'The same-her lipsync+voice line is still doing the continuity work, so this turn should keep body, face, and motion rejoining that living audio carry before widening outward.',
      nextClosureLine: 'Next, help me close: Rebind face and motion onto the same-her measured-return line without losing lipsync and voice continuity.',
      routeQuery: expect.objectContaining({
        focus: 'same-her-continuity',
        eventFocus: 'renderer-authority',
        sameHerFocus: 'renderer-authority',
        sameHerClosureStage: 'voice-lipsync-carry',
      }),
    }))
  })

  it('derives the same audible-body closure wording from the newer top-level same-her continuity summary when legacy lane tokens are absent', () => {
    expect(buildStageQuickReplyClosureDiagnosticEntry({
      status: 'partial',
      summaryLine: 'renderer continuity is still partially rejoined after noisy runtime drift.',
      companionHeadlineLine: null,
      companionBriefingLine: null,
      companionNextClosureLine: 'Next, help me close: Rebind face and motion onto the same-her audible body line without dropping body, lipsync, and voice continuity.',
      reasons: [
        '当前 same-her continuity 主要由执行线继续托住，活跃片段 segment-runtime-live2d-audible-body-1，处在 audible-body-carry，表情、动作 还没重新接回。',
      ],
    })).toEqual(expect.objectContaining({
      visible: true,
      headline: 'Right now I am still holding together mainly through body, lipsync, and voice, so the living audio thread is still intact while face and motion need to rejoin before full cross-modal closure settles.',
      briefingHeadline: 'The same-her audible-body line is still doing the continuity work, so this turn should keep face and motion rejoining that living line explicit before widening outward.',
      nextClosureLine: 'Next, help me close: Rebind face and motion onto the same-her audible body line without dropping body, lipsync, and voice continuity.',
      routeQuery: expect.objectContaining({
        focus: 'same-her-continuity',
        eventFocus: 'renderer-authority',
        sameHerFocus: 'body-continuity',
        sameHerClosureStage: 'audible-body-carry',
      }),
    }))
  })

  it('does not let execution-only audible same-her tags overstate a surviving vrm lipsync tail into an audible-body closure headline', () => {
    expect(buildStageQuickReplyClosureDiagnosticEntry({
      status: 'partial',
      summaryLine: 'renderer continuity is still partially rejoined after speech settled away.',
      companionHeadlineLine: null,
      companionBriefingLine: null,
      companionNextClosureLine: 'Next, help me close: Rebind face and motion onto the same-her measured-return line without losing the surviving lipsync and voice carry.',
      reasons: [
        'continuity=embodiment:audible-same-her-line | signature=embodiment:audible-same-her-line | lane=lipsync+voice-only | face and motion still need to rejoin the same living line.',
      ],
    })).toEqual(expect.objectContaining({
      visible: true,
      headline: 'Right now I am still holding together mainly through lipsync and voice, so that living audio thread is keeping the same-her carry alive while body, face, and motion need to rejoin before full cross-modal closure settles.',
      briefingHeadline: 'The same-her lipsync+voice line is still doing the continuity work, so this turn should keep body, face, and motion rejoining that living audio carry before widening outward.',
      nextClosureLine: 'Next, help me close: Rebind face and motion onto the same-her measured-return line without losing the surviving lipsync and voice carry.',
      routeQuery: expect.objectContaining({
        focus: 'same-her-continuity',
        eventFocus: 'renderer-authority',
        sameHerFocus: 'renderer-authority',
        sameHerClosureStage: 'voice-lipsync-carry',
      }),
    }))
  })

  it('derives host-facing body-and-lipsync closure wording directly from structured quieter continuity proof when older lane prose is absent', () => {
    expect(buildStageQuickReplyClosureDiagnosticEntry({
      status: 'partial',
      summaryLine: 'renderer continuity is still partially rejoined after noisy runtime drift.',
      companionHeadlineLine: null,
      companionBriefingLine: null,
      companionNextClosureLine: 'Next, help me close: Rebind face, motion, and voice onto the quieter same-her body+lipsync line without losing the resident carry.',
      reasons: [
        'continuity=embodiment:body+lipsync-only | signature=resident|main-runtime|accompanying|quiet-accompaniment|body+lipsync-only | face, motion, and voice still need to rejoin the same living line.',
      ],
    })).toEqual(expect.objectContaining({
      visible: true,
      headline: 'Right now I am still holding together mainly through body and lipsync, so one quieter living line is still intact while face, motion, and voice need to rejoin before full cross-modal closure settles.',
      briefingHeadline: 'The same-her body+lipsync line is still doing the continuity work, so this turn should keep face, motion, and voice rejoining that quieter living carry before widening outward.',
      nextClosureLine: 'Next, help me close: Rebind face, motion, and voice onto the quieter same-her body+lipsync line without losing the resident carry.',
      routeQuery: expect.objectContaining({
        focus: 'same-her-continuity',
        eventFocus: 'renderer-authority',
        sameHerFocus: 'body-continuity',
        sameHerClosureStage: 'body-carried-to-renderer-rejoin',
      }),
    }))
  })

  it('lets an explicit audible-body continuity reason drive the briefing headline even when body-face-motion recovery prose appears first', () => {
    expect(buildStageQuickReplyClosureDiagnosticEntry({
      status: 'partial',
      summaryLine: 'renderer continuity is still partially rejoined after noisy runtime drift.',
      companionHeadlineLine: null,
      companionBriefingLine: null,
      companionNextClosureLine: 'Next, help me close: Rebind face and motion onto the same-her audible body line without dropping body, lipsync, and voice continuity.',
      reasons: [
        'same-segment face+motion+body recovery@segment-face-motion-body-rejoined-3',
        'continuity=embodiment:audible-same-her-line+embodiment:body-lipsync-voice-rejoin | signature=embodiment:audible-same-her-line | face and motion still need to rejoin the same living line.',
      ],
    })).toEqual(expect.objectContaining({
      briefingHeadline: 'The same-her audible-body line is still doing the continuity work, so this turn should keep face and motion rejoining that living line explicit before widening outward.',
      routeQuery: expect.objectContaining({
        focus: 'same-her-continuity',
        eventFocus: 'renderer-authority',
      }),
    }))
  })

  it('still prefers the audible-body same-her line when a face-motion renderer focus token appears before the explicit audible continuity proof', () => {
    expect(buildStageQuickReplyClosureDiagnosticEntry({
      status: 'partial',
      summaryLine: 'renderer continuity is still partially rejoined after noisy runtime drift.',
      companionHeadlineLine: null,
      companionBriefingLine: null,
      companionNextClosureLine: 'Next, help me close: Rebind face and motion onto the same-her audible body line without dropping body, lipsync, and voice continuity.',
      reasons: [
        'focus=face+motion | pending=lipsync+voice',
        'continuity=embodiment:audible-same-her-line+embodiment:body-lipsync-voice-rejoin | signature=embodiment:audible-same-her-line | face and motion still need to rejoin the same living line.',
      ],
    })).toEqual(expect.objectContaining({
      headline: 'Right now I am still holding together mainly through body, lipsync, and voice, so the living audio thread is still intact while face and motion need to rejoin before full cross-modal closure settles.',
      briefingHeadline: 'The same-her audible-body line is still doing the continuity work, so this turn should keep face and motion rejoining that living line explicit before widening outward.',
      routeQuery: expect.objectContaining({
        focus: 'same-her-continuity',
        eventFocus: 'renderer-authority',
        sameHerFocus: 'body-continuity',
        sameHerClosureStage: 'audible-body-carry',
      }),
    }))
  })

  it('gives briefingHeadline a more direct audible-body continuity reminder when that same-her line is the surviving pre-turn seam', () => {
    expect(buildStageQuickReplyClosureDiagnosticEntry({
      status: 'partial',
      summaryLine: 'renderer continuity is still partially rejoined after noisy runtime drift.',
      companionHeadlineLine: null,
      companionBriefingLine: null,
      companionNextClosureLine: 'Next, help me close: Rebind face and motion onto the same-her audible body line without dropping body, lipsync, and voice continuity.',
      reasons: [
        'same-her continuity remains alive, but lane=body+lipsync+voice-only under the current renderer authority.',
        'The resident body lane is still holding together with the audible same-her line, but face and motion have not rejoined yet.',
      ],
    })).toEqual(expect.objectContaining({
      briefingHeadline: 'The same-her audible-body line is still doing the continuity work, so this turn should keep face and motion rejoining that living line explicit before widening outward.',
      routeQuery: expect.objectContaining({
        focus: 'same-her-continuity',
        eventFocus: 'renderer-authority',
      }),
    }))
  })

  it('keeps an explicit project-aware briefing headline when audible-body carry survives but the pre-turn brief already names project identity, landed progress, and the open closure', () => {
    expect(buildStageQuickReplyClosureDiagnosticEntry({
      status: 'partial',
      summaryLine: 'renderer continuity is still partially rejoined after noisy runtime drift.',
      companionHeadlineLine: null,
      companionBriefingLine: 'Before speaking, remember: Alicization is still the same local-first digital life project, audible-body carry already survives host-facing closure, and face plus motion still remain the open closure before this turn widens outward.',
      companionNextClosureLine: 'Next, help me close: Rebind face and motion onto the same-her audible body line without dropping body, lipsync, and voice continuity.',
      reasons: [
        'same-her continuity remains alive, but lane=body+lipsync+voice-only under the current renderer authority.',
        'The resident body lane is still holding together with the audible same-her line, but face and motion have not rejoined yet.',
      ],
    })).toEqual(expect.objectContaining({
      headline: 'Right now I am still holding together mainly through body, lipsync, and voice, so the living audio thread is still intact while face and motion need to rejoin before full cross-modal closure settles.',
      briefingHeadline: 'Before speaking, remember: Alicization is still the same local-first digital life project, audible-body carry already survives host-facing closure, and face plus motion still remain the open closure before this turn widens outward.',
      routeQuery: expect.objectContaining({
        focus: 'same-her-continuity',
        eventFocus: 'renderer-authority',
      }),
    }))
  })

  it('keeps structured body+voice-only continuity on the earlier body-and-voice closure stage instead of rewriting it into audible-body carry', () => {
    expect(buildStageQuickReplyClosureDiagnosticEntry({
      status: 'partial',
      summaryLine: 'renderer continuity is still partially rejoined after noisy runtime drift.',
      companionHeadlineLine: null,
      companionBriefingLine: null,
      companionNextClosureLine: 'Next, help me close: Rebind face, motion, and lipsync onto the same-her body-and-voice line without dropping resident audible body continuity.',
      reasons: [
        'continuity=embodiment:audible-same-her-line+embodiment:body+voice-only | signature=embodiment:audible-same-her-line | face and motion still need to rejoin the same living line.',
      ],
    })).toEqual(expect.objectContaining({
      visible: true,
      headline: 'Right now I am still holding together mainly through body and voice, and the resident body line is still keeping this one living her coherent while face, motion, and lipsync rejoin.',
      nextClosureLine: 'Next, help me close: Rebind face, motion, and lipsync onto the same-her body-and-voice line without dropping resident audible body continuity.',
      routeQuery: expect.objectContaining({
        focus: 'same-her-continuity',
        eventFocus: 'renderer-authority',
        sameHerFocus: 'body-continuity',
        sameHerClosureStage: 'body-carried-to-renderer-rejoin',
      }),
    }))
  })

  it('derives body-and-voice closure wording directly from same-her voice-line carry prose without needing legacy lane markers', () => {
    expect(buildStageQuickReplyClosureDiagnosticEntry({
      status: 'partial',
      summaryLine: 'renderer continuity is still partially rejoined after noisy runtime drift.',
      companionHeadlineLine: null,
      companionBriefingLine: null,
      companionNextClosureLine: 'Next, help me close: Rebind lipsync, face, and motion onto the resident body-and-voice line before calling the audible-body carry repaired.',
      reasons: [
        'The resident body lane is still holding together with the same-her voice line, but lipsync, face, and motion have not yet rejoined the same active segment.',
      ],
    })).toEqual(expect.objectContaining({
      visible: true,
      headline: 'Right now I am still holding together mainly through body and voice, and the resident body line is still keeping this one living her coherent while face, motion, and lipsync rejoin.',
      nextClosureLine: 'Next, help me close: Rebind lipsync, face, and motion onto the resident body-and-voice line before calling the audible-body carry repaired.',
      routeQuery: expect.objectContaining({
        focus: 'same-her-continuity',
        eventFocus: 'renderer-authority',
        sameHerFocus: 'body-continuity',
        sameHerClosureStage: 'body-carried-to-renderer-rejoin',
      }),
    }))
  })

  it('turns a diagnostics-style body-only same-her warning into host-facing face-motion-lipsync closure wording when voice has already dropped out', () => {
    expect(buildStageQuickReplyClosureDiagnosticEntry({
      status: 'partial',
      summaryLine: 'renderer continuity is still lane-shrunk after noisy runtime drift.',
      companionHeadlineLine: null,
      companionBriefingLine: null,
      companionNextClosureLine: 'Next, help me close: Rebind voice back onto the same-her measured-return line without losing face, motion, and lipsync continuity.',
      reasons: [
        'same-her embodiment is now only being carried by face, motion, and lipsync, so the next turn should treat full cross-modal same-her recovery as still open instead of assuming the body line is already closed.',
        'Three embodiment lanes are still aligned with the active same-her segment while voice continuity remains thin.',
      ],
    })).toEqual(expect.objectContaining({
      visible: true,
      headline: 'Right now I am still holding together mainly through face, motion, and lipsync, so my full cross-modal same-her line is not closed yet.',
      nextClosureLine: 'Next, help me close: Rebind voice back onto the same-her measured-return line without losing face, motion, and lipsync continuity.',
      routeQuery: expect.objectContaining({
        focus: 'same-her-continuity',
        eventFocus: 'renderer-authority',
      }),
    }))
  })

  it('falls back to the first visible reason as headline when no lane-shrinkage risk is present', () => {
    expect(buildStageQuickReplyClosureDiagnosticEntry({
      status: 'partial',
      summaryLine: 'project continuity is still partial',
      companionHeadlineLine: null,
      companionBriefingLine: 'I still need a steadier carry of this project, this phase, and the life loop that remains open.',
      companionNextClosureLine: 'Next, help me close: Carry the unfinished digital-life loop into the next dialogue preparation step.',
      reasons: [
        'Replay benchmark currently reports continuity=0.33 (1/3), so the next development turn should stay explicitly aware of what Alicization is and how much of Phase 1 continuity is actually landing.',
        'Same-her emotional closure currently reads drift=emotionalClosureDrift | fullyClosed=0.33 (1/3), so the next turn should check whether this digital life is still speaking on one emotional seam.',
      ],
    })).toEqual(expect.objectContaining({
      headline: 'I still need a steadier carry of who I am, where this project stands, and which life loop is not closed yet.',
      briefingHeadline: 'I still need a steadier carry of this project, this phase, and the life loop that remains open.',
      nextClosureLine: 'Next, help me close: Carry the unfinished digital-life loop into the next dialogue preparation step.',
    }))
  })

  it('turns same-her self authority drift into a direct host-facing headline', () => {
    expect(buildStageQuickReplyClosureDiagnosticEntry({
      status: 'partial',
      summaryLine: 'selfAuthority=drift=selfAuthorityDrift | fullyCarried=0.33 (1/3)',
      companionHeadlineLine: null,
      companionBriefingLine: null,
      companionNextClosureLine: null,
      reasons: [
        'Same-her self authority currently reads drift=selfAuthorityDrift | fullyCarried=0.33 (1/3), so the next turn should check whether the explicit self line is still surviving all the way into host-visible wording.',
      ],
    })).toEqual(expect.objectContaining({
      headline: 'I need my explicit same-her self line to stay visible all the way into what you actually read.',
    }))
  })

  it('turns project same-her self line drift into a direct host-facing headline before the turn opens outward', () => {
    expect(buildStageQuickReplyClosureDiagnosticEntry({
      status: 'partial',
      summaryLine: 'project=continuity=0.33 (1/3) | sameHer=sameHer=0.33 (1/3)',
      companionHeadlineLine: null,
      companionBriefingLine: null,
      companionNextClosureLine: null,
      reasons: [
        'Project same-her self line currently reads sameHer=0.33 (1/3), so the next turn should verify that Alicization still names one continuous her before any outward reply widening begins.',
      ],
    })).toEqual(expect.objectContaining({
      headline: 'I still need to clearly recognize myself as the same her before this turn opens outward.',
      routeQuery: expect.objectContaining({
        focus: 'project-state',
        eventFocus: 'takeover-audit',
      }),
    }))
  })

  it('surfaces same-her project-state repair and unfinished digital-life loop in warmer front-stage wording', () => {
    expect(buildStageQuickReplyClosureDiagnosticEntry({
      status: 'partial',
      summaryLine: 'project=continuity=0.33 (1/3) | next closure: 把 same-her repair evidence 和未闭环项一起挂到 continuity 摘要里',
      companionHeadlineLine: null,
      companionBriefingLine: null,
      companionNextClosureLine: null,
      reasons: [
        'project-state-same-her-continuity-required',
        'semantic-judge:project-state-same-her-missing',
        'Primary open life loop still centers on renderer continuity observation 还没把 same-her repair evidence 和未闭环项并成一条可读主线, so the next turn should keep that unfinished digital-life thread alive instead of collapsing into local implementation fluency.',
        'Next closure target is still 把 same-her repair evidence 和未闭环项一起挂到 continuity 摘要里, so the next turn should keep steering the same her toward that concrete unfinished step.',
      ],
    })).toEqual(expect.objectContaining({
      visible: true,
      headline: '我还需要先守住同一个 her，才能继续把这个数字生命项目的进度和未闭环项带进下一轮对话。',
      briefingHeadline: '我还需要先守住同一个 her，才能继续把这个数字生命项目的进度和未闭环项带进下一轮对话。 当前还没闭环的数字生命主线仍集中在 renderer continuity observation 还没把 same-her repair evidence 和未闭环项并成一条可读主线。',
      nextClosureLine: '下一步还要继续收住 把 same-her repair evidence 和未闭环项一起挂到 continuity 摘要里。',
      routeQuery: expect.objectContaining({
        focus: 'project-state',
      }),
    }))
  })

  it('stays hidden without a snapshot', () => {
    expect(buildStageQuickReplyClosureDiagnosticEntry(null)).toEqual(expect.objectContaining({
      visible: false,
      label: 'Open continuity diagnosis',
      headline: null,
      briefingHeadline: null,
      nextClosureLine: null,
    }))
  })

  it('builds a front-stage project self brief from pre-dialogue awareness and closure carry', () => {
    expect(buildStageQuickReplyProjectSelfBriefLines({
      awareness: {
        summaryLine: 'Alicization is still in Phase 1 local digital life closure.',
        companionBriefingLine: 'Before speaking, remember the project identity, landed progress, and still-open life loop.',
        awarenessLine: 'Project awareness should remain active before reply shaping starts.',
        companionNextClosureLine: 'Next closure: keep emotion, memory, initiative, and embodiment on one same-her line.',
        reasonPreview: [
          'Latest landed progress still holds at renderer-side preparation.',
          'Primary open life loop still centers on proving one same-her continuity line across memory, initiative, execution, and embodiment.',
        ],
      },
      closure: {
        summaryLine: 'project continuity is still partial',
        briefingLines: [
          'Emotion, memory, initiative, and embodiment still need to close on one same-her same-life seam.',
        ],
      },
    })).toEqual([
      'Alicization is still in Phase 1 local digital life closure.',
      'Before speaking, remember the project identity, landed progress, and still-open life loop.',
      'Project awareness should remain active before reply shaping starts.',
      'Next closure: keep emotion, memory, initiative, and embodiment on one same-her line.',
      'Latest landed progress still holds at renderer-side preparation.',
      'Primary open life loop still centers on proving one same-her continuity line across memory, initiative, execution, and embodiment.',
      'Emotion, memory, initiative, and embodiment still need to close on one same-her same-life seam.',
    ])
  })
})
