import type { AlicizationContentKind, AlicizationWorkloadKind } from './proactive-layered-context'

import {
  extractInspectionSemanticTerms,
  inferAlicizationInspectionIntent,
  isWeakAlicizationScreenSurfaceTarget,
} from '@proj-alicization/stage-shared'

import { inferForegroundWorkloadFromWindow } from './proactive-layered-context'

export interface AlicizationPerceptionTarget {
  appName?: string
  processName?: string
  title?: string
}

export interface AlicizationPerceptionObservation extends AlicizationPerceptionTarget {
  observedAt: number
  source: 'sensory-snapshot' | 'subconscious-tick' | 'chat-start'
  workloadKind: AlicizationWorkloadKind
}

export interface AlicizationAttentionAnchor extends AlicizationPerceptionTarget {
  anchoredAt: number
  lastObservedAt: number
  reason: 'recent-foreground' | 'invited-inspection'
  workloadKind: AlicizationWorkloadKind
  confidence: number
}

export interface AlicizationInvitedInspectionMode {
  requestedAt: number
  activeUntil: number
  hintText: string
}

export interface AlicizationPerceptionSceneResidue {
  observedAt: number
  source: 'invited-inspection' | 'screen-semantic-summary'
  workloadKind: AlicizationWorkloadKind
  contentKind: AlicizationContentKind
  summary?: string
  confidence: number
  focusTarget?: AlicizationPerceptionTarget | null
  focusSource?: 'attention-anchor' | 'recent-observation' | 'foreground-window' | 'hint-terms' | 'capture-source'
  captureSourceName?: string
  captureStrategy?: 'window-title' | 'app-name' | 'process-name' | 'screen-fallback'
}

export type AlicizationPerceptionBrowserWorkflowPhase
  = | 'unknown'
    | 'login'
    | 'search-results'
    | 'social-feed'
    | 'browser-desktop-handoff'
    | 'content-detail'
    | 'form-entry'
    | 'upload-flow'

export type AlicizationPerceptionBrowserWorkflowProgressState
  = | 'started'
    | 'steady'
    | 'advanced'
    | 'regressed'

export interface AlicizationPerceptionBrowserWorkflowHistoryEntry {
  observedAt: number
  pagePhase: AlicizationPerceptionBrowserWorkflowPhase
  title?: string
  url?: string
}

export interface AlicizationPerceptionBrowserWorkflowState {
  currentPhase: AlicizationPerceptionBrowserWorkflowPhase
  history: AlicizationPerceptionBrowserWorkflowHistoryEntry[]
  lastInspectionAt: number
  previousPhase: AlicizationPerceptionBrowserWorkflowPhase | null
  progressState: AlicizationPerceptionBrowserWorkflowProgressState
  targetPhase: AlicizationPerceptionBrowserWorkflowPhase
  taskKey: string
  title?: string
  updatedAt: number
  url?: string
}

export interface AlicizationPerceptionState {
  attentionAnchor: AlicizationAttentionAnchor | null
  browserWorkflowState?: AlicizationPerceptionBrowserWorkflowState | null
  lastNonSelfForegroundTarget: AlicizationPerceptionObservation | null
  recentObservations: AlicizationPerceptionObservation[]
  invitedInspection: AlicizationInvitedInspectionMode | null
  recentSceneResidue: AlicizationPerceptionSceneResidue | null
  updatedAt: number
}

const defaultSelfPattern = /\b(?:alicization|codex)\b/i
const systemSettingsPattern = /\b(?:system settings|system preferences)\b/i
const permissionGrantSurfacePattern = /\b(?:screen(?:\s*&\s*system audio)?\s*recording|privacy|security|permissions?)\b/i

function sanitizeTargetText(value: unknown) {
  return typeof value === 'string'
    ? value.trim().slice(0, 240)
    : ''
}

function sanitizeHintText(value: unknown) {
  return typeof value === 'string'
    ? value.replace(/\s+/g, ' ').trim().slice(0, 320)
    : ''
}

