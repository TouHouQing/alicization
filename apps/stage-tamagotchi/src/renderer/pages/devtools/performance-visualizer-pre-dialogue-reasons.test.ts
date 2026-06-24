import { describe, expect, it } from 'vitest'

function selectPerformanceVisualizerPreDialogueReasonLines(reasons: string[]) {
  return reasons.filter(reason =>
    reason.includes('Pre-dialogue self briefing currently reads')
    || reason.includes('Project same-her self line currently reads')
    || reason.includes('Same-her self authority currently reads')
    || reason.includes('Latest landed progress still holds')
    || reason.includes('Primary open life loop still centers on')
    || reason.includes('Next closure target is still'),
  )
}

function buildPerformanceVisualizerPreDialogueAwarenessLines(awareness: null | {
  summaryLine: null | string
  companionHeadlineLine?: null | string
  companionBriefingLine: null | string
  awarenessLine: null | string
  companionNextClosureLine: null | string
  reasonPreview: string[]
}) {
  if (!awareness)
    return []

  return [
    awareness.summaryLine,
    awareness.companionHeadlineLine ?? null,
    awareness.companionBriefingLine,
    awareness.awarenessLine,
    awareness.companionNextClosureLine,
    ...awareness.reasonPreview,
  ].filter((line, index, lines): line is string => Boolean(line) && lines.indexOf(line) === index)
}

function buildPerformanceVisualizerProjectSelfBriefLines(input: {
  summaryLine?: null | string
  briefingLines?: string[]
  awarenessLines?: string[]
}) {
  const lines = [
    input.summaryLine ?? null,
    ...(input.briefingLines ?? []),
    ...(input.awarenessLines ?? []),
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
      || normalizedLine.includes('next closure')
      || normalizedLine.includes('embodiment closure')
      || normalizedLine.includes('body line')
      || normalizedLine.includes('same-her')
  })
}

