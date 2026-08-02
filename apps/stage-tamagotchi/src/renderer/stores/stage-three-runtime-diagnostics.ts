import type { StageEmbodimentSpeechArticulationState } from '@proj-alicization/stage-shared'
import type {
  ThreeHitTestReadTracePayload,
  ThreeRendererMemorySnapshot,
  ThreeSceneRenderInfoTracePayload,
  VrmDisposeEndTracePayload,
  VrmDisposeStartTracePayload,
  VrmEmbodimentSegmentDriver,
  VrmLifecycleReason,
  VrmLoadEndTracePayload,
  VrmLoadErrorTracePayload,
  VrmLoadStartTracePayload,
  VrmSceneSummarySnapshot,
  VrmUpdateFrameTracePayload,
} from '@proj-alicization/stage-ui-three/trace'

import type { StageThreeRuntimeTraceEnvelope, StageThreeRuntimeTraceForwardedPayload } from '../../shared/eventa'

import {
  acquireStageThreeRuntimeTrace,
  getStageThreeRuntimeTraceContext,
  stageThreeTraceHitTestReadEvent,
  stageThreeTraceRenderInfoEvent,
  stageThreeTraceVrmDisposeEndEvent,
  stageThreeTraceVrmDisposeStartEvent,
  stageThreeTraceVrmLoadEndEvent,
  stageThreeTraceVrmLoadErrorEvent,
  stageThreeTraceVrmLoadStartEvent,
  stageThreeTraceVrmUpdateFrameEvent,
} from '@proj-alicization/stage-ui-three/trace'
import { defineStore } from 'pinia'
import { ref } from 'vue'

import { stageThreeRuntimeTraceForwardedEvent } from '../../shared/eventa'
import {
  getStageThreeRuntimeTraceBroadcastContext,
  getStageThreeRuntimeTraceBroadcastOriginId,
  initializeStageThreeRuntimeTraceBridge,
  setStageThreeRuntimeTraceRemoteSubscription,
} from '../bridges/stage-three-runtime-trace'

export const TRACE_HISTORY_LIMIT = 20

export interface StageThreeRuntimeThreeRenderDiagnostics {
  drawCalls: number
  geometries: number
  lastTimestampMs: number
  lines: number
  points: number
  renderCount: number
  textures: number
  triangles: number
}

export interface StageThreeRuntimeVrmUpdateDiagnostics {
  lastConsumedExpressionAliases: string[]
  lastConsumedMotionAliases: string[]
  lastConsumedVrmActionFadeMs: number | null
  lastConsumedVrmExpressionBlendMs: number | null
  animationMixerMs: number
  blinkAndSaccadeMs: number
  bodyActive: boolean
  deltaMs: number
  embodimentSegmentAligned: boolean | null
  embodimentSegmentMismatchDrivers: VrmEmbodimentSegmentDriver[]
  emoteMs: number
  expressionMs: number
  faceActive: boolean
  frameCount: number
  humanoidMs: number
  lastTimestampMs: number
  lipSyncMs: number
  lipsyncActive: boolean
  lookAtMs: number
  motionActive: boolean
  performanceSegmentId: string | null
  continuityFrameSummary: string | null
  springBoneMs: number
  speechSegmentId: string | null
  totalMs: number
  voiceActive: boolean
  vrmFrameHookMs: number
}

export interface StageThreeRuntimeHitTestDiagnostics {
  lastDurationMs: number
  lastReadHeight: number
  lastReadWidth: number
  lastTimestampMs: number
  readCount: number
  totalDurationMs: number
}

export interface StageThreeRuntimeVrmLifecycleDiagnostics {
  lastDisposeDurationMs: number
  lastDisposeEndAt: number
  lastDisposeStartAt: number
  lastErrorMessage: string
  lastLoadDurationMs: number
  lastLoadEndAt: number
  lastLoadStartAt: number
  lastModelSrc: string
  lastReason?: VrmLifecycleReason
}

export interface StageThreeRuntimeResourceSnapshotRecord {
  modelSrc?: string
  phase: 'after-dispose' | 'after-load' | 'before-dispose'
  reason?: VrmLifecycleReason
  rendererMemory?: ThreeRendererMemorySnapshot
  sceneSummary?: VrmSceneSummarySnapshot
  ts: number
}

export interface StageThreeRuntimeResourceSnapshotDiagnostics {
  history: StageThreeRuntimeResourceSnapshotRecord[]
  lastAfterDispose?: StageThreeRuntimeResourceSnapshotRecord
  lastAfterLoad?: StageThreeRuntimeResourceSnapshotRecord
  lastBeforeDispose?: StageThreeRuntimeResourceSnapshotRecord
}

