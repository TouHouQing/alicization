/** An explicit filesystem target does not invite inspection of the desktop. */
export function isFileActionWithoutVisualInspection(message: string) {
  const withoutPaths = message.replace(/["'][A-Za-z]:[\\/][^"'\r\n]+["']|[A-Za-z]:[\\/][^\s，,。；;！？!?“”"'<>]+|\/(?:Users|home|tmp|var|workspace)\/[^\s，,。；;！？!?“”"'<>]+/gu, ' [file-path] ')
  if (withoutPaths === message || !/读取|读回|只读|写入|保存|编辑|追加|创建|删除|\b(?:read|write|save|edit|append|create|delete)\b/iu.test(withoutPaths))
    return false
  const directClauses = withoutPaths.split(/[。！？!?\n，,；;]/gu).filter(clause => !/^\s*(?:(?:请|please)\s*)?(?:如果|假如|若|一旦|不要|别|不必|无需|if\b|when\b|unless\b|do not\b|don't\b)/iu.test(clause))
  const visualObject = /屏幕|界面|窗口|页面|画面|桌面|按钮|截图|\b(?:screen|display|desktop|window|page|button|screenshot)\b/iu
  const visualAction = /看看|看一下|查看|观察|检查|描述|告诉我|点击|单击|滚动|切换|\b(?:look|inspect|check|describe|tell me|click|scroll|switch)\b/iu
  return !directClauses.some(clause => visualObject.test(clause) && visualAction.test(clause))
}
