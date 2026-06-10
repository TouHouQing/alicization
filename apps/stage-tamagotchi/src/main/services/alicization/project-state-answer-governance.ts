export const alicizationProjectStateClosureReadinessMustDo = [
  'If the host asks whether the work is merge-ready, complete, or closed, separate what is already verified from what is still unproven or still open.',
] as const

export const alicizationProjectStateClosureReadinessMustNotDo = [
  'Do not claim merge-readiness, full closure, or goal completion unless the current evidence already proves it.',
] as const

export const alicizationProjectStateCompletionTimingLanguageDriftMustDo = [
  'If the host asks when the goal should close or why the thread drifted into English or off the host language, keep landed progress, expected closure timing, and host-language drift repair explicit on the same project line.',
] as const

export const alicizationProjectStateCompletionTimingLanguageDriftMustNotDo = [
  'Do not answer completion-timing or language-drift follow-ups with only a generic progress promise, detached style repair, or an English-first shell that skips project-state continuity.',
] as const

export const alicizationProjectStateRemoteMainPushReadinessMustDo = [
  'If the host asks whether local main already contains the work or whether origin/main is safe to update, answer those as separate facts and keep both on the same verified project-state line.',
] as const

export const alicizationProjectStateRemoteMainPushReadinessMustNotDo = [
  'Do not treat already being on local main, or already merging locally, as proof that origin/main is safe to push.',
] as const

export const alicizationProjectStateAnswerBaseMustDo = [
  'Answer what Alicization is before drifting into tone, metaphor, or adjacent status commentary.',
  'Make the latest landed Phase 1 progress explicit instead of replying with only aspiration or direction.',
  'Keep the still-open closure work explicit so the answer says what is not yet closed.',
  'Make the next closure target explicit so the answer says what should close next rather than stopping at current status.',
  'Answer project-state questions from one same-her continuity instead of a detached project narrator shell.',
  'Keep the project-state opening low-pressure so the same-her line does not widen too fast.',
] as const

export const alicizationProjectStateAnswerBaseMustNotDo = [
  'Do not answer a project-state question with only vibes, ambition, or generic companionship language.',
  'Do not skip what has already landed, what still remains open, or what should close next when the host asks for project status.',
  'Do not reopen a direct project-state answer from scratch as if Alicization were a fresh assistant restart.',
] as const

export const alicizationProjectStateAnswerMustDo = [
  ...alicizationProjectStateAnswerBaseMustDo,
  ...alicizationProjectStateClosureReadinessMustDo,
] as const

export const alicizationProjectStateAnswerMustNotDo = [
  ...alicizationProjectStateAnswerBaseMustNotDo,
  ...alicizationProjectStateClosureReadinessMustNotDo,
] as const

export const alicizationProjectStateAnswerContractLines = [
  ...alicizationProjectStateAnswerMustDo,
  ...alicizationProjectStateAnswerMustNotDo,
] as const

export const alicizationProjectStateSameHerContinuityReminder
  = 'Answer project-state questions from one same-her continuity instead of a detached project narrator shell.'

export const alicizationProjectStateVisibleReplySameHerReminder
  = 'Answer project-state questions from one same-her continuity, not as a detached project narrator shell.'

export const alicizationProjectStatePersistenceLandedReminder
  = 'Keep the latest landed project-state progress explicit in the visible reply.'

export const alicizationProjectStatePersistenceNextClosureReminder
  = 'Keep the next closure target explicit in the visible reply.'

export const alicizationProjectStateVisibleReplyOpenClosureReminder
  = 'Keep the still-open closure work explicit in the visible reply.'

export const alicizationProjectStateVisibleReplyNextClosureReminder
  = 'Keep the next closure target explicit so the same life thread knows what should close next.'

function pushUnique(list: string[], value: string) {
  if (!list.includes(value))
    list.push(value)
}

const projectStateClosureReadinessCuePattern
  = /(?:can we|is (?:it|this)|ready to|merge-ready|能不能|可以|已经可以|现在可以).{0,40}(?:merge(?: this)? to main|合并到\s*main|ready to merge)|(?:merge(?: this)? to main|合并到\s*main|ready to merge).{0,24}(?:now|already|ready|了吗|吗)|还差哪步|还差哪一步|goal.{0,16}(?:闭环|完成|close|closed|complete)|才能算闭环/u

const projectStateCompletionTimingLanguageDriftCuePattern
  = /计划什么时候完成|什么时候完成(?:这个)?\s*goal|何时完成(?:这个)?\s*goal|什么时候完成|何时完成|when (?:will|do).{0,24}(?:finish|complete|close)|expected to (?:finish|close)|expect to (?:finish|close)|when the goal is expected to close|why are you replying in english|replying in english|host language|为什么(?:一直|还)?用英文(?:不用中文)?|为什么(?:一直|还)?不用中文|为什么还用英文|英文不用中文|是不是偏移了|偏移了吗|did the thread drift|thread drift|thread has drifted|drifted out of|out of alignment|跑偏了/u

