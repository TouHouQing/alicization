import type {
  AlicizationDigitalLifeSpineDigest,
  AlicizationVisualPresenceStateSnapshot,
} from '../../../shared/eventa'
import type {
  AlicizationDigitalLifeArchitectureSnapshot,
} from './digital-life-architecture'
import type {
  AlicizationDigitalLifeContinuitySignal,
  AlicizationDigitalLifeMindStateCommitShape,
  AlicizationDigitalLifeProactivePolicySnapshot,
  AlicizationDigitalLifeProactiveSelection,
  AlicizationDigitalLifeRuntimeSurface,
  CommitAlicizationDigitalLifeMindStateInput,
} from './digital-life-kernel'

import { buildAlicizationDigitalLifeArchitecture } from './digital-life-architecture'
import {
  buildAlicizationDigitalLifeContinuitySignal,
  buildAlicizationDigitalLifeProactivePolicySnapshot,
  buildAlicizationDigitalLifeProactiveSelection,
  buildAlicizationDigitalLifeRuntimeSurface,
  commitAlicizationDigitalLifeMindState,
} from './digital-life-kernel'
import { buildAlicizationDigitalLifeMemoryDigest } from './digital-life-memory'

export interface AlicizationDigitalLifeSpineSnapshot {
  version: 'digital-life-spine-v1'
  runtimeSurface: AlicizationDigitalLifeRuntimeSurface
  architecture: AlicizationDigitalLifeArchitectureSnapshot | null
  continuitySignal: AlicizationDigitalLifeContinuitySignal | null
  proactiveSelection: AlicizationDigitalLifeProactiveSelection
  proactivePolicy: AlicizationDigitalLifeProactivePolicySnapshot
}

export interface AlicizationCommittedDigitalLifeSpine {
  version: 'digital-life-spine-commit-v1'
  previousState: AlicizationVisualPresenceStateSnapshot
  nextState: AlicizationVisualPresenceStateSnapshot
  previous: AlicizationDigitalLifeSpineSnapshot
  current: AlicizationDigitalLifeSpineSnapshot
}

function sanitizeDigitalLifeSpineDigestText(raw: unknown, maxChars = 160) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function normalizeDigitalLifeSpineDigestNumber(raw: unknown) {
  const value = Number(raw)
  if (!Number.isFinite(value))
    return null
  return value
}

function normalizeDigitalLifeSpineDigestUnit(raw: unknown) {
  const value = normalizeDigitalLifeSpineDigestNumber(raw)
  if (value == null)
    return null
  return Math.max(0, Math.min(1, value))
}

function readDigitalLifeGoalSummary(goal: unknown) {
  if (!goal || typeof goal !== 'object')
    return ''

  const candidate = goal as {
    summary?: unknown
    title?: unknown
    label?: unknown
    reason?: unknown
  }

  return sanitizeDigitalLifeSpineDigestText(
    candidate.summary ?? candidate.title ?? candidate.label ?? candidate.reason,
    160,
  )
}

