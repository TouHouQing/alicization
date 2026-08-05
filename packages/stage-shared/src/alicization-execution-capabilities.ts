export const alicizationExecutionCapabilityChannels = [
  'cli',
  'codex',
  'claude-code',
  'openclaw',
  'openfang',
  'browser',
  'software',
  'desktop',
] as const

export type AlicizationExecutionCapabilityChannel = typeof alicizationExecutionCapabilityChannels[number]

export const alicizationExecutorToolNames = [
  'executor_run_cli',
  'executor_run_codex',
  'executor_run_claude_code',
  'executor_run_local_visual',
  'executor_run_openclaw',
  'browser_open_url',
  'browser_search_web',
  'browser_read_page',
  'browser_click_element',
  'browser_type_text',
  'browser_navigate',
  'browser_scroll',
  'browser_wait',
  'desktop_inspect_scene',
  'desktop_list_interactables',
  'desktop_click_element',
  'desktop_type_text',
  'desktop_press_keys',
  'desktop_open_application',
  'desktop_wait',
] as const

export type AlicizationExecutorToolName = typeof alicizationExecutorToolNames[number]

export type AlicizationExecutionDispatchChannel = 'cli' | 'codex' | 'claude-code' | 'openclaw'

export type AlicizationExecutionRoutingChannel = AlicizationExecutionDispatchChannel | 'browser' | 'software' | 'desktop'

export interface AlicizationKnownWebsiteResolution {
  label: string
  matchedAlias: string
  site: string
  url: string
}
