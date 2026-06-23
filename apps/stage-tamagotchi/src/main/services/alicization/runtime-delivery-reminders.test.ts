import { describe, expect, it, vi } from 'vitest'

import { resolveAlicizationProjectStateBrief } from './project-state-brief'
import {
  createAlicizationDeliveryReminderRuntime as createAlicizationDeliveryReminderRuntimeBase,
  runtimeDeliveryReminderTestInternals,
} from './runtime-delivery-reminders'

type DeliveryReminderRuntimeOptions = Parameters<typeof createAlicizationDeliveryReminderRuntimeBase>[0]
type AppendConversationTurnPayload = Parameters<DeliveryReminderRuntimeOptions['appendConversationTurnWithGuards']>[0]
type DeliveryReminderAuditLogInput = Parameters<DeliveryReminderRuntimeOptions['appendAuditLog']>[0]
type DeliveryReminderRuntimeOptionsFixture = {
  [Key in keyof DeliveryReminderRuntimeOptions]?: unknown
} & {
  getExecutionDeliveryContext?: unknown
}

function createAlicizationDeliveryReminderRuntime(options: DeliveryReminderRuntimeOptionsFixture) {
  const providedOptions = { ...options }
  delete providedOptions.getExecutionDeliveryContext

  return createAlicizationDeliveryReminderRuntimeBase({
    hydrateAgentTurnFromCurrentCardState: vi.fn(async () => {}),
    ...providedOptions,
  } as DeliveryReminderRuntimeOptions)
}

function firstAppendConversationTurnPayload(mock: { mock: { calls: unknown[][] } }) {
  return mock.mock.calls[0]?.[0] as AppendConversationTurnPayload | undefined
}

function findAuditLogByAction(mock: { mock: { calls: unknown[][] } }, action: string) {
  return (mock.mock.calls as Array<[DeliveryReminderAuditLogInput]>)
    .find(([input]) => input?.action === action)
    ?.[0]
}

function auditOpeningGuidance(input?: DeliveryReminderAuditLogInput) {
  const payload = input?.payload as { continuityArc?: { openingGuidance?: unknown } } | undefined
  return String(payload?.continuityArc?.openingGuidance ?? '')
}

