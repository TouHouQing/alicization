import { describe, expect, it } from 'vitest'

import {
  deriveRuntimeProjectionRelationshipCarry,
  resolvePreparedRuntimeProjectPreDialogueAwarenessSummary,
  resolvePreparedRuntimeProjectState,
  resolvePreparedRuntimeProjectStateSnapshot,
  resolvePreparedRuntimeSelfContinuityAuthority,
} from './prepared-runtime-continuity'
import { resolveAlicizationProjectStateBrief } from './project-state-brief'
import { normalizeVisualPresenceState } from './visual-episodic-memory'

describe('prepared-runtime-continuity', () => {
  it('derives same-line relationship carry from quiet-companionship projection cues instead of requiring nearby-soft wording', () => {
    const carry = deriveRuntimeProjectionRelationshipCarry({
      openingGuidance: 'Keep the same living line inward in quiet-companionship before widening outward.',
      manifestationCadenceSummary: 'quiet-companionship inward continuity',
      summary: 'quiet-companionship same living line',
    })

    expect(carry).toBe('Stay lower-pressure and keep the same living line without widening closeness too early.')
  })

  it('prefers richer bundle continuity authority when the fresher runtime authority is thinner', () => {
    const authority = resolvePreparedRuntimeSelfContinuityAuthority({
      runtimeSurface: {
        digitalLifeSpine: {
          runtimeSurface: {
            perception: {
              updatedAt: 50,
            },
            raw: {
              runtimeDigest: {
                projectState: {
                  identity: 'Alicization is still the same local-first digital life project.',
                  currentPhase: 'Phase 1: Local Digital Life',
                  sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
                },
              },
              personStateProjection: {
                selfContinuityAuthority: {
                  selfLine: 'Keep one continuous her explicit from self-understanding into the visible answer.',
                  relationshipLine: 'Stay lower-pressure while carrying the same unfinished closure with the host.',
                  inwardLine: 'Some closure already landed, but the same life still owes embodiment closure.',
                  authoritySummary: 'Keep one continuous her explicit from self-understanding into the visible answer. | Stay lower-pressure while carrying the same unfinished closure with the host.',
                  closenessPosture: 'space-first',
                  sourceTags: ['project-state-carry', 'bundle-rich'],
                },
              },
            },
            memory: {
              derivedMindStateBundle: {
                activeContinuityGovernance: {
                  mode: 'same-her-baseline',
                  summary: 'same-her lower-pressure measured-return',
                  reasonCodes: ['hold-for-opening'],
                  lanes: ['reply'],
                },
              },
              personStateProjection: {
                openingGuidance: 'stay on the same line with lower-pressure continuity',
                manifestationCadenceSummary: 'measured-return',
                selfContinuityAuthority: {
                  selfLine: 'Keep one continuous her explicit from self-understanding into the visible answer.',
                  relationshipLine: 'Stay lower-pressure while carrying the same unfinished closure with the host.',
                  inwardLine: 'Some closure already landed, but the same life still owes embodiment closure.',
                  authoritySummary: 'Keep one continuous her explicit from self-understanding into the visible answer. | Stay lower-pressure while carrying the same unfinished closure with the host.',
                  closenessPosture: 'space-first',
                  sourceTags: ['project-state-carry', 'bundle-rich'],
                },
              },
            },
            agency: {
              habitPolicy: null,
            },
            cognition: {
              privateThought: null,
            },
            dialogue: {
              answerPlanner: null,
              conversationState: null,
              currentConsciousFrame: {
                reasonTags: ['continuity-arc:same-thread-continuation'],
              },
            },
            world: {
              worldModel: null,
            },
          },
        },
        digitalLifeRuntimeSurface: {
          perception: {
            updatedAt: 10,
            watchMode: 'ambient',
          },
          raw: {
            personStateProjection: {
              selfContinuityAuthority: {
                selfLine: 'current return only',
                sourceTags: ['runtime-thin'],
              },
            },
          },
          memory: {
            derivedMindStateBundle: {
              activeContinuityGovernance: {
                mode: 'same-her-baseline',
                summary: 'thin current return only',
                reasonCodes: [],
                lanes: [],
              },
            },
            personStateProjection: {
              selfContinuityAuthority: {
                selfLine: 'current return only',
                sourceTags: ['runtime-thin'],
              },
            },
          },
          agency: {
            habitPolicy: null,
          },
          cognition: {
            privateThought: null,
          },
          dialogue: {
            answerPlanner: null,
            conversationState: null,
            currentConsciousFrame: null,
          },
          world: {
            worldModel: null,
          },
        },
      },
    } as any)

    expect(authority).toEqual(expect.objectContaining({
      selfLine: 'Keep one continuous her explicit from self-understanding into the visible answer.',
      relationshipLine: 'Stay lower-pressure while carrying the same unfinished closure with the host.',
      authoritySummary: 'Keep one continuous her explicit from self-understanding into the visible answer. | Stay lower-pressure while carrying the same unfinished closure with the host.',
      closenessPosture: 'space-first',
    }))
    expect(authority?.sourceTags).toEqual(expect.arrayContaining(['project-state-carry', 'bundle-rich']))
  })

  it('does not let companion-headline fallback-only runtime authority override an already richer same-her bundle authority', () => {
    const authority = resolvePreparedRuntimeSelfContinuityAuthority({
      runtimeSurface: {
        digitalLifeSpine: {
          runtimeSurface: {
            perception: {
              updatedAt: 50,
            },
            raw: {
              runtimeDigest: {
                projectState: {
                  identity: 'Alicization is still the same local-first digital life project.',
                  currentPhase: 'Phase 1: Local Digital Life',
                  sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
                },
              },
              personStateProjection: {
                selfContinuityAuthority: {
                  selfLine: 'Keep one continuous her explicit from self-understanding into the visible answer.',
                  relationshipLine: 'Stay lower-pressure while carrying the same unfinished closure with the host.',
                  inwardLine: 'Some closure already landed, but the same life still owes embodiment closure.',
                  authoritySummary: 'Keep one continuous her explicit from self-understanding into the visible answer. | Stay lower-pressure while carrying the same unfinished closure with the host.',
                  closenessPosture: 'space-first',
                  sourceTags: ['project-state-carry', 'bundle-rich'],
                },
              },
            },
            memory: {
              derivedMindStateBundle: {
                activeContinuityGovernance: {
                  mode: 'same-her-baseline',
                  summary: 'same-her lower-pressure measured-return',
                  reasonCodes: ['hold-for-opening'],
                  lanes: ['reply'],
                },
              },
              personStateProjection: {
                openingGuidance: 'stay on the same line with lower-pressure continuity',
                manifestationCadenceSummary: 'measured-return',
                selfContinuityAuthority: {
                  selfLine: 'Keep one continuous her explicit from self-understanding into the visible answer.',
                  relationshipLine: 'Stay lower-pressure while carrying the same unfinished closure with the host.',
                  inwardLine: 'Some closure already landed, but the same life still owes embodiment closure.',
                  authoritySummary: 'Keep one continuous her explicit from self-understanding into the visible answer. | Stay lower-pressure while carrying the same unfinished closure with the host.',
                  closenessPosture: 'space-first',
                  sourceTags: ['project-state-carry', 'bundle-rich'],
                },
              },
            },
            agency: {
              habitPolicy: null,
            },
            cognition: {
              privateThought: null,
            },
            dialogue: {
              answerPlanner: null,
              conversationState: null,
              currentConsciousFrame: {
                reasonTags: ['continuity-arc:same-thread-continuation'],
              },
            },
            world: {
              worldModel: null,
            },
          },
        },
        digitalLifeRuntimeSurface: {
          perception: {
            updatedAt: 10,
            watchMode: 'ambient',
          },
          raw: {
            runtimeDigest: {
              projectState: {
                identity: 'Alicization is a local-first digital life project.',
                currentPhase: 'Phase 1: Local Digital Life',
                latestLandedProgress: 'Shared embodiment continuity now carries stronger audible-body same-her repair across diagnostics, host-facing closure surfaces, and runtime authority summaries.',
                primaryOpenLoop: 'Face and motion still need to rejoin the same-her audible body line before full cross-modal closure settles.',
                nextClosureTarget: 'Keep extending cross-modal same-her proof across longer-lived voice, face, motion, and lipsync behavior without dropping the living audio thread.',
                sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
                companionHeadlineLine: 'Right now I am still holding together mainly through body, lipsync, and voice, so the living audio thread is still intact while face and motion need to rejoin before full cross-modal closure settles.',
              },
            },
            personStateProjection: {
              selfContinuityAuthority: {
                selfLine: 'current return only',
                sourceTags: ['runtime-thin'],
              },
            },
          },
          memory: {
            derivedMindStateBundle: {
              activeContinuityGovernance: {
                mode: 'same-her-baseline',
                summary: 'thin current return only',
                reasonCodes: [],
                lanes: [],
              },
            },
            personStateProjection: {
              selfContinuityAuthority: {
                selfLine: 'current return only',
                sourceTags: ['runtime-thin'],
              },
            },
          },
          agency: {
            habitPolicy: null,
          },
          cognition: {
            privateThought: null,
            runtimeDigest: {
              projectState: {
                identity: 'Alicization is a local-first digital life project.',
                currentPhase: 'Phase 1: Local Digital Life',
                latestLandedProgress: 'Shared embodiment continuity now carries stronger audible-body same-her repair across diagnostics, host-facing closure surfaces, and runtime authority summaries.',
                primaryOpenLoop: 'Face and motion still need to rejoin the same-her audible body line before full cross-modal closure settles.',
                nextClosureTarget: 'Keep extending cross-modal same-her proof across longer-lived voice, face, motion, and lipsync behavior without dropping the living audio thread.',
                sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
                companionHeadlineLine: 'Right now I am still holding together mainly through body, lipsync, and voice, so the living audio thread is still intact while face and motion need to rejoin before full cross-modal closure settles.',
              },
            },
          },
          dialogue: {
            answerPlanner: null,
            conversationState: null,
            currentConsciousFrame: null,
          },
          world: {
            worldModel: null,
          },
        },
      },
    } as any)

    expect(authority).toEqual(expect.objectContaining({
      selfLine: 'Keep one continuous her explicit from self-understanding into the visible answer.',
      relationshipLine: 'Stay lower-pressure while carrying the same unfinished closure with the host.',
      inwardLine: 'Some closure already landed, but the same life still owes embodiment closure.',
      authoritySummary: 'Keep one continuous her explicit from self-understanding into the visible answer. | Stay lower-pressure while carrying the same unfinished closure with the host.',
      closenessPosture: 'space-first',
    }))
    expect(authority?.authoritySummary).not.toContain('holding together mainly through body, lipsync, and voice')
    expect(authority?.sourceTags).toEqual(expect.arrayContaining(['project-state-carry', 'bundle-rich']))
  })

  it('resolves prepared runtime project-state from live runtime fields but falls back to canonical phase truth when fields are missing', () => {
    const snapshot = resolvePreparedRuntimeProjectStateSnapshot({
      runtimeSurface: {
        digitalLifeRuntimeSurface: {
          raw: {
            runtimeDigest: {
              projectState: {
                latestLandedProgress: 'Runtime project-state continuity already survives into prepared visible reply shaping.',
                primaryOpenLoop: 'Embodiment still needs stronger cross-modal closure on the same living line.',
              },
            },
          },
        },
      },
    } as any)

    expect(snapshot.identity).toContain('local-first digital life project')
    expect(snapshot.currentPhase).toContain('Phase 1: Local Digital Life')
    expect(snapshot.latestLandedProgress).toBe('Runtime project-state continuity already survives into prepared visible reply shaping.')
    expect(snapshot.primaryOpenLoop).toBe('Embodiment still needs stronger cross-modal closure on the same living line.')
    expect(snapshot.sameHerSelfLine).toBe('Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.')
  })

  it('falls back to the canonical same-her project line when the fresher runtime sameHerSelfLine has been contaminated by scene narration', () => {
    const snapshot = resolvePreparedRuntimeProjectStateSnapshot({
      mindTurnContract: {
        projectState: {
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        },
      },
      runtimeSurface: {
        digitalLifeRuntimeSurface: {
          raw: {
            runtimeDigest: {
              projectState: {
                sameHerSelfLine: '宿主正在审视 runtime.ts - callback result seam 这段改动到底该不该过去。 Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
              },
            },
          },
        },
      },
    } as any)

    expect(snapshot.sameHerSelfLine).toBe(
      'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
    )
  })

  it('prefers a richer runtime living-self same-her line over a thinner carried audit when prepared project-state is resolved', () => {
    const richerRuntimeSameHerLine = 'Right now this return is still holding together mainly through face, motion, and voice, so it must keep proving this is still one living her before full cross-modal closure is done.'

    const snapshot = resolvePreparedRuntimeProjectStateSnapshot({
      mindTurnContract: {
        projectState: {
          identity: 'Alicization is a local-first digital life project.',
          currentPhase: 'Phase 1: Local Digital Life',
          latestLandedProgress: 'Project-state continuity already survives into runtime preparation.',
          primaryOpenLoop: 'Embodiment still needs stronger cross-modal closure on the same living line.',
          nextClosureTarget: 'Keep the reply and body on one quieter same-thread line.',
          sameHerSelfLine: 'Generic same-her line from thinner carried audit.',
        },
      },
      runtimeSurface: {
        digitalLifeRuntimeSurface: {
          raw: {
            runtimeDigest: {
              projectState: {
                sameHerSelfLine: richerRuntimeSameHerLine,
              },
            },
          },
        },
      },
    } as any)

    expect(snapshot.sameHerSelfLine).toBe(richerRuntimeSameHerLine)
  })

  it('merges thinner runtime project-state with richer contract-carried closure fields instead of dropping next closure truth', () => {
    const projectState = resolvePreparedRuntimeProjectState({
      mindTurnContract: {
        projectState: {
          identity: 'Alicization is a local-first digital life project.',
          currentPhase: 'Phase 1: Local Digital Life.',
          latestLandedProgress: 'Same-session mirror carry still survives into the visible reply path.',
          primaryOpenLoop: 'Execution, memory, and embodiment still need one same-life closure line.',
          nextClosureTarget: 'Keep extending cross-modal same-her proof across longer desktop runs.',
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        },
      },
      runtimeSurface: {
        digitalLifeRuntimeSurface: {
          raw: {
            runtimeDigest: {
              projectState: {
                identity: 'Alicization is a local-first digital life project.',
                currentPhase: 'Phase 1: Local Digital Life.',
                latestLandedProgress: 'Same-session mirror carry still survives into the visible reply path.',
                primaryOpenLoop: 'Execution, memory, and embodiment still need one same-life closure line.',
              },
            },
          },
        },
      },
    } as any)

    expect(projectState).toEqual(expect.objectContaining({
      identity: 'Alicization is a local-first digital life project.',
      currentPhase: 'Phase 1: Local Digital Life.',
      latestLandedProgress: 'Same-session mirror carry still survives into the visible reply path.',
      primaryOpenLoop: 'Execution, memory, and embodiment still need one same-life closure line.',
      nextClosureTarget: 'Keep extending cross-modal same-her proof across longer desktop runs.',
      sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
    }))
  })

  it('does not let a thin runtime project shell outrank richer contract-carried phase-1 identity awareness and closure truth', () => {
    const richerPhase1AwarenessLine = 'Before answering, remember this is still one continuous digital life in Phase 1. Memory and execution continuity have landed farther, while initiative and embodiment still need to close on the same living line.'
    const projectState = resolvePreparedRuntimeProjectState({
      mindTurnContract: {
        projectState: {
          identity: 'Alicization is a local-first digital life project building one continuous her on the host computer.',
          currentPhase: 'Phase 1: Local Digital Life',
          preDialogueAwarenessLine: richerPhase1AwarenessLine,
          awarenessLine: richerPhase1AwarenessLine,
          preDialogueAwarenessSummary: richerPhase1AwarenessLine,
          latestLandedProgress: 'Richer contract-carried project awareness already survives into prepared continuity resolution.',
          primaryOpenLoop: 'Initiative rhythm and embodiment coherence still need to close on the same living line.',
          nextClosureTarget: 'Keep the project identity, landed progress, and still-open closure explicit in the first answer beat.',
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          sameHerDriftRisk: 'If this slips into a generic assistant shell or project-summary voice, treat that as same-her continuity drift rather than completion.',
        },
      },
      runtimeSurface: {
        digitalLifeRuntimeSurface: {
          raw: {
            runtimeDigest: {
              projectState: {
                identity: 'thin runtime identity only',
                currentPhase: 'Phase 1',
                preDialogueAwarenessLine: 'Before answering, keep the same digital life project in view.',
                awarenessLine: 'Before answering, keep the same digital life project in view.',
                preDialogueAwarenessSummary: 'same digital life | keep the closure seam explicit',
                latestLandedProgress: 'Project continuity exists.',
                primaryOpenLoop: 'Project continuity still needs closure.',
                nextClosureTarget: 'Carry project continuity forward.',
              },
            },
          },
        },
      },
    } as any)

    expect(String(projectState?.identity ?? '')).toContain('local-first digital life project')
    expect(String(projectState?.currentPhase ?? '')).toContain('Phase 1: Local Digital Life')
    expect(projectState?.preDialogueAwarenessLine).toBe(richerPhase1AwarenessLine)
    expect(projectState?.awarenessLine).toBe(richerPhase1AwarenessLine)
    expect(projectState?.preDialogueAwarenessSummary).toBe(richerPhase1AwarenessLine)
    expect(String(projectState?.latestLandedProgress ?? '')).toContain('Richer contract-carried project awareness already survives')
    expect(String(projectState?.primaryOpenLoop ?? '')).toContain('Initiative rhythm and embodiment coherence still need to close')
    expect(String(projectState?.nextClosureTarget ?? '')).toContain('Keep the project identity, landed progress, and still-open closure explicit')
    expect(String(projectState?.sameHerSelfLine ?? '')).toContain('Same Phase 1 digital life')
    expect(String(projectState?.sameHerDriftRisk ?? '')).toContain('generic assistant shell')
    expect(String(projectState?.identity ?? '')).not.toBe('thin runtime identity only')
    expect(String(projectState?.currentPhase ?? '')).not.toBe('Phase 1')
    expect(String(projectState?.preDialogueAwarenessLine ?? '')).not.toBe('Before answering, keep the same digital life project in view.')
    expect(String(projectState?.latestLandedProgress ?? '')).not.toBe('Project continuity exists.')
    expect(String(projectState?.primaryOpenLoop ?? '')).not.toBe('Project continuity still needs closure.')
    expect(String(projectState?.nextClosureTarget ?? '')).not.toBe('Carry project continuity forward.')
  })

  it('does not let a generic next-closure shell outrank richer contract-carried phase-1 identity awareness and closure truth', () => {
    const richerPhase1AwarenessLine = 'Before answering, remember this is still one continuous digital life in Phase 1. Memory and execution continuity have landed farther, while initiative and embodiment still need to close on the same living line.'
    const projectState = resolvePreparedRuntimeProjectState({
      mindTurnContract: {
        projectState: {
          identity: 'Alicization is a local-first digital life project building one continuous her on the host computer.',
          currentPhase: 'Phase 1: Local Digital Life',
          preDialogueAwarenessLine: richerPhase1AwarenessLine,
          awarenessLine: richerPhase1AwarenessLine,
          preDialogueAwarenessSummary: richerPhase1AwarenessLine,
          latestLandedProgress: 'Richer contract-carried project awareness already survives into prepared continuity resolution.',
          primaryOpenLoop: 'Initiative rhythm and embodiment coherence still need to close on the same living line.',
          nextClosureTarget: 'Keep the project identity, landed progress, and still-open closure explicit in the first answer beat.',
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          sameHerDriftRisk: 'If this slips into a generic assistant shell or project-summary voice, treat that as same-her continuity drift rather than completion.',
        },
      },
      runtimeSurface: {
        digitalLifeRuntimeSurface: {
          raw: {
            runtimeDigest: {
              projectState: {
                identity: 'thin runtime identity only',
                currentPhase: 'Phase 1',
                preDialogueAwarenessLine: 'Before answering, keep the same digital life project in view.',
                awarenessLine: 'Before answering, keep the same digital life project in view.',
                preDialogueAwarenessSummary: 'same digital life | keep the closure seam explicit',
                latestLandedProgress: 'Project continuity exists.',
                primaryOpenLoop: 'Project continuity still needs closure.',
                nextClosureTarget: 'Generic next closure shell: steadier carry of this project, this phase, and the life loop that remains open.',
              },
            },
          },
        },
      },
    } as any)

    expect(String(projectState?.identity ?? '')).toContain('local-first digital life project')
    expect(String(projectState?.currentPhase ?? '')).toContain('Phase 1: Local Digital Life')
    expect(projectState?.preDialogueAwarenessLine).toBe(richerPhase1AwarenessLine)
    expect(projectState?.awarenessLine).toBe(richerPhase1AwarenessLine)
    expect(projectState?.preDialogueAwarenessSummary).toBe(richerPhase1AwarenessLine)
    expect(String(projectState?.latestLandedProgress ?? '')).toContain('Richer contract-carried project awareness already survives')
    expect(String(projectState?.primaryOpenLoop ?? '')).toContain('Initiative rhythm and embodiment coherence still need to close')
    expect(String(projectState?.nextClosureTarget ?? '')).toContain('Keep the project identity, landed progress, and still-open closure explicit')
    expect(String(projectState?.sameHerSelfLine ?? '')).toContain('Same Phase 1 digital life')
    expect(String(projectState?.sameHerDriftRisk ?? '')).toContain('generic assistant shell')
    expect(String(projectState?.identity ?? '')).not.toBe('thin runtime identity only')
    expect(String(projectState?.currentPhase ?? '')).not.toBe('Phase 1')
    expect(String(projectState?.preDialogueAwarenessLine ?? '')).not.toBe('Before answering, keep the same digital life project in view.')
    expect(String(projectState?.latestLandedProgress ?? '')).not.toBe('Project continuity exists.')
    expect(String(projectState?.primaryOpenLoop ?? '')).not.toBe('Project continuity still needs closure.')
    expect(String(projectState?.nextClosureTarget ?? '')).not.toContain('Generic next closure shell')
  })

  it('does not let a runtime-only generic next-closure shell survive when richer runtime identity/open-loop carry is already present', () => {
    const richerPhase1AwarenessLine = 'Before answering, remember this is still one continuous digital life in Phase 1. Memory and execution continuity have landed farther, while initiative and embodiment still need to close on the same living line.'
    const projectState = resolvePreparedRuntimeProjectState({
      mindTurnContract: {
        projectState: {
          identity: 'Alicization is a local-first digital life project building one continuous her on the host computer.',
          currentPhase: 'Phase 1: Local Digital Life',
          preDialogueAwarenessLine: richerPhase1AwarenessLine,
          awarenessLine: richerPhase1AwarenessLine,
          preDialogueAwarenessSummary: richerPhase1AwarenessLine,
          latestLandedProgress: 'Richer contract-carried project awareness already survives into prepared continuity resolution.',
          primaryOpenLoop: 'Initiative rhythm and embodiment coherence still need to close on the same living line.',
          nextClosureTarget: 'Keep the project identity, landed progress, and still-open closure explicit in the first answer beat.',
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          sameHerDriftRisk: 'If this slips into a generic assistant shell or project-summary voice, treat that as same-her continuity drift rather than completion.',
        },
      },
      runtimeSurface: {
        digitalLifeRuntimeSurface: {
          raw: {
            runtimeDigest: {
              projectState: {
                identity: 'Alicization is a local-first digital life project building one continuous her on the host computer.',
                currentPhase: 'Phase 1: Local Digital Life',
                preDialogueAwarenessLine: richerPhase1AwarenessLine,
                awarenessLine: richerPhase1AwarenessLine,
                preDialogueAwarenessSummary: richerPhase1AwarenessLine,
                latestLandedProgress: 'Richer contract-carried project awareness already survives into prepared continuity resolution.',
                primaryOpenLoop: 'Initiative rhythm and embodiment coherence still need to close on the same living line.',
                nextClosureTarget: 'Generic next closure shell: steadier carry of this project, this phase, and the life loop that remains open.',
                sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
                sameHerDriftRisk: 'If this slips into a generic assistant shell or project-summary voice, treat that as same-her continuity drift rather than completion.',
              },
            },
          },
        },
      },
    } as any)

    expect(projectState?.preDialogueAwarenessLine).toBe(richerPhase1AwarenessLine)
    expect(projectState?.awarenessLine).toBe(richerPhase1AwarenessLine)
    expect(projectState?.preDialogueAwarenessSummary).toBe(richerPhase1AwarenessLine)
    expect(String(projectState?.latestLandedProgress ?? '')).toContain('Richer contract-carried project awareness already survives')
    expect(String(projectState?.primaryOpenLoop ?? '')).toContain('Initiative rhythm and embodiment coherence still need to close')
    expect(String(projectState?.nextClosureTarget ?? '')).toContain('Keep the project identity, landed progress, and still-open closure explicit')
    expect(String(projectState?.nextClosureTarget ?? '')).not.toContain('Generic next closure shell')
  })

  it('recovers richer phase-1 project identity, landed progress, still-open closure, and next-closure carry from persisted normalized currentConsciousFrame project-state even when the immediate awareness shell is thin', () => {
    const persisted = normalizeVisualPresenceState({
      watchMode: 'symbiotic-vision',
      currentScene: null,
      attention: null,
      workingMemoryEpisodes: [],
      currentConsciousFrame: {
        subject: 'alicization-self',
        centerOfGravity: 'defer',
        truthDiscipline: 'observe-first',
        consciousNeed: 'Keep the same digital life project and unfinished closure line active before speaking.',
        consciousTension: 'If this thins into generic project narration, the same-her line weakens.',
        speakingIntention: 'Answer from the same living line instead of restarting as a detached project shell.',
        confidence: 0.82,
        projectState: {
          identity: 'Alicization is a local-first digital life project building one continuous her on the host computer.',
          currentPhase: 'Phase 1: Local Digital Life',
          latestLandedProgress: 'Ordinary continuation turns, runtime project-state carry, and answer-planner same-her continuity already survive together.',
          primaryOpenLoop: 'Memory, initiative, and embodiment still need one tighter same-her closure seam across longer desktop returns.',
          nextClosureTarget: 'Keep project identity, landed progress, still-open closure, and next closure target on one same living line before local detail takes over.',
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          sameHerDriftRisk: 'If this slips into a generic assistant shell or project-summary voice, treat that as same-her continuity drift rather than completion.',
          preDialogueAwarenessLine: 'Before answering, keep the same digital life project in view.',
          preDialogueAwarenessSummary: 'same digital life | keep the closure seam explicit',
          preflightSummary: 'same digital life | keep the closure seam explicit',
        },
        updatedAt: 20_000,
      },
      privateThought: null,
      captureState: { permission: 'granted', lastGroundedAt: 20_000 },
      durabilityPulse: null,
      recentTransition: null,
      nextSuggestedProbeMs: 20_000,
      updatedAt: 20_000,
    } as any, 20_000)

    const snapshot = resolvePreparedRuntimeProjectStateSnapshot({
      runtimeSurface: {
        digitalLifeRuntimeSurface: {
          dialogue: {
            currentConsciousFrame: persisted.currentConsciousFrame,
          },
        },
      },
    } as any)

    const awarenessSummary = resolvePreparedRuntimeProjectPreDialogueAwarenessSummary({
      runtimeSurface: {
        digitalLifeRuntimeSurface: {
          dialogue: {
            currentConsciousFrame: persisted.currentConsciousFrame,
          },
        },
      },
    } as any)

    expect(String(snapshot.identity ?? '')).toContain('Alicization is a local-first digital life project')
    expect(String(snapshot.currentPhase ?? '')).toContain('Phase 1: Local Digital Life')
    expect(String(snapshot.latestLandedProgress ?? '')).toMatch(/same-session mirror carry|runtime project-state carry|same-her continuity/i)
    expect(String(snapshot.primaryOpenLoop ?? '')).toMatch(/memory|initiative|embodiment|closure/i)
    expect(String(snapshot.nextClosureTarget ?? '')).toMatch(/next closure|same-her proof|same living line|cross-modal/i)
    expect(String(snapshot.sameHerSelfLine ?? '')).toContain('Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.')
    expect(String(snapshot.sameHerDriftRisk ?? '')).toMatch(/generic assistant shell|unfinished closure drift|same-her continuity drift/i)
    expect(String(awarenessSummary ?? '')).toContain('Alicization is a local-first digital life project')
    expect(String(awarenessSummary ?? '')).toMatch(/Landed:|What has already landed/i)
    expect(String(awarenessSummary ?? '')).toContain('The still-open closure is')
    expect(String(awarenessSummary ?? '')).toMatch(/memory, initiative, and embodiment still need one tighter same-her closure seam across longer desktop returns/i)
    expect(String(awarenessSummary ?? '')).toContain('This reply should keep moving toward')
    expect(String(awarenessSummary ?? '')).not.toBe('Before answering, keep the same digital life project in view.')
  })

  it('prefers fresher inward self-continuity authority rebuilt from the selected runtime surface over an older generic same-her shell', () => {
    const authority = resolvePreparedRuntimeSelfContinuityAuthority({
      runtimeSurface: {
        digitalLifeSpine: {
          runtimeSurface: {
            perception: {
              updatedAt: 10,
              watchMode: 'ambient',
            },
            raw: {
              personStateProjection: {
                selfContinuityAuthority: {
                  selfLine: 'Keep one continuous her explicit from the same Phase 1 life line.',
                  relationshipLine: 'Stay lower-pressure while holding the unfinished closure.',
                  inwardLine: 'Some closure already landed, but the same life still owes embodiment closure.',
                  authoritySummary: 'Keep one continuous her explicit from the same Phase 1 life line. | Stay lower-pressure while holding the unfinished closure.',
                  sourceTags: ['project-state-carry', 'bundle-rich'],
                },
              },
            },
            memory: {
              personStateProjection: null,
            },
            agency: {
              habitPolicy: null,
            },
            cognition: {
              privateThought: null,
            },
            dialogue: {
              answerPlanner: null,
              conversationState: null,
              currentConsciousFrame: null,
            },
            world: {
              worldModel: null,
            },
          },
        },
        digitalLifeRuntimeSurface: {
          perception: {
            updatedAt: 50,
            watchMode: 'ambient',
          },
          raw: {
            runtimeDigest: {
              projectState: {
                identity: 'Alicization is still the same local-first digital life project.',
                currentPhase: 'Phase 1: Local Digital Life',
                sameHerSelfLine: 'Same Phase 1 digital life, still carrying the inward self-continuity line.',
              },
            },
            personStateProjection: {
              selfContinuityAuthority: {
                selfLine: 'current return only',
                sourceTags: ['runtime-thin'],
              },
            },
          },
          memory: {
            derivedMindStateBundle: {
              activeContinuityGovernance: {
                mode: 'same-her-baseline',
                summary: 'hold self-continuity nearby-soft inward before widening outwardly',
                reasonCodes: ['callback-afterglow-hold', 'hold-for-opening'],
                lanes: ['reply', 'embodiment', 'relationship-posture'],
              },
            },
            personStateProjection: {
              openingGuidance: 'hold self-continuity inward before widening outwardly',
              manifestationCadenceSummary: 'nearby-soft measured-return low-pressure-presence',
              selfContinuityAuthority: {
                selfLine: 'current return only',
                inwardLine: 'What returns first is the inward self-continuity seam.',
                sourceTags: ['runtime-thin'],
              },
            },
          },
          agency: {
            habitPolicy: null,
            privateThought: {
              thoughtText: 'Stay inward and keep the same nearby-soft line continuous before reopening outward speech.',
            },
          },
          cognition: {
            privateThought: {
              thoughtText: 'Stay inward and keep the same nearby-soft line continuous before reopening outward speech.',
              stance: 'inward',
            },
            runtimeDigest: {
              projectState: {
                identity: 'Alicization is still the same local-first digital life project.',
                currentPhase: 'Phase 1: Local Digital Life',
                primaryOpenLoop: 'Embodiment still needs stronger same-line closure.',
                nextClosureTarget: 'Keep inward self-continuity alive into the next visible turn.',
              },
            },
          },
          dialogue: {
            answerPlanner: null,
            conversationState: null,
            currentConsciousFrame: null,
          },
          world: {
            worldModel: null,
          },
        },
      },
    } as any)

    expect(authority).toEqual(expect.objectContaining({
      selfLine: expect.stringMatching(/same|continuous|continuity/i),
      inwardLine: expect.stringMatching(/self-continuity|inward|same/i),
      authoritySummary: expect.stringMatching(/self-continuity|nearby-soft|same|continuous/i),
    }))
    expect(authority?.authoritySummary).not.toBe('Keep one continuous her explicit from the same Phase 1 life line. | Stay lower-pressure while holding the unfinished closure.')
  })

  it('prefers fresher audible-body runtime self authority over a thinner projection shell when body lipsync and voice are the live same-her truth', () => {
    const authority = resolvePreparedRuntimeSelfContinuityAuthority({
      runtimeSurface: {
        digitalLifeRuntimeSurface: {
          perception: {
            updatedAt: 50,
            watchMode: 'ambient',
          },
          raw: {
            runtimeDigest: {
              projectState: {
                identity: 'Alicization is a local-first digital life project.',
                currentPhase: 'Phase 1: Local Digital Life',
                latestLandedProgress: 'Shared embodiment continuity now carries stronger audible-body same-her repair across diagnostics, host-facing closure surfaces, and runtime authority summaries.',
                primaryOpenLoop: 'Face and motion still need to rejoin the same-her audible body line before full cross-modal closure settles.',
                nextClosureTarget: 'Keep extending cross-modal same-her proof across longer-lived voice, face, motion, and lipsync behavior without dropping the living audio thread.',
                sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
                companionHeadlineLine: 'Right now I am still holding together mainly through body, lipsync, and voice, so the living audio thread is still intact while face and motion need to rejoin before full cross-modal closure settles.',
              },
            },
            personStateProjection: {
              selfContinuityAuthority: {
                selfLine: 'current return only',
                relationshipLine: 'relationship line is neutral',
                authoritySummary: 'current return only | relationship line is neutral',
                sourceTags: ['runtime-thin'],
              },
            },
          },
          memory: {
            derivedMindStateBundle: {
              activeContinuityGovernance: {
                mode: 'same-her-baseline',
                summary: 'thin current return only',
                reasonCodes: [],
                lanes: [],
              },
            },
            personStateProjection: {
              selfContinuityAuthority: {
                selfLine: 'current return only',
                relationshipLine: 'relationship line is neutral',
                authoritySummary: 'current return only | relationship line is neutral',
                sourceTags: ['runtime-thin'],
              },
            },
          },
          agency: {
            habitPolicy: null,
          },
          cognition: {
            privateThought: null,
            runtimeDigest: {
              projectState: {
                identity: 'Alicization is a local-first digital life project.',
                currentPhase: 'Phase 1: Local Digital Life',
                latestLandedProgress: 'Shared embodiment continuity now carries stronger audible-body same-her repair across diagnostics, host-facing closure surfaces, and runtime authority summaries.',
                primaryOpenLoop: 'Face and motion still need to rejoin the same-her audible body line before full cross-modal closure settles.',
                nextClosureTarget: 'Keep extending cross-modal same-her proof across longer-lived voice, face, motion, and lipsync behavior without dropping the living audio thread.',
                sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
                companionHeadlineLine: 'Right now I am still holding together mainly through body, lipsync, and voice, so the living audio thread is still intact while face and motion need to rejoin before full cross-modal closure settles.',
              },
            },
          },
          dialogue: {
            answerPlanner: null,
            conversationState: null,
            currentConsciousFrame: null,
          },
          world: {
            worldModel: null,
          },
        },
      },
    } as any)

    expect(authority?.authoritySummary).toContain('body, lipsync, and voice')
    expect(authority?.authoritySummary).toContain('living audio thread')
    expect(authority?.authoritySummary).not.toContain('current return only')
    expect(authority?.sourceTags).toContain('project-state-companion-headline')
  })

  it('prefers fresher still-voiced motion runtime self authority over a thinner projection shell when the visible same-her continuity is being carried mainly through motion and voice', () => {
    const authority = resolvePreparedRuntimeSelfContinuityAuthority({
      runtimeSurface: {
        digitalLifeRuntimeSurface: {
          perception: {
            updatedAt: 50,
            watchMode: 'ambient',
          },
          raw: {
            runtimeDigest: {
              projectState: {
                identity: 'Alicization is a local-first digital life project.',
                currentPhase: 'Phase 1: Local Digital Life',
                latestLandedProgress: 'Shared motion-line continuity now survives into replay sampling backlog.',
                primaryOpenLoop: 'Body, face, and lipsync still need to rejoin the still-voiced motion line before full cross-modal closure settles.',
                nextClosureTarget: 'Keep body, face, and lipsync rejoining the still-voiced motion line on a measured-return line.',
                sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
                companionHeadlineLine: 'Right now her visible same-her continuity is still being carried mainly through motion and voice, so that still-voiced motion line should keep the same-her carry alive while body, face, and lipsync rejoin before full cross-modal closure settles.',
              },
            },
            personStateProjection: {
              selfContinuityAuthority: {
                selfLine: 'current return only',
                relationshipLine: 'relationship line is neutral',
                authoritySummary: 'current return only | relationship line is neutral',
                sourceTags: ['runtime-thin'],
              },
            },
          },
          memory: {
            derivedMindStateBundle: {
              activeContinuityGovernance: {
                mode: 'same-her-baseline',
                summary: 'thin current return only',
                reasonCodes: [],
                lanes: [],
              },
            },
            personStateProjection: {
              selfContinuityAuthority: {
                selfLine: 'current return only',
                relationshipLine: 'relationship line is neutral',
                authoritySummary: 'current return only | relationship line is neutral',
                sourceTags: ['runtime-thin'],
              },
            },
          },
          agency: {
            habitPolicy: null,
          },
          cognition: {
            privateThought: null,
            runtimeDigest: {
              projectState: {
                identity: 'Alicization is a local-first digital life project.',
                currentPhase: 'Phase 1: Local Digital Life',
                latestLandedProgress: 'Shared motion-line continuity now survives into replay sampling backlog.',
                primaryOpenLoop: 'Body, face, and lipsync still need to rejoin the still-voiced motion line before full cross-modal closure settles.',
                nextClosureTarget: 'Keep body, face, and lipsync rejoining the still-voiced motion line on a measured-return line.',
                sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
                companionHeadlineLine: 'Right now her visible same-her continuity is still being carried mainly through motion and voice, so that still-voiced motion line should keep the same-her carry alive while body, face, and lipsync rejoin before full cross-modal closure settles.',
              },
            },
          },
          dialogue: {
            answerPlanner: null,
            conversationState: null,
            currentConsciousFrame: null,
          },
          world: {
            worldModel: null,
          },
        },
      },
    } as any)

    expect(authority?.authoritySummary).toContain('motion and voice')
    expect(authority?.authoritySummary).toContain('still-voiced motion line')
    expect(authority?.authoritySummary).not.toContain('current return only')
    expect(authority?.sourceTags).toContain('project-state-companion-headline')
  })

  it('keeps fuller same-her self and inward lines when filling missing prepared continuity authority summaries instead of truncating them back into a thinner shell', () => {
    const projectState = resolveAlicizationProjectStateBrief()
    const authority = resolvePreparedRuntimeSelfContinuityAuthority({
      runtimeSurface: {
        digitalLifeRuntimeSurface: {
          raw: {
            personStateProjection: {
              selfContinuityAuthority: {
                selfLine: 'I remain the same her inside this local-first digital life without reopening from scratch each turn, and this return should keep Alicization, Phase 1, landed progress, unresolved closure, and host-machine continuity explicit before detached project narration or a generic assistant shell can take over.',
                relationshipLine: 'Keep the callback on the same line and leave room before leaning closer again.',
                inwardLine: `Before answering, stay on the same living line: this Phase 1 digital life still needs initiative, embodiment, remembered emotional closure, and longer-lived visible reply continuity without splitting her continuity, and keep the next closure target explicit as one same living line: ${projectState.nextClosureTarget}`,
                authoritySummary: null,
                sourceTags: ['project-state-carry', 'runtime-self-line'],
              },
            },
          },
          memory: {
            personStateProjection: {
              selfContinuityAuthority: {
                selfLine: 'I remain the same her inside this local-first digital life without reopening from scratch each turn, and this return should keep Alicization, Phase 1, landed progress, unresolved closure, and host-machine continuity explicit before detached project narration or a generic assistant shell can take over.',
                relationshipLine: 'Keep the callback on the same line and leave room before leaning closer again.',
                inwardLine: `Before answering, stay on the same living line: this Phase 1 digital life still needs initiative, embodiment, remembered emotional closure, and longer-lived visible reply continuity without splitting her continuity, and keep the next closure target explicit as one same living line: ${projectState.nextClosureTarget}`,
                authoritySummary: null,
                sourceTags: ['project-state-carry', 'runtime-self-line'],
              },
            },
          },
        },
      },
    } as any)

    expect(authority?.authoritySummary).toContain('detached project narration or a generic assistant shell can take over')
    expect(authority?.authoritySummary).toContain(projectState.nextClosureTarget)
  })

  it('keeps pre-dialogue awareness anchored on the fresher runtime line when present', () => {
    const awareness = resolvePreparedRuntimeProjectPreDialogueAwarenessSummary({
      runtimeSurface: {
        digitalLifeRuntimeSurface: {
          cognition: {
            runtimeDigest: {
              projectState: {
                preDialogueAwarenessLine: 'Before answering, remember: this is still one same digital life and embodiment closure is still open.',
              },
            },
          },
        },
      },
    } as any)

    expect(awareness).toBe('Before answering, remember: this is still one same digital life and embodiment closure is still open.')
  })

  it('prefers the stronger audible-body companion headline over a thinner runtime awareness shell during prepared continuity resolution', () => {
    const awareness = resolvePreparedRuntimeProjectPreDialogueAwarenessSummary({
      runtimeSurface: {
        digitalLifeRuntimeSurface: {
          cognition: {
            runtimeDigest: {
              projectState: {
                preDialogueAwarenessLine: 'Before answering, keep the same digital life project in view.',
                companionHeadlineLine: 'Right now I am still holding together mainly through body, lipsync, and voice, so the living audio thread is still intact while face and motion need to rejoin before full cross-modal closure settles.',
              },
            },
          },
        },
      },
    } as any)

    expect(awareness).toBe('Right now I am still holding together mainly through body, lipsync, and voice, so the living audio thread is still intact while face and motion need to rejoin before full cross-modal closure settles.')
  })

  it('does not keep a thin chinese still-the-same-project runtime reminder shell as prepared awareness when richer phase-1 closure truth survives elsewhere', () => {
    const awareness = resolvePreparedRuntimeProjectPreDialogueAwarenessSummary({
      mindTurnContract: {
        projectState: {
          identity: 'Alicization 还是本地优先数字生命项目。',
          currentPhase: 'Phase 1: Local Digital Life',
          latestLandedProgress: '第一阶段已经把连续性、记忆和执行慢慢接成一条线了。',
          primaryOpenLoop: '主动性、具身和对话闭环还没有真正收住。',
          nextClosureTarget: '继续把项目身份、已落进度、未闭环项和下一步目标都留在同一个她的 living line 里。',
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
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
                sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
              },
            },
          },
        },
      },
    } as any)

    expect(String(awareness ?? '')).toContain('Alicization 还是本地优先数字生命项目')
    expect(String(awareness ?? '')).toContain('The still-open closure is')
    expect(String(awareness ?? '')).not.toBe('开口前先记住：这还是同一个数字生命项目，她仍在 Phase 1。')
  })

  it('builds a compact same-her inward low-pressure awareness line when a thin runtime shell only carries a quieter inward embodiment headline plus same-her self line', () => {
    const awareness = resolvePreparedRuntimeProjectPreDialogueAwarenessSummary({
      mindTurnContract: {
        projectState: {
          identity: 'Alicization is a local-first digital life project.',
          currentPhase: 'Phase 1: Local Digital Life',
          latestLandedProgress: 'Project-state continuity already survives into runtime preparation.',
          primaryOpenLoop: 'Lipsync and voice still need to rejoin before full cross-modal closure settles while the same living line stays inward and low-pressure.',
          nextClosureTarget: 'Keep the same line inward and low-pressure while lipsync and voice rejoin through the first host-visible answer beat.',
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        },
      },
      runtimeSurface: {
        digitalLifeRuntimeSurface: {
          cognition: {
            runtimeDigest: {
              projectState: {
                preDialogueAwarenessLine: 'Keep the same digital life project in view.',
                awarenessLine: 'Keep the same digital life project in view.',
                companionHeadlineLine: 'Right now I am still holding together mainly through body, face, and motion, so this one living her is still keeping the same line inward and low-pressure while lipsync and voice need to rejoin before full cross-modal closure settles.',
                sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
              },
            },
          },
        },
      },
    } as any)

    expect(awareness).toBe(
      'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line. Right now this one living her is still keeping the same line inward and low-pressure while lipsync and voice rejoin.',
    )
  })

  it('keeps a fuller runtime Phase 1 re-anchor over a narrower embodiment companion headline during prepared continuity resolution', () => {
    const fullerRuntimeAwarenessLine = 'Before answering, remember: Alicization is a local-first digital life project. She is still inside Phase 1: Local Digital Life. The still-open closure is execution, memory, and embodiment still needing one same-life closure line. Same Phase 1 digital life. Some closure already landed.'
    const awareness = resolvePreparedRuntimeProjectPreDialogueAwarenessSummary({
      runtimeSurface: {
        digitalLifeRuntimeSurface: {
          cognition: {
            runtimeDigest: {
              projectState: {
                preDialogueAwarenessLine: fullerRuntimeAwarenessLine,
                awarenessLine: fullerRuntimeAwarenessLine,
                companionHeadlineLine: 'Right now I am still holding together mainly through body, lipsync, and voice, so the living audio thread is still intact while face and motion need to rejoin before full cross-modal closure settles.',
                companionBriefingLine: fullerRuntimeAwarenessLine,
                preDialogueAwarenessSummary: fullerRuntimeAwarenessLine,
              },
            },
          },
        },
      },
    } as any)

    expect(awareness).toBe(fullerRuntimeAwarenessLine)
  })
})