export interface StageThreeRuntimeSpeechEmbodimentDiagnostics {
  phase: 'idle' | 'starting' | 'playing' | 'stopping'
  playbackPhase: 'idle' | 'playing'
  currentBodyState?: string | null
  continuityMode?: string | null
  quietLineMs?: number | null
  currentInwardPreoccupation?: string | null
  activePresenceSummary?: string | null
  embodiedPresenceSummary?: string | null
  runtimeSummary?: string | null
  speechEnergy: number
  prosodyIntensity: number
  emphasisLevel: number
  cadencePulse: number
  visemeIntensity: number
  articulation: StageEmbodimentSpeechArticulationState | null
  runtimeDynamics: {
    profile: 'default' | 'quiet-accompaniment' | 'protective-watch'
    variationToken: string | null
    residentEmotion: string | null
    residentDelivery: string | null
    residentFacialCue: string | null
    residentActionCue: string | null
    actionIntensity: number
    breathDrive: number
    focusDrive: number
    provenance: {
      watchMode: string | null
      bodyState: string | null
      continuityMode: string | null
      thoughtStance: string | null
      thoughtShouldSpeak: boolean | null
      thoughtTension: string | null
      runtimeChannel: string | null
      runtimeSummary: string | null
      activeThreadId: string | null
      activeThreadTitle: string | null
      preferredPresence: string | null
      selectedAction: string | null
      personaBiasSummary: string | null
      personaOpeningGuidance: string | null
      scene: string | null
      scenario: string | null
    }
    eventPointers: {
      recentTransition: {
        fromWatchMode: string | null
        toWatchMode: string | null
        fromScenario: string | null
        durationMs: number
        reason: string | null
        occurredAt: number
      } | null
      rationaleTags: string[]
      focusBeliefId: string | null
      focusInquiryId: string | null
      commitmentId: string | null
      runtimeThreadId: string | null
      governorDrive: string | null
      governorIntentionId: string | null
      selectedThoughtThreadId: string | null
    }
  } | null
  recentDrivingEvent: {
    kind: string | null
    decisionTraceId: string | null
    summary: string | null
    createdAt: number | null
  } | null
  recentDrivingTraceRecord: {
    decisionTraceId: string
    activeThreadId: string | null
    turnMode: string | null
    truthState: string | null
    repairState: string | null
    finalSurfacePolicy: string | null
    closureState: string | null
    suppressionTags: string[]
    authorityTrustSummary?: string | null
  } | null
  recentDrivingTraceEvents: Array<{
    kind: string | null
    summary: string | null
    createdAt: number | null
  }>
  recentDrivingTraceDetails: Array<{
    kind: string | null
    summary: string | null
    createdAt: number | null
    details: Array<{
      label: string
      value: string
    }>
  }>
  traceSummary?: {
    cueId?: string | null
    decisionTraceId: string
    turnMode: string | null
    truthState: string | null
    repairState: string | null
    finalSurfacePolicy: string | null
    closureState: string | null
    activeThreadId: string | null
    suppressionTags: string[]
    latestEventSummary: string | null
    segmentBinding: {
      matched: boolean
      rendererTarget: 'live2d' | 'vrm' | 'speech' | null
      matchedDrivers: Array<'body' | 'face' | 'motion' | 'lipsync' | 'voice'>
      matchedSources: string[]
      bodySegmentMatched?: boolean | null
      faceSegmentMatched?: boolean | null
      motionSegmentMatched?: boolean | null
      lipsyncSegmentMatched?: boolean | null
      voiceSegmentMatched?: boolean | null
    } | null
  } | null
  driverSummary: {
    rendererTarget: 'live2d' | 'vrm' | 'speech' | null
    body?: {
      frameMode: string | null
      stillness: number | null
      gazeStability: number | null
      breathAmplitude: number | null
      expressivity: number | null
      segmentId: string | null
      reasonSummary?: string | null
    } | null
    face: {
      cue: string | null
      source: string | null
      confidence: number | null
      segmentId: string | null
      residentMode?: string | null
      preferredBlinkCadence?: string | null
      preferredGazeMode?: string | null
      reasonSummary?: string | null
    } | null
    motion: {
      cue: string | null
      source: string | null
      confidence: number | null
      segmentId: string | null
      residentMode?: string | null
      preferredBlinkCadence?: string | null
      preferredGazeMode?: string | null
      reasonSummary?: string | null
    } | null
    lipsync: {
      cue: string | null
      source: string | null
      confidence: number | null
      segmentId: string | null
      mode: string | null
      residentMode?: string | null
      preferredBlinkCadence?: string | null
      preferredGazeMode?: string | null
      reasonSummary?: string | null
    } | null
    voice?: string | null
  } | null
  rendererAlignment: {
    live2d: {
      predicted: string | null
      actual: string | null
      reason: string | null
      status: 'aligned' | 'predicted-only' | 'actual-only' | 'drifted'
      driftKind: 'aligned' | 'resident-not-yet-applied' | 'runtime-only-visible' | 'alias-resolution-drift'
      faceDriverCue: string | null
      faceDriverSource: string | null
      faceDriverSegmentId?: string | null
      motionDriverCue: string | null
      motionDriverSource: string | null
      motionDriverSegmentId?: string | null
    } | null
    vrm: {
      predicted: string | null
      actual: string | null
      reason: string | null
      status: 'aligned' | 'predicted-only' | 'actual-only' | 'drifted'
      driftKind: 'aligned' | 'resident-not-yet-applied' | 'runtime-only-visible' | 'alias-resolution-drift'
      faceDriverCue: string | null
      faceDriverSource: string | null
      faceDriverSegmentId?: string | null
      motionDriverCue: string | null
      motionDriverSource: string | null
      motionDriverSegmentId?: string | null
    } | null
  }
  rendererDriftSummary?: {
    live2d: string | null
    vrm: string | null
    primary: string | null
  } | null
  articulationSummary: {
    cueId?: string | null
    segmentId?: string | null
    voice: string | null
    topVisemes: string | null
    bindingSummary?: string | null
  } | null
  authoritySummary: {
    cueId: string | null
    segmentId: string | null
    rendererTarget: 'live2d' | 'vrm' | 'speech' | null
    matchedDrivers: Array<'body' | 'face' | 'motion' | 'lipsync' | 'voice'>
    matchedSources: string[]
    bindingSummary: string | null
    matchSummary: string | null
    authorityTrustSummary?: string | null
    prosodyAuthoritySummary?: string | null
    authorityMismatchSummary?: string | null
    authorityMismatchReasonSummary?: string | null
    authorityMismatchDisplay?: string | null
    settleSummary: string | null
    traceEmbodimentSummary?: string | null
  } | null
  convergence?: {
    segmentId: string | null
    state: 'fully-reunited' | 'audible-body-carry' | 'body-carried-to-renderer-rejoin' | 'body-only-carry' | 'audible-only-carry' | 'split-authority'
    line: string
    matchedDrivers: Array<'body' | 'face' | 'motion' | 'lipsync' | 'voice'>
    missingDrivers: Array<'body' | 'face' | 'motion' | 'lipsync' | 'voice'>
    summary: string
  } | null
  speechEvidence?: {
    voiceSummary: string | null
    bodyContinuitySummary?: string | null
    authorityMatchSummary: string | null
    topVisemeSummary: string | null
    cueSummary: string | null
    cueIdentityPresent: boolean
    cueProsodyPresent: boolean
    personaStyleSummary: string | null
    prosodyAuthoritySummary?: string | null
    timingSummary: string | null
    driverExecutionSummary: string | null
    visemeHintsSummary: string | null
  } | null
  cueMicroSummary: {
    cueId: string | null
    cueText: string | null
    cue: string | null
    personaStyle: string | null
    timing: string | null
  } | null
  driverExecutionSummary: string | null
  live2dExecution: {
    activeExpression: {
      name: string | null
      reason: 'emotion' | 'facial-cue' | 'neutral' | 'preferred' | null
      score: number | null
      segmentId: string | null
    } | null
    activeMotion: {
      group: string | null
      index: number | null
      segmentId: string | null
    } | null
    cue: {
      emotion: string | null
      facialCue: string | null
      residentMode?: string | null
      preferredBlinkCadence?: string | null
      preferredGazeMode?: string | null
      preferredExpressionAliases: string[]
      preferredMotionAliases?: string[]
      reasonTags?: string[]
      signature?: string | null
      live2dFacialReleaseMs: number | null
      live2dMotionFollowThroughMs: number | null
      vrmActionFadeMs?: number | null
      vrmExpressionBlendMs?: number | null
    } | null
  } | null
  visemeHintsSummary: string | null
  playbackTelemetry: {
    actualDurationMs: number | null
    plannedDurationMs: number | null
    driftMs: number | null
    settleMs: number | null
    stopReason: string | null
    rendererTarget: 'live2d' | 'vrm' | 'speech' | null
    driverAuthority: {
      segmentId: string | null
      rendererTarget: 'live2d' | 'vrm' | 'speech' | null
      matchedDrivers: Array<'body' | 'face' | 'motion' | 'lipsync' | 'voice'>
      matchedSources?: string[]
      sources: string[]
      bodySegmentMatched?: boolean | null
      faceSegmentMatched: boolean | null
      motionSegmentMatched: boolean | null
      lipsyncSegmentMatched: boolean | null
      voiceSegmentMatched?: boolean | null
      prosodyAuthority?: {
        segmentId: string | null
        provenance: 'authority-bound' | 'fallback-derived'
        source: string | null
        mode: string | null
        cueProsodyWeight: number | null
        cueMouthWeight: number | null
        cueHeadWeight: number | null
        visemePeakWeight: number | null
      } | null
    } | null
    prosodyAuthority?: {
      segmentId: string | null
      provenance: 'authority-bound' | 'fallback-derived'
      source: string | null
      mode: string | null
      cueProsodyWeight: number | null
      cueMouthWeight: number | null
      cueHeadWeight: number | null
      visemePeakWeight: number | null
      summary?: string | null
    } | null
    cue: {
      id: string | null
      text?: string | null
      emotion?: string | null
      prosodyWeight?: number | null
      mouthWeight?: number | null
      headWeight?: number | null
      personaStyleSummary?: string | null
      facialHoldMs?: number | null
      actionHoldMs?: number | null
      emotionHoldMs?: number | null
      facialCue?: string | null
      actionCue?: string | null
      actionWindow?: string | null
      interruptMode?: string | null
      settleMode?: string | null
      rendererHints: {
        residentMode?: string | null
        preferredBlinkCadence?: string | null
        preferredExpressionAliases?: string[]
        preferredGazeMode?: string | null
        preferredMotionAliases?: string[]
        reasonTags?: string[]
        signature?: string | null
      } | null
      rendererSettle: {
        live2dFacialReleaseMs: number | null
        live2dMotionFollowThroughMs: number | null
        vrmActionFadeMs: number | null
        vrmExpressionBlendMs: number | null
      } | null
    } | null
    drivers: {
      body?: {
        frameMode: string | null
        stillness: number | null
        gazeStability: number | null
        breathAmplitude: number | null
        expressivity: number | null
        source: string | null
        confidence: number | null
        segmentId: string | null
      } | null
      face: {
        emotion: string | null
        facialCue: string | null
        intensity: number | null
        holdMs: number | null
        source: string | null
        confidence: number | null
        preUtteranceCue: string | null
        postUtteranceCue: string | null
        segmentId: string | null
      } | null
      lipsync: {
        mode: string | null
        playbackPhase: string | null
        segmentId: string | null
        continuityHoldMs?: number | null
        visemeHints: Array<{
          segmentId: string | null
          viseme: string | null
          weight: number | null
          source: string | null
          confidence: number | null
        }>
      } | null
      motion: {
        idleBase: string | null
        attentionMode: string | null
        actionCue: string | null
        intensity: number | null
        holdMs: number | null
        source: string | null
        confidence: number | null
        segmentId: string | null
      } | null
      voice?: {
        playbackPhase: 'idle' | 'playing'
        continuityHoldMs: number
        segmentId: string | null
        source: string | null
        provenance: 'authority-bound' | 'fallback-derived'
        mode: string | null
        cueProsodyWeight: number | null
        cueMouthWeight: number | null
        cueHeadWeight: number | null
        visemePeakWeight: number | null
      } | null
    } | null
  } | null
}

