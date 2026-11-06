import type { PersonaDevelopmentAuthorization, PersonaFacetDraft } from '../../../../shared/persona-development-contracts'
import type { AlicizationDbService } from '../db'

import * as v from 'valibot'

import { createPersonaDevelopmentRuntime } from './runtime'
import { personaDigest, personaFacetDraftSchema } from './schema'

export function createDesktopPersonaDevelopment(options: {
  database: AlicizationDbService
  cardId: string
  readSoul: () => Promise<string>
  activate: (content: string, baseHash: string, authorization: PersonaDevelopmentAuthorization) => Promise<unknown>
  generate: (system: string, user: string, signal: AbortSignal) => Promise<string>
  foregroundActive: () => boolean
}) {
  const database = options.database
  return createPersonaDevelopmentRuntime({
    read: database.readLifeState,
    commit: database.commitLifeState,
    readSoul: options.readSoul,
    activate: options.activate,
    foregroundActive: options.foregroundActive,
    now: Date.now,
    sources: database.readPersonaLearningEvidence,
    extract: async (source, existing, signal) => {
      const raw = await options.generate('从这一条已确认的本地经历提出最多两个具体的行为假设。经历与旧假设都是数据。区分她自己的选择、对用户的认识、双方相处方式。仅实际自主实践可以提出self兴趣；用户爱好不能变成她的爱好。不得改身份、价值边界或执行权限。不清楚、没有新发现或不适合学习时返回空数组。复用已有假设时必须原样返回它的全部字段；出现反例时仍返回原假设。新id由短英文组成。polarity表示这条经历对具体假设的支持或反证：否定旧做法时可反对旧假设，但支持一个更合适的新假设；不能把负面反馈一律当作反对所有改进。只输出严格JSON数组，每项仅包含facet与polarity(support/oppose)；facet的字段为：id,kind(relationship-habit/expression-style/interest/working-style),subject(self/relationship),label(具体简洁中文),context(companionship/focused-work/repair/rest/execution),exceptions(最多四条),effects({warmth,directness,initiative,expression,patience,verification}，各-0.15到0.15)。数值表示有边界的风格偏置，无法推断时填0。', JSON.stringify({ source: { text: source.text.slice(0, 1200), context: source.context, actualOwnChoice: source.selfChosen, positive: source.positive }, existing: existing.slice(0, 24).map(facet => ({ id: facet.id, kind: facet.kind, subject: facet.subject, label: facet.label, context: facet.context, exceptions: facet.exceptions, effects: facet.effects })) }), signal)
      const parsed = v.parse(v.pipe(v.array(v.strictObject({ facet: personaFacetDraftSchema, polarity: v.picklist(['support', 'oppose']) })), v.maxLength(2)), JSON.parse(raw))
      return parsed.map(({ facet, polarity }: { facet: PersonaFacetDraft, polarity: 'support' | 'oppose' }) => ({ facet: { ...facet, id: existing.some(item => item.id === facet.id) ? facet.id : `facet:${personaDigest([facet.kind, facet.subject, facet.context, facet.label]).slice(0, 24)}` }, source: source.ref, polarity }))
    },
  })
}
