export function cleanupAlicizationAcceptedMainChatStartFailure(input: {
  clearPreparationDeadline: () => void
  abortController: () => void
  controllerAlreadyAborted?: boolean
  finishRun: () => void
  releaseForeground: () => void
}) {
  input.clearPreparationDeadline()
  if (!input.controllerAlreadyAborted)
    input.abortController()
  input.finishRun()
  input.releaseForeground()
}