export function createDefaultStageThreeRenderDiagnostics(): StageThreeRuntimeThreeRenderDiagnostics {
  return {
    drawCalls: 0,
    geometries: 0,
    lastTimestampMs: 0,
    lines: 0,
    points: 0,
    renderCount: 0,
    textures: 0,
    triangles: 0,
  }
}

export function createDefaultStageVrmUpdateDiagnostics(): StageThreeRuntimeVrmUpdateDiagnostics {
  return {
    lastConsumedExpressionAliases: [],
    lastConsumedMotionAliases: [],
    lastConsumedVrmActionFadeMs: null,
    lastConsumedVrmExpressionBlendMs: null,
    animationMixerMs: 0,
    blinkAndSaccadeMs: 0,
    bodyActive: false,
    deltaMs: 0,
    embodimentSegmentAligned: null,
    embodimentSegmentMismatchDrivers: [],
    emoteMs: 0,
    expressionMs: 0,
    faceActive: false,
    frameCount: 0,
    humanoidMs: 0,
    lastTimestampMs: 0,
    lipSyncMs: 0,
    lipsyncActive: false,
    lookAtMs: 0,
    motionActive: false,
    performanceSegmentId: null,
    continuityFrameSummary: null,
    springBoneMs: 0,
    speechSegmentId: null,
    totalMs: 0,
    voiceActive: false,
    vrmFrameHookMs: 0,
  }
}

