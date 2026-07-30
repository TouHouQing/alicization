import { sanitizeText } from './runtime-soul'

export interface AlicizationInlineExecutionSurfaceInput {
  channel: string
  status: 'completed' | 'failed' | 'blocked' | 'cancelled' | 'queued' | 'running'
  goal: string
  summary: string
  outcome: string
}

export function asAlicizationInlineExecutionSurfaceInput(
  toolName: string,
  result: unknown,
): AlicizationInlineExecutionSurfaceInput | null {
  if (!result || typeof result !== 'object' || Array.isArray(result))
    return null

  const payload = result as Record<string, unknown>
  const normalizedToolName = sanitizeText(toolName, '').toLowerCase()
  const selectedChannel = sanitizeText(payload.selectedChannel, '')
    || sanitizeText(payload.channel, '')
    || (normalizedToolName === 'executor_run_cli'
      ? 'cli'
      : normalizedToolName === 'executor_run_codex'
        ? 'codex'
        : normalizedToolName === 'executor_run_claude_code'
          ? 'claude-code'
          : normalizedToolName === 'executor_run_local_visual'
            ? /browser|page|tab|网页|浏览器|页面/u.test(`${sanitizeText(payload.kind, '')} ${sanitizeText(payload.goal, '')} ${sanitizeText(payload.summary, '')}`)
              ? 'browser'
              : /software|app|应用|软件/u.test(`${sanitizeText(payload.kind, '')} ${sanitizeText(payload.goal, '')} ${sanitizeText(payload.summary, '')}`)
                ? 'software'
                : 'desktop'
            : normalizedToolName === 'executor_run_openclaw'
              ? 'openclaw'
              : normalizedToolName === 'browser_open_url'
                || normalizedToolName === 'browser_search_web'
                || normalizedToolName === 'browser_read_page'
                || normalizedToolName === 'browser_click_element'
                || normalizedToolName === 'browser_type_text'
                || normalizedToolName === 'browser_navigate'
                || normalizedToolName === 'browser_scroll'
                || normalizedToolName === 'browser_wait'
                ? 'browser'
                : normalizedToolName === 'desktop_inspect_scene'
                  || normalizedToolName === 'desktop_list_interactables'
                  || normalizedToolName === 'desktop_click_element'
                  || normalizedToolName === 'desktop_type_text'
                  || normalizedToolName === 'desktop_press_keys'
                  || normalizedToolName === 'desktop_wait'
                  ? 'desktop'
                  : normalizedToolName === 'desktop_open_application'
                    ? 'desktop'
                    : 'executor')
  const status = sanitizeText(payload.threadStatus, '').toLowerCase()
    || sanitizeText(payload.status, '').toLowerCase()
    || (payload.ok === true ? 'completed' : payload.ok === false ? 'failed' : '')
  const normalizedStatus = (
    status === 'completed'
    || status === 'failed'
    || status === 'blocked'
    || status === 'cancelled'
    || status === 'queued'
    || status === 'running'
  )
    ? status
    : 'failed'
  const summary = sanitizeText(payload.summary, '')
  const output = typeof payload.output === 'string'
    ? payload.output
    : payload.output != null
      ? JSON.stringify(payload.output)
      : ''
  const outcome = sanitizeText(output, '')
  const goal = sanitizeText(payload.goal, '')
    || summary
    || 'the current task'

  return {
    channel: selectedChannel,
    status: normalizedStatus,
    goal,
    summary,
    outcome,
  }
}
