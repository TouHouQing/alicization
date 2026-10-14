import { requestsLifePastRecall } from './life-past-execution'

/** Pure history uses committed evidence; mixed or ambiguous requests retain execution tools. */
export function isLifeRecallOnlyTurn(input: { text: string | null, hasAttachments: boolean }) {
  const text = input.text?.trim()
  if (!text || input.hasAttachments || !requestsLifePastRecall(text))
    return false
  // Deliberately conservative: even historical mentions of an operation keep
  // tools available. This optimization never silently removes a requested action.
  return !/写入|保存|删除|创建|新建|运行|打开|关闭|下载|发送|上传|付款|搜索|查找|读取|读回|检查|查看|点击|拖动|复制|移动|安装|卸载|安排|提醒|记住|记下来|继续|重新|接下来|马上|稍后|明天|等会|再做|(?:[做动画写读]|伸展|休息)(?:一下|一个|一会|一段|这|这个)|\b(?:write|save|delete|create|run|open|close|download|send|upload|pay|search|find|read|check|inspect|click|drag|copy|move|install|uninstall|schedule|remind|store|continue|again|next|tomorrow)\b/iu.test(text)
}