export function createDefaultStageHitTestDiagnostics(): StageThreeRuntimeHitTestDiagnostics {
  return {
    lastDurationMs: 0,
    lastReadHeight: 0,
    lastReadWidth: 0,
    lastTimestampMs: 0,
    readCount: 0,
    totalDurationMs: 0,
  }
}

export function createDefaultStageVrmLifecycleDiagnostics(): StageThreeRuntimeVrmLifecycleDiagnostics {
  return {
    lastDisposeDurationMs: 0,
    lastDisposeEndAt: 0,
    lastDisposeStartAt: 0,
    lastErrorMessage: '',
    lastLoadDurationMs: 0,
    lastLoadEndAt: 0,
    lastLoadStartAt: 0,
    lastModelSrc: '',
  }
}

export function createDefaultStageResourceSnapshotDiagnostics(): StageThreeRuntimeResourceSnapshotDiagnostics {
  return {
    history: [],
  }
}

export function createDefaultStageSpeechEmbodimentDiagnostics(): StageThreeRuntimeSpeechEmbodimentDiagnostics {
  return {
    phase: 'idle',
    playbackPhase: 'idle',
    speechEnergy: 0,
    prosodyIntensity: 0,
    emphasisLevel: 0,
    cadencePulse: 0,
    visemeIntensity: 0,
    articulation: null,
    runtimeDynamics: null,
    recentDrivingEvent: null,
    recentDrivingTraceRecord: null,
    recentDrivingTraceEvents: [],
    recentDrivingTraceDetails: [],
    traceSummary: null,
    driverSummary: null,
    rendererAlignment: {
      live2d: null,
      vrm: null,
    },
    rendererDriftSummary: null,
    articulationSummary: null,
    authoritySummary: null,
    convergence: null,
    speechEvidence: null,
    cueMicroSummary: null,
    driverExecutionSummary: null,
    live2dExecution: null,
    visemeHintsSummary: null,
    playbackTelemetry: null,
  }
}

