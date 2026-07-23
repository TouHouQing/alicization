interface AlicizationProjectStateLike {
  identity?: unknown
  currentPhase?: unknown
  preflightSummary?: unknown
  preDialogueAwarenessLine?: unknown
  awarenessLine?: unknown
  companionHeadlineLine?: unknown
  companionBriefingLine?: unknown
  preDialogueAwarenessSummary?: unknown
  latestLandedProgress?: unknown
  latestProgress?: unknown
  landedProgressSummary?: unknown
  primaryOpenLoop?: unknown
  openClosureSummary?: unknown
  proactiveSameHerGap?: unknown
  proactiveSameHerGapSummary?: unknown
  nextClosureTarget?: unknown
  nextClosureTargetSummary?: unknown
  sameHerSelfLine?: unknown
  sameHerDriftRisk?: unknown
  sameHerDriftRiskSummary?: unknown
  emotionalClosureCue?: unknown
  emotionalClosureSummary?: unknown
  sameHerHoldDetail?: unknown
  continuityRestraint?: unknown
  continuityArcStage?: unknown
  continuityCue?: unknown
  continuityPreferredTiming?: unknown
  continuityCadence?: unknown
  preferredBlinkCadence?: unknown
  preferredGazeMode?: unknown
  preferredPauseMode?: unknown
  preferredLipsyncMode?: unknown
  preferredVoiceMode?: unknown
  preferredPacingMode?: unknown
}

export interface AlicizationProjectStateBrief {
  identity: string
  currentPhase: string
  latestProgress: string
  primaryOpenLoop: string
  proactiveSameHerGap: string
  sameHerSelfLine: string
  sameHerDriftRisk: string
  companionHeadlineLine?: string | null
  companionBriefingLine?: string | null
  emotionalClosureCue?: string | null
  emotionalClosureSummary?: string | null
  sameHerHoldDetail?: string | null
  continuityRestraint?: 'lower-pressure' | 'measured-return' | 'repair-before-closeness' | 'rest-protective' | 'single-thread' | null
  continuityArcStage?: string | null
  continuityPreferredTiming?: 'internal-only' | 'after-payoff' | 'same-turn-if-invited' | 'next-open-window' | null
  continuityCadence?: string | null
  preferredBlinkCadence?: 'normal' | 'linger' | 'quiet' | null
  preferredGazeMode?: 'steady' | 'soften' | 'drift' | null
  preferredPauseMode?: 'longer' | 'natural' | null
  preferredLipsyncMode?: 'restrained' | 'matched' | null
  preferredVoiceMode?: 'lower-pressure' | 'even' | null
  preferredPacingMode?: 'slower' | 'natural' | null
  continuityCue?: string | null
  preflightSummary?: string | null
  preDialogueAwarenessLine?: string | null
  closedFoundations: string[]
  continuityProgressSummary?: string
  memoryAnthropomorphismProgress: string[]
  openLoops: string[]
  nextClosureTarget: string
}

export interface AlicizationProjectStateSnapshot {
  identity: string
  currentPhase: string
  preflightSummary: string | null
  preDialogueAwarenessLine: string | null
  preDialogueAwarenessSummary?: string | null
  awarenessLine?: string | null
  companionHeadlineLine?: string | null
  companionBriefingLine?: string | null
  latestLandedProgress: string | null
  latestProgress?: string | null
  primaryOpenLoop: string | null
  proactiveSameHerGap: string | null
  nextClosureTarget: string
  sameHerSelfLine: string
  sameHerDriftRisk: string
  emotionalClosureCue?: string | null
  emotionalClosureSummary?: string | null
  sameHerHoldDetail?: string | null
  continuityRestraint?: 'lower-pressure' | 'measured-return' | 'repair-before-closeness' | 'rest-protective' | 'single-thread' | null
  continuityArcStage?: string | null
  continuityCue?: string | null
  continuityPreferredTiming: 'internal-only' | 'after-payoff' | 'same-turn-if-invited' | 'next-open-window' | null
  continuityCadence: string | null
  preferredBlinkCadence: 'normal' | 'linger' | 'quiet' | null
  preferredGazeMode: 'steady' | 'soften' | 'drift' | null
  preferredPauseMode: 'longer' | 'natural' | null
  preferredLipsyncMode: 'restrained' | 'matched' | null
  preferredVoiceMode: 'lower-pressure' | 'even' | null
  preferredPacingMode: 'slower' | 'natural' | null
}

