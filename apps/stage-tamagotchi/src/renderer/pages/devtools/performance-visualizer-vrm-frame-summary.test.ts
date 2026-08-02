import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

describe('performance visualizer VRM frame summary wiring', () => {
  it('surfaces the continuity execution evidence in the Live2D authority comparison section', () => {
    const source = readFileSync(new URL('./performance-visualizer.vue', import.meta.url), 'utf8')
    const live2dAuthoritySection = source.slice(
      source.indexOf('formatSpeechDisplayText(\'live2d-authority-comparison\')'),
      source.indexOf('formatSpeechDisplayText(\'vrm-authority-comparison\')'),
    )

    expect(live2dAuthoritySection).toContain('formatSpeechDisplayText(\'continuity-execution-summary\')')
    expect(live2dAuthoritySection).toContain('formatSpeechDisplayText(\'continuity-execution-aligned\')')
    expect(live2dAuthoritySection).toContain('formatSpeechDisplayText(\'continuity-execution-mismatch-drivers\')')
    expect(live2dAuthoritySection).toContain('formatSpeechDisplayText(\'consumed-voice-summary\')')
    expect(live2dAuthoritySection).toContain('formatSpeechDisplayText(\'voice-source\')')
    expect(live2dAuthoritySection).toContain('formatSpeechDisplayText(\'voice-segment-aligned\')')
    expect(live2dAuthoritySection).toContain('live2dAuthorityComparisonView.continuityExecutionSummary')
    expect(live2dAuthoritySection).toContain('live2dAuthorityComparisonView.continuityExecutionAligned')
    expect(live2dAuthoritySection).toContain('live2dAuthorityComparisonView.continuityExecutionMismatchDrivers')
    expect(live2dAuthoritySection).toContain('live2dAuthorityComparisonView.consumedVoiceSummary')
    expect(live2dAuthoritySection).toContain('live2dAuthorityComparisonView.voiceSource')
    expect(live2dAuthoritySection).toContain('live2dAuthorityComparisonView.voiceSegmentAligned')
  })

  it('surfaces the continuity frame summary in the VRM update section', () => {
    const source = readFileSync(new URL('./performance-visualizer.vue', import.meta.url), 'utf8')
    const vrmSection = source.slice(
      source.indexOf('formatSpeechDisplayText(\'vrm-update-frame\')'),
      source.indexOf('formatSpeechDisplayText(\'fade-on-hover-hit-test\')'),
    )

    expect(vrmSection).toContain('formatSpeechDisplayText(\'continuity-frame-summary\')')
    expect(vrmSection).toContain('vrmUpdate.continuityFrameSummary')
  })

  it('surfaces the continuity frame evidence in the VRM authority comparison section', () => {
    const source = readFileSync(new URL('./performance-visualizer.vue', import.meta.url), 'utf8')
    const vrmAuthoritySection = source.slice(
      source.indexOf('formatSpeechDisplayText(\'vrm-authority-comparison\')'),
      source.indexOf('formatSpeechDisplayText(\'authority-summary\')'),
    )

    expect(vrmAuthoritySection).toContain('formatSpeechDisplayText(\'continuity-frame-summary\')')
    expect(vrmAuthoritySection).toContain('formatSpeechDisplayText(\'continuity-frame-aligned\')')
    expect(vrmAuthoritySection).toContain('formatSpeechDisplayText(\'continuity-frame-mismatch-drivers\')')
    expect(vrmAuthoritySection).toContain('formatSpeechDisplayText(\'consumed-voice-summary\')')
    expect(vrmAuthoritySection).toContain('formatSpeechDisplayText(\'voice-source\')')
    expect(vrmAuthoritySection).toContain('formatSpeechDisplayText(\'voice-segment-aligned\')')
    expect(vrmAuthoritySection).toContain('vrmAuthorityComparisonView.continuityFrameSummary')
    expect(vrmAuthoritySection).toContain('vrmAuthorityComparisonView.continuityFrameAligned')
    expect(vrmAuthoritySection).toContain('vrmAuthorityComparisonView.continuityFrameMismatchDrivers')
    expect(vrmAuthoritySection).toContain('vrmAuthorityComparisonView.consumedVoiceSummary')
    expect(vrmAuthoritySection).toContain('vrmAuthorityComparisonView.voiceSource')
    expect(vrmAuthoritySection).toContain('vrmAuthorityComparisonView.voiceSegmentAligned')
  })
})
