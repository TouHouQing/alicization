import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

describe('performance visualizer VRM frame summary wiring', () => {
  it('surfaces the same-her execution evidence in the Live2D authority comparison section', () => {
    const source = readFileSync(new URL('./performance-visualizer.vue', import.meta.url), 'utf8')
    const live2dAuthoritySection = source.slice(
      source.indexOf('formatSpeechDisplayText(\'live2d-authority-comparison\')'),
      source.indexOf('formatSpeechDisplayText(\'vrm-authority-comparison\')'),
    )

    expect(live2dAuthoritySection).toContain('formatSpeechDisplayText(\'same-her-execution-summary\')')
    expect(live2dAuthoritySection).toContain('formatSpeechDisplayText(\'same-her-execution-aligned\')')
    expect(live2dAuthoritySection).toContain('formatSpeechDisplayText(\'same-her-execution-mismatch-drivers\')')
    expect(live2dAuthoritySection).toContain('formatSpeechDisplayText(\'consumed-voice-summary\')')
    expect(live2dAuthoritySection).toContain('formatSpeechDisplayText(\'voice-source\')')
    expect(live2dAuthoritySection).toContain('formatSpeechDisplayText(\'voice-segment-aligned\')')
    expect(live2dAuthoritySection).toContain('live2dAuthorityComparisonView.sameHerExecutionSummary')
    expect(live2dAuthoritySection).toContain('live2dAuthorityComparisonView.sameHerExecutionAligned')
    expect(live2dAuthoritySection).toContain('live2dAuthorityComparisonView.sameHerExecutionMismatchDrivers')
    expect(live2dAuthoritySection).toContain('live2dAuthorityComparisonView.consumedVoiceSummary')
    expect(live2dAuthoritySection).toContain('live2dAuthorityComparisonView.voiceSource')
    expect(live2dAuthoritySection).toContain('live2dAuthorityComparisonView.voiceSegmentAligned')
  })

  it('surfaces the same-her frame summary in the VRM update section', () => {
    const source = readFileSync(new URL('./performance-visualizer.vue', import.meta.url), 'utf8')
    const vrmSection = source.slice(
      source.indexOf('formatSpeechDisplayText(\'vrm-update-frame\')'),
      source.indexOf('formatSpeechDisplayText(\'fade-on-hover-hit-test\')'),
    )

    expect(vrmSection).toContain('formatSpeechDisplayText(\'same-her-frame-summary\')')
    expect(vrmSection).toContain('vrmUpdate.sameHerFrameSummary')
  })

  it('surfaces the same-her frame evidence in the VRM authority comparison section', () => {
    const source = readFileSync(new URL('./performance-visualizer.vue', import.meta.url), 'utf8')
    const vrmAuthoritySection = source.slice(
      source.indexOf('formatSpeechDisplayText(\'vrm-authority-comparison\')'),
      source.indexOf('formatSpeechDisplayText(\'authority-summary\')'),
    )

    expect(vrmAuthoritySection).toContain('formatSpeechDisplayText(\'same-her-frame-summary\')')
    expect(vrmAuthoritySection).toContain('formatSpeechDisplayText(\'same-her-frame-aligned\')')
    expect(vrmAuthoritySection).toContain('formatSpeechDisplayText(\'same-her-frame-mismatch-drivers\')')
    expect(vrmAuthoritySection).toContain('formatSpeechDisplayText(\'consumed-voice-summary\')')
    expect(vrmAuthoritySection).toContain('formatSpeechDisplayText(\'voice-source\')')
    expect(vrmAuthoritySection).toContain('formatSpeechDisplayText(\'voice-segment-aligned\')')
    expect(vrmAuthoritySection).toContain('vrmAuthorityComparisonView.sameHerFrameSummary')
    expect(vrmAuthoritySection).toContain('vrmAuthorityComparisonView.sameHerFrameAligned')
    expect(vrmAuthoritySection).toContain('vrmAuthorityComparisonView.sameHerFrameMismatchDrivers')
    expect(vrmAuthoritySection).toContain('vrmAuthorityComparisonView.consumedVoiceSummary')
    expect(vrmAuthoritySection).toContain('vrmAuthorityComparisonView.voiceSource')
    expect(vrmAuthoritySection).toContain('vrmAuthorityComparisonView.voiceSegmentAligned')
  })
})