export function pushTraceHistory(
  history: StageThreeRuntimeResourceSnapshotRecord[],
  record: StageThreeRuntimeResourceSnapshotRecord,
) {
  const nextHistory = [...history, record]
  return nextHistory.slice(-TRACE_HISTORY_LIMIT)
}

export function applyThreeRenderTracePayload(
  current: StageThreeRuntimeThreeRenderDiagnostics,
  payload: ThreeSceneRenderInfoTracePayload,
): StageThreeRuntimeThreeRenderDiagnostics {
  return {
    drawCalls: payload.drawCalls,
    geometries: payload.geometries,
    lastTimestampMs: payload.ts,
    lines: payload.lines,
    points: payload.points,
    renderCount: current.renderCount + 1,
    textures: payload.textures,
    triangles: payload.triangles,
  }
}

export function applyHitTestTracePayload(
  current: StageThreeRuntimeHitTestDiagnostics,
  payload: ThreeHitTestReadTracePayload,
): StageThreeRuntimeHitTestDiagnostics {
  return {
    lastDurationMs: payload.durationMs,
    lastReadHeight: payload.readHeight,
    lastReadWidth: payload.readWidth,
    lastTimestampMs: payload.ts,
    readCount: current.readCount + 1,
    totalDurationMs: current.totalDurationMs + payload.durationMs,
  }
}

function buildVrmContinuityFrameSummary(input: {
  bodyActive: boolean
  embodimentSegmentAligned: boolean | null
  embodimentSegmentMismatchDrivers: VrmEmbodimentSegmentDriver[]
  faceActive: boolean
  lipsyncActive: boolean
  motionActive: boolean
  performanceSegmentId: string | null
  speechSegmentId: string | null
  voiceActive: boolean
}) {
  if (input.embodimentSegmentAligned == null)
    return null

  const allDrivers: VrmEmbodimentSegmentDriver[] = ['body', 'face', 'motion', 'lipsync', 'voice']
  const activeDrivers = [
    input.bodyActive ? 'body' : null,
    input.faceActive ? 'face' : null,
    input.motionActive ? 'motion' : null,
    input.lipsyncActive ? 'lipsync' : null,
    input.voiceActive ? 'voice' : null,
  ].filter((driver): driver is VrmEmbodimentSegmentDriver => Boolean(driver))
  const activeSummary = activeDrivers.length > 0 ? activeDrivers.join(', ') : 'none'
  const mismatchDriverSet = new Set(input.embodimentSegmentMismatchDrivers)
  const matchedDrivers = input.embodimentSegmentAligned
    ? activeDrivers
    : activeDrivers.filter(driver => !mismatchDriverSet.has(driver))
  const matchedDriverSet = new Set(matchedDrivers)
  const remainingOpenDrivers = allDrivers.filter(driver => !matchedDriverSet.has(driver))
  const matchedDriverKey = matchedDrivers.join('+')
  const lane = (() => {
    if (matchedDriverKey === 'body+face+motion+lipsync+voice')
      return 'full-driver-rejoin'
    if (matchedDriverKey === 'body+face+motion')
      return 'body+face+motion-only'
    if (matchedDriverKey === 'body+lipsync+voice')
      return 'body+lipsync+voice-only'
    if (matchedDriverKey === 'lipsync+voice')
      return 'lipsync+voice-only'
    if (matchedDriverKey === 'face+lipsync')
      return 'face+lipsync-only'
    if (matchedDriverKey === 'motion+lipsync')
      return 'motion+lipsync-only'
    if (matchedDriverKey === 'body')
      return 'body-only'
    return matchedDrivers.length > 0 ? `${matchedDriverKey}-only` : null
  })()
  const closure = (() => {
    if (matchedDriverKey === 'body+face+motion+lipsync+voice')
      return 'full-cross-modal-lock'
    if (matchedDriverKey === 'body+lipsync+voice')
      return 'audible-body-carry'
    if (matchedDriverKey === 'lipsync+voice')
      return 'voice-lipsync-carry'
    if (matchedDriverKey === 'body')
      return 'body-only-hold'
    if (matchedDriverKey === 'face+lipsync' || matchedDriverKey === 'motion+lipsync')
      return 'renderer-rejoin-without-body'
    return null
  })()
  const remainingOpenSummary = remainingOpenDrivers.length > 0
    ? remainingOpenDrivers.join('+')
    : 'none'
  const closureSegments = [
    closure ? `closure=${closure}` : null,
    lane ? `lane=${lane}` : null,
    `remaining-open=${remainingOpenSummary}`,
  ].filter((segment): segment is string => Boolean(segment))

  if (input.embodimentSegmentAligned) {
    return [
      'aligned',
      `segment=${input.performanceSegmentId ?? input.speechSegmentId ?? 'n/a'}`,
      `active=${activeSummary}`,
      ...closureSegments,
    ].join(' | ')
  }

  const mismatchSummary = input.embodimentSegmentMismatchDrivers.length > 0
    ? input.embodimentSegmentMismatchDrivers.join(', ')
    : 'none'

  return [
    'drift',
    `performance=${input.performanceSegmentId ?? 'n/a'}`,
    `speech=${input.speechSegmentId ?? 'n/a'}`,
    `active=${activeSummary}`,
    `mismatch=${mismatchSummary}`,
    ...closureSegments,
  ].join(' | ')
}

