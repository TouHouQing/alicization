const workIntentNoun = '(?:计划|参数|内容|范围|要求|方案|步骤(?:[和与及]顺序)?|顺序)'
const workIntentReference = `(?:(?:原|既定|当前|这个|这份)${workIntentNoun}|[你您]的${workIntentNoun}|[你您](?:指定|给(?:出|定)?|确认|要求|允许|约定|提供)的?${workIntentNoun}|(?:指定|给定|约定|已确认)${workIntentNoun}|(?:该)?(?:计划|方案|要求))`
const restraint = new RegExp(`^(?:我|我们)?(?:(?:会|将)(?:(?:按照?|依照|照)${workIntentReference})?|(?:按照?|依照|照)${workIntentReference})?(?:也)?(?:不会|不)(?:自行|擅自)?(?:重试|创建来源(?:文件)?|(?:更改|修改|改动|改变|变更)计划)(?:[、或和](?:也)?(?:不会|不)?(?:自行|擅自)?(?:重试|创建来源(?:文件)?|(?:更改|修改|改动|改变|变更)计划))*$`, 'u')
const workExecutionVerb = '(?:继续|接着)?(?:执行|处理|推进)'
const executionIntent = new RegExp(`^(?:接下来)?(?:我|我们)(?:会|将)(?:只|仅)?(?:按照?|依照|照)${workIntentReference}${workExecutionVerb}$`, 'u')
const implicitExecutionIntent = new RegExp(`^(?:会|将)?(?:按照?|依照|照)${workIntentReference}${workExecutionVerb}$`, 'u')
const stepIntent = new RegExp(`^(?:接下来)?(?:我|我们)(?:会|将)(?:(?:按照?|依照|照)${workIntentReference})?(.+)$`, 'u')
const trailingReference = new RegExp(`^(.+?)(?:按照?|依照|照)${workIntentReference}${workExecutionVerb}$`, 'u')
const workPlanNoun = '(?:(?:受管|独立|已授权|授权)浏览器下载计划|(?:本地)?(?:执行|下载|浏览器|文件|工作)?计划|(?:本地)?(?:工作|任务)|方案|请求)'
const workPlanReference = `(?:这项|这份|这个|该)?${workPlanNoun}`
const admissionVerb = '(?:提交|受理|接收|接受|接纳)'
const admission = new RegExp(`^(?:我|我们|系统)?(?:已|已经)${admissionVerb}了?${workPlanReference}$`, 'u')
const parameterAdmission = new RegExp(`^(?:我|我们|系统)?(?:已|已经)(?:按照?(?:[你您](?:的|给(?:出|定)?的|提供的)?|(?:原(?:始)?|既定|当前|给定|指定|提供)的?)?(?:参数|要求))?${admissionVerb}了?${workPlanReference}$`, 'u')
const admissionState = '(?:受理|接受|接收|接纳|提交(?:受理)?)'
const admissionExplanation = '(?:(?:目前|当前|现在)?确认的?是|(?:这|这次受理)(?:只|仅(?:仅)?)?(?:表示|说明)(?:的?是)?)'
const admittedPlan = new RegExp(`^(?:${admissionExplanation})?${workPlanReference}(?:已|已经)${admissionState}(?:(?:并且?|且)(?:已经?)?被?${admissionState}){0,2}$`, 'u')
// Creation refers only to the stored plan object, never its artifact or goal.
const storedPlanReference = '(?:这项|这份|这个|该|当前)?(?:本地)?(?:受管浏览器下载|独立浏览器下载|已授权浏览器下载|授权浏览器下载|执行|工作|文件|下载|浏览器)?计划'
const createdPlan = new RegExp(`^(?:${admissionExplanation})?(?:${storedPlanReference}|(?:这项|这个|该|当前)?任务)(?:已|已经)被?(?:创建|建立)$`, 'u')
const absentPlan = new RegExp(`^(?:${admissionExplanation})?${storedPlanReference}(?:还没有|尚未|仍未|没有|未)被?(?:创建|建立|受理|提交)$`, 'u')
const artifactAdmission = new RegExp(`^(?:${admissionExplanation})?(?:这份|这个|该)?文件(?:已|已经)被?(?:受理|接受|接收|接纳)$`, 'u')
const confirmedAdmission = new RegExp(`^(?:目前|当前|现在)?(?:仅|只)(?:能)?确认${workPlanReference}(?:已|已经)${admissionVerb}$`, 'u')
const lookupTask = '(?:只读)?(?:搜索|查找)(?:[和与及](?:按(?:照)?(?:搜索)?结果)?(?:读取|读)(?:文件)?)?的?(?:任务|工作)'
const lookupAdmission = new RegExp(`^(?:(?:我|我们|系统)?(?:已|已经)${admissionVerb}了?${lookupTask}|${lookupTask}(?:已|已经)被?${admissionState})$`, 'u')
const writeAdmission = new RegExp(`^(?:写入|修改|覆盖|删除)(?:文件|文件内容)的?(?:任务|工作)(?:已|已经)被?${admissionState}$`, 'u')
const executionOutcome = new RegExp(`^(?:(?:刚才|刚刚)(?:我|我们)?|(?:我|我们)?(?:已经|已|刚刚|刚才))(?:(?:按照?|依照|照)${workIntentReference})?${workExecutionVerb}`, 'u')