export interface AlicizationSurfaceProjectStateSnapshot extends AlicizationProjectStateSnapshot {
  continuityRestraint: 'lower-pressure' | 'measured-return' | 'repair-before-closeness' | 'rest-protective' | 'single-thread' | null
  continuityPreferredTiming: 'internal-only' | 'after-payoff' | 'same-turn-if-invited' | 'next-open-window' | null
  continuityCadence: string | null
  preferredBlinkCadence: 'normal' | 'linger' | 'quiet' | null
  preferredGazeMode: 'steady' | 'soften' | 'drift' | null
  preferredPauseMode: 'longer' | 'natural' | null
  preferredLipsyncMode: 'restrained' | 'matched' | null
  preferredVoiceMode: 'lower-pressure' | 'even' | null
  preferredPacingMode: 'slower' | 'natural' | null
  sameHerDriftRisk: string
}

export interface AlicizationProjectStatusBrief {
  projectIdentity: string
  projectPhase: string
  latestLandedProgress: string
  primaryOpenLoop: string
  proactiveSameHerGap: string
  nextClosureTarget: string
  sameHerSelfLine: string
  sameHerDriftRisk: string
  preflightSummary: string
  preDialogueAwarenessLine: string
  awarenessLine: string
  companionHeadlineLine: string
  companionBriefingLine: string
  closureReadiness: 'grounded' | 'partial'
  missingClosureItems: string[]
}

export interface AlicizationProjectStateCoverageEntry {
  id: string
  area: 'reply' | 'runtime' | 'memory' | 'perception' | 'execution'
  status: 'verified'
  responsibility: string
  proof: string
}

export type AlicizationProjectEntrypointGovernanceEntry = {
  domain: 'chat-start'
  mode: 'authority' | 'normalize-before-use' | 'read-only-downstream'
  relativePath: string
  responsibility: string
} | {
  domain: 'pre-dialogue-transport'
  mode: 'identity-construction' | 'transport-sanitization' | 'bridge-forwarding'
  relativePath: string
  responsibility: string
} | {
  domain: 'chat-entry'
  mode: 'authority' | 'normalize-before-use' | 'read-only-downstream' | 'shared-send-authority'
  relativePath: string
  responsibility: string
} | {
  domain: 'provider-consumer'
  mode: 'authority' | 'dispatch-owner' | 'typed-consumer'
  relativePath: string
  responsibility: string
} | {
  domain: 'autonomous-dialogue'
  mode: 'authority' | 'normalize-before-use'
  relativePath: string
  responsibility: string
} | {
  domain: 'execution-preflight'
  mode:
    | 'execution-briefing-authority'
    | 'runtime-context-authority'
    | 'runtime-dispatch-execution-bridge'
    | 'session-bound-execution-bridge'
    | 'subconscious-autonomy-execution-bridge'
    | 'resume-dispatch-bridge'
    | 'pre-dispatch-persistence'
    | 'blocked-dispatch-safety-gate'
  relativePath: string
  responsibility: string
} | {
  domain: 'execution-dispatch'
  mode: 'dispatch-owner'
  relativePath: string
  responsibility: string
} | {
  domain: 'recovery-reentry'
  mode:
    | 'accepted-start-settlement'
    | 'accepted-start-owner'
    | 'timeout-fallback-reconstruction'
    | 'timeout-recovery-finish'
    | 'background-recovery-driver'
  relativePath: string
  responsibility: string
} | {
  domain: 'execution-follow-up-continuity'
  mode:
    | 'callback-runtime-authority'
    | 'callback-conscious-frame-surface'
    | 'callback-delivery-surface'
    | 'callback-payoff-surface'
    | 'callback-capability-project-briefing'
    | 'follow-up-obligation-authority'
    | 'follow-up-response-contract-surface'
    | 'ledger-follow-up-recall'
    | 'session-follow-up-assembly'
    | 'afterglow-learning-authority'
    | 'callback-persistence-surface'
  relativePath: string
  responsibility: string
}

export interface AlicizationProjectAwarenessTopLevelCompletenessGuardFamily {
  id:
    | 'chat-start'
    | 'cross-surface-dialogue-entry'
    | 'return-side-project-awareness'
    | 'recovery-reentry'
    | 'provider-consumer'
    | 'autonomous-dialogue'
    | 'execution-preflight'
    | 'execution-dispatch'
    | 'execution-follow-up-continuity'
    | 'runtime-dialogue-normalization'
  responsibility: string
}

export interface AlicizationPreDialogueTransportEntrypointGovernanceMirror {
  transportRelativePath: string
  chatEntryRelativePath: string
  responsibility: string
}