export function applyVrmUpdateTracePayload(
  current: StageThreeRuntimeVrmUpdateDiagnostics,
  payload: VrmUpdateFrameTracePayload,
): StageThreeRuntimeVrmUpdateDiagnostics {
  const performanceSegmentId = payload.performanceSegmentId === undefined
    ? current.performanceSegmentId
    : payload.performanceSegmentId
  const speechSegmentId = payload.speechSegmentId === undefined
    ? current.speechSegmentId
    : payload.speechSegmentId
  const embodimentSegmentAligned = payload.embodimentSegmentAligned === undefined
    ? current.embodimentSegmentAligned
    : payload.embodimentSegmentAligned
  const bodyActive = payload.bodyActive ?? current.bodyActive
  const faceActive = payload.faceActive ?? current.faceActive
  const lipsyncActive = payload.lipsyncActive ?? current.lipsyncActive
  const motionActive = payload.motionActive ?? current.motionActive
  const voiceActive = payload.voiceActive ?? current.voiceActive
  const embodimentSegmentMismatchDrivers = payload.embodimentSegmentMismatchDrivers
    ? [...payload.embodimentSegmentMismatchDrivers]
    : current.embodimentSegmentMismatchDrivers
  const continuityFrameSummary = buildVrmContinuityFrameSummary({
    bodyActive,
    embodimentSegmentAligned,
    embodimentSegmentMismatchDrivers,
    faceActive,
    lipsyncActive,
    motionActive,
    performanceSegmentId,
    speechSegmentId,
    voiceActive,
  })

  return {
    lastConsumedExpressionAliases: payload.activeCuePreferredExpressionAliases
      ? [...payload.activeCuePreferredExpressionAliases]
      : current.lastConsumedExpressionAliases,
    lastConsumedMotionAliases: payload.activeCuePreferredMotionAliases
      ? [...payload.activeCuePreferredMotionAliases]
      : current.lastConsumedMotionAliases,
    lastConsumedVrmActionFadeMs: payload.activeCueVrmActionFadeMs ?? current.lastConsumedVrmActionFadeMs,
    lastConsumedVrmExpressionBlendMs: payload.activeCueVrmExpressionBlendMs ?? current.lastConsumedVrmExpressionBlendMs,
    animationMixerMs: payload.animationMixerMs,
    blinkAndSaccadeMs: payload.blinkAndSaccadeMs,
    bodyActive,
    deltaMs: payload.deltaMs,
    embodimentSegmentAligned,
    embodimentSegmentMismatchDrivers,
    emoteMs: payload.emoteMs,
    expressionMs: payload.expressionMs,
    faceActive,
    frameCount: current.frameCount + 1,
    humanoidMs: payload.humanoidMs,
    lastTimestampMs: payload.ts,
    lipSyncMs: payload.lipSyncMs,
    lipsyncActive,
    lookAtMs: payload.lookAtMs,
    motionActive,
    performanceSegmentId,
    continuityFrameSummary,
    springBoneMs: payload.springBoneMs,
    speechSegmentId,
    totalMs: payload.durationMs,
    voiceActive,
    vrmFrameHookMs: payload.vrmFrameHookMs,
  }
}

function applyLoadStartPayload(
  current: StageThreeRuntimeVrmLifecycleDiagnostics,
  payload: VrmLoadStartTracePayload,
): StageThreeRuntimeVrmLifecycleDiagnostics {
  return {
    ...current,
    lastErrorMessage: '',
    lastLoadStartAt: payload.ts,
    lastModelSrc: payload.modelSrc ?? '',
    lastReason: payload.reason,
  }
}

function applyLoadEndPayload(
  current: StageThreeRuntimeVrmLifecycleDiagnostics,
  payload: VrmLoadEndTracePayload,
): StageThreeRuntimeVrmLifecycleDiagnostics {
  return {
    ...current,
    lastErrorMessage: '',
    lastLoadDurationMs: payload.durationMs ?? 0,
    lastLoadEndAt: payload.ts,
    lastModelSrc: payload.modelSrc ?? current.lastModelSrc,
    lastReason: payload.reason,
  }
}

function applyLoadErrorPayload(
  current: StageThreeRuntimeVrmLifecycleDiagnostics,
  payload: VrmLoadErrorTracePayload,
): StageThreeRuntimeVrmLifecycleDiagnostics {
  return {
    ...current,
    lastErrorMessage: payload.errorMessage ?? '',
    lastModelSrc: payload.modelSrc ?? current.lastModelSrc,
    lastReason: payload.reason,
  }
}

