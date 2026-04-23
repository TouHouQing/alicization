import type {
  AlicizationHostPersonModelSnapshot,
  AlicizationProactiveStyle,
} from '../../../shared/eventa'

function sanitizeText(raw: unknown, maxChars = 180) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

export function inferHostSocialContextsFromText(text: string, extraContexts: string[] = []) {
  const normalized = text.toLowerCase()
  const contexts = ['general', ...extraContexts]
  if (/runtime|debug|coding|code|patch|fix|verify|test|cursor|terminal|cli|diff/iu.test(normalized))
    contexts.push('focused-work', 'execution')
  if (/late|night|fatigue|rest|sleep|tired|熬夜|疲惫|休息/iu.test(normalized))
    contexts.push('late-night')
  if (/relationship|closeness|tone|回应|态度|靠近|关系/iu.test(normalized))
    contexts.push('open-window')
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
    || /(space|lighter|room|quiet|bounded|leave room|留白|空间|轻|安静|back off)/iu.test(`${preferenceText} ${sensitivityText} ${burdenText}`)
  const restrained = cautious || /(repair|lighter|space|quiet|low-pressure|给空间|轻一点|先退一点)/iu.test(`${preferenceText} ${repairTriggerText}`)
  const preferredProactiveStyle = (() => {
    if (input.contexts.includes('late-night') && /(care|rest|缓|休息|轻一点|low-pressure|gentle)/iu.test(`${preferenceText} ${burdenText}`))
      return 'gentle-care' as const
    if (input.contexts.includes('focused-work') && cautious)
      return 'light-nudge' as const
    if (input.contexts.includes('focused-work') && restrained)
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
}) {
  const guidance = buildHostSocialGuidance({
    hostPersonModel: input.hostPersonModel ?? null,
    contexts: input.contexts,
  })

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
