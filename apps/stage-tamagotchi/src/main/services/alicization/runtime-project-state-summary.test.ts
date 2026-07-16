import { describe, expect, it, vi } from 'vitest'

vi.mock('@moeru/eventa', () => ({
  defineEventa: vi.fn((name: string) => ({ name })),
  defineInvokeEventa: vi.fn((name: string) => ({ name })),
  defineInvokeHandler: vi.fn(),
}))

vi.mock('@moeru/eventa/adapters/electron/main', () => ({
  createContext: () => ({
    context: {
      emit: vi.fn(),
    },
  }),
}))

vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => '/tmp/airi-runtime-should-not-be-used'),
    getLocale: vi.fn(() => 'zh-Hans'),
  },
  globalShortcut: {
    register: vi.fn(() => true),
    isRegistered: vi.fn(() => false),
    unregister: vi.fn(),
  },
  powerMonitor: {
    on: vi.fn(),
    removeListener: vi.fn(),
  },
  desktopCapturer: {
    getSources: vi.fn(async () => []),
  },
  systemPreferences: {
    getMediaAccessStatus: vi.fn(() => 'granted'),
  },
  ipcMain: {
    handle: vi.fn(),
    removeHandler: vi.fn(),
  },
  webContents: {
    getAllWebContents: vi.fn(() => []),
  },
}))

vi.mock('../../libs/bootkit/lifecycle', () => ({
  onAppBeforeQuit: vi.fn(),
}))

vi.mock('./db', () => ({
  setupAlicizationDb: vi.fn(),
}))

vi.mock('@proj-alicization/electron-screen-capture/main', () => ({
  getScreenCaptureDiagnosticsForWebContentsId: vi.fn(() => null),
}))

const { runtimeTestInternals } = await import('./runtime')