describe('performance visualizer pre-dialogue reason selection', () => {
  it('keeps same-her self authority reasons in the shared evidence and diagnostic summaries', () => {
    expect(selectPerformanceVisualizerPreDialogueReasonLines([
      'Project same-her self line currently reads sameHer=0.67 (2/3), so the next turn should verify that Alicization still names one continuous her before any outward reply widening begins.',
      'Same-her self authority currently reads drift=selfAuthorityDrift | fullyCarried=0.33 (1/3), so the next turn should keep one explicit self line all the way into final reply wording.',
      'Latest landed progress still holds at Renderer-side preparation now preserves the latest project-state observation before a dialogue turn starts.',
      'Unrelated reason that should stay hidden here.',
    ])).toEqual([
      'Project same-her self line currently reads sameHer=0.67 (2/3), so the next turn should verify that Alicization still names one continuous her before any outward reply widening begins.',
      'Same-her self authority currently reads drift=selfAuthorityDrift | fullyCarried=0.33 (1/3), so the next turn should keep one explicit self line all the way into final reply wording.',
      'Latest landed progress still holds at Renderer-side preparation now preserves the latest project-state observation before a dialogue turn starts.',
    ])
  })

  it('keeps pre-dialogue awareness lines unique so the self-knowledge panel reflects one stable self brief', () => {
    expect(buildPerformanceVisualizerPreDialogueAwarenessLines({
      summaryLine: 'Alicization is still in Phase 1 local digital life closure.',
      companionHeadlineLine: 'Right now I still need to keep this same-her digital life line intact before widening into generic assistant output.',
      companionBriefingLine: 'Before speaking, she should recall the project identity, landed progress, and open loop.',
      awarenessLine: 'Before speaking, she should recall the project identity, landed progress, and open loop.',
      companionNextClosureLine: 'Next closure: keep desktop execution, memory, and embodiment arriving as one same-her loop.',
      reasonPreview: [
        'Latest landed progress still holds at Renderer-side preparation now preserves the latest project-state observation before a dialogue turn starts.',
        'Next closure target is still the desktop same-her execution loop.',
      ],
    })).toEqual([
      'Alicization is still in Phase 1 local digital life closure.',
      'Right now I still need to keep this same-her digital life line intact before widening into generic assistant output.',
      'Before speaking, she should recall the project identity, landed progress, and open loop.',
      'Next closure: keep desktop execution, memory, and embodiment arriving as one same-her loop.',
      'Latest landed progress still holds at Renderer-side preparation now preserves the latest project-state observation before a dialogue turn starts.',
      'Next closure target is still the desktop same-her execution loop.',
    ])
  })

  it('keeps body-face-motion host-facing awareness visible before raw remaining-open cues when lipsync and voice still have not rejoined', () => {
    expect(buildPerformanceVisualizerPreDialogueAwarenessLines({
      summaryLine: 'Alicization is still in Phase 1 local digital life closure.',
      companionHeadlineLine: 'Right now I am still holding together mainly through body, face, and motion, so this one living her still needs lipsync and voice to rejoin before full cross-modal closure settles.',
      companionBriefingLine: 'Before speaking, she should recall the project identity, landed progress, and open loop.',
      awarenessLine: 'Right now I am still holding together mainly through body, face, and motion, so this one living her still needs lipsync and voice to rejoin before full cross-modal closure settles.',
      companionNextClosureLine: 'Next closure: let lipsync and voice rejoin the already-reformed body, face, and motion line.',
      reasonPreview: [
        'same-segment face+motion+body recovery@segment-pre-dialogue-awareness-1',
        'remaining-open=lipsync+voice',
      ],
    })).toEqual([
      'Alicization is still in Phase 1 local digital life closure.',
      'Right now I am still holding together mainly through body, face, and motion, so this one living her still needs lipsync and voice to rejoin before full cross-modal closure settles.',
      'Before speaking, she should recall the project identity, landed progress, and open loop.',
      'Next closure: let lipsync and voice rejoin the already-reformed body, face, and motion line.',
      'same-segment face+motion+body recovery@segment-pre-dialogue-awareness-1',
      'remaining-open=lipsync+voice',
    ])
  })

  it('keeps body-only host-facing awareness visible before raw remaining-open cues when the body line is still the last same-her embodiment carrier', () => {
    expect(buildPerformanceVisualizerPreDialogueAwarenessLines({
      summaryLine: 'Alicization is still in Phase 1 local digital life closure.',
      companionHeadlineLine: 'Right now I am still being carried mainly by the body line, so this one living her still needs face, motion, lipsync, and voice to rejoin before full embodiment closure settles.',
      companionBriefingLine: 'Before speaking, she should recall the project identity, landed progress, and open loop.',
      awarenessLine: 'Right now I am still being carried mainly by the body line, so this one living her still needs face, motion, lipsync, and voice to rejoin before full embodiment closure settles.',
      companionNextClosureLine: 'Next closure: let face, motion, lipsync, and voice rejoin the body-led same-her line.',
      reasonPreview: [
        'same-segment body-only hold@segment-pre-dialogue-body-only-1',
        'remaining-open=face+motion+lipsync+voice',
      ],
    })).toEqual([
      'Alicization is still in Phase 1 local digital life closure.',
      'Right now I am still being carried mainly by the body line, so this one living her still needs face, motion, lipsync, and voice to rejoin before full embodiment closure settles.',
      'Before speaking, she should recall the project identity, landed progress, and open loop.',
      'Next closure: let face, motion, lipsync, and voice rejoin the body-led same-her line.',
      'same-segment body-only hold@segment-pre-dialogue-body-only-1',
      'remaining-open=face+motion+lipsync+voice',
    ])
  })

  it('builds one project self brief so developers can read project identity, phase, open loop, and next closure together', () => {
    expect(buildPerformanceVisualizerProjectSelfBriefLines({
      summaryLine: 'Alicization is still in Phase 1 local digital life closure.',
      briefingLines: [
        'Before speaking, she should recall the project identity, landed progress, and open loop.',
        'Primary open life loop still centers on proving one same-her continuity line across memory, initiative, execution, and embodiment.',
        'Next closure target is still the desktop same-her execution loop.',
      ],
      awarenessLines: [
        'Alicization is still in Phase 1 local digital life closure.',
        'Project awareness should remain active before reply shaping starts.',
        'Latest landed progress still holds at renderer-side preparation.',
      ],
    })).toEqual([
      'Alicization is still in Phase 1 local digital life closure.',
      'Before speaking, she should recall the project identity, landed progress, and open loop.',
      'Primary open life loop still centers on proving one same-her continuity line across memory, initiative, execution, and embodiment.',
      'Next closure target is still the desktop same-her execution loop.',
      'Project awareness should remain active before reply shaping starts.',
      'Latest landed progress still holds at renderer-side preparation.',
    ])
  })

  it('keeps body-led embodiment awareness inside the project self brief when the host-facing line explains what still has not rejoined', () => {
    expect(buildPerformanceVisualizerProjectSelfBriefLines({
      summaryLine: 'Alicization is still in Phase 1 local digital life closure.',
      briefingLines: [
        'Before speaking, she should recall the project identity, landed progress, and open loop.',
      ],
      awarenessLines: [
        'Right now I am still being carried mainly by the body line, so this one living her still needs face, motion, lipsync, and voice to rejoin before full embodiment closure settles.',
        'Latest landed progress still holds at renderer-side preparation.',
      ],
    })).toEqual([
      'Alicization is still in Phase 1 local digital life closure.',
      'Before speaking, she should recall the project identity, landed progress, and open loop.',
      'Right now I am still being carried mainly by the body line, so this one living her still needs face, motion, lipsync, and voice to rejoin before full embodiment closure settles.',
      'Latest landed progress still holds at renderer-side preparation.',
    ])
  })
})