function clampConfidence(value: number) {
  if (!Number.isFinite(value))
    return 0
  return Math.max(0, Math.min(1, Number(value.toFixed(2))))
}

function sanitizeSummary(value: unknown) {
  return typeof value === 'string'
    ? value.trim().replace(/\s+/g, ' ').slice(0, 160)
    : ''
}

function sanitizeWorkflowTaskKey(value: unknown) {
  return typeof value === 'string'
    ? value.trim().replace(/\s+/g, ' ').slice(0, 240)
    : ''
}

function normalizeTarget(target: AlicizationPerceptionTarget | null | undefined) {
  const appName = sanitizeTargetText(target?.appName)
  const processName = sanitizeTargetText(target?.processName)
  const title = sanitizeTargetText(target?.title)
  if (!appName && !processName && !title)
    return null
  return {
    appName: appName || undefined,
    processName: processName || undefined,
    title: title || undefined,
  }
}

function targetSignature(target: AlicizationPerceptionTarget | null | undefined) {
  const normalized = normalizeTarget(target)
  if (!normalized)
    return ''
  return [
    normalized.appName ?? '',
    normalized.processName ?? '',
    normalized.title ?? '',
  ].join('::').toLowerCase()
}

function normalizeObservation(raw: unknown): AlicizationPerceptionObservation | null {
  const source = raw && typeof raw === 'object' ? raw as Record<string, unknown> : null
  const target = normalizeTarget(source)
  const observedAt = Number(source?.observedAt)
  const workloadKind = source?.workloadKind
  const observationSource = source?.source
  if (
    !target
    || !Number.isFinite(observedAt)
    || (workloadKind !== 'coding'
      && workloadKind !== 'media'
      && workloadKind !== 'browser'
      && workloadKind !== 'terminal'
      && workloadKind !== 'game'
      && workloadKind !== 'chat'
      && workloadKind !== 'document'
      && workloadKind !== 'unknown')
    || (observationSource !== 'sensory-snapshot'
      && observationSource !== 'subconscious-tick'
      && observationSource !== 'chat-start')
  ) {
    return null
  }

  return {
    ...target,
    observedAt: Math.max(0, Math.floor(observedAt)),
    source: observationSource,
    workloadKind,
  }
}

function normalizeAnchor(raw: unknown): AlicizationAttentionAnchor | null {
  const source = raw && typeof raw === 'object' ? raw as Record<string, unknown> : null
  const target = normalizeTarget(source)
  const anchoredAt = Number(source?.anchoredAt)
  const lastObservedAt = Number(source?.lastObservedAt)
  const reason = source?.reason
  const workloadKind = source?.workloadKind
  const confidence = Number(source?.confidence)
  if (
    !target
    || !Number.isFinite(anchoredAt)
    || !Number.isFinite(lastObservedAt)
    || (reason !== 'recent-foreground' && reason !== 'invited-inspection')
    || (workloadKind !== 'coding'
      && workloadKind !== 'media'
      && workloadKind !== 'browser'
      && workloadKind !== 'terminal'
      && workloadKind !== 'game'
      && workloadKind !== 'chat'
      && workloadKind !== 'document'
      && workloadKind !== 'unknown')
  ) {
    return null
  }

  return {
    ...target,
    anchoredAt: Math.max(0, Math.floor(anchoredAt)),
    lastObservedAt: Math.max(0, Math.floor(lastObservedAt)),
    reason,
    workloadKind,
    confidence: clampConfidence(confidence),
  }
}

function normalizeInvitedInspection(raw: unknown): AlicizationInvitedInspectionMode | null {
  const source = raw && typeof raw === 'object' ? raw as Record<string, unknown> : null
  const requestedAt = Number(source?.requestedAt)
  const activeUntil = Number(source?.activeUntil)
  const hintText = sanitizeHintText(source?.hintText)
  if (
    !Number.isFinite(requestedAt)
    || !Number.isFinite(activeUntil)
    || !hintText
  ) {
    return null
  }

  return {
    requestedAt: Math.max(0, Math.floor(requestedAt)),
    activeUntil: Math.max(0, Math.floor(activeUntil)),
    hintText,
  }
}

