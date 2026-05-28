import { describe, expect, it } from 'vitest'

import {
  formatRecentDrivingTraceDetailLine,
  formatRecentDrivingTraceHeading,
} from './performance-visualizer-trace-display'

describe('performance visualizer trace display', () => {
  it('maps recent driving trace headings into Chinese-first event labels while preserving timestamps', () => {
    expect(formatRecentDrivingTraceHeading('governance-normalized @ 2430')).toBe('治理归位 @ 2430')
    expect(formatRecentDrivingTraceHeading('person-state-updated @ 2468')).toBe('人格状态更新 @ 2468')
    expect(formatRecentDrivingTraceHeading('presence-pulse-dispatched @ 2469')).toBe('存在脉冲已派发 @ 2469')
    expect(formatRecentDrivingTraceHeading('unknown-kind @ 111')).toBe('unknown-kind @ 111')
  })

  it('maps recent driving trace detail labels into Chinese-first display text while preserving values', () => {
    expect(formatRecentDrivingTraceDetailLine('scenario: late-night-fatigue')).toBe('场景: late-night-fatigue')
    expect(formatRecentDrivingTraceDetailLine('stance: observe-first')).toBe('姿态: observe-first')
    expect(formatRecentDrivingTraceDetailLine('sourceTrail: fatigue, care, grounded-recall')).toBe('来源链: fatigue, care, grounded-recall')
    expect(formatRecentDrivingTraceDetailLine('unknownLabel: value')).toBe('unknownLabel: value')
  })
})
