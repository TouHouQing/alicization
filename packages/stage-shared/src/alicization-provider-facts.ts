export function buildAlicizationProviderFactBlock(type: string, data: unknown) {
  return JSON.stringify({ type, data })
}