export type AlicizationProjectRouteAuthorityEntry = {
  domain: 'pre-dialogue-transport'
  mode: 'identity-construction' | 'transport-sanitization' | 'bridge-forwarding'
  relativePath: string
  responsibility: string
} | {
  domain: 'return-side-project-awareness'
  mode:
    | 'renderer-observation-bridge'
    | 'renderer-meta-bridge'
    | 'structured-normalization'
    | 'chat-stream-ingest'
    | 'session-sanitization'
    | 'browser-observation-persistence'
    | 'project-state-observation-reducer'
    | 'inspector-fallback-rebuild'
  relativePath: string
  responsibility: string
} | {
  domain: 'runtime-dialogue-normalization'
  mode:
    | 'normalization-authority'
    | 'persistence-emission-normalize-before-deliver'
    | 'replay-normalize-before-deliver'
    | 'proactive-normalize-before-persist'
  relativePath: string
  responsibility: string
} | {
  domain: 'runtime-turn-persistence'
  mode: 'persistence-authority' | 'renderer-dialogue-entry' | 'proactive-turn-entry' | 'reminder-turn-entry'
  relativePath: string
  responsibility: string
}

export interface AlicizationProjectRouteAuthorityAllowedOverlap {
  relativePath: string
  domains: readonly AlicizationProjectRouteAuthorityEntry['domain'][]
  reason: string
}

function emptyProjectStateSnapshot(): AlicizationSurfaceProjectStateSnapshot {
  return {
    identity: '',
    currentPhase: '',
    preflightSummary: null,
    preDialogueAwarenessLine: null,
    preDialogueAwarenessSummary: null,
    awarenessLine: null,
    companionHeadlineLine: null,
    companionBriefingLine: null,
    latestLandedProgress: null,
    latestProgress: null,
    primaryOpenLoop: null,
    proactiveSameHerGap: null,
    nextClosureTarget: '',
    sameHerSelfLine: '',
    sameHerDriftRisk: '',
    emotionalClosureCue: null,
    emotionalClosureSummary: null,
    sameHerHoldDetail: null,
    continuityRestraint: null,
    continuityArcStage: null,
    continuityCue: null,
    continuityPreferredTiming: null,
    continuityCadence: null,
    preferredBlinkCadence: null,
    preferredGazeMode: null,
    preferredPauseMode: null,
    preferredLipsyncMode: null,
    preferredVoiceMode: null,
    preferredPacingMode: null,
  }
}

export function resolveAlicizationProjectStateBrief(): AlicizationProjectStateBrief {
  return {
    identity: '',
    currentPhase: '',
    latestProgress: '',
    primaryOpenLoop: '',
    proactiveSameHerGap: '',
    sameHerSelfLine: '',
    sameHerDriftRisk: '',
    companionHeadlineLine: null,
    companionBriefingLine: null,
    emotionalClosureCue: null,
    emotionalClosureSummary: null,
    sameHerHoldDetail: null,
    continuityRestraint: null,
    continuityArcStage: null,
    continuityPreferredTiming: null,
    continuityCadence: null,
    preferredBlinkCadence: null,
    preferredGazeMode: null,
    preferredPauseMode: null,
    preferredLipsyncMode: null,
    preferredVoiceMode: null,
    preferredPacingMode: null,
    continuityCue: null,
    preflightSummary: null,
    preDialogueAwarenessLine: null,
    closedFoundations: [],
    continuityProgressSummary: '',
    memoryAnthropomorphismProgress: [],
    openLoops: [],
    nextClosureTarget: '',
  }
}

export function resolveAlicizationProjectStateSnapshot(_input?: {
  runtimeProjectState?: AlicizationProjectStateLike | null
  fallbackProjectState?: AlicizationProjectStateLike | null
}): AlicizationProjectStateSnapshot {
  return emptyProjectStateSnapshot()
}

export function resolveAlicizationSurfaceProjectStateSnapshot(_input?: {
  runtimeSurface?: {
    raw?: unknown
    perception?: unknown
    cognition?: unknown
    memory?: unknown
    dialogue?: unknown
    agency?: unknown
  } | null
  fallbackProjectState?: AlicizationProjectStateLike | null
}): AlicizationSurfaceProjectStateSnapshot {
  return emptyProjectStateSnapshot()
}

