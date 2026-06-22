import type { AlicizationProjectStateDirectGatewayAuditTarget } from './project-state-brief'

import ts from 'typescript'

import {

  alicizationProjectStateDirectGatewayAuditTargets,
} from './project-state-brief'

export {
  isAlicizationProjectStateAuditedMainGatewaySource,
  isAlicizationProjectStateUnauditedMainGatewaySource,
  resolveAlicizationProjectStateAuditFamilyForMainGatewaySource,
} from './project-state-gateway-contract'

export type {
  AlicizationMainGatewayBaseGenerateTextInput,
  AlicizationMainGatewayGenerateTextProvider,
  AlicizationMainGatewayGenerateTextProviderOptions,
  AlicizationMainGatewaySource,
  AlicizationProjectStateGatewayInjectionMode,
} from './project-state-gateway-contract'

type AlicizationProjectStateGatewayInjectionMode = import('./project-state-gateway-contract').AlicizationProjectStateGatewayInjectionMode

export interface AlicizationProjectStateGatewayCallsiteEvidence {
  family: AlicizationProjectStateDirectGatewayAuditTarget
  source: string
  extraSystemBlocks: readonly string[]
  extraSystemBlocksExpression: string | null
  system: string | null
  callText: string
  sourceText?: string | null
}

function collectCallExpressions(sourceText: string) {
  const sourceFile = ts.createSourceFile('source.ts', sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
  const calls: ts.CallExpression[] = []
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node))
      calls.push(node)
    node.forEachChild(visit)
  }
  visit(sourceFile)
  return calls
}

function isObjectLiteralExpression(argument: ts.Expression | undefined): argument is ts.ObjectLiteralExpression {
  return Boolean(argument && ts.isObjectLiteralExpression(argument))
}

function findProperty(objectLiteral: ts.ObjectLiteralExpression, propertyName: string) {
  return objectLiteral.properties.find((node) => {
    if (!ts.isPropertyAssignment(node))
      return false
    if (!ts.isIdentifier(node.name) && !ts.isStringLiteral(node.name))
      return false
    return node.name.text === propertyName
  })
}

function readStringLiteralProperty(objectLiteral: ts.ObjectLiteralExpression, propertyName: string) {
  const property = findProperty(objectLiteral, propertyName)
  if (!property || !ts.isPropertyAssignment(property))
    return null
  if (ts.isStringLiteral(property.initializer) || ts.isNoSubstitutionTemplateLiteral(property.initializer))
    return property.initializer.text
  return null
}

function readArrayTextProperty(objectLiteral: ts.ObjectLiteralExpression, propertyName: string) {
  const property = findProperty(objectLiteral, propertyName)
  if (!property || !ts.isPropertyAssignment(property))
    return [] as string[]
  if (!ts.isArrayLiteralExpression(property.initializer))
    return [] as string[]
  return property.initializer.elements.map(element => element.getText())
}

function readExpressionPropertyText(objectLiteral: ts.ObjectLiteralExpression, propertyName: string) {
  const property = findProperty(objectLiteral, propertyName)
  if (!property || !ts.isPropertyAssignment(property))
    return null
  return property.initializer.getText()
}

function collectGatewayCallEvidence(input: {
  sourceText: string
  calleeTexts: string[]
  familyBySource: Partial<Record<string, AlicizationProjectStateDirectGatewayAuditTarget>>
}) {
  const calls = collectCallExpressions(input.sourceText)
  return calls
    .filter(call => input.calleeTexts.includes(call.expression.getText()))
    .flatMap((call) => {
      const options = isObjectLiteralExpression(call.arguments[0]) ? call.arguments[0] : null
      if (!options)
        return []

      const source = readStringLiteralProperty(options, 'source')
      if (!source)
        return []

      const family = input.familyBySource[source]
      if (!family)
        return []

      return [{
        family,
        source,
        extraSystemBlocks: readArrayTextProperty(options, 'extraSystemBlocks'),
        extraSystemBlocksExpression: readExpressionPropertyText(options, 'extraSystemBlocks'),
        system: readExpressionPropertyText(options, 'system'),
        callText: call.getText(),
        sourceText: input.sourceText,
      } satisfies AlicizationProjectStateGatewayCallsiteEvidence]
    })
}

