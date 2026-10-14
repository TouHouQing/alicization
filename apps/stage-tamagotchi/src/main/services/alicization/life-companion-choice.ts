import type { LifeFactVersion } from '../../../shared/life-contracts'
import type { LifeConversationPreference } from './life-conversation-preferences'

/**
 * Relationship choices use live, versioned host preferences. Correction or
 * forgetting removes their effect without a separate personality cache.
 */
export function companionChoicePolicy(facts: LifeFactVersion[], cardId: string, now: number, foreground?: unknown, currentPreferences: LifeConversationPreference[] = []) {
  const evidence = facts.filter(fact => fact.subject.kind === 'entity' && fact.subject.id === `host:${cardId}` && fact.lifecycle === 'active' && fact.recordedTo === null && ['reported', 'observed'].includes(fact.provenance) && (fact.validFrom === null || fact.validFrom <= now) && (fact.validTo === null || fact.validTo > now) && /communication|outreach|interaction|preference|prefers|沟通|互动|偏好/iu.test(fact.predicate))
  const process = foreground && typeof foreground === 'object' ? (foreground as { processName?: unknown }).processName : null
  const working = typeof process === 'string' && /^(?:code|code-insiders|devenv|idea64|pycharm64|rider64|webstorm64)(?:\.exe)?$/iu.test(process)
  const quiet = evidence.find(fact => typeof fact.value === 'string' && (/(?:不要|不希望|不喜欢)[\s\S]{0,12}(?:主动打扰|主动找我|主动发消息)|do not contact me proactively/iu.test(fact.value) && !/时|时候|while|when/iu.test(fact.value) || working && /(?:写代码|编程|coding)[\s\S]{0,20}(?:不要打扰|安静|quiet|do not interrupt)/iu.test(fact.value)))
  const askLess = evidence.find(fact => typeof fact.value === 'string' && /(?:不用|别|不要|不喜欢|不希望)[\s\S]{0,12}(?:每次|每句|总是)[\s\S]{0,12}(?:问|追问)|fewer questions|do not always ask/iu.test(fact.value))
  const currentAskLess = currentPreferences.find(item => item.kind === 'fewer-questions')
  const currentPlans = currentPreferences.find(item => item.kind === 'no-unrequested-plans')
  const references = [quiet, currentAskLess ? null : askLess].flatMap(fact => fact ? [{ cardId, kind: 'memory_facts', id: fact.factId, version: String(fact.version) }] : [])
  return { holdOrdinaryOutreach: Boolean(quiet), askLess: currentAskLess?.value ?? Boolean(askLess), avoidUnrequestedPlans: currentPlans?.value ?? false, permitSilentPersonalActivity: true, sourceEvidence: [...references, ...currentPreferences.flatMap(item => item.sourceEvidence)], reason: quiet ? 'remembered-host-space' : currentPreferences.length ? 'current-conversation-rhythm' : askLess ? 'remembered-conversation-rhythm' : 'ordinary-companionship' }
}
