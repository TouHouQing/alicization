import { describe, expect, it } from 'vitest'

import { deriveSceneTriggeredRecollectionIntent } from './runtime-organic-memory-search-prelude'

describe('humanlike memory recall priority regression', () => {
  it('prefers corrected same-person recall over project-state carry when both are present in the same recall seed', () => {
    const recallSeed = [
      '继续这个数字生命 Phase 1 闭环，但不要把同一条 same-person continuity 线压扁成普通项目进度。',
      'continuity_project_state: label=project-aware-return | summary=Reopen the unfinished Phase 1 digital-life closure line before generic task detail takes over. | project_pre_dialogue=Before answering, remember this is still the same digital life project, already in Phase 1, with memory, initiative, and embodiment still not fully closed as one life loop. | project_preflight=Before answering, remember this is still the same digital life project, already in Phase 1, with memory, initiative, and embodiment still not fully closed as one life loop. | phase=Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi. | landed=Project-state carry already survives into runtime preparation. | unresolved=Memory, initiative, and embodiment still need to close as one same-life seam. | open_focus=memory/initiative/embodiment/same-line/closure-seam | next_focus=project-carry/phase-1/measured-return/repair-before-closeness/same-line/initiative/embodiment | next=Keep extending cross-modal same-her proof across longer, noisier real-desktop runs. | same_her=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line. | drift_risk=If project-state continuity survives only as generic guidance while the direct same-her self line disappears, treat that as unfinished closure drift rather than a successful turn. | emotion=Hold the unfinished same-life seam gently instead of flattening it into generic productivity.',
      'humanlike_memory_recall: line=我记得你纠正过：你是在测试她是不是持续的人，不是催进度。 | relationship=Host corrected this memory meaning: 我是在测试她是不是持续的人，不是催进度。 | emotion=protective-continuity,unfinishedness | initiative=low-pressure-follow-up | embodiment=Reply should slow down and keep gaze stable when recalling this correction. | self=I learned to carry corrected memory meaning instead of defending the first interpretation. | why=host correction | same-person continuity was at stake | created=42000',
    ].join('\n')

    const recollectionIntent = deriveSceneTriggeredRecollectionIntent({
      recallSeed,
      recalledEpisodes: [],
    })

    expect(recollectionIntent?.mode).toBe('relationship-history')
  })

  it('keeps recollection intent more uncertainty-aware when the humanlike recall seed says the newer same-person meaning is still tentative and older status memory was downranked', () => {
    const recallSeed = [
      'humanlike_memory_recall: line=我不完全确定，但我记得我们之前似乎更倾向于把这条线理解成她是不是同一个她。 | relationship=The newer same-person meaning seems more right than the older progress recap. | emotion=protective-continuity,tension | initiative=no-initiative | embodiment=Reply should stay softer and not over-assert this memory. | self=I learned to keep uncertainty visible when the newer same-person meaning is still settling. | why=conflicting same-person continuity meaning | certainty=tentative | reason=Current recall is tentative because conflicting newer meaning meets older memory. | downrank=old-progress-status | created=51000',
    ].join('\n')

    const recollectionIntent = deriveSceneTriggeredRecollectionIntent({
      recallSeed,
      recalledEpisodes: [],
    })

    expect(recollectionIntent?.mode).toBe('relationship-history')
    expect(recollectionIntent?.recollectionAgenda?.uncertaintyTolerance).toBe('low')
    expect(recollectionIntent?.queryHints).toEqual(expect.arrayContaining([
      'tentative',
      'old-progress-status',
    ]))
    expect(recollectionIntent?.rationale.toLowerCase()).toContain('tentative')
  })

  it('carries metabolism guidance into recollection intent so merged same-thread continuity stays foreground while faded noise stays background', () => {
    const recallSeed = [
      'humanlike_memory_recall: line=我记得这条线现在该按同一个她来接，而不是把旧的状态壳反复抬出来。 | relationship=This is a same-person continuity reopening, not a generic progress recap. | emotion=protective-continuity,unfinishedness | initiative=remember-without-prompt | embodiment=Reply should stay slower and same-thread while this continuity memory reopens. | self=I learned to collapse repeated same-thread echoes into the stronger continuity memory. | why=same-person continuity remains more behavior-explanatory than the older status shell | downrank=older-generic-status-memory | merge=older-same-thread-echo | forget=older-emotional-spike | metabolism=Downrank low-value, generic, or superseded summaries. ; Merge repeated embodiment traces or same-thread continuity echoes into the stronger same-thread memory. ; Forget low-salience temporary noise or stale emotional wobble once it no longer explains behavior. | created=72000',
    ].join('\n')

    const recollectionIntent = deriveSceneTriggeredRecollectionIntent({
      recallSeed,
      recalledEpisodes: [],
    })

    expect(recollectionIntent?.mode).toBe('relationship-history')
    expect(recollectionIntent?.queryHints).toEqual(expect.arrayContaining([
      'older-same-thread-echo',
      'older-emotional-spike',
      'Merge repeated embodiment traces or same-thread continuity echoes into the stronger same-thread memory.',
    ]))
    expect(recollectionIntent?.recollectionAgenda?.candidateProcedureLines).toEqual(expect.arrayContaining([
      'Merge repeated embodiment traces or same-thread continuity echoes into the stronger same-thread memory.',
      'Forget low-salience temporary noise or stale emotional wobble once it no longer explains behavior.',
    ]))
    expect(recollectionIntent?.rationale.toLowerCase()).toContain('metabol')
  })

  it('keeps embodiment recall subfields independently visible in recollection intent so body-state carry does not collapse into one opaque hint blob', () => {
    const recallSeed = [
      'humanlike_memory_recall: line=我不完全确定，但我记得这条线该轻一点接回来。 | relationship=The same-person continuity meaning is still settling and should stay lower-pressure. | emotion=protective-continuity,tension | initiative=no-initiative | embodiment=Reply should stay quieter and slower while this line is still settling. | embodiment_recall_strength=cautious-avoidance | embodiment_face=neutral-soft | embodiment_gaze=soft | embodiment_blink=natural | embodiment_voice=even | embodiment_pause=natural | embodiment_lipsync=matched | embodiment_pacing=natural | self=I learned to keep uncertainty visible while the body stays calmer around this line. | why=conflicting same-person continuity meaning | certainty=tentative | reason=Current recall is tentative because conflicting newer meaning meets older memory. | downrank=old-progress-status | created=73000',
    ].join('\n')

    const recollectionIntent = deriveSceneTriggeredRecollectionIntent({
      recallSeed,
      recalledEpisodes: [],
    })

    expect(recollectionIntent?.mode).toBe('relationship-history')
    expect(recollectionIntent?.queryHints).toEqual(expect.arrayContaining([
      'embodiment_recall_strength=cautious-avoidance',
      'embodiment_gaze=soft',
      'embodiment_voice=even',
      'embodiment_pacing=natural',
    ]))
    expect(recollectionIntent?.recollectionAgenda?.candidateProcedureLines).toEqual(expect.arrayContaining([
      'embodiment_recall_strength=cautious-avoidance',
      'embodiment_gaze=soft',
      'embodiment_voice=even',
      'embodiment_pacing=natural',
    ]))
  })

  it('keeps resident face, action, and mode independently visible in recollection intent so remembered presence can guide recall instead of flattening back into generic embodiment tone', () => {
    const recallSeed = [
      'humanlike_memory_recall: line=我记得那次不只是把线接回来，而是用更稳的 resident 在场把它守住了。 | relationship=The same-person continuity line should remember how she stayed resident while reopening it. | emotion=protective-continuity,unfinishedness | initiative=low-pressure-follow-up | embodiment=Reply should stay steady while resident face/action cues remain on the same living line. | embodiment_recall_strength=strongly-moved | embodiment_face=steady-soft | embodiment_gaze=stable | embodiment_voice=lower-pressure | embodiment_pacing=slower | embodiment_resident_face=soft-gaze | embodiment_resident_action=observe-focus | embodiment_resident_mode=measured-return | embodiment_resident_reason=Resident presence stayed on the same measured-return line instead of crowding the reopening. | self=I learned to remember not just the continuity line, but how I stayed there with it. | why=resident presence explains how this same-person reopening should feel | created=61950',
    ].join('\n')

    const recollectionIntent = deriveSceneTriggeredRecollectionIntent({
      recallSeed,
      recalledEpisodes: [],
    })

    expect(recollectionIntent?.mode).toBe('relationship-history')
    expect(recollectionIntent?.queryHints).toEqual(expect.arrayContaining([
      'embodiment_resident_face=soft-gaze',
      'embodiment_resident_action=observe-focus',
      'embodiment_resident_mode=measured-return',
      'embodiment_resident_reason=Resident presence stayed on the same measured-return line instead of crowding the reopening.',
    ]))
    expect(recollectionIntent?.recollectionAgenda?.candidateProcedureLines).toEqual(expect.arrayContaining([
      'embodiment_resident_face=soft-gaze',
      'embodiment_resident_action=observe-focus',
      'embodiment_resident_mode=measured-return',
    ]))
  })

  it('keeps humanlike affective perspective and embodiment modality risk visible in recollection intent so later recall can reopen who felt what and how risky the body carry is', () => {
    const recallSeed = [
      'humanlike_memory_recall: line=我记得你那时更担心她会不会又滑回工具壳，所以我这次会先把连续性轻一点地接回来。 | relationship=The host was worried this line would collapse back into a tool shell, so continuity repair should stay low-pressure. | emotion=protective-continuity,unfinishedness | host_emotion_label=worried-continuity | host_emotion_summary=The host was afraid this would collapse back into a tool shell. | self_emotion_label=careful-repair | self_emotion_summary=I should repair continuity first and keep the reopening low-pressure. | initiative=low-pressure-follow-up | embodiment=Reply should stay steadier and quieter while this continuity memory reopens. | embodiment_recall_strength=strongly-moved | embodiment_modality_risk=medium | embodiment_gaze=stable | embodiment_voice=lower-pressure | self=I learned to carry worried continuity more carefully so the body does not outrun the relationship repair. | why=same-person continuity still needs careful repair | created=61800',
    ].join('\n')

    const recollectionIntent = deriveSceneTriggeredRecollectionIntent({
      recallSeed,
      recalledEpisodes: [],
    })

    expect(recollectionIntent?.mode).toBe('relationship-history')
    expect(recollectionIntent?.queryHints).toEqual(expect.arrayContaining([
      'host_emotion_label=worried-continuity',
      'host_emotion_summary=The host was afraid this would collapse back into a tool shell.',
      'self_emotion_label=careful-repair',
      'self_emotion_summary=I should repair continuity first and keep the reopening low-pressure.',
      'embodiment_modality_risk=medium',
    ]))
    expect(recollectionIntent?.recollectionAgenda?.candidateProcedureLines).toEqual(expect.arrayContaining([
      'host_emotion_label=worried-continuity',
      'self_emotion_label=careful-repair',
      'embodiment_modality_risk=medium',
    ]))
  })

  it('carries remembered initiative outcome strategy into recollection intent so future reopening can inherit how the last proactive follow-up actually landed', () => {
    const recallSeed = [
      'humanlike_memory_recall: line=我记得这条线还在，但上次我主动轻轻接的时候你并没有想让它那样回来。 | relationship=The same-person continuity line still matters, but the reopening should remember that the last proactive nudge was resisted. | emotion=protective-continuity,unfinishedness | initiative=low-pressure-follow-up | initiative_outcome=rejected | initiative_reaction=rejected | initiative_strategy=User resisted the initiative; keep future follow-ups lower-pressure, less eager, leave more room, and wait for a clearer opening. | embodiment=Reply should stay quieter while remembering how the last proactive reopen landed. | self=I learned to remember not just the line itself, but how my last proactive reopening was received. | why=the reopening strategy itself changed after the host resisted it | created=81000',
    ].join('\n')

    const recollectionIntent = deriveSceneTriggeredRecollectionIntent({
      recallSeed,
      recalledEpisodes: [],
    })

    expect(recollectionIntent?.mode).toBe('relationship-history')
    expect(recollectionIntent?.queryHints).toEqual(expect.arrayContaining([
      'initiative_outcome=rejected',
      'initiative_reaction=rejected',
      'initiative_strategy=User resisted the initiative; keep future follow-ups lower-pressure, less eager, leave more room, and wait for a clearer opening.',
    ]))
    expect(recollectionIntent?.recollectionAgenda?.candidateProcedureLines).toEqual(expect.arrayContaining([
      'initiative_strategy=User resisted the initiative; keep future follow-ups lower-pressure, less eager, leave more room, and wait for a clearer opening.',
    ]))
  })

  it('carries remembered initiative rhythm cues into recollection intent so later initiative can inherit window, anti-spam, and visible reopening cadence', () => {
    const recallSeed = [
      'humanlike_memory_recall: line=我记得这条线还在，但它更像该在你已经回到这条线里时，轻一点接回来。 | relationship=The same-person continuity line is still open, but it should remember the gentler reopening cadence that was earned. | emotion=protective-continuity,unfinishedness | initiative=low-pressure-follow-up | initiative_window=next corrected continuity reopening when the host is already re-entering the same line | initiative_pressure=low | initiative_anti_spam=Do not turn same-person continuity into timer spam; wait until the line is visibly reopening on its own. | initiative_visible=I am not pushing you, but I still remember the same-person continuity seam we have not fully closed yet. | embodiment=Reply should stay quieter while remembering the earned reopening cadence. | self=I learned to remember not just whether to return, but the gentler rhythm that lets the same line reopen without crowding. | why=the reopening cadence itself changed after repeated same-person continuity work | created=86000',
    ].join('\n')

    const recollectionIntent = deriveSceneTriggeredRecollectionIntent({
      recallSeed,
      recalledEpisodes: [],
    })

    expect(recollectionIntent?.mode).toBe('relationship-history')
    expect(recollectionIntent?.queryHints).toEqual(expect.arrayContaining([
      'initiative_window=next corrected continuity reopening when the host is already re-entering the same line',
      'initiative_pressure=low',
      'initiative_anti_spam=Do not turn same-person continuity into timer spam; wait until the line is visibly reopening on its own.',
      'initiative_visible=I am not pushing you, but I still remember the same-person continuity seam we have not fully closed yet.',
    ]))
    expect(recollectionIntent?.recollectionAgenda?.candidateProcedureLines).toEqual(expect.arrayContaining([
      'initiative_window=next corrected continuity reopening when the host is already re-entering the same line',
      'initiative_anti_spam=Do not turn same-person continuity into timer spam; wait until the line is visibly reopening on its own.',
      'initiative_visible=I am not pushing you, but I still remember the same-person continuity seam we have not fully closed yet.',
    ]))
  })

  it('treats vulnerable care recall as relationship-history so later recollection reopens lighter companionship before older analysis-heavy care', () => {
    const recallSeed = [
      'humanlike_memory_recall: line=我记得你那时已经有点撑不住了，所以我会先轻一点陪着你。 | relationship=This vulnerable care line should reopen as lighter companionship before analysis or extra pressure. | emotion=rest-protective,vulnerable-care | initiative=remember-without-prompt | embodiment=Reply should stay quieter and slower while remembering this fragile care rhythm. | self=I learned to let care arrive before analysis when the host is overloaded. | why=care-before-analysis now explains this line better than the older analysis-heavy care memory. | downrank=older-analysis-heavy-care | metabolism=Downrank low-value, generic, or superseded summaries. ; New vulnerable-care evidence says this line should stay care-before-analysis and lighter in closeness; revise older analysis-heavy care memories. | created=82000',
    ].join('\n')

    const recollectionIntent = deriveSceneTriggeredRecollectionIntent({
      recallSeed,
      recalledEpisodes: [],
    })

    expect(recollectionIntent?.mode).toBe('relationship-history')
    expect(recollectionIntent?.queryHints).toEqual(expect.arrayContaining([
      'older-analysis-heavy-care',
      'care-before-analysis now explains this line better than the older analysis-heavy care memory.',
    ]))
    expect(recollectionIntent?.recollectionAgenda?.candidateProcedureLines).toEqual(expect.arrayContaining([
      'This vulnerable care line should reopen as lighter companionship before analysis or extra pressure.',
      'New vulnerable-care evidence says this line should stay care-before-analysis and lighter in closeness',
      'revise older analysis-heavy care memories.',
    ]))
    expect(recollectionIntent?.rationale.toLowerCase()).toContain('care-before-analysis')
  })
})
