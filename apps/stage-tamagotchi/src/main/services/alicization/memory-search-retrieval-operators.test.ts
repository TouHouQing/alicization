import { describe, expect, it, vi } from 'vitest'

import {
  resolveMemorySearchPrelude,
  retrieveMemorySearchCandidates,
} from './memory-search-retrieval-operators'
import {
  deriveSceneTriggeredRecollectionIntent,
  deriveSessionMirrorRecollectionIntent,
} from './runtime-organic-memory-search-prelude'

const fixedTemplateResiduePattern = /Before (?:answering|speaking|acting)|legacy phase-one template|same-her|same her|continuity state|one living her|identity continuity|local-first digital life project|同一个她|同一个 her|数字生命主线/iu

function expectNoFixedTemplateResidue(value: unknown) {
  expect(JSON.stringify(value)).not.toMatch(fixedTemplateResiduePattern)
}

describe('memory-search-retrieval-operators', () => {
  it('does not reopen resting session-mirror recollection state', () => {
    expect(deriveSessionMirrorRecollectionIntent({
      afterthoughtState: 'resting',
      certainty: 'approximate',
      confidence: 0.8,
      foreground: 'Return to the remembered runtime seam before branching again.',
      mode: 'execution-procedure',
      placement: 'internal-only',
      surfaceMode: 'internal-only',
      visibility: 'inward',
    })).toBeNull()
  })

  it('does not reopen fixed-template residue from typed session-mirror foreground', () => {
    expect(deriveSessionMirrorRecollectionIntent({
      afterthoughtState: 'ripe',
      certainty: 'approximate',
      confidence: 0.8,
      foreground: 'Same Phase 1 digital life. Keep the same-her closure line explicit.',
      mode: 'execution-procedure',
      placement: 'internal-only',
      surfaceMode: 'internal-only',
      visibility: 'inward',
    })).toBeNull()
  })

  it('derives heuristic recollection intent from session mirror runtime continuity carry', async () => {
    let plannedInput: any = null
    const prelude = await resolveMemorySearchPrelude({
      access: {
        getOrganicMemorySnapshot: async () => ({
          hostAttitude: 'warm',
          coreIncarnation: '',
          activeThoughts: [],
        }),
        getLatestRelationshipDynamics: async () => null,
        retrieveMemoryFacts: async () => [],
        recallSubconsciousFragmentsWithGovernor: async () => [],
        recallEpisodicEventsWithGovernor: async () => [],
        buildHostPersonModel: async () => null,
      },
      policy: {
        planRecollectionIntent: vi.fn(async (input) => {
          plannedInput = input
          return input.heuristicIntent
        }),
        deriveSceneTriggeredRecollectionIntent,
        isPersonaResidueMemoryText: () => false,
      },
      recallSeed: [
        'continue the repair without losing the current seam',
        'mirror_runtime_continuity: dominant=dialogue | phase=dialogue | handoff=active-dialogue | from=symbiotic-vision | to=companion-presence | scenario=coding | reason=runtime seam repair after the grounded turn failed',
      ].join('\n'),
      recallGovernor: {
        allowRecalledFragments: true,
      } as any,
    })

    expect(plannedInput?.heuristicIntent).toEqual(expect.objectContaining({
      mode: 'execution-procedure',
      temporalFocus: 'experience-matched',
      searchEpisodes: true,
      searchConversations: false,
      searchProceduralExperience: true,
      queryHints: expect.arrayContaining([
        'runtime seam repair after the grounded turn failed',
        'coding',
      ]),
      recollectionAgenda: expect.objectContaining({
        candidateTimeScopes: expect.arrayContaining([
          expect.objectContaining({ scope: 'experience-matched' }),
        ]),
        candidateEraFacets: expect.arrayContaining([
          expect.objectContaining({ facet: 'task-era' }),
        ]),
        candidateProcedureLines: expect.arrayContaining([
          'runtime seam repair after the grounded turn failed',
        ]),
      }),
    }))
    expect(prelude.recollectionIntent).toEqual(expect.objectContaining({
      mode: 'execution-procedure',
      searchProceduralExperience: true,
    }))
    expect(prelude.activeRecollectionIntent).toEqual(expect.objectContaining({
      mode: 'execution-procedure',
      recollectionAgenda: expect.objectContaining({
        candidateProcedureLines: expect.arrayContaining([
          'runtime seam repair after the grounded turn failed',
        ]),
      }),
    }))
  })

  it('treats same-line scene-switch mirror continuity as experience-matched procedure carry instead of dropping it as generic dialogue', async () => {
    let plannedInput: any = null
    const prelude = await resolveMemorySearchPrelude({
      access: {
        getOrganicMemorySnapshot: async () => ({
          hostAttitude: 'focused',
          coreIncarnation: '',
          activeThoughts: [],
        }),
        getLatestRelationshipDynamics: async () => null,
        retrieveMemoryFacts: async () => [],
        recallSubconsciousFragmentsWithGovernor: async () => [],
        recallEpisodicEventsWithGovernor: async () => [],
        buildHostPersonModel: async () => null,
      },
      policy: {
        planRecollectionIntent: vi.fn(async (input) => {
          plannedInput = input
          return input.heuristicIntent
        }),
        deriveSceneTriggeredRecollectionIntent,
        isPersonaResidueMemoryText: () => false,
      },
      recallSeed: [
        '我切了一下窗口，现在继续沿着刚才那条线。',
        'mirror_runtime_continuity: stage=same-thread-continuation | thread=QQMusic follow-up | carry=shared-attention-continuation | anchor=这首歌呢？我又换了一首 | dominant=dialogue | phase=dialogue | handoff=active-dialogue',
      ].join('\n'),
      recallGovernor: {
        allowRecalledFragments: true,
      } as any,
    })

    expect(plannedInput?.heuristicIntent).toEqual(expect.objectContaining({
      mode: 'execution-procedure',
      temporalFocus: 'experience-matched',
      searchEpisodes: true,
      searchConversations: false,
      searchProceduralExperience: true,
      queryHints: expect.arrayContaining([
        'same-thread-continuation',
        'QQMusic follow-up',
        'shared-attention-continuation',
      ]),
      recollectionAgenda: expect.objectContaining({
        candidateTimeScopes: expect.arrayContaining([
          expect.objectContaining({ scope: 'experience-matched' }),
        ]),
        candidateEraFacets: expect.arrayContaining([
          expect.objectContaining({ facet: 'task-era' }),
        ]),
        candidateProcedureLines: expect.arrayContaining([
          'shared-attention-continuation',
          'QQMusic follow-up',
        ]),
      }),
    }))
    expect(prelude.recollectionIntent).toEqual(expect.objectContaining({
      mode: 'execution-procedure',
      searchProceduralExperience: true,
    }))
  })

  it('keeps Phase 1 project carry structured in heuristic recollection intent when mirror runtime continuity already carries the unfinished project line', async () => {
    let plannedInput: any = null
    const prelude = await resolveMemorySearchPrelude({
      access: {
        getOrganicMemorySnapshot: async () => ({
          hostAttitude: 'focused',
          coreIncarnation: '',
          activeThoughts: [],
        }),
        getLatestRelationshipDynamics: async () => null,
        retrieveMemoryFacts: async () => [],
        recallSubconsciousFragmentsWithGovernor: async () => [],
        recallEpisodicEventsWithGovernor: async () => [],
        buildHostPersonModel: async () => null,
      },
      policy: {
        planRecollectionIntent: vi.fn(async (input) => {
          plannedInput = input
          return input.heuristicIntent
        }),
        deriveSceneTriggeredRecollectionIntent,
        isPersonaResidueMemoryText: () => false,
      },
      recallSeed: [
        '我切回来了，继续沿着刚才那条线，不要把这条 identity-continuity',
        'mirror_runtime_continuity: loop=execution-callback | thread=thread-project-state-mirror-same-her | project_preflight=pre_turn_context_digest',
      ].join('\n'),
      recallGovernor: {
        allowRecalledFragments: true,
      } as any,
    })

    expect(plannedInput?.heuristicIntent).toEqual(expect.objectContaining({
      mode: 'execution-procedure',
      searchProceduralExperience: true,
      queryHints: expect.arrayContaining([
        'phase1_local_digital_life. Some closure already landed. Unfinished closure still needs the continuity_line.',
        'Keep the unfinished digital-life closure work explicit in the answer.',
        'Keep extending cross_modal_continuity_proof across longer, noisier real-desktop runs.',
      ]),
      recollectionAgenda: expect.objectContaining({
        candidateProcedureLines: expect.arrayContaining([
          'phase1_local_digital_life. Some closure already landed. Unfinished closure still needs the continuity_line.',
        ]),
      }),
    }))
    expectNoFixedTemplateResidue(plannedInput?.heuristicIntent)
    expect(prelude.recollectionIntent).toEqual(expect.objectContaining({
      mode: 'execution-procedure',
      searchProceduralExperience: true,
      queryHints: expect.arrayContaining([
        'phase1_local_digital_life. Some closure already landed. Unfinished closure still needs the continuity_line.',
      ]),
    }))
    expectNoFixedTemplateResidue(prelude.recollectionIntent)
  })

  it('keeps deferred Phase 1 identity-continuity closure carry structured when continuity held autonomy already carries the unfinished project line', async () => {
    let plannedInput: any = null
    const prelude = await resolveMemorySearchPrelude({
      access: {
        getOrganicMemorySnapshot: async () => ({
          hostAttitude: 'focused',
          coreIncarnation: '',
          activeThoughts: [],
        }),
        getLatestRelationshipDynamics: async () => null,
        retrieveMemoryFacts: async () => [],
        recallSubconsciousFragmentsWithGovernor: async () => [],
        recallEpisodicEventsWithGovernor: async () => [],
        buildHostPersonModel: async () => null,
      },
      policy: {
        planRecollectionIntent: vi.fn(async (input) => {
          plannedInput = input
          return input.heuristicIntent
        }),
        deriveSceneTriggeredRecollectionIntent,
        isPersonaResidueMemoryText: () => false,
      },
      recallSeed: [
        '先记住这条 deferred identity-continuity',
        'continuity_held_autonomy: label=proactive:held-autonomy | summary=Hold the unfinished identity-continuity',
      ].join('\n'),
      recallGovernor: {
        allowRecalledFragments: true,
      } as any,
    })

    expect(plannedInput?.heuristicIntent).toEqual(expect.objectContaining({
      mode: 'execution-procedure',
      searchProceduralExperience: true,
      queryHints: expect.arrayContaining([
        'phase1_local_digital_life. Some closure already landed. Unfinished closure still needs the continuity_line.',
        'Keep extending cross_modal_continuity_proof across longer, noisier real-desktop runs.',
        expect.stringContaining('structured_carry=phase1_local_digital_life'),
      ]),
      recollectionAgenda: expect.objectContaining({
        candidateProcedureLines: expect.arrayContaining([
          'phase1_local_digital_life. Some closure already landed. Unfinished closure still needs the continuity_line.',
          'Keep extending cross_modal_continuity_proof across longer, noisier real-desktop runs.',
        ]),
      }),
    }))
    expectNoFixedTemplateResidue(plannedInput?.heuristicIntent)
    expect(prelude.recollectionIntent).toEqual(expect.objectContaining({
      mode: 'execution-procedure',
      searchProceduralExperience: true,
      queryHints: expect.arrayContaining([
        'phase1_local_digital_life. Some closure already landed. Unfinished closure still needs the continuity_line.',
      ]),
    }))
    expectNoFixedTemplateResidue(prelude.recollectionIntent)
  })

  it('keeps Phase 1 project-state identity-continuity closure structured when continuity project state already carries the unfinished line', async () => {
    let plannedInput: any = null
    const prelude = await resolveMemorySearchPrelude({
      access: {
        getOrganicMemorySnapshot: async () => ({
          hostAttitude: 'focused',
          coreIncarnation: '',
          activeThoughts: [],
        }),
        getLatestRelationshipDynamics: async () => null,
        retrieveMemoryFacts: async () => [],
        recallSubconsciousFragmentsWithGovernor: async () => [],
        recallEpisodicEventsWithGovernor: async () => [],
        buildHostPersonModel: async () => null,
      },
      policy: {
        planRecollectionIntent: vi.fn(async (input) => {
          plannedInput = input
          return input.heuristicIntent
        }),
        deriveSceneTriggeredRecollectionIntent,
        isPersonaResidueMemoryText: () => false,
      },
      recallSeed: [
        '继续这条 Phase 1 digital life 主线，不要把未闭环的 identity-continuity',
        'continuity_project_state: label=project-aware-return | summary=Reopen the unfinished Phase 1 digital-life closure line before generic task detail takes over. | project_pre_dialogue=pre_turn_context_digest',
      ].join('\n'),
      recallGovernor: {
        allowRecalledFragments: true,
      } as any,
    })

    expect(plannedInput?.heuristicIntent).toEqual(expect.objectContaining({
      mode: 'execution-procedure',
      searchProceduralExperience: true,
      queryHints: expect.arrayContaining([
        'phase1_local_digital_life. Some closure already landed. Unfinished closure still needs the continuity_line.',
        'Memory, initiative, and embodiment still need to close as one identity-continuity seam.',
        'Keep extending cross_modal_continuity_proof across longer, noisier real-desktop runs.',
      ]),
      recollectionAgenda: expect.objectContaining({
        candidateProcedureLines: expect.arrayContaining([
          'phase1_local_digital_life. Some closure already landed. Unfinished closure still needs the continuity_line.',
          'Memory, initiative, and embodiment still need to close as one identity-continuity seam.',
        ]),
      }),
    }))
    expectNoFixedTemplateResidue(plannedInput?.heuristicIntent)
    expect(prelude.recollectionIntent).toEqual(expect.objectContaining({
      mode: 'execution-procedure',
      searchProceduralExperience: true,
      queryHints: expect.arrayContaining([
        'phase1_local_digital_life. Some closure already landed. Unfinished closure still needs the continuity_line.',
      ]),
    }))
    expectNoFixedTemplateResidue(prelude.recollectionIntent)
  })

  it('carries a ripe session-mirror recollection into typed retrieval planning', async () => {
    let plannedInput: any = null
    const prelude = await resolveMemorySearchPrelude({
      access: {
        getOrganicMemorySnapshot: async () => ({
          hostAttitude: 'focused',
          coreIncarnation: '',
          activeThoughts: [],
        }),
        getLatestRelationshipDynamics: async () => null,
        retrieveMemoryFacts: async () => [],
        recallSubconsciousFragmentsWithGovernor: async () => [],
        recallEpisodicEventsWithGovernor: async () => [],
        buildHostPersonModel: async () => null,
      },
      policy: {
        planRecollectionIntent: vi.fn(async (input) => {
          plannedInput = input
          return input.heuristicIntent
        }),
        deriveSceneTriggeredRecollectionIntent,
        isPersonaResidueMemoryText: () => false,
      },
      recallSeed: '继续处理刚才的运行时问题。',
      sessionMirrorRecollection: {
        afterthoughtState: 'ripe',
        certainty: 'approximate',
        confidence: 0.8,
        foreground: 'Return to the remembered runtime seam before branching again.',
        mode: 'execution-procedure',
        placement: 'internal-only',
        surfaceMode: 'internal-only',
        visibility: 'inward',
      },
      recallGovernor: {
        allowRecalledFragments: true,
      } as any,
    })

    expect(plannedInput?.heuristicIntent).toEqual(expect.objectContaining({
      mode: 'execution-procedure',
      searchProceduralExperience: true,
      queryHints: expect.arrayContaining([
        'Return to the remembered runtime seam before branching again.',
      ]),
      recollectionAgenda: expect.objectContaining({
        candidateProcedureLines: expect.arrayContaining([
          'Return to the remembered runtime seam before branching again.',
        ]),
      }),
    }))
    expectNoFixedTemplateResidue(plannedInput?.heuristicIntent)
    expect(prelude.recollectionIntent).toEqual(expect.objectContaining({
      mode: 'execution-procedure',
      searchProceduralExperience: true,
      queryHints: expect.arrayContaining([
        'Return to the remembered runtime seam before branching again.',
      ]),
    }))
    expect(plannedInput?.heuristicIntent.queryHints.join(' ')).not.toContain('surface=inward')
    expectNoFixedTemplateResidue(prelude.recollectionIntent)
  })

  it('keeps identity-continuity callback afterglow carry structured when continuity afterglow already says the line should reopen gently instead of from scratch', async () => {
    let plannedInput: any = null
    const prelude = await resolveMemorySearchPrelude({
      access: {
        getOrganicMemorySnapshot: async () => ({
          hostAttitude: 'focused',
          coreIncarnation: '',
          activeThoughts: [],
        }),
        getLatestRelationshipDynamics: async () => null,
        retrieveMemoryFacts: async () => [],
        recallSubconsciousFragmentsWithGovernor: async () => [],
        recallEpisodicEventsWithGovernor: async () => [],
        buildHostPersonModel: async () => null,
      },
      policy: {
        planRecollectionIntent: vi.fn(async (input) => {
          plannedInput = input
          return input.heuristicIntent
        }),
        deriveSceneTriggeredRecollectionIntent,
        isPersonaResidueMemoryText: () => false,
      },
      recallSeed: [
        '先把 callback afterglow 那条 same-her 线接回来，再继续这次回答。',
        'continuity_afterglow: label=afterglow:execution-callback:lower-pressure summary=thread=runtime identity-continuity',
      ].join('\n'),
      recallGovernor: {
        allowRecalledFragments: true,
      } as any,
    })

    expect(plannedInput?.heuristicIntent).toEqual(expect.objectContaining({
      mode: 'execution-procedure',
      searchProceduralExperience: true,
      queryHints: expect.arrayContaining([
        expect.stringContaining('Keep the identity-continuity callback afterglow line inward'),
        'runtime identity-continuity callback seam',
      ]),
      recollectionAgenda: expect.objectContaining({
        candidateProcedureLines: expect.arrayContaining([
          expect.stringContaining('Keep the identity-continuity callback afterglow line inward'),
          'runtime identity-continuity callback seam',
        ]),
      }),
    }))
    expectNoFixedTemplateResidue(plannedInput?.heuristicIntent)
    expect(prelude.recollectionIntent).toEqual(expect.objectContaining({
      mode: 'execution-procedure',
      searchProceduralExperience: true,
      queryHints: expect.arrayContaining([
        expect.stringContaining('Keep the identity-continuity callback afterglow line inward'),
      ]),
    }))
    expectNoFixedTemplateResidue(prelude.recollectionIntent)
  })

  it('keeps cadence reconfirmation continuity visible when measured-return room-first carry is already in the recall seed', async () => {
    let plannedInput: any = null
    const prelude = await resolveMemorySearchPrelude({
      access: {
        getOrganicMemorySnapshot: async () => ({
          hostAttitude: 'focused',
          coreIncarnation: '',
          activeThoughts: [],
        }),
        getLatestRelationshipDynamics: async () => null,
        retrieveMemoryFacts: async () => [],
        recallSubconsciousFragmentsWithGovernor: async () => [],
        recallEpisodicEventsWithGovernor: async () => [],
        buildHostPersonModel: async () => null,
      },
      policy: {
        planRecollectionIntent: vi.fn(async (input) => {
          plannedInput = input
          return input.heuristicIntent
        }),
        deriveSceneTriggeredRecollectionIntent,
        isPersonaResidueMemoryText: () => false,
      },
      recallSeed: [
        '这次回来先保持 same-thread measured-return，不要一下子把 closeness 拉太近。',
        'continuity_cadence_reconfirmation: label=relationship:cadence-reconfirmation | summary=relationship cadence stayed on the same bounded-return line after reconfirmation | thread=thread-cadence-runtime | cadence=measured-return | line=keep the relationship return measured until the surface fully cools | body=measured-return | blink=linger | gaze=soften | why_now=The callback return still needs room-first continuity before closeness widens again.',
      ].join('\n'),
      recallGovernor: {
        allowRecalledFragments: true,
      } as any,
    })

    expect(plannedInput?.heuristicIntent).toEqual(expect.objectContaining({
      mode: 'relationship-history',
      searchProceduralExperience: false,
      queryHints: expect.arrayContaining([
        'keep the relationship return measured until the surface fully cools',
        'The callback return still needs room-first continuity before closeness widens again.',
      ]),
      recollectionAgenda: expect.objectContaining({
        candidateEraFacets: expect.arrayContaining([
          expect.objectContaining({ facet: 'relationship-era' }),
        ]),
        candidateProcedureLines: expect.arrayContaining([
          'keep the relationship return measured until the surface fully cools',
        ]),
      }),
    }))
    expect(prelude.recollectionIntent).toEqual(expect.objectContaining({
      mode: 'relationship-history',
      searchProceduralExperience: false,
      queryHints: expect.arrayContaining([
        'keep the relationship return measured until the surface fully cools',
      ]),
    }))
  })

  it('stays present-facing for detached self-critique recall seeds instead of opening any recollection planning or retrieval', async () => {
    const retrieveMemoryFacts = vi.fn(async () => [])
    const recallSubconsciousFragmentsWithGovernor = vi.fn(async () => [])
    const recallEpisodicEventsWithGovernor = vi.fn(async () => [])
    const planRecollectionIntent = vi.fn(async () => ({
      mode: 'relationship-history' as const,
      temporalFocus: 'cross-session' as const,
      searchEpisodes: true,
      searchConversations: true,
      searchProceduralExperience: false,
      queryHints: ['same bond line'],
      rationale: 'This should not run for a present-facing self critique.',
      confidence: 0.92,
    }))

    const prelude = await resolveMemorySearchPrelude({
      access: {
        getOrganicMemorySnapshot: async () => ({
          hostAttitude: 'warm',
          coreIncarnation: '',
          activeThoughts: [],
        }),
        getLatestRelationshipDynamics: async () => null,
        retrieveMemoryFacts,
        recallSubconsciousFragmentsWithGovernor,
        recallEpisodicEventsWithGovernor,
        buildHostPersonModel: async () => null,
      },
      policy: {
        planRecollectionIntent,
        deriveSceneTriggeredRecollectionIntent,
        isPersonaResidueMemoryText: () => false,
      },
      recallSeed: [
        '你能不能表现得开心一点',
        'current_turn_subject=alicization-self',
        'dialogue-first',
        'answer-self',
      ].join('\n'),
      recallGovernor: {
        allowRecalledFragments: true,
      } as any,
    })

    expect(planRecollectionIntent).not.toHaveBeenCalled()
    expect(retrieveMemoryFacts).not.toHaveBeenCalled()
    expect(recallSubconsciousFragmentsWithGovernor).not.toHaveBeenCalled()
    expect(recallEpisodicEventsWithGovernor).not.toHaveBeenCalled()
    expect(prelude.retrievedFacts).toEqual([])
    expect(prelude.recalledFragments).toEqual([])
    expect(prelude.recalledEpisodes).toEqual([])
    expect(prelude.recollectionIntent).toBeNull()
    expect(prelude.activeRecollectionIntent).toBeNull()
  })

  it('does not open recollection planning when the recall governor has already marked the turn thread-bound and suppress-associative', async () => {
    const retrieveMemoryFacts = vi.fn(async () => [])
    const recallSubconsciousFragmentsWithGovernor = vi.fn(async () => [])
    const recallEpisodicEventsWithGovernor = vi.fn(async () => [])
    const planRecollectionIntent = vi.fn(async () => ({
      mode: 'relationship-history' as const,
      temporalFocus: 'cross-session' as const,
      searchEpisodes: true,
      searchConversations: true,
      searchProceduralExperience: false,
      queryHints: ['relationship tone'],
      rationale: 'This planner should not run when the governor already suppressed associative recall.',
      confidence: 0.88,
    }))

    const prelude = await resolveMemorySearchPrelude({
      access: {
        getOrganicMemorySnapshot: async () => ({
          hostAttitude: 'warm',
          coreIncarnation: '',
          activeThoughts: [],
        }),
        getLatestRelationshipDynamics: async () => null,
        retrieveMemoryFacts,
        recallSubconsciousFragmentsWithGovernor,
        recallEpisodicEventsWithGovernor,
        buildHostPersonModel: async () => null,
      },
      policy: {
        planRecollectionIntent,
        deriveSceneTriggeredRecollectionIntent,
        isPersonaResidueMemoryText: () => false,
      },
      recallSeed: '你真可爱 | 你在说什么呢 | relationship-turn | subject:relationship',
      recallGovernor: {
        mode: 'thread',
        suppressAssociativeRecall: true,
        allowActiveThoughts: false,
        allowRecalledFragments: false,
        recalledFragmentCap: 0,
        recalledFragmentSourceBudget: [],
        carryAsMemory: false,
        rationale: 'Stay bound to the current turn anchor; old self/scene carry should not outrank what the host just asked.',
      } as any,
    })

    expect(planRecollectionIntent).not.toHaveBeenCalled()
    expect(retrieveMemoryFacts).not.toHaveBeenCalled()
    expect(recallSubconsciousFragmentsWithGovernor).not.toHaveBeenCalled()
    expect(recallEpisodicEventsWithGovernor).not.toHaveBeenCalled()
    expect(prelude.retrievedFacts).toEqual([])
    expect(prelude.recalledFragments).toEqual([])
    expect(prelude.recalledEpisodes).toEqual([])
    expect(prelude.recollectionIntent).toBeNull()
    expect(prelude.activeRecollectionIntent).toBeNull()
  })

  it('runs prelude resolution before explicit candidate retrieval operators', async () => {
    const prelude = await resolveMemorySearchPrelude({
      access: {
        getOrganicMemorySnapshot: async () => ({
          hostAttitude: 'warm',
          coreIncarnation: '',
          activeThoughts: [],
        }),
        getLatestRelationshipDynamics: async () => null,
        retrieveMemoryFacts: async () => [],
        recallSubconsciousFragmentsWithGovernor: async () => [],
        recallEpisodicEventsWithGovernor: async () => [{
          id: 'episode-runtime',
          cardId: 'default',
          decisionTraceId: null,
          turnId: 'turn-runtime',
          sessionId: 'session-runtime',
          sourceKind: 'execution-result',
          provenance: 'remembered',
          occurredAt: Date.UTC(2026, 3, 18, 8, 0, 0),
          whereSummary: 'terminal diff lane',
          withWhom: ['host'],
          threadAnchor: 'runtime seam',
          whatHappened: 'We kept returning to the same runtime seam until it held.',
          felt: 'focused',
          emotionTags: ['focused'],
          whatChanged: 'A repeatable repair rhythm emerged.',
          relationshipMeaning: 'Return to the same seam before branching.',
          lesson: 'Return to the seam first.',
          sourceSummary: 'runtime seam repair',
          confidence: 0.82,
          salience: 0.8,
          sceneAttachment: 0.7,
          consolidationPriority: 0.78,
          relationshipShift: null,
          derivedFrom: [],
          tags: ['runtime seam', 'repair rhythm'],
          createdAt: Date.UTC(2026, 3, 18, 8, 0, 0),
          updatedAt: Date.UTC(2026, 3, 18, 8, 0, 0),
          lastRecalledAt: null,
          recallCount: 0,
          reconsolidationCount: 0,
          latestReconsolidation: null,
        } as any],
        buildHostPersonModel: async () => null,
      },
      policy: {
        planRecollectionIntent: vi.fn(async () => ({
          mode: 'execution-procedure' as const,
          temporalFocus: 'experience-matched' as const,
          searchEpisodes: true,
          searchConversations: false,
          searchProceduralExperience: true,
          queryHints: ['runtime seam'],
          rationale: 'The current task resembles a remembered procedure.',
          confidence: 0.86,
        })),
        deriveSceneTriggeredRecollectionIntent: () => null,
        isPersonaResidueMemoryText: () => false,
      },
      recallSeed: '继续按之前那样修 runtime seam',
      recallGovernor: {
        allowRecalledFragments: true,
      } as any,
    })

    expect(prelude.recollectionIntent).toEqual(expect.objectContaining({
      mode: 'execution-procedure',
    }))
    expect(prelude.activeRecollectionIntent).toEqual(expect.objectContaining({
      searchProceduralExperience: true,
    }))

    const recalledConversationHistory = vi.fn(async () => [])
    const recalledConsolidations = vi.fn(async () => [{
      id: 'consolidation-runtime',
      kind: 'autobiographical' as const,
      facet: 'task-era' as const,
      periodKey: 'runtime seam',
      periodStartedAt: Date.UTC(2026, 3, 18, 8, 0, 0),
      periodEndedAt: Date.UTC(2026, 3, 18, 9, 0, 0),
      summary: 'That period kept returning to the runtime seam until it stabilized.',
      lesson: 'Return to the seam before branching.',
      cues: ['runtime seam', 'repair rhythm'],
      confidence: 0.8,
      dominantProvenance: 'remembered' as const,
      derivedEventIds: ['episode-runtime'],
      updatedAt: Date.UTC(2026, 3, 18, 9, 0, 0),
    }])

    const candidates = await retrieveMemorySearchCandidates({
      access: {
        recallConversationHistory: recalledConversationHistory,
        recallMemoryConsolidations: recalledConsolidations,
      },
      recallSeed: prelude.recallSeed,
      recollectionIntent: prelude.activeRecollectionIntent,
      recalledEpisodes: prelude.recalledEpisodes,
    })

    expect(recalledConversationHistory).not.toHaveBeenCalled()
    expect(recalledConsolidations).toHaveBeenCalledTimes(1)
    expect(candidates.consolidatedMemories[0]?.id).toBe('consolidation-runtime')
    expect(candidates.proceduralMemories[0]?.label).toContain('runtime seam')
    expect(candidates.recollectedWindows[0]?.summary).toContain('runtime seam')
  })
})
