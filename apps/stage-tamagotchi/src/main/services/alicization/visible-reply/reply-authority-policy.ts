export type AlicizationReplyAuthorityLane
  = | 'greeting'
    | 'identity'
    | 'capability'
    | 'utility-time'
    | 'utility-date'
    | 'presence-critique'
    | 'present-state'
    | 'repair-clarify'
    | 'follow-up'
    | 'dialogue'

export type AlicizationReplyAuthorityStrategy
  = | 'infra-fallback-only'
    | 'compact-one-shot'

export interface AlicizationReplyAuthorityDecisionLike {
  lane: AlicizationReplyAuthorityLane
  strategy: AlicizationReplyAuthorityStrategy
  reasonCodes?: readonly string[]
}

export function isAlicizationInfraFallbackOnlyDecision(
  decision: Pick<AlicizationReplyAuthorityDecisionLike, 'strategy'>,
) {
  return decision.strategy === 'infra-fallback-only'
}

export function allowsAlicizationDeterministicVisibleReply(
  decision: Pick<AlicizationReplyAuthorityDecisionLike, 'lane' | 'strategy'>,
) {
  if (!isAlicizationInfraFallbackOnlyDecision(decision))
    return false
  return decision.lane === 'utility-time'
    || decision.lane === 'utility-date'
}

export function shouldAlicizationReplyStayProviderAuthored(
  decision: AlicizationReplyAuthorityDecisionLike,
) {
  if (isAlicizationInfraFallbackOnlyDecision(decision))
    return false

  const reasonCodes = decision.reasonCodes ?? []
  if (
    decision.lane === 'follow-up'
    && (
      reasonCodes.includes('execution-carry-llm-authored')
      || reasonCodes.includes('prepared-execution-ledger')
      || reasonCodes.includes('memory-recollection-llm-authored')
    )
  ) {
    return true
  }

  return decision.lane !== 'greeting'
    && decision.lane !== 'utility-time'
    && decision.lane !== 'utility-date'
}
