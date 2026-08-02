import { describe, expect, it } from 'vitest'

import {
  buildAlicizationScreenSurfaceCue,
  isWeakAlicizationScreenSurfaceCue,
  isWeakAlicizationScreenSurfaceTarget,
} from './alicization-screen-surface'

describe('alicization-screen-surface', () => {
  it('drops shell labels and prefers the richest grounded scene cue', () => {
    const cue = buildAlicizationScreenSurfaceCue({
      rawCues: [
        'Code | Code | Screen 1 | IDE with Spring AI Java chat and anime character',
        'Screen 1',
      ],
      target: {
        appName: 'Code',
        processName: 'Code',
        title: 'Screen 1',
      },
      scenario: 'coding',
      workloadKind: 'coding',
      contentKind: 'unknown',
    })

    expect(cue).toBe('IDE with Spring AI Java chat and anime character')
  })

  it('prefers semantic scene summaries over derived app-title shells', () => {
    const cue = buildAlicizationScreenSurfaceCue({
      rawCues: [
        'VS Code diff with a removed null guard',
        'The removed null guard is the active bug in this diff.',
      ],
      target: {
        appName: 'Visual Studio Code',
        processName: 'Code',
        title: 'review.diff - Project Alice',
      },
      scenario: 'coding',
      workloadKind: 'coding',
      contentKind: 'diff',
    })

    expect(cue).toContain('removed null guard')
  })

  it('falls back to a structural descriptor when only a shell label exists', () => {
    const cue = buildAlicizationScreenSurfaceCue({
      rawCues: ['Screen 1'],
      target: {
        title: 'Screen 1',
      },
      scenario: 'coding',
      workloadKind: 'coding',
      contentKind: 'diff',
    })

    expect(cue).toBe('diff view')
  })

  it('marks generic shell labels as weak screen cues', () => {
    expect(isWeakAlicizationScreenSurfaceCue('Screen 1')).toBe(true)
    expect(isWeakAlicizationScreenSurfaceCue('Entire screen')).toBe(true)
    expect(isWeakAlicizationScreenSurfaceCue('current screen')).toBe(true)
    expect(isWeakAlicizationScreenSurfaceCue('diff view')).toBe(true)
    expect(isWeakAlicizationScreenSurfaceCue('idea · Screen 1')).toBe(true)
    expect(isWeakAlicizationScreenSurfaceCue('Code · Screen 2')).toBe(true)
    expect(isWeakAlicizationScreenSurfaceCue('IntelliJ IDEA with Java project and git diff')).toBe(false)
    expect(isWeakAlicizationScreenSurfaceCue('VS Code runtime.ts diff')).toBe(false)
  })

  it('does not classify natural-language scene facts by retired cue wording', () => {
    expect(isWeakAlicizationScreenSurfaceCue(
      'The current knot is the runtime.ts embedding failure.',
    )).toBe(false)
  })

  it('marks shell-only foreground targets as weak but keeps concrete coding targets', () => {
    expect(isWeakAlicizationScreenSurfaceTarget({
      appName: 'Google Chrome',
      processName: 'Google Chrome',
      title: '',
    })).toBe(true)

    expect(isWeakAlicizationScreenSurfaceTarget({
      appName: 'idea',
      processName: 'idea',
      title: 'Screen 1',
    })).toBe(true)

    expect(isWeakAlicizationScreenSurfaceTarget({
      appName: 'Visual Studio Code',
      processName: 'Code',
      title: 'runtime.ts - Project Alice',
    })).toBe(false)
  })
})