function normalizeSceneResidue(raw: unknown): AlicizationPerceptionSceneResidue | null {
  const source = raw && typeof raw === 'object' ? raw as Record<string, unknown> : null
  const observedAt = Number(source?.observedAt)
  const sceneSource = source?.source
  const workloadKind = source?.workloadKind
  const contentKind = source?.contentKind
  const confidence = Number(source?.confidence)
  const focusSource = source?.focusSource
  const captureStrategy = source?.captureStrategy
  const focusTarget = normalizeTarget(
    source?.focusTarget && typeof source.focusTarget === 'object'
      ? source.focusTarget as AlicizationPerceptionTarget
      : null,
  )
  if (
    !Number.isFinite(observedAt)
    || (sceneSource !== 'invited-inspection' && sceneSource !== 'screen-semantic-summary')
    || (workloadKind !== 'coding'
      && workloadKind !== 'media'
      && workloadKind !== 'browser'
      && workloadKind !== 'terminal'
      && workloadKind !== 'game'
      && workloadKind !== 'chat'
      && workloadKind !== 'document'
      && workloadKind !== 'unknown')
    || (contentKind !== 'error'
      && contentKind !== 'diff'
      && contentKind !== 'doc'
      && contentKind !== 'video'
      && contentKind !== 'music'
      && contentKind !== 'chat'
      && contentKind !== 'gameplay'
      && contentKind !== 'unknown')
    || (focusSource !== undefined
      && focusSource !== 'attention-anchor'
      && focusSource !== 'recent-observation'
      && focusSource !== 'foreground-window'
      && focusSource !== 'hint-terms'
      && focusSource !== 'capture-source')
    || (captureStrategy !== undefined
      && captureStrategy !== 'window-title'
      && captureStrategy !== 'app-name'
      && captureStrategy !== 'process-name'
      && captureStrategy !== 'screen-fallback')
  ) {
    return null
  }

  return {
    observedAt: Math.max(0, Math.floor(observedAt)),
    source: sceneSource,
    workloadKind,
    contentKind,
    summary: sanitizeSummary(source?.summary) || undefined,
    confidence: clampConfidence(confidence),
    focusTarget,
    focusSource,
    captureSourceName: sanitizeTargetText(source?.captureSourceName) || undefined,
    captureStrategy,
  }
}

function normalizeBrowserWorkflowPhase(value: unknown): AlicizationPerceptionBrowserWorkflowPhase | null {
  return value === 'login'
    || value === 'search-results'
    || value === 'social-feed'
    || value === 'browser-desktop-handoff'
    || value === 'content-detail'
    || value === 'form-entry'
    || value === 'upload-flow'
    || value === 'unknown'
    ? value
    : null
}

function normalizeBrowserWorkflowProgressState(value: unknown): AlicizationPerceptionBrowserWorkflowProgressState | null {
  return value === 'started'
    || value === 'steady'
    || value === 'advanced'
    || value === 'regressed'
    ? value
    : null
}

function normalizeBrowserWorkflowHistoryEntry(raw: unknown): AlicizationPerceptionBrowserWorkflowHistoryEntry | null {
  const source = raw && typeof raw === 'object' ? raw as Record<string, unknown> : null
  const observedAt = Number(source?.observedAt)
  const pagePhase = normalizeBrowserWorkflowPhase(source?.pagePhase)
  if (!Number.isFinite(observedAt) || !pagePhase)
    return null

  return {
    observedAt: Math.max(0, Math.floor(observedAt)),
    pagePhase,
    title: sanitizeTargetText(source?.title) || undefined,
    url: sanitizeTargetText(source?.url) || undefined,
  }
}

