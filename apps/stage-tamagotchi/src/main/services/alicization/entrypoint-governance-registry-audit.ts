import type { AlicizationProjectEntrypointGovernanceEntry } from './project-state-brief'

import {
  assertAlicizationProjectEntrypointGovernanceModeBelongsToDomain,
  resolveAlicizationProjectEntrypointGovernanceAllowedModes,
  resolveAlicizationProjectEntrypointGovernanceRegistry,
} from './project-state-brief'
import {
  autonomousDialogueOrigins,
  autonomousDialogueStructuredFormats,
  autonomousDialogueTurnIdPrefixes,
} from './runtime-structured-format'

export type AlicizationProjectEntrypointGovernanceAuditDomain
  = AlicizationProjectEntrypointGovernanceEntry['domain']

export interface AlicizationProjectEntrypointGovernanceAllowedCrossDomainOverlap {
  relativePath: string
  domains: readonly AlicizationProjectEntrypointGovernanceAuditDomain[]
  reason: string
}

export interface AlicizationAutonomousDialogueFamilySignal {
  signalKind: 'structured-format' | 'origin' | 'turn-id-prefix'
  value: string
  responsibility: string
}

const alicizationProjectEntrypointGovernanceAllowedCrossDomainOverlaps = [
  {
    relativePath: 'executor-runtime.ts',
    domains: ['execution-dispatch', 'execution-preflight'],
    reason: 'executor-runtime.ts intentionally bridges confirmed-thread execution resume preflight briefing and delegated dispatch ownership so resumed work keeps the same-her execution line before redispatch opens outward.',
  },
  {
    relativePath: 'main-chat-background-run.ts',
    domains: ['chat-start', 'recovery-reentry'],
    reason: 'main-chat-background-run.ts intentionally bridges normalized chat-start carry with background recovery driving so accepted-start settlement, timeout fallback reconstruction, and lifecycle recovery finish re-enter one same-her reopened line instead of forking detached recovery shells.',
  },
  {
    relativePath: 'main-chat-execution-surface.ts',
    domains: ['execution-follow-up-continuity', 'execution-preflight'],
    reason: 'main-chat-execution-surface.ts intentionally bridges execution capability/project briefing and callback-capability follow-through so capability narration stays on the same living callback line instead of splitting callback return carry away from execution explanation.',
  },
  {
    relativePath: 'main-chat-run-lifecycle.ts',
    domains: ['chat-start', 'recovery-reentry'],
    reason: 'main-chat-run-lifecycle.ts intentionally bridges downstream chat-start lifecycle orchestration with timeout recovery finish so recovered visible reply emission stays on the same reopened line instead of widening into a detached recovery shell.',
  },
  {
    relativePath: 'main-chat-session-runtime.ts',
    domains: ['chat-start', 'execution-follow-up-continuity', 'execution-preflight'],
    reason: 'main-chat-session-runtime.ts intentionally bridges chat-start payload renormalization, session-bound execution runtime-context requests, and live execution follow-up assembly before tools or provider-facing reply shaping open outward.',
  },
  {
    relativePath: 'main-chat-timeout-fallback.ts',
    domains: ['chat-start', 'recovery-reentry'],
    reason: 'main-chat-timeout-fallback.ts intentionally bridges downstream chat-start fallback consumption with timeout fallback reconstruction so stressed recovery preserves the same reopened project line instead of branching into a detached fallback shell.',
  },
  {
    relativePath: 'runtime-delivery-reminders.ts',
    domains: ['autonomous-dialogue', 'execution-follow-up-continuity'],
    reason: 'runtime-delivery-reminders.ts intentionally bridges runtime-owned reminder/callback visible turn reopening and callback persistence carry so delayed or replayed callback return stays on the same autonomous same-her line instead of forking a detached callback shell.',
  },
  {
    relativePath: 'runtime-execution-delivery.ts',
    domains: ['execution-follow-up-continuity', 'provider-consumer'],
    reason: 'runtime-execution-delivery.ts intentionally bridges typed provider-backed execution callback authoring and callback delivery continuity so callback return carry stays on one same-her execution-follow-up line instead of splitting callback speech generation away from host-facing delivery state.',
  },
  {
    relativePath: 'runtime-subconscious-tick.ts',
    domains: ['autonomous-dialogue', 'execution-dispatch', 'execution-preflight'],
    reason: 'runtime-subconscious-tick.ts intentionally bridges subconscious same-her carry entry, execution preflight runtime-context requests, and deferred execution redispatch back into the audited runtime execution bridge.',
  },
  {
    relativePath: 'runtime.ts',
    domains: ['autonomous-dialogue', 'chat-start', 'execution-dispatch', 'execution-preflight', 'provider-consumer', 'recovery-reentry'],
    reason: 'runtime.ts intentionally bridges chat-start renormalization, accepted-start recovery ownership, runtime-owned proactive/reminder entry authority, execution preflight runtime-context rebuild, audited runtime execution redispatch, and main-gateway provider dispatch ownership.',
  },
] as const satisfies readonly AlicizationProjectEntrypointGovernanceAllowedCrossDomainOverlap[]

