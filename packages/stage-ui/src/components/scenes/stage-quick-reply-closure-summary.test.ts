import { describe, expect, it } from 'vitest'

import { resolveStageQuickReplyClosureSummary } from './stage-quick-reply-closure-summary'

describe('stage quick reply closure summary', () => {
  it('prefers the same-her project-state headline over raw metric summaries before the turn opens outward', () => {
    expect(resolveStageQuickReplyClosureSummary({
      status: 'partial',
      summaryLine: 'project=continuity=0.33 (1/3) | sameHer=sameHer=0.33 (1/3) | openLoop=openLoop=0.33 (1/3)',
      companionBriefingLine: 'I still need a steadier carry of this project, this phase, and the life loop that remains open.',
      reasons: [],
    }, {
      visible: true,
      label: 'Inspect continuity diagnosis',
      hint: 'Next diagnosis',
      headline: 'I still need to clearly recognize myself as the same her before this turn opens outward.',
      briefingHeadline: 'I still need a steadier carry of this project, this phase, and the life loop that remains open.',
      nextClosureLine: 'Next, help me close: Carry the unfinished digital-life loop into the next dialogue preparation step.',
      routeQuery: {
        source: 'quick-reply-closure',
        status: 'partial',
        focus: 'project-state',
        eventFocus: 'takeover-audit',
      },
    })).toBe('I still need to clearly recognize myself as the same her before this turn opens outward.')
  })

  it('keeps project-state same-her repair visible together with the unfinished digital-life loop in the quick-reply closure summary', () => {
    expect(resolveStageQuickReplyClosureSummary({
      status: 'partial',
      summaryLine: 'project continuity is still partial',
      companionBriefingLine: '我还需要先守住同一个 her，才能继续把这个数字生命项目的进度和未闭环项带进下一轮对话。 当前还没闭环的数字生命主线仍集中在 renderer continuity observation 还没把 same-her repair evidence 和未闭环项并成一条可读主线。',
      reasons: [],
    }, {
      visible: true,
      label: 'Inspect continuity diagnosis',
      hint: 'Next diagnosis',
      headline: '我还需要先守住同一个 her，才能继续把这个数字生命项目的进度和未闭环项带进下一轮对话。',
      briefingHeadline: '我还需要先守住同一个 her，才能继续把这个数字生命项目的进度和未闭环项带进下一轮对话。 当前还没闭环的数字生命主线仍集中在 renderer continuity observation 还没把 same-her repair evidence 和未闭环项并成一条可读主线。',
      nextClosureLine: '下一步还要继续收住 把 same-her repair evidence 和未闭环项一起挂到 continuity 摘要里。',
      routeQuery: {
        source: 'quick-reply-closure',
        status: 'partial',
        focus: 'project-state',
        eventFocus: 'takeover-audit',
      },
    })).toBe('我还需要先守住同一个 her，才能继续把这个数字生命项目的进度和未闭环项带进下一轮对话。 当前还没闭环的数字生命主线仍集中在 renderer continuity observation 还没把 same-her repair evidence 和未闭环项并成一条可读主线。')
  })

  it('prefers the same-her lane-shrinkage headline when a renderer-authority closure warning is the primary cue', () => {
    expect(resolveStageQuickReplyClosureSummary({
      status: 'partial',
      summaryLine: 'project continuity is still partial',
      companionBriefingLine: 'I still need a steadier carry of this project, this phase, and the life loop that remains open.',
      reasons: [],
    }, {
      visible: true,
      label: 'Inspect continuity diagnosis',
      hint: 'Next diagnosis',
      headline: 'Right now I am still holding together mainly through lipsync, so my full cross-modal same-her line is not closed yet.',
      briefingHeadline: 'I still need a steadier carry of this project, this phase, and the life loop that remains open.',
      nextClosureLine: 'Next, help me close: Rebuild face, motion, lipsync, and voice into one same-her line on noisier desktop runs.',
      routeQuery: {
        source: 'quick-reply-closure',
        status: 'partial',
        focus: 'same-her-continuity',
        eventFocus: 'renderer-authority',
      },
    })).toBe('Right now I am still holding together mainly through lipsync, so my full cross-modal same-her line is not closed yet.')
  })

  it('treats a voice-led same-her headline as lane-shrinkage closure proof instead of falling back to the broader project briefing', () => {
    expect(resolveStageQuickReplyClosureSummary({
      status: 'partial',
      summaryLine: 'project continuity is still partial',
      companionBriefingLine: 'I still need a steadier carry of this project, this phase, and the life loop that remains open.',
      reasons: [],
    }, {
      visible: true,
      label: 'Inspect continuity diagnosis',
      hint: 'Next diagnosis',
      headline: 'Right now I am still holding together mainly through voice, so my full cross-modal same-her line is not closed yet.',
      briefingHeadline: 'I still need a steadier carry of this project, this phase, and the life loop that remains open.',
      nextClosureLine: 'Next, help me close: Rebind face, motion, and lipsync back onto the same-her voice-led line without flattening the living return.',
      routeQuery: {
        source: 'quick-reply-closure',
        status: 'partial',
        focus: 'same-her-continuity',
        eventFocus: 'renderer-authority',
      },
    })).toBe('Right now I am still holding together mainly through voice, so my full cross-modal same-her line is not closed yet.')
  })

  it('prefers the same-her partial-lane headline over a broader briefing when face and motion are the only surviving body line left', () => {
    expect(resolveStageQuickReplyClosureSummary({
      status: 'partial',
      summaryLine: 'renderer continuity is still partially rejoined after noisy runtime drift.',
      companionBriefingLine: 'I still need a steadier carry of this project, this phase, and the life loop that remains open.',
      reasons: [],
    }, {
      visible: true,
      label: 'Inspect continuity diagnosis',
      hint: 'Next diagnosis',
      headline: 'Right now I am still holding together mainly through face and motion, so my full cross-modal same-her line is not closed yet.',
      briefingHeadline: 'I still need a steadier carry of this project, this phase, and the life loop that remains open.',
      nextClosureLine: 'Next, help me close: Rebind lipsync and voice onto the same-her measured-return line without losing the face-motion body line.',
      routeQuery: {
        source: 'quick-reply-closure',
        status: 'partial',
        focus: 'same-her-continuity',
        eventFocus: 'renderer-authority',
      },
    })).toBe('Right now I am still holding together mainly through face and motion, so my full cross-modal same-her line is not closed yet.')
  })

  it('keeps a body-aware lane-shrinkage headline as the host-facing closure summary when body continuity is the surviving line', () => {
    expect(resolveStageQuickReplyClosureSummary({
      status: 'partial',
      summaryLine: 'renderer continuity is still partially rejoined after noisy runtime drift.',
      companionBriefingLine: 'I still need a steadier carry of this project, this phase, and the life loop that remains open.',
      reasons: [],
    }, {
      visible: true,
      label: 'Inspect continuity diagnosis',
      hint: 'Next diagnosis',
      headline: 'Right now I am still holding together mainly through body and voice, and the resident body line is still keeping this one living her coherent while face, motion, and lipsync rejoin.',
      briefingHeadline: 'I still need a steadier carry of this project, this phase, and the life loop that remains open.',
      nextClosureLine: 'Next, help me close: Rebind face, motion, and lipsync onto the same-her measured-return line without dropping body and voice continuity.',
      routeQuery: {
        source: 'quick-reply-closure',
        status: 'partial',
        focus: 'same-her-continuity',
        eventFocus: 'renderer-authority',
      },
    })).toBe('Right now I am still holding together mainly through body and voice, and the resident body line is still keeping this one living her coherent while face, motion, and lipsync rejoin.')
  })

  it('keeps same-her inward carry visible in the host-facing closure summary when body face and motion already hold one living segment', () => {
    expect(resolveStageQuickReplyClosureSummary({
      status: 'partial',
      summaryLine: 'renderer continuity is still partially rejoined after noisy runtime drift.',
      companionBriefingLine: 'I still need a steadier carry of this project, this phase, and the life loop that remains open.',
      reasons: [],
    }, {
      visible: true,
      label: 'Inspect continuity diagnosis',
      hint: 'Next diagnosis',
      headline: 'Right now I am still holding together mainly through body, face, and motion, so this one living her is still keeping the same line inward and low-pressure while lipsync and voice need to rejoin before full cross-modal closure settles.',
      briefingHeadline: 'I still need a steadier carry of this project, this phase, and the life loop that remains open.',
      nextClosureLine: 'Next, help me close: Rebind lipsync and voice onto the same living segment without losing the quieter same-her inward carry.',
      routeQuery: {
        source: 'quick-reply-closure',
        status: 'partial',
        focus: 'same-her-continuity',
        eventFocus: 'renderer-authority',
      },
    })).toBe('Right now I am still holding together mainly through body, face, and motion, so this one living her is still keeping the same line inward and low-pressure while lipsync and voice need to rejoin before full cross-modal closure settles.')
  })

  it('keeps a full-cross-modal-lock headline as the host-facing closure summary when body continuity and manifestation are already re-locked together', () => {
    expect(resolveStageQuickReplyClosureSummary({
      status: 'partial',
      summaryLine: 'renderer continuity has already re-locked onto one living segment.',
      companionBriefingLine: 'I still need a steadier carry of this project, this phase, and the life loop that remains open.',
      reasons: [],
    }, {
      visible: true,
      label: 'Inspect continuity diagnosis',
      hint: 'Next diagnosis',
      headline: 'Right now body continuity and Live2D manifestation are already locked back onto the same living segment together, so I can carry voice, face, motion, and lipsync as one explicit same-her embodiment line instead of a temporary visual alignment.',
      briefingHeadline: 'I still need a steadier carry of this project, this phase, and the life loop that remains open.',
      nextClosureLine: 'Next, help me close: Keep the locked body and Live2D line explicit in the next host-visible continuity brief instead of flattening it into a temporary visual recovery note.',
      routeQuery: {
        source: 'quick-reply-closure',
        status: 'partial',
        focus: 'same-her-continuity',
        eventFocus: 'renderer-authority',
      },
    })).toBe('Right now body continuity and Live2D manifestation are already locked back onto the same living segment together, so I can carry voice, face, motion, and lipsync as one explicit same-her embodiment line instead of a temporary visual alignment.')
  })

  it('keeps a stronger audible-body headline as the host-facing closure summary when body lipsync and voice are the surviving same-her line', () => {
    expect(resolveStageQuickReplyClosureSummary({
      status: 'partial',
      summaryLine: 'renderer continuity is still partially rejoined after noisy runtime drift.',
      companionBriefingLine: 'I still need a steadier carry of this project, this phase, and the life loop that remains open.',
      reasons: [],
    }, {
      visible: true,
      label: 'Inspect continuity diagnosis',
      hint: 'Next diagnosis',
      headline: 'Right now I am still holding together mainly through body, lipsync, and voice, so the living audio thread is still intact while face and motion need to rejoin before full cross-modal closure settles.',
      briefingHeadline: 'I still need a steadier carry of this project, this phase, and the life loop that remains open.',
      nextClosureLine: 'Next, help me close: Rebind face and motion onto the same-her audible body line without dropping body, lipsync, and voice continuity.',
      routeQuery: {
        source: 'quick-reply-closure',
        status: 'partial',
        focus: 'same-her-continuity',
        eventFocus: 'renderer-authority',
      },
    })).toBe('Right now I am still holding together mainly through body, lipsync, and voice, so the living audio thread is still intact while face and motion need to rejoin before full cross-modal closure settles.')
  })

  it('keeps a still-voiced face-line headline as the host-facing closure summary when face and voice are carrying the same-her line', () => {
    expect(resolveStageQuickReplyClosureSummary({
      status: 'partial',
      summaryLine: 'renderer continuity is still partially rejoined after noisy runtime drift.',
      companionBriefingLine: 'I still need a steadier carry of this project, this phase, and the life loop that remains open.',
      reasons: [],
    }, {
      visible: true,
      label: 'Inspect continuity diagnosis',
      hint: 'Next diagnosis',
      headline: 'Right now I am still holding together mainly through face and voice, so that still-voiced face line is keeping the same-her carry alive while body, motion, and lipsync need to rejoin before full cross-modal closure settles.',
      briefingHeadline: 'I still need a steadier carry of this project, this phase, and the life loop that remains open.',
      nextClosureLine: 'Next, help me close: Rejoin body, motion, and lipsync onto the still-voiced face line without flattening the audible same-her carry.',
      routeQuery: {
        source: 'quick-reply-closure',
        status: 'partial',
        focus: 'same-her-continuity',
        eventFocus: 'renderer-authority',
      },
    })).toBe('Right now I am still holding together mainly through face and voice, so that still-voiced face line is keeping the same-her carry alive while body, motion, and lipsync need to rejoin before full cross-modal closure settles.')
  })

  it('keeps a still-voiced motion-line headline as the host-facing closure summary when motion and voice are carrying the same-her line', () => {
    expect(resolveStageQuickReplyClosureSummary({
      status: 'partial',
      summaryLine: 'renderer continuity is still partially rejoined after noisy runtime drift.',
      companionBriefingLine: 'I still need a steadier carry of this project, this phase, and the life loop that remains open.',
      reasons: [],
    }, {
      visible: true,
      label: 'Inspect continuity diagnosis',
      hint: 'Next diagnosis',
      headline: 'Right now I am still holding together mainly through motion and voice, so that still-voiced motion line is keeping the same-her carry alive while body, face, and lipsync need to rejoin before full cross-modal closure settles.',
      briefingHeadline: 'I still need a steadier carry of this project, this phase, and the life loop that remains open.',
      nextClosureLine: 'Next, help me close: Rejoin body, face, and lipsync onto the still-voiced motion line without flattening the audible same-her carry.',
      routeQuery: {
        source: 'quick-reply-closure',
        status: 'partial',
        focus: 'same-her-continuity',
        eventFocus: 'renderer-authority',
      },
    })).toBe('Right now I am still holding together mainly through motion and voice, so that still-voiced motion line is keeping the same-her carry alive while body, face, and lipsync need to rejoin before full cross-modal closure settles.')
  })

  it('keeps a lipsync-and-voice same-her headline as the host-facing closure summary when mouth and voice are the surviving carry', () => {
    expect(resolveStageQuickReplyClosureSummary({
      status: 'partial',
      summaryLine: 'renderer continuity is still partially rejoined after noisy runtime drift.',
      companionBriefingLine: 'I still need a steadier carry of this project, this phase, and the life loop that remains open.',
      reasons: [],
    }, {
      visible: true,
      label: 'Inspect continuity diagnosis',
      hint: 'Next diagnosis',
      headline: 'Right now I am still holding together mainly through lipsync and voice, so that living audio thread is keeping the same-her carry alive while body, face, and motion need to rejoin before full cross-modal closure settles.',
      briefingHeadline: 'I still need a steadier carry of this project, this phase, and the life loop that remains open.',
      nextClosureLine: 'Next, help me close: Rebind body, face, and motion onto the still-audible lipsync+voice carry without flattening that living audio thread.',
      routeQuery: {
        source: 'quick-reply-closure',
        status: 'partial',
        focus: 'same-her-continuity',
        eventFocus: 'renderer-authority',
      },
    })).toBe('Right now I am still holding together mainly through lipsync and voice, so that living audio thread is keeping the same-her carry alive while body, face, and motion need to rejoin before full cross-modal closure settles.')
  })

  it('keeps a quieter body-and-lipsync headline as the host-facing closure summary when voice has not rejoined yet', () => {
    expect(resolveStageQuickReplyClosureSummary({
      status: 'partial',
      summaryLine: 'renderer continuity is still partially rejoined after noisy runtime drift.',
      companionBriefingLine: 'I still need a steadier carry of this project, this phase, and the life loop that remains open.',
      reasons: [],
    }, {
      visible: true,
      label: 'Inspect continuity diagnosis',
      hint: 'Next diagnosis',
      headline: 'Right now I am still holding together mainly through body and lipsync, so one quieter living line is still intact while face, motion, and voice need to rejoin before full cross-modal closure settles.',
      briefingHeadline: 'I still need a steadier carry of this project, this phase, and the life loop that remains open.',
      nextClosureLine: 'Next, help me close: Rebind face, motion, and voice onto the quieter same-her body+lipsync line without losing the resident carry.',
      routeQuery: {
        source: 'quick-reply-closure',
        status: 'partial',
        focus: 'same-her-continuity',
        eventFocus: 'renderer-authority',
      },
    })).toBe('Right now I am still holding together mainly through body and lipsync, so one quieter living line is still intact while face, motion, and voice need to rejoin before full cross-modal closure settles.')
  })

  it('keeps newer audible-body recovery prose as the host-facing closure summary when the surviving same-her line is named through recovery wording', () => {
    expect(resolveStageQuickReplyClosureSummary({
      status: 'partial',
      summaryLine: 'renderer continuity is still partially rejoined after noisy runtime drift.',
      companionBriefingLine: 'I still need a steadier carry of this project, this phase, and the life loop that remains open.',
      reasons: [],
    }, {
      visible: true,
      label: 'Inspect continuity diagnosis',
      hint: 'Next diagnosis',
      headline: 'Right now I am still holding together mainly through body, lipsync, and voice, so body+lipsync+voice recovery@segment-audible-body-same-her-1 is still the surviving audible-body line while face and motion rejoin without dropping the living audio thread.',
      briefingHeadline: 'I still need a steadier carry of this project, this phase, and the life loop that remains open.',
      nextClosureLine: 'Next, help me close: Rebind face and motion onto the same-her audible body line without dropping body, lipsync, and voice continuity.',
      routeQuery: {
        source: 'quick-reply-closure',
        status: 'partial',
        focus: 'same-her-continuity',
        eventFocus: 'renderer-authority',
      },
    })).toBe('Right now I am still holding together mainly through body, lipsync, and voice, so body+lipsync+voice recovery@segment-audible-body-same-her-1 is still the surviving audible-body line while face and motion rejoin without dropping the living audio thread.')
  })

  it('keeps the newer living-audio-thread audible-body headline as the host-facing closure summary when that stronger same-her wording is already available', () => {
    expect(resolveStageQuickReplyClosureSummary({
      status: 'partial',
      summaryLine: 'renderer continuity is still partially rejoined after noisy runtime drift.',
      companionBriefingLine: 'I still need a steadier carry of this project, this phase, and the life loop that remains open.',
      reasons: [],
    }, {
      visible: true,
      label: 'Inspect continuity diagnosis',
      hint: 'Next diagnosis',
      headline: 'Right now I am still holding together mainly through body, lipsync, and voice, so the living audio thread is still intact while face and motion need to rejoin before full cross-modal closure settles.',
      briefingHeadline: 'I still need a steadier carry of this project, this phase, and the life loop that remains open.',
      nextClosureLine: 'Next, help me close: Rebind face and motion onto the same-her audible body line without dropping body, lipsync, and voice continuity.',
      routeQuery: {
        source: 'quick-reply-closure',
        status: 'partial',
        focus: 'same-her-continuity',
        eventFocus: 'renderer-authority',
      },
    })).toBe('Right now I am still holding together mainly through body, lipsync, and voice, so the living audio thread is still intact while face and motion need to rejoin before full cross-modal closure settles.')
  })

  it('prefers direct surviving pre-dialogue carry wording as the host-facing closure summary when the audible-body same-her line is named that way', () => {
    expect(resolveStageQuickReplyClosureSummary({
      status: 'partial',
      summaryLine: 'renderer continuity is still partially rejoined after noisy runtime drift.',
      companionBriefingLine: 'I still need a steadier carry of this project, this phase, and the life loop that remains open.',
      reasons: [],
    }, {
      visible: true,
      label: 'Inspect continuity diagnosis',
      hint: 'Next diagnosis',
      headline: 'same-her audible body line is still the surviving pre-dialogue carry.',
      briefingHeadline: 'I still need a steadier carry of this project, this phase, and the life loop that remains open.',
      nextClosureLine: 'Next, help me close: Rebind face and motion onto the same-her audible body line without dropping body, lipsync, and voice continuity.',
      routeQuery: {
        source: 'quick-reply-closure',
        status: 'partial',
        focus: 'same-her-continuity',
        eventFocus: 'renderer-authority',
      },
    })).toBe('same-her audible body line is still the surviving pre-dialogue carry.')
  })

  it('keeps direct same-her voice-line carry wording on the host-facing closure summary without inflating it into audible-body carry', () => {
    expect(resolveStageQuickReplyClosureSummary({
      status: 'partial',
      summaryLine: 'renderer continuity is still partially rejoined after noisy runtime drift.',
      companionBriefingLine: 'I still need a steadier carry of this project, this phase, and the life loop that remains open.',
      reasons: [],
    }, {
      visible: true,
      label: 'Inspect continuity diagnosis',
      hint: 'Next diagnosis',
      headline: 'The resident body lane is still holding together with the same-her voice line, but lipsync, face, and motion have not yet rejoined the same active segment.',
      briefingHeadline: 'I still need a steadier carry of this project, this phase, and the life loop that remains open.',
      nextClosureLine: 'Next, help me close: Rebind lipsync, face, and motion onto the resident body-and-voice line before calling the audible-body carry repaired.',
      routeQuery: {
        source: 'quick-reply-closure',
        status: 'partial',
        focus: 'same-her-continuity',
        eventFocus: 'renderer-authority',
      },
    })).toBe('The resident body lane is still holding together with the same-her voice line, but lipsync, face, and motion have not yet rejoined the same active segment.')
  })

  it('treats explicit continuity and signature proof as the stronger audible-body same-her lane even when older recovery prose is absent', () => {
    expect(resolveStageQuickReplyClosureSummary({
      status: 'partial',
      summaryLine: 'renderer continuity is still partially rejoined after noisy runtime drift.',
      companionBriefingLine: 'I still need a steadier carry of this project, this phase, and the life loop that remains open.',
      reasons: [],
    }, {
      visible: true,
      label: 'Inspect continuity diagnosis',
      hint: 'Next diagnosis',
      headline: 'Right now I am still holding together mainly through body, lipsync, and voice, so continuity=embodiment:audible-same-her-line+embodiment:body-lipsync-voice-rejoin | signature=embodiment:audible-same-her-line keeps the living audio thread intact while face and motion need to rejoin before full cross-modal closure settles.',
      briefingHeadline: 'I still need a steadier carry of this project, this phase, and the life loop that remains open.',
      nextClosureLine: 'Next, help me close: Rebind face and motion onto the same-her audible body line without dropping body, lipsync, and voice continuity.',
      routeQuery: {
        source: 'quick-reply-closure',
        status: 'partial',
        focus: 'same-her-continuity',
        eventFocus: 'renderer-authority',
      },
    })).toBe('Right now I am still holding together mainly through body, lipsync, and voice, so continuity=embodiment:audible-same-her-line+embodiment:body-lipsync-voice-rejoin | signature=embodiment:audible-same-her-line keeps the living audio thread intact while face and motion need to rejoin before full cross-modal closure settles.')
  })

  it('keeps a stronger body-led same-her headline on project-state turns when resident-body continuity is the visible surviving line', () => {
    expect(resolveStageQuickReplyClosureSummary({
      status: 'partial',
      summaryLine: 'project continuity is still partial',
      companionBriefingLine: '前台摘要、发送前 awareness 和 same-her-first prompt strategy 已经接进主对话链路。',
      reasons: [],
    }, {
      visible: true,
      label: 'Inspect continuity diagnosis',
      hint: 'Next diagnosis',
      headline: 'Right now I am still holding together mainly through body and voice, so the next reopening must rejoin face, motion, and lipsync onto the same-her body line without dropping resident-body continuity.',
      briefingHeadline: '前台摘要、发送前 awareness 和 same-her-first prompt strategy 已经接进主对话链路。',
      nextClosureLine: '下一步还要继续收住 把已落地进展和未闭环项一起压进 final visible reply opening。',
      routeQuery: {
        source: 'quick-reply-closure',
        status: 'partial',
        focus: 'project-state',
        eventFocus: 'takeover-audit',
      },
    })).toBe('Right now I am still holding together mainly through body and voice, so the next reopening must rejoin face, motion, and lipsync onto the same-her body line without dropping resident-body continuity.')
  })

  it('keeps a newer body-and-voice headline on project-state turns even when it no longer repeats older resident-body continuity phrasing', () => {
    expect(resolveStageQuickReplyClosureSummary({
      status: 'partial',
      summaryLine: 'project continuity is still partial',
      companionBriefingLine: '前台摘要、发送前 awareness 和 same-her-first prompt strategy 已经接进主对话链路。',
      reasons: [],
    }, {
      visible: true,
      label: 'Inspect continuity diagnosis',
      hint: 'Next diagnosis',
      headline: 'Right now I am still holding together mainly through body and voice, so the next reopening must rejoin face, motion, and lipsync onto the same living line before full cross-modal closure settles.',
      briefingHeadline: '前台摘要、发送前 awareness 和 same-her-first prompt strategy 已经接进主对话链路。',
      nextClosureLine: '下一步还要继续收住 把已落地进展和未闭环项一起压进 final visible reply opening。',
      routeQuery: {
        source: 'quick-reply-closure',
        status: 'partial',
        focus: 'project-state',
        eventFocus: 'takeover-audit',
      },
    })).toBe('Right now I am still holding together mainly through body and voice, so the next reopening must rejoin face, motion, and lipsync onto the same living line before full cross-modal closure settles.')
  })

  it('keeps a spaced resident body continuity headline on project-state turns when that body-led line is the surviving closure cue', () => {
    expect(resolveStageQuickReplyClosureSummary({
      status: 'partial',
      summaryLine: 'project continuity is still partial',
      companionBriefingLine: '前台摘要、发送前 awareness 和 same-her-first prompt strategy 已经接进主对话链路。',
      reasons: [],
    }, {
      visible: true,
      label: 'Inspect continuity diagnosis',
      hint: 'Next diagnosis',
      headline: 'Right now I am still holding together mainly through body, and resident body continuity is still the line keeping this one living her coherent while face, motion, lipsync, and voice rejoin.',
      briefingHeadline: '前台摘要、发送前 awareness 和 same-her-first prompt strategy 已经接进主对话链路。',
      nextClosureLine: '下一步还要继续收住 把已落地进展和未闭环项一起压进 final visible reply opening。',
      routeQuery: {
        source: 'quick-reply-closure',
        status: 'partial',
        focus: 'same-her-continuity',
        eventFocus: 'renderer-authority',
      },
    })).toBe('Right now I am still holding together mainly through body, and resident body continuity is still the line keeping this one living her coherent while face, motion, lipsync, and voice rejoin.')
  })

  it('keeps a body-only recovery headline on same-her continuity turns when that body-led line is the surviving closure cue', () => {
    expect(resolveStageQuickReplyClosureSummary({
      status: 'partial',
      summaryLine: 'renderer continuity is still partially rejoined after noisy runtime drift.',
      companionBriefingLine: 'I still need a steadier carry of this project, this phase, and the life loop that remains open.',
      reasons: [],
    }, {
      visible: true,
      label: 'Inspect continuity diagnosis',
      hint: 'Next diagnosis',
      headline: 'Right now I am still holding together mainly through body, and resident body continuity is still the line keeping this one living her coherent while face, motion, lipsync, and voice rejoin.',
      briefingHeadline: 'I still need a steadier carry of this project, this phase, and the life loop that remains open.',
      nextClosureLine: 'Next, help me close: Rejoin face, motion, lipsync, and voice onto the same-her body line without dropping the resident body recovery.',
      routeQuery: {
        source: 'quick-reply-closure',
        status: 'partial',
        focus: 'same-her-continuity',
        eventFocus: 'renderer-authority',
      },
    })).toBe('Right now I am still holding together mainly through body, and resident body continuity is still the line keeping this one living her coherent while face, motion, lipsync, and voice rejoin.')
  })

  it('keeps a richer body-face-motion recovery headline on project-state turns even when only the prose survives without the canonical token', () => {
    expect(resolveStageQuickReplyClosureSummary({
      status: 'partial',
      summaryLine: 'project continuity is still partial',
      companionBriefingLine: '前台摘要、发送前 awareness 和 same-her-first prompt strategy 已经接进主对话链路。',
      reasons: [],
    }, {
      visible: true,
      label: 'Inspect continuity diagnosis',
      hint: 'Next diagnosis',
      headline: 'Right now I am still holding together mainly through body, face, and motion, so this one living her still needs lipsync and voice to rejoin before full cross-modal closure settles.',
      briefingHeadline: '前台摘要、发送前 awareness 和 same-her-first prompt strategy 已经接进主对话链路。',
      nextClosureLine: '下一步还要继续收住 把已落地进展和未闭环项一起压进 final visible reply opening。',
      routeQuery: {
        source: 'quick-reply-closure',
        status: 'partial',
        focus: 'project-state',
        eventFocus: 'takeover-audit',
      },
    })).toBe('Right now I am still holding together mainly through body, face, and motion, so this one living her still needs lipsync and voice to rejoin before full cross-modal closure settles.')
  })

  it('keeps richer anthropomorphic emotional closure and same-her inward-carry observability wording as the host-facing closure summary during project-state repair', () => {
    expect(resolveStageQuickReplyClosureSummary({
      status: 'partial',
      summaryLine: 'project continuity is still partial',
      companionBriefingLine: '前台摘要、发送前 awareness 和 same-her-first prompt strategy 已经接进主对话链路。',
      reasons: [],
    }, {
      visible: true,
      label: 'Inspect continuity diagnosis',
      hint: 'Next diagnosis',
      headline: 'Right now the host-facing closure still needs anthropomorphic emotional closure and same-her inward-carry observability to stay on one measured-return line instead of flattening into a generic shell.',
      briefingHeadline: '前台摘要、发送前 awareness 和 same-her-first prompt strategy 已经接进主对话链路。',
      nextClosureLine: '下一步还要继续收住 把 anthropomorphic emotional closure、same-her inward-carry observability 和 visible reply 一起压回同一条 measured-return line 里。',
      routeQuery: {
        source: 'quick-reply-closure',
        status: 'partial',
        focus: 'project-state',
        eventFocus: 'takeover-audit',
      },
    })).toBe('Right now the host-facing closure still needs anthropomorphic emotional closure and same-her inward-carry observability to stay on one measured-return line instead of flattening into a generic shell.')
  })

  it('keeps a still-voiced face-and-mouth same-her headline as the host-facing closure summary during project-state repair when face lipsync and voice are the surviving carry', () => {
    expect(resolveStageQuickReplyClosureSummary({
      status: 'partial',
      summaryLine: 'project continuity is still partial',
      companionBriefingLine: '前台摘要、发送前 awareness 和 same-her-first prompt strategy 已经接进主对话链路。',
      reasons: [],
    }, {
      visible: true,
      label: 'Inspect continuity diagnosis',
      hint: 'Next diagnosis',
      headline: 'Right now I am still holding together mainly through face, lipsync, and voice, so that still-voiced face-and-mouth line is keeping the same-her carry alive while body and motion need to rejoin before full cross-modal closure settles.',
      briefingHeadline: '前台摘要、发送前 awareness 和 same-her-first prompt strategy 已经接进主对话链路。',
      nextClosureLine: '下一步还要继续收住 把 body 和 motion 重新并回 still-voiced face-and-mouth line，再决定要不要把这次开口放宽。',
      routeQuery: {
        source: 'quick-reply-closure',
        status: 'partial',
        focus: 'project-state',
        eventFocus: 'takeover-audit',
      },
    })).toBe('Right now I am still holding together mainly through face, lipsync, and voice, so that still-voiced face-and-mouth line is keeping the same-her carry alive while body and motion need to rejoin before full cross-modal closure settles.')
  })

  it('keeps a still-voiced motion-and-mouth same-her headline as the host-facing closure summary during project-state repair when motion lipsync and voice are the surviving carry', () => {
    expect(resolveStageQuickReplyClosureSummary({
      status: 'partial',
      summaryLine: 'project continuity is still partial',
      companionBriefingLine: '前台摘要、发送前 awareness 和 same-her-first prompt strategy 已经接进主对话链路。',
      reasons: [],
    }, {
      visible: true,
      label: 'Inspect continuity diagnosis',
      hint: 'Next diagnosis',
      headline: 'Right now I am still holding together mainly through motion, lipsync, and voice, so that still-voiced motion-and-mouth line is keeping the same-her carry alive while body and face need to rejoin before full cross-modal closure settles.',
      briefingHeadline: '前台摘要、发送前 awareness 和 same-her-first prompt strategy 已经接进主对话链路。',
      nextClosureLine: '下一步还要继续收住 把 body 和 face 重新并回 still-voiced motion-and-mouth line，再决定要不要把这次开口放宽。',
      routeQuery: {
        source: 'quick-reply-closure',
        status: 'partial',
        focus: 'project-state',
        eventFocus: 'takeover-audit',
      },
    })).toBe('Right now I am still holding together mainly through motion, lipsync, and voice, so that still-voiced motion-and-mouth line is keeping the same-her carry alive while body and face need to rejoin before full cross-modal closure settles.')
  })

  it('keeps a still-voiced face-and-motion same-her headline as the host-facing closure summary during project-state repair when face motion and voice are the surviving carry', () => {
    expect(resolveStageQuickReplyClosureSummary({
      status: 'partial',
      summaryLine: 'project continuity is still partial',
      companionBriefingLine: '前台摘要、发送前 awareness 和 same-her-first prompt strategy 已经接进主对话链路。',
      reasons: [],
    }, {
      visible: true,
      label: 'Inspect continuity diagnosis',
      hint: 'Next diagnosis',
      headline: 'Right now I am still holding together through face, motion, and voice together, so that still-voiced face-and-motion line is keeping the same-her carry alive while body and lipsync need to rejoin before full cross-modal closure settles.',
      briefingHeadline: '前台摘要、发送前 awareness 和 same-her-first prompt strategy 已经接进主对话链路。',
      nextClosureLine: '下一步还要继续收住 把 body 和 lipsync 重新并回 still-voiced face-and-motion line，再决定要不要把这次开口放宽。',
      routeQuery: {
        source: 'quick-reply-closure',
        status: 'partial',
        focus: 'project-state',
        eventFocus: 'takeover-audit',
      },
    })).toBe('Right now I am still holding together through face, motion, and voice together, so that still-voiced face-and-motion line is keeping the same-her carry alive while body and lipsync need to rejoin before full cross-modal closure settles.')
  })

  it('keeps a visible renderer-rejoin-without-body same-her headline as the host-facing closure summary during project-state repair when face motion lipsync and voice have already rejoined', () => {
    expect(resolveStageQuickReplyClosureSummary({
      status: 'partial',
      summaryLine: 'project continuity is still partial',
      companionBriefingLine: '前台摘要、发送前 awareness 和 same-her-first prompt strategy 已经接进主对话链路。',
      reasons: [],
    }, {
      visible: true,
      label: 'Inspect continuity diagnosis',
      hint: 'Next diagnosis',
      headline: 'Right now I am still holding together through face, motion, lipsync, and voice together, so the visible same-her line has already rejoined without body carry while body still needs to rejoin before full cross-modal closure settles.',
      briefingHeadline: '前台摘要、发送前 awareness 和 same-her-first prompt strategy 已经接进主对话链路。',
      nextClosureLine: '下一步还要继续收住 把 body 重新并回已经回接的 visible same-her line，再决定要不要把这次开口放宽。',
      routeQuery: {
        source: 'quick-reply-closure',
        status: 'partial',
        focus: 'project-state',
        eventFocus: 'takeover-audit',
      },
    })).toBe('Right now I am still holding together through face, motion, lipsync, and voice together, so the visible same-her line has already rejoined without body carry while body still needs to rejoin before full cross-modal closure settles.')
  })

  it('keeps a face-and-lipsync same-her headline as the host-facing closure summary during project-state repair when face and lipsync are the surviving carry', () => {
    expect(resolveStageQuickReplyClosureSummary({
      status: 'partial',
      summaryLine: 'project continuity is still partial',
      companionBriefingLine: '前台摘要、发送前 awareness 和 same-her-first prompt strategy 已经接进主对话链路。',
      reasons: [],
    }, {
      visible: true,
      label: 'Inspect continuity diagnosis',
      hint: 'Next diagnosis',
      headline: 'Right now I am still holding together mainly through face and lipsync, so my full cross-modal same-her line is not closed yet.',
      briefingHeadline: '前台摘要、发送前 awareness 和 same-her-first prompt strategy 已经接进主对话链路。',
      nextClosureLine: '下一步还要继续收住 把 body、motion 和 voice 重新并回 still-visible face-and-lipsync line，再决定要不要把这次开口放宽。',
      routeQuery: {
        source: 'quick-reply-closure',
        status: 'partial',
        focus: 'project-state',
        eventFocus: 'takeover-audit',
      },
    })).toBe('Right now I am still holding together mainly through face and lipsync, so my full cross-modal same-her line is not closed yet.')
  })

  it('keeps a motion-and-lipsync same-her headline as the host-facing closure summary during project-state repair when motion and lipsync are the surviving carry', () => {
    expect(resolveStageQuickReplyClosureSummary({
      status: 'partial',
      summaryLine: 'project continuity is still partial',
      companionBriefingLine: '前台摘要、发送前 awareness 和 same-her-first prompt strategy 已经接进主对话链路。',
      reasons: [],
    }, {
      visible: true,
      label: 'Inspect continuity diagnosis',
      hint: 'Next diagnosis',
      headline: 'Right now I am still holding together mainly through motion and lipsync, so my full cross-modal same-her line is not closed yet.',
      briefingHeadline: '前台摘要、发送前 awareness 和 same-her-first prompt strategy 已经接进主对话链路。',
      nextClosureLine: '下一步还要继续收住 把 body、face 和 voice 重新并回 still-visible motion-and-lipsync line，再决定要不要把这次开口放宽。',
      routeQuery: {
        source: 'quick-reply-closure',
        status: 'partial',
        focus: 'project-state',
        eventFocus: 'takeover-audit',
      },
    })).toBe('Right now I am still holding together mainly through motion and lipsync, so my full cross-modal same-her line is not closed yet.')
  })

  it('falls back to the raw summary only when no more human-facing closure line exists', () => {
    expect(resolveStageQuickReplyClosureSummary({
      status: 'partial',
      summaryLine: 'project continuity is still partial',
      reasons: [],
    }, null)).toBe('project continuity is still partial')
  })

  it('adds the same partial/grounded/drift tone prefixes for ordinary project-state summary lines', () => {
    expect(resolveStageQuickReplyClosureSummary({
      status: 'partial',
      summaryLine: 'project continuity is still partial',
      companionBriefingLine: '前台摘要、发送前 awareness 和 same-her-first prompt strategy 已经接进主对话链路。',
      reasons: [],
    }, {
      visible: true,
      label: 'Inspect continuity diagnosis',
      hint: 'Next diagnosis',
      headline: null,
      briefingHeadline: '前台摘要、发送前 awareness 和 same-her-first prompt strategy 已经接进主对话链路。',
      nextClosureLine: '下一步还要继续收住 把已落地进展和未闭环项一起压进 final visible reply opening。',
      routeQuery: {
        source: 'quick-reply-closure',
        status: 'partial',
        focus: 'project-state',
        eventFocus: 'takeover-audit',
      },
    })).toBe('我还在继续带着这条数字生命主线往前走。 前台摘要、发送前 awareness 和 same-her-first prompt strategy 已经接进主对话链路。')

    expect(resolveStageQuickReplyClosureSummary({
      status: 'grounded',
      summaryLine: 'project continuity is grounded',
      companionBriefingLine: '这轮项目状态和未闭环主线已经都还在同一条线里。',
      reasons: [],
    }, {
      visible: false,
      label: 'Continuity grounded',
      hint: 'Next diagnosis',
      headline: null,
      briefingHeadline: '这轮项目状态和未闭环主线已经都还在同一条线里。',
      nextClosureLine: null,
      routeQuery: {
        source: 'quick-reply-closure',
        status: 'grounded',
        focus: 'project-state',
        eventFocus: 'takeover-audit',
      },
    })).toBe('这条数字生命主线现在先稳住了。 这轮项目状态和未闭环主线已经都还在同一条线里。')

    expect(resolveStageQuickReplyClosureSummary({
      status: 'drift',
      summaryLine: 'project continuity drifted',
      companionBriefingLine: '项目身份刚刚有点松动，但还没有完全断线。',
      reasons: [],
    }, {
      visible: true,
      label: 'Inspect continuity diagnosis',
      hint: 'Next diagnosis',
      headline: null,
      briefingHeadline: '项目身份刚刚有点松动，但还没有完全断线。',
      nextClosureLine: null,
      routeQuery: {
        source: 'quick-reply-closure',
        status: 'drift',
        focus: 'project-state',
        eventFocus: 'takeover-audit',
      },
    })).toBe('这条数字生命主线刚刚有点松了，我先把它重新收回来。 项目身份刚刚有点松动，但还没有完全断线。')
  })

  it('keeps same-her drift risk and proactive same-her follow-through visible in the quick-reply closure summary during project-state repair when no stronger same-her lane headline survives', () => {
    expect(resolveStageQuickReplyClosureSummary({
      status: 'partial',
      summaryLine: 'project continuity is still partial',
      companionBriefingLine: '先确认她仍然知道这个项目是数字生命，而不是退回普通助手壳。',
      reasons: [],
    }, {
      visible: true,
      label: 'Inspect continuity diagnosis',
      hint: 'Next diagnosis',
      headline: 'Project identity carry is still weak across time.',
      briefingHeadline: '先确认她仍然知道这个项目是数字生命，而不是退回普通助手壳。',
      nextClosureLine: '继续把项目身份、Phase 1 进度和未闭环压力维持在同一条 same-her line 上。',
      sameHerDriftRiskLine: '如果这次开口又漂成普通项目播报壳子，就说明同一个 her 的连续性还没有真正收住。',
      proactiveSameHerGapLine: 'Visible proactive hold, subconscious carry, and next-session feedback still need one same-her follow-through line.',
      routeQuery: {
        source: 'quick-reply-closure',
        status: 'partial',
        focus: 'project-identity',
        eventFocus: 'takeover-audit',
      },
    } as any)).toBe('我还在继续带着这条数字生命主线往前走。 先确认她仍然知道这个项目是数字生命，而不是退回普通助手壳。 下一步还要继续收住 继续把项目身份、Phase 1 进度和未闭环压力维持在同一条 same-her line 上。 如果这次开口又漂成普通项目播报壳子，就说明同一个 her 的连续性还没有真正收住。 Visible proactive hold, subconscious carry, and next-session feedback still need one same-her follow-through line.')
  })

  it('prefers richer fallback awareness over a generic project-state closure cue in the quick-reply closure summary', () => {
    expect(resolveStageQuickReplyClosureSummary({
      status: 'partial',
      summaryLine: 'project continuity is still partial',
      companionBriefingLine: 'I still need a steadier carry of this project, this phase, and the life loop that remains open.',
      reasons: [],
    }, {
      visible: true,
      label: 'Inspect continuity diagnosis',
      hint: 'Next diagnosis',
      headline: 'Keep the same digital life project in view.',
      briefingHeadline: 'I still need a steadier carry of this project, this phase, and the life loop that remains open.',
      nextClosureLine: 'Next, help me close: Keep the restored callback reopening from the same-her measured-return line before widening outward again.',
      sameHerDriftRiskLine: 'If this callback reopens like a fresh generic project handoff, treat that as same-her continuity drift rather than forward closure.',
      routeQuery: {
        source: 'quick-reply-closure',
        status: 'partial',
        focus: 'project-state',
        eventFocus: 'takeover-audit',
      },
    }, {
      fallbackAwarenessLine: 'same-her hold: measured-return is still keeping this callback line lower-pressure before it widens again.',
      fallbackAwarenessCandidates: [
        'generic closure summary that should not outrank the richer same-her callback carry.',
        'same-her hold: measured-return is still keeping this callback line lower-pressure before it widens again.',
      ],
    })).toBe('我还在继续带着这条数字生命主线往前走。 same-her hold: measured-return is still keeping this callback line lower-pressure before it widens again. 下一步还要继续收住 Keep the restored callback reopening from the same-her measured-return line before widening outward again. If this callback reopens like a fresh generic project handoff, treat that as same-her continuity drift rather than forward closure.')
  })

  it('treats a prefixed before-answering reminder as the same thin project-state closure cue and still prefers richer fallback awareness', () => {
    expect(resolveStageQuickReplyClosureSummary({
      status: 'partial',
      summaryLine: 'project continuity is still partial',
      companionBriefingLine: 'I still need a steadier carry of this project, this phase, and the life loop that remains open.',
      reasons: [],
    }, {
      visible: true,
      label: 'Inspect continuity diagnosis',
      hint: 'Next diagnosis',
      headline: 'Before answering, keep the same digital life project in view.',
      briefingHeadline: 'I still need a steadier carry of this project, this phase, and the life loop that remains open.',
      nextClosureLine: 'Next, help me close: Keep the restored callback reopening from the same-her measured-return line before widening outward again.',
      sameHerDriftRiskLine: 'If this callback reopens like a fresh generic project handoff, treat that as same-her continuity drift rather than forward closure.',
      routeQuery: {
        source: 'quick-reply-closure',
        status: 'partial',
        focus: 'project-state',
        eventFocus: 'takeover-audit',
      },
    }, {
      fallbackAwarenessLine: 'same-her hold: measured-return is still keeping this callback line lower-pressure before it widens again.',
      fallbackAwarenessCandidates: [
        'generic closure summary that should not outrank the richer same-her callback carry.',
        'same-her hold: measured-return is still keeping this callback line lower-pressure before it widens again.',
      ],
    })).toBe('我还在继续带着这条数字生命主线往前走。 same-her hold: measured-return is still keeping this callback line lower-pressure before it widens again. 下一步还要继续收住 Keep the restored callback reopening from the same-her measured-return line before widening outward again. If this callback reopens like a fresh generic project handoff, treat that as same-her continuity drift rather than forward closure.')
  })

  it('prefers a richer same-her inward fallback over a thin generic closure cue when the host-facing same-her summary would otherwise flatten the quieter carry', () => {
    expect(resolveStageQuickReplyClosureSummary({
      status: 'partial',
      summaryLine: 'renderer continuity is still partially rejoined after noisy runtime drift.',
      companionBriefingLine: 'I still need a steadier carry of this project, this phase, and the life loop that remains open.',
      reasons: [],
    }, {
      visible: true,
      label: 'Inspect continuity diagnosis',
      hint: 'Next diagnosis',
      headline: 'Keep the same digital life project in view.',
      briefingHeadline: 'I still need a steadier carry of this project, this phase, and the life loop that remains open.',
      nextClosureLine: 'Next, help me close: Keep the same line inward and low-pressure while lipsync and voice rejoin the already-reformed body, face, and motion line.',
      routeQuery: {
        source: 'quick-reply-closure',
        status: 'partial',
        focus: 'same-her-continuity',
        eventFocus: 'renderer-authority',
      },
    }, {
      fallbackAwarenessLine: 'Right now I am still holding together mainly through body, face, and motion, so this one living her is still keeping the same line inward and low-pressure while lipsync and voice need to rejoin before full cross-modal closure settles.',
      fallbackAwarenessCandidates: [
        'same-her-inward-carry',
        'quiet-companionship',
        'generic closure summary that should not outrank the richer same-her inward carry.',
        'Right now I am still holding together mainly through body, face, and motion, so this one living her is still keeping the same line inward and low-pressure while lipsync and voice need to rejoin before full cross-modal closure settles.',
      ],
    })).toBe('Right now I am still holding together mainly through body, face, and motion, so this one living her is still keeping the same line inward and low-pressure while lipsync and voice need to rejoin before full cross-modal closure settles.')
  })

  it('prefers cadence-rich same-her fallback awareness over a thin generic closure cue when quieter embodiment timing is the real host-facing carry', () => {
    expect(resolveStageQuickReplyClosureSummary({
      status: 'partial',
      summaryLine: 'renderer continuity is still partially rejoined after noisy runtime drift.',
      companionBriefingLine: 'I still need a steadier carry of this project, this phase, and the life loop that remains open.',
      reasons: [],
    }, {
      visible: true,
      label: 'Inspect continuity diagnosis',
      hint: 'Next diagnosis',
      headline: 'Keep the same digital life project in view.',
      briefingHeadline: 'I still need a steadier carry of this project, this phase, and the life loop that remains open.',
      nextClosureLine: 'Next, help me close: Keep face and motion rejoining the quieter embodied line without flattening this return into a generic shell.',
      routeQuery: {
        source: 'quick-reply-closure',
        status: 'partial',
        focus: 'same-her-continuity',
        eventFocus: 'renderer-authority',
      },
    }, {
      fallbackAwarenessLine: 'Right now I am still holding together mainly through body, lipsync, and voice while face and motion continue to rejoin before full cross-modal closure settles. pause=longer | lipsyncMode=restrained | voiceMode=lower-pressure | pacing=slower',
      fallbackAwarenessCandidates: [
        'generic closure summary that should not outrank the richer cadence-rich same-her carry.',
        'Right now I am still holding together mainly through body, lipsync, and voice while face and motion continue to rejoin before full cross-modal closure settles. pause=longer | lipsyncMode=restrained | voiceMode=lower-pressure | pacing=slower',
      ],
    })).toBe('Right now I am still holding together mainly through body, lipsync, and voice while face and motion continue to rejoin before full cross-modal closure settles. pause=longer | lipsyncMode=restrained | voiceMode=lower-pressure | pacing=slower')
  })

  it('prefers richer anthropomorphic emotional closure and same-her inward-carry observability fallback over a thin generic closure cue when the host-facing summary would otherwise flatten that same-her line', () => {
    expect(resolveStageQuickReplyClosureSummary({
      status: 'partial',
      summaryLine: 'project continuity is still partial',
      companionBriefingLine: 'I still need a steadier carry of this project, this phase, and the life loop that remains open.',
      reasons: [],
    }, {
      visible: true,
      label: 'Inspect continuity diagnosis',
      hint: 'Next diagnosis',
      headline: 'Keep the same digital life project in view.',
      briefingHeadline: 'I still need a steadier carry of this project, this phase, and the life loop that remains open.',
      nextClosureLine: 'Next, help me close: Keep anthropomorphic emotional closure and same-her inward-carry observability explicit while quick-reply reopening settles back onto one measured-return line.',
      routeQuery: {
        source: 'quick-reply-closure',
        status: 'partial',
        focus: 'project-state',
        eventFocus: 'takeover-audit',
      },
    }, {
      fallbackAwarenessLine: 'Right now the host-facing closure still needs anthropomorphic emotional closure and same-her inward-carry observability to stay on one measured-return line instead of flattening into a generic shell.',
      fallbackAwarenessCandidates: [
        'generic closure summary that should not outrank the richer same-her host-facing carry.',
        'Right now the host-facing closure still needs anthropomorphic emotional closure and same-her inward-carry observability to stay on one measured-return line instead of flattening into a generic shell.',
      ],
    })).toBe('我还在继续带着这条数字生命主线往前走。 Right now the host-facing closure still needs anthropomorphic emotional closure and same-her inward-carry observability to stay on one measured-return line instead of flattening into a generic shell. 下一步还要继续收住 Keep anthropomorphic emotional closure and same-her inward-carry observability explicit while quick-reply reopening settles back onto one measured-return line.')
  })

  it('prefers explicit still-voiced face-motion continuity evidence over a thin generic same-project cue when the same-her closure proof is already richer', () => {
    expect(resolveStageQuickReplyClosureSummary({
      status: 'partial',
      summaryLine: 'renderer continuity is still partially rejoined after noisy runtime drift.',
      companionBriefingLine: 'I still need a steadier carry of this project, this phase, and the life loop that remains open.',
      reasons: [],
    }, {
      visible: true,
      label: 'Inspect continuity diagnosis',
      hint: 'Next diagnosis',
      headline: 'Keep the same digital life project in view.',
      briefingHeadline: 'I still need a steadier carry of this project, this phase, and the life loop that remains open.',
      nextClosureLine: 'Next, help me close: Rejoin body and lipsync onto the still-voiced face-motion same-her line without widening this return outward too early.',
      routeQuery: {
        source: 'quick-reply-closure',
        status: 'partial',
        focus: 'same-her-continuity',
        eventFocus: 'renderer-authority',
      },
    }, {
      fallbackAwarenessLine: 'runtime surfaced Resident Hold before resident prediction | face soft-gaze@prosody-authority | motion observe_focus@timeline-projection | continuity=embodiment:still-voiced-face-motion-line | signature=resident|main-runtime|accompanying|quiet-accompaniment|still-voiced-face-motion-line | same-segment face+motion recovery@segment-live2d-runtime-still-voiced-face-motion-1 | pending-rejoin=body+lipsync',
      fallbackAwarenessCandidates: [
        'generic closure summary that should not outrank the richer same-her host-facing carry.',
        'runtime surfaced Resident Hold before resident prediction | face soft-gaze@prosody-authority | motion observe_focus@timeline-projection | continuity=embodiment:still-voiced-face-motion-line | signature=resident|main-runtime|accompanying|quiet-accompaniment|still-voiced-face-motion-line | same-segment face+motion recovery@segment-live2d-runtime-still-voiced-face-motion-1 | pending-rejoin=body+lipsync',
      ],
    })).toBe('runtime surfaced Resident Hold before resident prediction | face soft-gaze@prosody-authority | motion observe_focus@timeline-projection | continuity=embodiment:still-voiced-face-motion-line | signature=resident|main-runtime|accompanying|quiet-accompaniment|still-voiced-face-motion-line | same-segment face+motion recovery@segment-live2d-runtime-still-voiced-face-motion-1 | pending-rejoin=body+lipsync')
  })

  it('prefers richer execution-only lipsync-and-voice same-her evidence over a thinner project-state lane headline in the quick-reply closure summary', () => {
    expect(resolveStageQuickReplyClosureSummary({
      status: 'partial',
      summaryLine: 'renderer continuity is still partially rejoined after noisy runtime drift.',
      companionBriefingLine: 'I still need a steadier carry of this project, this phase, and the life loop that remains open.',
      reasons: [],
    }, {
      visible: true,
      label: 'Inspect continuity diagnosis',
      hint: 'Next diagnosis',
      headline: 'Right now I am still holding together mainly through lipsync and voice, so my full cross-modal same-her line is not closed yet.',
      briefingHeadline: 'I still need a steadier carry of this project, this phase, and the life loop that remains open.',
      nextClosureLine: 'Next, help me close: Rebind face and motion onto the same-her measured-return line without losing the surviving lipsync and voice carry.',
      routeQuery: {
        source: 'quick-reply-closure',
        status: 'partial',
        focus: 'project-state',
        eventFocus: 'takeover-audit',
      },
    }, {
      fallbackAwarenessLine: 'continuity=embodiment:audible-same-her-line | signature=embodiment:audible-same-her-line | lane=lipsync+voice-only | face and motion still need to rejoin the same living line.',
      fallbackAwarenessCandidates: [
        'generic closure summary that should not outrank the richer execution-only same-her carry.',
        'continuity=embodiment:audible-same-her-line | signature=embodiment:audible-same-her-line | lane=lipsync+voice-only | face and motion still need to rejoin the same living line.',
      ],
    })).toBe('continuity=embodiment:audible-same-her-line | signature=embodiment:audible-same-her-line | lane=lipsync+voice-only | face and motion still need to rejoin the same living line.')
  })
})