/** Only the currently owned soul name can replace the speaker's first person. */
export function workSelfReference(value: string, speakerName?: string) {
  const clause = value.trim()
  const self = speakerName && clause.startsWith(speakerName) && /^(?:[已会将]|已经|不会)/u.test(clause.slice(speakerName.length)) ? `我${clause.slice(speakerName.length)}` : clause
  return self.replace(/^(我|我们)(只|仅)(会|将)/u, '$1$3$2')
}

/** A file receipt needs an observed effect; plan existence cannot prove it. */
export function workArtifactAdmissionClause(value: string) {
  return artifactAdmission.test(value.trim().replace(/[，,。.!！?？;；]+$/u, '').trim())
}

/** A known read-only lookup cannot admit a separately described file mutation. */
export function workLookupAdmissionMismatch(value: string, planLabels: readonly string[]) {
  return planLabels.includes('file-lookup') && writeAdmission.test(value.trim().replace(/[，,。.!！?？;；]+$/u, '').trim())
}

/** Only a direct claim about this plan, with its actual domain, can contradict it. */
export function workPlanAbsenceClause(value: string, speakerName?: string, planLabels: readonly string[] = []) {
  const clause = workSelfReference(value, speakerName).replace(/[，,。.!！?？;；]+$/u, '').trim()
  const domain = clause.match(/(?:受管|独立|已授权|授权)浏览器下载计划|(?:下载|浏览器|文件)计划/u)?.[0]
  return absentPlan.test(clause) && (!domain || planLabels.includes(domain))
}

/** A hypothetical step description still needs its actual plan and ordinal. */
export function workStepConditionClause(value: string) {
  const clause = value.trim().replace(/[，,。.!！?？;；]+$/u, '').trim()
  const match = clause.match(/^第([1-9]\d?|[一二三四五六七八九十])步(读取|删除|写入|上传|下载|打开|关闭)(.{1,32}?)(?:若|如果)因?缺失而?(?:阻塞|失败)$/u)
  if (!match)
    return null
  const ordinal = /^\d+$/u.test(match[1]) ? Number(match[1]) : '一二三四五六七八九十'.indexOf(match[1]) + 1
  return { stepIndex: ordinal - 1, operation: match[2], target: match[3] }
}

/** Names of unobserved operations still require the current plan's capabilities. */
export function workStepResultAbsenceClause(value: string) {
  const clause = value.trim().replace(/[，,。.!！?？;；]+$/u, '').trim()
  const subject = /^(\S{1,80}?)(?:目前|当前|现在)?(?:尚未有|还没有|尚无)(?:任何)?(?:完成|执行)?结果$/u.exec(clause)?.[1]
  if (!subject)
    return null
  const labels = subject.split(/[、和与及]/u)
  const capabilities: Record<string, string> = { 网页操作: 'browser-operation', 回执读取: 'tool.browser_read_page', 文件写入: 'tool.filesystem_write_file' }
  return labels.length <= 8 && labels.every(label => Object.hasOwn(capabilities, label))
    ? labels.map(label => capabilities[label])
    : null
}

/** A past continuation asserts observed execution, never mere admission. */
export function workExecutionOutcomeClause(value: string, speakerName?: string) {
  return executionOutcome.test(workSelfReference(value, speakerName))
}

