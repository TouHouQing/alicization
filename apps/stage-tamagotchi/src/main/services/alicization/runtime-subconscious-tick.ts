import { deriveAutonomyExecutionProposalSurface, runAutonomyActuation } from './autonomy-actuation'
import { buildAutobiographicalEpisodeFragment } from './autobiographical-episodes'
import { adjustProactiveStyleFromHostPersonModel, inferHostSocialContextsFromText } from './host-social-guidance'

export function createAlicizationSubconsciousTickRuntime(options: any) {
  const {
    getActiveCardId,
    getSoulSnapshot,
    getAlicizationDb,
    setProactiveLoopStateCache,
    setSubconsciousStateCache,
    clearForegroundProbeTimeoutStreakForPid,
    ensureSubconsciousState,
    ensureProactiveLoopState,
    openAgentTurn,
    buildMainGatewayAgentTurnId,
    processDueRemindersForCurrentCard,
    settleExpiredPendingProactiveOutcomes,
    getSensorySnapshot,
    ensurePerceptionState,
    sampleSubconsciousInterruptionContext,
    resolveForegroundDecisionTarget,
    getActiveAttentionAnchor,
    rememberPerceptionObservation,
    ensureVisualPresenceState,
    clampNeed,
    bootstrap,
    isAlicizationKillSwitchSuspended,
    getAlicizationCardKillSwitchState,
    updateLateNightActivityState,
    isLateNightWindow,
    resolveProactiveScreenSemanticSummary,
    isResidueBackedScreenSemanticSummary,
    buildProactiveLayeredContext,
    buildProactivePerceptionSignals,
    progressProactiveCadenceState,
    inferScenarioFromContext,
    consumeDurabilityPulse,
    probeForegroundPidLiveness,
    updateForegroundProbeTimeoutStreak,
    getActivePerceptionSceneResidue,
    shouldUsePerceptionResidueAsLiveSceneSummary,
    deriveRuntimeCaptureGovernance,
    buildVisualHeartbeat,
    updateVisualAttentionModel,
    buildDigitalLifeMindState,
    commitAlicizationDigitalLifeSpine,
    persistVisualPresenceState,
    visualPresenceCapturePersistDebounceWindowMs,
    buildVisualPresenceCapturePersistFingerprint,
    buildMindContinuityFragment,
    appendAuditLog,
    errorMessageFrom,
    buildReflectionLedgerFragment,
    buildVisualSedimentFragment,
    processPendingExecutionDeliveriesForCurrentCard,
    deriveAlicizationRuntimeSnapshot,
    deriveAlicizationAgentRuntimeTelemetryFromSession,
    evaluateProactivePolicy,
    emitVisualPresencePulse,
    buildPresencePulsePayload,
    buildAgentRuntimeAuditSnapshot,
    queueSoulMutation,
    parseSoul,
    clamp01,
    syncPersonalityBaselineInBody,
    snapshotFromContent,
    toSoulContent,
    normalizeCustomDirectives,
    buildProactiveRecallSeed,
    buildVisualRecallSeed,
    buildMindContinuityRecallSeed,
    resolveOrganicMemoryPromptContext,
    generateProactiveStructuredWithGateway,
    buildProactiveStructured,
    getPerformanceManifest,
    clampAlicizationPerformancePayloadToManifest,
    appendConversationTurnWithGuards,
    syncAgentTurnSessionMirror,
    buildPendingProactiveContinuitySignal,
    ensureActiveOrLatestSessionId,
    resolveTaskPlanningCapabilities,
    scheduleAutonomyReminder,
    planAutonomyTaskThread,
    dispatchAutonomyTaskThread,
    workspaceRoot,
    buildDefaultDialoguePerformancePayload,
    buildProactiveMetadataFromDecision,
    alicizationSubconsciousPersistMs,
    persistProactiveLoopState,
    persistSubconsciousState,
  } = options as any

  async function runSubconsciousTickForCurrentCard(trigger: 'timer' | 'force') {
    const activeCardId = getActiveCardId()
    const alicizationDb = getAlicizationDb()
    const state = await ensureSubconsciousState(activeCardId)
    let proactiveLoopState = await ensureProactiveLoopState(activeCardId)
    const now = Date.now()
    const backgroundAgentTurn = await openAgentTurn({
      cardId: activeCardId,
      turnId: buildMainGatewayAgentTurnId('subconscious-tick', trigger, activeCardId, now),
    })
    const reminderResult = await processDueRemindersForCurrentCard(trigger, backgroundAgentTurn)
    proactiveLoopState = await settleExpiredPendingProactiveOutcomes(activeCardId, now, `subconscious-tick:${trigger}`)
    const elapsedMinutes = Math.max(1 / 6, (now - state.lastTickAt) / 60_000)
    const sensorySnapshot = getSensorySnapshot()
    const cpuUsage = Number(sensorySnapshot?.sample?.cpu?.usagePercent ?? 0)
    let perceptionState = await ensurePerceptionState(activeCardId)
    const rawInterruptionContext = await sampleSubconsciousInterruptionContext()
    const resolvedForegroundWindow = resolveForegroundDecisionTarget({
      snapshotForeground: sensorySnapshot?.sample?.foregroundWindow,
      probedForeground: rawInterruptionContext.foregroundWindow,
      attentionAnchor: getActiveAttentionAnchor(perceptionState, now),
    })
    const interruptionContext = {
      ...rawInterruptionContext,
      foregroundWindow: resolvedForegroundWindow,
    }
    await rememberPerceptionObservation({
      cardId: activeCardId,
      now,
      target: resolvedForegroundWindow,
      source: 'subconscious-tick',
    })
    perceptionState = await ensurePerceptionState(activeCardId)
    let visualPresenceState = await ensureVisualPresenceState(activeCardId)
    const idleLikely = interruptionContext.inputActivity === 'idle'
      || (interruptionContext.inputActivity !== 'active' && cpuUsage <= 10)

    const nextState = {
      ...state,
      boredom: clampNeed(state.boredom + elapsedMinutes * ((cpuUsage >= 70 || interruptionContext.fullscreenLikely) ? 2.2 : 1.2)),
      loneliness: clampNeed(state.loneliness + elapsedMinutes * (idleLikely ? 2.4 : 0.8)),
      fatigue: clampNeed(state.fatigue + elapsedMinutes * 0.6 + reminderResult.completed * 1.2),
      lastTickAt: now,
      lastInteractionAt: state.lastInteractionAt,
      updatedAt: now,
    }
    const soulForSubconscious = getSoulSnapshot() ?? await bootstrap()
    const killSwitchSuspended
      = isAlicizationKillSwitchSuspended()
        || getAlicizationCardKillSwitchState(activeCardId) === 'SUSPENDED'
    const hostActive = interruptionContext.inputActivity === 'active'
      || (typeof interruptionContext.idleSeconds === 'number' && interruptionContext.idleSeconds < 5 * 60)
    const lateNightState = updateLateNightActivityState(proactiveLoopState, {
      now,
      hostActive,
      isLateNight: isLateNightWindow(new Date(now)),
    })
    proactiveLoopState = lateNightState.state
    setProactiveLoopStateCache(activeCardId, proactiveLoopState)
    const reminderBacklog = (await alicizationDb.listPendingScheduledTasks(32).catch(() => [])).length
    const canAttemptScreenSemanticSummary
      = !killSwitchSuspended
        && !interruptionContext.fullscreenLikely
        && cpuUsage < 70
        && (interruptionContext.inputActivity !== 'active' || cpuUsage < 45)
    const proactiveGrounding = canAttemptScreenSemanticSummary
      ? await resolveProactiveScreenSemanticSummary({
          cardId: activeCardId,
          now,
          foregroundWindow: interruptionContext.foregroundWindow,
          perceptionState,
          agentTurn: backgroundAgentTurn,
        })
      : {
          summary: null,
          capture: null,
        }
    const screenSemanticSummary = proactiveGrounding.summary
    const proactiveCaptureSnapshot = proactiveGrounding.capture
    const screenSemanticSummaryGroundedThisTurn = Boolean(
      screenSemanticSummary
      && !isResidueBackedScreenSemanticSummary(screenSemanticSummary),
    )
    const layeredContext = buildProactiveLayeredContext({
      now,
      probeSample: sensorySnapshot?.sample,
      interruptionContext,
      subconsciousState: nextState,
      hostAttitude: soulForSubconscious.frontmatter.host_attitude,
      reminderBacklog,
      lateNightActiveMinutes: lateNightState.lateNightActiveMinutes,
      recentProactiveOutcomes: proactiveLoopState.recentOutcomes,
      screenSemanticSummary,
    })
    const perceptionSignals = buildProactivePerceptionSignals({
      now,
      state: perceptionState,
      currentForeground: interruptionContext.foregroundWindow ?? sensorySnapshot?.sample?.foregroundWindow,
    })
    const previousWorkingMemoryCount = visualPresenceState.workingMemoryEpisodes.length
    const inferredScenario = inferScenarioFromContext({
      workload: layeredContext.workload.kind,
      content: layeredContext.content.kind,
      lateNight: layeredContext.localTime.isLateNight,
      lateNightActiveMinutes: layeredContext.relationship.lateNightActiveMinutes,
      fatigue: layeredContext.relationship.fatigue,
    })
    let durabilityPulse = consumeDurabilityPulse(activeCardId)
    const currentForegroundPid = Number(
      interruptionContext.foregroundWindow?.pid
      ?? sensorySnapshot?.sample?.foregroundWindow?.pid
      ?? visualPresenceState.currentScene?.target?.pid
      ?? 0,
    )
    const shouldProbeForegroundDurability
      = Number.isFinite(currentForegroundPid)
        && currentForegroundPid > 0
        && (
          visualPresenceState.watchMode === 'symbiotic-vision'
          || visualPresenceState.watchMode === 'recovering'
          || inferredScenario === 'coding'
          || inferredScenario === 'media'
        )
    if (!durabilityPulse && shouldProbeForegroundDurability) {
      const pidAlive = await probeForegroundPidLiveness(currentForegroundPid)
      if (!pidAlive) {
        durabilityPulse = {
          kind: 'process-gone',
          source: 'foreground-app',
          detectedAt: now,
          pid: Math.floor(currentForegroundPid),
          appName: interruptionContext.foregroundWindow?.appName,
          processName: interruptionContext.foregroundWindow?.processName,
          title: interruptionContext.foregroundWindow?.title,
        }
      }
      else {
        const timeoutStreak = updateForegroundProbeTimeoutStreak(currentForegroundPid, interruptionContext.foregroundProbeTimedOut === true)
        if (timeoutStreak >= 2) {
          durabilityPulse = {
            kind: 'anr-likely',
            source: 'foreground-app',
            detectedAt: now,
            pid: Math.floor(currentForegroundPid),
            appName: interruptionContext.foregroundWindow?.appName,
            processName: interruptionContext.foregroundWindow?.processName,
            title: interruptionContext.foregroundWindow?.title,
          }
          clearForegroundProbeTimeoutStreakForPid(Math.floor(currentForegroundPid))
        }
      }
    }
    else if (Number.isFinite(currentForegroundPid) && currentForegroundPid > 0) {
      updateForegroundProbeTimeoutStreak(currentForegroundPid, false)
    }

    const backgroundSceneResidue = getActivePerceptionSceneResidue(perceptionState, now)
    const canUseBackgroundResidueAsLiveSceneSummary = (
      proactiveCaptureSnapshot === null
      || proactiveCaptureSnapshot.health === 'healthy'
    ) && shouldUsePerceptionResidueAsLiveSceneSummary({
      residue: backgroundSceneResidue,
      currentForeground: interruptionContext.foregroundWindow ?? sensorySnapshot?.sample?.foregroundWindow,
      inspectionRequested: false,
      groundedThisTurn: screenSemanticSummaryGroundedThisTurn,
    })
    const groundedSummary = screenSemanticSummary?.content.summary
      ?? (
        canUseBackgroundResidueAsLiveSceneSummary
          ? backgroundSceneResidue?.summary ?? null
          : null
      )
    const backgroundCaptureGovernance = deriveRuntimeCaptureGovernance({
      capture: proactiveCaptureSnapshot,
      inspectionRequested: false,
      groundedThisTurn: screenSemanticSummaryGroundedThisTurn,
      previousCaptureState: visualPresenceState.captureState,
      captureSourceName: screenSemanticSummaryGroundedThisTurn
        ? screenSemanticSummary?.source.name ?? null
        : null,
      now,
    })
    const visualHeartbeat = buildVisualHeartbeat({
      now,
      scenario: inferredScenario,
      previousState: visualPresenceState,
      context: layeredContext,
      invitedInspectionActive: perceptionSignals.invitedInspectionActive,
      groundedSummary,
      screenSemanticSummaryActive: Boolean(screenSemanticSummary),
      durabilityPulse,
    })
    const attention = updateVisualAttentionModel({
      now,
      scenario: inferredScenario,
      previousAttention: visualPresenceState.attention,
      currentForeground: interruptionContext.foregroundWindow ?? sensorySnapshot?.sample?.foregroundWindow,
      currentScene: visualHeartbeat.scene,
      invitedInspectionActive: perceptionSignals.invitedInspectionActive,
      perceptionAnchor: getActiveAttentionAnchor(perceptionState, now)
        ?? perceptionState.lastNonSelfForegroundTarget
        ?? null,
      durabilityPulse,
    })
    const digitalLifeMindState = await buildDigitalLifeMindState({
      cardId: activeCardId,
      now,
      context: layeredContext,
      recentMessages: [],
      previousVisualPresenceState: visualPresenceState,
      visualHeartbeat,
      attention,
      durabilityPulse,
      inspectionRequested: false,
      groundedThisTurn: screenSemanticSummaryGroundedThisTurn,
      cognitionMode: 'background',
      agentTurn: backgroundAgentTurn,
    })
    const previousMindPresenceState = visualPresenceState
    const committedDigitalLifeSpine = commitAlicizationDigitalLifeSpine({
      now,
      previousState: previousMindPresenceState,
      watchMode: visualHeartbeat.watchMode,
      scene: visualHeartbeat.scene,
      attention,
      mindState: digitalLifeMindState,
      captureState: backgroundCaptureGovernance.nextCaptureState,
      durabilityPulse,
      recentTransition: visualHeartbeat.recentTransition,
      nextSuggestedProbeMs: visualHeartbeat.nextSuggestedProbeMs,
    })
    visualPresenceState = committedDigitalLifeSpine.nextState
    const previousDigitalLifeRuntimeSurface = committedDigitalLifeSpine.previous.runtimeSurface
    const digitalLifeRuntimeSurface = committedDigitalLifeSpine.current.runtimeSurface
    await persistVisualPresenceState(activeCardId, visualPresenceState, {
      debounceWindowMs: visualPresenceCapturePersistDebounceWindowMs,
      fingerprint: buildVisualPresenceCapturePersistFingerprint(visualPresenceState),
    })

    const mindContinuityText = buildMindContinuityFragment({
      previousRuntimeSurface: previousDigitalLifeRuntimeSurface,
      nextRuntimeSurface: digitalLifeRuntimeSurface,
    })
    if (mindContinuityText) {
      await alicizationDb.appendSubconsciousFragments([{
        text: mindContinuityText,
        sourceKind: 'mind-continuity',
      }]).catch(async (error: unknown) => {
        await appendAuditLog({
          level: 'warning',
          category: 'alicization.mind',
          action: 'mind-continuity-write-failed',
          message: 'Failed to append mind continuity fragment after subconscious mind-state update.',
          payload: {
            reason: errorMessageFrom(error) ?? 'unknown error',
            fragment: mindContinuityText,
          },
        })
      })
    }

    const reflectionLedgerText = buildReflectionLedgerFragment({
      previousRuntimeSurface: previousDigitalLifeRuntimeSurface,
      nextRuntimeSurface: digitalLifeRuntimeSurface,
    })
    if (reflectionLedgerText) {
      await alicizationDb.appendSubconsciousFragments([{
        text: reflectionLedgerText,
        sourceKind: 'reflection-ledger',
      }]).catch(async (error: unknown) => {
        await appendAuditLog({
          level: 'warning',
          category: 'alicization.mind',
          action: 'reflection-ledger-write-failed',
          message: 'Failed to append reflection-ledger fragment after subconscious mind-state update.',
          payload: {
            reason: errorMessageFrom(error) ?? 'unknown error',
            fragment: reflectionLedgerText,
          },
        })
      })
    }

    const autobiographicalEpisodeText = buildAutobiographicalEpisodeFragment({
      previousRuntimeSurface: previousDigitalLifeRuntimeSurface,
      nextRuntimeSurface: digitalLifeRuntimeSurface,
    })
    if (autobiographicalEpisodeText) {
      await alicizationDb.appendSubconsciousFragments([{
        text: autobiographicalEpisodeText,
        sourceKind: 'autobiographical-episode',
      }]).catch(async (error: unknown) => {
        await appendAuditLog({
          level: 'warning',
          category: 'alicization.mind',
          action: 'autobiographical-episode-write-failed',
          message: 'Failed to append autobiographical episode fragment after subconscious mind-state update.',
          payload: {
            reason: errorMessageFrom(error) ?? 'unknown error',
            fragment: autobiographicalEpisodeText,
          },
        })
      })
    }

    if (visualPresenceState.workingMemoryEpisodes.length > previousWorkingMemoryCount) {
      const latestEpisode = visualPresenceState.workingMemoryEpisodes.at(-1)
      const visualSedimentText = latestEpisode
        ? buildVisualSedimentFragment(latestEpisode)
        : ''
      if (visualSedimentText) {
        await alicizationDb.appendSubconsciousFragments([{
          text: visualSedimentText,
          sourceKind: 'visual-sediment',
        }]).catch(async (error: unknown) => {
          await appendAuditLog({
            level: 'warning',
            category: 'alicization.visual-memory',
            action: 'visual-sediment-write-failed',
            message: 'Failed to append visual sediment fragment after visual episode closure.',
            payload: {
              reason: errorMessageFrom(error) ?? 'unknown error',
              fragment: visualSedimentText,
            },
          })
        })
      }
    }

    proactiveLoopState = progressProactiveCadenceState({
      state: proactiveLoopState,
      now,
      context: layeredContext,
      ...committedDigitalLifeSpine.current.proactivePolicy,
    })
    setProactiveLoopStateCache(activeCardId, proactiveLoopState)

    let proactive = false
    let suppressed = false
    const executionDelivered = await processPendingExecutionDeliveriesForCurrentCard(trigger, backgroundAgentTurn)
    if (executionDelivered) {
      proactive = true
    }
    else {
      const proactiveRuntimeSnapshot = deriveAlicizationRuntimeSnapshot({
        spine: committedDigitalLifeSpine.current,
        agentRuntime: deriveAlicizationAgentRuntimeTelemetryFromSession(
          backgroundAgentTurn?.getSessionSnapshot(),
        ),
      })
      const decision = evaluateProactivePolicy({
        now,
        context: layeredContext,
        proactiveState: proactiveLoopState,
        killSwitchSuspended,
        perception: perceptionSignals,
        runtimeDigest: proactiveRuntimeSnapshot,
        ...committedDigitalLifeSpine.current.proactivePolicy,
      })
      const hardSuppressed = !decision.shouldInterrupt
        && (
          decision.style === 'silent-observe'
          || decision.reasonCodes.includes('kill-switch-suspended')
          || decision.reasonCodes.includes('global-cooldown-active')
          || decision.reasonCodes.includes('busy-host')
          || decision.reasonCodes.includes('fullscreen-host')
        )

      if (!decision.shouldInterrupt)
        emitVisualPresencePulse(buildPresencePulsePayload(activeCardId, visualPresenceState))

      await appendAuditLog({
        level: interruptionContext.degraded.length > 0 ? 'warning' : 'notice',
        category: 'alicization.subconscious',
        action: 'proactive-policy-evaluated',
        message: 'Evaluated proactive interruption policy from layered sensory context.',
        payload: {
          trigger,
          consideredSignals: decision.consideredSignals,
          ignoredSignals: decision.ignoredSignals,
          decision: {
            shouldInterrupt: decision.shouldInterrupt,
            confidence: decision.confidence,
            urgency: decision.urgency,
            style: decision.style,
            cooldownMs: decision.cooldownMs,
            scenario: decision.scenario,
            policyVersion: decision.policyVersion,
          },
          reasonCodes: decision.reasonCodes,
          style: decision.style,
          whyNow: decision.whyNow,
          whyNotLater: decision.whyNotLater,
          cooldownMs: decision.cooldownMs,
          feedbackBias: decision.feedbackBias,
          perception: perceptionSignals,
          runtimeDigest: proactiveRuntimeSnapshot,
          visualPresence: digitalLifeRuntimeSurface,
          privateThought: digitalLifeRuntimeSurface.cognition.privateThought,
          layeredContext,
          agentRuntime: buildAgentRuntimeAuditSnapshot(backgroundAgentTurn),
        },
      })

      let autonomyActuation: any = null
      let autonomyExecutionProposalSurface: any = null
      try {
        const autonomy = committedDigitalLifeSpine.current.runtimeSurface.agency.autonomy ?? null
        if (autonomy?.selectedMode === 'prepare-act' || autonomy?.selectedMode === 'act') {
          const planningCapabilities = await resolveTaskPlanningCapabilities()
          autonomyActuation = await runAutonomyActuation({
            now,
            cardId: activeCardId,
            sessionId: await ensureActiveOrLatestSessionId(activeCardId),
            digitalLifeSpine: committedDigitalLifeSpine.current,
            runtimeDigest: proactiveRuntimeSnapshot,
            capabilities: planningCapabilities,
            workspaceRoot,
            listPendingReminders: async (limit?: number) =>
              (await alicizationDb.listPendingScheduledTasks(limit ?? 128).catch(() => []))
                .filter((task: any) => String(task?.taskId ?? '').startsWith(`reminder:${activeCardId}:`)),
            scheduleReminder: async (payload: {
              minutes: number
              message: string
              sourceTurnId?: string
            }) => await scheduleAutonomyReminder(activeCardId, payload),
            planTaskThread: async (payload: any) => await planAutonomyTaskThread(activeCardId, payload),
            dispatchTaskThread: async (payload: any) => await dispatchAutonomyTaskThread(payload),
          })
          autonomyExecutionProposalSurface = deriveAutonomyExecutionProposalSurface({
            actuationResult: autonomyActuation,
            digitalLifeSpine: committedDigitalLifeSpine.current,
          })

          if (
            autonomyActuation.reminderScheduled
            || autonomyActuation.taskPlanned
            || autonomyActuation.taskDispatched
          ) {
            proactive = true
            await appendAuditLog({
              level: 'notice',
              category: 'alicization.subconscious',
              action: 'autonomy-actuation-applied',
              message: 'Applied an autonomous actuation follow-through from the subconscious runtime.',
              payload: {
                trigger,
                autonomy: {
                  selectedMode: autonomy.selectedMode,
                  visibleAction: autonomy.visibleAction,
                  shouldSpeak: autonomy.shouldSpeak,
                  shouldAct: autonomy.shouldAct,
                  actReadiness: autonomy.actReadiness,
                  deferReason: autonomy.deferReason ?? null,
                  executionIntent: autonomy.executionIntent ?? null,
                },
                actuation: autonomyActuation,
                runtimeDigest: proactiveRuntimeSnapshot,
              },
            })
          }
        }
      }
      catch (error) {
        await appendAuditLog({
          level: 'warning',
          category: 'alicization.subconscious',
          action: 'autonomy-actuation-failed',
          message: 'Autonomous actuation follow-through failed after policy evaluation.',
          payload: {
            trigger,
            reason: errorMessageFrom(error) ?? 'unknown-error',
            runtimeDigest: proactiveRuntimeSnapshot,
          },
        })
      }

      const shouldSurfaceAutonomyProposal = Boolean(
        autonomyExecutionProposalSurface
        && !hardSuppressed,
      )
      if (hardSuppressed) {
        suppressed = true
        const obediencePenalty = decision.reasonCodes.includes('busy-host') || decision.reasonCodes.includes('fullscreen-host')
          ? -0.01
          : 0
        if (obediencePenalty !== 0) {
          await queueSoulMutation(async (current: any) => {
            const parsed = parseSoul(current.content)
            const nextPersonality = {
              ...parsed.frontmatter.personality,
              obedience: clamp01(parsed.frontmatter.personality.obedience + obediencePenalty),
            }
            const nextFrontmatter = {
              ...parsed.frontmatter,
              personality: nextPersonality,
            }
            const syncedBody = syncPersonalityBaselineInBody(parsed.body, nextPersonality)
            return snapshotFromContent(toSoulContent(nextFrontmatter, syncedBody))
          })
        }
        await appendAuditLog({
          level: 'notice',
          category: 'alicization.subconscious',
          action: 'alicization.subconscious.suppressed',
          message: 'Suppressed proactive interruption after policy evaluation.',
          payload: {
            trigger,
            decision: {
              shouldInterrupt: decision.shouldInterrupt,
              confidence: decision.confidence,
              urgency: decision.urgency,
              style: decision.style,
              cooldownMs: decision.cooldownMs,
              scenario: decision.scenario,
              policyVersion: decision.policyVersion,
            },
            reasonCodes: decision.reasonCodes,
            style: decision.style,
            whyNow: decision.whyNow,
            whyNotLater: decision.whyNotLater,
            cooldownMs: decision.cooldownMs,
            feedbackBias: decision.feedbackBias,
            perception: perceptionSignals,
            runtimeDigest: proactiveRuntimeSnapshot,
            obediencePenalty,
          },
        })
      }
      else if (decision.shouldInterrupt || shouldSurfaceAutonomyProposal) {
        const personality = soulForSubconscious.frontmatter.personality
        const personaContext = {
          customDirectives: normalizeCustomDirectives(soulForSubconscious.frontmatter.custom_directives),
          coreIncarnation: soulForSubconscious.frontmatter.core_incarnation,
          hostAttitude: soulForSubconscious.frontmatter.host_attitude,
        }
        proactive = true
        const turnId = `subconscious:${activeCardId}:${now}`
        let structured: any = null
        let deliveryDecision = decision
        if (autonomyExecutionProposalSurface) {
          const performanceManifest = await getPerformanceManifest()
          const structuredPerformance = clampAlicizationPerformancePayloadToManifest(
            buildDefaultDialoguePerformancePayload(autonomyExecutionProposalSurface.emotion),
            performanceManifest,
            autonomyExecutionProposalSurface.emotion,
          ).performance
          structured = {
            thought: autonomyExecutionProposalSurface.thought,
            emotion: structuredPerformance.baseEmotion,
            reply: autonomyExecutionProposalSurface.reply,
            performance: structuredPerformance,
            parsePath: 'deterministic',
            format: 'subconscious-proactive-v1',
            proactive: buildProactiveMetadataFromDecision(decision),
          }
          await appendAuditLog({
            level: 'notice',
            category: 'alicization.subconscious',
            action: 'autonomy-execution-proposal-generated',
            message: 'Generated a proactive execution proposal from an affirmation-gated autonomy task thread.',
            payload: {
              turnId,
              proposal: autonomyExecutionProposalSurface,
              actuation: autonomyActuation,
              decision: {
                scenario: decision.scenario,
                style: decision.style,
                urgency: decision.urgency,
                confidence: decision.confidence,
              },
              agentRuntime: buildAgentRuntimeAuditSnapshot(backgroundAgentTurn),
            },
          })
        }
        else {
          const proactiveRecallSeed = buildProactiveRecallSeed({
            foregroundWindow: interruptionContext.foregroundWindow,
            phantomSeed: [
              buildVisualRecallSeed({
                scene: visualPresenceState.currentScene,
                emotionalTension: visualPresenceState.privateThought?.emotionalTension,
              }),
              buildMindContinuityRecallSeed(digitalLifeRuntimeSurface),
            ].filter(Boolean).join(' | '),
          })
          const organicPromptContext = await resolveOrganicMemoryPromptContext({
            recallSeed: proactiveRecallSeed,
          })
          const sociallyAdjustedDecision = {
            ...decision,
            style: adjustProactiveStyleFromHostPersonModel({
              currentStyle: decision.style,
              hostPersonModel: organicPromptContext.hostPersonModel ?? null,
              contexts: inferHostSocialContextsFromText([
                decision.scenario,
                layeredContext.workload.kind,
                layeredContext.content.kind,
                proactiveRecallSeed,
              ].filter(Boolean).join(' ')),
            }),
          }
          deliveryDecision = sociallyAdjustedDecision
          const llmStructured = await generateProactiveStructuredWithGateway(
            personality,
            nextState,
            layeredContext,
            sociallyAdjustedDecision,
            organicPromptContext,
            perceptionState,
            visualPresenceState,
            {
              turnId,
            },
            backgroundAgentTurn,
          )
          const rawStructured = llmStructured ?? buildProactiveStructured(
            personality,
            nextState,
            layeredContext,
            sociallyAdjustedDecision,
            perceptionState,
            visualPresenceState,
            {
              customDirectives: personaContext.customDirectives,
              coreIncarnation: organicPromptContext.coreIncarnation,
              hostAttitude: organicPromptContext.hostAttitude,
              hostPersonModel: organicPromptContext.hostPersonModel ?? null,
            },
          )
          const performanceManifest = await getPerformanceManifest()
          const structuredPerformance = clampAlicizationPerformancePayloadToManifest(
            rawStructured.performance,
            performanceManifest,
            rawStructured.emotion,
          ).performance
          structured = {
            ...rawStructured,
            emotion: structuredPerformance.baseEmotion,
            performance: structuredPerformance,
          }
          if (llmStructured) {
            await appendAuditLog({
              level: 'notice',
              category: 'alicization.subconscious',
              action: 'proactive-llm-generated',
              message: 'Generated proactive utterance with policy-locked prompt constraints.',
              payload: {
                decision: {
                  scenario: decision.scenario,
                  style: deliveryDecision.style,
                  urgency: decision.urgency,
                  confidence: decision.confidence,
                },
                format: llmStructured.format,
                recallSeed: proactiveRecallSeed || null,
                recalledFragments: organicPromptContext.recalledFragments.length,
                agentRuntime: buildAgentRuntimeAuditSnapshot(backgroundAgentTurn),
              },
            })
          }
          else {
            await appendAuditLog({
              level: 'warning',
              category: 'alicization.subconscious',
              action: 'proactive-llm-fallback',
              message: 'Main gateway proactive generation unavailable; deterministic fallback reused the same policy decision.',
              payload: {
                decision: {
                  scenario: decision.scenario,
                  style: deliveryDecision.style,
                  urgency: decision.urgency,
                  confidence: decision.confidence,
                },
                customDirectivesChars: personaContext.customDirectives.length,
                recallSeed: proactiveRecallSeed || null,
                recalledFragments: organicPromptContext.recalledFragments.length,
                agentRuntime: buildAgentRuntimeAuditSnapshot(backgroundAgentTurn),
              },
            })
          }
        }
        const deliveredSessionId = await ensureActiveOrLatestSessionId(activeCardId)
        const persisted = await appendConversationTurnWithGuards({
          turnId,
          sessionId: deliveredSessionId,
          assistantText: structured.reply,
          structured,
          origin: 'subconscious-proactive',
          createdAt: now,
        })
        if (!persisted) {
          proactive = false
        }
        else {
          nextState.boredom = clampNeed(nextState.boredom * 0.35)
          nextState.loneliness = clampNeed(nextState.loneliness * 0.4)
          nextState.fatigue = clampNeed(nextState.fatigue + 5)
          syncAgentTurnSessionMirror({
            agentTurn: backgroundAgentTurn,
            cardId: activeCardId,
            continuitySignals: structured.proactive
              ? [buildPendingProactiveContinuitySignal({
                  now,
                  pending: {
                    turnId,
                    scenario: structured.proactive.scenario,
                    deliveredAt: now,
                    feedbackWindowMs: structured.proactive.feedbackWindowMs,
                  },
                })]
              : undefined,
            sessionId: deliveredSessionId,
            source: 'proactive',
          })
          await appendAuditLog({
            level: 'notice',
            category: 'alicization.subconscious',
            action: 'proactive-triggered',
            message: 'Generated proactive dialogue from the Epoch 3 policy loop.',
            payload: {
              turnId,
              decision: {
                shouldInterrupt: decision.shouldInterrupt,
                confidence: decision.confidence,
                urgency: decision.urgency,
                style: deliveryDecision.style,
                cooldownMs: decision.cooldownMs,
                scenario: decision.scenario,
                policyVersion: decision.policyVersion,
              },
              reasonCodes: decision.reasonCodes,
              style: deliveryDecision.style,
              format: structured.format,
              proactive: structured.proactive ?? null,
              emotion: structured.emotion,
              trigger,
              agentRuntime: buildAgentRuntimeAuditSnapshot(backgroundAgentTurn),
            },
          })
        }
      }
    }

    const shouldPersist = trigger === 'force'
      || proactive
      || suppressed
      || now - nextState.lastSavedAt >= alicizationSubconsciousPersistMs
    proactiveLoopState = await ensureProactiveLoopState(activeCardId)
    await persistProactiveLoopState(activeCardId, proactiveLoopState)
    if (shouldPersist) {
      nextState.lastSavedAt = now
      await persistSubconsciousState(activeCardId, nextState)
    }
    else {
      setSubconsciousStateCache(activeCardId, nextState)
    }
    return { proactive, suppressed }
  }

  return {
    runSubconsciousTickForCurrentCard,
  }
}
