export const alicizationProjectStateClosureReadinessMustDo = [
  'host_question=merge_ready_or_complete_or_closed; verified_work=separate_from_unproven_or_open_work',
] as const

export const alicizationProjectStateClosureReadinessMustNotDo = [
  'merge_readiness_claim=requires_current_evidence; full_closure_claim=requires_current_evidence; goal_completion_claim=requires_current_evidence',
] as const

export const alicizationProjectStateCompletionTimingLanguageDriftMustDo = [
  'host_question=completion_timing_or_language_drift; landed_progress=explicit; expected_closure_timing=explicit; host_language_drift_repair=explicit; project_line=shared',
] as const

export const alicizationProjectStateCompletionTimingLanguageDriftMustNotDo = [
  'completion_timing_answer=not_generic_progress_promise; language_drift_answer=not_detached_style_repair; english_first_shell=blocked; project_state_review=required',
] as const

export const alicizationProjectStateRemoteMainPushReadinessMustDo = [
  'host_question=local_main_contains_work_or_origin_main_safe_to_update; local_main_fact=separate; origin_main_push_safety=separate; verified_project_state_line=shared',
] as const

export const alicizationProjectStateRemoteMainPushReadinessMustNotDo = [
  'local_main_contains_work_not_equal_origin_main_safe_to_push; local_merge_not_equal_origin_main_safe_to_push',
] as const

export const alicizationProjectStateAnswerBaseMustDo = [
  'project_state_answer=answer_first; tone_metaphor_adjacent_status=secondary',
  'latest_landed_progress=explicit; aspiration_only_answer=blocked',
  'still_open_closure_work=explicit',
  'next_closure_target=explicit; current_status_only=blocked',
  'project_state_answer_source=structured_project_state_context; detached_project_narrator_shell=blocked',
  'project_state_opening_pressure=low; continuity_context_widening=deferred',
] as const

export const alicizationProjectStateAnswerBaseMustNotDo = [
  'project_state_answer=vibes_only_or_ambition_only_or_generic_companionship_only_blocked',
  'project_status_answer_requires=landed_progress,open_work,next_closure',
  'direct_project_state_answer=fresh_assistant_restart_blocked',
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
  = 'project_state_answer_source=structured_project_state_context; detached_project_narrator_shell=blocked'

export const alicizationProjectStateVisibleReplySameHerReminder
  = 'project_state_visible_reply_source=structured_project_state_context; detached_project_narrator_shell=blocked'

export const alicizationProjectStatePersistenceLandedReminder
  = 'visible_reply_preserve=latest_landed_project_state_progress'

export const alicizationProjectStatePersistenceNextClosureReminder
  = 'visible_reply_preserve=next_closure_target'

export const alicizationProjectStateVisibleReplyOpenClosureReminder
  = 'visible_reply_preserve=still_open_closure_work'

export const alicizationProjectStateVisibleReplyNextClosureReminder
  = 'visible_reply_preserve=next_closure_target; project_state_governance_next_close=explicit'

function pushUnique(list: string[], value: string) {
  if (!list.includes(value))
    list.push(value)
}

const projectStateClosureReadinessCuePattern
  = /(?:can we|is (?:it|this)|ready to|merge-ready|能不能|可以|已经可以|现在可以).{0,40}(?:merge(?: this)? to main|合并到\s*main|ready to merge)|(?:merge(?: this)? to main|合并到\s*main|ready to merge).{0,24}(?:now|already|ready|了吗|吗)|还差哪步|还差哪一步|goal.{0,16}(?:闭环|完成|close|closed|complete)|才能算闭环/u

const projectStateCompletionTimingLanguageDriftCuePattern
  = /计划什么时候完成|什么时候完成(?:这个)?\s*goal|何时完成(?:这个)?\s*goal|什么时候完成|何时完成|when (?:will|do).{0,24}(?:finish|complete|close)|expected to (?:finish|close)|expect to (?:finish|close)|when the goal is expected to close|why are you replying in english|replying in english|host language|为什么(?:一直|还)?用英文(?:不用中文)?|为什么(?:一直|还)?不用中文|为什么还用英文|英文不用中文|是不是偏移了|偏移了吗|did the thread drift|thread drift|thread has drifted|drifted out of|out of alignment|跑偏了/u

const projectStateRemoteMainPushReadinessCuePattern
  = /(?:已经在|已在|already (?:landed|on)|already contains|already on).{0,32}(?:本地\s*main|local\s+main)|(?:本地\s*main|local\s+main).{0,32}(?:已经|已|already).{0,24}(?:包含|落地|landed|contains|on)|origin\/main.{0,32}(?:安全|safe|update|push|推)|(?:安全|safe).{0,16}(?:推到|push to|update).{0,24}origin\/main|(?:会把|会不会把|without carrying|carry).{0,48}(?:别的提交|unrelated commits|other commits)|带上去/u

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
