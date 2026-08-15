import type {
  AlicizationAuditLogInput,
  AlicizationCardScope,
  AlicizationSkillWorkbenchItem,
} from '../../../shared/eventa'
import type { AlicizationSkillLoader } from './turn-os/skill-loader'

import {
  electronAlicizationSkillWorkbenchActivate,
  electronAlicizationSkillWorkbenchList,
  electronAlicizationSkillWorkbenchRevoke,
  electronAlicizationSkillWorkbenchRollback,
} from '../../../shared/eventa'

interface RegisterAlicizationSkillInvokeHandlersOptions {
  registerInvokeHandler: (channel: unknown, handler: (...args: any[]) => Promise<unknown>) => void
  withCardScope: <T>(nextCardIdRaw: unknown, task: () => Promise<T>) => Promise<T>
  cardIdFrom: (scope?: Partial<AlicizationCardScope>) => string
  getSkillLoader: () => AlicizationSkillLoader
  appendAuditLog: (input: AlicizationAuditLogInput, cardId?: string) => Promise<void>
  sanitizeText: (raw: unknown, fallback?: string) => string
}

function toWorkbenchItem(input: {
  id: string
  version: string
  description: string
  dependencies: string[]
  requiredTools: string[]
  permissions: string[]
  risk: AlicizationSkillWorkbenchItem['risk']
  evaluationStatus: AlicizationSkillWorkbenchItem['evaluationStatus']
  activationStatus: AlicizationSkillWorkbenchItem['activationStatus']
}): AlicizationSkillWorkbenchItem {
  return {
    id: input.id,
    version: input.version,
    description: input.description,
    dependencies: [...input.dependencies],
    requiredTools: [...input.requiredTools],
    permissions: [...input.permissions],
    risk: input.risk,
    evaluationStatus: input.evaluationStatus,
    activationStatus: input.activationStatus,
  }
}

export function registerAlicizationSkillInvokeHandlers(options: RegisterAlicizationSkillInvokeHandlersOptions) {
  const {
    registerInvokeHandler,
    withCardScope,
    cardIdFrom,
    getSkillLoader,
    appendAuditLog,
    sanitizeText,
  } = options

  registerInvokeHandler(electronAlicizationSkillWorkbenchList, async payload => await withCardScope(payload.cardId, async () => {
    const items = await getSkillLoader().discover({
      productionOnly: payload.productionOnly !== false,
    })
    return {
      items: items.map(toWorkbenchItem),
    }
  }))

  async function transition(
    payload: AlicizationCardScope & { id: string, version: string },
    action: 'activate' | 'rollback' | 'revoke',
  ) {
    return await withCardScope(payload.cardId, async () => {
      const cardId = cardIdFrom(payload)
      const id = sanitizeText(payload.id)
      const version = sanitizeText(payload.version)
      const loader = getSkillLoader()
      const manifest = await loader[action](id, version)
      await loader.projectProduction()
      const item = (await loader.discover({ productionOnly: false }))
        .find(candidate => candidate.id === manifest.id && candidate.version === manifest.version)
      if (!item)
        throw new Error(`skill ${manifest.id}@${manifest.version} disappeared after ${action}`)

      await appendAuditLog({
        level: action === 'revoke' ? 'warning' : 'notice',
        category: 'alicization.skill',
        action: `workbench-${action}`,
        message: `Skill ${manifest.id}@${manifest.version} ${action} requested.`,
        payload: {
          cardId,
          id: manifest.id,
          version: manifest.version,
          activationStatus: manifest.activationStatus,
        },
      }, cardId)

      return toWorkbenchItem(item)
    })
  }

  registerInvokeHandler(electronAlicizationSkillWorkbenchActivate, async payload => await transition(payload, 'activate'))
  registerInvokeHandler(electronAlicizationSkillWorkbenchRollback, async payload => await transition(payload, 'rollback'))
  registerInvokeHandler(electronAlicizationSkillWorkbenchRevoke, async payload => await transition(payload, 'revoke'))
}
