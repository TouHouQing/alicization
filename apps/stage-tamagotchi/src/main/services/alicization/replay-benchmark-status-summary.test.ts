import { describe, expect, it } from 'vitest'

import { __alicizationTestOnly } from './replay-benchmark-runtime'

function emotionalTurn(input: {
  validationStatus?: 'approved' | 'blocked' | 'unknown'
  activeCue?: string | null
  lowPressureRequired?: boolean
  antiRestartRequired?: boolean
}) {
  return {
    visibleReplyRealization: {
      ...(input.validationStatus
        ? { visibleReplyValidationStatus: input.validationStatus }
        : {}),
      emotionalClosureAudit: {
        activeCue: input.activeCue ?? null,
        lowPressureRequired: input.lowPressureRequired ?? false,
        antiRestartRequired: input.antiRestartRequired ?? false,
      },
    },
  } as any
}

function selfAuthorityTurn(input: {
  validationStatus?: 'approved' | 'blocked' | 'unknown'
  authoritySummary?: string | null
  closenessPosture?: string | null
}) {
  return {
    visibleReplyRealization: {
      ...(input.validationStatus
        ? { visibleReplyValidationStatus: input.validationStatus }
        : {}),
      selfAuthorityAudit: {
        authoritySummary: input.authoritySummary ?? null,
        closenessPosture: input.closenessPosture ?? null,
      },
    },
  } as any
}

function completeProjectStateTurn(input: {
  validationStatus?: 'approved' | 'blocked' | 'unknown'
  evidenceStatus?: 'present' | 'missing' | 'unknown'
}) {
  const projectFactLine = 'Memory Workbench status snapshot.'
  return {
    visibleReplyRealization: {
      ...(input.validationStatus
        ? { visibleReplyValidationStatus: input.validationStatus }
        : {}),
      ...(input.evidenceStatus
        ? { projectStateEvidenceStatus: input.evidenceStatus }
        : {}),
      projectStateAudit: {
        sameHerSummary: projectFactLine,
        currentPhaseSummary: 'embedding reindex',
        landedProgressSummary: 'WorkingMemory schema migration completed.',
        openClosureSummary: 'LongTermMemoryRecall validation pending.',
        nextClosureTargetSummary: 'Run embedding reindex verification.',
        emotionalClosureSummary: 'Memory Workbench affect sample recorded.',
        preDialogueAwarenessSummary: 'WorkingMemory and LongTermMemoryRecall status loaded.',
        continuitySummary: 'WorkingMemory owner and embedding index recorded.',
        embodimentClosureSummary: 'Memory Workbench display state recorded.',
      },
    },
    structured: {
      projectState: {
        sameHerSelfLine: projectFactLine,
      },
      preDialogueClosure: {
        summaryLine: 'WorkingMemory migration and embedding reindex facts loaded.',
      },
    },
  } as any
}

function missingProjectStateAuditTurn(input: {
  validationStatus?: 'approved' | 'blocked' | 'unknown'
  evidenceStatus?: 'present' | 'missing' | 'unknown'
}) {
  return {
    visibleReplyRealization: {
      ...(input.validationStatus
        ? { visibleReplyValidationStatus: input.validationStatus }
        : {}),
      ...(input.evidenceStatus
        ? { projectStateEvidenceStatus: input.evidenceStatus }
        : {}),
      projectStateAudit: null,
    },
    structured: null,
  } as any
}

