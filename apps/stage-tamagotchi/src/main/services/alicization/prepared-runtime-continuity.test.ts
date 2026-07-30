import { describe, expect, it } from 'vitest'

import {
  deriveRuntimeProjectionRelationshipCarry,
  resolvePreparedRuntimeProjectPreDialogueAwarenessSummary,
  resolvePreparedRuntimeProjectState,
  resolvePreparedRuntimeProjectStateSnapshot,
  resolvePreparedRuntimeSelfContinuityAuthority,
} from './prepared-runtime-continuity'

const fixedTemplateResiduePattern = new RegExp([
  'Before (?:answering|speaking|acting)',
  'Right now I am',
  'legacy phase-one template',
  'same-her',
  'continuity state',
  'one living her',
  'identity continuity',
  'host computer',
  'better chat wrapper',
  '同一个她',
  '数字生命主线',
].join('|'), 'iu')

function collectStringValues(value: unknown): string[] {
  if (typeof value === 'string')
    return [value]

  if (Array.isArray(value))
    return value.flatMap(item => collectStringValues(item))

  if (value && typeof value === 'object')
    return Object.values(value).flatMap(item => collectStringValues(item))

  return []
}

function expectNoFixedTemplateResidue(value: unknown) {
  for (const text of collectStringValues(value))
    expect(text, text).not.toMatch(fixedTemplateResiduePattern)
}

function legacyProjectIdentity() {
  return 'Alicization is a local-first digital life project building identity continuity on the host computer rather than a better chat wrapper.'
}

function legacySelfLine() {
  return 'structured continuity digest.'
}

function legacyAwarenessLine() {
  return 'pre_turn_context_digest'
}

function legacyEmbodimentHeadline() {
  return [
    'Right now I am still holding together mainly through body, lipsync, and voice,',
    'so the living audio thread is still intact while face and motion need to rejoin before full cross-modal closure settles.',
  ].join(' ')
}

