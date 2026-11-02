import type { AlicizationDbService } from '../db'
import type { createExecutionInterruptRegistry } from '../execution-interrupt-registry'
import type { ToolRegistry } from '../turn-os/tool-registry'
import type { ProcedureTemplate } from './procedure-template'
import type { WorkDelegationCapability } from './work-delegation-contracts'

export type DelegatedReplayMode = 'normal' | 'refused' | 'missing-artifact' | 'interrupted'
export interface ProcedureDelegatedReplay {
  prepare: (input: { template: ProcedureTemplate, arguments: Record<string, unknown>, directory: string, text: string, mode: DelegatedReplayMode }) => Promise<Record<string, unknown>>
  tools: Partial<Record<WorkDelegationCapability, (input: Record<string, unknown>, signal: AbortSignal) => Promise<unknown>>>
  snapshot: () => { approvals: number, denied: number, dispatches: number, writeObserved: number, interrupted: number, inFlight: number }
  dispose: () => Promise<void>
}
export type ProcedureDelegatedReplayFactory = (input: {
  root: string
  database: AlicizationDbService
  registry: ToolRegistry
  template: ProcedureTemplate
  interrupts: ReturnType<typeof createExecutionInterruptRegistry>
  signal: AbortSignal
}) => Promise<ProcedureDelegatedReplay>