function normalizeBrowserWorkflowState(raw: unknown): AlicizationPerceptionBrowserWorkflowState | null {
  const source = raw && typeof raw === 'object' ? raw as Record<string, unknown> : null
  const currentPhase = normalizeBrowserWorkflowPhase(source?.currentPhase)
  const targetPhase = normalizeBrowserWorkflowPhase(source?.targetPhase)
  const previousPhase = source?.previousPhase == null
    ? null
    : normalizeBrowserWorkflowPhase(source?.previousPhase)
  const progressState = normalizeBrowserWorkflowProgressState(source?.progressState)
  const taskKey = sanitizeWorkflowTaskKey(source?.taskKey)
  const updatedAt = Number(source?.updatedAt)
  const lastInspectionAt = Number(source?.lastInspectionAt)
  if (
    !currentPhase
    || !targetPhase
    || !progressState
    || !taskKey
    || !Number.isFinite(updatedAt)
    || !Number.isFinite(lastInspectionAt)
    || (source?.previousPhase != null && !previousPhase)
  ) {
    return null
  }

  const history = Array.isArray(source?.history)
    ? source.history
        .map(normalizeBrowserWorkflowHistoryEntry)
        .filter((entry): entry is AlicizationPerceptionBrowserWorkflowHistoryEntry => Boolean(entry))
        .slice(-6)
    : []

  return {
    currentPhase,
    previousPhase,
    progressState,
    targetPhase,
    taskKey,
    updatedAt: Math.max(0, Math.floor(updatedAt)),
    lastInspectionAt: Math.max(0, Math.floor(lastInspectionAt)),
    title: sanitizeTargetText(source?.title) || undefined,
    url: sanitizeTargetText(source?.url) || undefined,
    history,
  }
}

function isInspectionActive(mode: AlicizationInvitedInspectionMode | null | undefined, now: number) {
  return Boolean(mode && mode.activeUntil > now)
}

function trimRecentObservations(observations: AlicizationPerceptionObservation[]) {
  return observations
    .slice(-6)
    .sort((left, right) => left.observedAt - right.observedAt)
}

export function createDefaultPerceptionState(now = Date.now()): AlicizationPerceptionState {
  return {
    attentionAnchor: null,
    browserWorkflowState: null,
    lastNonSelfForegroundTarget: null,
    recentObservations: [],
    invitedInspection: null,
    recentSceneResidue: null,
    updatedAt: now,
  }
}

export function normalizePerceptionState(raw: unknown, now = Date.now()): AlicizationPerceptionState {
  const source = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {}
  const next = createDefaultPerceptionState(now)
  next.attentionAnchor = normalizeAnchor(source.attentionAnchor)
  next.browserWorkflowState = normalizeBrowserWorkflowState(source.browserWorkflowState)
  next.lastNonSelfForegroundTarget = normalizeObservation(source.lastNonSelfForegroundTarget)
  next.recentObservations = Array.isArray(source.recentObservations)
    ? trimRecentObservations(source.recentObservations
        .map(normalizeObservation)
        .filter((entry): entry is AlicizationPerceptionObservation => Boolean(entry)))
    : []
  next.invitedInspection = normalizeInvitedInspection(source.invitedInspection)
  next.recentSceneResidue = normalizeSceneResidue(source.recentSceneResidue)
  next.updatedAt = Number.isFinite(Number(source.updatedAt))
    ? Math.max(0, Math.floor(Number(source.updatedAt)))
    : now
  return next
}

export function isSelfPerceptionTarget(
  target: AlicizationPerceptionTarget | null | undefined,
  selfPattern = defaultSelfPattern,
) {
  const normalized = normalizeTarget(target)
  if (!normalized)
    return false
  return [normalized.appName, normalized.processName, normalized.title]
    .filter((value): value is string => Boolean(value))
    .some(value => selfPattern.test(value))
}

function isPermissionGrantSurfaceTarget(
  target: AlicizationPerceptionTarget | null | undefined,
  invitedInspectionActive: boolean,
) {
  const normalized = normalizeTarget(target)
  if (!normalized)
    return false

  const combinedText = [normalized.appName, normalized.processName, normalized.title]
    .filter((value): value is string => Boolean(value))
    .join(' ')
  const isSystemSettingsSurface = systemSettingsPattern.test(combinedText)
  if (!isSystemSettingsSurface)
    return false

  return invitedInspectionActive || permissionGrantSurfacePattern.test(combinedText)
}

