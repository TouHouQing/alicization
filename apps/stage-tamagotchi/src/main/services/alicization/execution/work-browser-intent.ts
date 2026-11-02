import type { ExecutionCriterion, WorkStep } from '../../../../shared/execution-contracts'

/** A local-server reference names one declared origin, never an observed action. */
export function matchesDeclaredBrowserWorkIntent(
  text: string,
  steps: readonly Pick<WorkStep, 'id' | 'capabilityId' | 'input'>[],
  criteria: readonly ExecutionCriterion[],
) {
  const intent = text.match(/^(?:只|仅)?(?:访问|打开|进入)(?:本机|本地)(?:测试)?(?:服务器|服务|站点|网页|页面)((?:并且?|然后)(?:尝试)?下载(?:指定的?(?:文件|报告)|文件|报告)?)?$/u)
  if (!intent)
    return false
  const navigation = steps.filter(step => step.capabilityId === 'tool.browser_navigate')
  if (!navigation.length)
    return false
  const origins = new Set<string>()
  for (const step of navigation) {
    if (typeof step.input.url !== 'string')
      return false
    try {
      const target = new URL(step.input.url)
      if (!['http:', 'https:'].includes(target.protocol) || target.username || target.password || !['localhost', '127.0.0.1', '[::1]'].includes(target.hostname))
        return false
      origins.add(target.origin)
    }
    catch { return false }
  }
  if (origins.size !== 1)
    return false
  return !intent[1] || criteria.some((criterion) => {
    const predicate = criterion.predicate
    return predicate.kind === 'browser-download' && steps.some(step => step.id === predicate.stepId && step.capabilityId === 'tool.browser_click_element')
  })
}