function applyDisposeStartPayload(
  current: StageThreeRuntimeVrmLifecycleDiagnostics,
  payload: VrmDisposeStartTracePayload,
): StageThreeRuntimeVrmLifecycleDiagnostics {
  return {
    ...current,
    lastDisposeStartAt: payload.ts,
    lastModelSrc: payload.modelSrc ?? current.lastModelSrc,
    lastReason: payload.reason,
  }
}

function applyDisposeEndPayload(
  current: StageThreeRuntimeVrmLifecycleDiagnostics,
  payload: VrmDisposeEndTracePayload,
): StageThreeRuntimeVrmLifecycleDiagnostics {
  return {
    ...current,
    lastDisposeDurationMs: payload.durationMs ?? 0,
    lastDisposeEndAt: payload.ts,
    lastModelSrc: payload.modelSrc ?? current.lastModelSrc,
    lastReason: payload.reason,
  }
}

function createSnapshotRecord(
  phase: StageThreeRuntimeResourceSnapshotRecord['phase'],
  payload: VrmDisposeStartTracePayload | VrmDisposeEndTracePayload | VrmLoadEndTracePayload,
): StageThreeRuntimeResourceSnapshotRecord {
  return {
    modelSrc: payload.modelSrc,
    phase,
    reason: payload.reason,
    rendererMemory: payload.rendererMemory,
    sceneSummary: payload.sceneSummary,
    ts: payload.ts,
  }
}

export function applySnapshotRecord(
  current: StageThreeRuntimeResourceSnapshotDiagnostics,
  record: StageThreeRuntimeResourceSnapshotRecord,
): StageThreeRuntimeResourceSnapshotDiagnostics {
  const next: StageThreeRuntimeResourceSnapshotDiagnostics = {
    ...current,
    history: pushTraceHistory(current.history, record),
  }

  if (record.phase === 'after-load')
    next.lastAfterLoad = record
  else if (record.phase === 'before-dispose')
    next.lastBeforeDispose = record
  else if (record.phase === 'after-dispose')
    next.lastAfterDispose = record

  return next
}

