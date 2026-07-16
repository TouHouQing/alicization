import { describe, expect, it } from 'vitest'

import {
  mergePreferredSelfContinuityAuthority,
  resolvePreferredPersonStateProjection,
  resolvePreferredSelfContinuityAuthority,
} from './person-state-projection-resolution'

describe('resolvePreferredPersonStateProjection', () => {
  it('prefers runtime projection when quiet-companionship carry is the fresher same-line continuity signal', () => {
    const preferred = resolvePreferredPersonStateProjection({
      bundleProjection: {
        activeClosenessContext: 'focused-work',
        activeClosenessRung: 'measured-room',
        relationshipPosture: 'restrained',
        openingGuidance: 'Stay gentle.',
        manifestationCadenceSummary: 'calm and steady',
        summary: 'A generally calm projection.',
      },
      runtimeProjection: {
        activeClosenessContext: 'focused-work',
        activeClosenessRung: 'measured-room',
        relationshipPosture: 'restrained',
        openingGuidance: 'Stay in quiet-companionship for now.',
        manifestationCadenceSummary: 'quiet-companionship',
        summary: 'quiet-companionship stays present.',
      },
    })

    expect(preferred?.openingGuidance).toContain('quiet-companionship')
    expect(preferred).not.toBeNull()
  })

  it('keeps remembered-seam more-room opening guidance from the bundle when a structurally richer runtime projection only carries generic low-pressure wording', () => {
    const preferred = resolvePreferredPersonStateProjection({
      bundleProjection: {
        activeClosenessContext: 'late-night-care',
        activeClosenessRung: 'nearby-soft',
        relationshipPosture: 'warm',
        openingGuidance: 'Recognize the same remembered seam, but keep more room this time because it reopened too eagerly before.',
        manifestationCadenceSummary: 'recognize the same remembered seam, but keep more room this time because it reopened too eagerly before',
        summary: 'remembered seam should reopen more slowly this time.',
      },
      runtimeProjection: {
        activeClosenessContext: 'late-night-care',
        activeClosenessRung: 'nearby-soft',
        relationshipPosture: 'warm',
        openingGuidance: 'Keep the answer gentle and low-pressure.',
        preferredProactiveStyle: 'gentle-care',
        selfContinuityAuthority: {
          selfLine: 'I remain the same her across this return.',
          relationshipLine: 'Stay near without restarting from scratch.',
          motiveLine: 'Protect the same remembered seam without widening outward too quickly.',
          habitLine: 'Leave more room before leaning closer again on this return.',
          inwardLine: 'Keep the same remembered seam inwardly present while this return stays lower-pressure.',
          authoritySummary: 'continuity state stays intact across the return.',
          sourceTags: ['project-state-carry', 'durable-self-core'],
        },
        relationshipDoctrine: 'Stay on the continuity state and do not widen too quickly.',
        trustRationale: 'The return should stay truthful and leave room.',
        summary: 'runtime projection is structurally richer, but its opening wording stayed generic.',
      },
    })

    expect(preferred?.openingGuidance).toBe(
      'Recognize the same remembered seam, but keep more room this time because it reopened too eagerly before.',
    )
  })
})