export function resolveAlicizationProjectStatusBrief(_input?: {
  runtimeProjectState?: AlicizationProjectStateLike | null
  fallbackProjectState?: AlicizationProjectStateLike | null
}): AlicizationProjectStatusBrief {
  return {
    projectIdentity: '',
    projectPhase: '',
    latestLandedProgress: '',
    primaryOpenLoop: '',
    proactiveSameHerGap: '',
    nextClosureTarget: '',
    sameHerSelfLine: '',
    sameHerDriftRisk: '',
    preflightSummary: '',
    preDialogueAwarenessLine: '',
    awarenessLine: '',
    companionHeadlineLine: '',
    companionBriefingLine: '',
    closureReadiness: 'partial',
    missingClosureItems: [],
  }
}

export function buildAlicizationProjectStatePreflightSummary(_input: {
  identity: string
  currentPhase: string
  primaryOpenLoop: string | null | undefined
  nextClosureTarget: string | null | undefined
}) {
  return null
}

export function buildAlicizationProjectPreDialogueAwareness(_input: {
  preflightSummary: string | null
  runtimeProjectState?: AlicizationProjectStateLike | null
  fallbackProjectState?: AlicizationProjectStateLike | null
  primaryOpenLoop: string | null
  nextClosureTarget: string | null
}) {
  return {
    status: 'partial' as const,
    summaryLine: '',
    companionHeadlineLine: null,
    companionBriefingLine: null,
    companionNextClosureLine: null,
    awarenessLine: null,
    emotionalClosureCue: null,
    reasonPreview: [],
  }
}

export function buildAlicizationProjectPreDialogueClosure(_input: {
  preflightSummary: string | null
  runtimeProjectState?: AlicizationProjectStateLike | null
  fallbackProjectState?: AlicizationProjectStateLike | null
  primaryOpenLoop: string | null
  nextClosureTarget: string | null
}) {
  return {
    status: 'partial' as const,
    summaryLine: '',
    companionHeadlineLine: null,
    companionBriefingLine: null,
    companionNextClosureLine: null,
    emotionalClosureCue: null,
    briefingLines: [],
    reasons: [],
  }
}

export function buildAlicizationProjectPreDialogueAwarenessLine(_input: {
  identity: string
  currentPhase: string
  latestLandedProgress?: string | null
  latestProgress?: string | null
  landedProgressSummary?: string | null
  primaryOpenLoop: string | null | undefined
  nextClosureTarget?: string | null
  sameHerSelfLine?: string | null
}) {
  return null
}

export function resolveAlicizationProjectPreDialogueAwarenessLine(_input?: unknown): string | null {
  return null
}

export function compactProjectLatestProgressForSystemBlock(_text: string, _maxChars = 220) {
  return ''
}

export function preferStrongerPersistedSameHerSelfLine(_input: {
  current?: unknown
  candidate?: unknown
}) {
  return ''
}

export function preferStrongerSameHerDriftRisk(_input: {
  current?: unknown
  candidate?: unknown
  fallback?: unknown
}) {
  return ''
}

export function looksLikeThinProjectClosureShell(_raw: unknown, _kind: 'landed' | 'open' | 'next') {
  return true
}

export function isAlicizationThinProjectAwarenessLine(_value: string | null | undefined) {
  return true
}

export function isAlicizationThinSamePhaseCarryLine(_value: unknown) {
  return true
}

export function scoreAlicizationProjectAwarenessLine(_value: string | null | undefined) {
  return 0
}

export function resolveAlicizationProjectEntrypointGovernanceAllowedModes(
  domain: AlicizationProjectEntrypointGovernanceEntry['domain'],
) {
  if (domain === 'chat-start')
    return ['authority', 'normalize-before-use', 'read-only-downstream'] as const
  if (domain === 'pre-dialogue-transport')
    return ['identity-construction', 'transport-sanitization', 'bridge-forwarding'] as const
  if (domain === 'chat-entry')
    return ['authority', 'normalize-before-use', 'read-only-downstream', 'shared-send-authority'] as const
  if (domain === 'provider-consumer')
    return ['authority', 'dispatch-owner', 'typed-consumer'] as const
  if (domain === 'autonomous-dialogue')
    return ['authority', 'normalize-before-use'] as const
  if (domain === 'execution-preflight') {
    return [
      'execution-briefing-authority',
      'runtime-context-authority',
      'runtime-dispatch-execution-bridge',
      'session-bound-execution-bridge',
      'subconscious-autonomy-execution-bridge',
      'resume-dispatch-bridge',
      'pre-dispatch-persistence',
      'blocked-dispatch-safety-gate',
    ] as const
  }
  if (domain === 'execution-dispatch')
    return ['dispatch-owner'] as const
  if (domain === 'recovery-reentry') {
    return [
      'accepted-start-settlement',
      'accepted-start-owner',
      'timeout-fallback-reconstruction',
      'timeout-recovery-finish',
      'background-recovery-driver',
    ] as const
  }
  return [
    'callback-runtime-authority',
    'callback-conscious-frame-surface',
    'callback-delivery-surface',
    'callback-payoff-surface',
    'callback-capability-project-briefing',
    'follow-up-obligation-authority',
    'follow-up-response-contract-surface',
    'ledger-follow-up-recall',
    'session-follow-up-assembly',
    'afterglow-learning-authority',
    'callback-persistence-surface',
  ] as const
}

