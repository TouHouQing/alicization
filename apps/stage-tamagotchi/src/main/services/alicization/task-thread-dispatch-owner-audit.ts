import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

export type AlicizationTaskThreadDispatchOwnerMode
  = 'invoke-dispatch-owner'
    | 'gateway-dispatch-owner'
    | 'runtime-bridge-owner'
    | 'autonomy-dispatch-owner'
    | 'subconscious-bridge-owner'
    | 'orchestrator-dispatch-owner'

export interface AlicizationTaskThreadDispatchOwnerAuditEntry {
  relativePath: string
  mode: AlicizationTaskThreadDispatchOwnerMode
  responsibility: string
}

function toServiceRelativePath(absolutePath: string) {
  return absolutePath.split('/apps/stage-tamagotchi/src/main/services/alicization/')[1] ?? absolutePath
}

const dispatchHelperImportNeedle = 'import { dispatchTaskThread } from \'./task-thread-dispatcher\''
const invokeHandlerDispatchNeedle = 'registerInvokeHandler(electronAlicizationDispatchTaskThread'
const directDispatchReturnNeedle = 'return await dispatchTaskThread({'
const gatewayDispatchNeedle = 'const dispatchResult = await options.dispatchTaskThread({'
const gatewayAuditNeedle = 'appendAuditLog: options.appendAuditLog,'
const runtimeExecutionBridgeNeedle = 'dispatchTaskThread: invocation => dispatchTaskThreadWithExecutionDelivery(invocation)'
const runtimeAutonomyBridgeNeedle = 'dispatchAutonomyTaskThread: async (payload: any) => await dispatchTaskThreadWithExecutionDelivery({'
const autonomyDispatchNeedle = 'await input.dispatchTaskThread(buildAutonomousTaskDispatchInput({'
const autonomyEligibilityNeedle = 'actuationPlan.task.autoDispatchEligible'
const subconsciousDispatchBridgeNeedle = 'dispatchTaskThread: async (payload: any) => await dispatchAutonomyTaskThread(payload)'

export function collectAlicizationExecutionDispatchOwnerFiles(rootDir: string) {
  const queued = [rootDir]
  const discovered = new Set<string>()

  while (queued.length > 0) {
    const currentDir = queued.pop()
    if (!currentDir)
      continue

    for (const entry of readdirSync(currentDir, { withFileTypes: true })) {
      const absolutePath = join(currentDir, entry.name)
      if (entry.isDirectory()) {
        queued.push(absolutePath)
        continue
      }
      if (!entry.isFile() || !entry.name.endsWith('.ts') || entry.name.endsWith('.test.ts') || entry.name.endsWith('-audit.ts'))
        continue

      const source = readFileSync(absolutePath, 'utf8')
      const relativePath = toServiceRelativePath(absolutePath)

      const directlyImportsDispatchHelper = source.includes(dispatchHelperImportNeedle)
      const ownsInvokeDispatchEntry
        = source.includes(invokeHandlerDispatchNeedle)
          && source.includes(directDispatchReturnNeedle)
      const ownsGatewayDispatchEntry
        = source.includes(gatewayDispatchNeedle)
          && source.includes(gatewayAuditNeedle)
      const ownsRuntimeDispatchBridge
        = source.includes(runtimeExecutionBridgeNeedle)
          && source.includes(runtimeAutonomyBridgeNeedle)
      const ownsAutonomyAutoDispatchEntry
        = source.includes(autonomyDispatchNeedle)
          && source.includes(autonomyEligibilityNeedle)
      const ownsSubconsciousDispatchBridge = source.includes(subconsciousDispatchBridgeNeedle)

      if (
        relativePath !== 'task-thread-dispatcher.ts'
        && (
          (directlyImportsDispatchHelper && source.includes('dispatchTaskThread('))
          || ownsInvokeDispatchEntry
          || ownsGatewayDispatchEntry
          || ownsRuntimeDispatchBridge
          || ownsAutonomyAutoDispatchEntry
          || ownsSubconsciousDispatchBridge
        )
      ) {
        discovered.add(relativePath)
      }
    }
  }

  return [...discovered].sort()
}

export const alicizationTaskThreadDispatchOwnerAuditRegistry = [
  {
    relativePath: 'autonomy-actuation.ts',
    mode: 'autonomy-dispatch-owner',
    responsibility: 'Autonomy dispatch requires explicit eligibility and a routed task thread.',
  },
  {
    relativePath: 'executor-runtime.ts',
    mode: 'gateway-dispatch-owner',
    responsibility: 'Executor dispatch preserves kill-switch state, audit wiring, and thread identity.',
  },
  {
    relativePath: 'runtime-invoke-handlers-task.ts',
    mode: 'invoke-dispatch-owner',
    responsibility: 'Invoke dispatch preserves kill-switch and audit wiring before execution.',
  },
  {
    relativePath: 'runtime-subconscious-tick.ts',
    mode: 'subconscious-bridge-owner',
    responsibility: 'Deferred autonomy dispatch re-enters the runtime-owned execution bridge.',
  },
  {
    relativePath: 'runtime.ts',
    mode: 'runtime-bridge-owner',
    responsibility: 'The desktop runtime owns execution delivery around task-thread dispatch.',
  },
  {
    relativePath: 'task-thread-orchestrator.ts',
    mode: 'orchestrator-dispatch-owner',
    responsibility: 'The orchestrator keeps direct dispatch behind its audited dispatch seam.',
  },
] as const satisfies readonly AlicizationTaskThreadDispatchOwnerAuditEntry[]

export function resolveAlicizationTaskThreadDispatchOwnerAuditRegistry() {
  return alicizationTaskThreadDispatchOwnerAuditRegistry
}

export function resolveAlicizationTaskThreadDispatchOwnerAuditFiles() {
  return alicizationTaskThreadDispatchOwnerAuditRegistry.map(entry => entry.relativePath)
}

export function resolveAlicizationTaskThreadDispatchOwnerMode(relativePath: string) {
  return alicizationTaskThreadDispatchOwnerAuditRegistry.find(entry => entry.relativePath === relativePath)?.mode ?? null
}
