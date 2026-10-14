// These exclusions describe acts performed by this utterance, or the host's
// current report. They never certify the speaker's external work or storage.
function clauses(text: string) {
  return text.trim().split(/[，,。.!?！？；;\n]/u).map(value => value.trim()).filter(Boolean)
}

export function isImmediateConversationalPresence(text: string, speakerName?: string) {
  const names = speakerName?.trim().split(/\s+/u).filter(Boolean) ?? []
  const allowedNames = speakerName ? [speakerName.trim(), ...(names.length > 1 ? [names.at(-1)!] : [])] : []
  const parts = clauses(text)
  const acknowledgments = /^(?:嗯|嗯嗯|好|好的|好呀|好啊|别急|不用急)$/u
  if (!parts.some(part => !acknowledgments.test(part)))
    return false
  return parts.length > 0 && parts.every((part) => {
    if (/^(?:回来啦|回来了|欢迎你|欢迎回来|想聊什么都可以)$/u.test(part))
      return true
    if (acknowledgments.test(part))
      return true
    if (/^我?(?:就在这里|在这里|在这儿|在呢|在的|在|听着|听你说|陪你(?:安静)?(?:待|坐)?一会儿|不追问)[呢呀啊]?$/u.test(part))
      return true
    if (/^我?就?(?:安静)?陪着?你(?:(?:安静)?(?:待|坐)?一会儿)?$|^(?:先|暂时)?不说(?:什么|话)?$/u.test(part))
      return true
    if (/^我(?:替|为)你(?:开心|高兴)$/u.test(part))
      return true
    return allowedNames.some(name => part === `${name}在呢` || part === `${name}在这里`)
  })
}

export function isCurrentChoiceReflection(text: string, question: string) {
  const externalWork = /提醒|叫醒|通知|发送|发给|上传|下载|删除|清空|覆盖|移动|保存|存储|记录|记住|永久|[写画喝吃]|创作|生成|制作|打开|关闭|读取|修改|安装|卸载|执行|运行|搜索|查询|购买|支付|转账|操控|出门|跑步|\b(?:remind|notify|send|upload|download|delete|save|store|write|draw|create|open|close|read|modify|install|execute|run|search|buy|pay)\b/iu
  if (externalWork.test(text) || externalWork.test(question))
    return false
  const asksDecision = /(?:怎么|怎样|如何|会不会|为什么)[\s\S]{0,60}(?:决定|判断|选择|无聊|兴趣|好奇)|\b(?:how|why)[\s\S]{0,60}(?:decide|choose|bored|curious)\b/iu.test(question)
  const introspection = /(?:看|留意|注意|判断|考虑|选择|觉得)[\s\S]{0,40}(?:自己|兴趣|好奇|无聊|精力|心情|愿意)|\b(?:notice|consider|decide)[\s\S]{0,40}(?:interest|curiosity|mood|energy)\b/iu.test(text)
  return text.length <= 1000 && asksDecision && introspection && /如果|要是|有的话|没有的话|是否|有没有|会不会|决定|判断|选择|\b(?:if|whether|decide|choose)\b/iu.test(text)
}

export function isCurrentHostCompletionAcknowledgment(text: string, currentInput: string) {
  const parts = clauses(text)
  if (!parts.length || parts.some(part => /[我帮替]|我们|文件|保存|提醒|明天|永久|上传|发送/u.test(part)))
    return false
  // A positive first-person report from the current ingress is required.
  // Questions, future plans, quoted reports and negation cannot supply it.
  const reports = clauses(currentInput).filter(part => /^我(?:终于|刚刚|刚|今天|已经|总算|现在|真的|也|亲自|自己|成功|花了很久)*完成了[^“”"‘’？?]+$/u.test(part))
  const targets = reports.map(part => part.split('完成了')[1]).filter(Boolean)
  return targets.some((target) => {
    const genericProject = target.endsWith('项目')
    return parts.every((part) => {
      const acknowledgment = part.match(/^(?:你(?:的|那个|这件)?|这件|那个)?(.+?)(?:终于|总算|已经)?(?:完成了?|告一段落了?)$/u)
      if (!acknowledgment)
        return false
      const object = acknowledgment[1].replace(/(?:终于|总算|已经)$/u, '')
      return object === target || (genericProject && (/^(?:(?:拖了|忙了)(?:这么|那么|很)久的)?项目$/u.test(object) || /^(?:(?:拖了|忙了)(?:这么|那么|很)久的)?事情$/u.test(object)))
    })
  })
}