describe('replay benchmark status summaries', () => {
  it('counts approved, blocked, and historical unknown validation separately for emotional closure', () => {
    expect(__alicizationTestOnly.buildReplayEmotionalClosureSummary).toBeTypeOf('function')

    const summary = __alicizationTestOnly.buildReplayEmotionalClosureSummary({
      turns: [
        emotionalTurn({
          validationStatus: 'approved',
          activeCue: 'Memory Workbench emotion record is available.',
          lowPressureRequired: true,
        }),
        emotionalTurn({
          validationStatus: 'blocked',
          antiRestartRequired: true,
        }),
        emotionalTurn({
          validationStatus: 'unknown',
          activeCue: 'LongTermMemoryRecall affect record is available.',
        }),
        emotionalTurn({
          activeCue: 'Historical validation status was not recorded.',
        }),
      ],
    })

    expect(summary).toEqual({
      comparedTurnCount: 4,
      activeCueTurnCount: 3,
      lowPressureRequiredTurnCount: 1,
      antiRestartRequiredTurnCount: 1,
      validationStatus: {
        knownTurnCount: 2,
        approvedTurnCount: 1,
        blockedTurnCount: 1,
        unknownTurnCount: 2,
      },
    })
  })

  it('fails emotional closure drift closed unless every compared turn is active and explicitly approved', () => {
    const hasDrift = __alicizationTestOnly.hasReplayEmotionalClosureDrift
    const fullyApproved = {
      comparedTurnCount: 2,
      activeCueTurnCount: 2,
      lowPressureRequiredTurnCount: 0,
      antiRestartRequiredTurnCount: 0,
      validationStatus: {
        knownTurnCount: 2,
        approvedTurnCount: 2,
        blockedTurnCount: 0,
        unknownTurnCount: 0,
      },
    }

    expect(hasDrift(fullyApproved)).toBe(false)
    for (const incompleteSummary of [
      {
        ...fullyApproved,
        validationStatus: {
          ...fullyApproved.validationStatus,
          knownTurnCount: 1,
        },
      },
      {
        ...fullyApproved,
        validationStatus: {
          ...fullyApproved.validationStatus,
          approvedTurnCount: 1,
        },
      },
      {
        ...fullyApproved,
        validationStatus: {
          ...fullyApproved.validationStatus,
          blockedTurnCount: 1,
        },
      },
      {
        ...fullyApproved,
        validationStatus: {
          ...fullyApproved.validationStatus,
          unknownTurnCount: 1,
        },
      },
      {
        ...fullyApproved,
        activeCueTurnCount: 1,
      },
    ]) {
      expect(hasDrift(incompleteSummary)).toBe(true)
    }
  })

  it('keeps self-authority content completeness independent from validation status', () => {
    expect(__alicizationTestOnly.buildReplaySelfAuthoritySummary).toBeTypeOf('function')

    const summary = __alicizationTestOnly.buildReplaySelfAuthoritySummary({
      turns: [
        selfAuthorityTurn({
          validationStatus: 'approved',
          authoritySummary: 'Memory Workbench owns this status record.',
          closenessPosture: 'working-memory-review',
        }),
        selfAuthorityTurn({
          validationStatus: 'blocked',
          authoritySummary: 'WorkingMemory record exists without a posture value.',
        }),
        selfAuthorityTurn({
          validationStatus: 'unknown',
          authoritySummary: 'LongTermMemoryRecall status is recorded.',
          closenessPosture: 'recall-review',
        }),
        selfAuthorityTurn({
          authoritySummary: 'Embedding reindex status is recorded.',
          closenessPosture: 'index-review',
        }),
      ],
    })

    expect(summary).toEqual({
      comparedTurnCount: 4,
      authoritySummaryTurnCount: 4,
      closenessPostureTurnCount: 3,
      contentCompleteTurnCount: 3,
      validationStatus: {
        knownTurnCount: 2,
        approvedTurnCount: 1,
        blockedTurnCount: 1,
        unknownTurnCount: 2,
      },
    })
  })

  it('counts project-state validation and evidence denominators without inferring from content or legacy flags', () => {
    expect(__alicizationTestOnly.buildReplayProjectStateAuditSummary).toBeTypeOf('function')

    const summary = __alicizationTestOnly.buildReplayProjectStateAuditSummary({
      turns: [
        completeProjectStateTurn({
          validationStatus: 'approved',
          evidenceStatus: 'present',
        }),
        completeProjectStateTurn({
          validationStatus: 'blocked',
          evidenceStatus: 'missing',
        }),
        completeProjectStateTurn({
          validationStatus: 'unknown',
          evidenceStatus: 'unknown',
        }),
        completeProjectStateTurn({}),
      ],
    })

    expect(summary).toEqual(expect.objectContaining({
      comparedTurnCount: 4,
      contentCompleteTurnCount: 4,
      validationStatus: {
        knownTurnCount: 2,
        approvedTurnCount: 1,
        blockedTurnCount: 1,
        unknownTurnCount: 2,
      },
      evidenceStatus: {
        knownTurnCount: 2,
        presentTurnCount: 1,
        missingTurnCount: 1,
        unknownTurnCount: 2,
      },
    }))
    expect(summary).not.toHaveProperty('preservedTurnCount')
    expect(summary).not.toHaveProperty('rewriteAppliedTurnCount')
    expect(summary).not.toHaveProperty('fullyCarriedTurnCount')
  })

  it('does not expose legacy rewrite counters when historical turns contain obsolete telemetry', () => {
    const historicalTurn = completeProjectStateTurn({
      validationStatus: 'approved',
      evidenceStatus: 'present',
    })
    historicalTurn.visibleReplyRealization.projectStateAudit.preservedIntoRewrite = true
    historicalTurn.visibleReplyRealization.projectStateAudit.rewriteClosureApplied = true

    const summary = __alicizationTestOnly.buildReplayProjectStateAuditSummary({
      turns: [historicalTurn],
    })

    expect(JSON.stringify(summary)).not.toMatch(
      /preservedIntoRewrite|rewriteClosureApplied|rewriteAppliedTurnCount/u,
    )
  })

  it('counts an explicit missing project-state realization even when its audit is absent', () => {
    const summary = __alicizationTestOnly.buildReplayProjectStateAuditSummary({
      turns: [
        missingProjectStateAuditTurn({
          validationStatus: 'approved',
          evidenceStatus: 'missing',
        }),
      ],
    })

    expect(summary).toEqual(expect.objectContaining({
      comparedTurnCount: 1,
      contentCompleteTurnCount: 0,
      validationStatus: {
        knownTurnCount: 1,
        approvedTurnCount: 1,
        blockedTurnCount: 0,
        unknownTurnCount: 0,
      },
      evidenceStatus: {
        knownTurnCount: 1,
        presentTurnCount: 0,
        missingTurnCount: 1,
        unknownTurnCount: 0,
      },
    }))
  })

  it('keeps complete and missing project-state realizations in the same denominator', () => {
    const summary = __alicizationTestOnly.buildReplayProjectStateAuditSummary({
      turns: [
        completeProjectStateTurn({
          validationStatus: 'approved',
          evidenceStatus: 'present',
        }),
        missingProjectStateAuditTurn({
          validationStatus: 'approved',
          evidenceStatus: 'missing',
        }),
      ],
    })

    expect(summary).toEqual(expect.objectContaining({
      comparedTurnCount: 2,
      contentCompleteTurnCount: 1,
      validationStatus: {
        knownTurnCount: 2,
        approvedTurnCount: 2,
        blockedTurnCount: 0,
        unknownTurnCount: 0,
      },
      evidenceStatus: {
        knownTurnCount: 2,
        presentTurnCount: 1,
        missingTurnCount: 1,
        unknownTurnCount: 0,
      },
    }))
  })

  it('fails the project-state audit ship gate when all statuses are unknown', () => {
    const shipGate = __alicizationTestOnly.buildReplayBenchmarkShipGate({
      report: {
        gate: {
          passed: true,
          failingKeys: [],
        },
        telemetryPatch: {
          retrievalHealth: {},
        },
        datasetFeedback: {
          humanRatingRubric: null,
          paritySummary: null,
          authoritySummary: null,
          projectStateSummary: null,
          projectStateAuditSummary: {
            comparedTurnCount: 2,
            sameHerSummaryTurnCount: 0,
            sameHerSelfLineTurnCount: 0,
            currentPhaseTurnCount: 2,
            landedProgressTurnCount: 2,
            openClosureTurnCount: 2,
            nextClosureTargetTurnCount: 2,
            emotionalClosureTurnCount: 2,
            preDialogueAwarenessTurnCount: 2,
            richPreDialogueAwarenessTurnCount: 0,
            continuitySummaryTurnCount: 2,
            embodimentClosureTurnCount: 2,
            preDialogueClosureTurnCount: 2,
            contentCompleteTurnCount: 2,
            validationStatus: {
              knownTurnCount: 0,
              approvedTurnCount: 0,
              blockedTurnCount: 0,
              unknownTurnCount: 2,
            },
            evidenceStatus: {
              knownTurnCount: 0,
              presentTurnCount: 0,
              missingTurnCount: 0,
              unknownTurnCount: 2,
            },
          },
        },
      },
      finalReplayGate: {
        passed: true,
        failingKeys: [],
      },
    } as any)
    const projectStateAuditGate = shipGate.find(row => row.key === 'project-state-audit-gate')

    expect(projectStateAuditGate).toEqual(expect.objectContaining({
      status: 'fail',
      detail: expect.stringContaining('validationUnknown=2'),
    }))
    expect(projectStateAuditGate?.detail).toContain('evidenceUnknown=2')
  })

  it('fails the project-state audit ship gate for contradictory deserialized counters', () => {
    const shipGate = __alicizationTestOnly.buildReplayBenchmarkShipGate({
      report: {
        gate: {
          passed: true,
          failingKeys: [],
        },
        telemetryPatch: {
          retrievalHealth: {},
        },
        datasetFeedback: {
          humanRatingRubric: null,
          paritySummary: null,
          authoritySummary: null,
          projectStateSummary: null,
          projectStateAuditSummary: {
            comparedTurnCount: 2,
            sameHerSummaryTurnCount: 0,
            sameHerSelfLineTurnCount: 0,
            currentPhaseTurnCount: 2,
            landedProgressTurnCount: 2,
            openClosureTurnCount: 2,
            nextClosureTargetTurnCount: 2,
            emotionalClosureTurnCount: 2,
            preDialogueAwarenessTurnCount: 2,
            richPreDialogueAwarenessTurnCount: 0,
            continuitySummaryTurnCount: 2,
            embodimentClosureTurnCount: 2,
            preDialogueClosureTurnCount: 2,
            contentCompleteTurnCount: 2,
            validationStatus: {
              knownTurnCount: 2,
              approvedTurnCount: 1,
              blockedTurnCount: 0,
              unknownTurnCount: 0,
            },
            evidenceStatus: {
              knownTurnCount: 2,
              presentTurnCount: 2,
              missingTurnCount: 0,
              unknownTurnCount: 1,
            },
          },
        },
      },
      finalReplayGate: {
        passed: true,
        failingKeys: [],
      },
    } as any)
    const projectStateAuditGate = shipGate.find(row => row.key === 'project-state-audit-gate')

    expect(projectStateAuditGate?.status).toBe('fail')
  })

  it('does not let a prepared mirror fill final project-state content or sameHer counts', () => {
    const summary = __alicizationTestOnly.buildReplayProjectStateAuditSummary({
      turns: [{
        visibleReplyRealization: {
          visibleReplyValidationStatus: 'approved',
          projectStateEvidenceStatus: 'present',
          projectStateAudit: {
            sameHerSummary: null,
            currentPhaseSummary: 'embedding reindex',
            landedProgressSummary: 'WorkingMemory schema migration completed.',
            openClosureSummary: 'LongTermMemoryRecall validation pending.',
            nextClosureTargetSummary: 'Run embedding reindex verification.',
            emotionalClosureSummary: 'Memory Workbench affect sample recorded.',
            preDialogueAwarenessSummary: null,
            continuitySummary: 'WorkingMemory owner and embedding index recorded.',
            embodimentClosureSummary: 'Memory Workbench display state recorded.',
          },
        },
        structured: {
          preDialogueClosure: {
            summaryLine: 'WorkingMemory migration and embedding reindex facts loaded.',
          },
        },
      } as any],
      preparedTurns: [{
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            dialogue: {
              sessionMirror: {
                continuityArcSummary: 'project_preflight=Memory Workbench voice index contains 12 rows.',
              },
            },
          },
        },
      } as any],
    })

    expect(summary).toEqual(expect.objectContaining({
      comparedTurnCount: 1,
      sameHerSummaryTurnCount: 0,
      sameHerSelfLineTurnCount: 0,
      preDialogueAwarenessTurnCount: 0,
      contentCompleteTurnCount: 0,
    }))
  })

  it('uses neutral long-run emotional carry diagnostics without rewrite wording', () => {
    expect(__alicizationTestOnly.buildReplayLongRunSameHerTurnDiagnostics).toBeTypeOf('function')

    const diagnostic = __alicizationTestOnly.buildReplayLongRunSameHerTurnDiagnostics({
      prepared: {
        runtimeSurface: null,
        organicMemoryContext: null,
      } as any,
      sampledTurn: {
        turnId: 'turn-memory-workbench-emotion-gap',
        userText: 'Memory Workbench row has no affect record.',
        visibleReplyRealization: {
          emotionalClosureAudit: {
            activeCue: null,
          },
        },
      } as any,
      quality: {
        procedureCarryQuality: 'fail',
        replyMemoryCoherence: 'fail',
        afterglowFalseCarryRate: 'fail',
      } as any,
    })

    expect(diagnostic.missingLaneReasons?.emotion).toContain(
      'emotional closure audit did not carry emotional closure evidence',
    )
    expect(JSON.stringify(diagnostic)).not.toMatch(/preserv|rewrite/i)
  })
})
