export type AlicizationMainGatewayAuditFamily
  = 'dialogue-grounding'
    | 'background-life'
    | 'execution-callback'
    | 'memory-planning'
    | 'mind-state'
    | 'screen-understanding'

// Source tags select runtime routing, timeout, and audit behavior only.
export type AlicizationMainGatewaySource
  = 'personal-activity'
    | 'persona-evaluation'
    | 'reply-grounding'
    | 'execution-callback'
    | 'reminder'
    | 'proactive'
    | 'dream'
    | 'screen-semantic'
    | 'scene-appraisal'
    | 'subjective-inference'
    | 'counterfactual-deliberation'
    | 'memory-quality-trial'

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
  if (source === 'reply-grounding')
    return 'dialogue-grounding'
  if (source === 'persona-evaluation' || source === 'personal-activity' || source === 'dream' || source === 'reminder' || source === 'proactive')
    return 'background-life'
  if (source === 'counterfactual-deliberation' || source === 'memory-quality-trial')
    return 'memory-planning'
  if (source === 'subjective-inference')
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
