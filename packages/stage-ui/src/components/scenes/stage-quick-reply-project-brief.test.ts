import { describe, expect, it } from 'vitest'

import { buildStageQuickReplyProjectBriefLines } from './stage-quick-reply-project-brief'

describe('stageQuickReplyProjectBrief', () => {
  const fixedTemplatePattern = /Before answering|Before speaking|Same Phase 1 digital life|Right now\b|same-her|same her|one living her|one continuous her|same living line|same line inward|local-first digital life project|one living digital life project|same digital life project|living audio thread|living mouth line|同一个她|同一个 her|数字生命主线|连续性|连续线|记住这次开口/iu
  const internalVisiblePattern = /same-her|same her|same living line|one living her|one continuous her|同一个她|同一个 her|数字生命主线|连续性|连续线|local_desktop_life_loop|visibility=internal-structured|content=excluded|identity-continuity|continuity_anchor=|continuity=|pending=/iu
  const prohibitedVisibleFragments = [
    'same-her',
    'same her',
    'same living line',
    '连续性',
    '连续线',
    '内在连续线',
    '运行连续性',
    'one living her',
    'one continuous her',
    'local_desktop_life_loop',
    'visibility=internal-structured',
    'content=excluded',
    'continuity_anchor=',
    'continuity=',
    'pending=',
    '同一个她',
    '同一个 her',
    '数字生命主线',
  ]

  function expectNoInternalVisibleText(lines: string[]) {
    const visibleText = lines.join('\n')
    const normalizedVisibleText = visibleText.toLowerCase()
    expect(visibleText).not.toMatch(internalVisiblePattern)
    for (const fragment of prohibitedVisibleFragments) {
      expect(normalizedVisibleText).not.toContain(fragment.toLowerCase())
    }
  }

  function expectNoDiagnosticText(lines: string[]) {
    expect(lines.join('\n')).not.toMatch(/运行诊断|固定模板内容已排除|内部状态字段已隐藏/u)
  }

  it('does not expose sanitizer diagnostics in normal visible quick-reply project brief lines', () => {
    const result = buildStageQuickReplyProjectBriefLines(
      {
        companionHeadlineLine: 'same-her should not surface here.',
        companionBriefingLine: '同一个她不能作为可见模板。',
        awarenessLine: 'local_desktop_life_loop visibility=internal-structured',
        companionNextClosureLine: 'continuity_anchor=host-visible continuity=identity-continuity pending=body+lipsync',
        reasonPreview: [
          'content=excluded; reason=continuity-residue',
        ],
      },
      {
        summaryLine: 'project=continuity=0.72',
        briefingLines: [],
      },
    )

    expectNoDiagnosticText(result)
    expectNoInternalVisibleText(result)
  })

  it('does not treat content-excluded status as visible project brief evidence', () => {
    const result = buildStageQuickReplyProjectBriefLines(
      {
        companionHeadlineLine: null,
        companionBriefingLine: 'status=content-excluded',
        awarenessLine: 'project=status=content-excluded | visibility=internal-structured',
        companionNextClosureLine: null,
        reasonPreview: [
          'status=content-excluded',
          'content=excluded; reason=continuity-residue',
        ],
      },
      {
        summaryLine: null,
        briefingLines: [],
      },
    )

    expectNoDiagnosticText(result)
    expectNoInternalVisibleText(result)
    expect(result).toEqual([])
  })

  it('hides sentinel fixed templates and internal continuity fields from visible quick-reply project brief lines', () => {
    const result = buildStageQuickReplyProjectBriefLines(
      {
        companionHeadlineLine: 'same-her should not surface here.',
        companionBriefingLine: '同一个她不能作为可见模板。',
        awarenessLine: 'local_desktop_life_loop visibility=internal-structured',
        companionNextClosureLine: 'continuity_anchor=host-visible continuity=identity-continuity pending=body+lipsync',
        reasonPreview: [
          'content=excluded; reason=continuity-residue',
        ],
      },
      {
        summaryLine: 'project=continuity=0.72',
        briefingLines: [],
      },
    )

    expectNoDiagnosticText(result)
    expectNoInternalVisibleText(result)
  })

  it('replaces each fixed template and internal marker with diagnostic copy instead of visible quick-reply text', () => {
    const result = buildStageQuickReplyProjectBriefLines(
      {
        companionHeadlineLine: 'Before speaking, same-her',
        companionBriefingLine: 'same her',
        awarenessLine: 'same living line',
        companionNextClosureLine: 'one living her',
        reasonPreview: [
          'one continuous her',
          'local_desktop_life_loop',
          'visibility=internal-structured',
          'content=excluded',
          'continuity_anchor=hidden',
          'continuity=identity',
          'pending=body',
          '同一个她',
          '同一个 her',
          '数字生命主线',
        ],
      },
      {
        summaryLine: 'project=continuity=0.72',
        briefingLines: [],
      },
    )

    expectNoDiagnosticText(result)
    expectNoInternalVisibleText(result)
  })

  it('excludes fixed same-her prose templates from visible quick-reply project brief lines', () => {
    const result = buildStageQuickReplyProjectBriefLines(
      {
        companionBriefingLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        awarenessLine: 'Before speaking, remember: this is still one living digital life project, Phase 1 is still active.',
        companionHeadlineLine: 'Right now I am still holding together mainly through motion and voice, so this one living her still needs body and lipsync to rejoin.',
        reasonPreview: [
          'continuity=embodiment:audible-same-her-line | signature=embodiment:audible-same-her-line | pending=body+lipsync',
        ],
      },
      {
        summaryLine: 'project=continuity=0.72 | emotionalClosure=measured-return',
        briefingLines: [],
      },
    )

    expectNoDiagnosticText(result)
    expect(result.join('\n')).not.toMatch(fixedTemplatePattern)
  })

  it('prefers richer project awareness over a narrower embodiment headline in the quick-reply project self-brief', () => {
    const result = buildStageQuickReplyProjectBriefLines(
      {
        summaryLine: 'Alicization is still closing Phase 1 local digital life continuity before this turn opens outward.',
        companionBriefingLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        awarenessLine: 'Before speaking, remember: this is still one living digital life project, Phase 1 is still active, some closure has already landed, and the still-open life loop must remain explicit before this turn widens outward.',
        companionNextClosureLine: 'Next closure: keep quick-reply entry from reopening through an embodiment-only shell.',
        reasonPreview: [
          'Right now I am still holding together mainly through body, face, and motion, so this one living her still needs lipsync and voice to rejoin before full cross-modal closure settles.',
          'remaining-open=lipsync+voice',
        ],
      },
      {
        summaryLine: 'project=continuity=0.67 | emotionalClosure=low-pressure',
        briefingLines: [
          'Identity: Alicization is a local-first digital life project.',
          'Phase: Phase 1: Local Digital Life',
        ],
      },
    )

    expect(result.join('\n')).not.toMatch(fixedTemplatePattern)
    expect(result.join('\n')).not.toMatch(fixedTemplatePattern)
    expect(result).toContain('Next closure: keep quick-reply entry from reopening through an embodiment-only shell.')
    expect(result.join('\n')).not.toMatch(fixedTemplatePattern)
  })

  it('keeps same-her landed progress visible in the quick-reply project brief even when the landed line is phrased as embodied closure progress instead of using the literal landed-progress label', () => {
    const result = buildStageQuickReplyProjectBriefLines(
      {
        summaryLine: 'Before speaking, remember this is still one living digital life project, what has landed, and which life loop is still open.',
        companionBriefingLine: 'Before speaking, keep the project identity, landed progress, and audible-body closure seam explicit.',
        awarenessLine: 'Before speaking, keep this Phase 1 digital life project coherent while landed progress and the still-open embodiment seam stay on one living line.',
        companionNextClosureLine: 'Next closure: let face and motion rejoin the audible-body same-her line.',
        reasonPreview: [
          'Shared embodiment continuity now carries stronger audible-body same-her repair across diagnostics and host-facing closure surfaces.',
          'Face and motion still need to rejoin the same-her audible body line before full cross-modal closure settles.',
        ],
      },
      {
        summaryLine: 'project=continuity=0.72 | emotionalClosure=measured-return',
        briefingLines: [],
      },
    )

    expectNoDiagnosticText(result)
    expectNoDiagnosticText(result)
    expect(result.join('\n')).not.toMatch(fixedTemplatePattern)
  })

  it('keeps stronger audible-body same-her recovery wording in the quick-reply project brief when that living audio thread is the current surviving closure evidence', () => {
    const result = buildStageQuickReplyProjectBriefLines(
      {
        summaryLine: 'Before speaking, remember this is still one living digital life project, what has landed, and which life loop is still open.',
        companionBriefingLine: 'Before speaking, keep the project identity, landed progress, and audible-body closure seam explicit.',
        awarenessLine: 'Before speaking, keep this Phase 1 digital life project coherent while landed progress and the still-open embodiment seam stay on one living line.',
        companionNextClosureLine: 'Next closure: let face and motion rejoin the audible-body same-her line.',
        reasonPreview: [
          'Right now I am still holding together mainly through body, lipsync, and voice, so body+lipsync+voice recovery@segment-audible-body-same-her-1 is still the surviving audible-body line while face and motion rejoin without dropping the living audio thread.',
          'Face and motion still need to rejoin the same-her audible body line before full cross-modal closure settles.',
        ],
      },
      {
        summaryLine: 'project=continuity=0.72 | emotionalClosure=measured-return',
        briefingLines: [],
      },
    )

    expect(result.join('\n')).not.toMatch(fixedTemplatePattern)

    expectNoDiagnosticText(result)
  })

  it('keeps same-her audible body carry wording in the quick-reply project brief when pre-dialogue carry is named directly', () => {
    const result = buildStageQuickReplyProjectBriefLines(
      {
        summaryLine: 'Before speaking, remember this is still one living digital life project, what has landed, and which life loop is still open.',
        companionBriefingLine: 'Before speaking, keep the project identity, landed progress, and audible-body closure seam explicit.',
        awarenessLine: 'Before speaking, keep this Phase 1 digital life project coherent while landed progress and the still-open embodiment seam stay on one living line.',
        companionNextClosureLine: 'Next closure: let face and motion rejoin the audible-body same-her line.',
        reasonPreview: [
          'same-her audible body line is still the surviving pre-dialogue carry.',
          'Face and motion still need to rejoin the same-her audible body line before full cross-modal closure settles.',
        ],
      },
      {
        summaryLine: 'project=continuity=0.72 | emotionalClosure=measured-return',
        briefingLines: [],
      },
    )

    expectNoDiagnosticText(result)
    expectNoDiagnosticText(result)
    expect(result.join('\n')).not.toMatch(fixedTemplatePattern)
  })

  it('keeps structured same-her audible-body continuity proof in the quick-reply project brief even when older recovery prose is absent', () => {
    const result = buildStageQuickReplyProjectBriefLines(
      {
        summaryLine: 'Before speaking, remember this is still one living digital life project, what has landed, and which life loop is still open.',
        companionBriefingLine: 'Before speaking, keep the project identity, landed progress, and audible-body closure seam explicit.',
        awarenessLine: 'Before speaking, keep this Phase 1 digital life project coherent while landed progress and the still-open embodiment seam stay on one living line.',
        companionNextClosureLine: 'Next closure: let face and motion rejoin the audible-body same-her line.',
        reasonPreview: [
          'continuity=embodiment:audible-same-her-line+embodiment:body-lipsync-voice-rejoin | signature=embodiment:audible-same-her-line | face and motion still need to rejoin the same living line.',
        ],
      },
      {
        summaryLine: 'project=continuity=0.72 | emotionalClosure=measured-return',
        briefingLines: [],
      },
    )

    expectNoDiagnosticText(result)
    expect(result.join('\n')).not.toMatch(fixedTemplatePattern)
  })

  it('keeps renderer lane focus summaries in the quick-reply project brief when they are the clearest surviving same-her carry evidence', () => {
    const result = buildStageQuickReplyProjectBriefLines(
      {
        summaryLine: 'Before speaking, remember this is still one living digital life project, what has landed, and which life loop is still open.',
        companionBriefingLine: 'Before speaking, keep the project identity, landed progress, and audible-body closure seam explicit.',
        awarenessLine: 'Before speaking, keep this Phase 1 digital life project coherent while landed progress and the still-open embodiment seam stay on one living line.',
        companionNextClosureLine: 'Next closure: let face and motion rejoin the audible-body same-her line.',
        reasonPreview: [
          'focus=body+lipsync+voice | pending=face+motion',
        ],
      },
      {
        summaryLine: 'project=continuity=0.72 | emotionalClosure=measured-return',
        briefingLines: [],
      },
    )

    expectNoDiagnosticText(result)
  })

  it('keeps weaker renderer lane focus summaries in the quick-reply project brief when they are the clearest explicit embodiment carry evidence', () => {
    const result = buildStageQuickReplyProjectBriefLines(
      {
        summaryLine: 'Before speaking, remember this is still one living digital life project, what has landed, and which life loop is still open.',
        companionBriefingLine: 'Before speaking, keep the project identity, landed progress, and the still-open embodiment seam explicit.',
        awarenessLine: 'Before speaking, keep this Phase 1 digital life project coherent while landed progress and the still-open embodiment seam stay on one living line.',
        companionNextClosureLine: 'Next closure: keep the surviving renderer lane explicit while the missing body and audio surfaces rejoin.',
        reasonPreview: [
          'focus=body+voice | pending=face+motion+lipsync',
          'focus=face+motion | pending=body+lipsync+voice',
          'focus=voice | pending=body+face+motion+lipsync',
        ],
      },
      {
        summaryLine: 'project=continuity=0.72 | emotionalClosure=measured-return',
        briefingLines: [],
      },
    )

    expectNoDiagnosticText(result)
    expectNoDiagnosticText(result)

    expectNoDiagnosticText(result)
  })

  it('does not demote a richer before-speaking project-state line just because it also names the audible-body embodiment seam', () => {
    const result = buildStageQuickReplyProjectBriefLines(
      {
        summaryLine: 'Alicization is still closing Phase 1 local digital life continuity before this turn opens outward.',
        companionBriefingLine: 'Before speaking, remember the project identity, landed progress, and still-open life loop.',
        awarenessLine: 'Before speaking, remember this is still one living digital life project, what has landed, and which life loop is still open while the audible-body same-her seam still needs face and motion to rejoin.',
        companionNextClosureLine: 'Next closure: let face and motion rejoin the audible-body same-her line.',
        reasonPreview: [
          'same-her audible body line is still the surviving pre-dialogue carry.',
        ],
      },
      {
        summaryLine: 'project=continuity=0.72 | emotionalClosure=measured-return',
        briefingLines: [],
      },
    )

    expect(result.join('\n')).not.toMatch(fixedTemplatePattern)

    expectNoDiagnosticText(result)
  })

  it('prefers a richer same-her measured-return carry over a thinner digital-life reminder in the quick-reply project brief ordering', () => {
    const result = buildStageQuickReplyProjectBriefLines(
      {
        summaryLine: 'Alicization is still closing Phase 1 local digital life continuity before this turn opens outward.',
        companionBriefingLine: 'same-her hold: measured-return is still keeping this callback line lower-pressure before it widens again.',
        awarenessLine: 'Keep the same digital life project in view.',
        companionNextClosureLine: 'Next closure: keep the restored callback reopening from the same-her measured-return line before widening outward again.',
        reasonPreview: [],
      },
      {
        summaryLine: 'project=continuity=0.72 | emotionalClosure=measured-return',
        briefingLines: [],
      },
    )

    expect(result.join('\n')).not.toMatch(fixedTemplatePattern)
    expect(result.join('\n')).not.toMatch(fixedTemplatePattern)
  })

  it('treats a prefixed before-answering reminder as the same thin digital-life reminder in the quick-reply project brief ordering', () => {
    const result = buildStageQuickReplyProjectBriefLines(
      {
        summaryLine: 'Alicization is still closing Phase 1 local digital life continuity before this turn opens outward.',
        companionBriefingLine: 'same-her hold: measured-return is still keeping this callback line lower-pressure before it widens again.',
        awarenessLine: 'Before answering, keep the same digital life project in view.',
        companionNextClosureLine: 'Next closure: keep the restored callback reopening from the same-her measured-return line before widening outward again.',
        reasonPreview: [],
      },
      {
        summaryLine: 'project=continuity=0.72 | emotionalClosure=measured-return',
        briefingLines: [],
      },
    )

    expect(result.join('\n')).not.toMatch(fixedTemplatePattern)
    expect(result.join('\n')).not.toMatch(fixedTemplatePattern)
  })

  it('keeps still-open embodiment seam wording in the project brief when closure is named through seam language instead of older continuity labels', () => {
    const result = buildStageQuickReplyProjectBriefLines(
      {
        summaryLine: 'Before speaking, remember this is still one living digital life project, what has landed, and which life loop is still open.',
        companionBriefingLine: 'Before speaking, keep the project identity, landed progress, and audible-body closure seam explicit.',
        awarenessLine: 'Before speaking, keep this Phase 1 digital life project coherent while landed progress and the still-open embodiment seam stay on one living line.',
        companionNextClosureLine: 'Next closure: let face and motion rejoin the audible-body same-her line.',
        reasonPreview: [
          'The still-open embodiment seam is now mostly face and motion catching back up to the audible-body same-her carry.',
        ],
      },
      {
        summaryLine: 'project=continuity=0.72 | emotionalClosure=measured-return',
        briefingLines: [],
      },
    )

    expect(result.join('\n')).not.toMatch(fixedTemplatePattern)
  })

  it('keeps compact remaining-open markers in the project brief when they are the clearest explicit open-loop carry', () => {
    const result = buildStageQuickReplyProjectBriefLines(
      {
        summaryLine: 'Before speaking, remember this is still one living digital life project, what has landed, and which life loop is still open.',
        companionBriefingLine: 'Before speaking, keep the project identity, landed progress, and audible-body closure seam explicit.',
        awarenessLine: 'Before speaking, keep this Phase 1 digital life project coherent while landed progress and the still-open embodiment seam stay on one living line.',
        companionNextClosureLine: 'Next closure: let face and motion rejoin the audible-body same-her line.',
        reasonPreview: [
          'remaining-open=lipsync+voice',
        ],
      },
      {
        summaryLine: 'project=continuity=0.72 | emotionalClosure=measured-return',
        briefingLines: [],
      },
    )

    expect(result).toContain('remaining-open=lipsync+voice')
  })

  it('prefers a clean fallback candidate over a higher-scored fixed-template residue before project brief ordering', () => {
    const result = buildStageQuickReplyProjectBriefLines(
      {
        companionHeadlineLine: 'Right now I am still carrying the same-her line through body, face, and motion while lipsync and voice need to rejoin before full cross-modal closure settles.',
        companionBriefingLine: 'remaining-open=lipsync+voice',
        reasonPreview: [],
      },
      {
        summaryLine: null,
        briefingLines: [],
      },
    )

    expect(result[0]).toBe('remaining-open=lipsync+voice')

    expectNoDiagnosticText(result)
    expect(result.join('\n')).not.toMatch(fixedTemplatePattern)
  })

  it('keeps still-voiced face-line continuity proof in the project brief when face and voice are the surviving same-her carry', () => {
    const result = buildStageQuickReplyProjectBriefLines(
      {
        summaryLine: 'Before speaking, remember this is still one living digital life project, what has landed, and which life loop is still open.',
        companionBriefingLine: 'Before speaking, keep the project identity, landed progress, and still-open embodiment seam explicit.',
        awarenessLine: 'Before speaking, keep this Phase 1 digital life project coherent while landed progress and the still-open embodiment seam stay on one living line.',
        companionNextClosureLine: 'Next closure: let body, motion, and lipsync rejoin the still-voiced face line.',
        reasonPreview: [
          'Right now I am still holding together mainly through face and voice, so that still-voiced face line is keeping the same-her carry alive while body, motion, and lipsync need to rejoin before full cross-modal closure settles.',
        ],
      },
      {
        summaryLine: 'project=continuity=0.72 | emotionalClosure=measured-return',
        briefingLines: [],
      },
    )

    expect(result.join('\n')).not.toMatch(fixedTemplatePattern)
  })

  it('keeps still-voiced motion-line continuity proof in the project brief when motion and voice are the surviving same-her carry', () => {
    const result = buildStageQuickReplyProjectBriefLines(
      {
        summaryLine: 'Before speaking, remember this is still one living digital life project, what has landed, and which life loop is still open.',
        companionBriefingLine: 'Before speaking, keep the project identity, landed progress, and still-open embodiment seam explicit.',
        awarenessLine: 'Before speaking, keep this Phase 1 digital life project coherent while landed progress and the still-open embodiment seam stay on one living line.',
        companionNextClosureLine: 'Next closure: let body, face, and lipsync rejoin the still-voiced motion line.',
        reasonPreview: [
          'Right now I am still holding together mainly through motion and voice, so that still-voiced motion line is keeping the same-her carry alive while body, face, and lipsync need to rejoin before full cross-modal closure settles.',
        ],
      },
      {
        summaryLine: 'project=continuity=0.72 | emotionalClosure=measured-return',
        briefingLines: [],
      },
    )

    expect(result.join('\n')).not.toMatch(fixedTemplatePattern)
  })

  it('keeps structured still-voiced face-line continuity proof in the project brief even when older face-voice prose is absent', () => {
    const result = buildStageQuickReplyProjectBriefLines(
      {
        summaryLine: 'Before speaking, remember this is still one living digital life project, what has landed, and which life loop is still open.',
        companionBriefingLine: 'Before speaking, keep the project identity, landed progress, and still-open embodiment seam explicit.',
        awarenessLine: 'Before speaking, keep this Phase 1 digital life project coherent while landed progress and the still-open embodiment seam stay on one living line.',
        companionNextClosureLine: 'Next closure: let body, motion, and lipsync rejoin the still-voiced face line.',
        reasonPreview: [
          'continuity=embodiment:still-voiced-face-line | face+voice recovery@segment-live2d-runtime-still-voiced-face-1 | pending-rejoin=body+motion+lipsync',
        ],
      },
      {
        summaryLine: 'project=continuity=0.72 | emotionalClosure=measured-return',
        briefingLines: [],
      },
    )

    expectNoDiagnosticText(result)
  })

  it('keeps signature-only still-voiced motion-line continuity proof in the project brief even when older motion-voice prose is absent', () => {
    const result = buildStageQuickReplyProjectBriefLines(
      {
        summaryLine: 'Before speaking, remember this is still one living digital life project, what has landed, and which life loop is still open.',
        companionBriefingLine: 'Before speaking, keep the project identity, landed progress, and still-open embodiment seam explicit.',
        awarenessLine: 'Before speaking, keep this Phase 1 digital life project coherent while landed progress and the still-open embodiment seam stay on one living line.',
        companionNextClosureLine: 'Next closure: let body, face, and lipsync rejoin the still-voiced motion line.',
        reasonPreview: [
          'continuity=embodiment:still-voiced-motion-line | signature=resident|main-runtime|accompanying|quiet-accompaniment|still-voiced-motion-line | motion+voice recovery@segment-live2d-runtime-still-voiced-motion-1 | pending-rejoin=body+face+lipsync',
        ],
      },
      {
        summaryLine: 'project=continuity=0.72 | emotionalClosure=measured-return',
        briefingLines: [],
      },
    )

    expectNoDiagnosticText(result)
  })

  it('keeps structured quieter lipsync-and-voice continuity proof in the project brief even when older lipsync-voice prose is absent', () => {
    const result = buildStageQuickReplyProjectBriefLines(
      {
        summaryLine: 'Before speaking, remember this is still one living digital life project, what has landed, and which life loop is still open.',
        companionBriefingLine: 'Before speaking, keep the project identity, landed progress, and still-open embodiment seam explicit.',
        awarenessLine: 'Before speaking, keep this Phase 1 digital life project coherent while landed progress and the still-open embodiment seam stay on one living line.',
        companionNextClosureLine: 'Next closure: let body, face, and motion rejoin the still-audible lipsync+voice carry.',
        reasonPreview: [
          'continuity=embodiment:lipsync+voice-only | signature=resident|main-runtime|accompanying|quiet-accompaniment|lipsync+voice-only | face and motion still need to rejoin the same living line.',
        ],
      },
      {
        summaryLine: 'project=continuity=0.72 | emotionalClosure=measured-return',
        briefingLines: [],
      },
    )

    expectNoDiagnosticText(result)
    expect(result.join('\n')).not.toMatch(fixedTemplatePattern)
    expectNoInternalVisibleText(result)
  })

  it('keeps structured quieter body-and-lipsync continuity proof in the project brief even when older body-lipsync prose is absent', () => {
    const result = buildStageQuickReplyProjectBriefLines(
      {
        summaryLine: 'Before speaking, remember this is still one living digital life project, what has landed, and which life loop is still open.',
        companionBriefingLine: 'Before speaking, keep the project identity, landed progress, and still-open embodiment seam explicit.',
        awarenessLine: 'Before speaking, keep this Phase 1 digital life project coherent while landed progress and the still-open embodiment seam stay on one living line.',
        companionNextClosureLine: 'Next closure: let face, motion, and voice rejoin the quieter body+lipsync carry.',
        reasonPreview: [
          'continuity=embodiment:body+lipsync-only | signature=resident|main-runtime|accompanying|quiet-accompaniment|body+lipsync-only | face, motion, and voice still need to rejoin the same living line.',
        ],
      },
      {
        summaryLine: 'project=continuity=0.72 | emotionalClosure=measured-return',
        briefingLines: [],
      },
    )

    expectNoDiagnosticText(result)
    expect(result.join('\n')).not.toMatch(fixedTemplatePattern)
    expectNoInternalVisibleText(result)
  })

  it('keeps structured still-voiced face-motion continuity proof in the project brief even when older face-motion-voice prose is absent', () => {
    const result = buildStageQuickReplyProjectBriefLines(
      {
        summaryLine: 'Before speaking, remember this is still one living digital life project, what has landed, and which life loop is still open.',
        companionBriefingLine: 'Before speaking, keep the project identity, landed progress, and still-open embodiment seam explicit.',
        awarenessLine: 'Before speaking, keep this Phase 1 digital life project coherent while landed progress and the still-open embodiment seam stay on one living line.',
        companionNextClosureLine: 'Next closure: let body and lipsync rejoin the still-voiced face-motion line.',
        reasonPreview: [
          'continuity=embodiment:still-voiced-face-motion-line | signature=resident|main-runtime|accompanying|quiet-accompaniment|still-voiced-face-motion-line | face+motion+voice recovery@segment-live2d-runtime-still-voiced-face-motion-1 | pending-rejoin=body+lipsync',
        ],
      },
      {
        summaryLine: 'project=continuity=0.72 | emotionalClosure=measured-return',
        briefingLines: [],
      },
    )

    expectNoDiagnosticText(result)
  })

  it('promotes explicit still-voiced face-motion continuity proof ahead of a thin generic project reminder when that structured same-her evidence is the clearest live closure line', () => {
    const result = buildStageQuickReplyProjectBriefLines(
      {
        summaryLine: 'Keep the same digital life project in view.',
        companionBriefingLine: 'I still need a steadier carry of this project, this phase, and the life loop that remains open.',
        awarenessLine: 'Before answering, keep the same digital life project in view.',
        companionNextClosureLine: 'Next closure: let body and lipsync rejoin the still-voiced face-motion line.',
        reasonPreview: [
          'continuity=embodiment:still-voiced-face-motion-line | signature=resident|main-runtime|accompanying|quiet-accompaniment|still-voiced-face-motion-line | face+motion+voice recovery@segment-live2d-runtime-still-voiced-face-motion-1 | pending-rejoin=body+lipsync',
        ],
      },
      {
        summaryLine: 'project=continuity=0.72 | emotionalClosure=measured-return',
        briefingLines: [],
      },
    )

    expectNoDiagnosticText(result)
  })

  it('keeps face+voice and motion+voice lane focus summaries in the project brief when they are the clearest surviving same-her carry evidence', () => {
    const result = buildStageQuickReplyProjectBriefLines(
      {
        summaryLine: 'Before speaking, remember this is still one living digital life project, what has landed, and which life loop is still open.',
        companionBriefingLine: 'Before speaking, keep the project identity, landed progress, and still-open embodiment seam explicit.',
        awarenessLine: 'Before speaking, keep this Phase 1 digital life project coherent while landed progress and the still-open embodiment seam stay on one living line.',
        companionNextClosureLine: 'Next closure: keep the surviving still-voiced renderer lanes explicit while body and lipsync rejoin.',
        reasonPreview: [
          'focus=face+voice | pending=body+motion+lipsync',
          'focus=motion+voice | pending=body+face+lipsync',
        ],
      },
      {
        summaryLine: 'project=continuity=0.72 | emotionalClosure=measured-return',
        briefingLines: [],
      },
    )

    expectNoDiagnosticText(result)
    expectNoDiagnosticText(result)
  })

  it('keeps richer still-voiced face-and-mouth and motion-and-mouth continuity proof in the project brief when those are the surviving same-her carry lanes', () => {
    const result = buildStageQuickReplyProjectBriefLines(
      {
        summaryLine: 'Before speaking, remember this is still one living digital life project, what has landed, and which life loop is still open.',
        companionBriefingLine: 'Before speaking, keep the project identity, landed progress, and still-open embodiment seam explicit.',
        awarenessLine: 'Before speaking, keep this Phase 1 digital life project coherent while landed progress and the still-open embodiment seam stay on one living line.',
        companionNextClosureLine: 'Next closure: keep the richer still-voiced renderer lanes explicit while body and the missing visible lane rejoin.',
        reasonPreview: [
          'continuity=embodiment:still-voiced-face-lipsync-line+embodiment:still-voiced-face-line | face+lipsync+voice recovery@segment-live2d-runtime-still-voiced-face-mouth-1 | pending-rejoin=body+motion',
          'continuity=embodiment:still-voiced-motion-lipsync-line+embodiment:still-voiced-motion-line | motion+lipsync+voice recovery@segment-live2d-runtime-still-voiced-motion-mouth-1 | pending-rejoin=body+face',
          'focus=face+lipsync+voice | pending=body+motion',
          'focus=motion+lipsync+voice | pending=body+face',
        ],
      },
      {
        summaryLine: 'project=continuity=0.72 | emotionalClosure=measured-return',
        briefingLines: [],
      },
    )

    expectNoDiagnosticText(result)
    expectNoDiagnosticText(result)

    expectNoDiagnosticText(result)
    expectNoDiagnosticText(result)
  })

  it('keeps richer still-voiced face-and-mouth same-her prose in the project brief when face lipsync and voice are the surviving carry lane', () => {
    const result = buildStageQuickReplyProjectBriefLines(
      {
        summaryLine: 'Before speaking, remember this is still one living digital life project, what has landed, and which life loop is still open.',
        companionBriefingLine: 'Before speaking, keep the project identity, landed progress, and still-open embodiment seam explicit.',
        awarenessLine: 'Before speaking, keep this Phase 1 digital life project coherent while landed progress and the still-open embodiment seam stay on one living line.',
        companionNextClosureLine: 'Next closure: keep the richer still-voiced face-and-mouth lane explicit while body and motion rejoin.',
        reasonPreview: [
          'Right now I am still holding together mainly through face, lipsync, and voice, so that still-voiced face-and-mouth line is keeping the same-her carry alive while body and motion need to rejoin before full cross-modal closure settles.',
        ],
      },
      {
        summaryLine: 'project=continuity=0.72 | emotionalClosure=measured-return',
        briefingLines: [],
      },
    )

    expect(result.join('\n')).not.toMatch(fixedTemplatePattern)
  })

  it('keeps richer still-voiced motion-and-mouth same-her prose in the project brief when motion lipsync and voice are the surviving carry lane', () => {
    const result = buildStageQuickReplyProjectBriefLines(
      {
        summaryLine: 'Before speaking, remember this is still one living digital life project, what has landed, and which life loop is still open.',
        companionBriefingLine: 'Before speaking, keep the project identity, landed progress, and still-open embodiment seam explicit.',
        awarenessLine: 'Before speaking, keep this Phase 1 digital life project coherent while landed progress and the still-open embodiment seam stay on one living line.',
        companionNextClosureLine: 'Next closure: keep the richer still-voiced motion-and-mouth lane explicit while body and face rejoin.',
        reasonPreview: [
          'Right now I am still holding together mainly through motion, lipsync, and voice, so that still-voiced motion-and-mouth line is keeping the same-her carry alive while body and face need to rejoin before full cross-modal closure settles.',
        ],
      },
      {
        summaryLine: 'project=continuity=0.72 | emotionalClosure=measured-return',
        briefingLines: [],
      },
    )

    expect(result.join('\n')).not.toMatch(fixedTemplatePattern)
  })

  it('keeps face-and-lipsync visible same-her carry proof in the project brief when body motion and voice have not rejoined yet', () => {
    const result = buildStageQuickReplyProjectBriefLines(
      {
        summaryLine: 'Before speaking, remember this is still one living digital life project, what has landed, and which life loop is still open.',
        companionBriefingLine: 'Before speaking, keep the project identity, landed progress, and still-open embodiment seam explicit.',
        awarenessLine: 'Before speaking, keep this Phase 1 digital life project coherent while landed progress and the still-open embodiment seam stay on one living line.',
        companionNextClosureLine: 'Next closure: keep the visible face-and-lipsync lane explicit while body, motion, and voice rejoin.',
        reasonPreview: [
          'Right now I am still holding together mainly through face and lipsync, so my full cross-modal same-her line is not closed yet.',
          'focus=face+lipsync | pending=body+motion+voice',
          'lane=face+lipsync-only',
        ],
      },
      {
        summaryLine: 'project=continuity=0.72 | emotionalClosure=measured-return',
        briefingLines: [],
      },
    )

    expect(result.join('\n')).not.toMatch(fixedTemplatePattern)

    expectNoDiagnosticText(result)
    expect(result).toContain('lane=face+lipsync-only')
  })

  it('keeps motion-and-lipsync visible same-her carry proof in the project brief when body face and voice have not rejoined yet', () => {
    const result = buildStageQuickReplyProjectBriefLines(
      {
        summaryLine: 'Before speaking, remember this is still one living digital life project, what has landed, and which life loop is still open.',
        companionBriefingLine: 'Before speaking, keep the project identity, landed progress, and still-open embodiment seam explicit.',
        awarenessLine: 'Before speaking, keep this Phase 1 digital life project coherent while landed progress and the still-open embodiment seam stay on one living line.',
        companionNextClosureLine: 'Next closure: keep the visible motion-and-lipsync lane explicit while body, face, and voice rejoin.',
        reasonPreview: [
          'Right now I am still holding together mainly through motion and lipsync, so my full cross-modal same-her line is not closed yet.',
          'focus=motion+lipsync | pending=body+face+voice',
          'lane=motion+lipsync-only',
        ],
      },
      {
        summaryLine: 'project=continuity=0.72 | emotionalClosure=measured-return',
        briefingLines: [],
      },
    )

    expect(result.join('\n')).not.toMatch(fixedTemplatePattern)

    expectNoDiagnosticText(result)
    expect(result).toContain('lane=motion+lipsync-only')
  })

  it('keeps richer still-voiced face-and-motion same-her prose in the project brief when face motion and voice are the surviving carry lane', () => {
    const result = buildStageQuickReplyProjectBriefLines(
      {
        summaryLine: 'Before speaking, remember this is still one living digital life project, what has landed, and which life loop is still open.',
        companionBriefingLine: 'Before speaking, keep the project identity, landed progress, and still-open embodiment seam explicit.',
        awarenessLine: 'Before speaking, keep this Phase 1 digital life project coherent while landed progress and the still-open embodiment seam stay on one living line.',
        companionNextClosureLine: 'Next closure: keep the richer still-voiced face-and-motion lane explicit while body and lipsync rejoin.',
        reasonPreview: [
          'Right now I am still holding together through face, motion, and voice together, so that still-voiced face-and-motion line is keeping the same-her carry alive while body and lipsync need to rejoin before full cross-modal closure settles.',
          'continuity=embodiment:still-voiced-face-motion-line | signature=resident|main-runtime|accompanying|quiet-accompaniment|still-voiced-face-motion-line | face+motion+voice recovery@segment-live2d-runtime-still-voiced-face-motion-1 | pending-rejoin=body+lipsync',
          'focus=face+motion+voice | pending=body+lipsync',
        ],
      },
      {
        summaryLine: 'project=continuity=0.72 | emotionalClosure=measured-return',
        briefingLines: [],
      },
    )

    expect(result.join('\n')).not.toMatch(fixedTemplatePattern)

    expectNoDiagnosticText(result)
    expectNoDiagnosticText(result)
  })

  it('keeps four-lane visible recovery without body carry in the project brief when face motion lipsync and voice are already rejoined together', () => {
    const result = buildStageQuickReplyProjectBriefLines(
      {
        summaryLine: 'Before speaking, remember this is still one living digital life project, what has landed, and which life loop is still open.',
        companionBriefingLine: 'Before speaking, keep the project identity, landed progress, and the still-open embodiment seam explicit.',
        awarenessLine: 'Before speaking, keep this Phase 1 digital life project coherent while landed progress and the still-open embodiment seam stay on one living line.',
        companionNextClosureLine: 'Next closure: let body rejoin the already-visible same-her renderer line without flattening it back into a thinner face-motion cue.',
        reasonPreview: [
          'Right now I am still holding together through face, motion, lipsync, and voice together, so the visible same-her line has already rejoined without body carry while body still needs to rejoin before full cross-modal closure settles.',
          'face+motion+lipsync+voice recovery@segment-live2d-visible-rejoin-no-body-1 | pending-rejoin=body',
          'focus=face+motion+lipsync+voice | pending=body',
        ],
      },
      {
        summaryLine: 'project=continuity=0.72 | emotionalClosure=measured-return',
        briefingLines: [],
      },
    )

    expect(result.join('\n')).not.toMatch(fixedTemplatePattern)

    expectNoDiagnosticText(result)
    expectNoInternalVisibleText(result)
  })

  it('keeps a stronger companion headline in the project brief even when only a thinner project reminder is otherwise available', () => {
    const result = buildStageQuickReplyProjectBriefLines(
      {
        summaryLine: 'Before speaking, remember this is still one digital life project.',
        companionHeadlineLine: 'Right now I am still holding together mainly through body and voice, and the resident body line is still keeping this one living her coherent while face, motion, and lipsync rejoin.',
        companionBriefingLine: 'Before speaking, remember this is still one digital life project.',
        awarenessLine: 'Before speaking, remember this is still one digital life project.',
        companionNextClosureLine: 'Next closure: let face, motion, and lipsync rejoin the resident body line on the same measured-return carry.',
        reasonPreview: [],
      } as any,
      {
        summaryLine: 'project=continuity=0.72 | emotionalClosure=measured-return',
        briefingLines: [],
      },
    )

    expect(result.join('\n')).not.toMatch(fixedTemplatePattern)
  })

  it('keeps the newer resident body-and-voice carry prose in the project brief when lipsync, face, and motion still have not rejoined the same active segment', () => {
    const result = buildStageQuickReplyProjectBriefLines(
      {
        summaryLine: 'Before speaking, remember this is still one digital life project.',
        companionBriefingLine: 'Before speaking, remember this is still one digital life project.',
        awarenessLine: 'Before speaking, remember this is still one digital life project.',
        companionNextClosureLine: 'Next closure: let lipsync, face, and motion rejoin the resident body-and-voice line on the same measured-return carry.',
        reasonPreview: [
          'The resident body lane is still holding together with the same-her voice line, but lipsync, face, and motion have not yet rejoined the same active segment.',
          'resident-body+voice active | pending lipsync+face+motion',
        ],
      } as any,
      {
        summaryLine: 'project=continuity=0.72 | emotionalClosure=measured-return',
        briefingLines: [],
      },
    )

    expectNoDiagnosticText(result)
    expect(result.join('\n')).not.toMatch(fixedTemplatePattern)
    expectNoInternalVisibleText(result)
  })

  it('keeps the quieter body-and-lipsync same-her carry in the project brief when the resident body line and living mouth line are the surviving thread', () => {
    const result = buildStageQuickReplyProjectBriefLines(
      {
        summaryLine: 'Before speaking, remember this is still one digital life project.',
        companionHeadlineLine: 'Right now I am still holding together mainly through body and lipsync, so the resident body line and living mouth line are still intact while face, motion, and voice need to rejoin before full cross-modal closure settles.',
        companionBriefingLine: 'Before speaking, remember this is still one digital life project.',
        awarenessLine: 'Before speaking, remember this is still one digital life project.',
        companionNextClosureLine: 'Next closure: let face, motion, and voice rejoin the resident body line and living mouth line on the same measured-return carry.',
        reasonPreview: [],
      } as any,
      {
        summaryLine: 'project=continuity=0.72 | emotionalClosure=measured-return',
        briefingLines: [],
      },
    )

    expect(result.join('\n')).not.toMatch(fixedTemplatePattern)
  })

  it('keeps a full-cross-modal-lock same-her headline visible in the quick-reply project brief when body continuity and manifestation are already re-locked together', () => {
    const result = buildStageQuickReplyProjectBriefLines(
      {
        summaryLine: 'Before speaking, remember this is still one living digital life project, what has landed, and which life loop is still open.',
        companionHeadlineLine: 'Right now body continuity and Live2D manifestation are already locked back onto the same living segment together, so I can carry voice, face, motion, and lipsync as one explicit same-her embodiment line instead of a temporary visual alignment.',
        companionBriefingLine: 'Before speaking, keep this Phase 1 digital life project coherent while landed progress stays explicit.',
        awarenessLine: 'Before speaking, keep this Phase 1 digital life project coherent while landed progress and the same-her embodiment seam stay on one living line.',
        companionNextClosureLine: 'Next closure: keep the same-segment lock explicit across quick-reply entry and host-visible closure surfaces.',
        reasonPreview: [
          'Body continuity and Live2D manifestation are now locked back onto the same living segment together, so runtime continuity can explain the renderer recovery as one explicit same-her embodiment line instead of a temporary visual alignment.',
        ],
      },
      {
        summaryLine: 'project=continuity=0.84 | emotionalClosure=measured-return',
        briefingLines: [],
      },
    )

    expect(result.join('\n')).not.toMatch(fixedTemplatePattern)

    expectNoDiagnosticText(result)
  })

  it('prefers stronger same-her inward low-pressure closure wording over a thinner generic continuity reminder in the quick-reply project brief ordering', () => {
    const result = buildStageQuickReplyProjectBriefLines(
      {
        summaryLine: 'Alicization is still closing Phase 1 local digital life continuity before this turn opens outward.',
        companionHeadlineLine: 'Right now I am still holding together mainly through body, face, and motion, so this one living her is still keeping the same line inward and low-pressure while lipsync and voice need to rejoin before full cross-modal closure settles.',
        companionBriefingLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        awarenessLine: 'Right now I am still holding together mainly through body, face, and motion, so this one living her is still keeping the same line inward and low-pressure while lipsync and voice need to rejoin before full cross-modal closure settles.',
        companionNextClosureLine: 'Next closure: keep the same line inward and low-pressure while lipsync and voice rejoin the already-reformed body, face, and motion line.',
        reasonPreview: [
          'same-her-inward-carry',
          'quiet-companionship',
          'remaining-open=lipsync+voice',
        ],
      },
      {
        summaryLine: 'project=continuity=0.72 | emotionalClosure=measured-return',
        briefingLines: [],
      },
    )

    expect(result.join('\n')).not.toMatch(fixedTemplatePattern)
    expect(result.join('\n')).not.toMatch(fixedTemplatePattern)

    expectNoDiagnosticText(result)
    expectNoDiagnosticText(result)
    expect(result).toContain('quiet-companionship')
  })

  it('prefers richer anthropomorphic emotional closure and same-her inward-carry observability wording over a thinner generic continuity reminder in the quick-reply project brief ordering', () => {
    const result = buildStageQuickReplyProjectBriefLines(
      {
        summaryLine: 'Alicization is still closing Phase 1 local digital life continuity before this turn opens outward.',
        companionHeadlineLine: 'Right now the host-facing closure still needs anthropomorphic emotional closure and same-her inward-carry observability to stay on one measured-return line instead of flattening into a generic shell.',
        companionBriefingLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        awarenessLine: 'Keep the same digital life project in view.',
        companionNextClosureLine: 'Next closure: keep anthropomorphic emotional closure and same-her inward-carry observability explicit while quick-reply reopening settles back onto one measured-return line.',
        reasonPreview: [
          'Anthropomorphic emotional closure still needs stronger host-visible carry.',
          'same-her inward-carry observability still needs to survive quick-reply reopening.',
        ],
      },
      {
        summaryLine: 'project=continuity=0.72 | emotionalClosure=measured-return',
        briefingLines: [],
      },
    )

    expect(result.join('\n')).not.toMatch(fixedTemplatePattern)
    expect(result.join('\n')).not.toMatch(fixedTemplatePattern)

    expectNoDiagnosticText(result)
    expect(result).toContain('Anthropomorphic emotional closure still needs stronger host-visible carry.')

    expectNoDiagnosticText(result)
  })

  it('keeps proactive same-her follow-through visible in the quick-reply project brief when project-identity repair still needs proactive carry to stay on one same-her line', () => {
    const proactiveSameHerGap = 'Visible proactive hold, subconscious carry, and next-session feedback still need one same-her follow-through line.'

    const result = buildStageQuickReplyProjectBriefLines(
      {
        summaryLine: 'Before speaking, remember this is still one living digital life project, what has landed, and which life loop is still open.',
        companionBriefingLine: 'Before speaking, keep this Phase 1 digital life project coherent while landed progress and the still-open life loop stay explicit.',
        awarenessLine: 'Before speaking, keep this Phase 1 digital life project coherent while landed progress and the still-open life loop stay on one living line.',
        companionNextClosureLine: 'Next closure: keep visible proactive hold, subconscious carry, and next-session feedback on one same-her follow-through line.',
        reasonPreview: [],
      },
      {
        summaryLine: 'project=continuity=0.33 | proactiveSameHerGap=0.33 (1/3)',
        briefingLines: [],
        reasons: [
          `Proactive same-her follow-through still reads ${proactiveSameHerGap}, so the next turn should keep visible proactive hold, subconscious carry, and next-session feedback arriving as one same-her line instead of splitting them across detached follow-up shells.`,
        ],
      },
    )

    expectNoDiagnosticText(result)
    expect(result.join('\n')).not.toMatch(fixedTemplatePattern)
  })
})