export function projectAlicizationDigitalLifeSpineDigest(
  spine: AlicizationDigitalLifeSpineSnapshot | null | undefined,
): AlicizationDigitalLifeSpineDigest | null {
  if (!spine)
    return null

  const surface = spine.runtimeSurface
  const architecture = spine.architecture
  const continuitySignal = spine.continuitySignal
  const activeThread = spine.proactiveSelection.activeThread ?? surface.world.worldModel?.activeThread ?? null
  const initiative = surface.agency.initiative ?? null
  const privateThought = surface.cognition.privateThought ?? null
  const leadingGoal = spine.proactiveSelection.leadingGoal ?? null
  const dominantConcern = spine.proactiveSelection.dominantConcern ?? null
  const initiativeShouldSpeak = typeof (initiative as { shouldSpeak?: unknown } | null)?.shouldSpeak === 'boolean'
    ? (initiative as { shouldSpeak: boolean }).shouldSpeak
    : null
  const preferredPresence = sanitizeDigitalLifeSpineDigestText(
    privateThought?.embodiedPresence ?? initiative?.preferredPresence ?? '',
    48,
  ) || null

  return {
    version: 'digital-life-spine-digest-v1',
    runtime: {
      watchMode: sanitizeDigitalLifeSpineDigestText(surface.perception.watchMode, 48) || null,
      sceneScenario: sanitizeDigitalLifeSpineDigestText(surface.perception.currentScene?.scenario ?? '', 48) || null,
      sceneSummary: sanitizeDigitalLifeSpineDigestText(surface.perception.currentScene?.summary ?? '', 160) || null,
      activeThreadId: sanitizeDigitalLifeSpineDigestText(activeThread?.id ?? '', 96) || null,
      activeThreadTitle: sanitizeDigitalLifeSpineDigestText(activeThread?.title ?? activeThread?.kind ?? '', 96) || null,
      dominantMode: sanitizeDigitalLifeSpineDigestText(surface.cognition.mindKernel?.dominantMode ?? '', 48) || null,
      dominantDrive: sanitizeDigitalLifeSpineDigestText(surface.cognition.mindKernel?.dominantDrive ?? '', 48) || null,
      answerIntent: sanitizeDigitalLifeSpineDigestText(surface.dialogue.answerPlanner?.answerIntent ?? '', 64) || null,
      preferredPresence,
      selectedAction: sanitizeDigitalLifeSpineDigestText(initiative?.selectedAction ?? '', 48) || null,
      updatedAt: normalizeDigitalLifeSpineDigestNumber(surface.perception.updatedAt),
    },
    architecture: architecture
      ? {
          operatingMode: architecture.operatingMode,
          dominantSystem: architecture.dominantSystem,
          supportingSystems: [...architecture.supportingSystems],
          governingFocus: sanitizeDigitalLifeSpineDigestText(architecture.governingFocus ?? '', 160) || null,
          summary: sanitizeDigitalLifeSpineDigestText(architecture.summary, 200) || null,
        }
      : null,
    continuitySignal: continuitySignal
      ? {
          label: 'digital-life-line',
          summary: sanitizeDigitalLifeSpineDigestText(continuitySignal.summary, 220),
          signature: sanitizeDigitalLifeSpineDigestText(continuitySignal.signature, 512),
          createdAt: continuitySignal.createdAt,
          watchMode: sanitizeDigitalLifeSpineDigestText(continuitySignal.metadata.watchMode, 48) || null,
          sceneScenario: sanitizeDigitalLifeSpineDigestText(continuitySignal.metadata.sceneScenario ?? '', 48) || null,
          activeThreadId: sanitizeDigitalLifeSpineDigestText(continuitySignal.metadata.activeThreadId ?? '', 96) || null,
          dominantMode: sanitizeDigitalLifeSpineDigestText(continuitySignal.metadata.dominantMode ?? '', 48) || null,
          dominantDrive: sanitizeDigitalLifeSpineDigestText(continuitySignal.metadata.dominantDrive ?? '', 48) || null,
          answerIntent: sanitizeDigitalLifeSpineDigestText(continuitySignal.metadata.answerIntent ?? '', 64) || null,
          preferredPresence: sanitizeDigitalLifeSpineDigestText(continuitySignal.metadata.preferredPresence ?? '', 48) || null,
        }
      : null,
    proactive: {
      selectedAction: sanitizeDigitalLifeSpineDigestText(initiative?.selectedAction ?? '', 48) || null,
      preferredStyle: sanitizeDigitalLifeSpineDigestText(
        initiative?.preferredStyle ?? privateThought?.suggestedStyle ?? '',
        48,
      ) || null,
      confidence: normalizeDigitalLifeSpineDigestUnit(
        initiative?.confidence ?? privateThought?.confidence,
      ),
      shouldSpeak: initiativeShouldSpeak != null
        ? initiativeShouldSpeak
        : typeof privateThought?.shouldSpeak === 'boolean'
          ? privateThought.shouldSpeak
          : null,
      activeThreadId: sanitizeDigitalLifeSpineDigestText(activeThread?.id ?? '', 96) || null,
      activeThreadTitle: sanitizeDigitalLifeSpineDigestText(activeThread?.title ?? activeThread?.kind ?? '', 96) || null,
      dominantConcernKind: sanitizeDigitalLifeSpineDigestText(dominantConcern?.kind ?? '', 48) || null,
      dominantConcernSummary: sanitizeDigitalLifeSpineDigestText(dominantConcern?.summary ?? '', 160) || null,
      leadingGoalId: sanitizeDigitalLifeSpineDigestText(leadingGoal?.id ?? '', 96) || null,
      leadingGoalSummary: readDigitalLifeGoalSummary(leadingGoal) || null,
      preferredPresence,
    },
    memory: buildAlicizationDigitalLifeMemoryDigest(surface),
  }
}

// Treat the committed visual-presence snapshot as the single living spine so
// dialogue, proactive behavior, screen grounding, and agent sessions all read
// the same derived architecture instead of rebuilding parallel interpretations.
export function deriveAlicizationDigitalLifeSpineFromSurface(
  runtimeSurface: AlicizationDigitalLifeRuntimeSurface,
): AlicizationDigitalLifeSpineSnapshot {
  const architecture = buildAlicizationDigitalLifeArchitecture(runtimeSurface)

  return {
    version: 'digital-life-spine-v1',
    runtimeSurface,
    architecture,
    continuitySignal: buildAlicizationDigitalLifeContinuitySignal(runtimeSurface),
    proactiveSelection: buildAlicizationDigitalLifeProactiveSelection(runtimeSurface),
    proactivePolicy: {
      ...buildAlicizationDigitalLifeProactivePolicySnapshot(runtimeSurface),
      architecture,
    },
  }
}

export function deriveAlicizationDigitalLifeSpine(
  state: AlicizationVisualPresenceStateSnapshot,
): AlicizationDigitalLifeSpineSnapshot {
  return deriveAlicizationDigitalLifeSpineFromSurface(
    buildAlicizationDigitalLifeRuntimeSurface(state),
  )
}

export function commitAlicizationDigitalLifeSpine<TMindState extends AlicizationDigitalLifeMindStateCommitShape>(
  input: CommitAlicizationDigitalLifeMindStateInput<TMindState>,
): AlicizationCommittedDigitalLifeSpine {
  const previousState = input.previousState
  const nextState = commitAlicizationDigitalLifeMindState(input)

  return {
    version: 'digital-life-spine-commit-v1',
    previousState,
    nextState,
    previous: deriveAlicizationDigitalLifeSpine(previousState),
    current: deriveAlicizationDigitalLifeSpine(nextState),
  }
}