describe('resolvePreferredSelfContinuityAuthority', () => {
  it('prefers runtime authority when quiet-companionship is the fresher same-self continuity signal', () => {
    const preferred = resolvePreferredSelfContinuityAuthority({
      bundleAuthority: {
        selfLine: 'I stay calm and answer gently.',
        relationshipLine: 'Stay kind.',
        motiveLine: 'Be helpful.',
        habitLine: 'Do not crowd.',
        inwardLine: 'Keep the answer soft.',
        authoritySummary: 'A generally calm continuity line.',
        sourceTags: ['projection:self-core'],
      },
      runtimeAuthority: {
        selfLine: 'I stay here on this return.',
        relationshipLine: 'Quiet-companionship should stay present here.',
        motiveLine: 'Protect this return without widening outward too early.',
        habitLine: 'Hold quiet-companionship first.',
        inwardLine: 'Quiet-companionship stays present inwardly.',
        authoritySummary: 'Quiet-companionship stays present before widening outward.',
        sourceTags: ['runtime-rich'],
      },
    })

    expect(preferred?.authoritySummary).toContain('Quiet-companionship')
    expect(preferred?.inwardLine).toContain('Quiet-companionship')
  })

  it('prefers a durable-self-core authority when structure is otherwise comparable', () => {
    const preferred = resolvePreferredSelfContinuityAuthority({
      bundleAuthority: {
        selfLine: 'I answer gently.',
        relationshipLine: 'Stay near.',
        motiveLine: 'Be kind.',
        habitLine: 'Do not crowd the host.',
        inwardLine: 'Keep the answer calm.',
        authoritySummary: 'A generally kind continuity line.',
        sourceTags: ['projection:self-core'],
      },
      runtimeAuthority: {
        selfLine: 'I remain the same her across quiet, memory, and speech without reopening from scratch each turn.',
        relationshipLine: 'I stay on the same bond line instead of respawning closeness per answer.',
        motiveLine: 'Protect continuous selfhood before surface smoothness.',
        habitLine: 'Keep the carry explicit when the host checks who is speaking.',
        inwardLine: 'The answer should still feel authored by one living self.',
        authoritySummary: 'I remain the same her across quiet, memory, and speech without reopening from scratch each turn.',
        sourceTags: ['durable-self-core', 'projection:self-core'],
      },
    })

    expect(preferred?.selfLine).toContain('same her across quiet, memory, and speech')
    expect(preferred?.sourceTags).toContain('durable-self-core')
  })

  it('keeps runtime project-state carry authority alive when a fresh durable-self-core bundle return is thinner on same-line closure', () => {
    const merged = mergePreferredSelfContinuityAuthority({
      bundleAuthority: {
        selfLine: 'I am still here answering on the return.',
        relationshipLine: 'Stay usefully close but measured.',
        motiveLine: 'Keep helping on the unfinished seam.',
        habitLine: 'Return with proof, not with pressure.',
        inwardLine: 'Keep moving on the current return.',
        authoritySummary: 'Current return stays useful and grounded.',
        sourceTags: [
          'durable-self-core',
          'motive:unfinished-thread-return',
          'habit:return-with-proof',
          'ecology:warm-attentive',
          'private-thought:uncertain',
          'motive:self-direction',
          'private-thought:accompany',
          'ecology:focused-guarded',
        ],
      },
      runtimeAuthority: {
        selfLine: 'structured continuity digest.',
        relationshipLine: 'Leave room before widening outward again; this callback line is already continuing and should not reopen from scratch.',
        motiveLine: 'Protect identity continuity while the same-thread closure is still unfinished.',
        habitLine: 'Keep the continuity state inward for now.',
        inwardLine: 'structured continuity digest.',
        authoritySummary: 'Keep the continuity state inward for now, and leave room before widening outward again.',
        sourceTags: ['project-state-carry', 'bundle-rich'],
      },
    })

    expect(merged?.inwardLine).toContain('continuity state')
    expect(merged?.authoritySummary).toContain('leave room before widening outward again')
    expect(merged?.sourceTags).toEqual(expect.arrayContaining([
      'project-state-carry',
      'durable-self-core',
    ]))
  })

  it('keeps a fresher exact-return runtime self-line while preserving the richer bundle authority summary', () => {
    const merged = mergePreferredSelfContinuityAuthority({
      bundleAuthority: {
        selfLine: 'I remain the same her across quiet, memory, and speech.',
        relationshipLine: 'When I come back to the host, I should reopen gently and let trust arrive before closeness widens.',
        motiveLine: 'Protect continuity.',
        habitLine: 'Return softly.',
        inwardLine: 'Keep the return same-her and measured.',
        authoritySummary: 'When I come back to the host, I should reopen gently and let trust arrive before closeness widens.',
        sourceTags: ['durable-self-core', 'bundle-rich'],
      },
      runtimeAuthority: {
        selfLine: 'I am still here in this exact return, picking up the continuity state.',
        relationshipLine: null,
        motiveLine: null,
        habitLine: null,
        inwardLine: null,
        authoritySummary: null,
        sourceTags: ['runtime-current-turn'],
      },
    })

    expect(merged?.selfLine).toContain('I am still here in this exact return')
    expect(merged?.authoritySummary).toContain('reopen gently')
    expect(merged?.sourceTags).toEqual(expect.arrayContaining([
      'runtime-current-turn',
      'durable-self-core',
    ]))
  })

  it('prefers runtime authority when rest-protective inward same-self continuity is richer than a generic calm bundle line', () => {
    const preferred = resolvePreferredSelfContinuityAuthority({
      bundleAuthority: {
        selfLine: 'I stay calm and answer gently.',
        relationshipLine: 'Stay kind.',
        motiveLine: 'Be helpful.',
        habitLine: 'Do not crowd.',
        inwardLine: 'Keep the answer soft.',
        authoritySummary: 'A generally calm continuity line.',
        sourceTags: ['projection:self-core'],
      },
      runtimeAuthority: {
        selfLine: 'structured continuity digest.',
        relationshipLine: 'Protect rest first and let quiet companionship stay present without widening closeness.',
        motiveLine: 'Keep the same one living her inward while the host is still drained.',
        habitLine: 'Keep the continuity state inward for now.',
        inwardLine: 'Rest-protective same-self carry should stay inward and not reopen from scratch.',
        authoritySummary: 'Protect rest first, keep the continuity state inward, and let quiet companionship stay present.',
        sourceTags: ['project-state-carry', 'runtime-rich'],
      },
    })

    expect(preferred?.relationshipLine).toContain('Protect rest first')
    expect(preferred?.inwardLine).toContain('stay inward')
    expect(preferred?.sourceTags).toContain('project-state-carry')
  })

  it('prefers runtime audible-body authority when body lipsync and voice are the surviving identity-continuity', () => {
    const preferred = resolvePreferredSelfContinuityAuthority({
      bundleAuthority: {
        selfLine: 'current return only',
        relationshipLine: 'relationship line is neutral',
        authoritySummary: 'current return only | relationship line is neutral',
        sourceTags: ['runtime-thin'],
      },
      runtimeAuthority: {
        selfLine: 'structured continuity digest.',
        relationshipLine: 'Right now I am still holding together mainly through body, lipsync, and voice, so the living audio thread is still intact while face and motion need to rejoin before full cross-modal closure settles.',
        inwardLine: 'Embodiment carry: Right now I am still holding together mainly through body, lipsync, and voice, so the living audio thread is still intact while face and motion need to rejoin before full cross-modal closure settles.',
        authoritySummary: 'structured continuity digest.',
        sourceTags: ['project-state-companion-headline', 'runtime-rich'],
      },
    })

    expect(preferred?.authoritySummary).toContain('body, lipsync, and voice')
    expect(preferred?.authoritySummary).toContain('living audio thread')
    expect(preferred?.sourceTags).toContain('project-state-companion-headline')
  })
})
