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
  'Same Phase 1 digital life',
  'same-her',
  'same living line',
  'one living her',
  'one continuous her',
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
  return 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.'
}

function legacySelfLine() {
  return 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.'
}

function legacyAwarenessLine() {
  return 'Before answering, remember: this is still one same digital life and embodiment closure is still open.'
}

function legacyEmbodimentHeadline() {
  return [
    'Right now I am still holding together mainly through body, lipsync, and voice,',
    'so the living audio thread is still intact while face and motion need to rejoin before full cross-modal closure settles.',
  ].join(' ')
}

describe('prepared-runtime-continuity', () => {
  it('derives relationship carry from quiet-companionship projection cues without returning the cue template', () => {
    const carry = deriveRuntimeProjectionRelationshipCarry({
      openingGuidance: 'Keep the same living line inward in quiet-companionship before widening outward.',
      manifestationCadenceSummary: 'quiet-companionship inward continuity',
      summary: 'quiet-companionship same living line',
    })

    expect(carry).toBe('relationship_carry=low_pressure; continuity=quiet_companionship; closeness=widen_later')
    expect(carry).not.toContain('same living line')
  })

  it('resolves runtime project state into structured canonical identity and preserves runtime progress evidence', () => {
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

    expect(projectState?.identity).toContain('local_desktop_life_loop')
    expect(projectState?.currentPhase).toContain('local_desktop_life_loop')
    expect(projectState?.latestLandedProgress).toBe('Runtime project-state carry reached prepared continuity.')
    expect(projectState?.primaryOpenLoop).toBe('Memory, initiative, and embodiment review remain open.')
    expect(projectState?.nextClosureTarget).toBe('Review closure evidence before broadening.')
    expect(projectState?.sameHerSelfLine).toContain('project_state_governance')
    expectNoFixedTemplateResidue(projectState)
  })

  it('prefers richer contract closure fields when runtime project state is only a thin shell', () => {
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
                preDialogueAwarenessLine: 'same digital life | keep the closure seam explicit',
              },
            },
          },
        },
      },
    } as any)

    expect(projectState?.latestLandedProgress).toBe('Contract-carried project awareness already survives prepared continuity.')
    expect(projectState?.primaryOpenLoop).toBe('Prepared continuity still needs memory, initiative, and embodiment closure review.')
    expect(projectState?.nextClosureTarget).toBe('Keep next closure evidence structured for the visible answer.')
    expect(projectState?.preDialogueAwarenessLine).toContain('landed=Contract-carried project awareness already survives prepared continuity')
    expect(projectState?.preDialogueAwarenessLine).toContain('open=Prepared continuity still needs memory, initiative, and embodiment closure review')
    expectNoFixedTemplateResidue(projectState)
  })

  it('builds a snapshot that falls back from contaminated runtime self line to structured canonical continuity', () => {
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

    expect(snapshot.identity).toContain('local_desktop_life_loop')
    expect(snapshot.currentPhase).toContain('local_desktop_life_loop')
    expect(snapshot.latestLandedProgress).toContain('continuity_progress=partial')
    expect(snapshot.sameHerSelfLine).toContain('project_state_governance')
    expectNoFixedTemplateResidue(snapshot)
  })

  it('resolves prepared awareness from old companion headline into structured closure evidence', () => {
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

    expect(awareness).toContain('landed=')
    expect(awareness).toContain('open=memory_dialogue_embodiment_closure')
    expect(awareness).toContain('next=cross_modal_continuity_proof')
    expectNoFixedTemplateResidue(awareness)
  })

  it('does not preserve thin Chinese runtime reminder shells as prepared awareness', () => {
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
                preflightSummary: 'same digital life | keep the closure seam explicit',
                sameHerSelfLine: legacySelfLine(),
              },
            },
          },
        },
      },
    } as any)

    expect(awareness).toContain('open=主动性、具身和对话闭环还没有真正收住。')
    expect(awareness).toContain('next=继续以结构化证据治理下一轮闭环。')
    expectNoFixedTemplateResidue(awareness)
  })

  it('prefers richer bundled self-continuity authority over a thinner runtime projection', () => {
    const authority = resolvePreparedRuntimeSelfContinuityAuthority({
      runtimeSurface: {
        digitalLifeSpine: {
          runtimeSurface: {
            perception: { updatedAt: 50 },
            raw: {
              personStateProjection: {
                selfContinuityAuthority: {
                  selfLine: 'self_continuity=project_state_governance',
                  relationshipLine: 'relationship_carry=callback_current_thread; pressure=lower',
                  inwardLine: 'inward_line=memory_execution_embodiment_review',
                  authoritySummary: 'self_continuity=project_state_governance | relationship_carry=callback_current_thread; pressure=lower',
                  closenessPosture: 'space-first',
                  sourceTags: ['project-state-carry', 'bundle-rich'],
                },
              },
            },
            memory: {
              personStateProjection: {
                selfContinuityAuthority: {
                  selfLine: 'self_continuity=project_state_governance',
                  relationshipLine: 'relationship_carry=callback_current_thread; pressure=lower',
                  inwardLine: 'inward_line=memory_execution_embodiment_review',
                  authoritySummary: 'self_continuity=project_state_governance | relationship_carry=callback_current_thread; pressure=lower',
                  closenessPosture: 'space-first',
                  sourceTags: ['project-state-carry', 'bundle-rich'],
                },
              },
            },
            agency: { habitPolicy: null },
            cognition: { privateThought: null },
            dialogue: { answerPlanner: null, conversationState: null, currentConsciousFrame: null },
            world: { worldModel: null },
          },
        },
        digitalLifeRuntimeSurface: {
          perception: { updatedAt: 10, watchMode: 'ambient' },
          raw: {
            personStateProjection: {
              selfContinuityAuthority: {
                selfLine: 'current return only',
                sourceTags: ['runtime-thin'],
              },
            },
          },
          memory: {
            personStateProjection: {
              selfContinuityAuthority: {
                selfLine: 'current return only',
                sourceTags: ['runtime-thin'],
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

    expect(authority).toEqual(expect.objectContaining({
      selfLine: 'self_continuity=project_state_governance',
      relationshipLine: 'relationship_carry=callback_current_thread; pressure=lower',
      inwardLine: 'inward_line=memory_execution_embodiment_review',
      closenessPosture: 'space-first',
    }))
    expect(authority?.sourceTags).toEqual(expect.arrayContaining(['project-state-carry', 'bundle-rich']))
    expectNoFixedTemplateResidue(authority)
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