const alicizationAutonomousDialogueFamilySignals = [
  ...autonomousDialogueOrigins.map(origin => ({
    signalKind: 'origin' as const,
    value: origin,
    responsibility: 'Runtime-owned autonomous dialogue families must keep subconscious proactive origin explicit instead of silently drifting into generic user-turn handling.',
  })),
  ...autonomousDialogueStructuredFormats.map(format => ({
    signalKind: 'structured-format' as const,
    value: format,
    responsibility:
      format === 'subconscious-proactive-v1'
        ? 'Deterministic subconscious proactive turns must stay on an explicitly governed structured-format family.'
        : format === 'subconscious-proactive-llm-v1'
          ? 'Gateway-authored subconscious proactive turns must stay on an explicitly governed structured-format family.'
          : 'Reminder-owned autonomous dialogue turns must stay on an explicitly governed structured-format family.',
  })),
  ...autonomousDialogueTurnIdPrefixes.map(prefix => ({
    signalKind: 'turn-id-prefix' as const,
    value: prefix,
    responsibility:
      prefix === 'execution-callback:'
        ? 'Execution-callback autonomous dialogue turns must keep their explicit turn-id family boundary.'
        : prefix === 'reminder:'
          ? 'Reminder autonomous dialogue turns must keep their explicit turn-id family boundary.'
          : 'Subconscious carry turns must keep their explicit turn-id family boundary.',
  })),
] as const satisfies readonly AlicizationAutonomousDialogueFamilySignal[]

export function resolveAlicizationProjectEntrypointGovernanceAuditRegistry() {
  return resolveAlicizationProjectEntrypointGovernanceRegistry()
}

export function resolveAlicizationProjectEntrypointGovernanceAllowedCrossDomainOverlaps() {
  return alicizationProjectEntrypointGovernanceAllowedCrossDomainOverlaps
    .slice()
    .sort((left, right) => left.relativePath.localeCompare(right.relativePath))
}

export function resolveAlicizationAutonomousDialogueFamilySignals() {
  return alicizationAutonomousDialogueFamilySignals
}

export function resolveAlicizationProjectEntrypointGovernanceAuditDomainEntries(
  domain: AlicizationProjectEntrypointGovernanceAuditDomain,
) {
  return resolveAlicizationProjectEntrypointGovernanceAuditRegistry()
    .filter(entry => entry.domain === domain)
}

export function resolveAlicizationProjectEntrypointGovernanceAuditDomainFiles(
  domain: AlicizationProjectEntrypointGovernanceAuditDomain,
) {
  return resolveAlicizationProjectEntrypointGovernanceAuditDomainEntries(domain)
    .map(entry => entry.relativePath)
    .slice()
    .sort()
}

export {
  assertAlicizationProjectEntrypointGovernanceModeBelongsToDomain,
  resolveAlicizationProjectEntrypointGovernanceAllowedModes,
}
