import type { AlicizationContentKind, AlicizationWorkloadKind } from './proactive-layered-context'

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

export interface AlicizationPerceptionState {
  attentionAnchor: AlicizationAttentionAnchor | null
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

export function isInternalAlicizationRepairPrompt(text: string) {
  const normalized = sanitizeHintText(text)
  if (!normalized)
    return false

  const lower = normalized.toLowerCase()
  return lower.includes('rewrite the draft assistant output into strict json contract')
    || (lower.includes('user input:') && lower.includes('assistant draft:'))
    || (lower.includes('current personality state:') && lower.includes('violations to fix:'))
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
    || isInternalAlicizationRepairPrompt(hintText)
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
  if (!hintText || isInternalAlicizationRepairPrompt(hintText))
    return input.state

  const activeUntil = input.now + Math.max(60_000, input.durationMs ?? 3 * 60_000)
  const fallbackTarget = input.state.lastNonSelfForegroundTarget
  const nextAnchor = input.state.attentionAnchor
    ? {
        ...input.state.attentionAnchor,
        reason: 'invited-inspection' as const,
        confidence: clampConfidence(Math.max(input.state.attentionAnchor.confidence, 0.9)),
      }
    : fallbackTarget
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
    invitedInspection: {
      requestedAt: input.now,
      activeUntil,
      hintText,
    },
    recentSceneResidue: input.state.recentSceneResidue,
    updatedAt: input.now,
  } satisfies AlicizationPerceptionState
}

export function getActiveAttentionAnchor(
  state: AlicizationPerceptionState,
  now: number,
  maxAgeMs = 3 * 60_000,
) {
  if (state.attentionAnchor) {
    if (now - state.attentionAnchor.lastObservedAt <= maxAgeMs || isInspectionActive(state.invitedInspection, now))
      return state.attentionAnchor
  }

  if (state.lastNonSelfForegroundTarget && now - state.lastNonSelfForegroundTarget.observedAt <= maxAgeMs) {
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
  if (isInternalAlicizationRepairPrompt(normalized)) {
    return {
      active: false,
      confidence: 0,
    }
  }

  const lower = normalized.toLowerCase()
  const requestPattern = /帮我看看?|看(?:下|一下|看)?(?:这个)?|review|inspect|look at|take a look|check (?:this|that)/i
  const subjectPattern = /屏幕|窗口|界面|截图|代码|diff|改动|报错|错误|error|exception|traceback|stack trace|terminal|终端|日志|log|console|输出|pr|pull request|commit|cursor|vs code|xcode|jetbrains|pycharm|intellij|goland|webstorm|zed|iterm|warp|wezterm|docker|github desktop|gitkraken|fork|sourcetree|tower/i
  const problemPattern = /(?:这个|这里|这边|当前).*?(?:有啥|有什么|哪里|怎么|问题)|what'?s wrong|what is wrong|problem with|issue with/i
  const descriptionPattern = /(?:重新|再)?(?:描述|说说|讲讲)(?:一下)?(?:我|当前|现在)?的?(?:屏幕|窗口|界面|画面)(?:上|里)?的?(?:内容|情况|东西)?|(?:告诉我|跟我说)(?:一下)?(?:我|当前|现在)?的?(?:屏幕|窗口|界面|画面)(?:上|里)?(?:有|是)什么|what(?:'s| is) on (?:my )?(?:screen|display|window)|describe (?:my |the )?(?:screen|display|window)|tell me what(?:'s| is) on (?:my )?(?:screen|display|window)/i
  const active = (requestPattern.test(lower) && subjectPattern.test(lower))
    || (subjectPattern.test(lower) && problemPattern.test(lower))
    || descriptionPattern.test(lower)

  return {
    active,
    confidence: active
      ? (requestPattern.test(lower) ? 0.92 : descriptionPattern.test(lower) ? 0.9 : 0.76)
      : 0,
  }
}

export function extractInspectionHintTerms(text: string) {
  const normalized = sanitizeHintText(text).toLowerCase()
  if (!normalized || isInternalAlicizationRepairPrompt(normalized))
    return []

  const terms = new Set<string>()
  const pushTerms = (...values: string[]) => {
    for (const value of values) {
      const trimmed = value.trim().toLowerCase()
      if (trimmed)
        terms.add(trimmed)
    }
  }

  const aliasMatchers = [
    { pattern: /\b(?:vs\s*code|visual studio code)\b|(?<![a-z])code(?![a-z])/i, terms: ['visual studio code', 'vscode', 'code'] },
    { pattern: /\bcursor\b/i, terms: ['cursor'] },
    { pattern: /\bwindsurf\b/i, terms: ['windsurf'] },
    { pattern: /\bzed\b/i, terms: ['zed'] },
    { pattern: /\bxcode\b/i, terms: ['xcode'] },
    { pattern: /\b(?:jetbrains|intellij|pycharm|goland|webstorm|phpstorm|clion|rubymine|rider|dataspell|rustrover)\b/i, terms: ['jetbrains', 'intellij', 'pycharm', 'goland', 'webstorm'] },
    { pattern: /\b(?:terminal|iterm2?|warp|wezterm|alacritty|kitty|hyper|tmux)\b|终端/i, terms: ['terminal', 'iterm', 'warp', 'wezterm'] },
    { pattern: /\bdocker\b/i, terms: ['docker', 'docker desktop'] },
    { pattern: /\b(?:github desktop|gitkraken|fork|sourcetree|tower|smartgit)\b/i, terms: ['github desktop', 'gitkraken', 'fork', 'sourcetree', 'tower'] },
    { pattern: /\bdiff\b|改动|变更|对比/i, terms: ['diff', 'changes', 'compare'] },
    { pattern: /\b(?:error|exception|traceback|stack trace|test failed)\b|报错|错误|异常/i, terms: ['error', 'exception', 'traceback', 'test failed'] },
    { pattern: /\b(?:log|console)\b|日志|控制台|输出/i, terms: ['log', 'console', 'terminal'] },
  ]

  for (const matcher of aliasMatchers) {
    if (matcher.pattern.test(normalized))
      pushTerms(...matcher.terms)
  }

  for (const token of normalized.split(/[^a-z0-9\u4E00-\u9FFF]+/i)) {
    if (token.length >= 4)
      pushTerms(token)
  }

  return [...terms]
}