export function assertAlicizationProjectEntrypointGovernanceModeBelongsToDomain(
  entry: Pick<AlicizationProjectEntrypointGovernanceEntry, 'domain' | 'mode' | 'relativePath'>,
) {
  const allowedModes = resolveAlicizationProjectEntrypointGovernanceAllowedModes(entry.domain)
  if (allowedModes.includes(entry.mode as never))
    return

  throw new Error(`Unexpected Alicization entrypoint governance mode for ${entry.domain} at ${entry.relativePath}: ${entry.mode}`)
}

const ownershipAuditResponsibility
  = 'Architecture ownership metadata only. This registry must not enter Provider prompts or author visible replies.'

function buildEntrypointOwnershipEntries(
  domain: AlicizationProjectEntrypointGovernanceEntry['domain'],
  entries: readonly (readonly [relativePath: string, mode: AlicizationProjectEntrypointGovernanceEntry['mode']])[],
) {
  return entries.map(([relativePath, mode]) => ({
    domain,
    mode,
    relativePath,
    responsibility: ownershipAuditResponsibility,
  })) as AlicizationProjectEntrypointGovernanceEntry[]
}

const alicizationProjectEntrypointGovernanceRegistry = [
  ...buildEntrypointOwnershipEntries('chat-start', [
    ['main-chat-background-run.ts', 'normalize-before-use'],
    ['main-chat-direct-start.ts', 'normalize-before-use'],
    ['main-chat-run-lifecycle.ts', 'read-only-downstream'],
    ['main-chat-session-runtime.ts', 'normalize-before-use'],
    ['main-chat-start-acceptance.ts', 'normalize-before-use'],
    ['main-chat-stream-runner.ts', 'normalize-before-use'],
    ['runtime-chat-stream.ts', 'read-only-downstream'],
    ['runtime-dialogue-feedback.ts', 'normalize-before-use'],
    ['runtime-execution-feedback.ts', 'normalize-before-use'],
    ['runtime-invoke-handlers-chat.ts', 'normalize-before-use'],
    ['runtime-main-chat-context.ts', 'read-only-downstream'],
    ['runtime-main-chat-prelude.ts', 'authority'],
    ['runtime.ts', 'normalize-before-use'],
  ]),
  ...buildEntrypointOwnershipEntries('pre-dialogue-transport', [
    ['../../../renderer/App.vue', 'transport-sanitization'],
  ]),
  ...buildEntrypointOwnershipEntries('chat-entry', [
    ['../../../../apps/stage-pocket/src/pages/devtools/performance-playground.chat.ts', 'authority'],
    ['../../../../apps/stage-pocket/src/pages/devtools/performance-playground.vue', 'authority'],
    ['../../../../apps/stage-pocket/src/pages/index.voice.ts', 'authority'],
    ['../../../../apps/stage-pocket/src/pages/index.vue', 'authority'],
    ['../../../../apps/stage-tamagotchi/src/renderer/App.vue', 'read-only-downstream'],
    ['../../../../apps/stage-tamagotchi/src/renderer/components/InteractiveArea.vue', 'normalize-before-use'],
    ['../../../../apps/stage-tamagotchi/src/renderer/pages/index.desktop.ts', 'authority'],
    ['../../../../apps/stage-tamagotchi/src/renderer/pages/index.vue', 'authority'],
    ['../../../../apps/stage-web/src/pages/devtools/performance-playground.chat.ts', 'authority'],
    ['../../../../apps/stage-web/src/pages/devtools/performance-playground.vue', 'authority'],
    ['../../../../apps/stage-web/src/pages/index.voice.ts', 'authority'],
    ['../../../../apps/stage-web/src/pages/index.vue', 'authority'],
    ['../../../../packages/stage-layouts/src/components/Layouts/MobileInteractiveArea.vue', 'shared-send-authority'],
    ['../../../../packages/stage-layouts/src/components/Widgets/ChatArea.vue', 'shared-send-authority'],
    ['../../../../packages/stage-ui/src/components/scenes/stage-quick-reply-composer.vue', 'shared-send-authority'],
    ['./alicization-epoch1.ts', 'read-only-downstream'],
    ['./chat.ts', 'authority'],
    ['./chat/text-composer-store.ts', 'authority'],
    ['./markdown-stress.ts', 'authority'],
    ['./mods/api/context-bridge.ts', 'authority'],
  ]),
  ...buildEntrypointOwnershipEntries('provider-consumer', [
    ['memory-os/provider-planning.ts', 'typed-consumer'],
    ['runtime-execution-delivery.ts', 'typed-consumer'],
    ['runtime-main-gateway-one-shot.ts', 'authority'],
    ['runtime-mind-state.ts', 'typed-consumer'],
    ['runtime.ts', 'dispatch-owner'],
  ]),
  ...buildEntrypointOwnershipEntries('autonomous-dialogue', [
    ['runtime-delivery-reminders.ts', 'normalize-before-use'],
    ['runtime-subconscious-tick.ts', 'normalize-before-use'],
    ['runtime.ts', 'authority'],
  ]),
  ...buildEntrypointOwnershipEntries('execution-preflight', [
    ['agent-runtime.ts', 'execution-briefing-authority'],
    ['execution-runtime-context.ts', 'runtime-context-authority'],
    ['executor-adapters/claude-code.ts', 'blocked-dispatch-safety-gate'],
    ['executor-adapters/cli.ts', 'blocked-dispatch-safety-gate'],
    ['executor-adapters/codex.ts', 'blocked-dispatch-safety-gate'],
    ['executor-adapters/local-visual.ts', 'blocked-dispatch-safety-gate'],
    ['executor-adapters/openclaw.ts', 'blocked-dispatch-safety-gate'],
    ['executor-runtime.ts', 'resume-dispatch-bridge'],
    ['main-chat-session-runtime.ts', 'session-bound-execution-bridge'],
    ['runtime-subconscious-tick.ts', 'subconscious-autonomy-execution-bridge'],
    ['runtime.ts', 'runtime-dispatch-execution-bridge'],
    ['task-thread-dispatcher.ts', 'pre-dispatch-persistence'],
  ]),
  ...buildEntrypointOwnershipEntries('execution-dispatch', [
    ['autonomy-actuation.ts', 'dispatch-owner'],
    ['executor-runtime.ts', 'dispatch-owner'],
    ['runtime-invoke-handlers-task.ts', 'dispatch-owner'],
    ['runtime-subconscious-tick.ts', 'dispatch-owner'],
    ['runtime.ts', 'dispatch-owner'],
    ['task-thread-orchestrator.ts', 'dispatch-owner'],
  ]),
  ...buildEntrypointOwnershipEntries('recovery-reentry', [
    ['main-chat-start-result.ts', 'accepted-start-settlement'],
    ['runtime.ts', 'accepted-start-owner'],
    ['main-chat-timeout-fallback.ts', 'timeout-fallback-reconstruction'],
    ['main-chat-run-lifecycle.ts', 'timeout-recovery-finish'],
    ['main-chat-background-run.ts', 'background-recovery-driver'],
  ]),
  ...buildEntrypointOwnershipEntries('execution-follow-up-continuity', [
    ['execution-callback-runtime.ts', 'callback-runtime-authority'],
    ['current-conscious-frame.ts', 'callback-conscious-frame-surface'],
    ['runtime-execution-delivery.ts', 'callback-delivery-surface'],
    ['execution-delivery-surface.ts', 'callback-payoff-surface'],
    ['main-chat-execution-surface.ts', 'callback-capability-project-briefing'],
    ['main-chat-execution-reply-obligation.ts', 'follow-up-obligation-authority'],
    ['response-surface-contract.ts', 'follow-up-response-contract-surface'],
    ['memory-ledger-runtime.ts', 'ledger-follow-up-recall'],
    ['main-chat-session-runtime.ts', 'session-follow-up-assembly'],
    ['execution-interaction-learning.ts', 'afterglow-learning-authority'],
    ['runtime-delivery-reminders.ts', 'callback-persistence-surface'],
  ]),
] as const satisfies readonly AlicizationProjectEntrypointGovernanceEntry[]