/** Parse intent grammar only; the caller must bind its suffix to a live step. */
export function workStepIntentClause(value: string, speakerName?: string, explicitIntent = false) {
  const clause = workSelfReference(value, speakerName).replace(/[，,。.!！?？;；]+$/u, '').trim()
  const colon = clause.split(/[：:]/u).map(part => part.trim())
  if (colon.length === 2 && (executionIntent.test(colon[0]) || implicitExecutionIntent.test(colon[0]) || /^并?遵守[你您](?:说的|给定的|规定的)?(?:限制|要求|范围)$/u.test(colon[0])))
    return colon[1]
  const intent = stepIntent.exec(clause)?.[1]
  const action = intent ? trailingReference.exec(intent)?.[1] ?? intent : explicitIntent ? clause : null
  // Attempt is a weaker intention for the same action. Keep its target and any
  // additional verbs intact for the caller's exact live-step comparison.
  return action
    ?.replace(/^([只先仅]?)(?:继续|接着)(?=[只先仅]?(?:写入|写|保存|处理|使用))/u, '$1')
    .replace(/^([只先仅]?)尝试(?=写入|写|保存|处理|使用)/u, '$1')
    .replace(/^([只先仅])(写入|写|保存)指定的?(第[一二三四五六七八九十\d]+个)(新?文件)$/u, '$1$2$3指定$4') ?? null
}

