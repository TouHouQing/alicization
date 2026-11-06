import type { LifeStateView } from '../../../../shared/life-contracts'
import type { PersonaContext, PersonaDevelopmentProjection, PersonaEffects } from '../../../../shared/persona-development-contracts'

import { readPersonaDevelopment, zeroPersonaEffects } from './schema'

export function personaContextForText(text: string): PersonaContext {
  if (/纠正|误会|误解|说错|不是这样|没听懂|sorry|misunderstand/iu.test(text))
    return 'repair'
  if (/睡|累|疲惫|休息|sleep|tired/iu.test(text))
    return 'rest'
  if (/代码|编译|开发|调试|测试|code|coding|debug|compile/iu.test(text))
    return 'focused-work'
  if (/执行|文件|整理|打开|运行|任务|execute|file|task/iu.test(text))
    return 'execution'
  return 'companionship'
}
export function projectPersonaDevelopment(view: LifeStateView, context: PersonaContext): PersonaDevelopmentProjection {
  return projectPersonaDevelopmentValues(view.values, context)
}
export function projectPersonaDevelopmentValues(values: Record<string, string>, context: PersonaContext, includeTrials = true): PersonaDevelopmentProjection {
  const state = readPersonaDevelopment(values)
  const soulHash = values['life:soul-active'] ? JSON.parse(values['life:soul-active']).contentHash as string : null
  const effects = zeroPersonaEffects()
  const mature = state.facets.filter(facet => facet.status === 'mature' && facet.adoptedSoulHash === soulHash && facet.context === context).slice(0, 4)
  // One changing habit per turn keeps real feedback attributable.
  const trial = state.paused || !includeTrials ? [] : state.facets.filter(facet => ['supported', 'trial'].includes(facet.status) && facet.context === context).slice(0, 1)
  const facets = [...mature, ...trial]
  for (const facet of facets) {
    const limit = facet.status === 'mature' ? 0.15 : 0.03
    for (const key of Object.keys(effects) as Array<keyof PersonaEffects>)
      effects[key] = Math.max(-0.2, Math.min(0.2, effects[key] + Math.max(-limit, Math.min(limit, facet.effects[key]))))
  }
  return { format: 'persona-behavior-projection-v1', soulHash, facets: facets.map(({ id, version, label, context, status, exceptions }) => ({ id, version, label, context, status, exceptions })), effects }
}
