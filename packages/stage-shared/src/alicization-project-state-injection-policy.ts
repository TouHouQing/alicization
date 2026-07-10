export type AlicizationProjectStateContextOrigin = 'ui-user' | 'tool-output' | 'context-recall' | 'system'

const explicitProjectStateProviderIntentPattern = /project-state|project state|alicization.*(?:项目状态|project[- ]?state|记忆|人格|建设|进展|进度|做到哪一?步|还差(?:什么|哪|哪些)|还缺(?:什么|哪|哪些))|(?:项目状态|project[- ]?state|记忆|人格|建设|进展|进度|做到哪一?步|还差(?:什么|哪|哪些)|还缺(?:什么|哪|哪些)).*alicization|项目状态|短期记忆|长期记忆|记忆中心|记忆治理|记忆.*(?:闭环|人格|召回|治理|搜索|筛选|分页)|人格.*(?:记忆|自我核心|统一|开发)|自我核心.*(?:统一|开发|人格)|(?:本地)?数字生命.*(?:还差(?:什么|哪|哪些)|还缺(?:什么|哪|哪些)|做到哪一?步|进度|进展)|memory workbench|memory\s+workbench|embedding|向量|人格候选|健康指标|review|策略|持久化/iu
const ambiguousProjectStateContinuityTermPattern = /具身(?:连续|收住)?|身体线|有声身体线|身体\s*continuity|body line|body continuity|audible[- ]body|embodiment closure|renderer.*rejoin|face[- ]?motion|lipsync|workingmemory|longtermmemory/iu
const projectStateProgressOrDevelopmentIntentPattern = /做到哪一?步|还差(?:什么|哪|哪些)|还缺(?:什么|哪|哪些)|缺什么|还有什么|闭环|没闭环|未闭环|开发|继续(?:开发|顺着|沿着|把|推进|接|完成|清理)|接起来|接上|完成|完成了吗|好了没|做好|分页|搜索|筛选|召回|治理|持久化|配置|接入|训练|清理|移除|去掉|收住|统一|恢复|产品化|质量|规模化|生产|真实|可用|能用了|状态|进度|进展/u
const fixedTemplateRemovalComplaintPattern = /(?:别再|不要再|别用|不要用|去掉|删掉|清掉|移除|清除|停用|stop|don't use|do not use|remove|delete|strip|clean)[^。.!?\n]*(?:fixed template|template residue|canned template|canned slogan|fixed slogan|模板|固定话术|固定口号|固定人格|套话|污染|same[- ]?her|same living line|one continuous her|local-first digital life project|同一个她|同一个\s*her|数字生命主线)|(?:fixed template|template residue|canned template|canned slogan|fixed slogan|模板|固定话术|固定口号|固定人格|套话|污染)[^。.!?\n]*(?:别再|不要再|别用|不要用|去掉|删掉|清掉|移除|清除|停用|stop|don't use|do not use|remove|delete|strip|clean)/iu
const fixedTemplateSloganOnlyPattern = /same[- ]?her|same living line|one continuous her|local-first digital life project|同一个她|同一个\s*her|数字生命(?:主线|回线|闭环|项目|人格)|本地数字生命|同一条线|沿着.*(?:主线|回线|同一个她)|继续.*(?:主线|回线|同一个她|数字生命)|人格闭环/iu
const concreteProjectStateRequestPattern = /project-state|project state|项目状态|workingmemory|longtermmemory|memory workbench|短期记忆|长期记忆|记忆中心|记忆治理|召回|分页|搜索|筛选|embedding|向量|人格候选|健康指标|review|策略|持久化|做到哪|还差|还缺|进度|进展|可用|能用了|质量|规模化|接起来|接上|闭环/iu

function normalizeAlicizationProjectStateIntentText(raw: unknown) {
  return typeof raw === 'string'
    ? raw.trim().replace(/\s+/g, ' ').slice(0, 500)
    : ''
}

export function hasAlicizationProjectStateUserIntent(raw: unknown) {
  const latestUserText = normalizeAlicizationProjectStateIntentText(raw)
  if (!latestUserText)
    return false
  if (fixedTemplateRemovalComplaintPattern.test(latestUserText))
    return false
  if (
    fixedTemplateSloganOnlyPattern.test(latestUserText)
    && !concreteProjectStateRequestPattern.test(latestUserText)
  ) {
    return false
  }

  return explicitProjectStateProviderIntentPattern.test(latestUserText)
    || (
      ambiguousProjectStateContinuityTermPattern.test(latestUserText)
      && projectStateProgressOrDevelopmentIntentPattern.test(latestUserText)
    )
}

export function shouldAttachAlicizationProjectStateContext(input: {
  latestUserText?: string | null
  origin?: AlicizationProjectStateContextOrigin | null
  answerSubject?: string | null
  executionReplyRequired?: boolean
  executionRoutingRequired?: boolean
  executionCapabilityQuestion?: boolean
  actionKind?: string | null
}) {
  if (input.answerSubject === 'project-state')
    return true

  return hasAlicizationProjectStateUserIntent(input.latestUserText)
}
