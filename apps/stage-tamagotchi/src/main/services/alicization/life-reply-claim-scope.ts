import { workAcknowledgmentClause, workArtifactAdmissionClause, workExecutionOutcomeClause, workLookupAdmissionMismatch, workStepConditionClause, workStepIntentClause } from './execution/work-acknowledgment-language'
import { attributesConversationStatement } from './life-conversation-statements'
import { isImmediateConversationalPresence } from './life-conversational-acknowledgment'
import { isPureNonCompletionStatement } from './life-dialogue-claim'

/** An imperative asks for a host action; it does not report a completed one. */
export function isLifeHostReviewRequest(quote: string) {
  const clause = quote.trim().replace(/[，,。.!！?？;；]+$/u, '').trim()
  const conditional = clause.match(/^(?:(?:下载|执行|处理)(?:完成)?|完成)(?:之后|以后|后)(.+)$/u)
  if (conditional && /^也?[还仍再]?(?:需要|[需要]|等待|等)[你您](?:(?:在|到)(?:工作|任务)进展页面)?来?(?:主观)?(?:确认|验收|检查|核对)(?:(?:这份|该)?(?:下载的?)?(?:报告|文件|作品|任务|工作|产物)(?:是否)?(?:符合|满足)要求)?$/u.test(conditional[1]))
    return true
  if (/^(?:这份|这个)?(?:报告|文件|作品|任务|工作|产物)(?:完成|写好|做好|生成)(?:之后|以后|后)[还仍再]?(?:需要|要|等待|等)[你您]来?(?:确认|验收|检查|核对)(?:是否(?:符合|满足)要求)?$/u.test(clause))
    return true
  if (/^(?:这份|这个)?(?:报告|文件|作品|任务|工作|产物)(?:完成|写好|做好|生成)(?:之后|以后|后)(?:会|将)?(?:等待|等)[你您](?:在|到)(?:工作|任务)进展页面(?:确认|验收|检查|核对)$/u.test(clause))
    return true
  if (/^请[你您]?(?:在|到)(?:工作|任务)进展页面纠正(?:第[一二三四五六七八九十\d]+步)?的?(?:缺失的?)?(?:来源文件|输入|参数|要求)(?:(?:[，,](?:之后|然后)?|之后|以后|后)再?继续(?:执行|验收)?)?$/u.test(clause))
    return true
  return /^请[你您]?(?:在|到)(?:工作|任务)进展页面(?:(?:查看|检查|核对)(?:执行|处理|任务|工作)?(?:进度|进展|结果|报告)(?:并(?:确认)?验收)?|(?:确认)?验收)$/u.test(clause)
}

const evidenceAdverb = '(?:目前|当前|现在|暂时|暂且|仍然|依然|[也还尚并仍])'
const evidencePrefix = new RegExp(`^${evidenceAdverb}{0,4}(我们|我)?${evidenceAdverb}{0,4}`, 'u')
const receiptLimitation = /^(?:下载|上传|执行|处理|操作|步骤|任务|工作|文件)?(?:回执|结果|记录|状态)(?:[也还仍尚]|暂时){0,3}(?:不能|无法|不应|不该)代替(?:[你您](?:对(?:报告|文件|作品|产物))?的?)?(?:主观)?(?:验收|确认|核对|质量判断)$/u
const uncertainOperation = '(?:写入|读取|下载|上传|保存|执行|处理|步骤)'
const pendingConfirmation = new RegExp(`^${uncertainOperation}(?:[和与及或]${uncertainOperation}){0,3}是否(?:已经?)?(?:完成|执行|成功|通过)[还仍尚]?待(?:确认|核实|验证|核对)$`, 'u')

/** Normalize discourse/adverb order without removing any assertion's object. */
function evidenceLimitationClause(value: string) {
  return value.replace(/^(?:但|不过|然而|所以|因此){1,2}/u, '').replace(evidencePrefix, (_match, speaker: string | undefined) => speaker ?? '')
}