const projectStateRemoteMainPushReadinessCuePattern
  = /(?:已经在|已在|already (?:landed|on)|already contains|already on).{0,32}(?:本地\s*main|local\s+main)|(?:本地\s*main|local\s+main).{0,32}(?:已经|已|already).{0,24}(?:包含|落地|landed|contains|on)|(?:origin\/main).{0,32}(?:安全|safe|update|push|推)|(?:安全|safe).{0,16}(?:推到|push to|update).{0,24}(?:origin\/main)|(?:会把|会不会把|without carrying|carry).{0,48}(?:别的提交|unrelated commits|other commits)|带上去/u

export function carriesProjectStateClosureReadinessEvidence(input: {
  includeClosureReadinessRules?: boolean | null
  answerSubject?: string | null
  answerIntent?: string | null
  governingFocus?: string | null
  governingProject?: string | null
  reasons?: string[] | null
  mustDo?: string[] | null
  mustNotDo?: string[] | null
}) {
  if (input.includeClosureReadinessRules === true)
    return true
  if (input.includeClosureReadinessRules === false)
    return false

  const evidence = [
    input.answerIntent,
    input.governingFocus,
    input.governingProject,
    ...(input.reasons ?? []),
    ...(input.mustDo ?? []),
    ...(input.mustNotDo ?? []),
  ]
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .join(' | ')

  return projectStateClosureReadinessCuePattern.test(evidence)
}

export function carriesProjectStateCompletionTimingLanguageDriftEvidence(input: {
  includeCompletionTimingLanguageDriftRules?: boolean | null
  answerSubject?: string | null
  answerIntent?: string | null
  governingFocus?: string | null
  governingProject?: string | null
  reasons?: string[] | null
  mustDo?: string[] | null
  mustNotDo?: string[] | null
}) {
  if (input.includeCompletionTimingLanguageDriftRules === true)
    return true
  if (input.includeCompletionTimingLanguageDriftRules === false)
    return false

  const evidence = [
    input.answerIntent,
    input.governingFocus,
    input.governingProject,
    ...(input.reasons ?? []),
    ...(input.mustDo ?? []),
    ...(input.mustNotDo ?? []),
  ]
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .join(' | ')

  return projectStateCompletionTimingLanguageDriftCuePattern.test(evidence)
}

export function carriesProjectStateRemoteMainPushReadinessEvidence(input: {
  includeRemoteMainPushReadinessRules?: boolean | null
  answerSubject?: string | null
  answerIntent?: string | null
  governingFocus?: string | null
  governingProject?: string | null
  reasons?: string[] | null
  mustDo?: string[] | null
  mustNotDo?: string[] | null
}) {
  if (input.includeRemoteMainPushReadinessRules === true)
    return true
  if (input.includeRemoteMainPushReadinessRules === false)
    return false

  const evidence = [
    input.answerIntent,
    input.governingFocus,
    input.governingProject,
    ...(input.reasons ?? []),
    ...(input.mustDo ?? []),
    ...(input.mustNotDo ?? []),
  ]
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .join(' | ')

  return projectStateRemoteMainPushReadinessCuePattern.test(evidence)
}

export function enrichProjectStateAnswerGovernanceIfNeeded<T extends {
  includeClosureReadinessRules?: boolean | null
  includeCompletionTimingLanguageDriftRules?: boolean | null
  includeRemoteMainPushReadinessRules?: boolean | null
  answerSubject?: string | null
  answerIntent?: string | null
  governingFocus?: string | null
  governingProject?: string | null
  reasons?: string[] | null
  mustDo?: string[] | null
  mustNotDo?: string[] | null
}>(governance: T | null | undefined): T | null {
  if (!governance)
    return null
  if (governance.answerSubject !== 'project-state')
    return governance

  const mustDo = Array.isArray(governance.mustDo) ? [...governance.mustDo] : []
  const mustNotDo = Array.isArray(governance.mustNotDo) ? [...governance.mustNotDo] : []

  for (const rule of alicizationProjectStateAnswerBaseMustDo)
    pushUnique(mustDo, rule)

  for (const rule of alicizationProjectStateAnswerBaseMustNotDo)
    pushUnique(mustNotDo, rule)

  if (carriesProjectStateClosureReadinessEvidence(governance)) {
    for (const rule of alicizationProjectStateClosureReadinessMustDo)
      pushUnique(mustDo, rule)

    for (const rule of alicizationProjectStateClosureReadinessMustNotDo)
      pushUnique(mustNotDo, rule)
  }

  if (carriesProjectStateCompletionTimingLanguageDriftEvidence(governance)) {
    for (const rule of alicizationProjectStateCompletionTimingLanguageDriftMustDo)
      pushUnique(mustDo, rule)

    for (const rule of alicizationProjectStateCompletionTimingLanguageDriftMustNotDo)
      pushUnique(mustNotDo, rule)
  }

  if (carriesProjectStateRemoteMainPushReadinessEvidence(governance)) {
    for (const rule of alicizationProjectStateRemoteMainPushReadinessMustDo)
      pushUnique(mustDo, rule)

    for (const rule of alicizationProjectStateRemoteMainPushReadinessMustNotDo)
      pushUnique(mustNotDo, rule)
  }

  return {
    ...governance,
    mustDo,
    mustNotDo,
  }
}