for (const entry of alicizationProjectEntrypointGovernanceRegistry)
  assertAlicizationProjectEntrypointGovernanceModeBelongsToDomain(entry)

export function resolveAlicizationProjectEntrypointGovernanceRegistry(): readonly AlicizationProjectEntrypointGovernanceEntry[] {
  return alicizationProjectEntrypointGovernanceRegistry
}

export function resolveAlicizationProjectEntrypointGovernanceEntries(): string[] {
  return resolveAlicizationProjectEntrypointGovernanceRegistry().map(entry => entry.relativePath)
}

export function resolveAlicizationProjectEntrypointGovernedFiles(): string[] {
  return resolveAlicizationProjectEntrypointGovernanceRegistry()
    .map(entry => entry.relativePath)
    .slice()
    .sort()
}

export function resolveAlicizationProjectAwarenessTopLevelCompletenessGuardFamilies(): AlicizationProjectAwarenessTopLevelCompletenessGuardFamily[] {
  return [
    'chat-start',
    'cross-surface-dialogue-entry',
    'return-side-project-awareness',
    'recovery-reentry',
    'provider-consumer',
    'autonomous-dialogue',
    'execution-preflight',
    'execution-dispatch',
    'execution-follow-up-continuity',
    'runtime-dialogue-normalization',
  ].map(id => ({
    id,
    responsibility: ownershipAuditResponsibility,
  })) as AlicizationProjectAwarenessTopLevelCompletenessGuardFamily[]
}

