import { describe, expect, it } from 'vitest'

import {
  isAlicizationThinProjectAwarenessLine,
  resolveAlicizationProjectPreDialogueAwarenessLine,
  scoreAlicizationProjectAwarenessLine,
} from './alicization-project-awareness'

describe('alicization project awareness', () => {
  it('does not promote project-state fields into provider-facing awareness', () => {
    const resolved = resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: {
        identity: 'project identity',
        currentPhase: 'current phase',
        latestLandedProgress: 'latest progress',
        primaryOpenLoop: 'open loop',
        nextClosureTarget: 'next target',
        preDialogueAwarenessLine: 'same-her=legacy',
        preflightSummary: 'same-her=legacy',
        sameHerSelfLine: 'same-her=legacy',
        continuityRestraint: 'measured-return',
      },
    })

    expect(resolved).toBeNull()
  })

  it('does not convert legacy awareness prose into structured embodiment evidence', () => {
    const resolved = resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: {
        preDialogueAwarenessLine: 'same-her=legacy',
        companionHeadlineLine: 'same-her=legacy',
        companionBriefingLine: 'same-her=legacy',
        sameHerHoldDetail: 'same-her=legacy',
        continuityCue: 'same-her=legacy',
      },
      fallbackProjectState: {
        preDialogueAwarenessLine: 'same-her=legacy',
      },
    })

    expect(resolved).toBeNull()
  })

  it('preserves an explicit non-governance observation when one is already supplied', () => {
    const resolved = resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: {
        awarenessLine: 'The user returned to the same code file and asked a direct question.',
      },
    })

    expect(resolved).toBe('The user returned to the same code file and asked a direct question.')
  })

  it('prefers a natural observation over legacy governance cues', () => {
    const naturalObservation = 'The user returned to the memory settings page and asked about semantic retrieval.'
    const legacy = 'same-her=legacy'

    expect(scoreAlicizationProjectAwarenessLine(naturalObservation)).toBeGreaterThan(0)
    expect(scoreAlicizationProjectAwarenessLine(legacy)).toBeLessThan(
      scoreAlicizationProjectAwarenessLine(naturalObservation),
    )
  })

  it('does not reward renderer signatures or recovery prose as awareness evidence', () => {
    const naturalObservation = 'The user returned to the same code file and asked a direct question about memory retrieval.'
    const legacyRendererCues = [
      'signature=resident|main-runtime|accompanying|quiet-accompaniment|still-voiced-motion-line',
      'same-segment face+motion+body recovery@segment-legacy | remaining-open=lipsync+voice',
      'continuity=embodiment:still-voiced-face-line | actual source is face and voice',
    ]

    for (const legacyRendererCue of legacyRendererCues) {
      expect(scoreAlicizationProjectAwarenessLine(legacyRendererCue)).toBeLessThan(
        scoreAlicizationProjectAwarenessLine(naturalObservation),
      )
      expect(isAlicizationThinProjectAwarenessLine(legacyRendererCue)).toBe(true)
    }
  })

  it('treats empty or governance-only awareness as thin', () => {
    expect(isAlicizationThinProjectAwarenessLine(null)).toBe(true)
    expect(isAlicizationThinProjectAwarenessLine('same-her=legacy')).toBe(true)
    expect(isAlicizationThinProjectAwarenessLine('')).toBe(true)
  })
})