export function updatePerceptionStateWithObservation(input: {
  state: AlicizationPerceptionState
  now: number
  target?: AlicizationPerceptionTarget | null
  source: AlicizationPerceptionObservation['source']
  selfPattern?: RegExp
}) {
  const nextTarget = normalizeTarget(input.target)
  const invitedInspection = isInspectionActive(input.state.invitedInspection, input.now)
    ? input.state.invitedInspection
    : null
  if (
    !nextTarget
    || isSelfPerceptionTarget(nextTarget, input.selfPattern)
    || isWeakAlicizationScreenSurfaceTarget(nextTarget)
    || isPermissionGrantSurfaceTarget(nextTarget, Boolean(invitedInspection))
  ) {
    return {
      ...input.state,
      invitedInspection,
      updatedAt: input.now,
    }
  }

  const workloadKind = inferForegroundWorkloadFromWindow(nextTarget)
  const observation: AlicizationPerceptionObservation = {
    ...nextTarget,
    observedAt: input.now,
    source: input.source,
    workloadKind,
  }
  const previousSignature = targetSignature(input.state.attentionAnchor)
  const nextSignature = targetSignature(observation)
  const previousAnchor = input.state.attentionAnchor
  const recentObservations = trimRecentObservations([
    ...input.state.recentObservations.filter(entry => targetSignature(entry) !== nextSignature),
    observation,
  ])

  return {
    attentionAnchor: {
      ...nextTarget,
      anchoredAt: previousSignature === nextSignature && previousAnchor
        ? previousAnchor.anchoredAt
        : input.now,
      lastObservedAt: input.now,
      reason: invitedInspection ? 'invited-inspection' : 'recent-foreground',
      workloadKind,
      confidence: clampConfidence(workloadKind === 'unknown' ? 0.62 : 0.88),
    },
    browserWorkflowState: input.state.browserWorkflowState ?? null,
    lastNonSelfForegroundTarget: observation,
    recentObservations,
    invitedInspection,
    recentSceneResidue: input.state.recentSceneResidue,
    updatedAt: input.now,
  } satisfies AlicizationPerceptionState
}

export function activateInvitedInspection(input: {
  state: AlicizationPerceptionState
  now: number
  hintText: string
  durationMs?: number
}) {
  const hintText = sanitizeHintText(input.hintText)
  if (!hintText)
    return input.state

  const activeUntil = input.now + Math.max(60_000, input.durationMs ?? 3 * 60_000)
  const fallbackTarget = input.state.lastNonSelfForegroundTarget
  const nextAnchor = input.state.attentionAnchor
    && !isWeakAlicizationScreenSurfaceTarget(input.state.attentionAnchor)
    ? {
        ...input.state.attentionAnchor,
        reason: 'invited-inspection' as const,
        confidence: clampConfidence(Math.max(input.state.attentionAnchor.confidence, 0.9)),
      }
    : fallbackTarget
      && !isWeakAlicizationScreenSurfaceTarget(fallbackTarget)
      ? {
          appName: fallbackTarget.appName,
          processName: fallbackTarget.processName,
          title: fallbackTarget.title,
          anchoredAt: fallbackTarget.observedAt,
          lastObservedAt: fallbackTarget.observedAt,
          reason: 'invited-inspection' as const,
          workloadKind: fallbackTarget.workloadKind,
          confidence: clampConfidence(fallbackTarget.workloadKind === 'unknown' ? 0.72 : 0.9),
        }
      : null

  return {
    ...input.state,
    attentionAnchor: nextAnchor,
    browserWorkflowState: input.state.browserWorkflowState ?? null,
    invitedInspection: {
      requestedAt: input.now,
      activeUntil,
      hintText,
    },
    recentSceneResidue: input.state.recentSceneResidue,
    updatedAt: input.now,
  } satisfies AlicizationPerceptionState
}