export function resolveAlicizationPreDialogueTransportEntrypointGovernanceMirrors(): readonly AlicizationPreDialogueTransportEntrypointGovernanceMirror[] {
  return [
    {
      transportRelativePath: '../../../renderer/App.vue',
      chatEntryRelativePath: '../../../../apps/stage-tamagotchi/src/renderer/App.vue',
      responsibility: ownershipAuditResponsibility,
    },
  ]
}

export function resolveAlicizationProjectRouteAuthorityAllowedModes(
  domain: AlicizationProjectRouteAuthorityEntry['domain'],
) {
  if (domain === 'pre-dialogue-transport')
    return ['identity-construction', 'transport-sanitization', 'bridge-forwarding'] as const
  if (domain === 'return-side-project-awareness') {
    return [
      'renderer-observation-bridge',
      'renderer-meta-bridge',
      'structured-normalization',
      'chat-stream-ingest',
      'session-sanitization',
      'browser-observation-persistence',
      'project-state-observation-reducer',
      'inspector-fallback-rebuild',
    ] as const
  }
  if (domain === 'runtime-dialogue-normalization') {
    return [
      'normalization-authority',
      'persistence-emission-normalize-before-deliver',
      'replay-normalize-before-deliver',
      'proactive-normalize-before-persist',
    ] as const
  }
  return ['persistence-authority', 'renderer-dialogue-entry', 'proactive-turn-entry', 'reminder-turn-entry'] as const
}

export function assertAlicizationProjectRouteAuthorityModeBelongsToDomain(
  entry: Pick<AlicizationProjectRouteAuthorityEntry, 'domain' | 'mode' | 'relativePath'>,
) {
  const allowedModes = resolveAlicizationProjectRouteAuthorityAllowedModes(entry.domain)
  if (allowedModes.includes(entry.mode as never))
    return

  throw new Error(`Unexpected Alicization route authority mode for ${entry.domain} at ${entry.relativePath}: ${entry.mode}`)
}

function buildRouteOwnershipEntries(
  domain: AlicizationProjectRouteAuthorityEntry['domain'],
  entries: readonly (readonly [relativePath: string, mode: AlicizationProjectRouteAuthorityEntry['mode']])[],
) {
  return entries.map(([relativePath, mode]) => ({
    domain,
    mode,
    relativePath,
    responsibility: ownershipAuditResponsibility,
  })) as AlicizationProjectRouteAuthorityEntry[]
}

