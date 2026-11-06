import { projectInspectionDirective } from './runtime-inspection-directive'

/** Reading history, source code or plugin data does not continue screen watching. */
export function isAgentReadWithoutVisualSource(message: string) {
  const prose = projectInspectionDirective(message).text
  if (!/\b(?:life_search_sessions|life_language_query|life_programmatic_read|life_list_automations|life_schedule_work|life_cancel_automation|ext_\w+)\b/iu.test(prose))
    return false
  const directive = prose.replace(/“[^”]*”|「[^」]*」|『[^』]*』|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/gu, ' [quoted] ')
  const clauses = directive.split(/[。！？!?\n，,；;]/u)
  const currentVisual = /(?:现在|当前|眼前|目前).{0,16}(?:屏幕|桌面|窗口|界面|页面|画面)|\b(?:current|now|this)\s+(?:screen|desktop|window|display|page)\b/iu
  const visualAction = /看|查看|观察|检查|描述|\b(?:look|inspect|check|describe|show)\b/iu
  const directVisual = /^\s*(?:(?:[请再也]|帮我|然后|顺便|please|then)\s*)*(?:看看|看一下|查看|观察|检查|描述|look at|inspect|check|describe).{0,12}(?:屏幕|桌面|窗口|界面|页面|画面|screen|desktop|window|display|page)/iu
  return !clauses.some(clause => !/^\s*(?:如果|假如|若|不要|别|不必|无需|if\b|unless\b|do not\b|don't\b)/iu.test(clause) && ((currentVisual.test(clause) && visualAction.test(clause)) || directVisual.test(clause)))
}
