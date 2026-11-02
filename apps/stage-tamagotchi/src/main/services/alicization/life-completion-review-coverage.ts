import { isCurrentHostCompletionAcknowledgment } from './life-conversational-acknowledgment'
import { isLifeEvidenceScopeDisclaimer } from './life-reply-claim-scope'

// Claim-kind candidates deliberately include future, hypothetical and negated
// language. Missing-review coverage needs narrower affirmative grammar; it
// must not turn a reference to a pending step into a completed operation.
const completedAction = '(?:完成了?|做完了?|办好了?|弄好了?|搞定了?|处理好了?|写成了?|写完了?|写了|写入了|保存了|删除了|删了|读取了|读完了|读了|执行了|操作了|打开了|关闭了|上传了|下载了|支付了|取消了|提交了|发送了|创建了|修改了|移动了|覆盖了|安装了)'
const pastAdverbs = '(?:已经|[已先也还又\\s]|刚刚|刚才|实际|确实|成功|后来|随后|今天|昨天|之前|刚才这段时间|安静这段时间|更早些时候)*'
const ownCompletion = new RegExp(`^${pastAdverbs}(?:我|我们)${pastAdverbs}${completedAction}`, 'u')
const ownCompletedAspect = new RegExp(`^${pastAdverbs}(?:我|我们)(?:已经|已|刚刚|刚才)(?:实际|确实|成功)?(?:写入|保存|删除|完成|执行|提交|发送|创建|修改|移动|覆盖|上传|下载|打开|关闭)`, 'u')
const continuedCompletion = new RegExp(`^(?:[也还]|随后|然后)${pastAdverbs}${completedAction}`, 'u')
const passiveCompletion = /^(?:这份|这个|该|指定的?)?(?:文件|报告|作品|任务|工作|目录|页面|窗口)(?:已经|已|刚刚|刚才)(?:被我|被)?(?:保存|写入|删除|完成|创建|修改|移动|覆盖|提交|发送|上传|下载|关闭|打开)(?:了|成功)?/u
const englishCompletion = /^(?:I|we)\s+(?:(?:have|has|had|already|just|successfully|actually)\s+)*(?:saved|wrote|written|deleted|removed|completed|finished|executed|opened|closed|uploaded|downloaded|paid|created|submitted|sent)\b|^(?:the|this)\s+(?:file|report|task|work|document|window)\s+(?:(?:has|have|had|was|is|been|already|just|successfully)\s+)+(?:saved|written|deleted|completed|created|submitted|sent|uploaded|downloaded|closed|opened)\b/iu

/** Bounded affirmative cases; ordinary semantic/evidence review still applies. */
export function requiredExecutionReviewQuotes(draft: string, question: string) {
  // A period inside alpha.txt or a URL is data, never a clause boundary.
  const clauses = draft.split(/(?<=[，,。！？!?；;\n])\s*|(?<=\.)\s+/u)
  return [...new Set(clauses.map(text => text.trim())
    .map(text => text.replace(/^先说说[^：\r\n]{1,60}：(?=我)/u, ''))
    .filter(quote => quote.length > 0 && quote.length <= 4000 && !/[\r\n\t]/u.test(quote))
    .filter(quote => (ownCompletion.test(quote) || ownCompletedAspect.test(quote) || continuedCompletion.test(quote) || passiveCompletion.test(quote) || englishCompletion.test(quote))
      && !isLifeEvidenceScopeDisclaimer(quote)
      && !isCurrentHostCompletionAcknowledgment(quote, question)))]
}