export function releaseInvitedInspection(input: {
  state: AlicizationPerceptionState
  now: number
  clearSceneResidue?: boolean
}) {
  const attentionAnchor = input.state.attentionAnchor?.reason === 'invited-inspection'
    ? {
        ...input.state.attentionAnchor,
        reason: 'recent-foreground' as const,
        confidence: clampConfidence(Math.min(input.state.attentionAnchor.confidence, 0.82)),
      }
    : input.state.attentionAnchor

  return {
    ...input.state,
    attentionAnchor,
    browserWorkflowState: input.state.browserWorkflowState ?? null,
    invitedInspection: null,
    recentSceneResidue: input.clearSceneResidue && input.state.recentSceneResidue?.source === 'invited-inspection'
      ? null
      : input.state.recentSceneResidue,
    updatedAt: input.now,
  } satisfies AlicizationPerceptionState
}

export function getActiveAttentionAnchor(
  state: AlicizationPerceptionState,
  now: number,
  maxAgeMs = 3 * 60_000,
) {
  if (state.attentionAnchor) {
    if (
      !isWeakAlicizationScreenSurfaceTarget(state.attentionAnchor)
      && (now - state.attentionAnchor.lastObservedAt <= maxAgeMs || isInspectionActive(state.invitedInspection, now))
    ) {
      return state.attentionAnchor
    }
  }

  if (
    state.lastNonSelfForegroundTarget
    && !isWeakAlicizationScreenSurfaceTarget(state.lastNonSelfForegroundTarget)
    && now - state.lastNonSelfForegroundTarget.observedAt <= maxAgeMs
  ) {
    return {
      appName: state.lastNonSelfForegroundTarget.appName,
      processName: state.lastNonSelfForegroundTarget.processName,
      title: state.lastNonSelfForegroundTarget.title,
      anchoredAt: state.lastNonSelfForegroundTarget.observedAt,
      lastObservedAt: state.lastNonSelfForegroundTarget.observedAt,
      reason: isInspectionActive(state.invitedInspection, now) ? 'invited-inspection' : 'recent-foreground',
      workloadKind: state.lastNonSelfForegroundTarget.workloadKind,
      confidence: clampConfidence(state.lastNonSelfForegroundTarget.workloadKind === 'unknown' ? 0.68 : 0.84),
    } satisfies AlicizationAttentionAnchor
  }

  return null
}

export function rememberPerceptionSceneResidue(input: {
  state: AlicizationPerceptionState
  now: number
  residue: AlicizationPerceptionSceneResidue
}) {
  return {
    ...input.state,
    recentSceneResidue: {
      ...input.residue,
      observedAt: Math.max(0, Math.floor(input.residue.observedAt || input.now)),
      summary: sanitizeSummary(input.residue.summary) || undefined,
      focusTarget: normalizeTarget(input.residue.focusTarget),
      captureSourceName: sanitizeTargetText(input.residue.captureSourceName) || undefined,
      confidence: clampConfidence(input.residue.confidence),
    },
    updatedAt: input.now,
  } satisfies AlicizationPerceptionState
}

function classifyWorkflowProgress(input: {
  currentPhase: AlicizationPerceptionBrowserWorkflowPhase
  previousPhase: AlicizationPerceptionBrowserWorkflowPhase | null
  targetPhase: AlicizationPerceptionBrowserWorkflowPhase
}) {
  if (!input.previousPhase)
    return 'started' as const
  if (input.previousPhase === input.currentPhase)
    return 'steady' as const
  if (input.currentPhase === input.targetPhase && input.previousPhase !== input.targetPhase)
    return 'advanced' as const
  if (input.previousPhase === input.targetPhase && input.currentPhase !== input.targetPhase)
    return 'regressed' as const
  return 'advanced' as const
}

