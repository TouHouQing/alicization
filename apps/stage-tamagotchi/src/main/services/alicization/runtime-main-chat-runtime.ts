import { createAlicizationInspectionIntentRuntime } from './runtime-inspection-intent'
import { createAlicizationMainChatContextRuntime } from './runtime-main-chat-context'
import { createAlicizationMainChatPreludeRuntime } from './runtime-main-chat-prelude'

type MainChatContextOptions = Parameters<typeof createAlicizationMainChatContextRuntime>[0]
type InspectionIntentOptions = Parameters<typeof createAlicizationInspectionIntentRuntime>[0]
type MainChatPreludeOptions = Parameters<typeof createAlicizationMainChatPreludeRuntime>[0]

interface CreateAlicizationRuntimeMainChatRuntimeOptions {
  context: Omit<MainChatContextOptions, 'resolveInspectionIntentFromMessageHistory'>
  inspection: InspectionIntentOptions
}

export function createAlicizationRuntimeMainChatRuntime(
  options: CreateAlicizationRuntimeMainChatRuntimeOptions,
) {
  let resolveInspectionIntentFromMessageHistory: MainChatContextOptions['resolveInspectionIntentFromMessageHistory']
    = () => false

  const mainChatContextRuntime = createAlicizationMainChatContextRuntime({
    ...options.context,
    resolveInspectionIntentFromMessageHistory: input => resolveInspectionIntentFromMessageHistory(input),
  })
  const inspectionIntentRuntime = createAlicizationInspectionIntentRuntime(
    options.inspection,
  )

  const bindInspectionIntentFromMessageHistory = (
    next: MainChatContextOptions['resolveInspectionIntentFromMessageHistory'],
  ) => {
    resolveInspectionIntentFromMessageHistory = next
  }

  const createPreludeRuntime = (
    preludeOptions: Omit<
      MainChatPreludeOptions,
      | 'readLatestUserMessageText'
      | 'buildMainChatContextualString'
      | 'buildMainChatExecutionCallbackContext'
      | 'buildMainChatExecutionLedgerContext'
    >,
  ) => {
    return createAlicizationMainChatPreludeRuntime({
      ...preludeOptions,
      readLatestUserMessageText: mainChatContextRuntime.readLatestUserMessageText,
      buildMainChatContextualString: mainChatContextRuntime.buildMainChatContextualString,
      buildMainChatExecutionCallbackContext: mainChatContextRuntime.buildMainChatExecutionCallbackContext,
      buildMainChatExecutionLedgerContext: mainChatContextRuntime.buildMainChatExecutionLedgerContext,
    })
  }

  return {
    bindInspectionIntentFromMessageHistory,
    createPreludeRuntime,
    mainChatContextRuntime,
    inspectionIntentRuntime,
    ...mainChatContextRuntime,
    ...inspectionIntentRuntime,
  }
}

export type AlicizationRuntimeMainChatRuntime = ReturnType<typeof createAlicizationRuntimeMainChatRuntime>
