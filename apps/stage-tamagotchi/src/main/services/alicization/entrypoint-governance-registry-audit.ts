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
    relativePath: 'main-chat-background-run.ts',
    domains: ['chat-start', 'recovery-reentry'],
    reason: 'main-chat-background-run.ts bridges normalized chat-start input with accepted-start settlement, timeout reconstruction, and lifecycle recovery completion.',
  },
  {
    relativePath: 'main-chat-run-lifecycle.ts',
    domains: ['chat-start', 'recovery-reentry'],
    reason: 'main-chat-run-lifecycle.ts bridges chat-start lifecycle orchestration with timeout recovery completion and visible failure delivery.',
  },
  {
    relativePath: 'executor-runtime.ts',
    domains: ['execution-dispatch', 'execution-preflight'],
    reason: 'executor-runtime.ts bridges confirmed-thread execution context restoration with delegated dispatch ownership.',
  },
  {
    relativePath: 'main-chat-session-runtime.ts',
    domains: ['chat-start', 'execution-follow-up-continuity', 'execution-preflight'],
    reason: 'main-chat-session-runtime.ts bridges chat-start normalization, session-bound execution context requests, and execution follow-up assembly.',
  },
  {
    relativePath: 'main-chat-timeout-fallback.ts',
    domains: ['chat-start', 'recovery-reentry'],
    reason: 'main-chat-timeout-fallback.ts bridges chat-start fallback consumption with transparent timeout reconstruction.',
  },
  {
    relativePath: 'runtime-subconscious-tick.ts',
    domains: ['autonomous-dialogue', 'execution-dispatch', 'execution-preflight'],
    reason: 'runtime-subconscious-tick.ts bridges autonomous turn ownership, execution context requests, and deferred execution redispatch.',
  },
  {
    relativePath: 'runtime-delivery-reminders.ts',
    domains: ['autonomous-dialogue', 'execution-follow-up-continuity'],
    reason: 'runtime-delivery-reminders.ts bridges reminder and callback turn ownership with guarded callback persistence.',
  },
  {
    relativePath: 'runtime-execution-delivery.ts',
    domains: ['execution-follow-up-continuity', 'provider-consumer'],
    reason: 'runtime-execution-delivery.ts bridges typed Provider callback authoring with host-facing execution delivery state.',
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
