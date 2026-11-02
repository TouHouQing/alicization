import type { CharacterPerformanceCapabilitiesManifest } from '@proj-alicization/stage-shared'

// Only direct, present requests in the current user's utterance authorize this
// small body vocabulary. Quoted instructions and capability questions do not.
export function resolveRequestedGesture(text: string | null | undefined, manifest?: CharacterPerformanceCapabilitiesManifest | null) {
  if (!text || !manifest)
    return null
  const unquoted = text.slice(0, 4_000)
    .replace(/```[\s\S]*?```|`[^`]*`|“[^”]*”|‘[^’]*’|「[^」]*」|『[^』]*』|"[^"]*"|'[^']*'/gu, '')
  const supported = new Set(manifest.supportedActions.map(action => action.key))
  for (const clause of unquoted.split(/[，。！？；\n,.!?;]/u)) {
    if (/不要|不用|不需要|无需|不必|[别写画]|(?<!能)不能|(?<!可)不可以|如果|假如|假设|翻译|解释|描述|举例|为什么|什么意思|他说|她说|听说|据说|输出|\b(?:don't|do not|never|if|explain|translate|describe|write|draw)\b/iu.test(clause))
      continue
    if (!/请|你(?:能|可以|轻轻|慢慢|稍微|只)|能不能|可不可以|麻烦|帮我|^\s*(?:现在)?(?:只|轻轻|慢慢|稍微)|\b(?:please|can you|could you|would you)\b/iu.test(clause))
      continue
    const candidates = /点(?:一下|一次|个)?头|\bnod\b/iu.test(clause)
      ? ['nod_soft', 'idle_gentle_nod', 'slow_nod', 'reassuring_nod', 'nod']
      : /摇(?:一下|一次|个)?头|\bshake your head\b/iu.test(clause)
        ? ['head_shake', 'shake_head']
        : /歪(?:一下|一次|个)?头|\btilt your head\b/iu.test(clause)
          ? ['head_tilt', 'tilt_head']
          : []
    const cue = candidates.find(candidate => supported.has(candidate))
    if (cue)
      return cue
  }
  return null
}
