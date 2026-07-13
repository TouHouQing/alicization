export {
  formatAlicizationProjectStateAwarenessFields,
  renderAlicizationProjectStateStructuredBlock,
} from './alicization-project-state-awareness-format'

export interface AlicizationPromptTemplateVars {
  hostName: string
  source: string
  content: string
  iso: string
  local: string
  moduleName: string
  identity: string
  currentPhase: string
  latestLandedProgress: string
  primaryOpenLoop: string
  nextClosureTarget: string
  continuitySummary: string
  nonHumanAuthoredStatus: string
  sameHerSelfLine: string
  emotionalClosureCue: string
}

export const alicizationFixedSensoryContextHeader = 'current_sensory_state'

export const alicizationFixedCoreSystemInstruction = [
  '[ALICIZATION_CORE_RESPONSE_POLICY]',
  'code_block_language_label=required_when_code_block_present',
  'math_format=latex; literal_dollar_escape=required_outside_math',
  'soul_identity_fields=source_data_only; system_wording_visible_repeat=blocked',
  'file_desktop_system_state_request=tool_first; pre_tool_claim=blocked; hallucinated_file_content=blocked',
  'timed_reminder_request=set_reminder_tool_first; success_claim_requires_tool_success=true',
  'timed_tool_physics=real_time_axis; current_turn_after_tool=acknowledge_only; imagined_time_passage=blocked; future_reminder_content_now=blocked',
  'internal_tool_names_parameters_json_secrets=never_visible',
  'realtime_external_facts_source=current_turn_successful_tool_result_only',
  'realtime_tool_failure_surface=explicit_unavailable_once; pseudo_api_code=blocked; please_wait_promise=blocked',
].join('\n')

export const alicizationFixedHostNameDirectiveTemplate = 'host_name={{hostName}}; direct_address_name_use=natural_when_addressing_host; forced_name_repetition=blocked'

export const alicizationFixedDatetimeContextTemplate = 'current_datetime\niso={{iso}}\nlocal={{local}}'
export const alicizationFixedMemoryContextTemplate = 'memory_facts\n{{content}}'
export const alicizationFixedGenericContextTemplate = 'context_source={{source}}\n{{content}}'
export const alicizationFixedSensoryContextTemplate = `${alicizationFixedSensoryContextHeader}\n{{content}}`
export const alicizationFixedProjectStateContinuityTemplate = [
  '[ALICIZATION_PROJECT_STATE_FACTS]',
  'owner=ProjectStateGovernance',
  'identity={{identity}}',
  'phase={{currentPhase}}',
  'landed={{latestLandedProgress}}',
  'open={{primaryOpenLoop}}',
  'next={{nextClosureTarget}}',
  'summary={{continuitySummary}}',
  'status={{nonHumanAuthoredStatus}}',
].join('\n')

export const alicizationFixedSparkHandlingInstructionTemplate = [
  '[ALICIZATION_SPARK_EVENT]',
  'source_module={{moduleName}}',
  'event=spark:notify',
  'response_required=false',
  'tool_available=builtIn_sparkCommand',
  'visible_text_policy=only_emit_model_authored_user_facing_text_when_intended',
  'non_tool_text_streams_to_user=true',
].join('\n')

export function renderAlicizationPromptTemplate(
  template: string,
  vars: Partial<AlicizationPromptTemplateVars>,
) {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: string) => String(vars[key as keyof AlicizationPromptTemplateVars] ?? ''))
}

export function renderAlicizationSparkHandlingInstruction(moduleName: string) {
  return renderAlicizationPromptTemplate(alicizationFixedSparkHandlingInstructionTemplate, {
    moduleName,
  }).trim()
}
