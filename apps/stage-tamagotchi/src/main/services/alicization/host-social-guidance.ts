import type {
  AlicizationHostPersonModelSnapshot,
  AlicizationLearningExecutionStateSnapshot,
  AlicizationProactiveScenario,
  AlicizationProactiveStyle,
  AlicizationSelfEvolutionKernelSnapshot,
  AlicizationVisualSceneSnapshot,
} from '../../../shared/eventa'

function sanitizeText(raw: unknown, maxChars = 180) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

export function buildHostSocialContexts(input: {
  scenario?: AlicizationProactiveScenario | null
  workloadKind?: AlicizationVisualSceneSnapshot['workloadKind'] | null
  extraContexts?: string[]
}) {
  const contexts = ['general', ...(input.extraContexts ?? [])]
  if (
    input.scenario === 'coding'
    || input.workloadKind === 'coding'
    || input.workloadKind === 'terminal'
  ) {
    contexts.push('focused-work')
  }
  if (input.scenario === 'late-night-care')
    contexts.push('late-night')
  return [...new Set(contexts)]
}

export function buildHostSocialGuidance(input: {
  hostPersonModel?: AlicizationHostPersonModelSnapshot | null
  contexts: string[]
}) {
  const hostPersonModel = input.hostPersonModel ?? null
  if (!hostPersonModel) {
    return {
      preferenceText: '',
      sensitivityText: '',
      repairTriggerText: '',
      burdenText: '',
      trustRationale: '',
      cautious: false,
      restrained: false,
      preferredProactiveStyle: null as AlicizationProactiveStyle | null,
    }
  }

  const preference = hostPersonModel.preferredClosenessByContext
    .filter(item => input.contexts.includes(item.context))
    .sort((left, right) => right.confidence - left.confidence)[0] ?? null
  const preferenceText = sanitizeText(preference?.preference ?? '', 180)
  const sensitivityText = sanitizeText(hostPersonModel.sensitivities[0] ?? '', 180)
  const repairTriggerText = sanitizeText(hostPersonModel.repairTriggers[0] ?? '', 180)
  const burdenText = sanitizeText(hostPersonModel.recurrentBurdens[0] ?? '', 180)
  const trustRationale = sanitizeText(hostPersonModel.trustLadder.rationale, 180)
  const cautious = hostPersonModel.trustLadder.stage === 'guarded'
    || hostPersonModel.trustLadder.stage === 'cautious-open'
  const hasRepairHistory = hostPersonModel.repairTriggers.length > 0
  const hasRecurringBurden = hostPersonModel.recurrentBurdens.length > 0
  const restrained = cautious || hasRepairHistory
  const preferredProactiveStyle = (() => {
    if (input.contexts.includes('late-night') && (cautious || hasRecurringBurden))
      return 'gentle-care' as const
    if (input.contexts.includes('focused-work') && cautious)
      return 'light-nudge' as const
    if (input.contexts.includes('focused-work') && hasRepairHistory)
      return 'silent-observe' as const
    return null
  })()

  return {
    preferenceText,
    sensitivityText,
    repairTriggerText,
    burdenText,
    trustRationale,
    cautious,
    restrained,
    preferredProactiveStyle,
  }
}

export function adjustProactiveStyleFromHostPersonModel(input: {
  currentStyle: AlicizationProactiveStyle
  hostPersonModel?: AlicizationHostPersonModelSnapshot | null
  contexts: string[]
  selfEvolution?: AlicizationSelfEvolutionKernelSnapshot | null
  learningExecutionState?: AlicizationLearningExecutionStateSnapshot | null
}) {
  const guidance = buildHostSocialGuidance({
    hostPersonModel: input.hostPersonModel ?? null,
    contexts: input.contexts,
  })
  const learningAction = input.learningExecutionState?.nextLearningAction
    ?? input.selfEvolution?.nextLearningAction
    ?? null
  const verifyFirstRevalidation = Boolean(
    learningAction === 'verify'
    && (
      (input.selfEvolution?.contradictionPressure ?? 0) >= 0.34
      || input.selfEvolution?.shouldVerify === true
    ),
  )

  if (verifyFirstRevalidation && input.currentStyle !== 'firm-warning')
    return 'silent-observe' as const

  if (guidance.preferredProactiveStyle === 'gentle-care')
    return 'gentle-care' as const
  if (guidance.preferredProactiveStyle === 'silent-observe')
    return input.currentStyle === 'firm-warning' ? input.currentStyle : 'silent-observe' as const
  if (guidance.preferredProactiveStyle === 'light-nudge' && input.currentStyle === 'gentle-care')
    return 'light-nudge' as const
  if (guidance.restrained && input.currentStyle === 'gentle-care')
    return 'light-nudge' as const
  return input.currentStyle
}

export function adjustProactiveReplyFromLongHorizonLearning(input: {
  currentReply: string
  selfEvolution?: AlicizationSelfEvolutionKernelSnapshot | null
  learningExecutionState?: AlicizationLearningExecutionStateSnapshot | null
}) {
  const currentReply = sanitizeText(input.currentReply, 220)
  if (!currentReply)
    return ''

  return currentReply
}