export function rememberPerceptionBrowserWorkflowState(input: {
  state: AlicizationPerceptionState
  now: number
  currentPhase: AlicizationPerceptionBrowserWorkflowPhase
  targetPhase: AlicizationPerceptionBrowserWorkflowPhase
  taskKey: string
  title?: string | null
  url?: string | null
}) {
  const taskKey = sanitizeWorkflowTaskKey(input.taskKey)
  const title = sanitizeTargetText(input.title) || undefined
  const url = sanitizeTargetText(input.url) || undefined
  if (!taskKey)
    return input.state

  const previous = input.state.browserWorkflowState?.taskKey === taskKey
    ? input.state.browserWorkflowState
    : null
  const previousPhase = previous?.currentPhase ?? null
  const progressState = classifyWorkflowProgress({
    currentPhase: input.currentPhase,
    previousPhase,
    targetPhase: input.targetPhase,
  })
  const nextEntry: AlicizationPerceptionBrowserWorkflowHistoryEntry = {
    observedAt: input.now,
    pagePhase: input.currentPhase,
    title,
    url,
  }
  const historySource = previous?.history ?? []
  const lastEntry = historySource.at(-1) ?? null
  const history = (
    lastEntry
    && lastEntry.pagePhase === nextEntry.pagePhase
    && lastEntry.url === nextEntry.url
    && lastEntry.title === nextEntry.title
  )
    ? [...historySource.slice(0, -1), nextEntry]
    : [...historySource, nextEntry]

  return {
    ...input.state,
    browserWorkflowState: {
      currentPhase: input.currentPhase,
      previousPhase,
      progressState,
      targetPhase: input.targetPhase,
      taskKey,
      updatedAt: input.now,
      lastInspectionAt: input.now,
      title,
      url,
      history: history.slice(-6),
    },
    updatedAt: input.now,
  } satisfies AlicizationPerceptionState
}

export function getActivePerceptionSceneResidue(
  state: AlicizationPerceptionState,
  now: number,
  maxAgeMs = 3 * 60_000,
) {
  if (!state.recentSceneResidue)
    return null
  if (now - state.recentSceneResidue.observedAt > maxAgeMs && !isInspectionActive(state.invitedInspection, now))
    return null
  return state.recentSceneResidue
}

export function detectInvitedInspectionIntent(text: string) {
  const normalized = sanitizeHintText(text)
  if (!normalized) {
    return {
      active: false,
      confidence: 0,
    }
  }
  const inferred = inferAlicizationInspectionIntent({
    message: normalized,
  })

  return {
    active: inferred.active,
    confidence: inferred.confidence,
  }
}

export function extractInspectionHintTerms(text: string) {
  const normalized = sanitizeHintText(text).toLowerCase()
  if (!normalized)
    return []

  const terms = new Set<string>()
  const pushTerms = (...values: string[]) => {
    for (const value of values) {
      const trimmed = value.trim().toLowerCase()
      if (trimmed)
        terms.add(trimmed)
    }
  }

  for (const token of extractInspectionSemanticTerms(normalized))
    pushTerms(token)

  if (/\b(?:vs\s*code|visual studio code)\b|(?<![a-z])code(?![a-z])/i.test(normalized))
    pushTerms('visual studio code', 'vscode', 'code')
  if (/\b(?:qqmusic|qq music)\b|qq\s*音乐/i.test(normalized))
    pushTerms('qqmusic', 'music', 'song', 'track', 'album', 'lyrics')
  if (/\b(?:spotify|apple music|music\.app|netease|cloud music)\b|网易云/i.test(normalized))
    pushTerms('music', 'song', 'track', 'album', 'lyrics')
  if (/\bdiff\b|改动|变更|对比/i.test(normalized))
    pushTerms('diff', 'changes', 'compare')
  if (/\b(?:error|exception|traceback|stack trace|test failed)\b|报错|错误|异常/i.test(normalized))
    pushTerms('error', 'exception', 'traceback', 'test failed')
  if (/\b(?:log|console)\b|日志|控制台|输出/i.test(normalized))
    pushTerms('log', 'console', 'terminal')

  return [...terms]
}
