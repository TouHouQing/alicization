import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

describe('runtime-subconscious-tick project awareness regression', () => {
  it('keeps persisted subconscious project-state carry rich enough for later proactive and autonomy continuity paths', () => {
    const source = readFileSync(new URL('./runtime-subconscious-tick.ts', import.meta.url), 'utf8')
    const persistenceStart = source.indexOf('const projectStatePersistence = {')
    const persistenceEnd = source.indexOf('\n\n  function resolveDeferredAutonomyContinuitySignal', persistenceStart)
    const persistenceBlock = persistenceStart >= 0 && persistenceEnd > persistenceStart
      ? source.slice(persistenceStart, persistenceEnd)
      : ''

    expect(persistenceBlock).toContain('const projectStatePersistence = {')
    expect(persistenceBlock).toContain('preflightSummary: projectStateBrief.preflightSummary ?? null')
    expect(persistenceBlock).toContain('preDialogueAwarenessLine: projectStateBrief.preDialogueAwarenessLine ?? null')
    expect(persistenceBlock).toContain('emotionalClosureCue: projectStateBrief.emotionalClosureCue ?? null')
    expect(persistenceBlock).toContain('sameHerDriftRisk: projectStateBrief.sameHerDriftRisk')
    expect(persistenceBlock).toContain('sameHerSelfLine: projectStateBrief.sameHerSelfLine')
    expect(source).toContain('projectState: projectStatePersistence')
    expect(source).toContain('projectStatePreflightSummary: projectStatePersistence.preflightSummary')
    expect(source).toContain('projectStateEmotionalClosureCue: projectStatePersistence.emotionalClosureCue')
  })

  it('keeps deferred autonomy carry forwarding open and next focus summaries alongside fresher project-state closure fields', () => {
    const source = readFileSync(new URL('./runtime-subconscious-tick.ts', import.meta.url), 'utf8')
    const deferredProjectStateStart = source.indexOf('deferredAutonomyProjectState = {')
    const deferredProjectStateEnd = source.indexOf('\n            const persistedDerivedMindStateBundle', deferredProjectStateStart)
    const deferredProjectStateBlock = deferredProjectStateStart >= 0 && deferredProjectStateEnd > deferredProjectStateStart
      ? source.slice(deferredProjectStateStart, deferredProjectStateEnd)
      : ''

    expect(deferredProjectStateBlock).toContain('deferredAutonomyProjectState = {')
    expect(deferredProjectStateBlock).toContain('primaryOpenLoop:')
    expect(deferredProjectStateBlock).toContain('nextClosureTarget:')
    expect(deferredProjectStateBlock).toContain('openFocusSummary:')
    expect(deferredProjectStateBlock).toContain('nextFocusSummary:')
  })

  it('threads emotional transition decay from mind-state ledger into proactive cadence and body authority', () => {
    const source = readFileSync(new URL('./runtime-subconscious-tick.ts', import.meta.url), 'utf8')
    const importBlock = source.slice(0, source.indexOf('function hasThinAffectiveResidueRoomMakingCue'))
    const cadenceStart = source.indexOf('proactiveLoopState = progressProactiveCadenceState({')
    const cadenceEnd = source.indexOf('\n    setProactiveLoopStateCache', cadenceStart)
    const cadenceBlock = cadenceStart >= 0 && cadenceEnd > cadenceStart
      ? source.slice(cadenceStart, cadenceEnd)
      : ''
    const bodyStart = source.indexOf('const nextPresenceStateWithBodyAuthority = bodyKernel.applyToVisualPresenceState({')
    const bodyEnd = source.indexOf('\n            })', bodyStart)
    const bodyBlock = bodyStart >= 0 && bodyEnd > bodyStart
      ? source.slice(bodyStart, bodyEnd)
      : ''

    expect(importBlock).toContain('resolveAlicizationEmotionalTransitionDecay')
    expect(source).toContain('const emotionalTransitionDecay = emotionalTransitionLedger')
    expect(source).toContain('ledger: emotionalTransitionLedger')
    expect(source).toContain('current: emotionalKernelForDecay')
    expect(cadenceBlock).toContain('emotionalTransitionDecay,')
    expect(bodyBlock).toContain('emotionalTransitionDecay')
  })
})