export function deriveAlicizationProjectStateGatewayAuditFromSources(input: {
  runtimeSource: string
  providerPlanningSource: string
  mindStateSource: string
  executionDeliverySource: string
  oneShotSource: string
}) {
  const evidence = [
    ...collectGatewayCallEvidence({
      sourceText: input.runtimeSource,
      calleeTexts: ['generateMainGatewayText', 'mainGatewayTextProvider'],
      familyBySource: {
        dream: 'runtime.ts:dream-reminder-proactive-reforge',
        reminder: 'runtime.ts:dream-reminder-proactive-reforge',
        proactive: 'runtime.ts:dream-reminder-proactive-reforge',
      },
    }),
    ...collectGatewayCallEvidence({
      sourceText: input.providerPlanningSource,
      calleeTexts: ['input.generateMainGatewayText'],
      familyBySource: {
        'counterfactual-deliberation': 'memory-os/provider-planning.ts:recollection-and-deliberation',
      },
    }),
    ...collectGatewayCallEvidence({
      sourceText: input.mindStateSource,
      calleeTexts: ['generateMainGatewayText'],
      familyBySource: {
        'subjective-inference': 'runtime-mind-state.ts:dialogue-semantics-and-subjective-inference',
        'dialogue-turn-semantics': 'runtime-mind-state.ts:dialogue-semantics-and-subjective-inference',
      },
    }),
    ...collectGatewayCallEvidence({
      sourceText: input.executionDeliverySource,
      calleeTexts: ['options.generateMainGatewayText'],
      familyBySource: {
        'execution-callback': 'runtime-execution-delivery.ts:execution-callback',
      },
    }),
    ...collectGatewayCallEvidence({
      sourceText: input.oneShotSource,
      calleeTexts: ['generateMainGatewayText'],
      familyBySource: {
        'screen-semantic': 'runtime-main-gateway-one-shot.ts:screen-semantic-and-scene-appraisal',
        'scene-appraisal': 'runtime-main-gateway-one-shot.ts:screen-semantic-and-scene-appraisal',
      },
    }),
  ]

  const families = [...new Set(evidence.map(item => item.family))]
    .filter((family): family is AlicizationProjectStateDirectGatewayAuditTarget => alicizationProjectStateDirectGatewayAuditTargets.includes(family))
    .sort()

  return {
    families,
    evidence,
  }
}

export function callsiteCarriesProjectStateContext(evidence: AlicizationProjectStateGatewayCallsiteEvidence) {
  return resolveAlicizationProjectStateGatewayInjectionMode(evidence) !== 'missing'
}

export function resolveAlicizationProjectStateGatewayInjectionMode(
  evidence: AlicizationProjectStateGatewayCallsiteEvidence,
): AlicizationProjectStateGatewayInjectionMode {
  const selfBriefPattern = /SELF_BRIEF|ProjectSelfBrief/u
  const carriesExplicitSelfBrief = evidence.extraSystemBlocks
    .some(block => selfBriefPattern.test(block))
    || selfBriefPattern.test(evidence.extraSystemBlocksExpression ?? '')
    || selfBriefPattern.test(evidence.system ?? '')
    || false

  const carriesLocalExtraSystemBlock = evidence.extraSystemBlocks.includes('projectStateSystemBlock')
    || evidence.extraSystemBlocksExpression?.includes('projectStateSystemBlock')
    || false
  if (carriesLocalExtraSystemBlock)
    return 'extra-system-block-local'

  const carriesHelperExtraSystemBlock = evidence.extraSystemBlocks
    .some(block => block.includes('buildAlicizationProjectStateSystemBlock()') || block.includes('buildAlicizationProjectStateExtraSystemBlocks()'))
    || evidence.extraSystemBlocksExpression?.includes('buildAlicizationProjectStateExtraSystemBlocks()')
    || false
  if (carriesHelperExtraSystemBlock && carriesExplicitSelfBrief)
    return 'extra-system-block-self-brief'
  if (carriesHelperExtraSystemBlock)
    return 'extra-system-block-helper'

  if (evidence.system?.includes('withProjectStateSystem(') && carriesExplicitSelfBrief)
    return 'system-wrapper-self-brief'

  if (evidence.system?.includes('withProjectStateSystem('))
    return 'system-wrapper'

  if (evidence.extraSystemBlocksExpression?.includes('.concat(projectStateSystemBlock)'))
    return 'system-concat'

  const carriesUnifiedOneShotProjectStateRuntime = evidence.family === 'runtime-main-gateway-one-shot.ts:screen-semantic-and-scene-appraisal'
    && Boolean(evidence.sourceText?.includes('const projectStateClosureDashboard = buildAlicizationProjectStateClosureDashboard({'))
    && Boolean(evidence.sourceText?.includes('{ role: \'system\', content: projectStateSystemBlock } as Message,'))
    && Boolean(evidence.sourceText?.includes('{ role: \'system\', content: projectStateClosureDashboard } as Message,'))
    && Boolean(evidence.sourceText?.includes('buildOneShotSourceProjectSelfBriefs({'))
    && Boolean(evidence.sourceText?.includes('carriesAlicizationCanonicalProjectState'))
    && Boolean(evidence.sourceText?.includes('main-gateway.one-shot-missing-project-state-context'))
    && Boolean(evidence.sourceText?.includes('action: \'missing-main-gateway-project-state-context\''))
    && Boolean(evidence.sourceText?.includes('if (!carriesAlicizationCanonicalProjectState(generationMessages)) {'))
  if (carriesUnifiedOneShotProjectStateRuntime)
    return 'one-shot-unified-runtime'

  return 'missing'
}
