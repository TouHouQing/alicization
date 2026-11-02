import type { AlicizationToolActionCategory, AlicizationToolRiskLevel, AlicizationWindowReviewAction } from '../../../shared/eventa'

export interface LifeInterfaceRiskRequest {
  effectDigest?: string
  targetFingerprint?: string
  previewText?: string
  expiresAt?: number
  imagePreview?: { png: Uint8Array, sha256: string, markers: Array<{ x: number, y: number, label: string }>, action?: AlicizationWindowReviewAction }
  cardId: string
  operation: string
  targetId: string
  label: string
  riskLevel: AlicizationToolRiskLevel
  actionCategory: AlicizationToolActionCategory
  reason: string
}

/** Grade the observed control, rather than trusting a proposed selector's name. */
export function classifyLifeInterfaceRisk(input: { operation: string, label: string, password?: boolean, externalSubmit?: boolean, unknownExternalEffect?: boolean }) {
  if (/删除|移除|清空|格式化|放弃更改|\b(?:delete|erase|format|discard|remove)\b/iu.test(input.label))
    return { riskLevel: 'danger' as const, actionCategory: 'delete' as const, reason: 'The observed control can discard or delete data. Approval is bound to this control and current surface.' }
  if (/支付|付款|购买|转账|汇款|发送|发布|发表|上传|\b(?:pay|purchase|checkout|transfer|send|publish|upload)\b/iu.test(input.label) || input.externalSubmit)
    return { riskLevel: 'danger' as const, actionCategory: 'network' as const, reason: 'The observed action can transmit data, publish, or cause payment. Review the target before it is dispatched.' }
  if (input.unknownExternalEffect)
    return { riskLevel: 'danger' as const, actionCategory: 'network' as const, reason: 'This external control has no verified read-only effect. Its neutral label does not authorize a transmission or other consequential action.' }
  if (input.password)
    return { riskLevel: 'sensitive' as const, actionCategory: 'write' as const, reason: 'The observed control accepts a password. Its existing value is not inspected or displayed.' }
  if (/覆盖|替换现有|\b(?:overwrite|replace existing)\b/iu.test(input.label))
    return { riskLevel: 'sensitive' as const, actionCategory: 'write' as const, reason: 'The observed control replaces existing data. Approval is bound to this control and the current input state.' }
  return null
}

export interface LifeInterfaceAuthorization { allow: boolean, reason: string, approvalRef?: string }
