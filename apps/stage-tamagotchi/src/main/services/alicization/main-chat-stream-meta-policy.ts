export function shouldEmitAlicizationChatMetaUpdate(input: {
  delta: string
  reply: string
  previousReply: string
}) {
  const normalizedReply = input.reply.trim()
  if (!normalizedReply)
    return false

  const previousReply = input.previousReply.trim()
  const growth = normalizedReply.length - previousReply.length
  const delta = input.delta
  const hasHardBoundary = /[.!?。！？\n]/.test(delta)
  const hasSoftBoundary = /[,，、:：;；]/.test(delta)

  if (!previousReply)
    return normalizedReply.length >= 8 || hasHardBoundary
  if (growth >= 24)
    return true
  if (hasHardBoundary)
    return growth >= 4
  if (hasSoftBoundary)
    return growth >= 8
  return false
}
