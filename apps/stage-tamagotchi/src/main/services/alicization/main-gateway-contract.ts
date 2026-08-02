export type AlicizationMainGatewayAuditFamily
  = 'background-life'
    | 'execution-callback'
    | 'memory-planning'
    | 'mind-state'
    | 'screen-understanding'

// Source tags select runtime routing, timeout, and audit behavior only.
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

export function resolveAlicizationMainGatewayAuditFamilyForSource(
  source: string | null | undefined,
): AlicizationMainGatewayAuditFamily | null {
  if (source === 'dream' || source === 'reminder' || source === 'proactive')
    return 'background-life'
  if (source === 'counterfactual-deliberation')
    return 'memory-planning'
  if (source === 'subjective-inference' || source === 'dialogue-turn-semantics')
    return 'mind-state'
  if (source === 'execution-callback')
    return 'execution-callback'
  if (source === 'screen-semantic' || source === 'scene-appraisal')
    return 'screen-understanding'
  return null
}

export function isAlicizationRegisteredMainGatewaySource(
  source: string | null | undefined,
) {
  return Boolean(resolveAlicizationMainGatewayAuditFamilyForSource(source))
}

export function isAlicizationUnregisteredMainGatewaySource(
  source: string | null | undefined,
) {
  return Boolean(source) && !isAlicizationRegisteredMainGatewaySource(source)
}