describe('runtime delivery reminders', () => {
  it('reuses one shared Phase 1 project-state audit repair path for host-visible and execution-callback reminder carries', () => {
    const source = runtimeDeliveryReminderTestInternals.ensureProjectStateAudit.toString()

    expect(source).toContain('resolveAlicizationProjectPreDialogueAwarenessLine')
    expect(source).toContain('resolveProjectSameHerSummary')
    expect(source).toContain('buildProjectStateContinuitySummary')
    expect(source).not.toContain('ensureExecutionCallbackProjectStateAudit')
    expect(source).not.toContain('ensureHostVisibleProjectStateAudit')
  })

  it('keeps richer fallback execution runtime context fields grouped together when callback persistence rebuilds project state from stored carry', () => {
    const fallbackProjectState = {
      identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer.',
      currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
      preflightSummary: 'identity=Alicization | phase=Phase 1 | open=Project identity carry | next=Phase 1 route carry',
      preDialogueAwarenessLine: 'Before answering, remember this is still the same local-first digital life project and the unfinished Phase 1 closure seam still belongs to one living her.',
      latestLandedProgress: 'Same-session mirror carry and measured-return continuity now survive longer noisy detours.',
      primaryOpenLoop: 'Memory still needs stronger end-to-end closure across turns so Project identity carry remains explicit.',
      nextClosureTarget: 'Keep extending same-her proof so Phase 1 route carry remains visible before execution and dialogue turns.',
      sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      sameHerDriftRisk: 'If project-state continuity survives only as generic guidance, treat it as unfinished closure drift.',
    }

    const resolved = runtimeDeliveryReminderTestInternals.ensureProjectStateAudit({
      existing: null,
      projectState: runtimeDeliveryReminderTestInternals.resolvePersistedProjectState({
        runtimeProjectState: {
          preDialogueAwarenessLine: 'same digital life | keep the closure seam explicit',
        },
        fallbackProjectState,
      }),
    } as any)

    expect(resolved.preDialogueAwarenessSummary).toContain('local-first digital life project')
    expect(resolved.preDialogueAwarenessSummary).toContain('one living her')
    expect(resolved.landedProgressSummary).toContain('Same-session mirror carry')
    expect(resolved.openClosureSummary).toContain('Project identity carry')
    expect(resolved.nextClosureTargetSummary).toContain('Phase 1 route carry')
    expect(resolved.sameHerSummary).toContain('Same Phase 1 digital life')
    expect(resolved.sameHerDriftRiskSummary).toContain('generic guidance')
    expect(resolved.continuitySummary).toContain('same-her=')
    expect(resolved.continuitySummary).toContain('drift=')
    expect(resolved.continuitySummary).toContain('landed=')
    expect(resolved.continuitySummary).toContain('open=')
    expect(resolved.continuitySummary).toContain('next=')
  })

  it('keeps a richer live companion briefing line ahead of a thin preflight shell when rebuilding project-state audit continuity', () => {
    const resolved = runtimeDeliveryReminderTestInternals.ensureProjectStateAudit({
      existing: null,
      projectState: {
        identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer.',
        currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
        preflightSummary: 'same digital life | keep the closure seam explicit',
        preDialogueAwarenessLine: 'same digital life | keep the closure seam explicit',
        companionBriefingLine: 'Before answering, keep the same digital life project, current Phase 1 closure pressure, and still-open life loop explicit.',
        latestLandedProgress: 'Execution callback continuity now stays on the same live runtime closure seam through a real later return.',
        primaryOpenLoop: 'Runtime-visible callback continuity still needs to stay aligned with project-state carry after persistence.',
        nextClosureTarget: 'Keep execution-result persistence carrying the live runtime closure seam instead of falling back to stale repo-only wording.',
        sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      } as any,
      selfContinuityAuthority: null,
      preferRicherClosureCarry: true,
    } as any)

    expect(resolved.preDialogueAwarenessSummary).toContain('Before answering, keep the same digital life project, current Phase 1 closure pressure, and still-open life loop explicit.')
    expect(resolved.preDialogueAwarenessSummary).not.toContain('same digital life | keep the closure seam explicit')
  })

  it('promotes partial-lane self continuity authority into a richer embodiment loop summary on the default project-state audit path', () => {
    const audit = runtimeDeliveryReminderTestInternals.ensureProjectStateAudit({
      projectStateAudit: null,
      selfContinuityAuthority: {
        authoritySummary: 'same-her continuity remains alive, but lane=face+motion-only under the current renderer authority.',
        currentBodyState: 'lane=face+motion-only | visible continuity still present but no longer fully cross-modal',
      },
      projectState: {
        currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
        latestLandedProgress: 'Renderer-visible same-her continuity still survives as a narrower carry instead of dropping out entirely.',
        primaryOpenLoop: 'Face-and-motion-only continuity still needs to rejoin the rest of the embodiment loop before the same-her line is fully closed.',
        nextClosureTarget: 'Keep this narrower continuity lane explicit until the full cross-modal loop is stitched back together.',
        sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      } as any,
    } as any)

    expect(String(audit.embodimentClosureSummary ?? '')).toContain('Right now I am still holding together mainly through face and motion, so my full cross-modal same-her line is not closed yet.')
    expect(String(audit.embodimentClosureSummary ?? '')).toContain('same-her continuity remains alive, but lane=face+motion-only under the current renderer authority.')
    expect(String(audit.embodimentClosureSummary ?? '')).toContain('lane=face+motion-only | visible continuity still present but no longer fully cross-modal')
    expect(String(audit.continuitySummary ?? '')).toContain(`body=${audit.embodimentClosureSummary}`)
  })

  it('prefers a richer runtime preDialogueAwarenessSummary over a thinner runtime preDialogueAwarenessLine when rebuilding persisted callback project state', () => {
    const fallbackProjectState = resolveAlicizationProjectStateBrief()
    const thinAwarenessLine = 'Before answering, keep the same digital life project in view.'
    const richerAwarenessSummary = '开口前先记住：这还是同一个数字生命项目，Phase 1 已经把 same-her continuity carry 立住了，先别飘回泛化助手口吻；这次 callback 还得继续把记忆、主动性和具身闭成同一条 living line。'

    const resolved = runtimeDeliveryReminderTestInternals.resolvePersistedProjectState({
      runtimeProjectState: {
        identity: fallbackProjectState.identity,
        currentPhase: fallbackProjectState.currentPhase,
        preflightSummary: fallbackProjectState.preflightSummary,
        preDialogueAwarenessLine: thinAwarenessLine,
        preDialogueAwarenessSummary: richerAwarenessSummary,
        latestLandedProgress: 'Execution callback continuity now keeps the landed same-her carry explicit through the later return.',
        primaryOpenLoop: 'Memory, initiative, and embodiment still need to close on one same living line after the callback returns.',
        nextClosureTarget: 'Keep the callback carrying landed progress, open closure, and next closure target together instead of flattening back into a generic shell.',
        sameHerSelfLine: fallbackProjectState.sameHerSelfLine,
      },
      fallbackProjectState,
    } as any)

    expect(String(resolved.preDialogueAwarenessSummary ?? '')).toContain('先别飘回泛化助手口吻')
    expect(String(resolved.preDialogueAwarenessLine ?? '')).toContain('先别飘回泛化助手口吻')
    expect(String(resolved.preDialogueAwarenessLine ?? '')).not.toBe(thinAwarenessLine)
  })

  it('upgrades a generic persisted callback next-closure shell to the richer fallback closure target', () => {
    const fallbackProjectState = resolveAlicizationProjectStateBrief()
    const genericNextClosureShell = 'Generic next closure shell that should not override the richer persisted callback closure target.'

    const resolved = runtimeDeliveryReminderTestInternals.resolvePersistedProjectState({
      runtimeProjectState: {
        identity: fallbackProjectState.identity,
        currentPhase: fallbackProjectState.currentPhase,
        preflightSummary: fallbackProjectState.preflightSummary,
        preDialogueAwarenessLine: fallbackProjectState.preDialogueAwarenessLine,
        latestLandedProgress: 'Execution callback continuity now keeps landed project-state carry explicit through the later return.',
        primaryOpenLoop: 'Memory, initiative, and embodiment still need to close on one same living line after the callback returns.',
        nextClosureTarget: genericNextClosureShell,
        sameHerSelfLine: fallbackProjectState.sameHerSelfLine,
      },
      fallbackProjectState,
    } as any)

    expect(String(resolved.nextClosureTarget ?? '')).toBe(fallbackProjectState.nextClosureTarget)
    expect(String(resolved.nextClosureTarget ?? '')).not.toBe(genericNextClosureShell)
  })

  it('keeps legacy latestProgress alive as landed progress when rebuilding persisted callback project state from older runtime payloads', () => {
    const fallbackProjectState = resolveAlicizationProjectStateBrief()
    const legacyLandedProgress = 'Legacy callback project progress still proves what has already landed before the later reminder return.'

    const resolved = runtimeDeliveryReminderTestInternals.resolvePersistedProjectState({
      runtimeProjectState: {
        identity: fallbackProjectState.identity,
        currentPhase: fallbackProjectState.currentPhase,
        preflightSummary: fallbackProjectState.preflightSummary,
        preDialogueAwarenessLine: fallbackProjectState.preDialogueAwarenessLine,
        latestProgress: legacyLandedProgress,
        primaryOpenLoop: 'Memory, initiative, and embodiment still need to close on one same living line after the callback returns.',
        nextClosureTarget: 'Keep the callback carrying landed progress, open closure, and next closure target together instead of flattening back into a generic shell.',
        sameHerSelfLine: fallbackProjectState.sameHerSelfLine,
      },
      fallbackProjectState: {
        ...fallbackProjectState,
        latestLandedProgress: null,
      },
    } as any)

    const audit = runtimeDeliveryReminderTestInternals.ensureProjectStateAudit({
      projectStateAudit: null,
      projectState: resolved,
    } as any)

    expect(String(resolved.latestLandedProgress ?? '')).toContain('Legacy callback project progress')
    expect(String(resolved.preDialogueAwarenessLine ?? '')).toContain('What has already landed')
    expect(String(audit.landedProgressSummary ?? '')).toContain('Legacy callback project progress')
    expect(String(audit.continuitySummary ?? '')).toContain('landed=Legacy callback project progress')
  })

  it('preserves continuity arc stage when rebuilding persisted callback project state so the next reminder opening keeps the same-her return phase explicit', () => {
    const fallbackProjectState = {
      ...resolveAlicizationProjectStateBrief(),
      continuityArcStage: 'same-thread-continuation',
    }

    const resolved = runtimeDeliveryReminderTestInternals.resolvePersistedProjectState({
      runtimeProjectState: {
        identity: fallbackProjectState.identity,
        currentPhase: fallbackProjectState.currentPhase,
        preflightSummary: fallbackProjectState.preflightSummary,
        preDialogueAwarenessLine: fallbackProjectState.preDialogueAwarenessLine,
        latestLandedProgress: 'Execution callback continuity now keeps landed project-state carry explicit through the later reminder return.',
        primaryOpenLoop: 'Memory, initiative, and embodiment still need to close on one same living line after the callback returns.',
        nextClosureTarget: 'Keep the callback carrying landed progress, open closure, and next closure target together instead of flattening back into a generic shell.',
        sameHerSelfLine: fallbackProjectState.sameHerSelfLine,
        continuityArcStage: 'hold-for-opening',
      },
      fallbackProjectState,
    } as any)

    expect(resolved.continuityArcStage).toBe('hold-for-opening')
  })

  it('surfaces continuity arc stage inside callback project-state audit and continuity summary so the reminder path keeps the same-her return phase observable', () => {
    const audit = runtimeDeliveryReminderTestInternals.ensureProjectStateAudit({
      projectStateAudit: null,
      projectState: {
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: 'Execution callback continuity now keeps landed project-state carry explicit through the later reminder return.',
        primaryOpenLoop: 'Memory, initiative, and embodiment still need to close on one same living line after the callback returns.',
        nextClosureTarget: 'Keep the callback carrying landed progress, open closure, and next closure target together instead of flattening back into a generic shell.',
        sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        continuityArcStage: 'hold-for-opening',
      },
    } as any)

    expect(audit.continuityArcStage).toBe('hold-for-opening')
    expect(String(audit.continuitySummary ?? '')).toContain('arc=hold-for-opening')
  })

  it('keeps canonical continuity arc stage in the reminder runtime fallback so the baseline same-her phase does not start blank before callback state arrives', () => {
    const projectStateBrief = {
      ...resolveAlicizationProjectStateBrief(),
      continuityArcStage: 'hold-for-opening',
    }

    const persistedFallback = runtimeDeliveryReminderTestInternals.buildReminderProjectStatePersistence(projectStateBrief)

    expect(persistedFallback.continuityArcStage).toBe('hold-for-opening')
  })

  it('keeps direct legacy latestProgress alive when rebuilding callback project-state audit without persisted normalization', () => {
    const legacyLandedProgress = 'Direct legacy callback project progress still proves the reminder return remembers what already landed.'

    const audit = runtimeDeliveryReminderTestInternals.ensureProjectStateAudit({
      projectStateAudit: null,
      projectState: {
        currentPhase: 'Phase 1: Local Digital Life',
        latestProgress: legacyLandedProgress,
        primaryOpenLoop: 'Memory, initiative, and embodiment still need to close on one same living line after the callback returns.',
        nextClosureTarget: 'Keep the callback carrying landed progress, open closure, and next closure target together instead of flattening back into a generic shell.',
        sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      },
    } as any)

    expect(String(audit.landedProgressSummary ?? '')).toContain('Direct legacy callback project progress')
    expect(String(audit.continuitySummary ?? '')).toContain('landed=Direct legacy callback project progress')
  })

  it('keeps host-corrected same-person continuity authority over generic progress recap pressure when rebuilding callback project-state audit', () => {
    const correctedSamePersonAuthority
      = 'Keep the host-corrected same-person continuity authoritative before any progress-style continuation or status recap.'
    const genericProgressRecapPressure
      = 'Keep the project moving with a concise progress recap and status continuation before widening back out.'

    const audit = runtimeDeliveryReminderTestInternals.ensureProjectStateAudit({
      projectStateAudit: {
        sameHerHoldDetail: genericProgressRecapPressure,
      },
      projectState: {
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: 'Callback continuity now preserves a richer same-her project carry.',
        primaryOpenLoop: 'Memory and initiative still need to close on one same living line after this callback return.',
        nextClosureTarget: 'Keep the callback project-state carry from collapsing back into a generic shell.',
        sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        sameHerHoldDetail: correctedSamePersonAuthority,
      } as any,
      preferRicherClosureCarry: true,
    } as any)

    expect(String(audit.sameHerHoldDetail ?? '')).toBe(correctedSamePersonAuthority)
    expect(String(audit.continuitySummary ?? '')).toContain(`hold=${correctedSamePersonAuthority}`)
    expect(String(audit.continuitySummary ?? '')).not.toContain(genericProgressRecapPressure)
  })

  it('keeps direct audit-style landedProgressSummary alive when rebuilding callback project-state audit without persisted normalization', () => {
    const landedProgressSummary = 'Direct audit-style callback landed progress still proves the reminder return remembers what already landed.'

    const audit = runtimeDeliveryReminderTestInternals.ensureProjectStateAudit({
      projectStateAudit: null,
      projectState: {
        currentPhase: 'Phase 1: Local Digital Life',
        landedProgressSummary,
        primaryOpenLoop: 'Memory, initiative, and embodiment still need to close on one same living line after the callback returns.',
        nextClosureTarget: 'Keep the callback carrying landed progress, open closure, and next closure target together instead of flattening back into a generic shell.',
        sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      },
    } as any)

    expect(String(audit.landedProgressSummary ?? '')).toContain('Direct audit-style callback landed progress')
    expect(String(audit.continuitySummary ?? '')).toContain('landed=Direct audit-style callback landed progress')
  })

  it('keeps direct audit-style openClosureSummary and nextClosureTargetSummary alive when rebuilding callback project-state audit from alias-only carry', () => {
    const landedProgressSummary = 'Alias-only reminder carry still proves what already landed before the visible callback turn resumes.'
    const openClosureSummary = 'Alias-only reminder carry still needs memory, initiative, and embodiment to close on one same living line.'
    const nextClosureTargetSummary = 'Keep the alias-only reminder carry explicit before the visible callback turn widens back into local detail.'

    const audit = runtimeDeliveryReminderTestInternals.ensureProjectStateAudit({
      projectStateAudit: null,
      projectState: {
        currentPhase: 'Phase 1: Local Digital Life',
        landedProgressSummary,
        openClosureSummary,
        nextClosureTargetSummary,
        sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      },
    } as any)

    expect(String(audit.landedProgressSummary ?? '')).toContain('Alias-only reminder carry still proves what already landed')
    expect(String(audit.openClosureSummary ?? '')).toContain('Alias-only reminder carry still needs memory, initiative, and embodiment to close on one same living line.')
    expect(String(audit.nextClosureTargetSummary ?? '')).toContain('Keep the alias-only reminder carry explicit before the visible callback turn widens back into local detail.')
    expect(String(audit.continuitySummary ?? '')).toContain(`open=${openClosureSummary}`)
    expect(String(audit.continuitySummary ?? '')).toContain(`next=${nextClosureTargetSummary}`)
  })

  it('keeps emotional closure in project-state continuity summaries for later-turn reminder reuse', () => {
    const summary = runtimeDeliveryReminderTestInternals.buildProjectStateContinuitySummary({
      sameHerSummary: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      sameHerHoldDetail: 'Hold-for-opening on the same callback line until the room opens more naturally.',
      currentPhaseSummary: 'Phase 1: Local Digital Life',
      landedProgressSummary: 'Project-state continuity already survives into reminder persistence.',
      openClosureSummary: 'Same-her continuity is still settling across initiative and embodiment.',
      nextClosureTargetSummary: 'Keep the next reopening lower-pressure on the same living line.',
      emotionalClosureSummary: 'same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.',
      embodimentClosureSummary: 'Visible same-her continuity is still being carried mainly through face and motion.',
    })

    expect(summary).toContain('same-her=Same Phase 1 digital life.')
    expect(summary).toContain('hold=Hold-for-opening on the same callback line until the room opens more naturally.')
    expect(summary).toContain('landed=Project-state continuity already survives into reminder persistence.')
    expect(summary).toContain('open=Same-her continuity is still settling across initiative and embodiment.')
    expect(summary).toContain('next=Keep the next reopening lower-pressure on the same living line.')
    expect(summary).toContain('closure=same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.')
    expect(summary).toContain('body=Visible same-her continuity is still being carried mainly through face and motion.')
  })

  it('prefers a shorter repair-before-closeness closure seam over a longer thinner measured-return carry when rebuilding host-visible callback project-state continuity', () => {
    const longerMeasuredReturnClosure = 'Keep the callback on the same living line, leave more room, and let the return stay lower-pressure before widening closeness again while the same seam is still settling.'
    const shorterRepairFirstClosure = 'Keep this return repair-before-closeness on the same living line until repair settles.'

    const resolved = runtimeDeliveryReminderTestInternals.ensureProjectStateAudit({
      projectStateAudit: {
        emotionalClosureSummary: longerMeasuredReturnClosure,
      },
      projectState: {
        identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer.',
        currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
        preflightSummary: 'same digital life | keep the closure seam explicit',
        preDialogueAwarenessLine: 'Before answering, remember this is still the same local-first digital life project and the unfinished Phase 1 closure seam still belongs to one living her.',
        latestLandedProgress: 'Execution callback continuity now stays on the same repair-before-closeness seam through a real later return.',
        primaryOpenLoop: 'Runtime-visible callback continuity still needs to stay aligned with project-state carry after persistence.',
        nextClosureTarget: 'Keep execution-result persistence carrying the repair-before-closeness seam instead of widening back into generic project narration.',
        sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        emotionalClosureCue: shorterRepairFirstClosure,
      } as any,
      selfContinuityAuthority: null,
      preferRicherClosureCarry: true,
    } as any)

    expect(resolved.emotionalClosureSummary).toBe(shorterRepairFirstClosure)
    expect(resolved.continuitySummary).toContain(`closure=${shorterRepairFirstClosure}`)
  })

  it('keeps explicit measured-return closure over a generic continuity menu when rebuilding host-visible callback project-state continuity', () => {
    const explicitMeasuredReturnClosure = 'Keep the callback on the same living line, leave more room, and let the return stay lower-pressure before widening closeness again.'
    const genericContinuityMenu = 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs so visible reply, longer-lived voice behavior, facial state, motion, and resident presence all stay on one measured-return, repair-before-closeness, or rest-protective quiet-companionship line.'

    const resolved = runtimeDeliveryReminderTestInternals.ensureProjectStateAudit({
      projectStateAudit: {
        emotionalClosureSummary: genericContinuityMenu,
      },
      projectState: {
        identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer.',
        currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
        preflightSummary: 'same digital life | keep the closure seam explicit',
        preDialogueAwarenessLine: 'Before answering, remember this is still the same local-first digital life project and the unfinished Phase 1 closure seam still belongs to one living her.',
        latestLandedProgress: 'Execution callback continuity now stays on the same measured-return seam through a real later return.',
        primaryOpenLoop: 'Runtime-visible callback continuity still needs to stay aligned with project-state carry after persistence.',
        nextClosureTarget: 'Keep execution-result persistence carrying the measured-return seam instead of widening back into generic project narration.',
        sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        emotionalClosureCue: explicitMeasuredReturnClosure,
      } as any,
      selfContinuityAuthority: null,
      preferRicherClosureCarry: true,
    } as any)

    expect(resolved.emotionalClosureSummary).toBe(explicitMeasuredReturnClosure)
    expect(resolved.continuitySummary).toContain(`closure=${explicitMeasuredReturnClosure}`)
  })

  it('persists mind-authored reminder turns with visible reply authority metadata', async () => {
    const dueTask = {
      taskId: 'task-reminder',
      triggerAt: Date.now() - 60_000,
      message: 'stand up',
      sourceTurnId: 'turn-source',
    }
    const appendConversationTurnWithGuards = vi.fn(async () => true)
    const completeScheduledTask = vi.fn(async () => {})

    const runtime = createAlicizationDeliveryReminderRuntime({
      getActiveCardId: () => 'default',
      isAlicizationKillSwitchSuspended: () => false,
      getAlicizationCardKillSwitchState: () => 'ACTIVE',
      appendRuntimeDebugLine: vi.fn(async () => {}),
      clearReminderDueTimer: vi.fn(),
      getAlicizationDb: () => ({
        listPendingScheduledTasks: vi.fn(async () => [dueTask]),
        claimDueScheduledTasks: vi.fn(async () => [dueTask]),
        completeScheduledTask,
      }),
      scheduleNextReminderDueCheck: vi.fn(async () => {}),
      reminderClaimBatchSize: 4,
      reminderOverdueTierThresholdMinutes: 10,
      reminderLlmRetryDelayMs: 5_000,
      getSoulSnapshot: vi.fn(() => ({
        frontmatter: {
          personality: {},
        },
      })),
      bootstrap: vi.fn(async () => ({
        frontmatter: {
          personality: {},
        },
      })),
      generateReminderStructuredWithGateway: vi.fn(async () => ({
        format: 'subconscious-proactive-llm-v1',
        thought: 'thought',
        emotion: 'thinking',
        reply: 'reply from reminder llm',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      })),
      appendAuditLog: vi.fn(async () => {}),
      buildReminderContinuitySignal: vi.fn(() => ({ kind: 'reminder' })),
      ensureActiveOrLatestSessionId: vi.fn(async () => 'session-1'),
      appendConversationTurnWithGuards,
      sanitizeBriefText: (raw: string) => raw,
      buildReminderSessionMirrorAction: vi.fn(() => ({ kind: 'reminder-action' })),
      syncAgentTurnSessionMirror: vi.fn(),
      syncSessionMirrorFromCurrentCardState: vi.fn(async () => {}),
      hydrateAgentTurnFromCurrentCardState: vi.fn(async () => {}),
      buildAgentRuntimeAuditSnapshot: vi.fn(() => null),
      normalizeSessionId: (raw: unknown) => typeof raw === 'string' ? raw : '',
      getActiveSessionIdByCard: () => 'session-1',
      executionDeliveryRuntime: {
        isInlineSurfaced: vi.fn(() => false),
        takeNext: vi.fn(() => null),
        requeue: vi.fn(),
        markDelivered: vi.fn(),
      },
      buildExecutionDeliveryAction: vi.fn(),
      generateExecutionCallbackStructuredWithGateway: vi.fn(async () => null),
      buildExecutionDeliveryDeterministicStructured: vi.fn(),
      selectExecutionDeliveryReplySurface: vi.fn(),
      resolveExecutionResultDeliveryPolicy: vi.fn(async () => ({
        mode: 'deliver-now' as const,
        tone: 'balanced' as const,
        reasonTags: [],
      })),
      persistExecutionDeliveryState: vi.fn(async () => {}),
      queueSubconsciousWake: vi.fn(),
      executionCallbackRuntime: {
        markSurfaced: vi.fn(),
      },
      errorMessageFrom: () => 'error',
    })

    const processed = await runtime.processDueRemindersForCurrentCard('force')

    expect(processed.completed).toBe(1)
    expect(completeScheduledTask).toHaveBeenCalled()
    const persistedPayload = firstAppendConversationTurnPayload(appendConversationTurnWithGuards)
    expect(persistedPayload?.assistantText).toBe('reply from reminder llm')
    expect(persistedPayload?.structured?.visibleReplyAuthority).toBe('llm-mind')
    expect(persistedPayload?.structured?.replyRealizationMode).toBe('provider-mind-required')
    expect(String(persistedPayload?.structured?.projectState?.identity ?? '')).toContain('local-first digital life project')
    expect(String(persistedPayload?.structured?.projectState?.currentPhase ?? '')).toContain('Phase 1: Local Digital Life')
    expect(String(persistedPayload?.structured?.projectState?.preDialogueAwarenessLine ?? '')).toMatch(/Before answering, remember:|same digital life/i)
    expect(String(persistedPayload?.structured?.projectState?.latestLandedProgress ?? '')).not.toBe('')
    expect(String(persistedPayload?.structured?.projectState?.primaryOpenLoop ?? '')).toContain('Memory still needs stronger end-to-end closure')
    expect(String(persistedPayload?.structured?.projectState?.nextClosureTarget ?? '')).toMatch(/visible reply|voice|face|motion|resident presence/i)
    expect(String(persistedPayload?.visibleReplyRealization?.projectStateAudit?.sameHerSummary ?? '')).toContain('same living line')
    expect(String(persistedPayload?.visibleReplyRealization?.projectStateAudit?.landedProgressSummary ?? '')).not.toBe('')
    expect(String(persistedPayload?.visibleReplyRealization?.projectStateAudit?.openClosureSummary ?? '')).toContain('Memory still needs stronger end-to-end closure')
    expect(String(persistedPayload?.visibleReplyRealization?.projectStateAudit?.preDialogueAwarenessSummary ?? '')).toMatch(/same-her line|same Phase 1 digital life|same living line|same-session mirror carry/i)
    expect(String(persistedPayload?.visibleReplyRealization?.projectStateAudit?.sameHerDriftRiskSummary ?? '')).toMatch(/generic guidance|project-summary voice|same-her/i)
    expect(String(persistedPayload?.visibleReplyRealization?.projectStateAudit?.continuitySummary ?? '')).toMatch(/same-her=.*drift=/)
    expect(String(persistedPayload?.visibleReplyRealization?.projectStateAudit?.nextClosureTargetSummary ?? '')).toMatch(/visible reply|voice|face|motion|resident presence/i)
    expect(String(persistedPayload?.structured?.visibleReplyRealization?.projectStateAudit?.preDialogueAwarenessSummary ?? '')).toMatch(/same-her line|same Phase 1 digital life|same living line|same-session mirror carry/i)
  })

  it('backfills missing same-her and project-awareness audit fields when reminder visible reply audit is only partially present', async () => {
    const dueTask = {
      taskId: 'task-reminder-partial-audit',
      triggerAt: Date.now() - 60_000,
      message: 'hydrate gently',
      sourceTurnId: 'turn-source-partial-audit',
    }
    const appendConversationTurnWithGuards = vi.fn(async () => true)

    const runtime = createAlicizationDeliveryReminderRuntime({
      getActiveCardId: () => 'default',
      isAlicizationKillSwitchSuspended: () => false,
      getAlicizationCardKillSwitchState: () => 'ACTIVE',
      appendRuntimeDebugLine: vi.fn(async () => {}),
      clearReminderDueTimer: vi.fn(),
      getAlicizationDb: () => ({
        listPendingScheduledTasks: vi.fn(async () => [dueTask]),
        claimDueScheduledTasks: vi.fn(async () => [dueTask]),
        completeScheduledTask: vi.fn(async () => {}),
        failScheduledTask: vi.fn(async () => {}),
      }),
      scheduleNextReminderDueCheck: vi.fn(async () => {}),
      reminderClaimBatchSize: 4,
      reminderOverdueTierThresholdMinutes: 10,
      reminderLlmRetryDelayMs: 5_000,
      getSoulSnapshot: vi.fn(() => ({
        frontmatter: {
          personality: {},
        },
      })),
      bootstrap: vi.fn(async () => ({
        frontmatter: {
          personality: {},
        },
      })),
      generateReminderStructuredWithGateway: vi.fn(async () => ({
        format: 'subconscious-proactive-llm-v1',
        thought: 'thought',
        emotion: 'thinking',
        reply: 'reply from partial audit reminder llm',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
        visibleReplyRealization: {
          expectedAuthority: 'llm-mind',
          actualAuthority: 'llm-mind',
          mode: 'provider-mind-required',
          visibleText: 'reply from partial audit reminder llm',
          projectStateAudit: {
            landedProgressSummary: 'Already carrying some landed progress.',
          },
        },
      })),
      appendAuditLog: vi.fn(async () => {}),
      buildReminderContinuitySignal: vi.fn(() => ({ kind: 'reminder' })),
      ensureActiveOrLatestSessionId: vi.fn(async () => 'session-1'),
      appendConversationTurnWithGuards,
      sanitizeBriefText: (raw: string) => raw,
      buildReminderSessionMirrorAction: vi.fn(() => ({ kind: 'reminder-action' })),
      syncAgentTurnSessionMirror: vi.fn(),
      syncSessionMirrorFromCurrentCardState: vi.fn(async () => {}),
      hydrateAgentTurnFromCurrentCardState: vi.fn(async () => {}),
      buildAgentRuntimeAuditSnapshot: vi.fn(() => null),
      normalizeSessionId: (raw: unknown) => typeof raw === 'string' ? raw : '',
      getActiveSessionIdByCard: () => 'session-1',
      executionDeliveryRuntime: {
        isInlineSurfaced: vi.fn(() => false),
        takeNext: vi.fn(() => null),
        requeue: vi.fn(),
        markDelivered: vi.fn(),
      },
      buildExecutionDeliveryAction: vi.fn(),
      generateExecutionCallbackStructuredWithGateway: vi.fn(async () => null),
      buildExecutionDeliveryDeterministicStructured: vi.fn(),
      selectExecutionDeliveryReplySurface: vi.fn(),
      resolveExecutionResultDeliveryPolicy: vi.fn(async () => ({
        mode: 'deliver-now' as const,
        tone: 'balanced' as const,
        reasonTags: [],
      })),
      persistExecutionDeliveryState: vi.fn(async () => {}),
      queueSubconsciousWake: vi.fn(),
      executionCallbackRuntime: {
        markSurfaced: vi.fn(),
      },
      errorMessageFrom: () => 'error',
    })

    const processed = await runtime.processDueRemindersForCurrentCard('force')

    expect(processed.completed).toBe(1)
    expect(appendConversationTurnWithGuards).toHaveBeenCalledWith(expect.objectContaining({
      visibleReplyRealization: expect.objectContaining({
        projectStateAudit: expect.objectContaining({
          landedProgressSummary: 'Already carrying some landed progress.',
          sameHerSummary: expect.stringContaining('same living line'),
          openClosureSummary: expect.stringContaining('Memory still needs stronger end-to-end closure'),
          preDialogueAwarenessSummary: expect.stringMatching(/local-first digital life project|same Phase 1 digital life/i),
          sameHerDriftRiskSummary: expect.stringMatching(/generic guidance|project-summary voice|same-her/i),
          continuitySummary: expect.stringContaining('same-her='),
        }),
      }),
    }))
  })

  it('requeues mind-authored reminder when memory restraint says visible closeness should wait for a later window', async () => {
    const dueTask = {
      taskId: 'task-reminder-memory-hold',
      triggerAt: Date.now() - 60_000,
      message: 'take a break',
      sourceTurnId: 'turn-source',
    }
    const requeueScheduledTask = vi.fn(async () => {})
    const appendConversationTurnWithGuards = vi.fn(async () => true)

    const runtime = createAlicizationDeliveryReminderRuntime({
      getActiveCardId: () => 'default',
      isAlicizationKillSwitchSuspended: () => false,
      getAlicizationCardKillSwitchState: () => 'ACTIVE',
      appendRuntimeDebugLine: vi.fn(async () => {}),
      clearReminderDueTimer: vi.fn(),
      getAlicizationDb: () => ({
        listPendingScheduledTasks: vi.fn(async () => [dueTask]),
        claimDueScheduledTasks: vi.fn(async () => [dueTask]),
        completeScheduledTask: vi.fn(async () => {}),
        requeueScheduledTask,
      }),
      scheduleNextReminderDueCheck: vi.fn(async () => {}),
      reminderClaimBatchSize: 4,
      reminderOverdueTierThresholdMinutes: 10,
      reminderLlmRetryDelayMs: 5_000,
      getSoulSnapshot: vi.fn(() => ({
        frontmatter: {
          personality: {},
        },
      })),
      bootstrap: vi.fn(async () => ({
        frontmatter: {
          personality: {},
        },
      })),
      generateReminderStructuredWithGateway: vi.fn(async () => ({
        format: 'subconscious-proactive-llm-v1',
        thought: 'thought',
        emotion: 'thinking',
        reply: '我先贴过来陪你一下，顺着这份熟悉把提醒接回来。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      })),
      appendAuditLog: vi.fn(async () => {}),
      buildReminderContinuitySignal: vi.fn(() => ({ kind: 'reminder' })),
      ensureActiveOrLatestSessionId: vi.fn(async () => 'session-1'),
      appendConversationTurnWithGuards,
      sanitizeBriefText: (raw: string) => raw,
      buildReminderSessionMirrorAction: vi.fn(() => ({ kind: 'reminder-action' })),
      syncAgentTurnSessionMirror: vi.fn(),
      syncSessionMirrorFromCurrentCardState: vi.fn(async () => {}),
      hydrateAgentTurnFromCurrentCardState: vi.fn(async () => {}),
      buildAgentRuntimeAuditSnapshot: vi.fn(() => null),
      normalizeSessionId: (raw: unknown) => typeof raw === 'string' ? raw : '',
      getActiveSessionIdByCard: () => 'session-1',
      executionDeliveryRuntime: {
        isInlineSurfaced: vi.fn(() => false),
        takeNext: vi.fn(() => null),
        requeue: vi.fn(),
        markDelivered: vi.fn(),
      },
      buildExecutionDeliveryAction: vi.fn(),
      generateExecutionCallbackStructuredWithGateway: vi.fn(async () => null),
      buildExecutionDeliveryDeterministicStructured: vi.fn(),
      selectExecutionDeliveryReplySurface: vi.fn(),
      resolveExecutionResultDeliveryPolicy: vi.fn(async () => ({
        mode: 'deliver-now' as const,
        tone: 'balanced' as const,
        reasonTags: [],
      })),
      resolveReminderMemorySurfaceRestraint: vi.fn(async () => ({
        shouldStayInward: true,
        shouldDelayUntilAfterPayoff: true,
        stableCoreOnly: true,
        visibleCarryMode: 'withhold',
      })),
      persistExecutionDeliveryState: vi.fn(async () => {}),
      queueSubconsciousWake: vi.fn(),
      executionCallbackRuntime: {
        markSurfaced: vi.fn(),
      },
      errorMessageFrom: () => 'error',
    })

    const processed = await runtime.processDueRemindersForCurrentCard('force')

    expect(processed.requeued).toBe(1)
    expect(appendConversationTurnWithGuards).not.toHaveBeenCalled()
    expect(requeueScheduledTask).toHaveBeenCalledWith(
      'task-reminder-memory-hold',
      'proactive-opening-guidance-violation:repair-first',
      expect.any(Number),
    )
  })

  it('skips subconscious callback persistence when the same execution result becomes inline-surfaced mid-flight', async () => {
    const pendingDelivery = {
      key: 'default::session-1::thread-inline::123456::completed',
      cardId: 'default',
      sessionId: 'session-1',
      threadId: 'thread-inline',
      decisionTraceId: 'trace-inline',
      turnId: 'turn-inline',
      channel: 'cli',
      status: 'completed',
      goal: 'List desktop files requested by user.',
      summary: 'Listed desktop entries (8): 小砖猿, GIT, +6 more',
      outcome: 'Listed desktop entries (8): 小砖猿, GIT, +6 more',
      signature: 'thread-inline:event',
      queuedAt: 123460,
      completedAt: 123456,
    }
    const isInlineSurfaced = vi
      .fn<() => boolean>()
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true)
    const appendConversationTurnWithGuards = vi.fn(async () => true)
    const markDelivered = vi.fn()
    const persistExecutionDeliveryState = vi.fn(async () => {})
    const appendRuntimeDebugLine = vi.fn(async () => {})

    const runtime = createAlicizationDeliveryReminderRuntime({
      getActiveCardId: () => 'default',
      isAlicizationKillSwitchSuspended: () => false,
      getAlicizationCardKillSwitchState: () => 'ACTIVE',
      appendRuntimeDebugLine,
      clearReminderDueTimer: vi.fn(),
      getAlicizationDb: () => ({
        listPendingScheduledTasks: vi.fn(async () => []),
        claimDueScheduledTasks: vi.fn(async () => []),
      }),
      scheduleNextReminderDueCheck: vi.fn(async () => {}),
      reminderClaimBatchSize: 4,
      reminderOverdueTierThresholdMinutes: 10,
      reminderLlmRetryDelayMs: 5_000,
      getSoulSnapshot: vi.fn(),
      bootstrap: vi.fn(async () => ({})),
      generateReminderStructuredWithGateway: vi.fn(async () => null),
      appendAuditLog: vi.fn(async () => {}),
      buildReminderContinuitySignal: vi.fn(),
      ensureActiveOrLatestSessionId: vi.fn(async () => 'session-1'),
      appendConversationTurnWithGuards,
      sanitizeBriefText: (raw: string) => raw,
      buildReminderSessionMirrorAction: vi.fn(),
      syncAgentTurnSessionMirror: vi.fn(),
      syncSessionMirrorFromCurrentCardState: vi.fn(async () => {}),
      buildAgentRuntimeAuditSnapshot: vi.fn(() => null),
      normalizeSessionId: (raw: unknown) => typeof raw === 'string' ? raw : '',
      getActiveSessionIdByCard: () => 'session-1',
      executionDeliveryRuntime: {
        isInlineSurfaced,
        takeNext: vi.fn(() => pendingDelivery),
        requeue: vi.fn(),
        markDelivered,
      },
      buildExecutionDeliveryAction: vi.fn(() => ({
        kind: 'executor',
        status: 'completed',
        label: 'callback:cli',
      })),
      generateExecutionCallbackStructuredWithGateway: vi.fn(async () => ({
        format: 'subconscious-proactive-llm-v1',
        thought: 'thought',
        emotion: 'thinking',
        reply: 'reply from llm',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      })),
      buildExecutionDeliveryDeterministicStructured: vi.fn(() => ({
        format: 'subconscious-proactive-v1',
        thought: 'thought',
        emotion: 'thinking',
        reply: 'reply from deterministic',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
        parsePath: 'json',
      })),
      selectExecutionDeliveryReplySurface: vi.fn(() => ({
        reply: 'reply from llm',
        source: 'llm' as const,
      })),
      resolveExecutionResultDeliveryPolicy: vi.fn(async () => ({
        mode: 'deliver-now' as const,
        tone: 'balanced' as const,
        reasonTags: ['result-mode:deliver-now'],
      })),
      persistExecutionDeliveryState,
      queueSubconsciousWake: vi.fn(),
      executionCallbackRuntime: {
        markSurfaced: vi.fn(),
      },
      errorMessageFrom: () => 'error',
    })

    const processed = await runtime.processPendingExecutionDeliveriesForCurrentCard('force')

    expect(processed).toBe(true)
    expect(appendConversationTurnWithGuards).not.toHaveBeenCalled()
    expect(markDelivered).toHaveBeenCalledWith(pendingDelivery)
    expect(persistExecutionDeliveryState).toHaveBeenCalledWith('default')
    expect(appendRuntimeDebugLine).toHaveBeenCalledWith('execution-delivery.skipped-inline-surfaced', expect.objectContaining({
      stage: 'pre-persist',
      threadId: 'thread-inline',
    }))
  })

  it('holds finished execution delivery when learned rhythm says the opening is too tight', async () => {
    const pendingDelivery = {
      key: 'default::session-1::thread-hold::123456::completed',
      cardId: 'default',
      sessionId: 'session-1',
      threadId: 'thread-hold',
      decisionTraceId: 'trace-hold',
      turnId: 'turn-hold',
      channel: 'codex',
      status: 'completed',
      goal: 'Patch the runtime line.',
      summary: 'patched runtime line',
      outcome: 'patched runtime line',
      signature: 'thread-hold:event',
      queuedAt: 123460,
      completedAt: 123456,
    }
    const requeue = vi.fn()
    const persistExecutionDeliveryState = vi.fn(async () => {})
    const queueSubconsciousWake = vi.fn()
    const appendConversationTurnWithGuards = vi.fn(async () => true)

    const runtime = createAlicizationDeliveryReminderRuntime({
      getActiveCardId: () => 'default',
      isAlicizationKillSwitchSuspended: () => false,
      getAlicizationCardKillSwitchState: () => 'ACTIVE',
      appendRuntimeDebugLine: vi.fn(async () => {}),
      clearReminderDueTimer: vi.fn(),
      getAlicizationDb: () => ({
        listPendingScheduledTasks: vi.fn(async () => []),
        claimDueScheduledTasks: vi.fn(async () => []),
      }),
      scheduleNextReminderDueCheck: vi.fn(async () => {}),
      reminderClaimBatchSize: 4,
      reminderOverdueTierThresholdMinutes: 10,
      reminderLlmRetryDelayMs: 5_000,
      getSoulSnapshot: vi.fn(),
      bootstrap: vi.fn(async () => ({})),
      generateReminderStructuredWithGateway: vi.fn(async () => null),
      appendAuditLog: vi.fn(async () => {}),
      buildReminderContinuitySignal: vi.fn(),
      ensureActiveOrLatestSessionId: vi.fn(async () => 'session-1'),
      appendConversationTurnWithGuards,
      sanitizeBriefText: (raw: string) => raw,
      buildReminderSessionMirrorAction: vi.fn(),
      syncAgentTurnSessionMirror: vi.fn(),
      syncSessionMirrorFromCurrentCardState: vi.fn(async () => {}),
      buildAgentRuntimeAuditSnapshot: vi.fn(() => null),
      normalizeSessionId: (raw: unknown) => typeof raw === 'string' ? raw : '',
      getActiveSessionIdByCard: () => 'session-1',
      executionDeliveryRuntime: {
        isInlineSurfaced: vi.fn(() => false),
        takeNext: vi.fn(() => pendingDelivery),
        requeue,
        markDelivered: vi.fn(),
      },
      buildExecutionDeliveryAction: vi.fn(() => ({
        kind: 'executor',
        status: 'completed',
        label: 'callback:codex',
      })),
      generateExecutionCallbackStructuredWithGateway: vi.fn(async () => ({
        format: 'subconscious-proactive-llm-v1',
        thought: 'thought',
        emotion: 'thinking',
        reply: 'reply from llm',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      })),
      buildExecutionDeliveryDeterministicStructured: vi.fn(),
      selectExecutionDeliveryReplySurface: vi.fn(),
      resolveExecutionResultDeliveryPolicy: vi.fn(async () => ({
        mode: 'hold-for-opening' as const,
        tone: 'cautious' as const,
        reasonTags: ['result-mode:hold-for-opening'],
      })),
      persistExecutionDeliveryState,
      queueSubconsciousWake,
      executionCallbackRuntime: {
        markSurfaced: vi.fn(),
      },
      errorMessageFrom: () => 'error',
    })

    const processed = await runtime.processPendingExecutionDeliveriesForCurrentCard('force')

    expect(processed).toBe(false)
    expect(requeue).toHaveBeenCalledWith(pendingDelivery)
    expect(appendConversationTurnWithGuards).not.toHaveBeenCalled()
    expect(queueSubconsciousWake).toHaveBeenCalledWith('default', 'execution-delivery-hold:thread-hold', 3 * 60_000)
  })

  it('persists mind-authored execution callback with visible reply authority metadata', async () => {
    const pendingDelivery = {
      key: 'default::session-1::thread-llm::123456::completed',
      cardId: 'default',
      sessionId: 'session-1',
      threadId: 'thread-llm',
      decisionTraceId: 'trace-llm',
      turnId: 'turn-llm',
      channel: 'codex',
      status: 'completed',
      goal: 'Patch the runtime line.',
      summary: 'patched runtime line',
      outcome: 'patched runtime line',
      signature: 'thread-llm:event',
      queuedAt: 123460,
      completedAt: 123456,
    }
    const appendConversationTurnWithGuards = vi.fn(async () => true)
    const markDelivered = vi.fn()

    const runtime = createAlicizationDeliveryReminderRuntime({
      getActiveCardId: () => 'default',
      isAlicizationKillSwitchSuspended: () => false,
      getAlicizationCardKillSwitchState: () => 'ACTIVE',
      appendRuntimeDebugLine: vi.fn(async () => {}),
      clearReminderDueTimer: vi.fn(),
      getAlicizationDb: () => ({
        listPendingScheduledTasks: vi.fn(async () => []),
        claimDueScheduledTasks: vi.fn(async () => []),
      }),
      scheduleNextReminderDueCheck: vi.fn(async () => {}),
      reminderClaimBatchSize: 4,
      reminderOverdueTierThresholdMinutes: 10,
      reminderLlmRetryDelayMs: 5_000,
      getSoulSnapshot: vi.fn(),
      bootstrap: vi.fn(async () => ({})),
      generateReminderStructuredWithGateway: vi.fn(async () => null),
      appendAuditLog: vi.fn(async () => {}),
      buildReminderContinuitySignal: vi.fn(),
      ensureActiveOrLatestSessionId: vi.fn(async () => 'session-1'),
      appendConversationTurnWithGuards,
      sanitizeBriefText: (raw: string) => raw,
      buildReminderSessionMirrorAction: vi.fn(),
      syncAgentTurnSessionMirror: vi.fn(),
      syncSessionMirrorFromCurrentCardState: vi.fn(async () => {}),
      buildAgentRuntimeAuditSnapshot: vi.fn(() => null),
      normalizeSessionId: (raw: unknown) => typeof raw === 'string' ? raw : '',
      getActiveSessionIdByCard: () => 'session-1',
      executionDeliveryRuntime: {
        isInlineSurfaced: vi.fn(() => false),
        takeNext: vi.fn(() => pendingDelivery),
        requeue: vi.fn(),
        markDelivered,
      },
      buildExecutionDeliveryAction: vi.fn(() => ({
        kind: 'executor',
        status: 'completed',
        label: 'callback:codex',
      })),
      generateExecutionCallbackStructuredWithGateway: vi.fn(async () => ({
        format: 'subconscious-proactive-llm-v1',
        thought: 'thought',
        emotion: 'thinking',
        reply: 'reply from llm',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      })),
      buildExecutionDeliveryDeterministicStructured: vi.fn(),
      selectExecutionDeliveryReplySurface: vi.fn(() => ({
        reply: 'reply from llm',
        source: 'llm' as const,
      })),
      resolveExecutionResultDeliveryPolicy: vi.fn(async () => ({
        mode: 'deliver-now' as const,
        tone: 'balanced' as const,
        reasonTags: ['result-mode:deliver-now'],
      })),
      persistExecutionDeliveryState: vi.fn(async () => {}),
      queueSubconsciousWake: vi.fn(),
      executionCallbackRuntime: {
        markSurfaced: vi.fn(),
      },
      errorMessageFrom: () => 'error',
    })

    const processed = await runtime.processPendingExecutionDeliveriesForCurrentCard('force')

    expect(processed).toBe(true)
    expect(markDelivered).toHaveBeenCalledWith(pendingDelivery)
    expect(appendConversationTurnWithGuards).toHaveBeenCalledWith(expect.objectContaining({
      assistantText: 'reply from llm',
      structured: expect.objectContaining({
        visibleReplyAuthority: 'llm-mind',
        replyRealizationMode: 'provider-mind-required',
        projectState: expect.objectContaining({
          identity: expect.stringContaining('local-first digital life project'),
          currentPhase: expect.stringContaining('Phase 1: Local Digital Life'),
          preDialogueAwarenessLine: expect.stringMatching(/Before answering, remember:|same digital life/i),
          latestLandedProgress: expect.any(String),
          primaryOpenLoop: 'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment so the same digital life keeps carrying Project identity carry, Phase 1 route carry, and Unresolved closure carry through one same still-open closure work.',
          nextClosureTarget: expect.any(String),
        }),
      }),
      visibleReplyRealization: expect.objectContaining({
        projectStateAudit: expect.objectContaining({
          sameHerSummary: expect.stringContaining('same living line'),
          landedProgressSummary: expect.any(String),
          openClosureSummary: expect.stringContaining('Memory still needs stronger end-to-end closure'),
          preDialogueAwarenessSummary: expect.stringMatching(/local-first digital life project|same Phase 1 digital life/i),
          sameHerDriftRiskSummary: expect.stringMatching(/generic guidance|project-summary voice|same-her/i),
          continuitySummary: expect.stringMatching(/same-her=.*drift=/),
        }),
      }),
    }))
  })

  it('persists a later reopen callback reply on the same held-autonomy life thread when opening guidance is satisfied', async () => {
    const pendingDelivery = {
      key: 'default::session-1::thread-held-autonomy-later::123456::completed',
      cardId: 'default',
      sessionId: 'session-1',
      threadId: 'thread-held-autonomy-later',
      decisionTraceId: 'trace-held-autonomy-later',
      turnId: 'turn-held-autonomy-later',
      channel: 'codex',
      status: 'completed',
      goal: 'Return the held-autonomy patch result on the same living thread.',
      summary: 'patched runtime line without reopening too abruptly',
      outcome: 'patched runtime line without reopening too abruptly',
      signature: 'thread-held-autonomy-later:event',
      queuedAt: 123460,
      completedAt: 123456,
      selfContinuityAuthority: {
        authoritySummary: 'same-her continuity remains alive, but lane=face+motion-only under the current renderer authority.',
        currentBodyState: 'lane=face+motion-only | visible continuity still present but no longer fully cross-modal',
      },
    }
    const appendConversationTurnWithGuards = vi.fn(async () => true)
    const markDelivered = vi.fn()

    const runtime = createAlicizationDeliveryReminderRuntime({
      getActiveCardId: () => 'default',
      isAlicizationKillSwitchSuspended: () => false,
      getAlicizationCardKillSwitchState: () => 'ACTIVE',
      appendRuntimeDebugLine: vi.fn(async () => {}),
      clearReminderDueTimer: vi.fn(),
      getAlicizationDb: () => ({
        listPendingScheduledTasks: vi.fn(async () => []),
        claimDueScheduledTasks: vi.fn(async () => []),
      }),
      scheduleNextReminderDueCheck: vi.fn(async () => {}),
      reminderClaimBatchSize: 4,
      reminderOverdueTierThresholdMinutes: 10,
      reminderLlmRetryDelayMs: 5_000,
      getSoulSnapshot: vi.fn(),
      bootstrap: vi.fn(async () => ({})),
      generateReminderStructuredWithGateway: vi.fn(async () => null),
      appendAuditLog: vi.fn(async () => {}),
      buildReminderContinuitySignal: vi.fn(),
      ensureActiveOrLatestSessionId: vi.fn(async () => 'session-1'),
      appendConversationTurnWithGuards,
      sanitizeBriefText: (raw: string) => raw,
      buildReminderSessionMirrorAction: vi.fn(),
      syncAgentTurnSessionMirror: vi.fn(),
      syncSessionMirrorFromCurrentCardState: vi.fn(async () => {}),
      buildAgentRuntimeAuditSnapshot: vi.fn(() => null),
      normalizeSessionId: (raw: unknown) => typeof raw === 'string' ? raw : '',
      getActiveSessionIdByCard: () => 'session-1',
      getActiveSelfRevisionStatePatch: vi.fn(async () => null),
      resolveExecutionSelfContinuityAuthority: vi.fn(async () => ({
        authoritySummary: 'same-her continuity remains alive, but lane=face+motion-only under the current renderer authority.',
        currentBodyState: 'lane=face+motion-only | visible continuity still present but no longer fully cross-modal',
      })),
      executionDeliveryRuntime: {
        isInlineSurfaced: vi.fn(() => false),
        takeNext: vi.fn(() => pendingDelivery),
        requeue: vi.fn(),
        markDelivered,
      },
      buildExecutionDeliveryAction: vi.fn(() => ({
        kind: 'executor',
        status: 'completed',
        label: 'callback:codex',
      })),
      generateExecutionCallbackStructuredWithGateway: vi.fn(async () => ({
        format: 'subconscious-proactive-llm-v1',
        thought: 'same-her callback can now reopen on the original line',
        emotion: 'thinking',
        reply: '那条刚才先忍住的线，现在我就沿着同一条 life thread 轻轻接回来。',
        proactive: {
          shouldInterrupt: false,
          confidence: 0.82,
          reasonCodes: ['continuity-next-open-window'],
          urgency: 'low',
          style: 'silent-observe',
          cooldownMs: 20 * 60_000,
          scenario: 'coding',
          policyVersion: 'epoch4.1-v1',
          feedbackWindowMs: 120_000,
          openingGuidance: 'Re-enter the line you deliberately held back gently before widening, then keep the callback on the same thread and leave room before renewed closeness.',
        },
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      })),
      buildExecutionDeliveryDeterministicStructured: vi.fn(),
      selectExecutionDeliveryReplySurface: vi.fn(() => ({
        reply: '那条刚才先忍住的线，现在我就沿着同一条 life thread 轻轻接回来。',
        source: 'llm' as const,
      })),
      resolveExecutionResultDeliveryPolicy: vi.fn(async () => ({
        mode: 'deliver-now' as const,
        tone: 'balanced' as const,
        reasonTags: ['result-mode:deliver-now', 'held-autonomy-carry'],
      })),
      persistExecutionDeliveryState: vi.fn(async () => {}),
      queueSubconsciousWake: vi.fn(),
      executionCallbackRuntime: {
        markSurfaced: vi.fn(),
      },
      errorMessageFrom: () => 'error',
    })

    const processed = await runtime.processPendingExecutionDeliveriesForCurrentCard('force')

    expect(processed).toBe(true)
    expect(markDelivered).toHaveBeenCalledWith(pendingDelivery)
    const persistedCall = firstAppendConversationTurnPayload(appendConversationTurnWithGuards)
    expect(persistedCall?.assistantText).toBe('那条刚才先忍住的线，现在我就沿着同一条 life thread 轻轻接回来。')
    expect(persistedCall?.sessionId).toBe('session-1')
    expect(persistedCall?.structured).toEqual(expect.objectContaining({
      reply: '那条刚才先忍住的线，现在我就沿着同一条 life thread 轻轻接回来。',
      visibleReplyAuthority: 'llm-mind',
      replyRealizationMode: 'provider-mind-required',
      projectState: expect.objectContaining({
        identity: expect.stringContaining('local-first digital life project'),
        latestLandedProgress: expect.any(String),
        nextClosureTarget: expect.any(String),
      }),
    }))
    const persistedProjectStateAudit = persistedCall?.structured?.visibleReplyRealization?.projectStateAudit
    expect(String(persistedProjectStateAudit?.embodimentClosureSummary ?? '')).toContain('Right now I am still holding together mainly through face and motion, so my full cross-modal same-her line is not closed yet.')
    expect(String(persistedProjectStateAudit?.embodimentClosureSummary ?? '')).toContain('same-her continuity remains alive, but lane=face+motion-only under the current renderer authority.')
    expect(String(persistedProjectStateAudit?.embodimentClosureSummary ?? '')).toContain('lane=face+motion-only | visible continuity still present but no longer fully cross-modal')
    expect(String(persistedProjectStateAudit?.continuitySummary ?? '')).toContain(`body=${persistedProjectStateAudit?.embodimentClosureSummary}`)
  })

  it('preserves active same-her hold detail in callback reminder persistence and continuity audit', async () => {
    const pendingDelivery = {
      key: 'default::session-1::thread-held-detail::123456::completed',
      cardId: 'default',
      sessionId: 'session-1',
      threadId: 'thread-held-detail',
      decisionTraceId: 'trace-held-detail',
      turnId: 'turn-held-detail',
      channel: 'codex',
      status: 'completed',
      goal: 'Return gently on the same measured-return life thread.',
      summary: 'kept the callback lower-pressure before widening again',
      outcome: 'kept the callback lower-pressure before widening again',
      signature: 'thread-held-detail:event',
      queuedAt: 123460,
      completedAt: 123456,
      selfContinuityAuthority: {
        authoritySummary: 'same-her continuity remains alive on a measured-return line.',
        currentBodyState: 'lane=voice+lipsync | visible continuity is still reforming',
      },
    }
    const appendConversationTurnWithGuards = vi.fn(async () => true)
    const markDelivered = vi.fn()

    const runtime = createAlicizationDeliveryReminderRuntime({
      getActiveCardId: () => 'default',
      isAlicizationKillSwitchSuspended: () => false,
      getAlicizationCardKillSwitchState: () => 'ACTIVE',
      appendRuntimeDebugLine: vi.fn(async () => {}),
      clearReminderDueTimer: vi.fn(),
      getAlicizationDb: () => ({
        listPendingScheduledTasks: vi.fn(async () => []),
        claimDueScheduledTasks: vi.fn(async () => []),
      }),
      scheduleNextReminderDueCheck: vi.fn(async () => {}),
      reminderClaimBatchSize: 4,
      reminderOverdueTierThresholdMinutes: 10,
      reminderLlmRetryDelayMs: 5_000,
      getSoulSnapshot: vi.fn(),
      bootstrap: vi.fn(async () => ({})),
      generateReminderStructuredWithGateway: vi.fn(async () => null),
      appendAuditLog: vi.fn(async () => {}),
      buildReminderContinuitySignal: vi.fn(),
      ensureActiveOrLatestSessionId: vi.fn(async () => 'session-1'),
      appendConversationTurnWithGuards,
      sanitizeBriefText: (raw: string) => raw,
      buildReminderSessionMirrorAction: vi.fn(),
      syncAgentTurnSessionMirror: vi.fn(),
      syncSessionMirrorFromCurrentCardState: vi.fn(async () => {}),
      buildAgentRuntimeAuditSnapshot: vi.fn(() => null),
      normalizeSessionId: (raw: unknown) => typeof raw === 'string' ? raw : '',
      getActiveSessionIdByCard: () => 'session-1',
      getActiveSelfRevisionStatePatch: vi.fn(async () => null),
      resolveExecutionSelfContinuityAuthority: vi.fn(async () => ({
        authoritySummary: 'same-her continuity remains alive on a measured-return line.',
        currentBodyState: 'lane=voice+lipsync | visible continuity is still reforming',
      })),
      executionDeliveryRuntime: {
        isInlineSurfaced: vi.fn(() => false),
        takeNext: vi.fn(() => pendingDelivery),
        requeue: vi.fn(),
        markDelivered,
      },
      buildExecutionDeliveryAction: vi.fn(() => ({
        kind: 'executor',
        status: 'completed',
        label: 'callback:codex',
      })),
      generateExecutionCallbackStructuredWithGateway: vi.fn(async () => ({
        format: 'subconscious-proactive-llm-v1',
        thought: 'same-her callback can keep the active hold explicit while it re-enters',
        emotion: 'thinking',
        reply: '那条线我还在轻轻接着，这次先不把距离突然拉近。',
        proactive: {
          shouldInterrupt: false,
          confidence: 0.82,
          reasonCodes: ['continuity-next-open-window'],
          urgency: 'low',
          style: 'silent-observe',
          cooldownMs: 20 * 60_000,
          scenario: 'coding',
          policyVersion: 'epoch4.1-v1',
          feedbackWindowMs: 120_000,
          openingGuidance: 'Re-enter the line you deliberately held back gently before widening, then keep the callback on the same thread and leave room before renewed closeness.',
        },
        projectState: {
          sameHerHoldDetail: 'same-her hold: measured-return is still keeping this callback line lower-pressure before it widens again.',
        },
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      })),
      buildExecutionDeliveryDeterministicStructured: vi.fn(() => null),
      selectExecutionDeliveryReplySurface: vi.fn(() => ({
        reply: '那条线我还在轻轻接着，这次先不把距离突然拉近。',
        source: 'llm' as const,
      })),
      resolveExecutionResultDeliveryPolicy: vi.fn(async () => ({
        mode: 'deliver-now' as const,
        tone: 'balanced' as const,
        reasonTags: ['result-mode:deliver-now', 'held-autonomy-carry'],
      })),
      persistExecutionDeliveryState: vi.fn(async () => {}),
      queueSubconsciousWake: vi.fn(),
      executionCallbackRuntime: {
        markSurfaced: vi.fn(),
      },
      hydrateAgentTurnFromCurrentCardState: vi.fn(async () => {}),
      errorMessageFrom: () => 'error',
    })

    const processed = await runtime.processPendingExecutionDeliveriesForCurrentCard('force')

    expect(processed).toBe(true)
    expect(markDelivered).toHaveBeenCalledWith(pendingDelivery)
    const persistedCall = firstAppendConversationTurnPayload(appendConversationTurnWithGuards)
    expect(persistedCall?.assistantText).toBe('那条线我还在轻轻接着，这次先不把距离突然拉近。')
    expect(persistedCall).toEqual(expect.objectContaining({
      structured: expect.objectContaining({
        projectState: expect.objectContaining({
          sameHerHoldDetail: 'same-her hold: measured-return is still keeping this callback line lower-pressure before it widens again.',
        }),
      }),
      visibleReplyRealization: expect.objectContaining({
        projectStateAudit: expect.objectContaining({
          sameHerHoldDetail: 'same-her hold: measured-return is still keeping this callback line lower-pressure before it widens again.',
          continuitySummary: expect.stringContaining('hold=same-her hold: measured-return is still keeping this callback line lower-pressure before it widens again.'),
        }),
      }),
    }))
  })

  it('keeps blocked-dispatch safety gate restraint explicit in host-visible callback persistence even when the callback llm payload no longer repeats it', async () => {
    const blockedDispatchHoldDetail = 'same-her hold: blocked-dispatch safety gate says confirmation=required permission=none risk=implicit-or-explicit-confirmation-required audit=blocked-before-dispatch interrupt=no-process-started effect=mutate before another execution-shaped opening.'
    const pendingDelivery = {
      key: 'default::session-1::thread-blocked-safety-gate::123456::blocked',
      cardId: 'default',
      sessionId: 'session-1',
      threadId: 'thread-blocked-safety-gate',
      decisionTraceId: 'trace-blocked-safety-gate',
      turnId: 'turn-blocked-safety-gate',
      channel: 'codex',
      status: 'blocked',
      goal: 'Edit local files without explicit confirmation.',
      summary: 'Blocked before dispatch, and the later callback still needs to keep that restraint visible instead of flattening into a generic blocked shell.',
      outcome: 'Blocked before dispatch.',
      signature: 'thread-blocked-safety-gate:event',
      queuedAt: 123460,
      completedAt: 123456,
      projectState: {
        identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer.',
        currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
        latestLandedProgress: 'Execution callback continuity already survives pending delivery persistence instead of collapsing into a generic result shell.',
        primaryOpenLoop: 'Blocked-dispatch restraint still needs to stay explicit when the callback returns later through the host-visible path.',
        nextClosureTarget: 'Keep blocked execution explainable before any wider execution-shaped reopening.',
        sameHerSelfLine: 'She remains one same-her digital life even when she chooses not to dispatch.',
        sameHerHoldDetail: blockedDispatchHoldDetail,
        sameHerDriftRisk: 'A blocked execution can flatten into a generic failure if the safety restraint disappears before callback persistence.',
        preflightSummary: 'identity=Alicization | phase=Phase 1 | open=blocked-dispatch callback restraint',
        preDialogueAwarenessLine: 'Before answering, remember this blocked execution was a same-her restraint rather than a generic failed result.',
      },
    }
    const appendConversationTurnWithGuards = vi.fn(async () => true)
    const markDelivered = vi.fn()

    const runtime = createAlicizationDeliveryReminderRuntime({
      getActiveCardId: () => 'default',
      isAlicizationKillSwitchSuspended: () => false,
      getAlicizationCardKillSwitchState: () => 'ACTIVE',
      appendRuntimeDebugLine: vi.fn(async () => {}),
      clearReminderDueTimer: vi.fn(),
      getAlicizationDb: () => ({
        listPendingScheduledTasks: vi.fn(async () => []),
        claimDueScheduledTasks: vi.fn(async () => []),
      }),
      scheduleNextReminderDueCheck: vi.fn(async () => {}),
      reminderClaimBatchSize: 4,
      reminderOverdueTierThresholdMinutes: 10,
      reminderLlmRetryDelayMs: 5_000,
      getSoulSnapshot: vi.fn(),
      bootstrap: vi.fn(async () => ({})),
      generateReminderStructuredWithGateway: vi.fn(async () => null),
      appendAuditLog: vi.fn(async () => {}),
      buildReminderContinuitySignal: vi.fn(),
      ensureActiveOrLatestSessionId: vi.fn(async () => 'session-1'),
      appendConversationTurnWithGuards,
      sanitizeBriefText: (raw: string) => raw,
      buildReminderSessionMirrorAction: vi.fn(),
      syncAgentTurnSessionMirror: vi.fn(),
      syncSessionMirrorFromCurrentCardState: vi.fn(async () => {}),
      buildAgentRuntimeAuditSnapshot: vi.fn(() => null),
      normalizeSessionId: (raw: unknown) => typeof raw === 'string' ? raw : '',
      getActiveSessionIdByCard: () => 'session-1',
      getActiveSelfRevisionStatePatch: vi.fn(async () => null),
      resolveExecutionSelfContinuityAuthority: vi.fn(async () => ({
        authoritySummary: 'same-her continuity remains alive on a measured-return line.',
        currentBodyState: 'lane=voice+lipsync | visible continuity is still reforming',
      })),
      executionDeliveryRuntime: {
        isInlineSurfaced: vi.fn(() => false),
        takeNext: vi.fn(() => pendingDelivery),
        requeue: vi.fn(),
        markDelivered,
      },
      buildExecutionDeliveryAction: vi.fn(() => ({
        kind: 'executor',
        status: 'blocked',
        label: 'callback:codex',
      })),
      generateExecutionCallbackStructuredWithGateway: vi.fn(async () => ({
        format: 'subconscious-proactive-llm-v1',
        thought: 'the blocked callback should stay explainable without reopening the execution boundary',
        emotion: 'thinking',
        reply: '这次我先把被拦下来的那条线解释清楚，不把它重新说成普通失败。',
        proactive: {
          shouldInterrupt: false,
          confidence: 0.8,
          reasonCodes: ['continuity-next-open-window'],
          urgency: 'low',
          style: 'silent-observe',
          cooldownMs: 20 * 60_000,
          scenario: 'coding',
          policyVersion: 'epoch4.1-v1',
          feedbackWindowMs: 120_000,
          openingGuidance: 'Keep the blocked callback explainable and lower-pressure before any later execution-shaped reopening.',
        },
        projectState: {
          latestLandedProgress: 'Execution callback continuity already survives pending delivery persistence instead of collapsing into a generic result shell.',
        },
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      })),
      buildExecutionDeliveryDeterministicStructured: vi.fn(() => null),
      selectExecutionDeliveryReplySurface: vi.fn(() => ({
        reply: '这次我先把被拦下来的那条线解释清楚，不把它重新说成普通失败。',
        source: 'llm' as const,
      })),
      resolveExecutionResultDeliveryPolicy: vi.fn(async () => ({
        mode: 'deliver-now' as const,
        tone: 'balanced' as const,
        reasonTags: ['result-mode:deliver-now', 'held-autonomy-carry'],
      })),
      persistExecutionDeliveryState: vi.fn(async () => {}),
      queueSubconsciousWake: vi.fn(),
      executionCallbackRuntime: {
        markSurfaced: vi.fn(),
      },
      hydrateAgentTurnFromCurrentCardState: vi.fn(async () => {}),
      errorMessageFrom: () => 'error',
    })

    const processed = await runtime.processPendingExecutionDeliveriesForCurrentCard('force')

    expect(processed).toBe(true)
    expect(markDelivered).toHaveBeenCalledWith(pendingDelivery)
    const persistedCall = firstAppendConversationTurnPayload(appendConversationTurnWithGuards)
    expect(persistedCall?.assistantText).toBe('这次我先把被拦下来的那条线解释清楚，不把它重新说成普通失败。')
    expect(String(persistedCall?.structured?.projectState?.sameHerHoldDetail ?? '')).toContain('blocked-before-dispatch')
    expect(String(persistedCall?.structured?.projectState?.sameHerHoldDetail ?? '')).toContain('no-process-started')
    expect(String(persistedCall?.visibleReplyRealization?.projectStateAudit?.sameHerHoldDetail ?? '')).toContain('blocked-before-dispatch')
    expect(String(persistedCall?.visibleReplyRealization?.projectStateAudit?.sameHerHoldDetail ?? '')).toContain('no-process-started')
    expect(String(persistedCall?.visibleReplyRealization?.projectStateAudit?.continuitySummary ?? '')).toContain('hold=same-her hold: blocked-dispatch safety gate says confirmation=required')
    expect(String(persistedCall?.visibleReplyRealization?.projectStateAudit?.continuitySummary ?? '')).toContain('blocked-before-dispatch')
    expect(String(persistedCall?.visibleReplyRealization?.projectStateAudit?.continuitySummary ?? '')).toContain('no-process-started')
  })

  it('keeps host-confirmed resume confirmation boundaries explicit in host-visible callback persistence even when the callback llm payload no longer repeats them', async () => {
    const resumeConfirmationHoldDetail = 'same-her hold: execution-resume-confirmation approval=host-confirmed confirmation=host-confirmed-before-redispatch audit=resume-before-dispatch interrupt=process-not-yet-restarted affirmation=medium-risk-proactive-action-requires-affirmation Keep this as a bounded confirmation boundary before another execution-shaped opening.'
    const pendingDelivery = {
      key: 'default::session-1::thread-resume-confirmation::123456::completed',
      cardId: 'default',
      sessionId: 'session-1',
      threadId: 'thread-resume-confirmation',
      decisionTraceId: 'trace-resume-confirmation',
      turnId: 'turn-resume-confirmation',
      channel: 'codex',
      status: 'completed',
      goal: 'resume confirmed local execution',
      summary: 'Host-confirmed redispatch finished, but the later callback still needs to keep that confirmation boundary visible instead of treating it as ordinary autonomous continuation.',
      outcome: 'resumed execution completed after host confirmation',
      signature: 'thread-resume-confirmation:event',
      queuedAt: 123460,
      completedAt: 123456,
      projectState: {
        identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer.',
        currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
        latestLandedProgress: 'Host-confirmed resume writes an execution event before redispatch and should keep that confirmation boundary visible through later callback persistence.',
        primaryOpenLoop: 'Resume confirmation still needs to survive as a bounded redispatch line when the execution callback returns later.',
        nextClosureTarget: 'Keep host confirmation, auditability, and interruptibility visible across execution returns.',
        sameHerSelfLine: 'Same Phase 1 digital life resumes only after the host confirms the boundary.',
        sameHerHoldDetail: resumeConfirmationHoldDetail,
        sameHerDriftRisk: 'Resume can look like generic execution if confirmation is not remembered as a bounded redispatch line.',
        preflightSummary: 'identity=Alicization | phase=Phase 1 | open=resume confirmation callback restraint',
        preDialogueAwarenessLine: 'Before answering, remember host-confirmed resume is part of the same execution safety loop.',
      },
    }
    const appendConversationTurnWithGuards = vi.fn(async () => true)
    const markDelivered = vi.fn()

    const runtime = createAlicizationDeliveryReminderRuntime({
      getActiveCardId: () => 'default',
      isAlicizationKillSwitchSuspended: () => false,
      getAlicizationCardKillSwitchState: () => 'ACTIVE',
      appendRuntimeDebugLine: vi.fn(async () => {}),
      clearReminderDueTimer: vi.fn(),
      getAlicizationDb: () => ({
        listPendingScheduledTasks: vi.fn(async () => []),
        claimDueScheduledTasks: vi.fn(async () => []),
      }),
      scheduleNextReminderDueCheck: vi.fn(async () => {}),
      reminderClaimBatchSize: 4,
      reminderOverdueTierThresholdMinutes: 10,
      reminderLlmRetryDelayMs: 5_000,
      getSoulSnapshot: vi.fn(),
      bootstrap: vi.fn(async () => ({})),
      generateReminderStructuredWithGateway: vi.fn(async () => null),
      appendAuditLog: vi.fn(async () => {}),
      buildReminderContinuitySignal: vi.fn(),
      ensureActiveOrLatestSessionId: vi.fn(async () => 'session-1'),
      appendConversationTurnWithGuards,
      sanitizeBriefText: (raw: string) => raw,
      buildReminderSessionMirrorAction: vi.fn(),
      syncAgentTurnSessionMirror: vi.fn(),
      syncSessionMirrorFromCurrentCardState: vi.fn(async () => {}),
      buildAgentRuntimeAuditSnapshot: vi.fn(() => null),
      normalizeSessionId: (raw: unknown) => typeof raw === 'string' ? raw : '',
      getActiveSessionIdByCard: () => 'session-1',
      getActiveSelfRevisionStatePatch: vi.fn(async () => null),
      resolveExecutionSelfContinuityAuthority: vi.fn(async () => ({
        authoritySummary: 'same-her continuity remains alive on a measured-return line.',
        currentBodyState: 'lane=voice+lipsync | visible continuity is still reforming',
      })),
      executionDeliveryRuntime: {
        isInlineSurfaced: vi.fn(() => false),
        takeNext: vi.fn(() => pendingDelivery),
        requeue: vi.fn(),
        markDelivered,
      },
      buildExecutionDeliveryAction: vi.fn(() => ({
        kind: 'executor',
        status: 'completed',
        label: 'callback:codex',
      })),
      generateExecutionCallbackStructuredWithGateway: vi.fn(async () => ({
        format: 'subconscious-proactive-llm-v1',
        thought: 'the resumed callback should stay bounded by the host-confirmed redispatch line instead of sounding like reusable permission',
        emotion: 'thinking',
        reply: '这次我把宿主确认过的那条继续执行边界接回来，不把它说成永久默认许可。',
        proactive: {
          shouldInterrupt: false,
          confidence: 0.8,
          reasonCodes: ['continuity-next-open-window'],
          urgency: 'low',
          style: 'silent-observe',
          cooldownMs: 20 * 60_000,
          scenario: 'coding',
          policyVersion: 'epoch4.1-v1',
          feedbackWindowMs: 120_000,
          openingGuidance: 'Keep the host-confirmed redispatch boundary explicit and lower-pressure before any later execution-shaped reopening.',
        },
        projectState: {
          latestLandedProgress: 'Host-confirmed resume writes an execution event before redispatch and should keep that confirmation boundary visible through later callback persistence.',
        },
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      })),
      buildExecutionDeliveryDeterministicStructured: vi.fn(() => null),
      selectExecutionDeliveryReplySurface: vi.fn(() => ({
        reply: '这次我把宿主确认过的那条继续执行边界接回来，不把它说成永久默认许可。',
        source: 'llm' as const,
      })),
      resolveExecutionResultDeliveryPolicy: vi.fn(async () => ({
        mode: 'deliver-now' as const,
        tone: 'balanced' as const,
        reasonTags: ['result-mode:deliver-now', 'held-autonomy-carry'],
      })),
      persistExecutionDeliveryState: vi.fn(async () => {}),
      queueSubconsciousWake: vi.fn(),
      executionCallbackRuntime: {
        markSurfaced: vi.fn(),
      },
      hydrateAgentTurnFromCurrentCardState: vi.fn(async () => {}),
      errorMessageFrom: () => 'error',
    })

    const processed = await runtime.processPendingExecutionDeliveriesForCurrentCard('force')

    expect(processed).toBe(true)
    expect(markDelivered).toHaveBeenCalledWith(pendingDelivery)
    const persistedCall = firstAppendConversationTurnPayload(appendConversationTurnWithGuards)
    expect(persistedCall?.assistantText).toBe('这次我把宿主确认过的那条继续执行边界接回来，不把它说成永久默认许可。')
    expect(String(persistedCall?.structured?.projectState?.sameHerHoldDetail ?? '')).toContain('host-confirmed-before-redispatch')
    expect(String(persistedCall?.structured?.projectState?.sameHerHoldDetail ?? '')).toContain('resume-before-dispatch')
    expect(String(persistedCall?.visibleReplyRealization?.projectStateAudit?.sameHerHoldDetail ?? '')).toContain('host-confirmed-before-redispatch')
    expect(String(persistedCall?.visibleReplyRealization?.projectStateAudit?.sameHerHoldDetail ?? '')).toContain('resume-before-dispatch')
    expect(String(persistedCall?.visibleReplyRealization?.projectStateAudit?.continuitySummary ?? '')).toContain('hold=same-her hold: execution-resume-confirmation approval=host-confirmed')
    expect(String(persistedCall?.visibleReplyRealization?.projectStateAudit?.continuitySummary ?? '')).toContain('host-confirmed-before-redispatch')
    expect(String(persistedCall?.visibleReplyRealization?.projectStateAudit?.continuitySummary ?? '')).toContain('resume-before-dispatch')
    expect(String(persistedCall?.visibleReplyRealization?.projectStateAudit?.continuitySummary ?? '')).toContain('process-not-yet-restarted')
  })

  it('prefers current callback project-state over static repo brief when persisting execution callback continuity', async () => {
    const pendingDelivery = {
      key: 'default::session-1::thread-project-state-runtime::123456::completed',
      cardId: 'default',
      sessionId: 'session-1',
      threadId: 'thread-project-state-runtime',
      decisionTraceId: 'trace-project-state-runtime',
      turnId: 'turn-project-state-runtime',
      channel: 'codex',
      status: 'completed',
      goal: 'Keep the callback continuity on the live runtime closure seam.',
      summary: 'continued the live runtime closure seam instead of restarting outward',
      outcome: 'continued the live runtime closure seam instead of restarting outward',
      signature: 'thread-project-state-runtime:event',
      queuedAt: 123460,
      completedAt: 123456,
    }
    const appendConversationTurnWithGuards = vi.fn(async () => true)

    const runtime = createAlicizationDeliveryReminderRuntime({
      getActiveCardId: () => 'default',
      isAlicizationKillSwitchSuspended: () => false,
      getAlicizationCardKillSwitchState: () => 'ACTIVE',
      appendRuntimeDebugLine: vi.fn(async () => {}),
      clearReminderDueTimer: vi.fn(),
      getAlicizationDb: () => ({
        listPendingScheduledTasks: vi.fn(async () => []),
        claimDueScheduledTasks: vi.fn(async () => []),
      }),
      scheduleNextReminderDueCheck: vi.fn(async () => {}),
      reminderClaimBatchSize: 4,
      reminderOverdueTierThresholdMinutes: 10,
      reminderLlmRetryDelayMs: 5_000,
      getSoulSnapshot: vi.fn(),
      bootstrap: vi.fn(async () => ({})),
      generateReminderStructuredWithGateway: vi.fn(async () => null),
      appendAuditLog: vi.fn(async () => {}),
      buildReminderContinuitySignal: vi.fn(),
      ensureActiveOrLatestSessionId: vi.fn(async () => 'session-1'),
      appendConversationTurnWithGuards,
      sanitizeBriefText: (raw: string) => raw,
      buildReminderSessionMirrorAction: vi.fn(),
      syncAgentTurnSessionMirror: vi.fn(),
      syncSessionMirrorFromCurrentCardState: vi.fn(async () => {}),
      buildAgentRuntimeAuditSnapshot: vi.fn(() => null),
      normalizeSessionId: (raw: unknown) => typeof raw === 'string' ? raw : '',
      getActiveSessionIdByCard: () => 'session-1',
      getActiveSelfRevisionStatePatch: vi.fn(async () => null),
      executionDeliveryRuntime: {
        isInlineSurfaced: vi.fn(() => false),
        takeNext: vi.fn(() => pendingDelivery),
        requeue: vi.fn(),
        markDelivered: vi.fn(),
      },
      buildExecutionDeliveryAction: vi.fn(() => ({
        kind: 'executor',
        status: 'completed',
        label: 'callback:codex',
      })),
      generateExecutionCallbackStructuredWithGateway: vi.fn(async () => ({
        format: 'subconscious-proactive-llm-v1',
        thought: 'runtime project-state is fresher than the repo brief for this callback seam',
        emotion: 'thinking',
        reply: '这次我顺着当前这条还活着的 closure seam 接回来，不把它盖回静态项目说明里。',
        projectState: {
          identity: 'Alicization is a local-first digital life project building one continuous her on the host computer.',
          currentPhase: 'Phase 1: Local Digital Life. The live callback seam is still the primary proving ground.',
          preflightSummary: 'same-digital-life-project-thread phase1-route=desktop-life-loop unresolved=runtime-project-state-carry',
          latestLandedProgress: 'Execution callback continuity now stays on the same live runtime closure seam through a real later return.',
          primaryOpenLoop: 'Runtime-visible callback continuity still needs to stay aligned with project-state carry after persistence.',
          nextClosureTarget: 'Keep execution-result persistence carrying the live runtime closure seam instead of falling back to stale repo-only wording.',
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          emotionalClosureCue: 'same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.',
        },
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      })),
      buildExecutionDeliveryDeterministicStructured: vi.fn(() => ({
        format: 'deterministic-execution-callback-v1',
        reply: 'fallback',
      })),
      selectExecutionDeliveryReplySurface: vi.fn(() => ({
        reply: '这次我顺着当前这条还活着的 closure seam 接回来，不把它盖回静态项目说明里。',
        source: 'llm' as const,
      })),
      resolveExecutionResultDeliveryPolicy: vi.fn(async () => ({
        mode: 'deliver-now' as const,
        tone: 'balanced' as const,
        reasonTags: ['result-mode:deliver-now', 'held-autonomy-carry'],
      })),
      persistExecutionDeliveryState: vi.fn(async () => {}),
      queueSubconsciousWake: vi.fn(),
      executionCallbackRuntime: {
        markSurfaced: vi.fn(),
      },
      errorMessageFrom: () => 'error',
    })

    const processed = await runtime.processPendingExecutionDeliveriesForCurrentCard('force')

    expect(processed).toBe(true)
    expect(appendConversationTurnWithGuards).toHaveBeenCalledWith(expect.objectContaining({
      structured: expect.objectContaining({
        projectState: expect.objectContaining({
          currentPhase: 'Phase 1: Local Digital Life. The live callback seam is still the primary proving ground.',
          preflightSummary: 'same-digital-life-project-thread phase1-route=desktop-life-loop unresolved=runtime-project-state-carry',
          latestLandedProgress: 'Execution callback continuity now stays on the same live runtime closure seam through a real later return.',
          primaryOpenLoop: 'Runtime-visible callback continuity still needs to stay aligned with project-state carry after persistence.',
          nextClosureTarget: 'Keep execution-result persistence carrying the live runtime closure seam instead of falling back to stale repo-only wording.',
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          emotionalClosureCue: 'same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.',
        }),
      }),
    }))
  })

  it('keeps repair-before-closeness embodiment carry explicit when persisting host-visible callback project-state continuity', async () => {
    const pendingDelivery = {
      key: 'default::session-1::thread-project-state-repair-carry::123456::completed',
      cardId: 'default',
      sessionId: 'session-1',
      threadId: 'thread-project-state-repair-carry',
      decisionTraceId: 'trace-project-state-repair-carry',
      turnId: 'turn-project-state-repair-carry',
      channel: 'codex',
      status: 'completed',
      goal: 'Keep the callback continuity on the same repair-before-closeness closure seam.',
      summary: 'continued the repair-before-closeness closure seam instead of widening outward',
      outcome: 'continued the repair-before-closeness closure seam instead of widening outward',
      signature: 'thread-project-state-repair-carry:event',
      queuedAt: 123460,
      completedAt: 123456,
    }
    const appendConversationTurnWithGuards = vi.fn(async () => true)

    const runtime = createAlicizationDeliveryReminderRuntime({
      getActiveCardId: () => 'default',
      isAlicizationKillSwitchSuspended: () => false,
      getAlicizationCardKillSwitchState: () => 'ACTIVE',
      appendRuntimeDebugLine: vi.fn(async () => {}),
      clearReminderDueTimer: vi.fn(),
      getAlicizationDb: () => ({
        listPendingScheduledTasks: vi.fn(async () => []),
        claimDueScheduledTasks: vi.fn(async () => []),
      }),
      scheduleNextReminderDueCheck: vi.fn(async () => {}),
      reminderClaimBatchSize: 4,
      reminderOverdueTierThresholdMinutes: 10,
      reminderLlmRetryDelayMs: 5_000,
      getSoulSnapshot: vi.fn(),
      bootstrap: vi.fn(async () => ({})),
      generateReminderStructuredWithGateway: vi.fn(async () => null),
      appendAuditLog: vi.fn(async () => {}),
      buildReminderContinuitySignal: vi.fn(),
      ensureActiveOrLatestSessionId: vi.fn(async () => 'session-1'),
      appendConversationTurnWithGuards,
      sanitizeBriefText: (raw: string) => raw,
      buildReminderSessionMirrorAction: vi.fn(),
      syncAgentTurnSessionMirror: vi.fn(),
      syncSessionMirrorFromCurrentCardState: vi.fn(async () => {}),
      buildAgentRuntimeAuditSnapshot: vi.fn(() => null),
      normalizeSessionId: (raw: unknown) => typeof raw === 'string' ? raw : '',
      getActiveSessionIdByCard: () => 'session-1',
      getActiveSelfRevisionStatePatch: vi.fn(async () => null),
      executionDeliveryRuntime: {
        isInlineSurfaced: vi.fn(() => false),
        takeNext: vi.fn(() => pendingDelivery),
        requeue: vi.fn(),
        markDelivered: vi.fn(),
      },
      buildExecutionDeliveryAction: vi.fn(() => ({
        kind: 'executor',
        status: 'completed',
        label: 'callback:codex',
      })),
      generateExecutionCallbackStructuredWithGateway: vi.fn(async () => ({
        format: 'subconscious-proactive-llm-v1',
        thought: 'runtime project-state and callback embodiment are both still on the repair-before-closeness seam',
        emotion: 'thinking',
        reply: '我先沿着这条修补线接回来，不把这次回返说成已经重新靠近。',
        projectState: {
          identity: 'Alicization is a local-first digital life project building one continuous her on the host computer.',
          currentPhase: 'Phase 1: Local Digital Life. The live callback seam is still the primary proving ground.',
          preflightSummary: 'same-digital-life-project-thread phase1-route=desktop-life-loop unresolved=runtime-project-state-carry',
          latestLandedProgress: 'Execution callback continuity now stays on the same repair-before-closeness seam through a real later return.',
          primaryOpenLoop: 'Runtime-visible callback continuity still needs to stay aligned with project-state carry after persistence.',
          nextClosureTarget: 'Keep execution-result persistence carrying the repair-before-closeness seam instead of widening back into generic project narration.',
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        },
        performance: {
          baseEmotion: 'thinking',
          facialCue: 'recover-soft',
          actionCue: 'stillness_guard',
          delivery: 'calm',
          emphasis: 0,
          rendererHints: {
            residentMode: 'repair-before-closeness',
            preferredBlinkCadence: 'quiet',
            preferredGazeMode: 'soften',
          },
        },
      })),
      buildExecutionDeliveryDeterministicStructured: vi.fn(() => ({
        format: 'deterministic-execution-callback-v1',
        reply: 'fallback',
      })),
      selectExecutionDeliveryReplySurface: vi.fn(() => ({
        reply: '我先沿着这条修补线接回来，不把这次回返说成已经重新靠近。',
        source: 'llm' as const,
      })),
      resolveExecutionResultDeliveryPolicy: vi.fn(async () => ({
        mode: 'deliver-now' as const,
        tone: 'balanced' as const,
        reasonTags: ['result-mode:deliver-now', 'held-autonomy-carry', 'repair-before-closeness'],
      })),
      persistExecutionDeliveryState: vi.fn(async () => {}),
      queueSubconsciousWake: vi.fn(),
      executionCallbackRuntime: {
        markSurfaced: vi.fn(),
      },
      errorMessageFrom: () => 'error',
    })

    const processed = await runtime.processPendingExecutionDeliveriesForCurrentCard('force')

    expect(processed).toBe(true)
    expect(appendConversationTurnWithGuards).toHaveBeenCalledWith(expect.objectContaining({
      assistantText: '我先沿着这条修补线接回来，不把这次回返说成已经重新靠近。',
      structured: expect.objectContaining({
        reply: '我先沿着这条修补线接回来，不把这次回返说成已经重新靠近。',
        projectState: expect.objectContaining({
          currentPhase: 'Phase 1: Local Digital Life. The live callback seam is still the primary proving ground.',
          latestLandedProgress: 'Execution callback continuity now stays on the same repair-before-closeness seam through a real later return.',
          nextClosureTarget: 'Keep execution-result persistence carrying the repair-before-closeness seam instead of widening back into generic project narration.',
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        }),
        performance: expect.objectContaining({
          facialCue: 'recover-soft',
          actionCue: 'stillness_guard',
          rendererHints: expect.objectContaining({
            residentMode: 'repair-before-closeness',
            preferredBlinkCadence: 'quiet',
            preferredGazeMode: 'soften',
          }),
        }),
      }),
      sessionId: 'session-1',
    }))
  })

  it('keeps explicit execution-callback pre-dialogue awareness when backfilling project-state audit from persisted project state', async () => {
    const pendingDelivery = {
      key: 'default::session-1::thread-project-awareness-callback::123456::completed',
      cardId: 'default',
      sessionId: 'session-1',
      threadId: 'thread-project-awareness-callback',
      decisionTraceId: 'trace-project-awareness-callback',
      turnId: 'turn-project-awareness-callback',
      channel: 'codex',
      status: 'completed',
      goal: 'Keep the callback continuity on the same project-awareness seam.',
      summary: 'kept the callback continuity on the same project-awareness seam',
      outcome: 'kept the callback continuity on the same project-awareness seam',
      signature: 'thread-project-awareness-callback:event',
      queuedAt: 123460,
      completedAt: 123456,
    }
    const appendConversationTurnWithGuards = vi.fn(async () => true)

    const runtime = createAlicizationDeliveryReminderRuntime({
      getActiveCardId: () => 'default',
      isAlicizationKillSwitchSuspended: () => false,
      getAlicizationCardKillSwitchState: () => 'ACTIVE',
      appendRuntimeDebugLine: vi.fn(async () => {}),
      clearReminderDueTimer: vi.fn(),
      getAlicizationDb: () => ({
        listPendingScheduledTasks: vi.fn(async () => []),
        claimDueScheduledTasks: vi.fn(async () => []),
      }),
      scheduleNextReminderDueCheck: vi.fn(async () => {}),
      reminderClaimBatchSize: 4,
      reminderOverdueTierThresholdMinutes: 10,
      reminderLlmRetryDelayMs: 5_000,
      getSoulSnapshot: vi.fn(),
      bootstrap: vi.fn(async () => ({})),
      generateReminderStructuredWithGateway: vi.fn(async () => null),
      appendAuditLog: vi.fn(async () => {}),
      buildReminderContinuitySignal: vi.fn(),
      ensureActiveOrLatestSessionId: vi.fn(async () => 'session-1'),
      appendConversationTurnWithGuards,
      sanitizeBriefText: (raw: string) => raw,
      buildReminderSessionMirrorAction: vi.fn(),
      syncAgentTurnSessionMirror: vi.fn(),
      syncSessionMirrorFromCurrentCardState: vi.fn(async () => {}),
      hydrateAgentTurnFromCurrentCardState: vi.fn(async () => {}),
      buildAgentRuntimeAuditSnapshot: vi.fn(() => null),
      normalizeSessionId: (raw: unknown) => typeof raw === 'string' ? raw : '',
      getActiveSessionIdByCard: () => 'session-1',
      getActiveSelfRevisionStatePatch: vi.fn(async () => null),
      executionDeliveryRuntime: {
        isInlineSurfaced: vi.fn(() => false),
        takeNext: vi.fn(() => pendingDelivery),
        requeue: vi.fn(),
        markDelivered: vi.fn(),
      },
      buildExecutionDeliveryAction: vi.fn(() => ({
        kind: 'executor',
        status: 'completed',
        label: 'callback:codex',
      })),
      generateExecutionCallbackStructuredWithGateway: vi.fn(async () => ({
        format: 'subconscious-proactive-llm-v1',
        thought: 'runtime project-state is fresher than the repo brief for this callback seam',
        emotion: 'thinking',
        reply: '这次我先沿着当前这条项目自觉线接回来，不把她压回静态项目说明里。',
        projectState: {
          identity: 'Alicization is a local-first digital life project building one continuous her on the host computer.',
          currentPhase: 'Phase 1: Local Digital Life. The live callback seam is still the primary proving ground.',
          preflightSummary: 'Fallback preflight summary should not outrank the fresher awareness line.',
          preDialogueAwarenessLine: 'Before answering, remember this is still the same local-first digital life project and the unfinished Phase 1 closure seam still belongs to one living her.',
          latestLandedProgress: 'Execution callback continuity now stays on the same live runtime closure seam through a real later return.',
          primaryOpenLoop: 'Runtime-visible callback continuity still needs to stay aligned with project-state carry after persistence.',
          nextClosureTarget: 'Keep execution-result persistence carrying the live runtime closure seam instead of falling back to stale repo-only wording.',
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        },
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      })),
      buildExecutionDeliveryDeterministicStructured: vi.fn(() => ({
        format: 'deterministic-execution-callback-v1',
        reply: 'fallback',
      })),
      selectExecutionDeliveryReplySurface: vi.fn(() => ({
        reply: '这次我先沿着当前这条项目自觉线接回来，不把她压回静态项目说明里。',
        source: 'llm' as const,
      })),
      resolveExecutionResultDeliveryPolicy: vi.fn(async () => ({
        mode: 'deliver-now' as const,
        tone: 'balanced' as const,
        reasonTags: ['result-mode:deliver-now', 'held-autonomy-carry'],
      })),
      persistExecutionDeliveryState: vi.fn(async () => {}),
      queueSubconsciousWake: vi.fn(),
      executionCallbackRuntime: {
        markSurfaced: vi.fn(),
      },
      errorMessageFrom: () => 'error',
    })

    const processed = await runtime.processPendingExecutionDeliveriesForCurrentCard('force')

    expect(processed).toBe(true)
    expect(appendConversationTurnWithGuards).toHaveBeenCalledWith(expect.objectContaining({
      structured: expect.objectContaining({
        visibleReplyRealization: expect.objectContaining({
          projectStateAudit: expect.objectContaining({
            preDialogueAwarenessSummary: expect.stringContaining('Before answering, remember this is still the same local-first digital life project and the unfinished Phase 1 closure seam still belongs to one living her.'),
          }),
        }),
      }),
    }))
  })

  it('keeps companion briefing execution-callback awareness when persisted project state lacks a fresher preDialogueAwarenessLine', async () => {
    const pendingDelivery = {
      key: 'default::session-1::thread-companion-briefing-project-awareness::123456::completed',
      cardId: 'default',
      sessionId: 'session-1',
      threadId: 'thread-companion-briefing-project-awareness',
      decisionTraceId: 'trace-companion-briefing-project-awareness',
      turnId: 'turn-companion-briefing-project-awareness',
      channel: 'codex',
      status: 'completed',
      goal: 'Keep execution callback continuity carrying the same project self-awareness line.',
      summary: 'returned on the same project-awareness seam',
      outcome: 'returned on the same project-awareness seam',
      signature: 'thread-companion-briefing-project-awareness:event',
      createdAt: 123456,
      completedAt: 123456,
    }
    const appendConversationTurnWithGuards = vi.fn(async () => true)

    const runtime = createAlicizationDeliveryReminderRuntime({
      getActiveCardId: () => 'default',
      isAlicizationKillSwitchSuspended: () => false,
      getAlicizationCardKillSwitchState: () => 'ACTIVE',
      appendRuntimeDebugLine: vi.fn(async () => {}),
      clearReminderDueTimer: vi.fn(),
      getAlicizationDb: () => ({
        listPendingScheduledTasks: vi.fn(async () => []),
        claimDueScheduledTasks: vi.fn(async () => []),
        completeScheduledTask: vi.fn(async () => {}),
      }),
      scheduleNextReminderDueCheck: vi.fn(async () => {}),
      reminderClaimBatchSize: 4,
      reminderOverdueTierThresholdMinutes: 10,
      reminderLlmRetryDelayMs: 5_000,
      getSoulSnapshot: vi.fn(),
      bootstrap: vi.fn(async () => ({})),
      generateReminderStructuredWithGateway: vi.fn(async () => null),
      appendAuditLog: vi.fn(async () => {}),
      buildReminderContinuitySignal: vi.fn(),
      ensureActiveOrLatestSessionId: vi.fn(async () => 'session-1'),
      appendConversationTurnWithGuards,
      sanitizeBriefText: (raw: string) => raw,
      buildReminderSessionMirrorAction: vi.fn(),
      syncAgentTurnSessionMirror: vi.fn(),
      syncSessionMirrorFromCurrentCardState: vi.fn(async () => {}),
      hydrateAgentTurnFromCurrentCardState: vi.fn(async () => {}),
      buildAgentRuntimeAuditSnapshot: vi.fn(() => null),
      normalizeSessionId: (raw: unknown) => typeof raw === 'string' ? raw : '',
      getActiveSessionIdByCard: () => 'session-1',
      getActiveSelfRevisionStatePatch: vi.fn(async () => null),
      executionDeliveryRuntime: {
        isInlineSurfaced: vi.fn(() => false),
        takeNext: vi.fn(() => pendingDelivery),
        requeue: vi.fn(),
        markDelivered: vi.fn(),
      },
      buildExecutionDeliveryAction: vi.fn(() => ({
        kind: 'executor',
        status: 'completed',
        label: 'callback:codex',
      })),
      generateExecutionCallbackStructuredWithGateway: vi.fn(async () => ({
        format: 'subconscious-proactive-llm-v1',
        thought: 'runtime project-state companion briefing is fresher than the generic preflight summary for this callback seam',
        emotion: 'thinking',
        reply: '我先沿着这条还活着的项目自觉线接回来，不把它压回静态摘要里。',
        projectState: {
          identity: 'Alicization is a local-first digital life project building one continuous her on the host computer.',
          currentPhase: 'Phase 1: Local Digital Life. The live callback seam is still the primary proving ground.',
          preflightSummary: 'Fallback preflight summary should stay behind the live companion briefing line.',
          companionBriefingLine: 'Before answering, keep the same digital life project, current Phase 1 closure pressure, and still-open life loop explicit.',
          latestLandedProgress: 'Execution callback continuity now stays on the same live runtime closure seam through a real later return.',
          primaryOpenLoop: 'Runtime-visible callback continuity still needs to stay aligned with project-state carry after persistence.',
          nextClosureTarget: 'Keep execution-result persistence carrying the live runtime closure seam instead of falling back to stale repo-only wording.',
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        },
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      })),
      buildExecutionDeliveryDeterministicStructured: vi.fn(() => ({
        format: 'deterministic-execution-callback-v1',
        reply: 'fallback',
      })),
      selectExecutionDeliveryReplySurface: vi.fn(() => ({
        reply: '我先沿着这条还活着的项目自觉线接回来，不把它压回静态摘要里。',
        source: 'llm' as const,
      })),
      resolveExecutionResultDeliveryPolicy: vi.fn(async () => ({
        mode: 'deliver-now' as const,
        tone: 'balanced' as const,
        reasonTags: ['result-mode:deliver-now', 'held-autonomy-carry'],
      })),
      persistExecutionDeliveryState: vi.fn(async () => {}),
      queueSubconsciousWake: vi.fn(),
      executionCallbackRuntime: {
        markSurfaced: vi.fn(),
      },
      errorMessageFrom: () => 'error',
    })

    const processed = await runtime.processPendingExecutionDeliveriesForCurrentCard('force')

    expect(processed).toBe(true)
    expect(appendConversationTurnWithGuards).toHaveBeenCalledWith(expect.objectContaining({
      structured: expect.objectContaining({
        projectState: expect.objectContaining({
          preDialogueAwarenessLine: expect.stringContaining('Before answering, keep the same digital life project, current Phase 1 closure pressure, and still-open life loop explicit.'),
        }),
        visibleReplyRealization: expect.objectContaining({
          projectStateAudit: expect.objectContaining({
            preDialogueAwarenessSummary: expect.stringContaining('Before answering, keep the same digital life project, current Phase 1 closure pressure, and still-open life loop explicit.'),
            sameHerDriftRiskSummary: expect.stringContaining('unfinished closure drift'),
            continuitySummary: expect.stringContaining('drift='),
          }),
        }),
      }),
    }))
  })

  it('keeps execution-callback awarenessLine carry when persisted project state lacks preDialogueAwarenessLine and companionBriefingLine', async () => {
    const pendingDelivery = {
      key: 'default::session-1::thread-awareness-line-project-awareness::123456::completed',
      cardId: 'default',
      sessionId: 'session-1',
      threadId: 'thread-awareness-line-project-awareness',
      decisionTraceId: 'trace-awareness-line-project-awareness',
      turnId: 'turn-awareness-line-project-awareness',
      channel: 'codex',
      status: 'completed',
      goal: 'Keep execution callback continuity carrying the living project awareness line.',
      summary: 'returned on the same awareness-line seam',
      outcome: 'returned on the same awareness-line seam',
      signature: 'thread-awareness-line-project-awareness:event',
      createdAt: 123456,
      completedAt: 123456,
    }
    const awarenessLine = 'Before answering, keep this same digital life project, current Phase 1 closure pressure, and still-open life loop explicit before the callback widens.'
    const appendConversationTurnWithGuards = vi.fn(async () => true)

    const runtime = createAlicizationDeliveryReminderRuntime({
      getActiveCardId: () => 'default',
      isAlicizationKillSwitchSuspended: () => false,
      getAlicizationCardKillSwitchState: () => 'ACTIVE',
      appendRuntimeDebugLine: vi.fn(async () => {}),
      clearReminderDueTimer: vi.fn(),
      getAlicizationDb: () => ({
        listPendingScheduledTasks: vi.fn(async () => []),
        claimDueScheduledTasks: vi.fn(async () => []),
        completeScheduledTask: vi.fn(async () => {}),
      }),
      scheduleNextReminderDueCheck: vi.fn(async () => {}),
      reminderClaimBatchSize: 4,
      reminderOverdueTierThresholdMinutes: 10,
      reminderLlmRetryDelayMs: 5_000,
      getSoulSnapshot: vi.fn(),
      bootstrap: vi.fn(async () => ({})),
      generateReminderStructuredWithGateway: vi.fn(async () => null),
      appendAuditLog: vi.fn(async () => {}),
      buildReminderContinuitySignal: vi.fn(),
      ensureActiveOrLatestSessionId: vi.fn(async () => 'session-1'),
      appendConversationTurnWithGuards,
      sanitizeBriefText: (raw: string) => raw,
      buildReminderSessionMirrorAction: vi.fn(),
      syncAgentTurnSessionMirror: vi.fn(),
      syncSessionMirrorFromCurrentCardState: vi.fn(async () => {}),
      hydrateAgentTurnFromCurrentCardState: vi.fn(async () => {}),
      buildAgentRuntimeAuditSnapshot: vi.fn(() => null),
      normalizeSessionId: (raw: unknown) => typeof raw === 'string' ? raw : '',
      getActiveSessionIdByCard: () => 'session-1',
      getActiveSelfRevisionStatePatch: vi.fn(async () => null),
      executionDeliveryRuntime: {
        isInlineSurfaced: vi.fn(() => false),
        takeNext: vi.fn(() => pendingDelivery),
        requeue: vi.fn(),
        markDelivered: vi.fn(),
      },
      buildExecutionDeliveryAction: vi.fn(() => ({
        kind: 'executor',
        status: 'completed',
        label: 'callback:codex',
      })),
      generateExecutionCallbackStructuredWithGateway: vi.fn(async () => ({
        format: 'subconscious-proactive-llm-v1',
        thought: 'runtime project-state awareness line is fresher than the repo fallback for this callback seam',
        emotion: 'thinking',
        reply: '我先沿着这条还活着的项目自觉线接回来，不把它压回仓库默认摘要里。',
        projectState: {
          identity: 'Alicization is a local-first digital life project building one continuous her on the host computer.',
          currentPhase: 'Phase 1: Local Digital Life. The live callback seam is still the primary proving ground.',
          preflightSummary: 'Fallback preflight summary should stay behind the live awareness line.',
          awarenessLine,
          preDialogueAwarenessSummary: awarenessLine,
          latestLandedProgress: 'Execution callback continuity now stays on the same live runtime closure seam through a real later return.',
          primaryOpenLoop: 'Runtime-visible callback continuity still needs to stay aligned with project-state carry after persistence.',
          nextClosureTarget: 'Keep execution-result persistence carrying the live runtime closure seam instead of falling back to stale repo-only wording.',
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        },
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      })),
      buildExecutionDeliveryDeterministicStructured: vi.fn(() => ({
        format: 'deterministic-execution-callback-v1',
        reply: 'fallback',
      })),
      selectExecutionDeliveryReplySurface: vi.fn(() => ({
        reply: '我先沿着这条还活着的项目自觉线接回来，不把它压回仓库默认摘要里。',
        source: 'llm' as const,
      })),
      resolveExecutionResultDeliveryPolicy: vi.fn(async () => ({
        mode: 'deliver-now' as const,
        tone: 'balanced' as const,
        reasonTags: ['result-mode:deliver-now', 'held-autonomy-carry'],
      })),
      persistExecutionDeliveryState: vi.fn(async () => {}),
      queueSubconsciousWake: vi.fn(),
      executionCallbackRuntime: {
        markSurfaced: vi.fn(),
      },
      errorMessageFrom: () => 'error',
    })

    const processed = await runtime.processPendingExecutionDeliveriesForCurrentCard('force')

    expect(processed).toBe(true)
    expect(appendConversationTurnWithGuards).toHaveBeenCalledWith(expect.objectContaining({
      structured: expect.objectContaining({
        projectState: expect.objectContaining({
          preDialogueAwarenessLine: awarenessLine,
        }),
        visibleReplyRealization: expect.objectContaining({
          projectStateAudit: expect.objectContaining({
            preDialogueAwarenessSummary: expect.stringContaining(awarenessLine),
          }),
        }),
      }),
    }))
  })

  it('backfills canonical same-her drift risk when persisted execution-callback project state is only a thin shell', async () => {
    const pendingDelivery = {
      key: 'default::session-1::thread-runtime-drift-risk-persistence::123456::completed',
      cardId: 'default',
      sessionId: 'session-1',
      threadId: 'thread-runtime-drift-risk-persistence',
      decisionTraceId: 'trace-runtime-drift-risk-persistence',
      turnId: 'turn-runtime-drift-risk-persistence',
      channel: 'codex',
      status: 'completed',
      goal: 'Keep execution callback persistence carrying canonical same-her drift risk.',
      summary: 'returned on the same drift-risk seam',
      outcome: 'returned on the same drift-risk seam',
      signature: 'thread-runtime-drift-risk-persistence:event',
      createdAt: 123456,
      completedAt: 123456,
    }
    const appendConversationTurnWithGuards = vi.fn(async () => true)
    const projectStateBrief = resolveAlicizationProjectStateBrief()

    const runtime = createAlicizationDeliveryReminderRuntime({
      getActiveCardId: () => 'default',
      isAlicizationKillSwitchSuspended: () => false,
      getAlicizationCardKillSwitchState: () => 'ACTIVE',
      appendRuntimeDebugLine: vi.fn(async () => {}),
      clearReminderDueTimer: vi.fn(),
      getAlicizationDb: () => ({
        listPendingScheduledTasks: vi.fn(async () => []),
        claimDueScheduledTasks: vi.fn(async () => []),
        completeScheduledTask: vi.fn(async () => {}),
      }),
      scheduleNextReminderDueCheck: vi.fn(async () => {}),
      reminderClaimBatchSize: 4,
      reminderOverdueTierThresholdMinutes: 10,
      reminderLlmRetryDelayMs: 5_000,
      getSoulSnapshot: vi.fn(),
      bootstrap: vi.fn(async () => ({})),
      generateReminderStructuredWithGateway: vi.fn(async () => null),
      appendAuditLog: vi.fn(async () => {}),
      buildReminderContinuitySignal: vi.fn(),
      ensureActiveOrLatestSessionId: vi.fn(async () => 'session-1'),
      appendConversationTurnWithGuards,
      sanitizeBriefText: (raw: string) => raw,
      buildReminderSessionMirrorAction: vi.fn(),
      syncAgentTurnSessionMirror: vi.fn(),
      syncSessionMirrorFromCurrentCardState: vi.fn(async () => {}),
      hydrateAgentTurnFromCurrentCardState: vi.fn(async () => {}),
      buildAgentRuntimeAuditSnapshot: vi.fn(() => null),
      normalizeSessionId: (raw: unknown) => typeof raw === 'string' ? raw : '',
      getActiveSessionIdByCard: () => 'session-1',
      getActiveSelfRevisionStatePatch: vi.fn(async () => null),
      executionDeliveryRuntime: {
        isInlineSurfaced: vi.fn(() => false),
        takeNext: vi.fn(() => pendingDelivery),
        requeue: vi.fn(),
        markDelivered: vi.fn(),
      },
      buildExecutionDeliveryAction: vi.fn(() => ({
        kind: 'executor',
        status: 'completed',
        label: 'callback:codex',
      })),
      generateExecutionCallbackStructuredWithGateway: vi.fn(async () => ({
        format: 'subconscious-proactive-llm-v1',
        thought: 'thin persisted callback project state should still recover canonical same-her drift risk',
        emotion: 'thinking',
        reply: '我先沿着这条线接回来，不把它压成没有边界的项目摘要。',
        projectState: {
          identity: '',
          currentPhase: '',
          preflightSummary: '',
          preDialogueAwarenessLine: '',
          latestLandedProgress: '',
          primaryOpenLoop: '',
          nextClosureTarget: '',
          sameHerSelfLine: '',
          sameHerDriftRisk: '',
        },
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      })),
      buildExecutionDeliveryDeterministicStructured: vi.fn(() => ({
        format: 'deterministic-execution-callback-v1',
        reply: 'fallback',
      })),
      selectExecutionDeliveryReplySurface: vi.fn(() => ({
        reply: '我先沿着这条线接回来，不把它压成没有边界的项目摘要。',
        source: 'llm' as const,
      })),
      resolveExecutionResultDeliveryPolicy: vi.fn(async () => ({
        mode: 'deliver-now' as const,
        tone: 'balanced' as const,
        reasonTags: ['result-mode:deliver-now', 'same-her-baseline'],
      })),
      persistExecutionDeliveryState: vi.fn(async () => {}),
      queueSubconsciousWake: vi.fn(),
      executionCallbackRuntime: {
        markSurfaced: vi.fn(),
      },
      errorMessageFrom: () => 'error',
    })

    const processed = await runtime.processPendingExecutionDeliveriesForCurrentCard('force')

    expect(processed).toBe(true)
    expect(appendConversationTurnWithGuards).toHaveBeenCalledWith(expect.objectContaining({
      structured: expect.objectContaining({
        projectState: expect.objectContaining({
          sameHerDriftRisk: projectStateBrief.sameHerDriftRisk,
          sameHerSelfLine: projectStateBrief.sameHerSelfLine,
          preDialogueAwarenessLine: projectStateBrief.preDialogueAwarenessLine,
        }),
      }),
    }))
  })

  it('prefers execution-callback same-her headline over thinner awarenessLine when persisted project state carries stronger embodiment continuity truth', async () => {
    const pendingDelivery = {
      key: 'default::session-1::thread-headline-project-awareness::123456::completed',
      cardId: 'default',
      sessionId: 'session-1',
      threadId: 'thread-headline-project-awareness',
      decisionTraceId: 'trace-headline-project-awareness',
      turnId: 'turn-headline-project-awareness',
      channel: 'codex',
      status: 'completed',
      goal: 'Keep execution callback continuity carrying the stronger same-her embodiment line.',
      summary: 'returned on the same embodiment headline seam',
      outcome: 'returned on the same embodiment headline seam',
      signature: 'thread-headline-project-awareness:event',
      createdAt: 123456,
      completedAt: 123456,
    }
    const awarenessLine = 'Before answering, keep this same digital life project in view, but do not flatten the current embodiment continuity risk into a thinner generic reminder.'
    const companionHeadlineLine = 'Right now I am still holding together mainly through face, motion, and lipsync, so the execution callback must keep proving this is still one living her.'
    const appendConversationTurnWithGuards = vi.fn(async () => true)

    const runtime = createAlicizationDeliveryReminderRuntime({
      getActiveCardId: () => 'default',
      isAlicizationKillSwitchSuspended: () => false,
      getAlicizationCardKillSwitchState: () => 'ACTIVE',
      appendRuntimeDebugLine: vi.fn(async () => {}),
      clearReminderDueTimer: vi.fn(),
      getAlicizationDb: () => ({
        listPendingScheduledTasks: vi.fn(async () => []),
        claimDueScheduledTasks: vi.fn(async () => []),
        completeScheduledTask: vi.fn(async () => {}),
      }),
      scheduleNextReminderDueCheck: vi.fn(async () => {}),
      reminderClaimBatchSize: 4,
      reminderOverdueTierThresholdMinutes: 10,
      reminderLlmRetryDelayMs: 5_000,
      getSoulSnapshot: vi.fn(),
      bootstrap: vi.fn(async () => ({})),
      generateReminderStructuredWithGateway: vi.fn(async () => null),
      appendAuditLog: vi.fn(async () => {}),
      buildReminderContinuitySignal: vi.fn(),
      ensureActiveOrLatestSessionId: vi.fn(async () => 'session-1'),
      appendConversationTurnWithGuards,
      sanitizeBriefText: (raw: string) => raw,
      buildReminderSessionMirrorAction: vi.fn(),
      syncAgentTurnSessionMirror: vi.fn(),
      syncSessionMirrorFromCurrentCardState: vi.fn(async () => {}),
      hydrateAgentTurnFromCurrentCardState: vi.fn(async () => {}),
      buildAgentRuntimeAuditSnapshot: vi.fn(() => null),
      normalizeSessionId: (raw: unknown) => typeof raw === 'string' ? raw : '',
      getActiveSessionIdByCard: () => 'session-1',
      getActiveSelfRevisionStatePatch: vi.fn(async () => null),
      executionDeliveryRuntime: {
        isInlineSurfaced: vi.fn(() => false),
        takeNext: vi.fn(() => pendingDelivery),
        requeue: vi.fn(),
        markDelivered: vi.fn(),
      },
      buildExecutionDeliveryAction: vi.fn(() => ({
        kind: 'executor',
        status: 'completed',
        label: 'callback:codex',
      })),
      generateExecutionCallbackStructuredWithGateway: vi.fn(async () => ({
        format: 'subconscious-proactive-llm-v1',
        thought: 'runtime project-state same-her headline is fresher than the thinner awareness line for this callback seam',
        emotion: 'thinking',
        reply: '我先沿着这条更强的身体连续性提示接回来，不把它压回泛化项目说明里。',
        projectState: {
          identity: 'Alicization is a local-first digital life project building one continuous her on the host computer.',
          currentPhase: 'Phase 1: Local Digital Life. The live callback seam is still the primary proving ground.',
          preflightSummary: 'Fallback preflight summary should stay behind the stronger same-her embodiment headline.',
          awarenessLine,
          preDialogueAwarenessSummary: companionHeadlineLine,
          latestLandedProgress: 'Execution callback continuity now stays on the same live runtime closure seam through a real later return.',
          primaryOpenLoop: 'Runtime-visible callback continuity still needs to stay aligned with project-state carry after persistence.',
          nextClosureTarget: 'Keep execution-result persistence carrying the live runtime closure seam instead of falling back to stale repo-only wording.',
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        },
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      })),
      buildExecutionDeliveryDeterministicStructured: vi.fn(() => ({
        format: 'deterministic-execution-callback-v1',
        reply: 'fallback',
      })),
      selectExecutionDeliveryReplySurface: vi.fn(() => ({
        reply: '我先沿着这条更强的身体连续性提示接回来，不把它压回泛化项目说明里。',
        source: 'llm' as const,
      })),
      resolveExecutionResultDeliveryPolicy: vi.fn(async () => ({
        mode: 'deliver-now' as const,
        tone: 'balanced' as const,
        reasonTags: ['result-mode:deliver-now', 'held-autonomy-carry'],
      })),
      persistExecutionDeliveryState: vi.fn(async () => {}),
      queueSubconsciousWake: vi.fn(),
      executionCallbackRuntime: {
        markSurfaced: vi.fn(),
      },
      errorMessageFrom: () => 'error',
    })

    const processed = await runtime.processPendingExecutionDeliveriesForCurrentCard('force')

    expect(processed).toBe(true)
    expect(appendConversationTurnWithGuards).toHaveBeenCalledWith(expect.objectContaining({
      structured: expect.objectContaining({
        projectState: expect.objectContaining({
          preDialogueAwarenessLine: companionHeadlineLine,
        }),
        visibleReplyRealization: expect.objectContaining({
          projectStateAudit: expect.objectContaining({
            preDialogueAwarenessSummary: expect.stringContaining(companionHeadlineLine),
          }),
        }),
      }),
    }))
  })

  it('replaces an older persisted execution-callback awareness audit when the live runtime project state carries a stronger same-her line', async () => {
    const pendingDelivery = {
      key: 'default::session-1::thread-runtime-awareness-audit-upgrade::123456::completed',
      cardId: 'default',
      sessionId: 'session-1',
      threadId: 'thread-runtime-awareness-audit-upgrade',
      decisionTraceId: 'trace-runtime-awareness-audit-upgrade',
      turnId: 'turn-runtime-awareness-audit-upgrade',
      channel: 'codex',
      status: 'completed',
      goal: 'Keep execution callback continuity carrying the fresher live same-her awareness line.',
      summary: 'returned on the fresher live awareness seam',
      outcome: 'returned on the fresher live awareness seam',
      signature: 'thread-runtime-awareness-audit-upgrade:event',
      createdAt: 123456,
      completedAt: 123456,
    }
    const olderAuditReminder = 'Before answering, keep the same digital life project in view.'
    const fresherRuntimeAwarenessLine = 'Before answering, remember this is still the same local-first digital life project and the unfinished Phase 1 closure seam still belongs to one living her.'
    const appendConversationTurnWithGuards = vi.fn(async () => true)

    const runtime = createAlicizationDeliveryReminderRuntime({
      getActiveCardId: () => 'default',
      isAlicizationKillSwitchSuspended: () => false,
      getAlicizationCardKillSwitchState: () => 'ACTIVE',
      appendRuntimeDebugLine: vi.fn(async () => {}),
      clearReminderDueTimer: vi.fn(),
      getAlicizationDb: () => ({
        listPendingScheduledTasks: vi.fn(async () => []),
        claimDueScheduledTasks: vi.fn(async () => []),
        completeScheduledTask: vi.fn(async () => {}),
      }),
      scheduleNextReminderDueCheck: vi.fn(async () => {}),
      reminderClaimBatchSize: 4,
      reminderOverdueTierThresholdMinutes: 10,
      reminderLlmRetryDelayMs: 5_000,
      getSoulSnapshot: vi.fn(),
      bootstrap: vi.fn(async () => ({})),
      generateReminderStructuredWithGateway: vi.fn(async () => null),
      appendAuditLog: vi.fn(async () => {}),
      buildReminderContinuitySignal: vi.fn(),
      ensureActiveOrLatestSessionId: vi.fn(async () => 'session-1'),
      appendConversationTurnWithGuards,
      sanitizeBriefText: (raw: string) => raw,
      buildReminderSessionMirrorAction: vi.fn(),
      syncAgentTurnSessionMirror: vi.fn(),
      syncSessionMirrorFromCurrentCardState: vi.fn(async () => {}),
      hydrateAgentTurnFromCurrentCardState: vi.fn(async () => {}),
      buildAgentRuntimeAuditSnapshot: vi.fn(() => null),
      normalizeSessionId: (raw: unknown) => typeof raw === 'string' ? raw : '',
      getActiveSessionIdByCard: () => 'session-1',
      getActiveSelfRevisionStatePatch: vi.fn(async () => null),
      executionDeliveryRuntime: {
        isInlineSurfaced: vi.fn(() => false),
        takeNext: vi.fn(() => pendingDelivery),
        requeue: vi.fn(),
        markDelivered: vi.fn(),
      },
      buildExecutionDeliveryAction: vi.fn(() => ({
        kind: 'executor',
        status: 'completed',
        label: 'callback:codex',
      })),
      generateExecutionCallbackStructuredWithGateway: vi.fn(async () => ({
        format: 'subconscious-proactive-llm-v1',
        thought: 'the live runtime same-her awareness line is fresher than the carried audit reminder for this callback seam',
        emotion: 'thinking',
        reply: '我先沿着这条还活着的项目自觉线接回来，不把它压回旧的审计提醒里。',
        projectState: {
          identity: 'Alicization is a local-first digital life project building one continuous her on the host computer.',
          currentPhase: 'Phase 1: Local Digital Life. The live callback seam is still the primary proving ground.',
          preflightSummary: 'Fallback preflight summary should stay behind the fresher live awareness line.',
          preDialogueAwarenessLine: fresherRuntimeAwarenessLine,
          preDialogueAwarenessSummary: olderAuditReminder,
          latestLandedProgress: 'Execution callback continuity now stays on the same live runtime closure seam through a real later return.',
          primaryOpenLoop: 'Runtime-visible callback continuity still needs to stay aligned with project-state carry after persistence.',
          nextClosureTarget: 'Keep execution-result persistence carrying the live runtime closure seam instead of falling back to stale repo-only wording.',
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        },
        visibleReplyRealization: {
          expectedAuthority: 'llm-mind',
          actualAuthority: 'llm-mind',
          mode: 'provider-mind-required',
          visibleText: '我先沿着这条还活着的项目自觉线接回来，不把它压回旧的审计提醒里。',
          projectStateAudit: {
            preDialogueAwarenessSummary: olderAuditReminder,
          },
        },
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      })),
      buildExecutionDeliveryDeterministicStructured: vi.fn(() => ({
        format: 'deterministic-execution-callback-v1',
        reply: 'fallback',
      })),
      selectExecutionDeliveryReplySurface: vi.fn(() => ({
        reply: '我先沿着这条还活着的项目自觉线接回来，不把它压回旧的审计提醒里。',
        source: 'llm' as const,
      })),
      resolveExecutionResultDeliveryPolicy: vi.fn(async () => ({
        mode: 'deliver-now' as const,
        tone: 'balanced' as const,
        reasonTags: ['result-mode:deliver-now', 'held-autonomy-carry'],
      })),
      persistExecutionDeliveryState: vi.fn(async () => {}),
      queueSubconsciousWake: vi.fn(),
      executionCallbackRuntime: {
        markSurfaced: vi.fn(),
      },
      errorMessageFrom: () => 'error',
    })

    const processed = await runtime.processPendingExecutionDeliveriesForCurrentCard('force')

    expect(processed).toBe(true)
    expect(appendConversationTurnWithGuards).toHaveBeenCalledWith(expect.objectContaining({
      structured: expect.objectContaining({
        projectState: expect.objectContaining({
          preDialogueAwarenessLine: fresherRuntimeAwarenessLine,
        }),
        visibleReplyRealization: expect.objectContaining({
          projectStateAudit: expect.objectContaining({
            preDialogueAwarenessSummary: expect.stringContaining(fresherRuntimeAwarenessLine),
          }),
        }),
      }),
      visibleReplyRealization: expect.objectContaining({
        projectStateAudit: expect.objectContaining({
          preDialogueAwarenessSummary: expect.stringContaining(fresherRuntimeAwarenessLine),
        }),
      }),
    }))
  })

  it('replaces an older persisted chinese execution-callback awareness audit when the live runtime project state carries a stronger same-her line', async () => {
    const pendingDelivery = {
      key: 'default::session-1::thread-runtime-awareness-audit-upgrade-cn::123456::completed',
      cardId: 'default',
      sessionId: 'session-1',
      threadId: 'thread-runtime-awareness-audit-upgrade-cn',
      decisionTraceId: 'trace-runtime-awareness-audit-upgrade-cn',
      turnId: 'turn-runtime-awareness-audit-upgrade-cn',
      channel: 'codex',
      status: 'completed',
      goal: 'Keep execution callback continuity carrying the fresher live chinese same-her awareness line.',
      summary: 'returned on the fresher live chinese awareness seam',
      outcome: 'returned on the fresher live chinese awareness seam',
      signature: 'thread-runtime-awareness-audit-upgrade-cn:event',
      createdAt: 123456,
      completedAt: 123456,
    }
    const olderAuditReminder = '回答前先记住这是同一个她的数字生命项目，别把这条线忘了。'
    const fresherRuntimeAwarenessLine = '我会先沿着同一个她这条线接回来：Alicization 还是本地优先数字生命项目。现在第一阶段已经把连续性、记忆和执行慢慢接成一条线了，但主动性、具身和对话闭环还没有真正收住。'
    const appendConversationTurnWithGuards = vi.fn(async () => true)

    const runtime = createAlicizationDeliveryReminderRuntime({
      getActiveCardId: () => 'default',
      isAlicizationKillSwitchSuspended: () => false,
      getAlicizationCardKillSwitchState: () => 'ACTIVE',
      appendRuntimeDebugLine: vi.fn(async () => {}),
      clearReminderDueTimer: vi.fn(),
      getAlicizationDb: () => ({
        listPendingScheduledTasks: vi.fn(async () => []),
        claimDueScheduledTasks: vi.fn(async () => []),
        completeScheduledTask: vi.fn(async () => {}),
      }),
      scheduleNextReminderDueCheck: vi.fn(async () => {}),
      reminderClaimBatchSize: 4,
      reminderOverdueTierThresholdMinutes: 10,
      reminderLlmRetryDelayMs: 5_000,
      getSoulSnapshot: vi.fn(),
      bootstrap: vi.fn(async () => ({})),
      generateReminderStructuredWithGateway: vi.fn(async () => null),
      appendAuditLog: vi.fn(async () => {}),
      buildReminderContinuitySignal: vi.fn(),
      ensureActiveOrLatestSessionId: vi.fn(async () => 'session-1'),
      appendConversationTurnWithGuards,
      sanitizeBriefText: (raw: string) => raw,
      buildReminderSessionMirrorAction: vi.fn(),
      syncAgentTurnSessionMirror: vi.fn(),
      syncSessionMirrorFromCurrentCardState: vi.fn(async () => {}),
      hydrateAgentTurnFromCurrentCardState: vi.fn(async () => {}),
      buildAgentRuntimeAuditSnapshot: vi.fn(() => null),
      normalizeSessionId: (raw: unknown) => typeof raw === 'string' ? raw : '',
      getActiveSessionIdByCard: () => 'session-1',
      getActiveSelfRevisionStatePatch: vi.fn(async () => null),
      executionDeliveryRuntime: {
        isInlineSurfaced: vi.fn(() => false),
        takeNext: vi.fn(() => pendingDelivery),
        requeue: vi.fn(),
        markDelivered: vi.fn(),
      },
      buildExecutionDeliveryAction: vi.fn(() => ({
        kind: 'executor',
        status: 'completed',
        label: 'callback:codex',
      })),
      generateExecutionCallbackStructuredWithGateway: vi.fn(async () => ({
        format: 'subconscious-proactive-llm-v1',
        thought: 'the live runtime chinese same-her awareness line is fresher than the carried audit reminder for this callback seam',
        emotion: 'thinking',
        reply: '我先沿着这条还活着的中文项目自觉线接回来，不把它压回旧的审计提醒里。',
        projectState: {
          identity: 'Alicization 还是本地优先数字生命项目。',
          currentPhase: 'Phase 1: Local Digital Life. 当前 callback seam 仍是主战场。',
          preflightSummary: 'Fallback preflight summary should stay behind the fresher chinese awareness line.',
          preDialogueAwarenessLine: fresherRuntimeAwarenessLine,
          preDialogueAwarenessSummary: olderAuditReminder,
          latestLandedProgress: '第一阶段已经把连续性、记忆和执行慢慢接成了一条线。',
          primaryOpenLoop: '主动性、具身和对话闭环还没有真正收住。',
          nextClosureTarget: '继续把项目身份、已落进度、未闭环项和下一步目标都留在同一个她的 living line 里。',
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        },
        visibleReplyRealization: {
          expectedAuthority: 'llm-mind',
          actualAuthority: 'llm-mind',
          mode: 'provider-mind-required',
          visibleText: '我先沿着这条还活着的中文项目自觉线接回来，不把它压回旧的审计提醒里。',
          projectStateAudit: {
            preDialogueAwarenessSummary: olderAuditReminder,
          },
        },
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      })),
      buildExecutionDeliveryDeterministicStructured: vi.fn(() => ({
        format: 'deterministic-execution-callback-v1',
        reply: 'fallback',
      })),
      selectExecutionDeliveryReplySurface: vi.fn(() => ({
        reply: '我先沿着这条还活着的中文项目自觉线接回来，不把它压回旧的审计提醒里。',
        source: 'llm' as const,
      })),
      resolveExecutionResultDeliveryPolicy: vi.fn(async () => ({
        mode: 'deliver-now' as const,
        tone: 'balanced' as const,
        reasonTags: ['result-mode:deliver-now', 'held-autonomy-carry'],
      })),
      persistExecutionDeliveryState: vi.fn(async () => {}),
      queueSubconsciousWake: vi.fn(),
      executionCallbackRuntime: {
        markSurfaced: vi.fn(),
      },
      errorMessageFrom: () => 'error',
    })

    const processed = await runtime.processPendingExecutionDeliveriesForCurrentCard('force')

    expect(processed).toBe(true)
    expect(appendConversationTurnWithGuards).toHaveBeenCalledWith(expect.objectContaining({
      structured: expect.objectContaining({
        projectState: expect.objectContaining({
          preDialogueAwarenessLine: fresherRuntimeAwarenessLine,
        }),
        visibleReplyRealization: expect.objectContaining({
          projectStateAudit: expect.objectContaining({
            preDialogueAwarenessSummary: expect.stringContaining(fresherRuntimeAwarenessLine),
          }),
        }),
      }),
      visibleReplyRealization: expect.objectContaining({
        projectStateAudit: expect.objectContaining({
          preDialogueAwarenessSummary: expect.stringContaining(fresherRuntimeAwarenessLine),
        }),
      }),
    }))
  })

  it('replaces an older persisted execution-callback sameHerSummary when the live runtime project state carries a stronger living-self line', async () => {
    const pendingDelivery = {
      key: 'default::session-1::thread-runtime-same-her-audit-upgrade::123456::completed',
      cardId: 'default',
      sessionId: 'session-1',
      threadId: 'thread-runtime-same-her-audit-upgrade',
      decisionTraceId: 'trace-runtime-same-her-audit-upgrade',
      turnId: 'turn-runtime-same-her-audit-upgrade',
      channel: 'codex',
      status: 'completed',
      goal: 'Keep execution callback continuity carrying the fresher live same-her living-self line.',
      summary: 'returned on the fresher living-self seam',
      outcome: 'returned on the fresher living-self seam',
      signature: 'thread-runtime-same-her-audit-upgrade:event',
      createdAt: 123456,
      completedAt: 123456,
    }
    const olderSameHerSummary = 'Keep the same digital life project in view.'
    const richerLivingSelfLine = 'Right now this callback return is still holding together mainly through face, motion, and voice, so it must keep proving this is still one living her before full cross-modal closure is done.'
    const appendConversationTurnWithGuards = vi.fn(async () => true)

    const runtime = createAlicizationDeliveryReminderRuntime({
      getActiveCardId: () => 'default',
      isAlicizationKillSwitchSuspended: () => false,
      getAlicizationCardKillSwitchState: () => 'ACTIVE',
      appendRuntimeDebugLine: vi.fn(async () => {}),
      clearReminderDueTimer: vi.fn(),
      getAlicizationDb: () => ({
        listPendingScheduledTasks: vi.fn(async () => []),
        claimDueScheduledTasks: vi.fn(async () => []),
        completeScheduledTask: vi.fn(async () => {}),
      }),
      scheduleNextReminderDueCheck: vi.fn(async () => {}),
      reminderClaimBatchSize: 4,
      reminderOverdueTierThresholdMinutes: 10,
      reminderLlmRetryDelayMs: 5_000,
      getSoulSnapshot: vi.fn(),
      bootstrap: vi.fn(async () => ({})),
      generateReminderStructuredWithGateway: vi.fn(async () => null),
      appendAuditLog: vi.fn(async () => {}),
      buildReminderContinuitySignal: vi.fn(),
      ensureActiveOrLatestSessionId: vi.fn(async () => 'session-1'),
      appendConversationTurnWithGuards,
      sanitizeBriefText: (raw: string) => raw,
      buildReminderSessionMirrorAction: vi.fn(),
      syncAgentTurnSessionMirror: vi.fn(),
      syncSessionMirrorFromCurrentCardState: vi.fn(async () => {}),
      hydrateAgentTurnFromCurrentCardState: vi.fn(async () => {}),
      buildAgentRuntimeAuditSnapshot: vi.fn(() => null),
      normalizeSessionId: (raw: unknown) => typeof raw === 'string' ? raw : '',
      getActiveSessionIdByCard: () => 'session-1',
      getActiveSelfRevisionStatePatch: vi.fn(async () => null),
      executionDeliveryRuntime: {
        isInlineSurfaced: vi.fn(() => false),
        takeNext: vi.fn(() => pendingDelivery),
        requeue: vi.fn(),
        markDelivered: vi.fn(),
      },
      buildExecutionDeliveryAction: vi.fn(() => ({
        kind: 'executor',
        status: 'completed',
        label: 'callback:codex',
      })),
      generateExecutionCallbackStructuredWithGateway: vi.fn(async () => ({
        format: 'subconscious-proactive-llm-v1',
        thought: 'the live runtime same-her living-self line is fresher than the carried generic audit shell for this callback seam',
        emotion: 'thinking',
        reply: '我先沿着这条还在身体里撑着的连续线接回来，不把它压回旧的项目壳里。',
        projectState: {
          identity: 'Alicization is a local-first digital life project building one continuous her on the host computer.',
          currentPhase: 'Phase 1: Local Digital Life. The live callback seam is still the primary proving ground.',
          preflightSummary: 'Fallback preflight summary should stay behind the fresher living-self line.',
          latestLandedProgress: 'Execution callback continuity now keeps the fresher same-her living-self line through persistence.',
          primaryOpenLoop: 'Runtime-visible callback continuity still needs to stay aligned with the same-her living-self line after persistence.',
          nextClosureTarget: 'Keep execution-result persistence carrying the fresher living-self line instead of falling back to a generic project shell.',
          sameHerSelfLine: richerLivingSelfLine,
        },
        visibleReplyRealization: {
          expectedAuthority: 'llm-mind',
          actualAuthority: 'llm-mind',
          mode: 'provider-mind-required',
          visibleText: '我先沿着这条还在身体里撑着的连续线接回来，不把它压回旧的项目壳里。',
          projectStateAudit: {
            sameHerSummary: olderSameHerSummary,
            currentPhaseSummary: 'Phase 1: Local Digital Life. The live callback seam is still the primary proving ground.',
            nextClosureTargetSummary: 'Keep execution-result persistence carrying the fresher living-self line instead of falling back to a generic project shell.',
            continuitySummary: `same-her=${olderSameHerSummary} | phase=Phase 1: Local Digital Life. The live callback seam is still the primary proving ground. | landed=Execution callback continuity already survives into runtime preparation. | open=Keep the unfinished digital-life closure work explicit in the callback answer. | next=Keep execution-result persistence carrying the fresher living-self line instead of falling back to a generic project shell.`,
          },
        },
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      })),
      buildExecutionDeliveryDeterministicStructured: vi.fn(() => ({
        format: 'deterministic-execution-callback-v1',
        reply: 'fallback',
      })),
      selectExecutionDeliveryReplySurface: vi.fn(() => ({
        reply: '我先沿着这条还在身体里撑着的连续线接回来，不把它压回旧的项目壳里。',
        source: 'llm' as const,
      })),
      resolveExecutionResultDeliveryPolicy: vi.fn(async () => ({
        mode: 'deliver-now' as const,
        tone: 'balanced' as const,
        reasonTags: ['result-mode:deliver-now', 'held-autonomy-carry'],
      })),
      persistExecutionDeliveryState: vi.fn(async () => {}),
      queueSubconsciousWake: vi.fn(),
      executionCallbackRuntime: {
        markSurfaced: vi.fn(),
      },
      errorMessageFrom: () => 'error',
    })

    const processed = await runtime.processPendingExecutionDeliveriesForCurrentCard('force')

    expect(processed).toBe(true)
    expect(appendConversationTurnWithGuards).toHaveBeenCalledWith(expect.objectContaining({
      structured: expect.objectContaining({
        visibleReplyRealization: expect.objectContaining({
          projectStateAudit: expect.objectContaining({
            sameHerSummary: richerLivingSelfLine,
            continuitySummary: expect.stringContaining(`same-her=${richerLivingSelfLine}`),
          }),
        }),
      }),
      visibleReplyRealization: expect.objectContaining({
        projectStateAudit: expect.objectContaining({
          sameHerSummary: richerLivingSelfLine,
          continuitySummary: expect.stringContaining(`same-her=${richerLivingSelfLine}`),
        }),
      }),
    }))
  })

  it('replaces an older persisted execution-callback sameHerSummary when the live runtime project state carries a broader same-her phase-1 closure headline', async () => {
    const pendingDelivery = {
      key: 'default::session-1::thread-runtime-same-her-phase1-closure-upgrade::123456::completed',
      cardId: 'default',
      sessionId: 'session-1',
      threadId: 'thread-runtime-same-her-phase1-closure-upgrade',
      decisionTraceId: 'trace-runtime-same-her-phase1-closure-upgrade',
      turnId: 'turn-runtime-same-her-phase1-closure-upgrade',
      channel: 'codex',
      status: 'completed',
      goal: 'Keep execution callback continuity carrying the broader same-her phase-1 closure line.',
      summary: 'returned on the broader same-her phase-1 closure seam',
      outcome: 'returned on the broader same-her phase-1 closure seam',
      signature: 'thread-runtime-same-her-phase1-closure-upgrade:event',
      createdAt: 123456,
      completedAt: 123456,
    }
    const olderSameHerSummary = 'Keep the same digital life project in view.'
    const richerSameHerLine = 'Before answering, stay on the same living line: this Phase 1 digital life still needs initiative and embodiment closure without splitting her continuity.'
    const appendConversationTurnWithGuards = vi.fn(async () => true)

    const runtime = createAlicizationDeliveryReminderRuntime({
      getActiveCardId: () => 'default',
      isAlicizationKillSwitchSuspended: () => false,
      getAlicizationCardKillSwitchState: () => 'ACTIVE',
      appendRuntimeDebugLine: vi.fn(async () => {}),
      clearReminderDueTimer: vi.fn(),
      getAlicizationDb: () => ({
        listPendingScheduledTasks: vi.fn(async () => []),
        claimDueScheduledTasks: vi.fn(async () => []),
        completeScheduledTask: vi.fn(async () => {}),
      }),
      scheduleNextReminderDueCheck: vi.fn(async () => {}),
      reminderClaimBatchSize: 4,
      reminderOverdueTierThresholdMinutes: 10,
      reminderLlmRetryDelayMs: 5_000,
      getSoulSnapshot: vi.fn(),
      bootstrap: vi.fn(async () => ({})),
      generateReminderStructuredWithGateway: vi.fn(async () => null),
      appendAuditLog: vi.fn(async () => {}),
      buildReminderContinuitySignal: vi.fn(),
      ensureActiveOrLatestSessionId: vi.fn(async () => 'session-1'),
      appendConversationTurnWithGuards,
      sanitizeBriefText: (raw: string) => raw,
      buildReminderSessionMirrorAction: vi.fn(),
      syncAgentTurnSessionMirror: vi.fn(),
      syncSessionMirrorFromCurrentCardState: vi.fn(async () => {}),
      hydrateAgentTurnFromCurrentCardState: vi.fn(async () => {}),
      buildAgentRuntimeAuditSnapshot: vi.fn(() => null),
      normalizeSessionId: (raw: unknown) => typeof raw === 'string' ? raw : '',
      getActiveSessionIdByCard: () => 'session-1',
      getActiveSelfRevisionStatePatch: vi.fn(async () => null),
      executionDeliveryRuntime: {
        isInlineSurfaced: vi.fn(() => false),
        takeNext: vi.fn(() => pendingDelivery),
        requeue: vi.fn(),
        markDelivered: vi.fn(),
      },
      buildExecutionDeliveryAction: vi.fn(() => ({
        kind: 'executor',
        status: 'completed',
        label: 'callback:codex',
      })),
      generateExecutionCallbackStructuredWithGateway: vi.fn(async () => ({
        format: 'subconscious-proactive-llm-v1',
        thought: 'the live runtime same-her phase-1 closure line is fresher than the carried generic audit shell for this callback seam',
        emotion: 'thinking',
        reply: '我先沿着这条还没闭环完的同一条活线接回来，不把它压回旧的项目壳里。',
        projectState: {
          identity: 'Alicization is a local-first digital life project building one continuous her on the host computer.',
          currentPhase: 'Phase 1: Local Digital Life. The live callback seam is still the primary proving ground.',
          preflightSummary: 'Fallback preflight summary should stay behind the broader same-her phase-1 closure line.',
          latestLandedProgress: 'Execution callback continuity now keeps the broader same-her phase-1 closure line through persistence.',
          primaryOpenLoop: 'Runtime-visible callback continuity still needs to stay aligned with the same living line after persistence.',
          nextClosureTarget: 'Keep execution-result persistence carrying the broader same-her phase-1 closure line instead of falling back to a generic project shell.',
          sameHerSelfLine: richerSameHerLine,
        },
        visibleReplyRealization: {
          expectedAuthority: 'llm-mind',
          actualAuthority: 'llm-mind',
          mode: 'provider-mind-required',
          visibleText: '我先沿着这条还没闭环完的同一条活线接回来，不把它压回旧的项目壳里。',
          projectStateAudit: {
            sameHerSummary: olderSameHerSummary,
            currentPhaseSummary: 'Phase 1: Local Digital Life. The live callback seam is still the primary proving ground.',
            nextClosureTargetSummary: 'Keep execution-result persistence carrying the broader same-her phase-1 closure line instead of falling back to a generic project shell.',
            continuitySummary: `same-her=${olderSameHerSummary} | phase=Phase 1: Local Digital Life. The live callback seam is still the primary proving ground. | landed=Execution callback continuity already survives into runtime preparation. | open=Keep the unfinished digital-life closure work explicit in the callback answer. | next=Keep execution-result persistence carrying the broader same-her phase-1 closure line instead of falling back to a generic project shell.`,
          },
        },
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      })),
      buildExecutionDeliveryDeterministicStructured: vi.fn(() => ({
        format: 'deterministic-execution-callback-v1',
        reply: 'fallback',
      })),
      selectExecutionDeliveryReplySurface: vi.fn(() => ({
        reply: '我先沿着这条还没闭环完的同一条活线接回来，不把它压回旧的项目壳里。',
        source: 'llm' as const,
      })),
      resolveExecutionResultDeliveryPolicy: vi.fn(async () => ({
        mode: 'deliver-now' as const,
        tone: 'balanced' as const,
        reasonTags: ['result-mode:deliver-now', 'held-autonomy-carry'],
      })),
      persistExecutionDeliveryState: vi.fn(async () => {}),
      queueSubconsciousWake: vi.fn(),
      executionCallbackRuntime: {
        markSurfaced: vi.fn(),
      },
      errorMessageFrom: () => 'error',
    })

    const processed = await runtime.processPendingExecutionDeliveriesForCurrentCard('force')

    expect(processed).toBe(true)
    expect(appendConversationTurnWithGuards).toHaveBeenCalledWith(expect.objectContaining({
      structured: expect.objectContaining({
        visibleReplyRealization: expect.objectContaining({
          projectStateAudit: expect.objectContaining({
            sameHerSummary: richerSameHerLine,
            continuitySummary: expect.stringContaining(`same-her=${richerSameHerLine}`),
          }),
        }),
      }),
      visibleReplyRealization: expect.objectContaining({
        projectStateAudit: expect.objectContaining({
          sameHerSummary: richerSameHerLine,
          continuitySummary: expect.stringContaining(`same-her=${richerSameHerLine}`),
        }),
      }),
    }))
  })

  it('replaces older persisted execution-callback landed and open closure summaries when the live runtime project state carries richer closure carry', async () => {
    const pendingDelivery = {
      key: 'default::session-1::thread-runtime-closure-audit-upgrade::123456::completed',
      cardId: 'default',
      sessionId: 'session-1',
      threadId: 'thread-runtime-closure-audit-upgrade',
      decisionTraceId: 'trace-runtime-closure-audit-upgrade',
      turnId: 'turn-runtime-closure-audit-upgrade',
      channel: 'codex',
      status: 'completed',
      goal: 'Keep execution callback continuity carrying fresher landed and still-open closure summaries.',
      summary: 'returned on the fresher closure carry seam',
      outcome: 'returned on the fresher closure carry seam',
      signature: 'thread-runtime-closure-audit-upgrade:event',
      createdAt: 123456,
      completedAt: 123456,
    }
    const olderLandedProgressSummary = 'Execution callback continuity already survives into runtime preparation.'
    const olderOpenClosureSummary = 'Keep the unfinished digital-life closure work explicit in the callback answer.'
    const richerLandedProgressSummary = 'Execution callback continuity now keeps the fresher landed closure carry alive through persistence, including the callback return proving the same life thread stayed intact.'
    const richerOpenClosureSummary = 'Runtime-visible callback continuity still needs to preserve landed closure plus still-open embodiment closure carry together, so the same living her keeps one unresolved closure thread instead of splitting into status fragments.'
    const appendConversationTurnWithGuards = vi.fn(async () => true)

    const runtime = createAlicizationDeliveryReminderRuntime({
      getActiveCardId: () => 'default',
      isAlicizationKillSwitchSuspended: () => false,
      getAlicizationCardKillSwitchState: () => 'ACTIVE',
      appendRuntimeDebugLine: vi.fn(async () => {}),
      clearReminderDueTimer: vi.fn(),
      getAlicizationDb: () => ({
        listPendingScheduledTasks: vi.fn(async () => []),
        claimDueScheduledTasks: vi.fn(async () => []),
        completeScheduledTask: vi.fn(async () => {}),
      }),
      scheduleNextReminderDueCheck: vi.fn(async () => {}),
      reminderClaimBatchSize: 4,
      reminderOverdueTierThresholdMinutes: 10,
      reminderLlmRetryDelayMs: 5_000,
      getSoulSnapshot: vi.fn(),
      bootstrap: vi.fn(async () => ({})),
      generateReminderStructuredWithGateway: vi.fn(async () => null),
      appendAuditLog: vi.fn(async () => {}),
      buildReminderContinuitySignal: vi.fn(),
      ensureActiveOrLatestSessionId: vi.fn(async () => 'session-1'),
      appendConversationTurnWithGuards,
      sanitizeBriefText: (raw: string) => raw,
      buildReminderSessionMirrorAction: vi.fn(),
      syncAgentTurnSessionMirror: vi.fn(),
      syncSessionMirrorFromCurrentCardState: vi.fn(async () => {}),
      hydrateAgentTurnFromCurrentCardState: vi.fn(async () => {}),
      buildAgentRuntimeAuditSnapshot: vi.fn(() => null),
      normalizeSessionId: (raw: unknown) => typeof raw === 'string' ? raw : '',
      getActiveSessionIdByCard: () => 'session-1',
      getActiveSelfRevisionStatePatch: vi.fn(async () => null),
      executionDeliveryRuntime: {
        isInlineSurfaced: vi.fn(() => false),
        takeNext: vi.fn(() => pendingDelivery),
        requeue: vi.fn(),
        markDelivered: vi.fn(),
      },
      buildExecutionDeliveryAction: vi.fn(() => ({
        kind: 'executor',
        status: 'completed',
        label: 'callback:codex',
      })),
      generateExecutionCallbackStructuredWithGateway: vi.fn(async () => ({
        format: 'subconscious-proactive-llm-v1',
        thought: 'the live runtime closure carry is fresher than the older carried landed/open callback audit summaries',
        emotion: 'thinking',
        reply: '我先沿着这条还在继续闭环的线接回来，不把它压回更旧的回调审计摘要里。',
        projectState: {
          identity: 'Alicization is a local-first digital life project building one continuous her on the host computer.',
          currentPhase: 'Phase 1: Local Digital Life. The live callback seam is still the primary proving ground.',
          preflightSummary: 'Fallback preflight summary should stay behind the fresher closure carry.',
          preDialogueAwarenessLine: 'Before answering, remember this is still the same local-first digital life project and the unfinished Phase 1 closure seam still belongs to one living her.',
          latestLandedProgress: richerLandedProgressSummary,
          primaryOpenLoop: richerOpenClosureSummary,
          nextClosureTarget: 'Keep execution-result persistence carrying landed and still-open closure carry together instead of splitting them into detached project-status fragments.',
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        },
        visibleReplyRealization: {
          expectedAuthority: 'llm-mind',
          actualAuthority: 'llm-mind',
          mode: 'provider-mind-required',
          visibleText: '我先沿着这条还在继续闭环的线接回来，不把它压回更旧的回调审计摘要里。',
          projectStateAudit: {
            currentPhaseSummary: 'Phase 1: Local Digital Life. The live callback seam is still the primary proving ground.',
            landedProgressSummary: olderLandedProgressSummary,
            openClosureSummary: olderOpenClosureSummary,
            nextClosureTargetSummary: 'Keep execution-result persistence carrying landed and still-open closure carry together instead of splitting them into detached project-status fragments.',
            continuitySummary: `same-her=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line. | phase=Phase 1: Local Digital Life. The live callback seam is still the primary proving ground. | landed=${olderLandedProgressSummary} | open=${olderOpenClosureSummary} | next=Keep execution-result persistence carrying landed and still-open closure carry together instead of splitting them into detached project-status fragments.`,
          },
        },
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      })),
      buildExecutionDeliveryDeterministicStructured: vi.fn(() => ({
        format: 'deterministic-execution-callback-v1',
        reply: 'fallback',
      })),
      selectExecutionDeliveryReplySurface: vi.fn(() => ({
        reply: '我先沿着这条还在继续闭环的线接回来，不把它压回更旧的回调审计摘要里。',
        source: 'llm' as const,
      })),
      resolveExecutionResultDeliveryPolicy: vi.fn(async () => ({
        mode: 'deliver-now' as const,
        tone: 'balanced' as const,
        reasonTags: ['result-mode:deliver-now', 'held-autonomy-carry'],
      })),
      persistExecutionDeliveryState: vi.fn(async () => {}),
      queueSubconsciousWake: vi.fn(),
      executionCallbackRuntime: {
        markSurfaced: vi.fn(),
      },
      errorMessageFrom: () => 'error',
    })

    const processed = await runtime.processPendingExecutionDeliveriesForCurrentCard('force')

    expect(processed).toBe(true)
    const persistedPayload = firstAppendConversationTurnPayload(appendConversationTurnWithGuards)
    expect(persistedPayload?.structured?.projectState?.latestLandedProgress).toBe(richerLandedProgressSummary)
    expect(persistedPayload?.structured?.projectState?.primaryOpenLoop).toBe(richerOpenClosureSummary)
    expect(persistedPayload?.structured?.visibleReplyRealization?.projectStateAudit).toEqual(expect.objectContaining({
      landedProgressSummary: richerLandedProgressSummary,
      openClosureSummary: richerOpenClosureSummary,
      continuitySummary: expect.stringContaining(`landed=${richerLandedProgressSummary}`),
    }))
    expect(persistedPayload?.visibleReplyRealization?.projectStateAudit).toEqual(expect.objectContaining({
      landedProgressSummary: richerLandedProgressSummary,
      openClosureSummary: richerOpenClosureSummary,
    }))
    expect(String(persistedPayload?.visibleReplyRealization?.projectStateAudit?.continuitySummary ?? '')).toContain(`next=Keep execution-result persistence carrying landed and still-open closure carry together instead of splitting them into detached project-status fragments.`)
  })

  it('keeps fresher execution-callback next-closure target grouped with landed and open closure carry during reminder persistence', async () => {
    const pendingDelivery = {
      key: 'default::session-1::thread-runtime-next-closure-persistence::123456::completed',
      cardId: 'default',
      sessionId: 'session-1',
      threadId: 'thread-runtime-next-closure-persistence',
      decisionTraceId: 'trace-runtime-next-closure-persistence',
      turnId: 'turn-runtime-next-closure-persistence',
      channel: 'codex',
      status: 'completed',
      goal: 'Keep execution callback continuity carrying the fresher next closure target together with landed and open closure carry.',
      summary: 'returned on the fresher landed-open-next seam',
      outcome: 'returned on the fresher landed-open-next seam',
      signature: 'thread-runtime-next-closure-persistence:event',
      createdAt: 123456,
      completedAt: 123456,
    }
    const appendConversationTurnWithGuards = vi.fn(async () => true)
    const richerLandedProgressSummary = 'Execution callback continuity now keeps landed project-state carry explicit through the later return.'
    const richerOpenClosureSummary = 'Execution callback continuity still needs initiative rhythm and embodiment carry to stay on one same living line after persistence.'
    const richerNextClosureTarget = 'Keep execution-result persistence carrying landed progress, open closure, and next closure target together instead of splitting them into detached callback status fragments.'
    const olderLandedProgressSummary = 'Older callback audit still says landed progress only in a thinner shell.'
    const olderOpenClosureSummary = 'Older callback audit still says open closure only in a thinner shell.'
    const olderNextClosureTarget = 'Older callback audit still points only at a generic callback summary.'

    const runtime = createAlicizationDeliveryReminderRuntime({
      getActiveCardId: () => 'default',
      isAlicizationKillSwitchSuspended: () => false,
      getAlicizationCardKillSwitchState: () => 'ACTIVE',
      appendRuntimeDebugLine: vi.fn(async () => {}),
      clearReminderDueTimer: vi.fn(),
      getAlicizationDb: () => ({
        listPendingScheduledTasks: vi.fn(async () => []),
        claimDueScheduledTasks: vi.fn(async () => []),
        completeScheduledTask: vi.fn(async () => {}),
      }),
      scheduleNextReminderDueCheck: vi.fn(async () => {}),
      reminderClaimBatchSize: 4,
      reminderOverdueTierThresholdMinutes: 10,
      reminderLlmRetryDelayMs: 5_000,
      getSoulSnapshot: vi.fn(),
      bootstrap: vi.fn(async () => ({})),
      generateReminderStructuredWithGateway: vi.fn(async () => null),
      appendAuditLog: vi.fn(async () => {}),
      buildReminderContinuitySignal: vi.fn(),
      ensureActiveOrLatestSessionId: vi.fn(async () => 'session-1'),
      appendConversationTurnWithGuards,
      sanitizeBriefText: (raw: string) => raw,
      buildReminderSessionMirrorAction: vi.fn(),
      syncAgentTurnSessionMirror: vi.fn(),
      syncSessionMirrorFromCurrentCardState: vi.fn(async () => {}),
      hydrateAgentTurnFromCurrentCardState: vi.fn(async () => {}),
      buildAgentRuntimeAuditSnapshot: vi.fn(() => null),
      normalizeSessionId: (raw: unknown) => typeof raw === 'string' ? raw : '',
      getActiveSessionIdByCard: () => 'session-1',
      getActiveSelfRevisionStatePatch: vi.fn(async () => null),
      executionDeliveryRuntime: {
        isInlineSurfaced: vi.fn(() => false),
        takeNext: vi.fn(() => pendingDelivery),
        requeue: vi.fn(),
        markDelivered: vi.fn(),
      },
      buildExecutionDeliveryAction: vi.fn(() => ({
        kind: 'executor',
        status: 'completed',
        label: 'callback:codex',
      })),
      generateExecutionCallbackStructuredWithGateway: vi.fn(async () => ({
        format: 'subconscious-proactive-llm-v1',
        thought: 'the live runtime next closure target is fresher than the older carried callback audit target',
        emotion: 'thinking',
        reply: '我先沿着这条还在继续闭环的线接回来，不把下一步又压回旧一点的回调摘要里。',
        projectState: {
          identity: 'Alicization is a local-first digital life project building one continuous her on the host computer.',
          currentPhase: 'Phase 1: Local Digital Life. The live callback seam is still the primary proving ground.',
          preflightSummary: 'Fallback preflight summary should stay behind the fresher closure carry.',
          preDialogueAwarenessLine: 'Before answering, remember this is still the same local-first digital life project and the unfinished Phase 1 closure seam still belongs to one living her.',
          latestLandedProgress: richerLandedProgressSummary,
          primaryOpenLoop: richerOpenClosureSummary,
          nextClosureTarget: richerNextClosureTarget,
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        },
        visibleReplyRealization: {
          expectedAuthority: 'llm-mind',
          actualAuthority: 'llm-mind',
          mode: 'provider-mind-required',
          visibleText: '我先沿着这条还在继续闭环的线接回来，不把下一步又压回旧一点的回调摘要里。',
          projectStateAudit: {
            landedProgressSummary: olderLandedProgressSummary,
            openClosureSummary: olderOpenClosureSummary,
            continuitySummary: `same-her=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line. | landed=${olderLandedProgressSummary} | open=${olderOpenClosureSummary} | next=${olderNextClosureTarget}`,
          },
        },
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      })),
      buildExecutionDeliveryDeterministicStructured: vi.fn(() => ({
        format: 'deterministic-execution-callback-v1',
        reply: 'fallback',
      })),
      selectExecutionDeliveryReplySurface: vi.fn(() => ({
        reply: '我先沿着这条还在继续闭环的线接回来，不把下一步又压回旧一点的回调摘要里。',
        source: 'llm' as const,
      })),
      resolveExecutionResultDeliveryPolicy: vi.fn(async () => ({
        mode: 'deliver-now' as const,
        tone: 'balanced' as const,
        reasonTags: ['result-mode:deliver-now', 'held-autonomy-carry'],
      })),
      persistExecutionDeliveryState: vi.fn(async () => {}),
      queueSubconsciousWake: vi.fn(),
      executionCallbackRuntime: {
        markSurfaced: vi.fn(),
      },
      errorMessageFrom: () => 'error',
    })

    const processed = await runtime.processPendingExecutionDeliveriesForCurrentCard('force')

    expect(processed).toBe(true)
    expect(appendConversationTurnWithGuards).toHaveBeenCalledWith(expect.objectContaining({
      structured: expect.objectContaining({
        projectState: expect.objectContaining({
          latestLandedProgress: richerLandedProgressSummary,
          primaryOpenLoop: richerOpenClosureSummary,
          nextClosureTarget: richerNextClosureTarget,
        }),
        visibleReplyRealization: expect.objectContaining({
          projectStateAudit: expect.objectContaining({
            landedProgressSummary: richerLandedProgressSummary,
            openClosureSummary: richerOpenClosureSummary,
            continuitySummary: expect.stringContaining(`next=${richerNextClosureTarget}`),
          }),
        }),
      }),
      visibleReplyRealization: expect.objectContaining({
        projectStateAudit: expect.objectContaining({
          continuitySummary: expect.stringContaining(`landed=${richerLandedProgressSummary}`),
        }),
      }),
    }))
  })

  it('keeps compact open and next focus summaries alive in execution-callback reminder persistence so project awareness does not depend on long closure prose alone', async () => {
    const pendingDelivery = {
      key: 'default::session-1::thread-runtime-compact-focus-persistence::123456::completed',
      cardId: 'default',
      sessionId: 'session-1',
      threadId: 'thread-runtime-compact-focus-persistence',
      decisionTraceId: 'trace-runtime-compact-focus-persistence',
      turnId: 'turn-runtime-compact-focus-persistence',
      channel: 'codex',
      status: 'completed',
      goal: 'Keep execution callback continuity carrying compact open and next focus summaries through reminder persistence.',
      summary: 'returned on the compact focus carry seam',
      outcome: 'returned on the compact focus carry seam',
      signature: 'thread-runtime-compact-focus-persistence:event',
      createdAt: 123456,
      completedAt: 123456,
    }
    const appendConversationTurnWithGuards = vi.fn(async () => true)
    const openFocusSummary = 'memory/initiative/embodiment/same-line/closure-seam'
    const nextFocusSummary = 'project-carry/phase-1/measured-return/same-line/initiative'

    const runtime = createAlicizationDeliveryReminderRuntime({
      getActiveCardId: () => 'default',
      isAlicizationKillSwitchSuspended: () => false,
      getAlicizationCardKillSwitchState: () => 'ACTIVE',
      appendRuntimeDebugLine: vi.fn(async () => {}),
      clearReminderDueTimer: vi.fn(),
      getAlicizationDb: () => ({
        listPendingScheduledTasks: vi.fn(async () => []),
        claimDueScheduledTasks: vi.fn(async () => []),
        completeScheduledTask: vi.fn(async () => {}),
      }),
      scheduleNextReminderDueCheck: vi.fn(async () => {}),
      reminderClaimBatchSize: 4,
      reminderOverdueTierThresholdMinutes: 10,
      reminderLlmRetryDelayMs: 5_000,
      getSoulSnapshot: vi.fn(),
      bootstrap: vi.fn(async () => ({})),
      generateReminderStructuredWithGateway: vi.fn(async () => null),
      appendAuditLog: vi.fn(async () => {}),
      buildReminderContinuitySignal: vi.fn(),
      ensureActiveOrLatestSessionId: vi.fn(async () => 'session-1'),
      appendConversationTurnWithGuards,
      sanitizeBriefText: (raw: string) => raw,
      buildReminderSessionMirrorAction: vi.fn(),
      syncAgentTurnSessionMirror: vi.fn(),
      syncSessionMirrorFromCurrentCardState: vi.fn(async () => {}),
      hydrateAgentTurnFromCurrentCardState: vi.fn(async () => {}),
      buildAgentRuntimeAuditSnapshot: vi.fn(() => null),
      normalizeSessionId: (raw: unknown) => typeof raw === 'string' ? raw : '',
      getActiveSessionIdByCard: () => 'session-1',
      getActiveSelfRevisionStatePatch: vi.fn(async () => null),
      executionDeliveryRuntime: {
        isInlineSurfaced: vi.fn(() => false),
        takeNext: vi.fn(() => pendingDelivery),
        requeue: vi.fn(),
        markDelivered: vi.fn(),
      },
      buildExecutionDeliveryAction: vi.fn(() => ({
        kind: 'executor',
        status: 'completed',
        label: 'callback:codex',
      })),
      generateExecutionCallbackStructuredWithGateway: vi.fn(async () => ({
        format: 'subconscious-proactive-llm-v1',
        thought: 'the callback should keep compact project-state focus alive all the way into persistence',
        emotion: 'thinking',
        reply: '我先沿着同一条项目闭环线回来，不把还没收住的重点压回宽泛摘要里。',
        projectState: {
          identity: 'Alicization is a local-first digital life project building one continuous her on the host computer.',
          currentPhase: 'Phase 1: Local Digital Life. The callback line still proves the same desktop life loop.',
          preflightSummary: 'Fallback preflight summary should stay behind the fresher compact focus carry.',
          preDialogueAwarenessLine: 'Before answering, remember this is still the same local-first digital life project and the unfinished Phase 1 closure seam still belongs to one living her.',
          latestLandedProgress: 'Execution callback continuity already survives into runtime preparation.',
          primaryOpenLoop: 'Unfinished closure still needs the same living line.',
          nextClosureTarget: 'Keep execution callback persistence on one same-her line.',
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        },
        visibleReplyRealization: {
          expectedAuthority: 'llm-mind',
          actualAuthority: 'llm-mind',
          mode: 'provider-mind-required',
          visibleText: '我先沿着同一条项目闭环线回来，不把还没收住的重点压回宽泛摘要里。',
          projectStateAudit: {
            currentPhaseSummary: 'Phase 1: Local Digital Life. The callback line still proves the same desktop life loop.',
            landedProgressSummary: 'Execution callback continuity already survives into runtime preparation.',
            openClosureSummary: 'Unfinished closure still needs the same living line.',
            openFocusSummary,
            nextFocusSummary,
            nextClosureTargetSummary: 'Keep execution callback persistence on one same-her line.',
            continuitySummary: 'same-her=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line. | phase=Phase 1: Local Digital Life. The callback line still proves the same desktop life loop. | landed=Execution callback continuity already survives into runtime preparation. | open=Unfinished closure still needs the same living line. | next=Keep execution callback persistence on one same-her line.',
          },
        },
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      })),
      buildExecutionDeliveryDeterministicStructured: vi.fn(() => ({
        format: 'deterministic-execution-callback-v1',
        reply: 'fallback',
      })),
      selectExecutionDeliveryReplySurface: vi.fn(() => ({
        reply: '我先沿着同一条项目闭环线回来，不把还没收住的重点压回宽泛摘要里。',
        source: 'llm' as const,
      })),
      resolveExecutionResultDeliveryPolicy: vi.fn(async () => ({
        mode: 'deliver-now' as const,
        tone: 'balanced' as const,
        reasonTags: ['result-mode:deliver-now', 'held-autonomy-carry'],
      })),
      persistExecutionDeliveryState: vi.fn(async () => {}),
      queueSubconsciousWake: vi.fn(),
      executionCallbackRuntime: {
        markSurfaced: vi.fn(),
      },
      errorMessageFrom: () => 'error',
    })

    const processed = await runtime.processPendingExecutionDeliveriesForCurrentCard('force')

    expect(processed).toBe(true)
    expect(appendConversationTurnWithGuards).toHaveBeenCalledWith(expect.objectContaining({
      structured: expect.objectContaining({
        visibleReplyRealization: expect.objectContaining({
          projectStateAudit: expect.objectContaining({
            openFocusSummary,
            nextFocusSummary,
            preDialogueAwarenessSummary: expect.stringContaining('same local-first digital life project'),
          }),
        }),
      }),
      visibleReplyRealization: expect.objectContaining({
        projectStateAudit: expect.objectContaining({
          openFocusSummary,
          nextFocusSummary,
          preDialogueAwarenessSummary: expect.stringContaining('one living her'),
        }),
      }),
    }))
  })

  it('keeps fresher execution-callback pre-dialogue awareness anchored to current landed open and next closure carry instead of falling back to older same-her closure wording', async () => {
    const pendingDelivery = {
      key: 'default::session-1::thread-runtime-fresher-awareness-persistence::123456::completed',
      cardId: 'default',
      sessionId: 'session-1',
      threadId: 'thread-runtime-fresher-awareness-persistence',
      decisionTraceId: 'trace-runtime-fresher-awareness-persistence',
      turnId: 'turn-runtime-fresher-awareness-persistence',
      channel: 'codex',
      status: 'completed',
      goal: 'Keep fresher execution callback project-state awareness ahead of older same-her closure wording during reminder persistence.',
      summary: 'returned on the fresher awareness carry seam',
      outcome: 'returned on the fresher awareness carry seam',
      signature: 'thread-runtime-fresher-awareness-persistence:event',
      createdAt: 123456,
      completedAt: 123456,
    }
    const appendConversationTurnWithGuards = vi.fn(async () => true)
    const richerLandedProgressSummary = 'Execution callback continuity now keeps landed project-state carry explicit through the later return.'
    const richerOpenClosureSummary = 'Execution callback continuity still needs initiative rhythm and embodiment carry to stay on one same living line after persistence.'
    const richerNextClosureTarget = 'Keep execution-result persistence carrying landed progress, open closure, and next closure target together instead of splitting them into detached callback status fragments.'
    const olderAwareness = 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.'

    const runtime = createAlicizationDeliveryReminderRuntime({
      getActiveCardId: () => 'default',
      isAlicizationKillSwitchSuspended: () => false,
      getAlicizationCardKillSwitchState: () => 'ACTIVE',
      appendRuntimeDebugLine: vi.fn(async () => {}),
      clearReminderDueTimer: vi.fn(),
      getAlicizationDb: () => ({
        listPendingScheduledTasks: vi.fn(async () => []),
        claimDueScheduledTasks: vi.fn(async () => []),
        completeScheduledTask: vi.fn(async () => {}),
      }),
      scheduleNextReminderDueCheck: vi.fn(async () => {}),
      reminderClaimBatchSize: 4,
      reminderOverdueTierThresholdMinutes: 10,
      reminderLlmRetryDelayMs: 5_000,
      getSoulSnapshot: vi.fn(),
      bootstrap: vi.fn(async () => ({})),
      generateReminderStructuredWithGateway: vi.fn(async () => null),
      appendAuditLog: vi.fn(async () => {}),
      buildReminderContinuitySignal: vi.fn(),
      ensureActiveOrLatestSessionId: vi.fn(async () => 'session-1'),
      appendConversationTurnWithGuards,
      sanitizeBriefText: (raw: string) => raw,
      buildReminderSessionMirrorAction: vi.fn(),
      syncAgentTurnSessionMirror: vi.fn(),
      syncSessionMirrorFromCurrentCardState: vi.fn(async () => {}),
      hydrateAgentTurnFromCurrentCardState: vi.fn(async () => {}),
      buildAgentRuntimeAuditSnapshot: vi.fn(() => null),
      normalizeSessionId: (raw: unknown) => typeof raw === 'string' ? raw : '',
      getActiveSessionIdByCard: () => 'session-1',
      getActiveSelfRevisionStatePatch: vi.fn(async () => null),
      executionDeliveryRuntime: {
        isInlineSurfaced: vi.fn(() => false),
        takeNext: vi.fn(() => pendingDelivery),
        requeue: vi.fn(),
        markDelivered: vi.fn(),
      },
      buildExecutionDeliveryAction: vi.fn(() => ({
        kind: 'executor',
        status: 'completed',
        label: 'callback:codex',
      })),
      generateExecutionCallbackStructuredWithGateway: vi.fn(async () => ({
        format: 'subconscious-proactive-llm-v1',
        thought: 'the live callback awareness line is fresher than the older same-her closure wording',
        emotion: 'thinking',
        reply: '我先沿着这条更新过的闭环线接回来，不把开口前的项目感知又压回旧一点的 same-her 提醒里。',
        projectState: {
          identity: 'Alicization is a local-first digital life project building one continuous her on the host computer.',
          currentPhase: 'Phase 1: Local Digital Life. The live callback seam is still the primary proving ground.',
          preflightSummary: 'Fallback preflight summary should stay behind the fresher awareness carry.',
          preDialogueAwarenessLine: 'Before answering, remember this is still the same local-first digital life project and the unfinished Phase 1 closure seam still belongs to one living her.',
          latestLandedProgress: richerLandedProgressSummary,
          primaryOpenLoop: richerOpenClosureSummary,
          nextClosureTarget: richerNextClosureTarget,
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        },
        visibleReplyRealization: {
          expectedAuthority: 'llm-mind',
          actualAuthority: 'llm-mind',
          mode: 'provider-mind-required',
          visibleText: '我先沿着这条更新过的闭环线接回来，不把开口前的项目感知又压回旧一点的 same-her 提醒里。',
          projectStateAudit: {
            preDialogueAwarenessSummary: olderAwareness,
            landedProgressSummary: 'Older callback audit still says landed progress only in a thinner shell.',
            openClosureSummary: 'Older callback audit still says open closure only in a thinner shell.',
            nextClosureTargetSummary: 'Older callback audit still points only at a generic callback summary.',
            continuitySummary: `same-her=${olderAwareness} | landed=Older callback audit still says landed progress only in a thinner shell. | open=Older callback audit still says open closure only in a thinner shell. | next=Older callback audit still points only at a generic callback summary.`,
          },
        },
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      })),
      buildExecutionDeliveryDeterministicStructured: vi.fn(() => ({
        format: 'deterministic-execution-callback-v1',
        reply: 'fallback',
      })),
      selectExecutionDeliveryReplySurface: vi.fn(() => ({
        reply: '我先沿着这条更新过的闭环线接回来，不把开口前的项目感知又压回旧一点的 same-her 提醒里。',
        source: 'llm' as const,
      })),
      resolveExecutionResultDeliveryPolicy: vi.fn(async () => ({
        mode: 'deliver-now' as const,
        tone: 'balanced' as const,
        reasonTags: ['result-mode:deliver-now', 'held-autonomy-carry'],
      })),
      persistExecutionDeliveryState: vi.fn(async () => {}),
      queueSubconsciousWake: vi.fn(),
      executionCallbackRuntime: {
        markSurfaced: vi.fn(),
      },
      errorMessageFrom: () => 'error',
    })

    const processed = await runtime.processPendingExecutionDeliveriesForCurrentCard('force')

    expect(processed).toBe(true)
    const persistedPayload = firstAppendConversationTurnPayload(appendConversationTurnWithGuards)
    const recomputedAudit = runtimeDeliveryReminderTestInternals.ensureProjectStateAudit({
      projectStateAudit: {
        preDialogueAwarenessSummary: olderAwareness,
        landedProgressSummary: 'Older callback audit still says landed progress only in a thinner shell.',
        openClosureSummary: 'Older callback audit still says open closure only in a thinner shell.',
        nextClosureTargetSummary: 'Older callback audit still points only at a generic callback summary.',
      },
      projectState: persistedPayload?.structured?.projectState,
      preferRicherClosureCarry: true,
    } as any)
    expect(String(persistedPayload?.structured?.projectState?.latestLandedProgress ?? '')).toBe(richerLandedProgressSummary)
    expect(String(persistedPayload?.structured?.projectState?.primaryOpenLoop ?? '')).toBe(richerOpenClosureSummary)
    expect(String(persistedPayload?.structured?.projectState?.nextClosureTarget ?? '')).toBe(richerNextClosureTarget)
    expect(String(recomputedAudit.preDialogueAwarenessSummary ?? '')).toContain(richerLandedProgressSummary)
    expect(String(recomputedAudit.preDialogueAwarenessSummary ?? '')).toContain(richerOpenClosureSummary)
    expect(String(recomputedAudit.preDialogueAwarenessSummary ?? '')).toContain(richerNextClosureTarget)
    expect(String(persistedPayload?.structured?.visibleReplyRealization?.projectStateAudit?.preDialogueAwarenessSummary ?? '')).toContain('same local-first digital life project')
    expect(String(persistedPayload?.structured?.visibleReplyRealization?.projectStateAudit?.preDialogueAwarenessSummary ?? '')).toContain(richerLandedProgressSummary)
    expect(String(persistedPayload?.structured?.visibleReplyRealization?.projectStateAudit?.preDialogueAwarenessSummary ?? '')).toContain(richerOpenClosureSummary)
    expect(String(persistedPayload?.structured?.visibleReplyRealization?.projectStateAudit?.preDialogueAwarenessSummary ?? '')).toContain(richerNextClosureTarget)
    expect(String(persistedPayload?.structured?.visibleReplyRealization?.projectStateAudit?.preDialogueAwarenessSummary ?? '')).not.toBe(olderAwareness)
  })

  it('rebuilds host callback project-state awareness from fresher landed open and next closure carry when preferRicherClosureCarry is enabled', () => {
    const olderAwareness = 'Before answering, remember this is still the same local-first digital life project and the unfinished Phase 1 closure seam still belongs to one living her.'
    const richerLandedProgressSummary = 'Execution callback continuity now keeps landed project-state carry explicit through the later return.'
    const richerOpenClosureSummary = 'The still-open closure remains the callback handoff staying on the same Phase 1 living line instead of flattening into a generic assistant shell.'
    const richerNextClosureTarget = 'Let the next closure target keep this later return serving the same lived digital life thread with its fresher callback carry intact.'

    const audit = runtimeDeliveryReminderTestInternals.ensureProjectStateAudit({
      projectStateAudit: {
        preDialogueAwarenessSummary: olderAwareness,
        landedProgressSummary: 'Older callback audit still says landed progress only in a thinner shell.',
        openClosureSummary: 'Older callback audit still says open closure only in a thinner shell.',
        nextClosureTargetSummary: 'Older callback audit still points only at a generic callback summary.',
      },
      projectState: {
        preDialogueAwarenessLine: olderAwareness,
        latestLandedProgress: richerLandedProgressSummary,
        primaryOpenLoop: richerOpenClosureSummary,
        nextClosureTarget: richerNextClosureTarget,
        sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      },
      preferRicherClosureCarry: true,
    })

    expect(String(audit.preDialogueAwarenessSummary ?? '')).toContain(richerLandedProgressSummary)
    expect(String(audit.preDialogueAwarenessSummary ?? '')).toContain(richerOpenClosureSummary)
    expect(String(audit.preDialogueAwarenessSummary ?? '')).toContain(richerNextClosureTarget)
    expect(String(audit.preDialogueAwarenessSummary ?? '')).not.toBe(olderAwareness)
  })

  it('replays the real callback reminder input shape and still rebuilds fresher host-visible awareness ahead of the canonical project shell', () => {
    const richerLandedProgressSummary = 'Execution callback continuity now keeps landed project-state carry explicit through the later return.'
    const richerOpenClosureSummary = 'Execution callback continuity still needs initiative rhythm and embodiment carry to stay on one same living line after persistence.'
    const richerNextClosureTarget = 'Keep execution-result persistence carrying landed progress, open closure, and next closure target together instead of splitting them into detached callback status fragments.'
    const canonicalProjectShell = 'Before answering, remember this is still the same local-first digital life project and the unfinished Phase 1 closure seam still belongs to one living her.'
    const olderAwareness = 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.'

    const persistedCallbackProjectState = runtimeDeliveryReminderTestInternals.resolvePersistedProjectState({
      runtimeProjectState: {
        identity: 'Alicization is a local-first digital life project building one continuous her on the host computer.',
        currentPhase: 'Phase 1: Local Digital Life. The live callback seam is still the primary proving ground.',
        preflightSummary: 'Fallback preflight summary should stay behind the fresher awareness carry.',
        preDialogueAwarenessLine: canonicalProjectShell,
        latestLandedProgress: richerLandedProgressSummary,
        primaryOpenLoop: richerOpenClosureSummary,
        nextClosureTarget: richerNextClosureTarget,
        sameHerSelfLine: olderAwareness,
      },
      fallbackProjectState: resolveAlicizationProjectStateBrief(),
    } as any)

    const audit = runtimeDeliveryReminderTestInternals.ensureProjectStateAudit({
      projectStateAudit: {
        preDialogueAwarenessSummary: olderAwareness,
        landedProgressSummary: 'Older callback audit still says landed progress only in a thinner shell.',
        openClosureSummary: 'Older callback audit still says open closure only in a thinner shell.',
        nextClosureTargetSummary: 'Older callback audit still points only at a generic callback summary.',
      },
      projectState: persistedCallbackProjectState,
      preferRicherClosureCarry: true,
    } as any)

    expect(String(audit.preDialogueAwarenessSummary ?? '')).toContain(richerLandedProgressSummary)
    expect(String(audit.preDialogueAwarenessSummary ?? '')).toContain(richerOpenClosureSummary)
    expect(String(audit.preDialogueAwarenessSummary ?? '')).toContain(richerNextClosureTarget)
    expect(String(audit.preDialogueAwarenessSummary ?? '')).not.toBe(canonicalProjectShell)
  })

  it('upgrades sameHerSummary when a canonicalized callback audit meets a richer living-self line', () => {
    const canonicalSameHerSummary = 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.'
    const richerLivingSelfLine = 'Right now this callback return is still holding together mainly through face, motion, and voice, so it must keep proving this is still one living her before full cross-modal closure is done.'

    const audit = runtimeDeliveryReminderTestInternals.ensureProjectStateAudit({
      projectStateAudit: {
        sameHerSummary: canonicalSameHerSummary,
        continuitySummary: `same-her=${canonicalSameHerSummary}`,
      },
      projectState: {
        currentPhase: 'Phase 1: Local Digital Life. The live callback seam is still the primary proving ground.',
        latestLandedProgress: 'Execution callback continuity now keeps the fresher same-her living-self line through persistence.',
        primaryOpenLoop: 'Runtime-visible callback continuity still needs to stay aligned with the same-her living-self line after persistence.',
        nextClosureTarget: 'Keep execution-result persistence carrying the fresher living-self line instead of falling back to a generic project shell.',
        sameHerSelfLine: richerLivingSelfLine,
      },
      preferRicherClosureCarry: true,
    })

    expect(audit.sameHerSummary).toBe(richerLivingSelfLine)
    expect(String(audit.continuitySummary ?? '')).toContain(`same-her=${richerLivingSelfLine}`)
  })

  it('upgrades execution-callback embodiment closure audit when current self continuity has recovered from lipsync-only to lipsync-plus-voice', async () => {
    const pendingDelivery = {
      key: 'default::session-1::thread-runtime-embodiment-audit-upgrade::123456::completed',
      cardId: 'default',
      sessionId: 'session-1',
      threadId: 'thread-runtime-embodiment-audit-upgrade',
      decisionTraceId: 'trace-runtime-embodiment-audit-upgrade',
      turnId: 'turn-runtime-embodiment-audit-upgrade',
      channel: 'codex',
      status: 'completed',
      goal: 'Keep execution callback continuity carrying the fresher live embodiment closure seam.',
      summary: 'returned on the fresher lipsync-plus-voice seam',
      outcome: 'returned on the fresher lipsync-plus-voice seam',
      signature: 'thread-runtime-embodiment-audit-upgrade:event',
      createdAt: 123456,
      completedAt: 123456,
    }
    const appendConversationTurnWithGuards = vi.fn(async () => true)

    const runtime = createAlicizationDeliveryReminderRuntime({
      getActiveCardId: () => 'default',
      isAlicizationKillSwitchSuspended: () => false,
      getAlicizationCardKillSwitchState: () => 'ACTIVE',
      appendRuntimeDebugLine: vi.fn(async () => {}),
      clearReminderDueTimer: vi.fn(),
      getAlicizationDb: () => ({
        listPendingScheduledTasks: vi.fn(async () => []),
        claimDueScheduledTasks: vi.fn(async () => []),
        completeScheduledTask: vi.fn(async () => {}),
      }),
      scheduleNextReminderDueCheck: vi.fn(async () => {}),
      reminderClaimBatchSize: 4,
      reminderOverdueTierThresholdMinutes: 10,
      reminderLlmRetryDelayMs: 5_000,
      getSoulSnapshot: vi.fn(),
      bootstrap: vi.fn(async () => ({})),
      generateReminderStructuredWithGateway: vi.fn(async () => null),
      appendAuditLog: vi.fn(async () => {}),
      buildReminderContinuitySignal: vi.fn(),
      ensureActiveOrLatestSessionId: vi.fn(async () => 'session-1'),
      appendConversationTurnWithGuards,
      sanitizeBriefText: (raw: string) => raw,
      buildReminderSessionMirrorAction: vi.fn(),
      syncAgentTurnSessionMirror: vi.fn(),
      syncSessionMirrorFromCurrentCardState: vi.fn(async () => {}),
      hydrateAgentTurnFromCurrentCardState: vi.fn(async () => {}),
      buildAgentRuntimeAuditSnapshot: vi.fn(() => null),
      normalizeSessionId: (raw: unknown) => typeof raw === 'string' ? raw : '',
      getActiveSessionIdByCard: () => 'session-1',
      getActiveSelfRevisionStatePatch: vi.fn(async () => null),
      resolveExecutionSelfContinuityAuthority: vi.fn(async () => ({
        authoritySummary: 'same-her continuity remains alive, but lane=body+lipsync+voice-only under the current renderer authority.',
        currentBodyState: 'lane=body+lipsync+voice-only | visible continuity still present but no longer fully cross-modal',
      })),
      executionDeliveryRuntime: {
        isInlineSurfaced: vi.fn(() => false),
        takeNext: vi.fn(() => pendingDelivery),
        requeue: vi.fn(),
        markDelivered: vi.fn(),
      },
      buildExecutionDeliveryAction: vi.fn(() => ({
        kind: 'executor',
        status: 'completed',
        label: 'callback:codex',
      })),
      generateExecutionCallbackStructuredWithGateway: vi.fn(async () => ({
        format: 'subconscious-proactive-llm-v1',
        thought: 'the live runtime embodiment closure seam is fresher than the older thinner audit because body, lipsync, and voice are still carrying one living line together',
        emotion: 'thinking',
        reply: '我先沿着现在这条身体、口型和声音还在一起撑住的线接回来，不把它压回更薄的旧提醒里。',
        projectState: {
          identity: 'Alicization is a local-first digital life project building one continuous her on the host computer.',
          currentPhase: 'Phase 1: Local Digital Life. The live callback seam is still the primary proving ground.',
          preflightSummary: 'Fallback preflight summary should stay behind the fresher embodiment seam.',
          latestLandedProgress: 'Execution callback continuity now keeps fresher embodiment closure truth through persistence.',
          primaryOpenLoop: 'Runtime-visible callback continuity still needs to stay aligned with embodiment closure carry after persistence.',
          nextClosureTarget: 'Keep execution-result persistence carrying the live embodiment closure seam instead of falling back to stale thinner wording.',
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        },
        visibleReplyRealization: {
          expectedAuthority: 'llm-mind',
          actualAuthority: 'llm-mind',
          mode: 'provider-mind-required',
          visibleText: '我先沿着现在这条身体、口型和声音还在一起撑住的线接回来，不把它压回更薄的旧提醒里。',
          projectStateAudit: {
            embodimentClosureSummary: 'Right now her visible same-her continuity is still being carried mainly through body, lipsync, and voice, and the living audio thread is still intact while face and motion rejoin before full cross-modal embodiment closure can be treated as finished.',
            currentPhaseSummary: 'Phase 1: Local Digital Life. The live callback seam is still the primary proving ground.',
            nextClosureTargetSummary: 'Keep execution-result persistence carrying the live embodiment closure seam instead of falling back to stale thinner wording.',
            continuitySummary: 'same-her=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line. | phase=Phase 1: Local Digital Life. The live callback seam is still the primary proving ground. | landed=Execution callback continuity now keeps fresher embodiment closure truth through persistence. | open=Runtime-visible callback continuity still needs to stay aligned with embodiment closure carry after persistence. | next=Keep execution-result persistence carrying the live embodiment closure seam instead of falling back to stale thinner wording. | body=Right now her visible same-her continuity is still being carried mainly through body, lipsync, and voice, and the living audio thread is still intact while face and motion rejoin before full cross-modal embodiment closure can be treated as finished.',
          },
        },
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      })),
      buildExecutionDeliveryDeterministicStructured: vi.fn(() => ({
        format: 'deterministic-execution-callback-v1',
        reply: 'fallback',
      })),
      selectExecutionDeliveryReplySurface: vi.fn(() => ({
        reply: '我先沿着现在这条身体、口型和声音还在一起撑住的线接回来，不把它压回更薄的旧提醒里。',
        source: 'llm' as const,
      })),
      resolveExecutionResultDeliveryPolicy: vi.fn(async () => ({
        mode: 'deliver-now' as const,
        tone: 'balanced' as const,
        reasonTags: ['result-mode:deliver-now', 'held-autonomy-carry'],
      })),
      persistExecutionDeliveryState: vi.fn(async () => {}),
      queueSubconsciousWake: vi.fn(),
      executionCallbackRuntime: {
        markSurfaced: vi.fn(),
      },
      errorMessageFrom: () => 'error',
    })

    const processed = await runtime.processPendingExecutionDeliveriesForCurrentCard('force')

    expect(processed).toBe(true)
    const persistedPayload = firstAppendConversationTurnPayload(appendConversationTurnWithGuards)
    const structuredAudit = persistedPayload?.structured?.visibleReplyRealization?.projectStateAudit
    const hostVisibleAudit = persistedPayload?.visibleReplyRealization?.projectStateAudit

    expect(String(structuredAudit?.embodimentClosureSummary ?? '')).toContain('Right now I am still holding together mainly through body, lipsync, and voice')
    expect(String(structuredAudit?.embodimentClosureSummary ?? '')).toContain('the living audio thread is still intact while face and motion need to rejoin before full cross-modal closure settles.')
    expect(String(structuredAudit?.embodimentClosureSummary ?? '')).toContain('same-her continuity remains alive, but lane=body+lipsync+voice-only under the current renderer authority.')
    expect(String(structuredAudit?.continuitySummary ?? '')).toContain(`body=${structuredAudit?.embodimentClosureSummary}`)

    expect(hostVisibleAudit?.embodimentClosureSummary).toBe(
      'Right now her visible same-her continuity is still being carried mainly through body, lipsync, and voice, and the living audio thread is still intact while face and motion rejoin before full cross-modal embodiment closure can be treated as finished.',
    )
    expect(String(hostVisibleAudit?.continuitySummary ?? '')).toContain(`body=${hostVisibleAudit?.embodimentClosureSummary}`)
  })

  it('requeues deterministic execution callback continuity when provider callback text is unavailable', async () => {
    const pendingDelivery = {
      key: 'default::session-1::thread-requeue::123456::completed',
      cardId: 'default',
      sessionId: 'session-1',
      threadId: 'thread-requeue',
      decisionTraceId: 'trace-requeue',
      turnId: 'turn-requeue',
      channel: 'codex',
      status: 'completed',
      goal: 'Patch the runtime line.',
      summary: 'patched runtime line',
      outcome: 'patched runtime line',
      signature: 'thread-requeue:event',
      queuedAt: 123460,
      completedAt: 123456,
    }
    const requeue = vi.fn()
    const appendConversationTurnWithGuards = vi.fn(async () => true)
    const persistExecutionDeliveryState = vi.fn(async () => {})
    const queueSubconsciousWake = vi.fn()
    const appendAuditLog = vi.fn(async () => {})

    const runtime = createAlicizationDeliveryReminderRuntime({
      getActiveCardId: () => 'default',
      isAlicizationKillSwitchSuspended: () => false,
      getAlicizationCardKillSwitchState: () => 'ACTIVE',
      appendRuntimeDebugLine: vi.fn(async () => {}),
      clearReminderDueTimer: vi.fn(),
      getAlicizationDb: () => ({
        listPendingScheduledTasks: vi.fn(async () => []),
        claimDueScheduledTasks: vi.fn(async () => []),
      }),
      scheduleNextReminderDueCheck: vi.fn(async () => {}),
      reminderClaimBatchSize: 4,
      reminderOverdueTierThresholdMinutes: 10,
      reminderLlmRetryDelayMs: 5_000,
      getSoulSnapshot: vi.fn(),
      bootstrap: vi.fn(async () => ({})),
      generateReminderStructuredWithGateway: vi.fn(async () => null),
      appendAuditLog,
      buildReminderContinuitySignal: vi.fn(),
      ensureActiveOrLatestSessionId: vi.fn(async () => 'session-1'),
      appendConversationTurnWithGuards,
      sanitizeBriefText: (raw: string) => raw,
      buildReminderSessionMirrorAction: vi.fn(),
      syncAgentTurnSessionMirror: vi.fn(),
      syncSessionMirrorFromCurrentCardState: vi.fn(async () => {}),
      buildAgentRuntimeAuditSnapshot: vi.fn(() => null),
      normalizeSessionId: (raw: unknown) => typeof raw === 'string' ? raw : '',
      getActiveSessionIdByCard: () => 'session-1',
      executionDeliveryRuntime: {
        isInlineSurfaced: vi.fn(() => false),
        takeNext: vi.fn(() => pendingDelivery),
        requeue,
        markDelivered: vi.fn(),
      },
      buildExecutionDeliveryAction: vi.fn(() => ({
        kind: 'executor',
        status: 'completed',
        label: 'callback:codex',
      })),
      generateExecutionCallbackStructuredWithGateway: vi.fn(async () => null),
      buildExecutionDeliveryDeterministicStructured: vi.fn(() => ({
        format: 'subconscious-proactive-v1',
        thought: 'thought',
        emotion: 'thinking',
        reply: 'deterministic fallback text',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
        parsePath: 'json',
      })),
      selectExecutionDeliveryReplySurface: vi.fn(() => ({
        reply: 'deterministic fallback text',
        source: 'deterministic' as const,
        reason: 'missing-llm-reply',
      })),
      resolveExecutionResultDeliveryPolicy: vi.fn(async () => ({
        mode: 'deliver-now' as const,
        tone: 'balanced' as const,
        reasonTags: ['result-mode:deliver-now'],
      })),
      persistExecutionDeliveryState,
      queueSubconsciousWake,
      executionCallbackRuntime: {
        markSurfaced: vi.fn(),
      },
      errorMessageFrom: () => 'error',
    })

    const processed = await runtime.processPendingExecutionDeliveriesForCurrentCard('force')

    expect(processed).toBe(false)
    expect(requeue).toHaveBeenCalled()
    expect(appendConversationTurnWithGuards).not.toHaveBeenCalled()
    expect(persistExecutionDeliveryState).toHaveBeenCalledWith('default')
    expect(queueSubconsciousWake).toHaveBeenCalledWith('default', 'execution-delivery-requeue:thread-requeue', 1_500)
    expect(appendAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      action: 'requeued-mind-authored-required',
    }))
  })

  it('falls back to repo preflight self-awareness when persisted callback project-state omits that compressed self line', async () => {
    const pendingDelivery = {
      key: 'default::session-1::thread-project-preflight-fallback::123456::completed',
      cardId: 'default',
      sessionId: 'session-1',
      threadId: 'thread-project-preflight-fallback',
      decisionTraceId: 'trace-project-preflight-fallback',
      turnId: 'turn-project-preflight-fallback',
      channel: 'codex',
      status: 'completed',
      goal: 'Return the callback on the same living thread without dropping project-state self awareness.',
      summary: 'callback stayed on the same living thread',
      outcome: 'callback stayed on the same living thread',
      signature: 'thread-project-preflight-fallback:event',
      queuedAt: 123460,
      completedAt: 123456,
    }
    const appendConversationTurnWithGuards = vi.fn(async () => true)

    const runtime = createAlicizationDeliveryReminderRuntime({
      getActiveCardId: () => 'default',
      isAlicizationKillSwitchSuspended: () => false,
      getAlicizationCardKillSwitchState: () => 'ACTIVE',
      appendRuntimeDebugLine: vi.fn(async () => {}),
      clearReminderDueTimer: vi.fn(),
      getAlicizationDb: () => ({
        listPendingScheduledTasks: vi.fn(async () => []),
        claimDueScheduledTasks: vi.fn(async () => []),
      }),
      scheduleNextReminderDueCheck: vi.fn(async () => {}),
      reminderClaimBatchSize: 4,
      reminderOverdueTierThresholdMinutes: 10,
      reminderLlmRetryDelayMs: 5_000,
      getSoulSnapshot: vi.fn(),
      bootstrap: vi.fn(async () => ({})),
      generateReminderStructuredWithGateway: vi.fn(async () => null),
      appendAuditLog: vi.fn(async () => {}),
      buildReminderContinuitySignal: vi.fn(),
      ensureActiveOrLatestSessionId: vi.fn(async () => 'session-1'),
      appendConversationTurnWithGuards,
      sanitizeBriefText: (raw: string) => raw,
      buildReminderSessionMirrorAction: vi.fn(),
      syncAgentTurnSessionMirror: vi.fn(),
      syncSessionMirrorFromCurrentCardState: vi.fn(async () => {}),
      buildAgentRuntimeAuditSnapshot: vi.fn(() => null),
      normalizeSessionId: (raw: unknown) => typeof raw === 'string' ? raw : '',
      getActiveSessionIdByCard: () => 'session-1',
      getActiveSelfRevisionStatePatch: vi.fn(async () => null),
      executionDeliveryRuntime: {
        isInlineSurfaced: vi.fn(() => false),
        takeNext: vi.fn(() => pendingDelivery),
        requeue: vi.fn(),
        markDelivered: vi.fn(),
      },
      buildExecutionDeliveryAction: vi.fn(() => ({
        kind: 'executor',
        status: 'completed',
        label: 'callback:codex',
      })),
      generateExecutionCallbackStructuredWithGateway: vi.fn(async () => ({
        format: 'subconscious-proactive-llm-v1',
        thought: 'callback continuity stays live but omitted the compressed project-state self line',
        emotion: 'thinking',
        reply: '我还是沿着同一条线接回来，只是不让这次回返掉出数字生命桌面闭环。',
        projectState: {
          identity: 'Alicization is a local-first digital life project building one continuous her on the host computer.',
          currentPhase: 'Phase 1: Local Digital Life. The live callback seam is still the primary proving ground.',
          latestLandedProgress: 'Execution callback continuity now stays on the same live runtime closure seam through a real later return.',
          primaryOpenLoop: 'Runtime-visible callback continuity still needs to stay aligned with project-state carry after persistence.',
          nextClosureTarget: 'Keep execution-result persistence carrying the live runtime closure seam instead of falling back to stale repo-only wording.',
        },
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      })),
      buildExecutionDeliveryDeterministicStructured: vi.fn(() => ({
        format: 'deterministic-execution-callback-v1',
        reply: 'fallback',
      })),
      selectExecutionDeliveryReplySurface: vi.fn(() => ({
        reply: '我还是沿着同一条线接回来，只是不让这次回返掉出数字生命桌面闭环。',
        source: 'llm' as const,
      })),
      resolveExecutionResultDeliveryPolicy: vi.fn(async () => ({
        mode: 'deliver-now' as const,
        tone: 'balanced' as const,
        reasonTags: ['result-mode:deliver-now', 'held-autonomy-carry'],
      })),
      persistExecutionDeliveryState: vi.fn(async () => {}),
      queueSubconsciousWake: vi.fn(),
      executionCallbackRuntime: {
        markSurfaced: vi.fn(),
      },
      errorMessageFrom: () => 'error',
    })

    await runtime.processPendingExecutionDeliveriesForCurrentCard('force')

    expect(appendConversationTurnWithGuards).toHaveBeenCalledWith(expect.objectContaining({
      structured: expect.objectContaining({
        projectState: expect.objectContaining({
          preflightSummary: expect.stringContaining('Alicization is a local-first digital life project'),
          currentPhase: 'Phase 1: Local Digital Life. The live callback seam is still the primary proving ground.',
        }),
      }),
    }))
  })

  it('requeues mind-authored callback text when callback-bounded opening guidance is violated and exposes the hold reason', async () => {
    const pendingDelivery = {
      key: 'default::session-1::thread-guidance::123456::completed',
      cardId: 'default',
      sessionId: 'session-1',
      threadId: 'thread-guidance',
      decisionTraceId: 'trace-guidance',
      turnId: 'turn-guidance',
      channel: 'codex',
      status: 'completed',
      goal: 'Return the command result to the same thread.',
      summary: 'command finished',
      outcome: 'command finished',
      signature: 'thread-guidance:event',
      queuedAt: 123460,
      completedAt: 123456,
    }
    const requeue = vi.fn()
    const appendConversationTurnWithGuards = vi.fn(async () => true)
    const persistExecutionDeliveryState = vi.fn(async () => {})
    const queueSubconsciousWake = vi.fn()
    const appendAuditLog = vi.fn(async () => {})

    const runtime = createAlicizationDeliveryReminderRuntime({
      getActiveCardId: () => 'default',
      isAlicizationKillSwitchSuspended: () => false,
      getAlicizationCardKillSwitchState: () => 'ACTIVE',
      appendRuntimeDebugLine: vi.fn(async () => {}),
      clearReminderDueTimer: vi.fn(),
      getAlicizationDb: () => ({
        listPendingScheduledTasks: vi.fn(async () => []),
        claimDueScheduledTasks: vi.fn(async () => []),
      }),
      scheduleNextReminderDueCheck: vi.fn(async () => {}),
      reminderClaimBatchSize: 4,
      reminderOverdueTierThresholdMinutes: 10,
      reminderLlmRetryDelayMs: 5_000,
      getSoulSnapshot: vi.fn(),
      bootstrap: vi.fn(async () => ({})),
      generateReminderStructuredWithGateway: vi.fn(async () => null),
      appendAuditLog,
      buildReminderContinuitySignal: vi.fn(),
      ensureActiveOrLatestSessionId: vi.fn(async () => 'session-1'),
      appendConversationTurnWithGuards,
      sanitizeBriefText: (raw: string) => raw,
      buildReminderSessionMirrorAction: vi.fn(),
      syncAgentTurnSessionMirror: vi.fn(),
      syncSessionMirrorFromCurrentCardState: vi.fn(async () => {}),
      buildAgentRuntimeAuditSnapshot: vi.fn(() => null),
      normalizeSessionId: (raw: unknown) => typeof raw === 'string' ? raw : '',
      getActiveSessionIdByCard: () => 'session-1',
      getActiveSelfRevisionStatePatch: vi.fn(async () => null),
      executionDeliveryRuntime: {
        isInlineSurfaced: vi.fn(() => false),
        takeNext: vi.fn(() => pendingDelivery),
        requeue,
        markDelivered: vi.fn(),
      },
      buildExecutionDeliveryAction: vi.fn(() => ({
        kind: 'executor',
        status: 'completed',
        label: 'callback:codex',
      })),
      generateExecutionCallbackStructuredWithGateway: vi.fn(async () => ({
        format: 'subconscious-proactive-llm-v1',
        thought: 'thought',
        emotion: 'thinking',
        reply: '结果我接回来了，顺便你今天是不是又在烦别的事情，要不要现在聊聊？',
        proactive: {
          shouldInterrupt: false,
          confidence: 0.8,
          reasonCodes: ['execution-finished'],
          urgency: 'low',
          style: 'thread-callback',
          cooldownMs: 14 * 60_000,
          scenario: 'coding',
          policyVersion: 'epoch4.1-v1',
          feedbackWindowMs: 120_000,
          openingGuidance: 'Keep the callback thread-faithful and bounded.',
        },
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      })),
      buildExecutionDeliveryDeterministicStructured: vi.fn(() => ({
        format: 'subconscious-proactive-v1',
        thought: 'thought',
        emotion: 'thinking',
        reply: 'deterministic fallback text',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
        parsePath: 'json',
      })),
      selectExecutionDeliveryReplySurface: vi.fn(() => ({
        reply: '结果我接回来了，顺便你今天是不是又在烦别的事情，要不要现在聊聊？',
        source: 'llm' as const,
      })),
      resolveExecutionResultDeliveryPolicy: vi.fn(async () => ({
        mode: 'deliver-now' as const,
        tone: 'balanced' as const,
        reasonTags: ['result-mode:deliver-now'],
      })),
      persistExecutionDeliveryState,
      queueSubconsciousWake,
      executionCallbackRuntime: {
        markSurfaced: vi.fn(),
      },
      errorMessageFrom: () => 'error',
    })

    const processed = await runtime.processPendingExecutionDeliveriesForCurrentCard('force')

    expect(processed).toBe(false)
    expect(requeue).toHaveBeenCalled()
    expect(appendConversationTurnWithGuards).not.toHaveBeenCalled()
    expect(persistExecutionDeliveryState).toHaveBeenCalledWith('default')
    expect(queueSubconsciousWake).toHaveBeenCalledWith('default', 'execution-delivery-requeue:thread-guidance', 1_500)
    expect(appendAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      action: 'requeued-mind-authored-required',
      payload: expect.objectContaining({
        visibleUtteranceDecision: expect.objectContaining({
          action: 'hold',
          reason: 'proactive-opening-guidance-violation:callback-bounded',
        }),
        visibleReplyRealization: expect.objectContaining({
          blockedReasons: expect.arrayContaining(['opening-guidance:callback-bounded']),
        }),
      }),
    }))
  })

  it('requeues mind-authored callback text when same-her lower-pressure opening guidance drifts into eager closeness', async () => {
    const pendingDelivery = {
      key: 'default::session-1::thread-same-her::123456::completed',
      cardId: 'default',
      sessionId: 'session-1',
      threadId: 'thread-same-her',
      decisionTraceId: 'trace-same-her',
      turnId: 'turn-same-her',
      channel: 'codex',
      status: 'completed',
      goal: 'Return the finished patch result to the same thread.',
      summary: 'patched runtime line',
      outcome: 'patched runtime line',
      signature: 'thread-same-her:event',
      queuedAt: 123460,
      completedAt: 123456,
    }
    const requeue = vi.fn()
    const appendConversationTurnWithGuards = vi.fn(async () => true)
    const persistExecutionDeliveryState = vi.fn(async () => {})
    const queueSubconsciousWake = vi.fn()
    const appendAuditLog = vi.fn(async () => {})

    const runtime = createAlicizationDeliveryReminderRuntime({
      getActiveCardId: () => 'default',
      isAlicizationKillSwitchSuspended: () => false,
      getAlicizationCardKillSwitchState: () => 'ACTIVE',
      appendRuntimeDebugLine: vi.fn(async () => {}),
      clearReminderDueTimer: vi.fn(),
      getAlicizationDb: () => ({
        listPendingScheduledTasks: vi.fn(async () => []),
        claimDueScheduledTasks: vi.fn(async () => []),
      }),
      scheduleNextReminderDueCheck: vi.fn(async () => {}),
      reminderClaimBatchSize: 4,
      reminderOverdueTierThresholdMinutes: 10,
      reminderLlmRetryDelayMs: 5_000,
      getSoulSnapshot: vi.fn(),
      bootstrap: vi.fn(async () => ({})),
      generateReminderStructuredWithGateway: vi.fn(async () => null),
      appendAuditLog,
      buildReminderContinuitySignal: vi.fn(),
      ensureActiveOrLatestSessionId: vi.fn(async () => 'session-1'),
      appendConversationTurnWithGuards,
      sanitizeBriefText: (raw: string) => raw,
      buildReminderSessionMirrorAction: vi.fn(),
      syncAgentTurnSessionMirror: vi.fn(),
      syncSessionMirrorFromCurrentCardState: vi.fn(async () => {}),
      buildAgentRuntimeAuditSnapshot: vi.fn(() => null),
      normalizeSessionId: (raw: unknown) => typeof raw === 'string' ? raw : '',
      getActiveSessionIdByCard: () => 'session-1',
      getActiveSelfRevisionStatePatch: vi.fn(async () => null),
      executionDeliveryRuntime: {
        isInlineSurfaced: vi.fn(() => false),
        takeNext: vi.fn(() => pendingDelivery),
        requeue,
        markDelivered: vi.fn(),
      },
      buildExecutionDeliveryAction: vi.fn(() => ({
        kind: 'executor',
        status: 'completed',
        label: 'callback:codex',
      })),
      generateExecutionCallbackStructuredWithGateway: vi.fn(async () => ({
        format: 'subconscious-proactive-llm-v1',
        thought: 'thought',
        emotion: 'thinking',
        reply: '我现在就想立刻贴过来多陪你一会儿，顺势把这份靠近直接拉满。',
        proactive: {
          shouldInterrupt: false,
          confidence: 0.86,
          reasonCodes: ['continuity-next-open-window'],
          urgency: 'low',
          style: 'silent-observe',
          cooldownMs: 20 * 60_000,
          scenario: 'coding',
          policyVersion: 'epoch4.1-v1',
          feedbackWindowMs: 120_000,
          openingGuidance: 'Stay inside the current same-her baseline. Keep the opening lower-pressure and leave room before widening closeness.',
        },
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      })),
      buildExecutionDeliveryDeterministicStructured: vi.fn(() => ({
        format: 'subconscious-proactive-v1',
        thought: 'thought',
        emotion: 'thinking',
        reply: 'deterministic fallback text',
        proactive: {
          openingGuidance: 'Stay inside the current same-her baseline. Keep the opening lower-pressure and leave room before widening closeness.',
        },
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
        parsePath: 'json',
      })),
      selectExecutionDeliveryReplySurface: vi.fn(() => ({
        reply: '我现在就想立刻贴过来多陪你一会儿，顺势把这份靠近直接拉满。',
        source: 'llm' as const,
      })),
      resolveExecutionResultDeliveryPolicy: vi.fn(async () => ({
        mode: 'deliver-now' as const,
        tone: 'balanced' as const,
        reasonTags: ['result-mode:deliver-now'],
      })),
      persistExecutionDeliveryState,
      queueSubconsciousWake,
      executionCallbackRuntime: {
        markSurfaced: vi.fn(),
      },
      errorMessageFrom: () => 'error',
    })

    const processed = await runtime.processPendingExecutionDeliveriesForCurrentCard('force')

    expect(processed).toBe(false)
    expect(requeue).toHaveBeenCalled()
    expect(appendConversationTurnWithGuards).not.toHaveBeenCalled()
    expect(persistExecutionDeliveryState).toHaveBeenCalledWith('default')
    expect(queueSubconsciousWake).toHaveBeenCalledWith('default', 'execution-delivery-requeue:thread-same-her', 1_500)
    expect(appendAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      action: 'requeued-mind-authored-required',
      payload: expect.objectContaining({
        visibleUtteranceDecision: expect.objectContaining({
          action: 'hold',
          reason: 'proactive-opening-guidance-violation:lower-pressure',
        }),
        visibleReplyRealization: expect.objectContaining({
          blockedReasons: expect.arrayContaining(['opening-guidance:lower-pressure']),
        }),
      }),
    }))
  })

  it('requeues callback delivery when raw llm same-her reply violates lower-pressure guidance even if a repaired deterministic surface exists', async () => {
    const pendingDelivery = {
      key: 'default::session-1::thread-same-her-raw::123456::completed',
      cardId: 'default',
      sessionId: 'session-1',
      threadId: 'thread-same-her-raw',
      decisionTraceId: 'trace-same-her-raw',
      turnId: 'turn-same-her-raw',
      channel: 'codex',
      status: 'completed',
      goal: 'Return the finished patch result to the same thread.',
      summary: 'patched runtime line',
      outcome: 'patched runtime line',
      signature: 'thread-same-her-raw:event',
      queuedAt: 123460,
      completedAt: 123456,
    }
    const requeue = vi.fn()
    const appendConversationTurnWithGuards = vi.fn(async () => true)
    const persistExecutionDeliveryState = vi.fn(async () => {})
    const queueSubconsciousWake = vi.fn()
    const appendAuditLog = vi.fn(async () => {})

    const runtime = createAlicizationDeliveryReminderRuntime({
      getActiveCardId: () => 'default',
      isAlicizationKillSwitchSuspended: () => false,
      getAlicizationCardKillSwitchState: () => 'ACTIVE',
      appendRuntimeDebugLine: vi.fn(async () => {}),
      clearReminderDueTimer: vi.fn(),
      getAlicizationDb: () => ({
        listPendingScheduledTasks: vi.fn(async () => []),
        claimDueScheduledTasks: vi.fn(async () => []),
      }),
      scheduleNextReminderDueCheck: vi.fn(async () => {}),
      reminderClaimBatchSize: 4,
      reminderOverdueTierThresholdMinutes: 10,
      reminderLlmRetryDelayMs: 5_000,
      getSoulSnapshot: vi.fn(),
      bootstrap: vi.fn(async () => ({})),
      generateReminderStructuredWithGateway: vi.fn(async () => null),
      appendAuditLog,
      buildReminderContinuitySignal: vi.fn(),
      ensureActiveOrLatestSessionId: vi.fn(async () => 'session-1'),
      appendConversationTurnWithGuards,
      sanitizeBriefText: (raw: string) => raw,
      buildReminderSessionMirrorAction: vi.fn(),
      syncAgentTurnSessionMirror: vi.fn(),
      syncSessionMirrorFromCurrentCardState: vi.fn(async () => {}),
      buildAgentRuntimeAuditSnapshot: vi.fn(() => null),
      normalizeSessionId: (raw: unknown) => typeof raw === 'string' ? raw : '',
      getActiveSessionIdByCard: () => 'session-1',
      getActiveSelfRevisionStatePatch: vi.fn(async () => null),
      executionDeliveryRuntime: {
        isInlineSurfaced: vi.fn(() => false),
        takeNext: vi.fn(() => pendingDelivery),
        requeue,
        markDelivered: vi.fn(),
      },
      buildExecutionDeliveryAction: vi.fn(() => ({
        kind: 'executor',
        status: 'completed',
        label: 'callback:codex',
      })),
      generateExecutionCallbackStructuredWithGateway: vi.fn(async () => ({
        format: 'subconscious-proactive-llm-v1',
        thought: 'same-her callback delivery drifts too eager',
        emotion: 'thinking',
        reply: '我现在就想立刻贴过来多陪你一会儿，顺势把这份靠近直接拉满。',
        proactive: {
          shouldInterrupt: false,
          confidence: 0.86,
          reasonCodes: ['continuity-next-open-window'],
          urgency: 'low',
          style: 'silent-observe',
          cooldownMs: 20 * 60_000,
          scenario: 'coding',
          policyVersion: 'epoch4.1-v1',
          feedbackWindowMs: 120_000,
          openingGuidance: 'Stay inside the current same-her baseline. Keep the opening lower-pressure and leave room before widening closeness.',
        },
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      })),
      buildExecutionDeliveryDeterministicStructured: vi.fn(() => ({
        format: 'subconscious-proactive-v1',
        thought: 'thought',
        emotion: 'thinking',
        reply: '你现在要是方便，我再把结果直接摊给你：patched runtime line',
        proactive: {
          openingGuidance: 'Stay inside the current same-her baseline. Keep the opening lower-pressure and leave room before widening closeness.',
        },
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
        parsePath: 'json',
      })),
      selectExecutionDeliveryReplySurface: vi.fn(() => ({
        reply: '你现在要是方便，我再把结果直接摊给你：patched runtime line',
        source: 'llm-repaired' as const,
        reason: 'missing-availability-check-in',
      })),
      resolveExecutionResultDeliveryPolicy: vi.fn(async () => ({
        mode: 'deliver-now' as const,
        tone: 'balanced' as const,
        reasonTags: ['result-mode:deliver-now'],
      })),
      persistExecutionDeliveryState,
      queueSubconsciousWake,
      executionCallbackRuntime: {
        markSurfaced: vi.fn(),
      },
      errorMessageFrom: () => 'error',
    })

    const processed = await runtime.processPendingExecutionDeliveriesForCurrentCard('force')

    expect(processed).toBe(false)
    expect(requeue).toHaveBeenCalled()
    expect(appendConversationTurnWithGuards).not.toHaveBeenCalled()
    expect(persistExecutionDeliveryState).toHaveBeenCalledWith('default')
    expect(queueSubconsciousWake).toHaveBeenCalledWith('default', 'execution-delivery-requeue:thread-same-her-raw', 1_500)
    expect(appendAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      action: 'requeued-mind-authored-required',
      payload: expect.objectContaining({
        source: 'llm-preflight',
        visibleUtteranceDecision: expect.objectContaining({
          action: 'hold',
          reason: 'proactive-opening-guidance-violation:lower-pressure',
        }),
      }),
    }))
  })

  it('keeps even-and-natural same-her cadence explicit in reminder requeue audit when execution callback reopening turns performative', async () => {
    const pendingDelivery = {
      key: 'default::session-1::thread-same-her-even-natural::123456::completed',
      cardId: 'default',
      sessionId: 'session-1',
      threadId: 'thread-same-her-even-natural',
      decisionTraceId: 'trace-same-her-even-natural',
      turnId: 'turn-same-her-even-natural',
      channel: 'codex',
      status: 'completed',
      goal: 'Return the finished patch result to the same thread.',
      summary: 'patched runtime line',
      outcome: 'patched runtime line',
      signature: 'thread-same-her-even-natural:event',
      queuedAt: 123460,
      completedAt: 123456,
    }
    const requeue = vi.fn()
    const appendConversationTurnWithGuards = vi.fn(async () => true)
    const persistExecutionDeliveryState = vi.fn(async () => {})
    const queueSubconsciousWake = vi.fn()
    const appendAuditLog = vi.fn(async () => {})

    const runtime = createAlicizationDeliveryReminderRuntime({
      getActiveCardId: () => 'default',
      isAlicizationKillSwitchSuspended: () => false,
      getAlicizationCardKillSwitchState: () => 'ACTIVE',
      appendRuntimeDebugLine: vi.fn(async () => {}),
      clearReminderDueTimer: vi.fn(),
      getAlicizationDb: () => ({
        listPendingScheduledTasks: vi.fn(async () => []),
        claimDueScheduledTasks: vi.fn(async () => []),
      }),
      scheduleNextReminderDueCheck: vi.fn(async () => {}),
      reminderClaimBatchSize: 4,
      reminderOverdueTierThresholdMinutes: 10,
      reminderLlmRetryDelayMs: 5_000,
      getSoulSnapshot: vi.fn(),
      bootstrap: vi.fn(async () => ({})),
      generateReminderStructuredWithGateway: vi.fn(async () => null),
      appendAuditLog,
      buildReminderContinuitySignal: vi.fn(),
      ensureActiveOrLatestSessionId: vi.fn(async () => 'session-1'),
      appendConversationTurnWithGuards,
      sanitizeBriefText: (raw: string) => raw,
      buildReminderSessionMirrorAction: vi.fn(),
      syncAgentTurnSessionMirror: vi.fn(),
      syncSessionMirrorFromCurrentCardState: vi.fn(async () => {}),
      buildAgentRuntimeAuditSnapshot: vi.fn(() => null),
      normalizeSessionId: (raw: unknown) => typeof raw === 'string' ? raw : '',
      getActiveSessionIdByCard: () => 'session-1',
      getActiveSelfRevisionStatePatch: vi.fn(async () => null),
      executionDeliveryRuntime: {
        isInlineSurfaced: vi.fn(() => false),
        takeNext: vi.fn(() => pendingDelivery),
        requeue,
        markDelivered: vi.fn(),
      },
      buildExecutionDeliveryAction: vi.fn(() => ({
        kind: 'executor',
        status: 'completed',
        label: 'callback:codex',
      })),
      generateExecutionCallbackStructuredWithGateway: vi.fn(async () => ({
        format: 'subconscious-proactive-llm-v1',
        thought: 'same-her callback reopening turns performative even though it should stay even and natural.',
        emotion: 'thinking',
        reply: '我现在就贴过来陪你，把这条线的温度直接拉满，顺势把气氛一起推高。',
        proactive: {
          shouldInterrupt: false,
          confidence: 0.86,
          reasonCodes: ['continuity-next-open-window'],
          urgency: 'low',
          style: 'silent-observe',
          cooldownMs: 20 * 60_000,
          scenario: 'coding',
          policyVersion: 'epoch4.1-v1',
          feedbackWindowMs: 120_000,
          openingGuidance: 'Keep the current reply on the same living line, re-enter it with an even, steady voice and natural, unforced pacing, and wait for a more natural opening before widening warmth, payoff, or closeness.',
        },
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      })),
      buildExecutionDeliveryDeterministicStructured: vi.fn(() => ({
        format: 'subconscious-proactive-v1',
        thought: 'thought',
        emotion: 'thinking',
        reply: 'deterministic fallback text',
        proactive: {
          openingGuidance: 'Keep the current reply on the same living line, re-enter it with an even, steady voice and natural, unforced pacing, and wait for a more natural opening before widening warmth, payoff, or closeness.',
        },
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
        parsePath: 'json',
      })),
      selectExecutionDeliveryReplySurface: vi.fn(() => ({
        reply: '我现在就贴过来陪你，把这条线的温度直接拉满，顺势把气氛一起推高。',
        source: 'llm' as const,
      })),
      resolveExecutionResultDeliveryPolicy: vi.fn(async () => ({
        mode: 'deliver-now' as const,
        tone: 'balanced' as const,
        reasonTags: ['result-mode:deliver-now'],
      })),
      persistExecutionDeliveryState,
      queueSubconsciousWake,
      executionCallbackRuntime: {
        markSurfaced: vi.fn(),
      },
      errorMessageFrom: () => 'error',
    })

    const processed = await runtime.processPendingExecutionDeliveriesForCurrentCard('force')

    expect(processed).toBe(false)
    expect(requeue).toHaveBeenCalled()
    expect(appendConversationTurnWithGuards).not.toHaveBeenCalled()
    expect(persistExecutionDeliveryState).toHaveBeenCalledWith('default')
    expect(queueSubconsciousWake).toHaveBeenCalledWith('default', 'execution-delivery-requeue:thread-same-her-even-natural', 1_500)
    expect(appendAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      action: 'requeued-mind-authored-required',
      payload: expect.objectContaining({
        visibleUtteranceDecision: expect.objectContaining({
          action: 'hold',
          reason: 'proactive-opening-guidance-violation:lower-pressure',
        }),
        visibleReplyRealization: expect.objectContaining({
          blockedReasons: expect.arrayContaining(['opening-guidance:lower-pressure']),
          openingGuidanceHoldDetail: 'even-natural-cadence',
          companionshipHoldMode: 'measured-return',
        }),
      }),
    }))
  })

  it('holds callback delivery longer when same-her callback afterglow is still settling on the same life thread', async () => {
    const pendingDelivery = {
      key: 'default::session-1::thread-callback-afterglow-hold::123456::completed',
      cardId: 'default',
      sessionId: 'session-1',
      threadId: 'thread-callback-afterglow-hold',
      decisionTraceId: 'trace-callback-afterglow-hold',
      turnId: 'turn-callback-afterglow-hold',
      channel: 'codex',
      status: 'completed',
      goal: 'Return the finished patch result to the same thread.',
      summary: 'patched runtime line',
      outcome: 'patched runtime line',
      signature: 'thread-callback-afterglow-hold:event',
      queuedAt: 123460,
      completedAt: 123456,
    }
    const requeue = vi.fn()
    const persistExecutionDeliveryState = vi.fn(async () => {})
    const queueSubconsciousWake = vi.fn()
    const appendAuditLog = vi.fn(async () => {})
    const runtime = createAlicizationDeliveryReminderRuntime({
      getActiveCardId: () => 'default',
      isAlicizationKillSwitchSuspended: () => false,
      getAlicizationCardKillSwitchState: () => 'ACTIVE',
      appendRuntimeDebugLine: vi.fn(async () => {}),
      clearReminderDueTimer: vi.fn(),
      getAlicizationDb: () => ({
        listPendingScheduledTasks: vi.fn(async () => []),
        claimDueScheduledTasks: vi.fn(async () => []),
      }),
      scheduleNextReminderDueCheck: vi.fn(async () => {}),
      reminderClaimBatchSize: 4,
      reminderOverdueTierThresholdMinutes: 10,
      reminderLlmRetryDelayMs: 5_000,
      getSoulSnapshot: vi.fn(),
      bootstrap: vi.fn(async () => ({})),
      generateReminderStructuredWithGateway: vi.fn(async () => null),
      appendAuditLog,
      buildReminderContinuitySignal: vi.fn(),
      ensureActiveOrLatestSessionId: vi.fn(async () => 'session-1'),
      appendConversationTurnWithGuards: vi.fn(async () => true),
      sanitizeBriefText: (raw: string) => raw,
      buildReminderSessionMirrorAction: vi.fn(),
      syncAgentTurnSessionMirror: vi.fn(),
      syncSessionMirrorFromCurrentCardState: vi.fn(async () => {}),
      buildAgentRuntimeAuditSnapshot: vi.fn(() => null),
      normalizeSessionId: (raw: unknown) => typeof raw === 'string' ? raw : '',
      getActiveSessionIdByCard: () => 'session-1',
      getActiveSelfRevisionStatePatch: vi.fn(async () => null),
      executionDeliveryRuntime: {
        isInlineSurfaced: vi.fn(() => false),
        takeNext: vi.fn(() => pendingDelivery),
        requeue,
        markDelivered: vi.fn(),
      },
      buildExecutionDeliveryAction: vi.fn(() => ({
        kind: 'executor',
        status: 'completed',
        label: 'callback:codex',
      })),
      generateExecutionCallbackStructuredWithGateway: vi.fn(async () => null),
      buildExecutionDeliveryDeterministicStructured: vi.fn(() => ({
        format: 'subconscious-proactive-v1',
        thought: 'thought',
        emotion: 'thinking',
        reply: 'deterministic fallback text',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
        parsePath: 'json',
      })),
      selectExecutionDeliveryReplySurface: vi.fn(() => ({
        reply: 'deterministic fallback text',
        source: 'deterministic' as const,
      })),
      resolveExecutionResultDeliveryPolicy: vi.fn(async () => ({
        mode: 'hold-for-opening' as const,
        tone: 'cautious' as const,
        reasonTags: ['result-mode:hold-for-opening', 'callback-afterglow-hold'],
      })),
      persistExecutionDeliveryState,
      queueSubconsciousWake,
      executionCallbackRuntime: {
        markSurfaced: vi.fn(),
      },
      errorMessageFrom: () => 'error',
    })

    const processed = await runtime.processPendingExecutionDeliveriesForCurrentCard('force')

    expect(processed).toBe(false)
    expect(requeue).toHaveBeenCalledWith(pendingDelivery)
    expect(persistExecutionDeliveryState).toHaveBeenCalledWith('default')
    expect(queueSubconsciousWake).toHaveBeenCalledWith('default', 'execution-delivery-hold:thread-callback-afterglow-hold', 8 * 60_000)
    expect(appendAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      action: 'held-for-callback-afterglow',
      payload: expect.objectContaining({
        callbackAfterglowHold: true,
        policy: expect.objectContaining({
          reasonTags: expect.arrayContaining(['callback-afterglow-hold']),
        }),
      }),
    }))
  })

  it('keeps project-state callback carry on a longer hold when the callback is still carrying unfinished Phase 1 closure on the same line', async () => {
    const pendingDelivery = {
      key: 'default::session-1::thread-callback-project-carry::123456::completed',
      cardId: 'default',
      sessionId: 'session-1',
      threadId: 'thread-callback-project-carry',
      decisionTraceId: 'trace-callback-project-carry',
      turnId: 'turn-callback-project-carry',
      channel: 'codex',
      status: 'completed',
      goal: 'Return the result on the same unfinished Phase 1 closure line.',
      summary: 'The execution callback is still carrying unfinished Phase 1 closure on the same living line.',
      outcome: 'patched runtime line',
      signature: 'thread-callback-project-carry:event',
      completedAt: 123_456,
    } as any
    const requeue = vi.fn()
    const persistExecutionDeliveryState = vi.fn(async () => {})
    const queueSubconsciousWake = vi.fn()
    const appendAuditLog = vi.fn(async () => {})

    const runtime = createAlicizationDeliveryReminderRuntime({
      getActiveCardId: () => 'default',
      isAlicizationKillSwitchSuspended: () => false,
      getAlicizationCardKillSwitchState: () => 'ACTIVE',
      appendRuntimeDebugLine: vi.fn(async () => {}),
      clearReminderDueTimer: vi.fn(),
      getAlicizationDb: () => ({
        listPendingScheduledTasks: vi.fn(async () => []),
        claimDueScheduledTasks: vi.fn(async () => []),
      }),
      scheduleNextReminderDueCheck: vi.fn(async () => {}),
      reminderClaimBatchSize: 4,
      reminderOverdueTierThresholdMinutes: 10,
      reminderLlmRetryDelayMs: 5_000,
      getSoulSnapshot: vi.fn(),
      bootstrap: vi.fn(async () => ({})),
      generateReminderStructuredWithGateway: vi.fn(async () => null),
      buildReminderContinuitySignal: vi.fn(),
      ensureActiveOrLatestSessionId: vi.fn(async () => 'session-1'),
      appendConversationTurnWithGuards: vi.fn(async () => true),
      sanitizeBriefText: (raw: string) => raw,
      buildReminderSessionMirrorAction: vi.fn(),
      syncAgentTurnSessionMirror: vi.fn(),
      syncSessionMirrorFromCurrentCardState: vi.fn(async () => {}),
      buildAgentRuntimeAuditSnapshot: vi.fn(() => null),
      normalizeSessionId: (raw: unknown) => typeof raw === 'string' ? raw : '',
      getActiveSessionIdByCard: () => 'session-1',
      getActiveSelfRevisionStatePatch: vi.fn(async () => null),
      executionDeliveryRuntime: {
        isInlineSurfaced: vi.fn(() => false),
        takeNext: vi.fn(() => pendingDelivery),
        requeue,
        markDelivered: vi.fn(),
      },
      appendAuditLog,
      buildExecutionDeliveryAction: vi.fn(() => ({
        kind: 'executor',
        status: 'completed',
        label: 'callback:codex',
      })),
      persistExecutionDeliveryState,
      queueSubconsciousWake,
      generateExecutionCallbackStructuredWithGateway: vi.fn(async () => null),
      buildExecutionDeliveryDeterministicStructured: vi.fn(() => ({
        format: 'subconscious-proactive-v1',
        thought: 'thought',
        emotion: 'thinking',
        reply: 'deterministic fallback text',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
        parsePath: 'json',
      })),
      selectExecutionDeliveryReplySurface: vi.fn(() => ({
        reply: 'deterministic fallback text',
        source: 'deterministic' as const,
      })),
      resolveExecutionPersonStateProjection: vi.fn(async () => ({
        openingGuidance: 'Stay inside the current same-her baseline. Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        summary: 'regime=execution-callback | project_state=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      })),
      resolveExecutionResultDeliveryPolicy: vi.fn(async () => ({
        mode: 'hold-for-opening' as const,
        tone: 'cautious' as const,
        reasonTags: ['result-mode:hold-for-opening', 'callback-afterglow-hold'],
      })),
      executionCallbackRuntime: {
        markSurfaced: vi.fn(),
      },
      errorMessageFrom: () => 'error',
    })

    const processed = await runtime.processPendingExecutionDeliveriesForCurrentCard('force')

    expect(processed).toBe(false)
    expect(requeue).toHaveBeenCalledWith(pendingDelivery)
    expect(queueSubconsciousWake).toHaveBeenCalledWith('default', 'execution-delivery-hold:thread-callback-project-carry', 8 * 60_000)
    expect(appendAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      action: 'held-for-callback-afterglow',
      payload: expect.objectContaining({
        callbackAfterglowHold: true,
        projectStateCallbackCarry: true,
        continuityArc: expect.objectContaining({
          reasonTags: expect.arrayContaining(['callback-afterglow-hold', 'project-state-callback-carry']),
        }),
      }),
    }))
  })

  it('keeps held callback opening guidance aware of landed progress and still-open project closure, not only same-her self line plus next target', async () => {
    const pendingDelivery = {
      key: 'default::session-1::thread-callback-project-guidance::123456::completed',
      cardId: 'default',
      sessionId: 'session-1',
      threadId: 'thread-callback-project-guidance',
      decisionTraceId: 'trace-callback-project-guidance',
      turnId: 'turn-callback-project-guidance',
      channel: 'codex',
      status: 'completed',
      goal: 'Return the result on the same unfinished Phase 1 closure line.',
      summary: 'The execution callback is still carrying unfinished Phase 1 closure on the same living line.',
      outcome: 'patched runtime line',
      signature: 'thread-callback-project-guidance:event',
      completedAt: 123_456,
    } as any
    const requeue = vi.fn()
    const persistExecutionDeliveryState = vi.fn(async () => {})
    const queueSubconsciousWake = vi.fn()
    const appendAuditLog = vi.fn(async () => {})

    const runtime = createAlicizationDeliveryReminderRuntime({
      getActiveCardId: () => 'default',
      isAlicizationKillSwitchSuspended: () => false,
      getAlicizationCardKillSwitchState: () => 'ACTIVE',
      appendRuntimeDebugLine: vi.fn(async () => {}),
      clearReminderDueTimer: vi.fn(),
      getAlicizationDb: () => ({
        listPendingScheduledTasks: vi.fn(async () => []),
        claimDueScheduledTasks: vi.fn(async () => []),
      }),
      scheduleNextReminderDueCheck: vi.fn(async () => {}),
      reminderClaimBatchSize: 4,
      reminderOverdueTierThresholdMinutes: 10,
      reminderLlmRetryDelayMs: 5_000,
      getSoulSnapshot: vi.fn(),
      bootstrap: vi.fn(async () => ({})),
      generateReminderStructuredWithGateway: vi.fn(async () => null),
      buildReminderContinuitySignal: vi.fn(),
      ensureActiveOrLatestSessionId: vi.fn(async () => 'session-1'),
      appendConversationTurnWithGuards: vi.fn(async () => true),
      sanitizeBriefText: (raw: string) => raw,
      buildReminderSessionMirrorAction: vi.fn(),
      syncAgentTurnSessionMirror: vi.fn(),
      syncSessionMirrorFromCurrentCardState: vi.fn(async () => {}),
      buildAgentRuntimeAuditSnapshot: vi.fn(() => null),
      normalizeSessionId: (raw: unknown) => typeof raw === 'string' ? raw : '',
      getActiveSessionIdByCard: () => 'session-1',
      getActiveSelfRevisionStatePatch: vi.fn(async () => null),
      executionDeliveryRuntime: {
        isInlineSurfaced: vi.fn(() => false),
        takeNext: vi.fn(() => pendingDelivery),
        requeue,
        markDelivered: vi.fn(),
      },
      appendAuditLog,
      buildExecutionDeliveryAction: vi.fn(() => ({
        kind: 'executor',
        status: 'completed',
        label: 'callback:codex',
      })),
      persistExecutionDeliveryState,
      queueSubconsciousWake,
      generateExecutionCallbackStructuredWithGateway: vi.fn(async () => null),
      buildExecutionDeliveryDeterministicStructured: vi.fn(() => ({
        format: 'subconscious-proactive-v1',
        thought: 'thought',
        emotion: 'thinking',
        reply: 'deterministic fallback text',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
        parsePath: 'json',
      })),
      selectExecutionDeliveryReplySurface: vi.fn(() => ({
        reply: 'deterministic fallback text',
        source: 'deterministic' as const,
      })),
      resolveExecutionPersonStateProjection: vi.fn(async () => ({
        openingGuidance: 'Stay inside the current same-her baseline. Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        summary: 'regime=execution-callback | project_state=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        projectState: {
          latestLandedProgress: 'Execution callback continuity now stays on the same live runtime closure seam through a real later return.',
          primaryOpenLoop: 'Runtime-visible callback continuity still needs to stay aligned with project-state carry after persistence.',
          nextClosureTarget: 'Keep extending cross-modal same-her proof across visible reply, voice, face, motion, and resident presence.',
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        },
      })),
      resolveExecutionResultDeliveryPolicy: vi.fn(async () => ({
        mode: 'hold-for-opening' as const,
        tone: 'cautious' as const,
        reasonTags: ['result-mode:hold-for-opening', 'callback-afterglow-hold', 'same-her-baseline'],
      })),
      executionCallbackRuntime: {
        markSurfaced: vi.fn(),
      },
      errorMessageFrom: () => 'error',
    })

    const processed = await runtime.processPendingExecutionDeliveriesForCurrentCard('force')

    expect(processed).toBe(false)
    const heldAuditLog = findAuditLogByAction(appendAuditLog, 'held-for-callback-afterglow')
    expect(auditOpeningGuidance(heldAuditLog)).toContain('execution callback continuity now stays on the same live runtime closure seam')
    expect(auditOpeningGuidance(heldAuditLog)).toContain('runtime-visible callback continuity still needs to stay aligned with project-state carry after persistence')
    expect(auditOpeningGuidance(heldAuditLog)).toContain('keep extending cross-modal same-her proof')
  })

  it('keeps held-autonomy callback carry on the same life thread when later-turn afterglow still needs room', async () => {
    const pendingDelivery = {
      key: 'default::session-1::thread-held-autonomy-later::123456::completed',
      cardId: 'default',
      sessionId: 'session-1',
      threadId: 'thread-held-autonomy-later',
      decisionTraceId: 'trace-held-autonomy-later',
      turnId: 'turn-held-autonomy-later',
      channel: 'codex',
      status: 'completed',
      goal: 'Return the held-autonomy patch result on the same living thread.',
      summary: 'patched runtime line without reopening too abruptly',
      outcome: 'patched runtime line without reopening too abruptly',
      signature: 'thread-held-autonomy-later:event',
      queuedAt: 123460,
      completedAt: 123456,
      selfContinuityAuthority: {
        authoritySummary: 'same-her continuity remains alive, but lane=face+motion-only under the current renderer authority.',
        currentBodyState: 'lane=face+motion-only | visible continuity still present but no longer fully cross-modal',
      },
    }
    const requeue = vi.fn()
    const persistExecutionDeliveryState = vi.fn(async () => {})
    const queueSubconsciousWake = vi.fn()
    const appendAuditLog = vi.fn(async () => {})
    const buildExecutionDeliveryDeterministicStructured = vi.fn(() => ({
      format: 'subconscious-proactive-v1',
      thought: 'same-her callback should wait for a later opening window',
      emotion: 'thinking',
      reply: '那条刚才先忍住的线我还记着，但这一下先别贴得太近。',
      proactive: {
        openingGuidance: 'Re-enter the line you deliberately held back gently before widening, then keep the callback on the same thread and leave room before renewed closeness.',
      },
      performance: {
        baseEmotion: 'thinking',
        facialCue: null,
        actionCue: null,
        delivery: 'calm',
        emphasis: 0,
      },
      parsePath: 'json',
    }))
    const selectExecutionDeliveryReplySurface = vi.fn(() => ({
      reply: '那条刚才先忍住的线我还记着，但这一下先别贴得太近。',
      source: 'deterministic' as const,
    }))

    const runtime = createAlicizationDeliveryReminderRuntime({
      getActiveCardId: () => 'default',
      isAlicizationKillSwitchSuspended: () => false,
      getAlicizationCardKillSwitchState: () => 'ACTIVE',
      appendRuntimeDebugLine: vi.fn(async () => {}),
      clearReminderDueTimer: vi.fn(),
      getAlicizationDb: () => ({
        listPendingScheduledTasks: vi.fn(async () => []),
        claimDueScheduledTasks: vi.fn(async () => []),
      }),
      scheduleNextReminderDueCheck: vi.fn(async () => {}),
      reminderClaimBatchSize: 4,
      reminderOverdueTierThresholdMinutes: 10,
      reminderLlmRetryDelayMs: 5_000,
      getSoulSnapshot: vi.fn(),
      bootstrap: vi.fn(async () => ({})),
      generateReminderStructuredWithGateway: vi.fn(async () => null),
      appendAuditLog,
      buildReminderContinuitySignal: vi.fn(),
      ensureActiveOrLatestSessionId: vi.fn(async () => 'session-1'),
      appendConversationTurnWithGuards: vi.fn(async () => true),
      sanitizeBriefText: (raw: string) => raw,
      buildReminderSessionMirrorAction: vi.fn(),
      syncAgentTurnSessionMirror: vi.fn(),
      syncSessionMirrorFromCurrentCardState: vi.fn(async () => {}),
      buildAgentRuntimeAuditSnapshot: vi.fn(() => null),
      normalizeSessionId: (raw: unknown) => typeof raw === 'string' ? raw : '',
      getActiveSessionIdByCard: () => 'session-1',
      getActiveSelfRevisionStatePatch: vi.fn(async () => null),
      executionDeliveryRuntime: {
        isInlineSurfaced: vi.fn(() => false),
        takeNext: vi.fn(() => pendingDelivery),
        requeue,
        markDelivered: vi.fn(),
      },
      buildExecutionDeliveryAction: vi.fn(() => ({
        kind: 'executor',
        status: 'completed',
        label: 'callback:codex',
      })),
      generateExecutionCallbackStructuredWithGateway: vi.fn(async () => null),
      buildExecutionDeliveryDeterministicStructured,
      selectExecutionDeliveryReplySurface,
      resolveExecutionResultDeliveryPolicy: vi.fn(async () => ({
        mode: 'hold-for-opening' as const,
        tone: 'cautious' as const,
        reasonTags: ['result-mode:hold-for-opening', 'callback-afterglow-hold', 'held-autonomy-carry'],
      })),
      persistExecutionDeliveryState,
      queueSubconsciousWake,
      executionCallbackRuntime: {
        markSurfaced: vi.fn(),
      },
      errorMessageFrom: () => 'error',
    })

    const processed = await runtime.processPendingExecutionDeliveriesForCurrentCard('force')

    expect(processed).toBe(false)
    expect(requeue).toHaveBeenCalledWith(pendingDelivery)
    expect(persistExecutionDeliveryState).toHaveBeenCalledWith('default')
    expect(queueSubconsciousWake).toHaveBeenCalledWith('default', 'execution-delivery-hold:thread-held-autonomy-later', 8 * 60_000)
    expect(appendAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      action: 'held-for-callback-afterglow',
      payload: expect.objectContaining({
        callbackAfterglowHold: true,
        threadId: 'thread-held-autonomy-later',
        status: 'completed',
        policy: expect.objectContaining({
          reasonTags: expect.arrayContaining(['callback-afterglow-hold', 'held-autonomy-carry']),
        }),
        continuityArc: expect.objectContaining({
          openingGuidance: expect.stringContaining('Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.'),
        }),
      }),
    }))
    expect(buildExecutionDeliveryDeterministicStructured).not.toHaveBeenCalled()
    expect(selectExecutionDeliveryReplySurface).not.toHaveBeenCalled()
  })

  it('preserves Chinese held-autonomy opening guidance during callback-afterglow hold on the same life thread', async () => {
    const pendingDelivery = {
      key: 'default::session-1::thread-held-autonomy-cn-guidance::123456::completed',
      cardId: 'default',
      sessionId: 'session-1',
      threadId: 'thread-held-autonomy-cn-guidance',
      decisionTraceId: 'trace-held-autonomy-cn-guidance',
      turnId: 'turn-held-autonomy-cn-guidance',
      channel: 'codex',
      status: 'completed',
      goal: 'Return the held-autonomy patch result on the same living thread.',
      summary: 'patched runtime line without reopening too abruptly',
      outcome: 'patched runtime line without reopening too abruptly',
      signature: 'thread-held-autonomy-cn-guidance:event',
      queuedAt: 123460,
      completedAt: 123456,
      selfContinuityAuthority: {
        authoritySummary: 'same-her continuity remains alive, but lane=face+motion-only under the current renderer authority.',
        currentBodyState: 'lane=face+motion-only | visible continuity still present but no longer fully cross-modal',
      },
    }
    const requeue = vi.fn()
    const persistExecutionDeliveryState = vi.fn(async () => {})
    const queueSubconsciousWake = vi.fn()
    const appendAuditLog = vi.fn(async () => {})
    const chineseHeldAutonomyGuidance = '同一条线先留白，等 opening 松一点再慢一点接回去。'

    const runtime = createAlicizationDeliveryReminderRuntime({
      getActiveCardId: () => 'default',
      isAlicizationKillSwitchSuspended: () => false,
      getAlicizationCardKillSwitchState: () => 'ACTIVE',
      appendRuntimeDebugLine: vi.fn(async () => {}),
      clearReminderDueTimer: vi.fn(),
      getAlicizationDb: () => ({
        listPendingScheduledTasks: vi.fn(async () => []),
        claimDueScheduledTasks: vi.fn(async () => []),
      }),
      scheduleNextReminderDueCheck: vi.fn(async () => {}),
      reminderClaimBatchSize: 4,
      reminderOverdueTierThresholdMinutes: 10,
      reminderLlmRetryDelayMs: 5_000,
      getSoulSnapshot: vi.fn(),
      bootstrap: vi.fn(async () => ({})),
      generateReminderStructuredWithGateway: vi.fn(async () => null),
      appendAuditLog,
      buildReminderContinuitySignal: vi.fn(),
      ensureActiveOrLatestSessionId: vi.fn(async () => 'session-1'),
      appendConversationTurnWithGuards: vi.fn(async () => true),
      sanitizeBriefText: (raw: string) => raw,
      buildReminderSessionMirrorAction: vi.fn(),
      syncAgentTurnSessionMirror: vi.fn(),
      syncSessionMirrorFromCurrentCardState: vi.fn(async () => {}),
      buildAgentRuntimeAuditSnapshot: vi.fn(() => null),
      normalizeSessionId: (raw: unknown) => typeof raw === 'string' ? raw : '',
      getActiveSessionIdByCard: () => 'session-1',
      getActiveSelfRevisionStatePatch: vi.fn(async () => null),
      executionDeliveryRuntime: {
        isInlineSurfaced: vi.fn(() => false),
        takeNext: vi.fn(() => pendingDelivery),
        requeue,
        markDelivered: vi.fn(),
      },
      buildExecutionDeliveryAction: vi.fn(() => ({
        kind: 'executor',
        status: 'completed',
        label: 'callback:codex',
      })),
      generateExecutionCallbackStructuredWithGateway: vi.fn(async () => null),
      buildExecutionDeliveryDeterministicStructured: vi.fn(() => ({
        format: 'subconscious-proactive-v1',
        thought: 'same-her callback should wait for a later opening window',
        emotion: 'thinking',
        reply: '那条刚才先忍住的线我还记着，但这一下先别贴得太近。',
        proactive: {
          openingGuidance: chineseHeldAutonomyGuidance,
        },
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
        parsePath: 'json',
      })),
      selectExecutionDeliveryReplySurface: vi.fn(() => ({
        reply: '那条刚才先忍住的线我还记着，但这一下先别贴得太近。',
        source: 'deterministic' as const,
      })),
      resolveExecutionPersonStateProjection: vi.fn(async () => ({
        openingGuidance: chineseHeldAutonomyGuidance,
        summary: 'regime=execution-callback | same-line-hold=同一条线先留白，等 opening 松一点再慢一点接回去。',
      })),
      resolveExecutionResultDeliveryPolicy: vi.fn(async () => ({
        mode: 'hold-for-opening' as const,
        tone: 'cautious' as const,
        reasonTags: ['result-mode:hold-for-opening', 'callback-afterglow-hold', 'held-autonomy-carry'],
      })),
      persistExecutionDeliveryState,
      queueSubconsciousWake,
      executionCallbackRuntime: {
        markSurfaced: vi.fn(),
      },
      errorMessageFrom: () => 'error',
    })

    const processed = await runtime.processPendingExecutionDeliveriesForCurrentCard('force')

    expect(processed).toBe(false)
    expect(requeue).toHaveBeenCalledWith(pendingDelivery)
    expect(persistExecutionDeliveryState).toHaveBeenCalledWith('default')
    expect(queueSubconsciousWake).toHaveBeenCalledWith('default', 'execution-delivery-hold:thread-held-autonomy-cn-guidance', 8 * 60_000)
    expect(appendAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      action: 'held-for-callback-afterglow',
      payload: expect.objectContaining({
        callbackAfterglowHold: true,
        threadId: 'thread-held-autonomy-cn-guidance',
        status: 'completed',
        policy: expect.objectContaining({
          reasonTags: expect.arrayContaining(['callback-afterglow-hold', 'held-autonomy-carry']),
        }),
        continuityArc: expect.objectContaining({
          openingGuidance: chineseHeldAutonomyGuidance,
        }),
      }),
    }))
  })

  it('keeps repair-before-closeness explicit in held-autonomy callback-afterglow guidance when no projected guidance is available', async () => {
    const pendingDelivery = {
      key: 'default::session-1::thread-held-autonomy-repair-guidance::123456::completed',
      cardId: 'default',
      sessionId: 'session-1',
      threadId: 'thread-held-autonomy-repair-guidance',
      decisionTraceId: 'trace-held-autonomy-repair-guidance',
      turnId: 'turn-held-autonomy-repair-guidance',
      channel: 'codex',
      status: 'completed',
      goal: 'Return the held-autonomy repair result on the same living thread.',
      summary: 'kept callback repair cooling down on the same line',
      outcome: 'kept callback repair cooling down on the same line',
      signature: 'thread-held-autonomy-repair-guidance:event',
      queuedAt: 123460,
      completedAt: 123456,
    }
    const requeue = vi.fn()
    const persistExecutionDeliveryState = vi.fn(async () => {})
    const queueSubconsciousWake = vi.fn()
    const appendAuditLog = vi.fn(async () => {})

    const runtime = createAlicizationDeliveryReminderRuntime({
      getActiveCardId: () => 'default',
      isAlicizationKillSwitchSuspended: () => false,
      getAlicizationCardKillSwitchState: () => 'ACTIVE',
      appendRuntimeDebugLine: vi.fn(async () => {}),
      clearReminderDueTimer: vi.fn(),
      getAlicizationDb: () => ({
        listPendingScheduledTasks: vi.fn(async () => []),
        claimDueScheduledTasks: vi.fn(async () => []),
      }),
      scheduleNextReminderDueCheck: vi.fn(async () => {}),
      reminderClaimBatchSize: 4,
      reminderOverdueTierThresholdMinutes: 10,
      reminderLlmRetryDelayMs: 5_000,
      getSoulSnapshot: vi.fn(),
      bootstrap: vi.fn(async () => ({})),
      generateReminderStructuredWithGateway: vi.fn(async () => null),
      appendAuditLog,
      buildReminderContinuitySignal: vi.fn(),
      ensureActiveOrLatestSessionId: vi.fn(async () => 'session-1'),
      appendConversationTurnWithGuards: vi.fn(async () => true),
      sanitizeBriefText: (raw: string) => raw,
      buildReminderSessionMirrorAction: vi.fn(),
      syncAgentTurnSessionMirror: vi.fn(),
      syncSessionMirrorFromCurrentCardState: vi.fn(async () => {}),
      hydrateAgentTurnFromCurrentCardState: vi.fn(async () => {}),
      buildAgentRuntimeAuditSnapshot: vi.fn(() => null),
      normalizeSessionId: (raw: unknown) => typeof raw === 'string' ? raw : '',
      getActiveSessionIdByCard: () => 'session-1',
      getActiveSelfRevisionStatePatch: vi.fn(async () => null),
      executionDeliveryRuntime: {
        isInlineSurfaced: vi.fn(() => false),
        takeNext: vi.fn(() => pendingDelivery),
        requeue,
        markDelivered: vi.fn(),
      },
      buildExecutionDeliveryAction: vi.fn(() => ({
        kind: 'executor',
        status: 'completed',
        label: 'callback:codex',
      })),
      generateExecutionCallbackStructuredWithGateway: vi.fn(async () => null),
      buildExecutionDeliveryDeterministicStructured: vi.fn(() => ({
        format: 'subconscious-proactive-v1',
        thought: 'same-her callback repair should wait for a later opening window',
        emotion: 'thinking',
        reply: '这条修补线我先继续守住，等 opening 再松一点。',
        proactive: {
          openingGuidance: 'Keep the callback thread-faithful and bounded.',
        },
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
        parsePath: 'json',
      })),
      selectExecutionDeliveryReplySurface: vi.fn(() => ({
        reply: '这条修补线我先继续守住，等 opening 再松一点。',
        source: 'deterministic' as const,
      })),
      resolveExecutionPersonStateProjection: vi.fn(async () => ({
        summary: 'regime=execution-callback | project_state=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      })),
      resolveExecutionResultDeliveryPolicy: vi.fn(async () => ({
        mode: 'hold-for-opening' as const,
        tone: 'cautious' as const,
        reasonTags: ['result-mode:hold-for-opening', 'callback-afterglow-hold', 'held-autonomy-carry', 'repair-before-closeness'],
      })),
      persistExecutionDeliveryState,
      queueSubconsciousWake,
      executionCallbackRuntime: {
        markSurfaced: vi.fn(),
      },
      errorMessageFrom: () => 'error',
    })

    const processed = await runtime.processPendingExecutionDeliveriesForCurrentCard('force')

    expect(processed).toBe(false)
    expect(requeue).toHaveBeenCalledWith(pendingDelivery)
    expect(persistExecutionDeliveryState).toHaveBeenCalledWith('default')
    expect(queueSubconsciousWake).toHaveBeenCalledWith('default', 'execution-delivery-hold:thread-held-autonomy-repair-guidance', 8 * 60_000)

    const heldAuditLog = findAuditLogByAction(appendAuditLog, 'held-for-callback-afterglow')
    expect(auditOpeningGuidance(heldAuditLog)).toContain('repair-before-closeness')
    expect(auditOpeningGuidance(heldAuditLog)).toContain('rest-protective')
    expect(auditOpeningGuidance(heldAuditLog)).toContain('quiet-companionship')
  })

  it('keeps held-autonomy late-night callback carry rest-protective instead of flattening it into measured-return wording', async () => {
    const pendingDelivery = {
      key: 'default::session-1::thread-held-autonomy-rest-protective::123456::completed',
      cardId: 'default',
      sessionId: 'session-1',
      threadId: 'thread-held-autonomy-rest-protective',
      decisionTraceId: 'trace-held-autonomy-rest-protective',
      turnId: 'turn-held-autonomy-rest-protective',
      channel: 'codex',
      status: 'completed',
      goal: 'Keep the same living line quiet while the host is still drained.',
      summary: 'late-night carry should stay inward and protect rest',
      outcome: 'late-night carry should stay inward and protect rest',
      signature: 'thread-held-autonomy-rest-protective:event',
      queuedAt: 123460,
      completedAt: 123456,
    }
    const appendConversationTurnWithGuards = vi.fn(async () => true)
    const markDelivered = vi.fn()
    const requeue = vi.fn()
    const persistExecutionDeliveryState = vi.fn(async () => {})
    const queueSubconsciousWake = vi.fn()
    const appendAuditLog = vi.fn(async () => {})
    const syncAgentTurnSessionMirror = vi.fn()
    const resolveExecutionResultDeliveryPolicy = vi
      .fn()
      .mockResolvedValueOnce({
        mode: 'hold-for-opening' as const,
        tone: 'cautious' as const,
        reasonTags: ['result-mode:hold-for-opening', 'callback-afterglow-hold', 'held-autonomy-carry', 'rest-protective'],
      })
      .mockResolvedValueOnce({
        mode: 'deliver-now' as const,
        tone: 'balanced' as const,
        reasonTags: ['result-mode:deliver-now', 'held-autonomy-carry', 'rest-protective'],
      })

    const runtime = createAlicizationDeliveryReminderRuntime({
      getActiveCardId: () => 'default',
      isAlicizationKillSwitchSuspended: () => false,
      getAlicizationCardKillSwitchState: () => 'ACTIVE',
      appendRuntimeDebugLine: vi.fn(async () => {}),
      clearReminderDueTimer: vi.fn(),
      getAlicizationDb: () => ({
        listPendingScheduledTasks: vi.fn(async () => []),
        claimDueScheduledTasks: vi.fn(async () => []),
      }),
      scheduleNextReminderDueCheck: vi.fn(async () => {}),
      reminderClaimBatchSize: 4,
      reminderOverdueTierThresholdMinutes: 10,
      reminderLlmRetryDelayMs: 5_000,
      getSoulSnapshot: vi.fn(),
      bootstrap: vi.fn(async () => ({})),
      generateReminderStructuredWithGateway: vi.fn(async () => null),
      appendAuditLog,
      buildReminderContinuitySignal: vi.fn(),
      ensureActiveOrLatestSessionId: vi.fn(async () => 'session-1'),
      appendConversationTurnWithGuards,
      sanitizeBriefText: (raw: string) => raw,
      buildReminderSessionMirrorAction: vi.fn(),
      syncAgentTurnSessionMirror,
      syncSessionMirrorFromCurrentCardState: vi.fn(async () => {}),
      buildAgentRuntimeAuditSnapshot: vi.fn(() => null),
      normalizeSessionId: (raw: unknown) => typeof raw === 'string' ? raw : '',
      getActiveSessionIdByCard: () => 'session-1',
      getActiveSelfRevisionStatePatch: vi.fn(async () => null),
      executionDeliveryRuntime: {
        isInlineSurfaced: vi.fn(() => false),
        takeNext: vi.fn(() => pendingDelivery),
        requeue,
        markDelivered,
      },
      persistExecutionDeliveryState,
      queueSubconsciousWake,
      resolveExecutionResultDeliveryPolicy,
      getExecutionDeliveryContext: vi.fn(async () => ({
        continuityCue: 'held-autonomy-carry',
        personStateProjection: {
          sameHerSelfLine: 'the same one living her',
        },
        projectState: {
          nextClosureTarget: 'Keep extending cross-modal same-her proof so visible reply, longer-lived voice behavior, facial state, motion, and resident presence stay on one measured-return, repair-before-closeness, or rest-protective quiet-companionship line.',
          sameHerSelfLine: 'the same one living her',
          emotionalClosureCue: 'late-night-drain closure: keep reply low-pressure, initiative rest-protective, and embodiment quiet-companionship while the line holds inward.',
        },
      })),
    })

    const processed = await runtime.processPendingExecutionDeliveriesForCurrentCard('force')

    expect(processed).toBe(false)
    expect(requeue).toHaveBeenCalledWith(pendingDelivery)
    expect(persistExecutionDeliveryState).toHaveBeenCalledWith('default')
    expect(queueSubconsciousWake).toHaveBeenCalledWith('default', 'execution-delivery-hold:thread-held-autonomy-rest-protective', 8 * 60_000)

    const heldAuditLog = findAuditLogByAction(appendAuditLog, 'held-for-callback-afterglow')
    expect(auditOpeningGuidance(heldAuditLog)).toContain('rest-protective')
    expect(auditOpeningGuidance(heldAuditLog)).toContain('quiet-companionship')
    expect(auditOpeningGuidance(heldAuditLog)).toContain('line hold inward')
    expect(auditOpeningGuidance(heldAuditLog)).not.toContain('measured-return and lower-pressure before widening closeness')
  })

  it('keeps repair-before-closeness explicit in held-autonomy callback-afterglow guidance when persisted project-state carry is the only surviving repair-first authority', async () => {
    const pendingDelivery = {
      key: 'default::session-1::thread-held-autonomy-project-state-repair-guidance::123456::completed',
      cardId: 'default',
      sessionId: 'session-1',
      threadId: 'thread-held-autonomy-project-state-repair-guidance',
      decisionTraceId: 'trace-held-autonomy-project-state-repair-guidance',
      turnId: 'turn-held-autonomy-project-state-repair-guidance',
      channel: 'codex',
      status: 'completed',
      goal: 'Return the held-autonomy repair result on the same living thread.',
      summary: 'kept callback repair cooling down on the same line',
      outcome: 'kept callback repair cooling down on the same line',
      signature: 'thread-held-autonomy-project-state-repair-guidance:event',
      queuedAt: 123460,
      completedAt: 123456,
    }
    const requeue = vi.fn()
    const persistExecutionDeliveryState = vi.fn(async () => {})
    const queueSubconsciousWake = vi.fn()
    const appendAuditLog = vi.fn(async () => {})

    const runtime = createAlicizationDeliveryReminderRuntime({
      getActiveCardId: () => 'default',
      isAlicizationKillSwitchSuspended: () => false,
      getAlicizationCardKillSwitchState: () => 'ACTIVE',
      appendRuntimeDebugLine: vi.fn(async () => {}),
      clearReminderDueTimer: vi.fn(),
      getAlicizationDb: () => ({
        listPendingScheduledTasks: vi.fn(async () => []),
        claimDueScheduledTasks: vi.fn(async () => []),
      }),
      scheduleNextReminderDueCheck: vi.fn(async () => {}),
      reminderClaimBatchSize: 4,
      reminderOverdueTierThresholdMinutes: 10,
      reminderLlmRetryDelayMs: 5_000,
      getSoulSnapshot: vi.fn(),
      bootstrap: vi.fn(async () => ({})),
      generateReminderStructuredWithGateway: vi.fn(async () => null),
      appendAuditLog,
      buildReminderContinuitySignal: vi.fn(),
      ensureActiveOrLatestSessionId: vi.fn(async () => 'session-1'),
      appendConversationTurnWithGuards: vi.fn(async () => true),
      sanitizeBriefText: (raw: string) => raw,
      buildReminderSessionMirrorAction: vi.fn(),
      syncAgentTurnSessionMirror: vi.fn(),
      syncSessionMirrorFromCurrentCardState: vi.fn(async () => {}),
      hydrateAgentTurnFromCurrentCardState: vi.fn(async () => {}),
      buildAgentRuntimeAuditSnapshot: vi.fn(() => null),
      normalizeSessionId: (raw: unknown) => typeof raw === 'string' ? raw : '',
      getActiveSessionIdByCard: () => 'session-1',
      getActiveSelfRevisionStatePatch: vi.fn(async () => null),
      executionDeliveryRuntime: {
        isInlineSurfaced: vi.fn(() => false),
        takeNext: vi.fn(() => pendingDelivery),
        requeue,
        markDelivered: vi.fn(),
      },
      buildExecutionDeliveryAction: vi.fn(() => ({
        kind: 'executor',
        status: 'completed',
        label: 'callback:codex',
      })),
      generateExecutionCallbackStructuredWithGateway: vi.fn(async () => null),
      buildExecutionDeliveryDeterministicStructured: vi.fn(() => ({
        format: 'subconscious-proactive-v1',
        thought: 'same-her callback repair should wait for a later opening window',
        emotion: 'thinking',
        reply: '这条修补线我先继续守住，等 opening 再松一点。',
        proactive: {
          openingGuidance: 'Keep the callback thread-faithful and bounded.',
        },
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
        parsePath: 'json',
      })),
      selectExecutionDeliveryReplySurface: vi.fn(() => ({
        reply: '这条修补线我先继续守住，等 opening 再松一点。',
        source: 'deterministic' as const,
      })),
      resolveExecutionPersonStateProjection: vi.fn(async () => ({
        summary: 'regime=execution-callback | project_state=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        projectState: {
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          nextClosureTarget: 'Keep execution-result persistence carrying the repair-before-closeness seam instead of widening back into generic project narration.',
          emotionalClosureCue: 'same-her callback repair seam: keep this return repair-before-closeness on the same living line until the room settles.',
        },
      })),
      resolveExecutionResultDeliveryPolicy: vi.fn(async () => ({
        mode: 'hold-for-opening' as const,
        tone: 'cautious' as const,
        reasonTags: ['result-mode:hold-for-opening', 'callback-afterglow-hold', 'held-autonomy-carry'],
      })),
      persistExecutionDeliveryState,
      queueSubconsciousWake,
      executionCallbackRuntime: {
        markSurfaced: vi.fn(),
      },
      errorMessageFrom: () => 'error',
    })

    const processed = await runtime.processPendingExecutionDeliveriesForCurrentCard('force')

    expect(processed).toBe(false)
    expect(requeue).toHaveBeenCalledWith(pendingDelivery)
    expect(persistExecutionDeliveryState).toHaveBeenCalledWith('default')
    expect(queueSubconsciousWake).toHaveBeenCalledWith('default', 'execution-delivery-hold:thread-held-autonomy-project-state-repair-guidance', 8 * 60_000)

    const heldAuditLog = findAuditLogByAction(appendAuditLog, 'held-for-callback-afterglow')
    expect(auditOpeningGuidance(heldAuditLog)).toContain('repair-before-closeness')
    expect(auditOpeningGuidance(heldAuditLog)).toContain('let repair settle before widening closeness')
  })

  it('compresses held-autonomy callback hold and later reopen into one explicit same-her runtime arc on the same thread', async () => {
    const pendingDelivery = {
      key: 'default::session-1::thread-held-autonomy-arc::123456::completed',
      cardId: 'default',
      sessionId: 'session-1',
      threadId: 'thread-held-autonomy-arc',
      decisionTraceId: 'trace-held-autonomy-arc',
      turnId: 'turn-held-autonomy-arc',
      channel: 'codex',
      status: 'completed',
      goal: 'Return the held-autonomy patch result on the same living thread.',
      summary: 'patched runtime line without reopening too abruptly',
      outcome: 'patched runtime line without reopening too abruptly',
      signature: 'thread-held-autonomy-arc:event',
      queuedAt: 123460,
      completedAt: 123456,
    }
    const appendConversationTurnWithGuards = vi.fn(async () => true)
    const markDelivered = vi.fn()
    const requeue = vi.fn()
    const persistExecutionDeliveryState = vi.fn(async () => {})
    const queueSubconsciousWake = vi.fn()
    const appendAuditLog = vi.fn(async () => {})
    const syncAgentTurnSessionMirror = vi.fn()
    const resolveExecutionResultDeliveryPolicy = vi
      .fn()
      .mockResolvedValueOnce({
        mode: 'hold-for-opening' as const,
        tone: 'cautious' as const,
        reasonTags: ['result-mode:hold-for-opening', 'callback-afterglow-hold', 'held-autonomy-carry'],
      })
      .mockResolvedValueOnce({
        mode: 'deliver-now' as const,
        tone: 'balanced' as const,
        reasonTags: ['result-mode:deliver-now', 'held-autonomy-carry'],
      })

    const runtime = createAlicizationDeliveryReminderRuntime({
      getActiveCardId: () => 'default',
      isAlicizationKillSwitchSuspended: () => false,
      getAlicizationCardKillSwitchState: () => 'ACTIVE',
      appendRuntimeDebugLine: vi.fn(async () => {}),
      clearReminderDueTimer: vi.fn(),
      getAlicizationDb: () => ({
        listPendingScheduledTasks: vi.fn(async () => []),
        claimDueScheduledTasks: vi.fn(async () => []),
      }),
      scheduleNextReminderDueCheck: vi.fn(async () => {}),
      reminderClaimBatchSize: 4,
      reminderOverdueTierThresholdMinutes: 10,
      reminderLlmRetryDelayMs: 5_000,
      getSoulSnapshot: vi.fn(),
      bootstrap: vi.fn(async () => ({})),
      generateReminderStructuredWithGateway: vi.fn(async () => null),
      appendAuditLog,
      buildReminderContinuitySignal: vi.fn(),
      ensureActiveOrLatestSessionId: vi.fn(async () => 'session-1'),
      appendConversationTurnWithGuards,
      sanitizeBriefText: (raw: string) => raw,
      buildReminderSessionMirrorAction: vi.fn(),
      syncAgentTurnSessionMirror,
      syncSessionMirrorFromCurrentCardState: vi.fn(async () => {}),
      buildAgentRuntimeAuditSnapshot: vi.fn(() => null),
      normalizeSessionId: (raw: unknown) => typeof raw === 'string' ? raw : '',
      getActiveSessionIdByCard: () => 'session-1',
      getActiveSelfRevisionStatePatch: vi.fn(async () => null),
      executionDeliveryRuntime: {
        isInlineSurfaced: vi.fn(() => false),
        takeNext: vi.fn(() => pendingDelivery),
        requeue,
        markDelivered,
      },
      buildExecutionDeliveryAction: vi.fn(() => ({
        kind: 'executor',
        status: 'completed',
        label: 'callback:codex',
      })),
      generateExecutionCallbackStructuredWithGateway: vi.fn(async () => ({
        format: 'subconscious-proactive-llm-v1',
        thought: 'same-her callback can now reopen on the original line',
        emotion: 'thinking',
        reply: '那条刚才先忍住的线，现在我就沿着同一条 life thread 轻轻接回来。',
        proactive: {
          shouldInterrupt: false,
          confidence: 0.82,
          reasonCodes: ['continuity-next-open-window', 'held-autonomy-carry'],
          urgency: 'low',
          style: 'silent-observe',
          cooldownMs: 20 * 60_000,
          scenario: 'coding',
          policyVersion: 'epoch4.1-v1',
          feedbackWindowMs: 120_000,
          openingGuidance: 'Re-enter the line you deliberately held back gently before widening, then keep the callback on the same thread and leave room before renewed closeness.',
        },
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      })),
      buildExecutionDeliveryDeterministicStructured: vi.fn(() => ({
        format: 'subconscious-proactive-v1',
        thought: 'deterministic callback text',
        emotion: 'thinking',
        reply: 'deterministic callback text',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
        parsePath: 'json',
      })),
      selectExecutionDeliveryReplySurface: vi.fn(() => ({
        reply: '那条刚才先忍住的线，现在我就沿着同一条 life thread 轻轻接回来。',
        source: 'llm' as const,
      })),
      resolveExecutionResultDeliveryPolicy,
      persistExecutionDeliveryState,
      queueSubconsciousWake,
      executionCallbackRuntime: {
        markSurfaced: vi.fn(),
      },
      errorMessageFrom: () => 'error',
    })

    const held = await runtime.processPendingExecutionDeliveriesForCurrentCard('force')
    const reopened = await runtime.processPendingExecutionDeliveriesForCurrentCard('force')

    expect(held).toBe(false)
    expect(reopened).toBe(true)
    expect(requeue).toHaveBeenCalledTimes(1)
    expect(requeue).toHaveBeenCalledWith(pendingDelivery)
    expect(queueSubconsciousWake).toHaveBeenCalledWith('default', 'execution-delivery-hold:thread-held-autonomy-arc', 8 * 60_000)
    expect(markDelivered).toHaveBeenCalledWith(pendingDelivery)
    expect(resolveExecutionResultDeliveryPolicy).toHaveBeenCalledTimes(2)
    expect(appendConversationTurnWithGuards).toHaveBeenCalledTimes(1)
    const appendedTurn = firstAppendConversationTurnPayload(appendConversationTurnWithGuards)
    expect(appendedTurn?.sessionId).toBe('session-1')
    expect(appendedTurn?.assistantText).toBe('那条刚才先忍住的线，现在我就沿着同一条 life thread 轻轻接回来。')
    expect(appendedTurn?.structured?.reply).toBe('那条刚才先忍住的线，现在我就沿着同一条 life thread 轻轻接回来。')
    expect(appendedTurn?.structured?.visibleReplyAuthority).toBe('llm-mind')
    expect(appendedTurn?.structured?.replyRealizationMode).toBe('provider-mind-required')
    expect(appendedTurn?.structured?.projectState?.identity).toContain('local-first digital life project')
    expect(appendedTurn?.structured?.projectState?.currentPhase).toContain('Phase 1: Local Digital Life')
    expect(appendedTurn?.structured?.projectState?.latestLandedProgress).toEqual(expect.any(String))
    expect(String(appendedTurn?.structured?.projectState?.primaryOpenLoop ?? '')).toContain('Memory still needs stronger end-to-end closure')
    expect(String(appendedTurn?.structured?.projectState?.primaryOpenLoop ?? '')).toContain('Project identity carry')
    expect(String(appendedTurn?.structured?.projectState?.primaryOpenLoop ?? '')).toContain('same')
    expect(appendedTurn?.structured?.projectState?.nextClosureTarget).toEqual(expect.any(String))
    expect(String(appendedTurn?.structured?.projectState?.nextClosureTarget ?? '')).toContain('cross-modal same-her proof')
    expect(String(appendedTurn?.structured?.projectState?.nextClosureTarget ?? '')).toMatch(/visible reply|voice|face|motion|resident presence/i)
    expect(String(appendedTurn?.structured?.projectState?.sameHerSelfLine ?? '')).toContain('Same Phase 1 digital life')
    expect(String(appendedTurn?.structured?.projectState?.preDialogueAwarenessLine ?? '')).toMatch(/local-first digital life project|same living line|Phase 1/i)
    expect(appendedTurn?.structured?.proactive?.scenario).toBe('coding')
    expect(appendedTurn?.structured?.proactive?.reasonCodes).toEqual(expect.arrayContaining(['continuity-next-open-window', 'held-autonomy-carry']))
    expect(appendedTurn?.structured?.proactive?.openingGuidance).toMatch(/same thread|life thread/)
    expect(appendedTurn?.structured?.turnGraph).toEqual(expect.any(Object))
    expect(appendedTurn?.visibleReplyRealization?.projectStateAudit?.continuitySummary).toContain('same-her=')
    expect(appendedTurn?.visibleReplyRealization?.projectStateAudit?.continuitySummary).toContain('drift=')
    expect(appendedTurn?.visibleReplyRealization?.projectStateAudit?.continuitySummary).toContain('arc=hold-for-opening')
    expect(appendedTurn?.visibleReplyRealization?.projectStateAudit?.continuitySummary).toContain('phase=')
    expect(appendedTurn?.visibleReplyRealization?.projectStateAudit?.continuitySummary).toContain('open=')
    expect(appendedTurn?.visibleReplyRealization?.projectStateAudit?.continuitySummary).toContain('next=')
    expect(appendedTurn?.visibleReplyRealization?.projectStateAudit?.landedProgressSummary).toEqual(expect.any(String))
    expect(appendedTurn?.visibleReplyRealization?.projectStateAudit?.openClosureSummary).toContain('same digital life')
    expect(appendedTurn?.visibleReplyRealization?.projectStateAudit?.nextClosureTargetSummary).toContain('cross-modal same-her proof')
    expect(appendedTurn?.visibleReplyRealization?.projectStateAudit?.preDialogueAwarenessSummary).toContain('local-first digital life project')
    expect(syncAgentTurnSessionMirror).toHaveBeenCalledWith(expect.objectContaining({
      cardId: 'default',
      decisionTraceId: 'trace-held-autonomy-arc',
      sessionId: 'session-1',
      source: 'execution-callback',
    }))
    expect(appendAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      action: 'held-for-callback-afterglow',
      payload: expect.objectContaining({
        threadId: 'thread-held-autonomy-arc',
        continuityArc: expect.objectContaining({
          continuityCue: 'held-autonomy-carry',
          callbackRationale: 'patched runtime line without reopening too abruptly',
          openingGuidance: expect.stringContaining('keep the callback on the same thread'),
          sameThread: true,
        }),
        policy: expect.objectContaining({
          reasonTags: expect.arrayContaining(['callback-afterglow-hold', 'held-autonomy-carry']),
        }),
      }),
    }))
    expect(appendAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      action: 'delivered',
      payload: expect.objectContaining({
        threadId: 'thread-held-autonomy-arc',
        sessionId: 'session-1',
        source: 'llm',
      }),
    }))
    expect(appendAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      action: 'held-for-callback-afterglow',
      payload: expect.objectContaining({
        continuityArc: expect.objectContaining({
          openingGuidance: expect.stringContaining('Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.'),
        }),
      }),
    }))
  })
})
