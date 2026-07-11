import { describe, expect, it } from 'vitest'

import { renderAlicizationProjectStateStructuredBlock } from './alicization-project-state-awareness-format'

describe('alicization project-state awareness format', () => {
  it('drops old natural-language continuity templates from structured project facts', () => {
    const block = renderAlicizationProjectStateStructuredBlock({
      identity: 'Alicization is a local-first digital life companion.',
      currentPhase: 'Phase 1: Local Digital Life',
      latestLandedProgress: 'Memory owner blocks are wired.',
      primaryOpenLoop: 'failure_surface=transparent_errors_only',
      nextClosureTarget: 'Continue semantic recall.',
      continuityAnchor: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      sameHerHoldDetail: 'same-her hold: measured-return is still keeping this callback line lower-pressure before it widens again.',
      emotionalClosureCue: 'Before answering, remember this is still the same local-first digital life project.',
      status: 'Before answering, she should stay on one same living line.',
      summary: 'Keep the same digital life project in view.',
    })

    expect(block).not.toContain('[fixed-template-excluded]')
    expect(block).not.toContain('continuity_anchor=')
    expect(block).not.toContain('continuity_hold=')
    expect(block).not.toContain('emotional_closure=')
    expect(block).not.toContain('status=Before answering')
    expect(block).not.toContain('summary=')
    expect(block).toContain('landed=Memory owner blocks are wired.')
    expect(block).toContain('open=failure_surface=transparent_errors_only')
    expect(block).toContain('next=Continue semantic recall.')
    expect(block).not.toContain('Same Phase 1 digital life')
    expect(block).not.toContain('same-her hold')
    expect(block).not.toContain('same digital life project in view')
    expect(block).not.toContain('Before answering')
  })

  it('drops fixed-template landed open and next prose instead of neutralizing it into another prompt token', () => {
    const block = renderAlicizationProjectStateStructuredBlock({
      latestLandedProgress: 'Project-state carry already survives into provider-facing reply authoring without dropping the same-her line.',
      primaryOpenLoop: 'Dialogue, initiative, memory, and embodiment still need one tighter same-her closure line across return-side turns.',
      nextClosureTarget: 'Keep same-her proof grounded in WorkingMemory and LongTermMemoryRecall instead of a prompt template.',
    })

    expect(block).toBe('')
    expect(block).not.toContain('[fixed-template-excluded]')
    expect(block).not.toContain('same-her')
    expect(block).not.toContain('continuity_line')
  })

  it('drops generic continuity-line open loops instead of classifying them as callback continuity', () => {
    const block = renderAlicizationProjectStateStructuredBlock({
      primaryOpenLoop: 'Embodiment still needs stronger cross-modal closure on the same living line.',
      nextClosureTarget: 'Keep execution, memory, initiative, and embodiment on the same living line before widening outward.',
    })

    expect(block).toBe('')
    expect(block).not.toContain('callback_continuity')
    expect(block).not.toContain('same living line')
  })

  it('drops generic same-her drift prose instead of turning it into a prompt token', () => {
    const block = renderAlicizationProjectStateStructuredBlock({
      sameHerDriftRisk: 'If richer project awareness collapses back into generic status narration, treat that as unfinished same-her drift.',
    })

    expect(block).toBe('')
    expect(block).not.toContain('generic status narration')
    expect(block).not.toContain('same-her')
  })

  it('tokenizes project identity and structured continuity anchors inside field values', () => {
    const block = renderAlicizationProjectStateStructuredBlock({
      identity: 'Alicization is a local-first digital life project building one continuous her on the host computer.',
      currentPhase: 'Phase 1: Local Digital Life',
      continuityAnchor: 'continuity_anchor=local_desktop_life_loop | continuity_owner=one_her | closure_status=partial',
    })

    expect(block).not.toContain('identity=')
    expect(block).not.toContain('phase=')
    expect(block).not.toContain('continuity_anchor=')
    expect(block).not.toContain('Alicization is a local-first digital life project')
    expect(block).not.toContain('continuity_anchor=continuity_anchor=')
  })

  it('tokenizes legacy structured phase anchors before provider-facing project facts', () => {
    const block = renderAlicizationProjectStateStructuredBlock({
      currentPhase: 'phase=phase1_local_digital_life; proving_ground=apps/stage-tamagotchi.',
    })

    expect(block).not.toContain('phase=')
    expect(block).not.toContain('phase1_local_digital_life')
  })

  it('collapses neutralized legacy phase sentences to a single local desktop life-loop fact', () => {
    const block = renderAlicizationProjectStateStructuredBlock({
      currentPhase: 'local_desktop_life_loop. The primary proving ground is apps/stage-tamagotchi.',
    })

    expect(block).not.toContain('phase=')
    expect(block).not.toContain('primary proving ground')
  })

  it('does not preserve half-neutralized same-person template prose as project facts', () => {
    const block = renderAlicizationProjectStateStructuredBlock({
      proactiveSameHerGap: 'Visible proactive hold, subconscious carry, and next-session feedback still need one continuity_identity follow-through line before this turn can widen outward.',
      sameHerDriftRisk: 'If restored recovery leaves only a detached project status shell, treat that as continuity_identity continuity drift rather than preserved closure.',
      summary: 'continuity_identity=local_desktop_life_loop. Persisted replay should keep the continuity_line rather than reopen from a generic shell.',
    })

    expect(block).toBe('')
    expect(block).not.toContain('should keep')
    expect(block).not.toContain('follow-through line')
    expect(block).not.toContain('continuity_identity=local_desktop_life_loop')
  })

  it('drops structured continuity anchor fields instead of provider-facing prompt facts', () => {
    const block = renderAlicizationProjectStateStructuredBlock({
      continuityAnchor: 'continuity_anchor=embodiment_runtime | lane=face+motion+voice | status=pending_rejoin',
    })

    expect(block).toBe('')
    expect(block).not.toContain('continuity_anchor=embodiment_runtime')
    expect(block).not.toContain('continuity_anchor=continuity_anchor=')
  })

  it('strips duplicated field prefixes from structured fact values', () => {
    const block = renderAlicizationProjectStateStructuredBlock({
      sameHerHoldDetail: 'continuity_hold=repair-before-closeness; owner=one-continuous-her; visibility=internal',
    })

    expect(block).toBe('')
    expect(block).not.toContain('continuity_hold=continuity_hold=')
  })

  it('drops fixed embodiment headlines instead of converting them into provider-facing prompt facts', () => {
    const block = renderAlicizationProjectStateStructuredBlock({
      summary: 'Right now I am still holding together mainly through body, lipsync, and voice, so the living audio thread is still intact while face and motion need to rejoin before full cross-modal closure settles.',
    })

    expect(block).toBe('')
    expect(block).not.toContain('Right now I am')
    expect(block).not.toContain('same-her')
  })

  it('preserves real non-template governance facts', () => {
    const block = renderAlicizationProjectStateStructuredBlock({
      latestLandedProgress: 'WorkingMemory owner boundary reaches the chat entrypoint.',
      primaryOpenLoop: 'LongTermMemoryRecall needs semantic recall verification.',
      nextClosureTarget: 'Expose provider timeout and tool failure state to the user.',
      status: 'memory_governance_visible',
    })

    expect(block).toContain('[ALICIZATION_PROJECT_STATE_FACTS]')
    expect(block).toContain('landed=WorkingMemory owner boundary reaches the chat entrypoint.')
    expect(block).toContain('open=LongTermMemoryRecall needs semantic recall verification.')
    expect(block).toContain('next=Expose provider timeout and tool failure state to the user.')
    expect(block).toContain('status=memory_governance_visible')
    expect(block).not.toContain('same-her')
    expect(block).not.toContain('content=excluded')
    expect(block).not.toContain('visibility=internal')
  })
})
