export function cleanupAlicizationAcceptedMainChatStartFailure(input: {
  clearPreparationDeadline: () => void
  finishRun: () => void
  releaseForeground: () => void
}) {
  input.clearPreparationDeadline()
  input.finishRun()
  input.releaseForeground()
}
