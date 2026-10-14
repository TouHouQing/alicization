// Adapted from met4citizen/TalkingHead, MIT, Mika Suominen (2023-2024).
// Source b3e277b3b46f88e557bf28a2c5612a5b04e075c3, sigmoidFactory.
// Changes: fixed sharpness, finite input, smoothstep for zero endpoint velocity.
// Upstream license ships in desktop resources/licenses/talkinghead-license.txt.
const sigmoidBase = (value: number) => 1 / (1 + Math.exp(-5 * value)) - 0.5
const correction = 0.5 / sigmoidBase(1)
export function interactionEase(value: number) {
  const bounded = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0
  if (bounded === 0 || bounded === 1)
    return bounded
  const smooth = bounded * bounded * (3 - 2 * bounded)
  return Math.max(0, Math.min(1, correction * sigmoidBase(2 * smooth - 1) + 0.5))
}

/** Preparation, a sustained stroke, and release; always returns to baseline. */
export function interactionGestureEnvelope(progress: number) {
  if (!Number.isFinite(progress) || progress <= 0 || progress >= 1)
    return 0
  return progress < 0.28 ? interactionEase(progress / 0.28) : progress <= 0.6 ? 1 : 1 - interactionEase((progress - 0.6) / 0.4)
}