export const useStageThreeRuntimeDiagnosticsStore = defineStore('stageThreeRuntimeDiagnostics', () => {
  const tracing = ref(false)
  const threeRender = ref<StageThreeRuntimeThreeRenderDiagnostics>(createDefaultStageThreeRenderDiagnostics())
  const vrmUpdate = ref<StageThreeRuntimeVrmUpdateDiagnostics>(createDefaultStageVrmUpdateDiagnostics())
  const hitTest = ref<StageThreeRuntimeHitTestDiagnostics>(createDefaultStageHitTestDiagnostics())
  const vrmLifecycle = ref<StageThreeRuntimeVrmLifecycleDiagnostics>(createDefaultStageVrmLifecycleDiagnostics())
  const resourceSnapshots = ref<StageThreeRuntimeResourceSnapshotDiagnostics>(createDefaultStageResourceSnapshotDiagnostics())
  const speechEmbodiment = ref<StageThreeRuntimeSpeechEmbodimentDiagnostics>(createDefaultStageSpeechEmbodimentDiagnostics())

  const localTraceContext = getStageThreeRuntimeTraceContext()
  const remoteTraceContext = getStageThreeRuntimeTraceBroadcastContext()
  const localTraceToken = 'stage-three-runtime-diagnostics:local'
  const remoteTraceOriginId = getStageThreeRuntimeTraceBroadcastOriginId()

  let releaseLocalTrace: (() => void) | undefined
  let stopLocalSubscriptions: Array<() => void> = []
  let stopRemoteSubscriptions: Array<() => void> = []

  function resetSamples() {
    threeRender.value = createDefaultStageThreeRenderDiagnostics()
    vrmUpdate.value = createDefaultStageVrmUpdateDiagnostics()
    hitTest.value = createDefaultStageHitTestDiagnostics()
    vrmLifecycle.value = createDefaultStageVrmLifecycleDiagnostics()
    resourceSnapshots.value = createDefaultStageResourceSnapshotDiagnostics()
    speechEmbodiment.value = createDefaultStageSpeechEmbodimentDiagnostics()
  }

  function setSpeechEmbodiment(next: StageThreeRuntimeSpeechEmbodimentDiagnostics) {
    speechEmbodiment.value = next
  }

  function applyRenderPayload(payload: ThreeSceneRenderInfoTracePayload) {
    threeRender.value = applyThreeRenderTracePayload(threeRender.value, payload)
  }

  function applyHitTestPayload(payload: ThreeHitTestReadTracePayload) {
    hitTest.value = applyHitTestTracePayload(hitTest.value, payload)
  }

  function applyVrmUpdatePayload(payload: VrmUpdateFrameTracePayload) {
    vrmUpdate.value = applyVrmUpdateTracePayload(vrmUpdate.value, payload)
  }

  function applyVrmLoadStartPayload(payload: VrmLoadStartTracePayload) {
    vrmLifecycle.value = applyLoadStartPayload(vrmLifecycle.value, payload)
  }

  function applyVrmLoadEndPayload(payload: VrmLoadEndTracePayload) {
    vrmLifecycle.value = applyLoadEndPayload(vrmLifecycle.value, payload)
    resourceSnapshots.value = applySnapshotRecord(resourceSnapshots.value, createSnapshotRecord('after-load', payload))
  }

  function applyVrmLoadErrorPayload(payload: VrmLoadErrorTracePayload) {
    vrmLifecycle.value = applyLoadErrorPayload(vrmLifecycle.value, payload)
  }

  function applyVrmDisposeStartPayload(payload: VrmDisposeStartTracePayload) {
    vrmLifecycle.value = applyDisposeStartPayload(vrmLifecycle.value, payload)
    resourceSnapshots.value = applySnapshotRecord(resourceSnapshots.value, createSnapshotRecord('before-dispose', payload))
  }

  function applyVrmDisposeEndPayload(payload: VrmDisposeEndTracePayload) {
    vrmLifecycle.value = applyDisposeEndPayload(vrmLifecycle.value, payload)
    resourceSnapshots.value = applySnapshotRecord(resourceSnapshots.value, createSnapshotRecord('after-dispose', payload))
  }

  function applyForwardedTraceEnvelope(payload: StageThreeRuntimeTraceForwardedPayload) {
    if (payload.origin === remoteTraceOriginId)
      return

    const envelope: StageThreeRuntimeTraceEnvelope = payload.envelope

    switch (envelope.type) {
      case 'three-render-info':
        applyRenderPayload(envelope.payload)
        break
      case 'three-hit-test-read':
        applyHitTestPayload(envelope.payload)
        break
      case 'vrm-update-frame':
        applyVrmUpdatePayload(envelope.payload)
        break
      case 'vrm-load-start':
        applyVrmLoadStartPayload(envelope.payload)
        break
      case 'vrm-load-end':
        applyVrmLoadEndPayload(envelope.payload)
        break
      case 'vrm-load-error':
        applyVrmLoadErrorPayload(envelope.payload)
        break
      case 'vrm-dispose-start':
        applyVrmDisposeStartPayload(envelope.payload)
        break
      case 'vrm-dispose-end':
        applyVrmDisposeEndPayload(envelope.payload)
        break
      default:
        break
    }
  }

  function subscribeLocalEvents() {
    stopLocalSubscriptions = [
      localTraceContext.on(stageThreeTraceRenderInfoEvent, event => event?.body && applyRenderPayload(event.body)),
      localTraceContext.on(stageThreeTraceHitTestReadEvent, event => event?.body && applyHitTestPayload(event.body)),
      localTraceContext.on(stageThreeTraceVrmUpdateFrameEvent, event => event?.body && applyVrmUpdatePayload(event.body)),
      localTraceContext.on(stageThreeTraceVrmLoadStartEvent, event => event?.body && applyVrmLoadStartPayload(event.body)),
      localTraceContext.on(stageThreeTraceVrmLoadEndEvent, event => event?.body && applyVrmLoadEndPayload(event.body)),
      localTraceContext.on(stageThreeTraceVrmLoadErrorEvent, event => event?.body && applyVrmLoadErrorPayload(event.body)),
      localTraceContext.on(stageThreeTraceVrmDisposeStartEvent, event => event?.body && applyVrmDisposeStartPayload(event.body)),
      localTraceContext.on(stageThreeTraceVrmDisposeEndEvent, event => event?.body && applyVrmDisposeEndPayload(event.body)),
    ]
  }

  function subscribeRemoteEvents() {
    stopRemoteSubscriptions = [
      remoteTraceContext.on(stageThreeRuntimeTraceForwardedEvent, (event) => {
        if (!event?.body)
          return

        applyForwardedTraceEnvelope(event.body)
      }),
    ]
  }

  function startTracing() {
    if (tracing.value)
      return

    initializeStageThreeRuntimeTraceBridge()
    resetSamples()
    releaseLocalTrace = acquireStageThreeRuntimeTrace(localTraceToken)
    subscribeLocalEvents()
    subscribeRemoteEvents()
    void setStageThreeRuntimeTraceRemoteSubscription(true).catch((error) => {
      console.warn('[StageThreeRuntimeDiagnostics] Failed to enable remote trace subscription.', error)
    })
    tracing.value = true
  }

  function stopTracing() {
    if (!tracing.value)
      return

    for (const stopSubscription of stopLocalSubscriptions)
      stopSubscription()
    for (const stopSubscription of stopRemoteSubscriptions)
      stopSubscription()

    stopLocalSubscriptions = []
    stopRemoteSubscriptions = []
    void setStageThreeRuntimeTraceRemoteSubscription(false).catch((error) => {
      console.warn('[StageThreeRuntimeDiagnostics] Failed to disable remote trace subscription.', error)
    })
    releaseLocalTrace?.()
    releaseLocalTrace = undefined
    tracing.value = false
  }

  return {
    hitTest,
    resourceSnapshots,
    resetSamples,
    setSpeechEmbodiment,
    speechEmbodiment,
    startTracing,
    stopTracing,
    threeRender,
    tracing,
    vrmLifecycle,
    vrmUpdate,
  }
})
