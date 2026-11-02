import { projectInspectionDirective } from './runtime-inspection-directive'

/**
 * A request to invent prose is not a continuation of looking at the desktop.
 * Explicit visual source instructions still pass through the inspection gate.
 */
export function isCreativeRequestWithoutVisualSource(message: string) {
  const text = projectInspectionDirective(message).text
  const composition = /(?:写|创作|撰写|描写|续写|生成).{0,40}(?:散文|文章|故事|小说|诗|文案|歌词|剧本|台词|作文|段落)|[一二三四五六七八九十百千\d]+个?(?:字|短句|句).{0,12}(?:描写|描述)|\b(?:write|compose|invent|create).{1,50}\b(?:prose|essay|story|poem|fiction|lyrics)\b|(?:物語|詩|小説|作文).{0,24}(?:書いて|書く|創作)/iu.test(text)
  if (!composition)
    return false
  const visualSource = /(?:根据|基于|参照|参考|照着|请看|看看|查看|观察|点评|识别).{0,40}(?:屏幕|桌面|窗口|页面|截图|照片|图片|画面)|(?:当前|眼前|这张|这幅).{0,12}(?:屏幕|桌面|窗口|页面|截图|照片|图片|画面)|\b(?:based on|from|using|look at).{1,40}\b(?:screen|desktop|window|screenshot|photo|image|picture)\b|\b(?:this|current)\s+(?:screen|screenshot|photo|image|picture)\b|(?:この|画面|スクリーン).{0,20}(?:見て|もとに)/iu.test(text)
  return !visualSource
}