describe('runtime project-state summary', () => {
  const legacyRewriteTelemetry = {
    preservedIntoRewrite: true,
    rewriteClosureApplied: true,
  }
  const legacyClosureTelemetry = {
    rewriteAttempted: true,
    rewriteSucceeded: true,
  }

  it('keeps host-corrected same-person continuity authority over generic progress recap pressure when merging visible-reply project-state audit sources', () => {
    const correctedSamePersonAuthority
      = 'Keep the host-corrected same-person continuity authoritative before any progress-style continuation or status recap.'
    const genericProgressRecapPressure
      = 'Keep the project moving with a concise progress recap and status continuation before widening back out.'

    const mergedAudit = runtimeTestInternals.mergeVisibleReplyProjectStateAudit({
      primary: {
        sameHerSummary: 'structured continuity digest.',
        landedProgressSummary: 'Runtime project-state carry already survives into the visible reply merge path.',
        openClosureSummary: 'Memory, initiative, and embodiment still need one tighter identity-continuity',
        nextClosureTargetSummary: 'Keep project identity, landed progress, and still-open closure on one continuity state.',
        preDialogueAwarenessSummary: 'pre_turn_context_digest',
        sameHerHoldDetail: genericProgressRecapPressure,
      } as any,
      structured: {
        sameHerHoldDetail: correctedSamePersonAuthority,
      },
    })

    expect(mergedAudit).toEqual(expect.objectContaining({
      sameHerHoldDetail: correctedSamePersonAuthority,
      continuitySummary: expect.stringContaining(correctedSamePersonAuthority),
    }))
    expect(String(mergedAudit?.continuitySummary ?? '')).not.toContain(genericProgressRecapPressure)
  })

  it('keeps explicit realization statuses while dropping legacy rewrite telemetry from nested audits and closure', () => {
    const normalized = runtimeTestInternals.normalizeVisibleReplyRealizationTelemetry({
      expectedAuthority: 'llm-mind',
      actualAuthority: 'llm-mind',
      providerMindExecuted: true,
      mode: 'provider-stream',
      visibleText: 'Provider-authored visible reply.',
      visibleReplyValidationStatus: 'approved',
      projectStateEvidenceStatus: 'present',
      ...legacyRewriteTelemetry,
      emotionalClosureAudit: {
        activeCue: 'Keep the reply lower-pressure.',
        ...legacyRewriteTelemetry,
        lowPressureRequired: true,
        antiRestartRequired: true,
      },
      selfAuthorityAudit: {
        authoritySummary: 'The same self remains authoritative.',
        closenessPosture: 'measured-return',
        ...legacyRewriteTelemetry,
      },
      projectStateAudit: {
        sameHerSummary: 'Project-state evidence remains explicit.',
        ...legacyRewriteTelemetry,
      },
      closure: {
        version: 'visible-reply-closure-public-summary-v1',
        status: 'approved',
        reasonCodes: ['provider-critic-pass'],
        initialCriticStatus: 'pass',
        finalCriticStatus: 'pass',
        ...legacyClosureTelemetry,
      },
    })

    expect(normalized).toEqual(expect.objectContaining({
      visibleReplyValidationStatus: 'approved',
      projectStateEvidenceStatus: 'present',
      emotionalClosureAudit: {
        activeCue: 'Keep the reply lower-pressure.',
        lowPressureRequired: true,
        antiRestartRequired: true,
      },
      selfAuthorityAudit: {
        authoritySummary: 'The same self remains authoritative.',
        closenessPosture: 'measured-return',
      },
      closure: {
        version: 'visible-reply-closure-public-summary-v1',
        status: 'approved',
        reasonCodes: ['provider-critic-pass'],
        initialCriticStatus: 'pass',
        finalCriticStatus: 'pass',
      },
    }))
    expect(JSON.stringify(normalized)).not.toMatch(
      /preservedIntoRewrite|rewriteClosureApplied|rewriteAttempted|rewriteSucceeded/u,
    )
  })

  it('resolves multi-source validation and project-state evidence from final facts instead of source order', () => {
    const explicitConflictWithoutClosure = runtimeTestInternals.resolveVisibleReplyRealizationFacts({
      sources: [
        {
          visibleReplyValidationStatus: 'approved',
          projectStateEvidenceStatus: 'present',
        },
        {
          visibleReplyValidationStatus: 'blocked',
          projectStateEvidenceStatus: 'missing',
        },
      ],
      projectStateAudit: null,
    })
    const approvedClosureOverridesExplicitBlocked = runtimeTestInternals.resolveVisibleReplyRealizationFacts({
      sources: [
        {
          visibleReplyValidationStatus: 'blocked',
          projectStateEvidenceStatus: 'missing',
        },
        {
          visibleReplyValidationStatus: 'approved',
          projectStateEvidenceStatus: 'present',
          closure: {
            version: 'visible-reply-closure-public-summary-v1',
            status: 'approved',
            reasonCodes: ['closure-approved'],
            initialCriticStatus: 'pass',
            finalCriticStatus: 'pass',
          },
        },
      ],
      projectStateAudit: {
        sameHerSummary: 'Allowlisted project-state evidence survived the final merge.',
      },
    })

    expect(explicitConflictWithoutClosure).toEqual(expect.objectContaining({
      visibleReplyValidationStatus: 'unknown',
      projectStateEvidenceStatus: 'missing',
      closure: null,
    }))
    expect(approvedClosureOverridesExplicitBlocked).toEqual(expect.objectContaining({
      visibleReplyValidationStatus: 'approved',
      projectStateEvidenceStatus: 'present',
      closure: expect.objectContaining({
        status: 'approved',
      }),
    }))
  })

  it('normalizes explicit approved and blocked statuses to unknown when no closure exists', () => {
    const explicitApproved = runtimeTestInternals.normalizeVisibleReplyRealizationTelemetry({
      visibleReplyValidationStatus: 'approved',
    })
    const explicitBlocked = runtimeTestInternals.normalizeVisibleReplyRealizationTelemetry({
      visibleReplyValidationStatus: 'blocked',
    })

    expect(explicitApproved).toEqual(expect.objectContaining({
      visibleReplyValidationStatus: 'unknown',
      closure: null,
    }))
    expect(explicitBlocked).toEqual(expect.objectContaining({
      visibleReplyValidationStatus: 'unknown',
      closure: null,
    }))
  })

  it('merges structured-only realization through the whitelist and lets blocked closure decide validation', () => {
    const merged = (runtimeTestInternals as any).mergeVisibleReplyRealizationTelemetry({
      structured: {
        expectedAuthority: 'llm-mind',
        actualAuthority: 'llm-mind',
        providerMindExecuted: true,
        mode: 'provider-stream',
        visibleText: 'Structured-only visible reply.',
        visibleReplyValidationStatus: 'approved',
        projectStateEvidenceStatus: 'missing',
        emotionalClosureAudit: {
          activeCue: 'Keep the structured reply lower-pressure.',
        },
        selfAuthorityAudit: {
          authoritySummary: 'Structured realization keeps the same self authoritative.',
          closenessPosture: 'measured-return',
        },
        projectStateAudit: {
          sameHerSummary: 'Structured-only allowlisted project evidence survived.',
        },
        closure: {
          version: 'visible-reply-closure-public-summary-v1',
          status: 'blocked',
          reasonCodes: ['structured-closure-blocked'],
          initialCriticStatus: 'blocked',
          finalCriticStatus: 'blocked',
        },
      },
    })

    expect(merged).toEqual(expect.objectContaining({
      visibleReplyValidationStatus: 'blocked',
      projectStateEvidenceStatus: 'present',
      projectStateAudit: expect.objectContaining({
        sameHerSummary: 'Structured-only allowlisted project evidence survived.',
      }),
      emotionalClosureAudit: {
        activeCue: 'Keep the structured reply lower-pressure.',
        lowPressureRequired: false,
        antiRestartRequired: false,
      },
      selfAuthorityAudit: {
        authoritySummary: 'Structured realization keeps the same self authoritative.',
        closenessPosture: 'measured-return',
      },
      closure: {
        version: 'visible-reply-closure-public-summary-v1',
        status: 'blocked',
        reasonCodes: ['structured-closure-blocked'],
        initialCriticStatus: 'blocked',
        finalCriticStatus: 'blocked',
      },
    }))
  })

  it('normalizes closure and evidence statuses against the cleaned realization facts', () => {
    const blockedByClosure = runtimeTestInternals.normalizeVisibleReplyRealizationTelemetry({
      visibleReplyValidationStatus: 'approved',
      projectStateEvidenceStatus: 'present',
      projectStateAudit: {},
      closure: {
        version: 'visible-reply-closure-public-summary-v1',
        status: 'blocked',
        reasonCodes: ['critic-blocked'],
        initialCriticStatus: 'blocked',
        finalCriticStatus: 'blocked',
      },
    })
    const presentFromFinalEvidence = runtimeTestInternals.normalizeVisibleReplyRealizationTelemetry({
      projectStateEvidenceStatus: 'missing',
      projectStateAudit: {
        landedProgressSummary: 'A final allowlisted evidence field survived cleaning.',
      },
    })
    const historicalUnknownWithEvidence = runtimeTestInternals.normalizeVisibleReplyRealizationTelemetry({
      projectStateAudit: {
        landedProgressSummary: 'Historical records remain unknown without an explicit computed status.',
      },
    })

    expect(blockedByClosure).toEqual(expect.objectContaining({
      visibleReplyValidationStatus: 'blocked',
      projectStateEvidenceStatus: 'missing',
      projectStateAudit: null,
      closure: expect.objectContaining({
        status: 'blocked',
      }),
    }))
    expect(presentFromFinalEvidence).toEqual(expect.objectContaining({
      projectStateEvidenceStatus: 'present',
      projectStateAudit: expect.objectContaining({
        landedProgressSummary: 'A final allowlisted evidence field survived cleaning.',
      }),
    }))
    expect(historicalUnknownWithEvidence).toEqual(expect.objectContaining({
      projectStateEvidenceStatus: 'unknown',
    }))
  })

  it('normalizes missing persisted realization statuses to unknown without explicit closure facts', () => {
    const normalized = runtimeTestInternals.normalizePersistedProjectStateForConversationTurn({
      assistantText: 'The visible reply keeps the current project state explicit.',
      structured: {
        visibleReplyRealization: {
          expectedAuthority: 'llm-mind',
          actualAuthority: 'llm-mind',
          providerMindExecuted: true,
          mode: 'provider-stream',
          visibleText: 'The visible reply keeps the current project state explicit.',
          emotionalClosureAudit: {
            activeCue: 'Keep the reply lower-pressure.',
          },
          selfAuthorityAudit: {
            authoritySummary: 'The same self remains authoritative.',
            closenessPosture: 'measured-return',
          },
          projectStateAudit: {
            sameHerSummary: 'Project-state evidence exists, but the new status was not recorded.',
          },
        },
      },
      projectStatePersistence: {
        identity: 'Alicization is a local-first digital life project.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: 'Visible reply realization now records explicit factual statuses.',
        primaryOpenLoop: 'Runtime persistence still needs legacy telemetry removal.',
        nextClosureTarget: 'Preserve explicit statuses without inferring success from old booleans.',
      },
    }) as Record<string, any>
    const realization = normalized.visibleReplyRealization

    expect(realization).toEqual(expect.objectContaining({
      visibleReplyValidationStatus: 'unknown',
      projectStateEvidenceStatus: 'unknown',
      closure: null,
    }))
  })

  it('rebuilds persisted realization through the whitelist even when assistant text is empty', () => {
    const normalized = runtimeTestInternals.normalizePersistedProjectStateForConversationTurn({
      assistantText: '',
      structured: {
        visibleReplyRealization: {
          expectedAuthority: 'llm-mind',
          actualAuthority: 'llm-mind',
          providerMindExecuted: true,
          mode: 'provider-stream',
          visibleText: null,
          visibleReplyValidationStatus: 'approved',
          projectStateEvidenceStatus: 'present',
          emotionalClosureAudit: {
            activeCue: 'Keep the return lower-pressure.',
          },
          selfAuthorityAudit: {
            authoritySummary: 'The same self remains authoritative.',
            closenessPosture: 'measured-return',
          },
          projectStateAudit: {
            sameHerSummary: 'Allowlisted project-state evidence remains available.',
          },
          closure: {
            version: 'visible-reply-closure-public-summary-v1',
            status: 'blocked',
            reasonCodes: ['empty-visible-reply'],
            initialCriticStatus: 'blocked',
            finalCriticStatus: 'blocked',
          },
        },
      },
      projectStatePersistence: {
        identity: 'Alicization is a local-first digital life project.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: null,
        primaryOpenLoop: null,
        nextClosureTarget: 'Keep runtime realization persistence factually consistent.',
      },
    }) as Record<string, any>
    const realization = normalized.visibleReplyRealization

    expect(realization).toEqual(expect.objectContaining({
      visibleReplyValidationStatus: 'blocked',
      projectStateEvidenceStatus: 'present',
      projectStateAudit: expect.objectContaining({
        sameHerSummary: 'Allowlisted project-state evidence remains available.',
      }),
      emotionalClosureAudit: {
        activeCue: 'Keep the return lower-pressure.',
        lowPressureRequired: false,
        antiRestartRequired: false,
      },
      selfAuthorityAudit: {
        authoritySummary: 'The same self remains authoritative.',
        closenessPosture: 'measured-return',
      },
      closure: {
        version: 'visible-reply-closure-public-summary-v1',
        status: 'blocked',
        reasonCodes: ['empty-visible-reply'],
        initialCriticStatus: 'blocked',
        finalCriticStatus: 'blocked',
      },
    }))
  })
})