const alicizationProjectRouteAuthorityRegistry = [
  ...buildRouteOwnershipEntries('pre-dialogue-transport', [
    ['../../../renderer/App.vue', 'transport-sanitization'],
  ]),
  ...buildRouteOwnershipEntries('return-side-project-awareness', [
    ['../../../renderer/App.vue', 'renderer-observation-bridge'],
    ['../../../renderer/alicization-chat-stream-bridge.ts', 'renderer-meta-bridge'],
    ['../../../../../../packages/stage-ui/src/composables/alicization-structured-output.ts', 'structured-normalization'],
    ['../../../../../../packages/stage-ui/src/stores/chat.ts', 'chat-stream-ingest'],
    ['../../../../../../packages/stage-ui/src/stores/chat/session-store.ts', 'session-sanitization'],
    ['../../../../../../packages/stage-ui/src/stores/alicization-browser-bridge.ts', 'browser-observation-persistence'],
    ['../../../../../../packages/stage-ui/src/stores/project-state-observation.ts', 'project-state-observation-reducer'],
    ['../../../../../../packages/stage-ui/src/stores/alicization-self-evolution-inspector.ts', 'inspector-fallback-rebuild'],
  ]),
  ...buildRouteOwnershipEntries('runtime-dialogue-normalization', [
    ['runtime-governance.ts', 'normalization-authority'],
    ['runtime-subconscious-tick.ts', 'proactive-normalize-before-persist'],
    ['runtime.ts', 'persistence-emission-normalize-before-deliver'],
  ]),
  ...buildRouteOwnershipEntries('runtime-turn-persistence', [
    ['runtime-delivery-reminders.ts', 'reminder-turn-entry'],
    ['runtime-invoke-handlers-dialogue.ts', 'renderer-dialogue-entry'],
    ['runtime-subconscious-tick.ts', 'proactive-turn-entry'],
    ['runtime.ts', 'persistence-authority'],
  ]),
] as const satisfies readonly AlicizationProjectRouteAuthorityEntry[]

for (const entry of alicizationProjectRouteAuthorityRegistry)
  assertAlicizationProjectRouteAuthorityModeBelongsToDomain(entry)

export function resolveAlicizationProjectRouteAuthorityRegistry(): readonly AlicizationProjectRouteAuthorityEntry[] {
  return alicizationProjectRouteAuthorityRegistry
}

export function resolveAlicizationProjectRouteAuthorityAllowedOverlaps(): readonly AlicizationProjectRouteAuthorityAllowedOverlap[] {
  return [
    {
      relativePath: '../../../renderer/App.vue',
      domains: ['pre-dialogue-transport', 'return-side-project-awareness'],
      reason: 'One renderer boundary handles outbound transport sanitation and inbound observation storage.',
    },
    {
      relativePath: 'runtime-subconscious-tick.ts',
      domains: ['runtime-dialogue-normalization', 'runtime-turn-persistence'],
      reason: 'One runtime boundary normalizes generated payloads before guarded persistence.',
    },
  ]
}

export function resolveAlicizationProjectRouteAuthorityFiles(): string[] {
  return [...new Set(resolveAlicizationProjectRouteAuthorityRegistry().map(entry => entry.relativePath))]
    .slice()
    .sort()
}

export function resolveAlicizationProjectStateCoverage(): AlicizationProjectStateCoverageEntry[] {
  return [
    {
      id: 'working-memory-owner',
      area: 'memory',
      status: 'verified',
      responsibility: 'WorkingMemory owns short-term dialogue memory.',
      proof: 'life-core/working-memory-owner-context.test.ts',
    },
    {
      id: 'long-term-memory-recall-owner',
      area: 'memory',
      status: 'verified',
      responsibility: 'LongTermMemoryRecall owns long-term retrieval.',
      proof: 'long-term-memory-recall.test.ts',
    },
    {
      id: 'provider-failure-surface',
      area: 'reply',
      status: 'verified',
      responsibility: 'Timeout, Provider, tool, and structured-output failures remain explicit.',
      proof: 'main-chat-timeout-fallback.test.ts + alicization-chat-failure-surface.test.ts',
    },
    {
      id: 'ownership-registry-isolation',
      area: 'runtime',
      status: 'verified',
      responsibility: 'Architecture ownership registries do not author Provider prompts or visible replies.',
      proof: 'project-state-brief.test.ts + route-authority-boundary-registry-audit.test.ts',
    },
  ]
}

export function buildAlicizationProjectStateSystemBlock(_input?: {
  brief?: AlicizationProjectStateBrief | null
}) {
  return ''
}

export function buildAlicizationProviderFacingProjectStateSystemBlock(_input?: {
  brief?: AlicizationProjectStateBrief | null
}) {
  return ''
}

export function buildAlicizationProjectStateExtraSystemBlocks(_input?: {
  brief?: AlicizationProjectStateBrief | null
}) {
  return []
}

export function buildAlicizationProviderFacingProjectStateExtraSystemBlocks(_input?: {
  brief?: AlicizationProjectStateBrief | null
}) {
  return []
}

export function buildAlicizationProjectStateClosureDashboard(_input?: unknown) {
  return ''
}

export function buildAlicizationProviderFacingProjectStateClosureDashboard(_input?: unknown) {
  return ''
}
