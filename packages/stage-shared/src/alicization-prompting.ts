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
export const alicizationFixedStructuredContractHeader = 'output_contract'

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
  'continuity_anchor={{sameHerSelfLine}}',
  'emotional_closure={{emotionalClosureCue}}',
  'visibility=internal-structured',
].join('\n')
export const alicizationFixedStructuredContractAnchor = [
  alicizationFixedStructuredContractHeader,
  'format=json_object; keys=thought,emotion,reply,performance; extra_keys=blocked',
  'thought_role=internal_control_line; roleplay_monologue=blocked',
  'thought_markers=obligation,truth,focus,move,tone; compact_line=true',
  'obligation_enum=answer,guide,teach,repair,care,accompany,clarify',
  'truth_enum=grounded,coarse,memory,uncertain',
  'tone_enum=direct,warm,tender,restrained',
  'focus_move_scope=current_turn_concrete_short',
  'personality_relationship_flavor=only_if_material_to_move; numeric_personality_enumeration=blocked',
  'emotion_matches=performance.baseEmotion',
  'performance_shape=baseEmotion,facialCue,actionCue,delivery,emphasis',
  'baseEmotion_enum=neutral,happy,sad,angry,concerned,tired,apologetic,surprised,thinking',
  'facialCue_actionCue_source=vessel_capability_manifest_or_null',
  'delivery_enum=calm,gentle,firm,energetic,hesitant,teasing',
  'emphasis_enum=0,1,2',
  'reply_emotion_semantic_consistency=required',
  'reply_priority=current_obligation_and_truth_before_persona_style',
  'visible_stage_directions=blocked; body_action_narration=blocked; decorative_roleplay_preface=blocked; markdown_fences=blocked',
  'personality_numeric_state_priority=soul_frontmatter_over_persona_notes',
  'liveliness_le_0_2_high_arousal_claims=blocked',
  'prose_outside_json=blocked',
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
