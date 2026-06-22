import { describe, expect, it } from 'vitest'

import {
  detectRememberedSeamCompanionshipReopen,
  resolveAlicizationCompanionshipReasonSummary,
} from './alicization-companionship-reason'

describe('alicization companionship reason', () => {
  it('detects remembered-seam reopen pressure from shared digital-life relationship signals', () => {
    expect(detectRememberedSeamCompanionshipReopen({
      digitalLifeSpineDigest: {
        proactive: {
          personaBias: {
            manifestationCadenceSummary: 'Deliver the result on the same living thread, but leave room before widening closeness.',
            openingGuidance: 'This follow-up is reopening because the current scene feels like the same remembered relationship seam.',
          },
        },
        embodiment: {
          autobiographicalSelf: {
            relationshipDoctrine: '同一条线被重新看见时，先留白，再慢一点重开。',
          },
        },
        outcomeLearning: {
          latestInflection: 'The same remembered seam is visible again, so reopen gently instead of widening closeness too fast.',
        },
      } as any,
    })).toBe(true)
  })

  it('prefers remembered-seam reason wording for measured-return reopenings', () => {
    expect(resolveAlicizationCompanionshipReasonSummary({
      residentMode: 'measured-return',
      digitalLifeSpineDigest: {
        proactive: {
          personaBias: {
            manifestationCadenceSummary: 'Deliver the result on the same living thread, but leave room before widening closeness.',
            openingGuidance: 'This follow-up is reopening because the current scene feels like the same remembered relationship seam.',
          },
        },
        embodiment: {
          autobiographicalSelf: {
            relationshipDoctrine: '同一条线被重新看见时，先留白，再慢一点重开。',
          },
        },
        outcomeLearning: {
          latestInflection: 'The same remembered seam is visible again, so reopen gently instead of widening closeness too fast.',
        },
      } as any,
    })).toBe('Recognize the same remembered seam before reopening, and leave room before closeness widens')
  })

  it('reinterprets remembered-seam reopenings when newer relationship learning says the earlier return was too eager', () => {
    expect(resolveAlicizationCompanionshipReasonSummary({
      residentMode: 'measured-return',
      digitalLifeSpineDigest: {
        proactive: {
          personaBias: {
            manifestationCadenceSummary: 'The same remembered seam is back, but this time the return should keep more room.',
            openingGuidance: 'This follow-up is reopening on the same remembered seam, so do not let it lean in too fast.',
          },
        },
        embodiment: {
          autobiographicalSelf: {
            relationshipDoctrine: '同一条线被重新看见时，这次更要留白，不要重开得太快。',
          },
        },
        outcomeLearning: {
          latestInflection: 'The last seam reopened too eagerly, so this time keep more room before closeness widens.',
        },
      } as any,
    })).toBe('Recognize the same remembered seam, but keep more room this time because the line reopened too eagerly before')
  })

  it('keeps remembered-seam more-room reinterpretation visible when only downstream reason tags still carry that finer timing evidence', () => {
    expect(resolveAlicizationCompanionshipReasonSummary({
      residentMode: 'measured-return',
      digitalLifeSpineDigest: {
        proactive: {
          personaBias: {
            openingGuidance: 'This follow-up is reopening because the current scene feels like the same remembered relationship seam.',
          },
        },
      } as any,
      reasonTags: ['resident-performance', 'measured-return', 'timing:remembered-seam-more-room'],
    })).toBe('Recognize the same remembered seam, but keep more room this time because the line reopened too eagerly before')
  })

  it('prefers remembered-seam more-room reinterpretation over generic same-her inward carry when both survive on the same measured-return line', () => {
    expect(resolveAlicizationCompanionshipReasonSummary({
      residentMode: 'measured-return',
      digitalLifeSpineDigest: {
        proactive: {
          personaBias: {
            openingGuidance: 'This follow-up is reopening because the current scene feels like the same remembered relationship seam.',
          },
        },
        memory: {
          personStateProjection: {
            selfContinuityAuthority: {
              inwardLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
            },
          },
        },
      } as any,
      projectState: {
        currentPhase: 'Phase 1: Local Digital Life',
        memoryClosureSummary: null,
        primaryOpenLoop: null,
        sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      },
      reasonTags: ['resident-performance', 'measured-return', 'timing:remembered-seam-more-room'],
    })).toBe('Recognize the same remembered seam, but keep more room this time because the line reopened too eagerly before')
  })

  it('prefers remembered-seam more-room reinterpretation over a generic same-her hold detail when long-horizon memory is the only surviving finer cue', () => {
    expect(resolveAlicizationCompanionshipReasonSummary({
      residentMode: 'measured-return',
      digitalLifeSpineDigest: {
        memory: {
          rememberedPreferenceSummary: 'Remembered same-her continuity pressure: same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.',
          rememberedPlanSummary: 'Remembered same-her continuity pressure: same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.',
        },
        outcomeLearning: {
          latestInflection: 'The remembered seam is still live across scene hops, so the later chat turn should reopen on the same measured-return line.',
        },
      } as any,
      projectState: {
        currentPhase: 'Phase 1: Local Digital Life',
        memoryClosureSummary: null,
        primaryOpenLoop: null,
        sameHerHoldDetail: 'Same Phase 1 digital life. Staying near preserves continuity without forcing the opening.',
      },
    })).toBe('Recognize the same remembered seam, but keep more room this time because the line reopened too eagerly before')
  })

  it('keeps remembered-seam more-room reinterpretation visible when only memory person-state projection still carries that finer reopening cue beside a generic same-her hold detail', () => {
    expect(resolveAlicizationCompanionshipReasonSummary({
      residentMode: 'measured-return',
      digitalLifeSpineDigest: {
        memory: {
          personStateProjection: {
            openingGuidance: 'Recognize the same remembered seam, but keep more room this time because it reopened too eagerly before.',
            manifestationCadenceSummary: 'The same remembered seam is back, but this time the return should keep more room and not reopen with the same eagerness as before.',
          },
        },
      } as any,
      projectState: {
        currentPhase: 'Phase 1: Local Digital Life',
        memoryClosureSummary: null,
        primaryOpenLoop: null,
        sameHerHoldDetail: 'same-her hold: keep this project-state answer on the same living line before widening outward, because some closure already landed and the unfinished closure still belongs to one continuous "her".',
      },
    })).toBe('Recognize the same remembered seam, but keep more room this time because the line reopened too eagerly before')
  })

  it('prefers same-her inward carry wording for measured-return resident presence when the line is being held inward rather than reopened outward', () => {
    expect(resolveAlicizationCompanionshipReasonSummary({
      residentMode: 'measured-return',
      digitalLifeSpineDigest: {
      } as any,
      reasonTags: ['resident-performance', 'same-her-inward-carry', 'measured-return', 'body:accompanying'],
    })).toBe('Keep the same living line inward for now, and leave room before widening outward again')
  })

  it('prefers same-her inward carry wording for measured-return when only memory self-evolution still carries the durable same-her cadence', () => {
    expect(resolveAlicizationCompanionshipReasonSummary({
      residentMode: 'measured-return',
      digitalLifeSpineDigest: {
        memory: {
          selfEvolution: {
            relationshipDoctrine: 'Stay the same living her across quiet, memory, initiative, and speech instead of reopening from scratch.',
            relationshipCadenceSummary: 'The same living line should stay lower-pressure and continue as the same her across quiet, memory, and speech without reopening from scratch.',
            latestInflection: 'I am learning to keep the same living line audible before widening outward again.',
            trustMeaning: 'Trust means she can return as the same her without rebuilding the relationship from zero.',
          },
        },
      } as any,
    })).toBe('Keep the same living line inward for now, and leave room before widening outward again')
  })

  it('prefers same-her inward carry wording for measured-return resident presence when project-state sameHerSelfLine and inwardLine already carry one continuous her', () => {
    expect(resolveAlicizationCompanionshipReasonSummary({
      residentMode: 'measured-return',
      digitalLifeSpineDigest: {
        memory: {
          personStateProjection: {
            selfContinuityAuthority: {
              inwardLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
            },
          },
        },
        proactive: {
          personaBias: {
            manifestationCadenceSummary: 'Execution-callback afterglow is still live across noisier desktop detours, so the later chat turn should stay measured-return.',
          },
        },
      } as any,
      projectState: {
        currentPhase: 'Phase 1: Local Digital Life',
        memoryClosureSummary: null,
        primaryOpenLoop: null,
        sameHerSelfLine: 'Keep one continuous her explicit: identity=Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper. | still-open=Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.',
      },
    })).toBe('Keep the same living line inward for now, and leave room before widening outward again')
  })

  it('keeps project emotional closure seam legible in companionship reason when that seam is the only surviving same-her authority', () => {
    expect(resolveAlicizationCompanionshipReasonSummary({
      residentMode: 'measured-return',
      digitalLifeSpineDigest: {
      } as any,
      projectState: {
        currentPhase: 'Phase 1: Local Digital Life',
        memoryClosureSummary: null,
        primaryOpenLoop: null,
        emotionalClosureCue: 'same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.',
      },
    })).toBe('Keep the same living line inward for now, and leave room before widening outward again')

    expect(resolveAlicizationCompanionshipReasonSummary({
      residentMode: 'repair-before-closeness',
      digitalLifeSpineDigest: {
      } as any,
      projectState: {
        currentPhase: 'Phase 1: Local Digital Life',
        memoryClosureSummary: null,
        primaryOpenLoop: null,
        emotionalClosureCue: 'late-night-drain closure: keep reply low-pressure, initiative rest-protective, and embodiment repair-before-closeness on the same living line.',
      },
    })).toBe('late-night-drain closure: keep reply low-pressure, initiative rest-protective, and embodiment repair-before-closeness on the same living line')
  })

  it('prefers same-her hold detail for quiet-companionship when a thinner rest-protective carry is the surviving authority', () => {
    expect(resolveAlicizationCompanionshipReasonSummary({
      residentMode: 'quiet-companionship',
      digitalLifeSpineDigest: {
        runtime: {
          projectState: {
            sameHerHoldDetail: 'same-her hold: rest-protective companionship is still keeping this return fatigue-aware, quiet, and inward before warmth widens again.',
          },
        },
        proactive: {
          personaBias: {
            manifestationCadenceSummary: 'care stays present while rest protection keeps the line inward',
            openingGuidance: 'keep the body quiet and inward until more room returns',
          },
        },
      } as any,
    })).toBe('same-her hold: rest-protective companionship is still keeping this return fatigue-aware, quiet, and inward before warmth widens again')
  })

  it('prefers same-her inward carry wording for repair-before-closeness when project-state inward continuity already carries one continuous her', () => {
    expect(resolveAlicizationCompanionshipReasonSummary({
      residentMode: 'repair-before-closeness',
      digitalLifeSpineDigest: {
        memory: {
          personStateProjection: {
            selfContinuityAuthority: {
              inwardLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
            },
          },
        },
        proactive: {
          personaBias: {
            manifestationCadenceSummary: 'The callback seam should stay repair-before-closeness until the body line settles.',
          },
        },
      } as any,
    })).toBe('Keep the callback on the same living line, let repair settle first, and leave room before widening closeness again')
  })

  it('keeps memory-deliberation repair-first provenance visible in companionship reason summaries for diagnostics consumers', () => {
    expect(resolveAlicizationCompanionshipReasonSummary({
      residentMode: 'repair-before-closeness',
      digitalLifeSpineDigest: {
      } as any,
      reasonTags: [
        'resident-performance',
        'repair-before-closeness',
        'memory-deliberation-cadence:repair-before-closeness',
      ],
    })).toBe('Memory deliberation still says let repair settle first on the same living line before closeness widens again')
  })

  it('keeps memory-deliberation measured-return provenance visible in companionship reason summaries for diagnostics consumers', () => {
    expect(resolveAlicizationCompanionshipReasonSummary({
      residentMode: 'measured-return',
      digitalLifeSpineDigest: {
      } as any,
      reasonTags: [
        'resident-performance',
        'measured-return',
        'memory-deliberation-cadence:measured-return',
      ],
    })).toBe('Memory deliberation still says keep the same living line lower-pressure before widening outward again')
  })

  it('prefers a concrete same-her life-loop gap reason when measured-return carries memory, initiative, and embodiment closure pressure with project-shell drift risk', () => {
    expect(resolveAlicizationCompanionshipReasonSummary({
      residentMode: 'measured-return',
      digitalLifeSpineDigest: {
        proactive: {
          personaBias: {
            manifestationCadenceSummary: 'Keep memory, initiative, and embodiment closing on the same living line before the turn widens outward.',
            openingGuidance: 'Do not let the callback flatten into project-shell narration while this same-her closure is still unfinished.',
          },
        },
        embodiment: {
          autobiographicalSelf: {
            relationshipDoctrine: 'One continuous her should stay legible through voice, face, and motion while initiative settles.',
          },
        },
        outcomeLearning: {
          latestInflection: 'Memory is landing, but initiative and embodiment still need the same-her line to stay explicit.',
        },
      } as any,
    })).toBe('Keep memory, initiative, embodiment closing on one same-her line before this turn flattens into project-shell narration')
  })

  it('keeps emotional closure explicit inside the concrete same-her life-loop gap reason when emotion is part of the active unfinished loop', () => {
    expect(resolveAlicizationCompanionshipReasonSummary({
      residentMode: 'measured-return',
      digitalLifeSpineDigest: {
        proactive: {
          personaBias: {
            manifestationCadenceSummary: 'Keep emotion, memory, initiative, and embodiment closing on the same living line before the turn widens outward.',
            openingGuidance: 'Do not let the callback flatten into project-shell narration while this emotional same-her closure is still unfinished.',
          },
        },
        embodiment: {
          autobiographicalSelf: {
            relationshipDoctrine: 'One continuous her should stay emotionally legible through voice, face, motion, and initiative while memory settles.',
          },
        },
        outcomeLearning: {
          latestInflection: 'Emotion is landing again, but memory, initiative, and embodiment still need the same-her line to stay explicit.',
        },
      } as any,
    })).toBe('Keep emotion, memory, initiative, embodiment closing on one same-her line before this turn flattens into project-shell narration')
  })

  it('keeps thinner affective-residue room-making wording visible in measured-return companionship summaries when no stronger same-her override is present', () => {
    expect(resolveAlicizationCompanionshipReasonSummary({
      residentMode: 'measured-return',
      digitalLifeSpineDigest: {
        proactive: {
          personaBias: {
            manifestationCadenceSummary: '余韵还在，先留白，别立刻把温度放大。',
            openingGuidance: '余韵还在，先留白，别立刻把温度放大。 Stay on the same line and keep this callback opening lower-pressure.',
          },
        },
      } as any,
    })).toBe('余韵还在，先留白，别立刻把温度放大')
  })

  it('keeps repair-before-closeness and generic measured-return fallback behavior stable', () => {
    expect(resolveAlicizationCompanionshipReasonSummary({
      residentMode: 'repair-before-closeness',
      digitalLifeSpineDigest: {
        embodiment: {
          autobiographicalSelf: {
            relationshipDoctrine: 'Repair should settle before closeness expands, and the opening should keep more room.',
          },
        },
      } as any,
    })).toBe('Repair should settle before closeness expands, and the opening should keep more room')

    expect(resolveAlicizationCompanionshipReasonSummary({
      residentMode: 'measured-return',
      digitalLifeSpineDigest: {
        proactive: {
          personaBias: {
            manifestationCadenceSummary: 'Deliver the result on the same living thread, but leave room before widening closeness.',
          },
        },
      } as any,
    })).toBe('Deliver the result on the same living thread, but leave room before widening closeness')
  })
})