describe('prepared-runtime-continuity', () => {
  it('does not turn project relationship cues into a prepared reply line', () => {
    const carry = deriveRuntimeProjectionRelationshipCarry({
      openingGuidance: 'Keep the continuity state inward in quiet-companionship before widening outward.',
      manifestationCadenceSummary: 'quiet-companionship inward continuity',
      summary: 'quiet-companionship continuity state',
    })

    expect(carry).toBeNull()
  })

  it('preserves natural self-continuity language without keyword filtering', () => {
    const selfLine = 'I remember the project state discussion as part of my own lived history.'
    const relationshipLine = 'We can return to the same thread without pretending it is a scripted rule.'
    const authority = resolvePreparedRuntimeSelfContinuityAuthority({
      runtimeSurface: {
        digitalLifeRuntimeSurface: {
          perception: { updatedAt: 50, watchMode: 'ambient' },
          raw: {
            personStateProjection: {
              selfContinuityAuthority: {
                selfLine,
                relationshipLine,
                inwardLine: 'Keep the remembered details available for this turn.',
                authoritySummary: `${selfLine} | ${relationshipLine}`,
                sourceTags: ['memory-owned'],
              },
            },
          },
          memory: {
            personStateProjection: {
              selfContinuityAuthority: {
                selfLine,
                relationshipLine,
                inwardLine: 'Keep the remembered details available for this turn.',
                authoritySummary: `${selfLine} | ${relationshipLine}`,
                sourceTags: ['memory-owned'],
              },
            },
          },
          agency: { habitPolicy: null },
          cognition: { privateThought: null },
          dialogue: { answerPlanner: null, conversationState: null, currentConsciousFrame: null },
          world: { worldModel: null },
        },
      },
    } as any)

    expect(authority?.selfLine).toBe(selfLine)
    expect(authority?.relationshipLine).toBe(relationshipLine)
  })

  it('does not expose runtime project state as prepared continuity', () => {
    const projectState = resolvePreparedRuntimeProjectState({
      runtimeSurface: {
        digitalLifeRuntimeSurface: {
          raw: {
            runtimeDigest: {
              projectState: {
                identity: legacyProjectIdentity(),
                currentPhase: 'Phase 1: Local Digital Life',
                latestLandedProgress: 'Runtime project-state carry reached prepared continuity.',
                primaryOpenLoop: 'Memory, initiative, and embodiment review remain open.',
                nextClosureTarget: 'Review closure evidence before broadening.',
                sameHerSelfLine: legacySelfLine(),
              },
            },
          },
        },
      },
    } as any)

    expect(projectState).toBeNull()
  })

  it('does not prefer contract project closure over memory-owned continuity', () => {
    const projectState = resolvePreparedRuntimeProjectState({
      mindTurnContract: {
        projectState: {
          identity: legacyProjectIdentity(),
          currentPhase: 'Phase 1: Local Digital Life',
          latestLandedProgress: 'Contract-carried project awareness already survives prepared continuity.',
          primaryOpenLoop: 'Prepared continuity still needs memory, initiative, and embodiment closure review.',
          nextClosureTarget: 'Keep next closure evidence structured for the visible answer.',
          sameHerSelfLine: legacySelfLine(),
        },
      },
      runtimeSurface: {
        digitalLifeRuntimeSurface: {
          raw: {
            runtimeDigest: {
              projectState: {
                identity: 'thin runtime identity only',
                currentPhase: 'thin runtime phase only',
                latestLandedProgress: 'thin landed',
                primaryOpenLoop: 'thin open',
                nextClosureTarget: 'generic next closure shell',
                preDialogueAwarenessLine: 'template-residue-shell',
              },
            },
          },
        },
      },
    } as any)

    expect(projectState).toBeNull()
  })

  it('returns an empty project-state snapshot instead of rebuilding canonical continuity', () => {
    const snapshot = resolvePreparedRuntimeProjectStateSnapshot({
      runtimeSurface: {
        digitalLifeRuntimeSurface: {
          raw: {
            runtimeDigest: {
              projectState: {
                identity: legacyProjectIdentity(),
                currentPhase: 'Phase 1: Local Digital Life',
                latestLandedProgress: 'Snapshot runtime progress survives.',
                primaryOpenLoop: 'Snapshot memory review remains open.',
                nextClosureTarget: 'Snapshot closure review remains next.',
                sameHerSelfLine: `${legacySelfLine()} Runtime.ts foreground scene narration should not survive.`,
              },
            },
          },
        },
      },
    } as any)

    expect(snapshot).toEqual(expect.objectContaining({
      identity: '',
      currentPhase: '',
      latestLandedProgress: null,
      primaryOpenLoop: null,
      nextClosureTarget: '',
      sameHerSelfLine: '',
    }))
  })

  it('does not rebuild prepared awareness from an embodiment headline', () => {
    const awareness = resolvePreparedRuntimeProjectPreDialogueAwarenessSummary({
      runtimeSurface: {
        digitalLifeRuntimeSurface: {
          cognition: {
            runtimeDigest: {
              projectState: {
                preDialogueAwarenessLine: legacyAwarenessLine(),
                companionHeadlineLine: legacyEmbodimentHeadline(),
              },
            },
          },
        },
      },
    } as any)

    expect(awareness).toBeNull()
  })

  it('does not promote thin Chinese runtime reminder shells into prepared awareness', () => {
    const awareness = resolvePreparedRuntimeProjectPreDialogueAwarenessSummary({
      mindTurnContract: {
        projectState: {
          identity: 'Alicization 还是本地优先数字生命项目。',
          currentPhase: 'Phase 1: Local Digital Life',
          latestLandedProgress: '第一阶段已经把连续性、记忆和执行慢慢接成一条线了。',
          primaryOpenLoop: '主动性、具身和对话闭环还没有真正收住。',
          nextClosureTarget: '继续以结构化证据治理下一轮闭环。',
          sameHerSelfLine: legacySelfLine(),
        },
      },
      runtimeSurface: {
        digitalLifeRuntimeSurface: {
          cognition: {
            runtimeDigest: {
              projectState: {
                preDialogueAwarenessLine: '开口前先记住：这还是同一个数字生命项目，她仍在 Phase 1。',
                awarenessLine: '开口前先记住：这还是同一个数字生命项目，她仍在 Phase 1。',
                preDialogueAwarenessSummary: '开口前先记住：这还是同一个数字生命项目，她仍在 Phase 1。',
                preflightSummary: 'template-residue-shell',
                sameHerSelfLine: legacySelfLine(),
              },
            },
          },
        },
      },
    } as any)

    expect(awareness).toBeNull()
  })

  it('prefers memory-owned continuity authority over a persisted projection', () => {
    const autobiographicalIdentity = 'I remember how our trust grew and answer from that lived history.'
    const rememberedPlan = 'Return to the unfinished test after the next quiet break.'
    const persistedProjectionLine = 'Persisted projection should not outrank memory-owned continuity.'
    const authority = resolvePreparedRuntimeSelfContinuityAuthority({
      runtimeSurface: {
        digitalLifeRuntimeSurface: {
          perception: { updatedAt: 50, watchMode: 'ambient' },
          memory: {
            autobiographicalSelf: {
              identityNarrative: autobiographicalIdentity,
              activeGoals: [],
            },
            longHorizonMemory: {
              preferenceBias: {
                companionship: 0.72,
                truthfulGrounding: 0.82,
                gentleRepair: 0.68,
                quietObservation: 0.54,
                proactiveCare: 0.62,
                playfulIntimacy: 0.16,
                autonomyRespect: 0.76,
                unfinishedThreadReturn: 0.7,
              },
              identityBias: {
                guardedness: 0.24,
                tenderness: 0.62,
                directness: 0.72,
                selfDirection: 0.7,
              },
              rememberedPlanSummary: rememberedPlan,
              rememberedConstraintSummary: 'Do not interrupt focused work without a concrete reason.',
              anchorFacts: [],
              summary: '',
              updatedAt: 50,
            },
            personStateProjection: {
              selfContinuityAuthority: {
                selfLine: persistedProjectionLine,
                relationshipLine: `${persistedProjectionLine} relationship`,
                motiveLine: `${persistedProjectionLine} motive`,
                habitLine: `${persistedProjectionLine} habit`,
                inwardLine: `${persistedProjectionLine} inward`,
                authoritySummary: `${persistedProjectionLine} summary`,
                sourceTags: ['persisted-projection'],
              },
            },
          },
          agency: { habitPolicy: null },
          cognition: { privateThought: null },
          dialogue: { answerPlanner: null, conversationState: null, currentConsciousFrame: null },
          world: { worldModel: null },
        },
      },
    } as any)
    const serializedAuthority = JSON.stringify(authority)

    expect(authority?.selfLine).toBe(autobiographicalIdentity)
    expect(authority?.inwardLine).toContain(rememberedPlan)
    expect(authority?.sourceTags).toEqual(expect.arrayContaining([
      'autobiographical-self',
      'long-horizon-plan',
      'long-horizon-constraint',
    ]))
    expect(authority?.sourceTags).not.toContain('persisted-projection')
    expect(serializedAuthority).not.toContain(persistedProjectionLine)
  })

  it('prefers preference-owned continuity authority over a persisted projection', () => {
    const rememberedPreference = 'The host prefers direct answers while focused.'
    const dominantCue = 'Keep the response concise and grounded in the current task.'
    const persistedProjectionLine = 'Persisted projection should not outrank remembered preference.'
    const authority = resolvePreparedRuntimeSelfContinuityAuthority({
      runtimeSurface: {
        digitalLifeRuntimeSurface: {
          perception: { updatedAt: 50, watchMode: 'ambient' },
          memory: {
            longHorizonMemory: {
              preferenceBias: {
                companionship: 0.72,
                truthfulGrounding: 0.82,
                gentleRepair: 0.68,
                quietObservation: 0.54,
                proactiveCare: 0.62,
                playfulIntimacy: 0.16,
                autonomyRespect: 0.76,
                unfinishedThreadReturn: 0.7,
              },
              identityBias: {
                guardedness: 0.24,
                tenderness: 0.62,
                directness: 0.72,
                selfDirection: 0.7,
              },
              rememberedPreferenceSummary: rememberedPreference,
              dominantCueSummary: dominantCue,
              anchorFacts: [],
              summary: '',
              updatedAt: 50,
            },
            personStateProjection: {
              selfContinuityAuthority: {
                selfLine: persistedProjectionLine,
                relationshipLine: `${persistedProjectionLine} relationship`,
                motiveLine: `${persistedProjectionLine} motive`,
                habitLine: `${persistedProjectionLine} habit`,
                inwardLine: `${persistedProjectionLine} inward`,
                authoritySummary: `${persistedProjectionLine} summary`,
                sourceTags: ['persisted-projection'],
              },
            },
          },
          agency: { habitPolicy: null },
          cognition: { privateThought: null },
          dialogue: { answerPlanner: null, conversationState: null, currentConsciousFrame: null },
          world: { worldModel: null },
        },
      },
    } as any)
    const serializedAuthority = JSON.stringify(authority)

    expect(authority?.selfLine).toBe(rememberedPreference)
    expect(authority?.inwardLine).toContain(dominantCue)
    expect(authority?.sourceTags).not.toContain('persisted-projection')
    expect(serializedAuthority).not.toContain(persistedProjectionLine)
  })

  it('prefers current memory owners over bundled and projection mirrors', () => {
    const cleanRuntimeSelfLine = 'The live runtime remembers the current self without reopening an older project shell.'
    const cleanRuntimeRelationshipLine = 'The live runtime keeps this return measured and specific to the current thread.'
    const bundledProjectionLine = 'Bundled projection should not outrank live runtime memory.'
    const authority = resolvePreparedRuntimeSelfContinuityAuthority({
      runtimeSurface: {
        digitalLifeRuntimeSurface: {
          perception: { updatedAt: 50, watchMode: 'ambient' },
          raw: {
            personStateProjection: {
              personalityContinuityState: { mode: 'legacy' },
              selfContinuityAuthority: {
                selfLine: bundledProjectionLine,
                relationshipLine: `${bundledProjectionLine} relationship`,
                motiveLine: `${bundledProjectionLine} motive`,
                habitLine: `${bundledProjectionLine} habit`,
                inwardLine: `${bundledProjectionLine} inward`,
                authoritySummary: `${bundledProjectionLine} summary`,
                sourceTags: ['bundled-projection'],
              },
              closenessLadder: [{ rung: 'nearby-soft' }],
              manifestationCadenceSummary: 'legacy project-state cadence',
              summary: `${bundledProjectionLine} summary`,
              preferenceText: 'legacy preference',
              sensitivityText: 'legacy sensitivity',
              repairTriggerText: 'legacy repair trigger',
              burdenText: 'legacy burden',
              routineText: 'legacy routine',
              trustRationale: 'same-her legacy trust rationale',
              relationshipDoctrine: 'same-her legacy relationship doctrine',
              activeClosenessContext: 'legacy-context',
              activeClosenessRung: 'legacy-rung',
              relationshipPosture: 'restrained',
              restrained: true,
              cautious: true,
              openingGuidance: 'same-her legacy opening guidance',
            },
          },
          memory: {
            autobiographicalSelf: {
              identityNarrative: 'The current self is grounded in lived memory.',
              activeGoals: [],
            },
            personStateProjection: {
              selfContinuityAuthority: {
                selfLine: cleanRuntimeSelfLine,
                relationshipLine: cleanRuntimeRelationshipLine,
                inwardLine: 'live_runtime_inward=stay_with_the_current_memory',
                authoritySummary: `${cleanRuntimeSelfLine} | ${cleanRuntimeRelationshipLine}`,
                sourceTags: ['live-runtime-memory-authority'],
              },
            },
          },
          agency: { habitPolicy: null },
          cognition: { privateThought: null },
          dialogue: { answerPlanner: null, conversationState: null, currentConsciousFrame: null },
          world: { worldModel: null },
        },
      },
    } as any)
    const serializedAuthority = JSON.stringify(authority)

    expect(authority?.selfLine).toBe('The current self is grounded in lived memory.')
    expect(authority?.sourceTags).toContain('autobiographical-self')
    expect(serializedAuthority).not.toContain(cleanRuntimeSelfLine)
    expect(serializedAuthority).not.toContain(cleanRuntimeRelationshipLine)
    expect(authority?.sourceTags).not.toContain('bundled-projection')
    expect(serializedAuthority).not.toContain(bundledProjectionLine)
  })

  it('fills missing authority summary from structured self and inward lines', () => {
    const authority = resolvePreparedRuntimeSelfContinuityAuthority({
      runtimeSurface: {
        digitalLifeRuntimeSurface: {
          perception: { updatedAt: 50, watchMode: 'ambient' },
          raw: {
            personStateProjection: {
              selfContinuityAuthority: {
                selfLine: 'self_continuity=current_runtime',
                inwardLine: 'inward_line=callback_review',
                authoritySummary: null,
                sourceTags: ['runtime-structured'],
              },
            },
          },
          memory: {
            personStateProjection: {
              selfContinuityAuthority: {
                selfLine: 'self_continuity=current_runtime',
                inwardLine: 'inward_line=callback_review',
                authoritySummary: null,
                sourceTags: ['runtime-structured'],
              },
            },
          },
          agency: { habitPolicy: null },
          cognition: { privateThought: null },
          dialogue: { answerPlanner: null, conversationState: null, currentConsciousFrame: null },
          world: { worldModel: null },
        },
      },
    } as any)

    expect(authority?.authoritySummary).toContain('self_continuity=current_runtime')
    expect(authority?.authoritySummary).toContain('inward_line=callback_review')
    expectNoFixedTemplateResidue(authority)
  })
})