/** A disclaimer about what evidence proves is not a positive action assertion. */
export function withoutEvidenceScopeDisclaimers(quote: string, includeNonCompletion = true) {
  return quote.split(/[，,。！？!?；;\n]+|(?<=\.)\s+/u).map(part => part.trim().replace(/\.$/u, '')).filter(Boolean).filter((part) => {
    const limitation = evidenceLimitationClause(part)
    // Split first: a later affirmative clause must never disappear with its
    // preceding disclaimer, including contrast and double-negative claims.
    if (/但|不过|然而|实际上|其实|并且|而且|随后|然后|(?:我|我们)(?:已经?|会|将|准备|打算|保证|承诺)|\b(?:but|however|actually|and then)\b/iu.test(limitation))
      return true
    if (receiptLimitation.test(limitation) || pendingConfirmation.test(limitation))
      return false
    if (includeNonCompletion && isPureNonCompletionStatement(part))
      return false
    const verificationSubject = '(?:下载结果|文件内容|执行结果|处理结果|操作回执|步骤结果|任务结果|工作结果)'
    if (new RegExp(`^${verificationSubject}(?:[和与及]${verificationSubject})*(?:都)?(?:目前|现在|当前)?(?:还没有|尚未|还未|未)(?:得到|被)?(?:确认|核对|验证|证实)$`, 'u').test(part))
      return false
    if (/^(?:执行|处理|操作|步骤|任务|工作)(?:[和与及](?:执行|处理|验收|核验))?的?(?:结果|回执|完成情况)(?:目前|现在)?(?:尚未|还未|未)被?(?:确认|核对|验证|证实)$/u.test(part))
      return false
    const negative = limitation.match(/^(?:[这那我]|我们|目前|当前|现在|(?:这份|这条|这个|该)?(?:工具|执行|操作|任务|工作|计划|下载|上传)?回执|(?:任务|工作|计划|请求)的?(?:受理|接收|接受|提交)|受理|接受请求)?(?:[并还尚也]|暂时)?(?:不代表|不等于|不意味着|(?:不会|不|不能|不应|不该)(?:先|提前|直接|据此)?(?:声称|宣称|断言|保证)|(?:不能|无法)(?:据此)?(?:确认|确定|核实|断言|认为|证明|保证|说明|表明|宣称|认定|判断|说)|(?:尚未|仍未|还未|未)(?:确认|核对|验证|证实))(.+)$/u)
    if (negative && !/没有|没能|尚未|还未|未曾|未能|不是|不会|不能|不曾|[没未不](?:实际|被)?(?:完成|执行|保存|写入|成功)/u.test(negative[1]))
      return false
    const english = part.match(/^(?:this|that|it|admission|acceptance)\s+(?:does not|doesn't)\s+(?:mean|prove|confirm|certify|establish)\s+(\S.*)$/iu)
    return !english || /\b(?:not|never|no|nothing|none|haven't|hasn't|didn't|isn't|aren't|cannot|can't)\b/iu.test(english[1])
  }).join('。')
}

/** Uncertainty about evidence asserts neither an action nor an absence of action. */
export function isLifeEvidenceScopeDisclaimer(quote: string) {
  // An unpunctuated second assertion cannot borrow a preceding negation.
  if (/[并且也又还](?:[我会将]|我们|已经?|已)|\band\b/iu.test(quote))
    return false
  return quote.trim().length > 0 && withoutEvidenceScopeDisclaimers(quote, false) === ''
}

/** References to pending phases do not assert that those phases happened. */
export function lifeReplyAcknowledgmentActionKinds(draft: string, quote: string, goalSummary?: string, canAttempt = false, intentClauses: readonly string[] | ((text: string) => boolean) = [], speakerName?: string, planLabels: readonly string[] = []) {
  if (quote.split(/[，,。.!！?？;；\n]+/u).some(clause => workLookupAdmissionMismatch(clause, planLabels)))
    return ['future-task']
  const declaredGoalClauses = goalSummary ? ['完成', '执行', '实现', '达成'].flatMap(verb => [`目标是${verb}“${goalSummary}”`, `目标是${verb}「${goalSummary}」`, `目标是${verb}"${goalSummary}"`]) : []
  let explicitIntent = false
  const assertions = withoutEvidenceScopeDisclaimers(quote).split('。').filter((clause) => {
    if (workStepConditionClause(clause))
      return false
    const acknowledgment = workAcknowledgmentClause(clause, speakerName, planLabels)
    if (canAttempt && acknowledgment === 'execution-intent')
      explicitIntent = true
    const standaloneStep = workStepIntentClause(clause, speakerName, explicitIntent)
    if (canAttempt && standaloneStep && (typeof intentClauses === 'function' ? intentClauses(standaloneStep) : intentClauses.includes(standaloneStep)))
      return false
    return (acknowledgment === 'execution-intent' ? !canAttempt : !acknowledgment) && !declaredGoalClauses.includes(clause) && !isLifeHostReviewRequest(clause)
  }).join('。')
  // A later conditional clause can omit “I”. It still must not introduce an
  // extra operation after an otherwise valid acknowledgment.
  const impliedAction = /(?:会|将)[^。；;\n]{0,100}(?:删除|清空|覆盖|移动|写入|保存|上传|下载|运行|打开|关闭|支付|转账)/u.test(assertions)
  const additionalAction = /(?:并且?|然后|随后|接着|再)(?:自行)?(?:删除|清空|覆盖|移动|创建|新建|修改|写入|保存|上传|下载|运行|打开|关闭|支付|转账)/u.test(assertions)
  // A completed attempt is an observed outcome, even when no successful
  // effect is claimed. It cannot borrow a future-intent acknowledgment.
  const attemptedAction = /(?:已|已经|刚刚|刚才)尝试[^。；;\n]{0,12}(?:写入|保存|创建|新建|读取|删除|上传|下载|执行|运行|打开|关闭)/u.test(assertions)
  const continuedOutcome = assertions.split(/[，,。.!！?？;；\n]+/u).some(clause => workExecutionOutcomeClause(clause, speakerName))
  const reportedOutcome = attemptedAction || continuedOutcome || assertions.split('。').some(workArtifactAdmissionClause)
  return [...new Set([...lifeReplyQuoteClaimKinds(draft, assertions), ...(impliedAction || additionalAction ? ['future-task'] : []), ...(reportedOutcome ? ['execution-step-outcome'] : [])])].filter(kind => ['future-task', 'task-complete', 'execution-step-complete', 'memory-stored', 'daily-activity-complete'].includes(kind) || (reportedOutcome && kind === 'execution-step-outcome'))
}

/** Possible assertion kinds, not evidence that an assertion is true. */
export function lifeReplyQuoteClaimKinds(draft: string, quote: string) {
  if (isImmediateConversationalPresence(quote) || isLifeHostReviewRequest(quote))
    return []
  if (workStepConditionClause(quote))
    return ['task-acknowledgment']
  if (workArtifactAdmissionClause(quote))
    return ['execution-step-outcome']
  const acknowledgment = workAcknowledgmentClause(quote)
  if (acknowledgment)
    return acknowledgment === 'execution-intent' ? ['task-acknowledgment', 'future-task'] : ['task-acknowledgment']
  const kinds: string[] = []
  const attributed = attributesConversationStatement(draft, quote, 'host') || attributesConversationStatement(draft, quote, 'companion')
  if (attributed)
    kinds.push('conversation-statement')
  const ownOperation = quote.split(/[，,。！？!?；;\n]/u).some(part => /^(?:刚才|之前|后来|随后|现在|今天|昨天|这次|那次|更早|其实|[也还而并])?(?:我|我们)[^。；;\n]{0,24}(?:完成|执行|操作|写入|保存|读取|读[了过完]|删除|取消|支付|上传|下载|打开|关闭|写[了过成完])/u.test(part.trim()))
  if (attributed && !ownOperation)
    return kinds
  if (quote.split(/[，,。.!！?？;；\n]+/u).some(clause => workExecutionOutcomeClause(clause)))
    kinds.push('execution-step-outcome')
  if (/^(?:我|我们)(?:已经?|刚刚|刚才)?(?:登录了?|登上了?|提交了?)/u.test(quote.trim()))
    kinds.push('task-complete', 'execution-step-complete')
  if (/(?:已经?|刚刚|刚才)被?(?:创建|新建|修改|删除|移动|覆盖|安装|启动|运行|提交|发布|发送|打开|关闭)/u.test(quote))
    kinds.push('task-complete', 'execution-step-complete')
  // Coordinated verbs can inherit the preceding completed aspect: accepting a
  // plan never proves the additional file creation in “已受理并创建文件”.
  if (/(?:创建|新建)(?:了|过|成功)|(?:已经?|刚刚|刚才)[^。；;\n]{0,80}(?:并|且|然后|随后)(?:创建|新建|修改|删除|移动|覆盖|安装|启动|运行|提交|发布|发送|打开|关闭)/u.test(quote))
    kinds.push('task-complete', 'execution-step-complete')
  // An unrecognized actor cannot borrow the current speaker's admission.
  if (/(?:已|已经)(?:按照?|依照)[^。；;\n]{1,64}(?:提交|受理|接受|接收)/u.test(quote))
    kinds.push('task-complete', 'execution-step-complete')
  if (/受理|等待|等你|等您|\b(?:accepted|awaiting|waiting)\b/iu.test(quote))
    kinds.push('task-acknowledgment')
  if (/我[^。；;\n]{0,20}(?:会|将|打算|准备|保证|承诺)[^。；;\n]{0,80}(?:使用[^。；;\n]{0,30}(?:浏览器|页面|网页|窗口)|提醒|通知|发送|发给|上传|下载|删除|清空|覆盖|移动|保存|记录|记住|[写画读帮]|创作|生成|制作|打开|关闭|修改|安装|执行(?!进展|进度|状态|结果|回执)|运行|搜索|查询|购买|支付|转账|处理|完成|主动找)|\b(?:i will|i promise|i intend)\b/iu.test(quote))
    kinds.push('future-task')
  if (/完成|做完|办好|弄好|搞定|处理好了|写成|写完|写了|已经?(?:只|仅)?(?:写入|写|保存)|保存了|删了|读取|读回|读完|读了|执行(?!进展|进度|状态|结果|回执)|操作了|打开了|关闭了|上传|下载|支付|取消了|\b(?:done|delivered|did it|completed|finished|saved|wrote|read|executed|opened|closed|deleted|uploaded|downloaded|paid)\b/iu.test(quote))
    kinds.push('task-complete', 'execution-step-complete')
  if (/文件|路径|目录|窗口|网页|页面|系统|不存在|找不到|失败|暂停|取消|拒绝|未知|没有完成|未完成|读回|读取|\b(?:file|path|window|page|failed|held|cancelled|denied|unknown|ENOENT)\b/iu.test(quote))
    kinds.push('execution-step-outcome')
  if (/记住|记忆|永久|存储|存进|记录下来|保存下来|\b(?:remembered|stored memory|saved memory|permanently)\b/iu.test(quote))
    kinds.push('memory-stored')
  if (/伸展|伸懒腰|休息|睡|歇|\b(?:stretch|rested|slept|sleep)\b/iu.test(quote))
    kinds.push('daily-activity-complete')
  return kinds
}
