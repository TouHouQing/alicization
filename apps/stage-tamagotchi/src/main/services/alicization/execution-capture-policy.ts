/** The current host input can narrow execution to semantic controls. */
export function hostExcludesExecutionCapture(text: string | null | undefined) {
  return /(?:禁止|不要|不)(?:进行|使用)?(?:截图|截屏|屏幕观察|屏幕捕获)|\b(?:no|without)\s+(?:screenshots?|screen\s+capture)\b/iu.test(text ?? '')
}

export function assertExecutionCaptureAllowed(text: string | null | undefined) {
  if (hostExcludesExecutionCapture(text)) {
    const message = 'The current host request excludes screenshots or screen capture. Use the available desktop_list_interactables, desktop_type_text and desktop_click_element tools for semantic controls, re-observing after each mutation. A visual task cannot satisfy this restriction.'
    throw Object.assign(new Error(message), { name: 'AlicizationExecutionCapturePolicyError', failureKind: 'tool-execution', errorCode: 'LOCAL_VISUAL_CAPTURE_NOT_AUTHORIZED', errorMessage: message })
  }
}
