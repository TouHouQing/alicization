import type { AlicizationProjectStateDirectGatewayAuditTarget } from './project-state-brief'

export type AlicizationProjectStateGatewayInjectionMode
  = 'extra-system-block-local'
    | 'extra-system-block-helper'
    | 'extra-system-block-self-brief'
    | 'system-wrapper'
    | 'system-wrapper-self-brief'
    | 'system-concat'
    | 'one-shot-unified-runtime'
    | 'missing'

// NOTICE: When adding a new main-gateway source, update this union together with:
// - resolveAlicizationProjectStateAuditFamilyForMainGatewaySource(...)
// - alicizationProjectStateDirectGatewayAuditTargets / coverage truth in project-state-brief.ts
// - project-state-gateway-audit.test.ts and project-state-gateway-regression.test.ts
// New generation sources must not bypass project-state + closure-dashboard coverage.
export type AlicizationMainGatewaySource
  = 'execution-callback'
    | 'reminder'
    | 'proactive'
    | 'dream'
    | 'screen-semantic'
    | 'scene-appraisal'
    | 'subjective-inference'
    | 'counterfactual-deliberation'
    | 'dialogue-turn-semantics'

export interface AlicizationMainGatewayBaseGenerateTextInput<
  TSource extends AlicizationMainGatewaySource = AlicizationMainGatewaySource,
  TUser = unknown,
> {
  system: string
  user: TUser
  timeoutMs?: number
  source: TSource
}

export interface AlicizationMainGatewayGenerateTextProviderOptions<
  TSource extends AlicizationMainGatewaySource = AlicizationMainGatewaySource,
  TUser = unknown,
> extends AlicizationMainGatewayBaseGenerateTextInput<TSource, TUser> {
  extraSystemBlocks?: readonly string[]
}

export interface AlicizationMainGatewayGenerateTextProvider<
  TSource extends AlicizationMainGatewaySource = AlicizationMainGatewaySource,
  TUser = unknown,
  TExtra extends object = Record<never, never>,
> {
  (input: AlicizationMainGatewayGenerateTextProviderOptions<TSource, TUser> & TExtra): Promise<string | null>
}

export function resolveAlicizationProjectStateAuditFamilyForMainGatewaySource(
  source: AlicizationMainGatewaySource | null | undefined,
): AlicizationProjectStateDirectGatewayAuditTarget | null {
  if (source === 'dream' || source === 'reminder' || source === 'proactive')
    return 'runtime.ts:dream-reminder-proactive-reforge'
  if (source === 'counterfactual-deliberation')
    return 'memory-os/provider-planning.ts:recollection-and-deliberation'
  if (source === 'subjective-inference' || source === 'dialogue-turn-semantics')
    return 'runtime-mind-state.ts:dialogue-semantics-and-subjective-inference'
  if (source === 'execution-callback')
    return 'runtime-execution-delivery.ts:execution-callback'
  if (source === 'screen-semantic' || source === 'scene-appraisal')
    return 'runtime-main-gateway-one-shot.ts:screen-semantic-and-scene-appraisal'
  return null
}

export function isAlicizationProjectStateAuditedMainGatewaySource(
  source: AlicizationMainGatewaySource | null | undefined,
) {
  return Boolean(resolveAlicizationProjectStateAuditFamilyForMainGatewaySource(source))
}

export function isAlicizationProjectStateUnauditedMainGatewaySource(
  source: AlicizationMainGatewaySource | null | undefined,
) {
  return Boolean(source) && !isAlicizationProjectStateAuditedMainGatewaySource(source)
}
