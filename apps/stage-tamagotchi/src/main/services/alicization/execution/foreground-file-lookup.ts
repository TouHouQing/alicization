/**
 * Prefer direct observations for an explicit, immediate read-only file lookup.
 * Ambiguous requests retain the durable planner. This only selects tools; each
 * actual read still requires its normal source, target, budget and risk checks.
 */
export function isForegroundFileLookup(userText: string | null | undefined) {
  if (!userText || userText.length > 8000 || !/只读|read[- ]only/iu.test(userText))
    return false
  if (!/[a-z]:[\\/]|\\\\[^\\\s]+\\/iu.test(userText) || !/搜索|查找|\bsearch\b|\bfind\b/iu.test(userText) || !/读取|读出|\bread\s+(?:the|all|each|matching|matched|files?|its|them)\b/iu.test(userText))
    return false
  const request = userText
    .replace(/(?:不|不要|禁止|无需)(?:修改|创建|写入|删除|覆盖|保存|调用)[^\n，,。.!;；]{0,160}/gu, '')
    .replace(/\b(?:do not|don't|never|without)\s+(?:modify|create|write|delete|overwrite|save)[^\n,.;]{0,160}/giu, '')
  return !/life_execute_work_plan|计划|后台|持续|监控|明天|每天|每周|定时|提醒|稍后|保存|写入|创建|修改|删除|覆盖|上传|下载|支付|提交|运行|\b(?:plan|background|monitor|schedule|tomorrow|later|save|write|create|modify|delete|upload|download|submit|execute)\b/iu.test(request)
}
