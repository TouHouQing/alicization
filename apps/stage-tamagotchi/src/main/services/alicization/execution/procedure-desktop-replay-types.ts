import type { ProcedureTemplate } from './procedure-template'

export type ProcedureDesktopFault = 'control-missing' | 'control-ambiguous' | 'save-refused' | 'saved-content-changed' | 'window-closed'
export interface ProcedureDesktopFixtureInput {
  caseId: string
  entryLabel: string
  saveLabel: string
  path: string
  fault?: ProcedureDesktopFault
}
export interface ProcedureDesktopObservation {
  saves: number
  refused: number
  content: string | null
  inFlight: number
}
export interface ProcedureDesktopReplay {
  prepare: (input: ProcedureDesktopFixtureInput) => Promise<{ windowTitle: string }>
  snapshot: () => ProcedureDesktopObservation
  approvalCount: () => number
  tools: Record<'tool.desktop_list_interactables' | 'tool.desktop_type_text' | 'tool.desktop_click_element', (input: Record<string, unknown>, signal: AbortSignal) => Promise<unknown>>
  dispose: () => Promise<void>
}
export type ProcedureDesktopReplayFactory = (input: { root: string, template: ProcedureTemplate, signal: AbortSignal }) => Promise<ProcedureDesktopReplay>