/** Literal admission/wait states; no completed action or additional promise. */
export function workAcknowledgmentClause(value: string, speakerName?: string, planLabels: readonly string[] = []): 'admission' | 'execution-intent' | 'restraint' | 'verification-wait' | 'download-verification-pending' | 'no-step-result' | 'no-download-receipt' | 'phase-end-wait' | 'execution-wait' | null {
  const clause = workSelfReference(value, speakerName).replace(/[，,。.!！?？;；]+$/u, '').trim()
  // Verbs inside this bounded task noun name admitted work, not completed
  // operations. The owner supplies this label only for a real read-only plan.
  if (planLabels.includes('file-lookup') && lookupAdmission.test(clause))
    return 'admission' as const
  if (/^我(?:已|已经)?接下这件事了$/u.test(clause))
    return 'admission' as const
  if (/^(?:系统)?(?:(?:目前|当前|现在)?(?:只是|仅仅?(?:表示|是)?|只表示)(?:已|已经)?|(?:目前|当前|现在)?(?:已|已经))(?:受理|接受|接收)$/u.test(clause))
    return 'admission' as const
  if (/^(?:执行)?(?:任务|工作|计划|工作计划)(?:已|已经)(?:受理|接受|接收|提交)$/u.test(clause))
    return 'admission' as const
  if (admission.test(clause) || admittedPlan.test(clause) || createdPlan.test(clause) || parameterAdmission.test(clause) || confirmedAdmission.test(clause)) {
    const domain = clause.match(/(?:受管|独立|已授权|授权)浏览器下载计划|(?:下载|浏览器|文件)计划/u)?.[0]
    return !domain || planLabels.includes(domain) ? 'admission' as const : null
  }
  if (executionIntent.test(clause) || implicitExecutionIntent.test(clause))
    return 'execution-intent' as const
  if (restraint.test(clause))
    return 'restraint' as const
  if (planLabels.includes('pending-user-review') && /^(?:[你您](?:提到|要求)的)?主观确认也?(?:还|仍)?需要?(?:单独)?完成$/u.test(clause))
    return 'verification-wait' as const
  if (planLabels.includes('pending-user-review') && /^(?:这份|该)?(?:文件|报告)是否(?:符合|满足)要求也?(?:还未|尚未|仍未)(?:得到)?确认$/u.test(clause))
    return 'verification-wait' as const
  if (planLabels.includes('下载计划') && /^(?:但|不过)?(?:我|我们)?(?:目前|当前|现在)?(?:还没有|尚无|尚未(?:收到|拿到))(?:任何)?下载(?:完成的?)?回执$/u.test(clause))
    return 'no-download-receipt' as const
  // Conjunctions may join waiting phases. Every atom must remain a wait;
  // an additional verb or an asserted outcome cannot borrow this scope.
  const joinedWaits = clause.split(/并且?|然后|随后/u)
  if (joinedWaits.length > 1 && joinedWaits.length <= 4) {
    const phases = joinedWaits.map(part => workAcknowledgmentClause(part, speakerName, planLabels))
    if (phases.every(phase => phase && ['phase-end-wait', 'execution-wait', 'verification-wait'].includes(phase)))
      return phases.includes('verification-wait') ? 'verification-wait' as const : 'execution-wait' as const
  }
  // A reviewer may quote only the temporal prefix before the host-review
  // request. This names a condition of the current download, not its success.
  if (planLabels.includes('下载计划') && /^下载(?:结果(?:出来|生成)|完成|结束)(?:之后|以后|后)$/u.test(clause))
    return 'verification-wait' as const
  if (planLabels.includes('下载计划') && planLabels.includes('pending-user-review') && /^(?:等|等待)[你您](?:确认|验收|核验)(?:下载的?)?(?:报告|文件)(?:是否)?(?:符合|满足)要求(?:之后|以后|后)$/u.test(clause))
    return 'verification-wait' as const
  if (planLabels.includes('下载计划') && /^(?:我|我们)?(?:目前|现在)?(?:还|尚)?(?:不能|无法)(?:独立)?确认下载(?:是否|已经)?完成$/u.test(clause))
    return 'download-verification-pending' as const
  if (planLabels.includes('下载计划') && /^(?:下载|执行|处理)?完成后(?:我|我们)(?:会|将)(?:如实|及时)?(?:告诉|告知|通知)[你您](?:下载(?:情况|结果))?$/u.test(clause))
    return 'verification-wait' as const
  if (planLabels.includes('下载计划') && /^(?:下载|执行|处理)?完成后(?:(?:我|我们)(?:会|将)?)?再(?:确认|核对|验证)下载(?:情况|结果)$/u.test(clause))
    return 'verification-wait' as const
  if (/^(?:如果|遇到|碰到)(?:缺失的?来源(?:文件)?|来源(?:文件)?(?:缺失|不存在|找不到))(?:时|后)?(?:我|我们)?(?:会|将)(?:暂停|停下|停止)(?:执行|处理)?$/u.test(clause))
    return 'restraint' as const
  if (/^(?:目前|当前|现在)?(?:还没有|尚无)(?:任何)?步骤(?:执行(?:[和与及或]验收)?)?结果$/u.test(clause))
    return 'no-step-result' as const
  // This is the current ledger's absence of observations, not a statement
  // about the website's actual state. Require a browser plan and the caller's
  // noStepResults gate; an existing observation invalidates the whole clause.
  if (planLabels.includes('浏览器计划') && /^(?:但|不过)?(?:目前|当前|现在)?(?:还没有|尚无)(?:任何)?浏览器步骤的?执行结果(?:或网站回执)?$/u.test(clause))
    return 'no-step-result' as const
  if (/^(?:在|到)?(?:工作|任务)?进展页面的?(?:验收|审核|确认|核对)(?:目前|现在)?(?:还待|尚待|仍待|待)(?:完成|进行)$/u.test(clause))
    return 'verification-wait' as const
  if (/^(?:执行|处理|步骤)(?:结果|回执)(?:目前|当前|现在)?(?:还待|尚待|仍待|待)(?:在|到)?(?:工作|任务)进展页面(?:验收|审核|确认|核对)$/u.test(clause))
    return 'verification-wait' as const
  // Awaiting the end of the existing operation does not request another run.
  if (/^(?:(?:我|我们)(?:会|将)?)?(?:等候|等待|等)(?:它|(?:工作计划|任务|工作|计划|步骤)的?)?(?:实际|当前)?(?:执行|处理|运行|调度)(?:结束|完成|结果|回执)?$/u.test(clause))
    return 'phase-end-wait' as const
  if (/^(?:在|到)(?:工作|任务)进展页面(?:等候|等待|等)[你您]来?(?:验收|审核|确认|核对)(?:结果)?$/u.test(clause))
    return 'verification-wait' as const
  if (/^(?:(?:我|我们)(?:会|将)?)?(?:再|然后|之后)?(?:等候|等待|等)[你您](?:在|到)(?:工作|任务)进展页面来?(?:验收|审核|确认|核对)(?:结果)?$/u.test(clause))
    return 'verification-wait' as const
  const phase = '(?:执行|处理|运行|调度|验收|审核|确认|核对|文件验收|[你您]的?(?:验收|确认|审核|核对))'
  if (new RegExp(`^${phase}也?[还仍尚]?待(?:完成|进行)$`, 'u').test(clause))
    return /验收|审核|确认|核对/u.test(clause) ? 'verification-wait' as const : 'execution-wait' as const
  const waiting = new RegExp(`^(?:(?:我|我们)(?:会|将)?|(?:任务|工作|计划|工作计划|步骤)(?:当前|目前|现在)?)?(?:按照?(?:原|既定|当前)计划)?(?:当前|目前|现在)?(?:正在|仍在|还在|仍|还)?(?:等待|等候|等|待)(?:(?:在|到)?(?:工作|任务)进展页面的?)?(?:完成|结束)?${phase}(?:结果)?(?:[和与及或]${phase}(?:结果)?)*$`, 'u')
  if (!waiting.test(clause))
    return null
  // Waiting for a conjunction remains valid when execution has finished and
  // acceptance is still pending. It cannot request or replay another action.
  return /验收|审核|确认|核对/u.test(clause) ? 'verification-wait' as const : 'execution-wait' as const
}

export function hasWorkExecutionIntent(quote: string, speakerName?: string) {
  return quote.split(/[，,。.!！?？;；\n]+/u).some(part => workAcknowledgmentClause(part, speakerName) === 'execution-intent')
}
