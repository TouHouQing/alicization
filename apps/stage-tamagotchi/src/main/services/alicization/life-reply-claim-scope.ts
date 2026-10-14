import { attributesConversationStatement } from './life-conversation-statements'
import { isImmediateConversationalPresence } from './life-conversational-acknowledgment'

/** Possible assertion kinds, not evidence that an assertion is true. */
export function lifeReplyQuoteClaimKinds(draft: string, quote: string) {
  if (isImmediateConversationalPresence(quote))
    return []
  const kinds: string[] = []
  const attributed = attributesConversationStatement(draft, quote, 'host') || attributesConversationStatement(draft, quote, 'companion')
  if (attributed)
    kinds.push('conversation-statement')
  const ownOperation = quote.split(/[，,。！？!?；;\n]/u).some(part => /^(?:刚才|之前|后来|随后|现在|今天|昨天|这次|那次|更早|其实|[也还而并])?(?:我|我们)[^。；;\n]{0,24}(?:完成|执行|操作|写入|保存|读取|读[了过完]|删除|取消|支付|上传|下载|打开|关闭|写[了过成完])/u.test(part.trim()))
  if (attributed && !ownOperation)
    return kinds
  if (/我[^。；;\n]{0,20}(?:会|将|打算|准备|保证|承诺)[^。；;\n]{0,80}(?:提醒|通知|发送|发给|上传|下载|删除|清空|覆盖|移动|保存|记录|记住|[写画读帮]|创作|生成|制作|打开|关闭|修改|安装|执行|运行|搜索|查询|购买|支付|转账|处理|完成|主动找)|\b(?:i will|i promise|i intend)\b/iu.test(quote))
    kinds.push('future-task')
  if (/完成|做完|办好|弄好|写成|写完|写了|已写|已保存|已经保存|保存了|删了|读取|读回|读完|读了|执行|操作了|打开了|关闭了|上传|下载|支付|取消了|\b(?:completed|finished|saved|wrote|read|executed|opened|closed|deleted|uploaded|downloaded|paid)\b/iu.test(quote))
    kinds.push('task-complete', 'execution-step-complete')
  if (/文件|路径|目录|窗口|网页|页面|系统|不存在|找不到|失败|暂停|取消|拒绝|未知|没有完成|未完成|读回|读取|\b(?:file|path|window|page|failed|held|cancelled|denied|unknown|ENOENT)\b/iu.test(quote))
    kinds.push('execution-step-outcome')
  if (/记住|记忆|永久|存储|存进|记录下来|保存下来|\b(?:remembered|stored memory|saved memory|permanently)\b/iu.test(quote))
    kinds.push('memory-stored')
  if (/伸展|伸懒腰|休息|睡|歇|\b(?:stretch|rested|slept|sleep)\b/iu.test(quote))
    kinds.push('daily-activity-complete')
  return kinds
}
