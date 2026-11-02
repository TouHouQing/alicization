import type { BrowserWorkBinding } from '../../../../shared/execution-contracts'

export interface ProcedureFormFixtureInput {
  caseId: string
  fields: Array<{ label: string, text: string }>
  uploads?: Array<{ label: string, files: Array<{ name: string, bytes: number, sha256: string }> }>
  submitLabel: string
  receiptText: string
  fault?: 'page-changed' | 'page-missing' | 'control-missing' | 'control-ambiguous' | 'submission-refused'
}

export interface ProcedureFormObservation { requests: number, accepted: number, refused: number, observedText: string | null }

/** A disposable browser owned by an evaluation, never the user's selected browser. */
export interface ProcedureBrowserReplay {
  prepare: (input: { caseId: string, text: string, missing?: boolean }) => Promise<{ url: string }>
  preparePages: (input: { caseId: string, pages: Array<{ id: string, text: string, missing?: boolean }> }) => Promise<{ urls: Record<string, string> }>
  prepareForm?: (input: ProcedureFormFixtureInput) => Promise<{ url: string, expectedText: string }>
  inspectForm?: () => ProcedureFormObservation
  approvalCount?: () => number
  binding: BrowserWorkBinding
  isCurrent: (binding: BrowserWorkBinding | undefined) => boolean
  tools: Record<'tool.browser_open_url' | 'tool.browser_read_page', (input: Record<string, unknown>, signal: AbortSignal) => Promise<unknown>> & Partial<Record<'tool.browser_type_text' | 'tool.browser_upload_files' | 'tool.browser_click_element' | 'tool.browser_wait', (input: Record<string, unknown>, signal: AbortSignal) => Promise<unknown>>>
  dispose: () => Promise<void>
}

export type ProcedureBrowserReplayFactory = (root: string, signal: AbortSignal) => Promise<ProcedureBrowserReplay>
