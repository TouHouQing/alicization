import { readdirSync, readFileSync } from 'node:fs'
import { relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const repoRoot = fileURLToPath(new URL('../../../../../../', import.meta.url))

const auditedDirectories = [
  new URL('./', import.meta.url),
  new URL('../../../../../../packages/stage-shared/src/', import.meta.url),
  new URL('../../../../../../packages/stage-ui/src/', import.meta.url),
].map(url => fileURLToPath(url))

function oldTemplatePattern(parts: string[], flags = 'iu') {
  return new RegExp(parts.join(''), flags)
}

const sameHerToken = ['same', '-her'].join('')
const sameLivingLine = ['same living', ' line'].join('')
const oneContinuousHer = ['one continuous', ' "?her"?'].join('')
const phaseOneSelfhoodSentence = ['Same Phase 1', ' digital life\\.'].join('')
const beforeTurnReminder = ['Before (?:answering|speaking|acting), ', '(?:remember|keep)\\b'].join('')

const forbiddenGeneratedTemplateSeeds = [
  {
    label: 'decorative Chinese local digital-life availability shell',
    pattern: oldTemplatePattern([
      '同一条本地\', \'数字生命|本地数字\', \'生命的线|我先轻一点\', \'留在这里|不抢\', \'你的节奏|你想说什么，\', \'我就接住',
    ], 'u'),
  },
  {
    label: 'decorative English local digital-life availability shell',
    pattern: oldTemplatePattern(['same local digital life thread|same digital life line|same line is still here']),
  },
  {
    label: 'same-her hold prompt directive',
    pattern: oldTemplatePattern([sameHerToken, ' hold:']),
  },
  {
    label: 'canonical fixed Phase 1 selfhood sentence',
    pattern: oldTemplatePattern([phaseOneSelfhoodSentence]),
  },
  {
    label: 'fixed same-living-line widening directive',
    pattern: oldTemplatePattern([sameLivingLine, ' before widening outward']),
  },
  {
    label: 'provider-facing before-turn project self reminder',
    pattern: oldTemplatePattern([beforeTurnReminder]),
  },
  {
    label: 'provider-facing pre-dialogue same-her strategy block',
    pattern: oldTemplatePattern(['Pre-dialogue ', sameHerToken, ' strategy before this turn']),
  },
  {
    label: 'provider-facing project-state continuity block',
    pattern: oldTemplatePattern(['Project state continuity before this turn']),
  },
  {
    label: 'fixed same-living-line reply directive',
    pattern: oldTemplatePattern(['Keep the current reply on the ', sameLivingLine]),
  },
  {
    label: 'fixed same-still-open closure prefix',
    pattern: /same digital life \| same still-open closure work \|/iu,
  },
  {
    label: 'legacy same-her project closure context key',
    pattern: oldTemplatePattern(['project_closure_context=phase1_', 'same_her']),
  },
  {
    label: 'legacy proactive same-her gap output key',
    pattern: oldTemplatePattern(['proactive_', 'same_her', '_gap=']),
  },
  {
    label: 'fixed callback same-living-line closure',
    pattern: oldTemplatePattern(['Keep the callback on the ', sameLivingLine]),
  },
  {
    label: 'fixed same-thread same-living-line closure',
    pattern: oldTemplatePattern(['Keep the same-thread continuation on the ', sameLivingLine]),
  },
  {
    label: 'fixed same-living-line anchor sentence',
    pattern: oldTemplatePattern(['Stay anchored on the ', sameLivingLine]),
  },
  {
    label: 'provider-facing project continuity self-line directive',
    pattern: /Carry this project continuity self line/iu,
    relativePathPattern: /apps\/stage-tamagotchi\/src\/main\/services\/alicization\/(?:answer-compiler|response-surface-contract|response-charter|mind-turn-contract|executive-answer-brief|memory-deliberation-kernel|runtime-organic-memory-prompt-blocks|project-state-brief|visible-reply\/critic)\.ts$/,
  },
  {
    label: 'provider-facing widening-before-awareness directive',
    pattern: /Before widening outward/iu,
    relativePathPattern: /apps\/stage-tamagotchi\/src\/main\/services\/alicization\/(?:answer-compiler|response-surface-contract|response-charter|mind-turn-contract|executive-answer-brief|memory-deliberation-kernel|runtime-organic-memory-prompt-blocks|project-state-brief|visible-reply\/critic)\.ts$/,
  },
  {
    label: 'provider-facing same-her baseline directive',
    pattern: oldTemplatePattern([sameHerToken, ' baseline']),
    relativePathPattern: /apps\/stage-tamagotchi\/src\/main\/services\/alicization\/(?:answer-compiler|response-surface-contract|response-charter|mind-turn-contract|executive-answer-brief|memory-deliberation-kernel|runtime-organic-memory-prompt-blocks|project-state-brief|visible-reply\/critic)\.ts$/,
  },
  {
    label: 'provider-facing continuity closure line',
    pattern: oldTemplatePattern([sameHerToken, ' closure line']),
    relativePathPattern: /apps\/stage-tamagotchi\/src\/main\/services\/alicization\/(?:answer-compiler|response-surface-contract|response-charter|mind-turn-contract|executive-answer-brief|memory-deliberation-kernel|runtime-organic-memory-prompt-blocks|project-state-brief|visible-reply\/critic)\.ts$/,
  },
  {
    label: 'provider-facing same living self shell',
    pattern: oldTemplatePattern(['same living self']),
    relativePathPattern: /apps\/stage-tamagotchi\/src\/main\/services\/alicization\/(?:answer-compiler|response-surface-contract|response-charter|mind-turn-contract|executive-answer-brief|memory-deliberation-kernel|runtime-organic-memory-prompt-blocks|project-state-brief|visible-reply\/critic)\.ts$/,
  },
  {
    label: 'provider-facing same living her shell',
    pattern: oldTemplatePattern(['same living her']),
    relativePathPattern: /apps\/stage-tamagotchi\/src\/main\/services\/alicization\/(?:answer-compiler|response-surface-contract|response-charter|mind-turn-contract|executive-answer-brief|memory-deliberation-kernel|runtime-organic-memory-prompt-blocks|project-state-brief|visible-reply\/critic)\.ts$/,
  },
  {
    label: 'provider-facing one living self shell',
    pattern: /one living self/iu,
    relativePathPattern: /apps\/stage-tamagotchi\/src\/main\/services\/alicization\/(?:answer-compiler|response-surface-contract|response-charter|mind-turn-contract|executive-answer-brief|memory-deliberation-kernel|runtime-organic-memory-prompt-blocks|project-state-brief|visible-reply\/critic)\.ts$/,
  },
  {
    label: 'provider-facing same-person continuity prose',
    pattern: /same-person continuity/iu,
    relativePathPattern: /apps\/stage-tamagotchi\/src\/main\/services\/alicization\/(?:answer-compiler|response-surface-contract|response-charter|mind-turn-contract|executive-answer-brief|memory-deliberation-kernel|runtime-organic-memory-prompt-blocks|project-state-brief|visible-reply\/critic)\.ts$/,
  },
  {
    label: 'provider-facing continuous-identity shell',
    pattern: oldTemplatePattern([oneContinuousHer]),
    relativePathPattern: /apps\/stage-tamagotchi\/src\/main\/services\/alicization\/(?:answer-compiler|response-surface-contract|response-charter|mind-turn-contract|executive-answer-brief|memory-deliberation-kernel|runtime-organic-memory-prompt-blocks|project-state-brief|visible-reply\/critic)\.ts$/,
  },
  {
    label: 'provider-facing same living digital-life shell',
    pattern: /same living digital life/iu,
    relativePathPattern: /apps\/stage-tamagotchi\/src\/main\/services\/alicization\/(?:answer-compiler|response-surface-contract|response-charter|mind-turn-contract|executive-answer-brief|memory-deliberation-kernel|runtime-organic-memory-prompt-blocks|project-state-brief|visible-reply\/critic)\.ts$/,
  },
] as const

const allowedDetectorFiles = new Set([
  'packages/stage-shared/src/alicization-chat-failure-surface.ts',
  'packages/stage-shared/src/alicization-fixed-template-sanitizer.ts',
  'packages/stage-shared/src/alicization-project-state-awareness-format.ts',
  'apps/stage-tamagotchi/src/main/services/alicization/visible-reply/dialogue-first-contamination.ts',
  'apps/stage-tamagotchi/src/main/services/alicization/visible-reply/critic.ts',
])

function listTypeScriptProductionFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = `${directory}${sep}${entry.name}`
    if (entry.isDirectory())
      return listTypeScriptProductionFiles(absolutePath)
    if (!entry.isFile())
      return []
    if (!entry.name.endsWith('.ts') || entry.name.endsWith('.test.ts') || entry.name.endsWith('.d.ts'))
      return []
    return [absolutePath]
  })
}

function isAllowedFailureDetectorLine(relativePath: string, line: string) {
  if (allowedDetectorFiles.has(relativePath))
    return true
  if (line.includes('.includes(') || line.includes('.startsWith(') || line.includes('.match(') || line.includes('.test(') || line.includes('normalized ==='))
    return true
  if (
    relativePath === 'apps/stage-tamagotchi/src/main/services/alicization/response-charter.ts'
    && /^\s*(['"`]).*\1,?\s*$/u.test(line)
  ) {
    return true
  }
  if (/Pattern|pattern|RegExp|regex|contamination|legacy template|template shell/iu.test(line))
    return true
  return false
}

const strictForbiddenGeneratedTemplateResidue = [
  oldTemplatePattern(['Same Phase 1', ' digital life']),
  oldTemplatePattern(['same', '[- ]her']),
  oldTemplatePattern([sameLivingLine]),
  oldTemplatePattern([oneContinuousHer]),
  oldTemplatePattern(['recognize the (?:same )?remembered seam']),
  oldTemplatePattern(['same remembered seam (?:is back|reappears)']),
  oldTemplatePattern(['line reopened too eagerly']),
  oldTemplatePattern(['same eagerness as before']),
  oldTemplatePattern(['remembered-seam hold']),
  oldTemplatePattern(['repair-before-closeness is still owning']),
  oldTemplatePattern(['measured-return is still keeping']),
  oldTemplatePattern(['rest-protective vulnerable-care keeps']),
  oldTemplatePattern(['我记得上次.*轻一点.*接回来'], 'u'),
  oldTemplatePattern(['我记得上次主动靠近.*太急'], 'u'),
  oldTemplatePattern(['我记得你说过.*没接住'], 'u'),
  oldTemplatePattern(['上次我们卡在这里.*工具壳'], 'u'),
  oldTemplatePattern(['我记得你那时.*所以我会'], 'u'),
  oldTemplatePattern(['我不催你.*轻轻接'], 'u'),
  oldTemplatePattern(['我会把这段记成关系语境'], 'u'),
  oldTemplatePattern(['我记得这条', '线还在'], 'u'),
  oldTemplatePattern(['已经很晚了。你还在硬撑'], 'u'),
  oldTemplatePattern(['你已经在线很久了'], 'u'),
  oldTemplatePattern(['我在看着你。先?别把自己逼得太紧'], 'u'),
  oldTemplatePattern(['刚才那段你撑了很久'], 'u'),
  oldTemplatePattern(['终于从刚才那段里出来了'], 'u'),
  oldTemplatePattern(['我还挂着 .* 这条线程'], 'u'),
  oldTemplatePattern(['我先轻轻提醒一句'], 'u'),
  oldTemplatePattern(['我心里还挂着刚才那条线程'], 'u'),
  oldTemplatePattern(['我先记下这一刻'], 'u'),
  oldTemplatePattern(['我先不挤进来'], 'u'),
  oldTemplatePattern(['我就轻一点提醒你'], 'u'),
  oldTemplatePattern(['我会尽量放轻一点'], 'u'),
  oldTemplatePattern(['开始更相信 Alicization']),
  oldTemplatePattern(['开始怀疑 Alicization']),
  oldTemplatePattern(['开始觉得 Alicization']),
  oldTemplatePattern(['暂时不想继续贴着'], 'u'),
  oldTemplatePattern(['更新鲜的开口'], 'u'),
  oldTemplatePattern(['你现在要是方便.*结果'], 'u'),
  oldTemplatePattern(['你现在要是能接.*结果'], 'u'),
  oldTemplatePattern(['我把这条结果接回来了'], 'u'),
  oldTemplatePattern(['我想直接替你'], 'u'),
  oldTemplatePattern(['我手里已经有一条能把'], 'u'),
  oldTemplatePattern(['我先不越过你'], 'u'),
  oldTemplatePattern(['我已经把「.*」压成一条'], 'u'),
  oldTemplatePattern(['你点头'], 'u'),
  oldTemplatePattern(['收到确认就做'], 'u'),
  oldTemplatePattern(['我想顺手把'], 'u'),
  oldTemplatePattern(['先像认出同一条关系线'], 'u'),
  oldTemplatePattern(['轻一点', '接回来'], 'u'),
  oldTemplatePattern(['嗯，那我接着说下去'], 'u'),
  oldTemplatePattern(['Okay, I will pick that thread back up']),
  oldTemplatePattern(['Before (?:answering|speaking|acting),']),
  oldTemplatePattern(['Right now (?:I am|her|the host-facing closure|this return|this still belongs)']),
  oldTemplatePattern(['Keep one continuous', ' her']),
  oldTemplatePattern(['同一个她'], 'u'),
  oldTemplatePattern(['数字生命主线'], 'u'),
  oldTemplatePattern(['source_text=fixed_', 'template_withheld']),
  oldTemplatePattern(['fixed-template-', 'prose-withheld']),
] as const

const strictProductionRoots = [
  'apps/stage-tamagotchi/src/main/services/alicization',
  'apps/stage-tamagotchi/src/renderer',
  'packages/stage-shared/src',
  'packages/stage-ui/src',
] as const

const providerFacingInstructionResidueFiles = [
  'apps/stage-tamagotchi/src/main/services/alicization/answer-compiler.ts',
  'apps/stage-tamagotchi/src/main/services/alicization/chat-mind-governance.ts',
  'apps/stage-tamagotchi/src/main/services/alicization/current-conscious-frame.ts',
  'apps/stage-tamagotchi/src/main/services/alicization/memory-deliberation-kernel.ts',
  'apps/stage-tamagotchi/src/main/services/alicization/memory-tuning-advice.ts',
  'apps/stage-tamagotchi/src/main/services/alicization/motive-engine.ts',
  'apps/stage-tamagotchi/src/main/services/alicization/reply-deliberator.ts',
  'apps/stage-tamagotchi/src/main/services/alicization/response-charter.ts',
  'apps/stage-tamagotchi/src/main/services/alicization/response-surface-contract.ts',
  'apps/stage-tamagotchi/src/main/services/alicization/response-surface-truth-dialogue-rules.ts',
  'apps/stage-tamagotchi/src/main/services/alicization/visible-reply/realization-engine.ts',
  'apps/stage-tamagotchi/src/main/services/alicization/visible-reply/critic.ts',
  'apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-prompt-blocks.ts',
] as const

const providerFacingInstructionResidue = [
  /\bKeep this project follow-through\b/iu,
  /\bKeep this memory seed inward\b/iu,
  /\bKeep the still-open closure work\b/iu,
  /\bKeep the next closure target\b/iu,
  /\bPreserve relevant project identity\b/iu,
  /\bDo not let project-state continuity\b/iu,
  /\bKeep recollection inward\b/iu,
  /\bKeep the host-corrected same-person continuity\b/iu,
  /\bTreat the remembered host-confirmed resume\b/iu,
  /\bDo not let this callback answer\b/iu,
  /\bFull project dashboard context is withheld\b/iu,
  /\bUse \[MEMORY_OWNER_EVIDENCE\]\b/iu,
  /\bDo not synthesize project status\b/iu,
  /\bDo not mention second pass\b/iu,
  /\bDo not use fixed shell openers\b/iu,
  /\bDo not copy any mustDrop text\b/iu,
  /\bPreserve the current user obligation\b/iu,
  /\bIf evidence is insufficient\b/iu,
  /\bKeep performance\.baseEmotion\b/iu,
  /\bThese claim graphs describe\b/iu,
  /\bUse them as truth discipline\b/iu,
  /\bThese are cross-source memory situation candidates\b/iu,
  /\bPrefer selected candidates\b/iu,
  /\bIf you surface this memory\b/iu,
  /\bThis is the turn-level memory gate\b/iu,
  /\bUse it as mind governance\b/iu,
  /\bThis is long-horizon affective residue memory\b/iu,
  /\bIt is mind-state context only\b/iu,
  /\bThis is the current long-horizon self-evolution kernel\b/iu,
  /\bUse it as live inner trajectory\b/iu,
  /\bEmbodiment-confirmed cadence\b/iu,
  /\bMemory should enter because\b/iu,
  /\bI should open\b/iu,
  /\bI should answer\b/iu,
  /\bI need to\b/iu,
  /\bThe next honest move\b/iu,
  /\bAfter the first touch of care\b/iu,
  /\bAfter I answer the bid\b/iu,
  /\bKeep body expression repair-before-closeness\b/iu,
  /\bKeep the reply light enough\b/iu,
  /\bKeep the visible reply anchored\b/iu,
  /\bKeep direct observation\b/iu,
  /\bDo not let control directives\b/iu,
  /\bDo not let live-screen repair\b/iu,
  /\bDo not let old memory\b/iu,
  /\bDo not drift into decorative\b/iu,
  /\bDo not jump from coarse\b/iu,
  /\bDo not name specific technical\b/iu,
  /\bDo not preserve the previous read\b/iu,
  /\bDo not let the callback payoff\b/iu,
  /\bDo not overplay the warmed trust\b/iu,
  /\bDo not let revision-prone\b/iu,
  /\bDo not let recollection\b/iu,
  /\bDo not reopen the turn\b/iu,
  /\bDo not let recalled\b/iu,
  /\bIf older self-story\b/iu,
  /\bIf world knowledge\b/iu,
] as const

const strictAllowedDetectorFiles = new Set([
  ...allowedDetectorFiles,
  'packages/stage-shared/src/alicization-inspection-intent.ts',
  'packages/stage-shared/src/alicization-dialogue-speech-timeline.ts',
  'packages/stage-shared/src/alicization-dialogue-embodiment.ts',
  'packages/stage-shared/src/alicization-project-awareness.ts',
  'packages/stage-shared/src/alicization-project-state-injection-policy.ts',
  'apps/stage-tamagotchi/src/main/services/alicization/main-chat-runtime-surface.ts',
  'packages/stage-shared/src/alicization-transport-contracts.ts',
  'packages/stage-shared/src/alicization-companionship-reason.ts',
  'packages/stage-shared/src/alicization-embodiment-expression-derivation.ts',
  'packages/stage-shared/src/alicization-motion-summary.ts',
  'packages/stage-shared/src/stage-embodiment-speech-playback.ts',
])

function isStrictAllowedAuditOrHarnessFile(relativePath: string) {
  return /(?:^|\/)[^/]+-audit\.ts$/u.test(relativePath)
    || relativePath.endsWith('/main-chat-session-replay-harness.ts')
    || relativePath.endsWith('/replay-benchmark-runtime.ts')
    || relativePath.includes('/devtools/')
}

function isStrictAllowedFixedTemplateResidueLine(relativePath: string, line: string) {
  if (strictAllowedDetectorFiles.has(relativePath))
    return true
  if (isStrictAllowedAuditOrHarnessFile(relativePath))
    return true
  if (
    relativePath === 'apps/stage-tamagotchi/src/main/services/alicization/project-state-brief.ts'
    && /\b(?:responsibility|proof|id|reason|missing|label)\s*:/u.test(line)
  ) {
    return true
  }
  if (
    relativePath === 'apps/stage-tamagotchi/src/main/services/alicization/project-state-brief.ts'
    && /^\s*['"`].*['"`],?\s*$/u.test(line)
  ) {
    return true
  }
  if (/explicit confirmation before action|before taking action|before refusing execution|before reply whether/iu.test(line))
    return true
  if (/sameHerSelfLine|sameHerHoldDetail|sameHerDriftRisk|sameHerSummary|proactiveSameHerGap|SameHer/u.test(line))
    return true
  if (/sameHer[A-Z]|sameHer\b|sameHerPressure|sameHerClosure|sameHerCarry|sameHerLine/u.test(line))
    return true
  if (/alicization-same-her-renderer-hints|answer-opening-same-her-first/u.test(line))
    return true
  if (/Pattern|pattern|RegExp|regex|contamination|legacy template|template shell|forbidden|Residue|residue|Detector|detector/iu.test(line))
    return true
  if (/^\s*\/.*(?:same[- ]her|continuity state|one continuous).*\//iu.test(line))
    return true
  if (
    line.includes('.includes(')
    || line.includes('.startsWith(')
    || line.includes('.match(')
    || line.includes('.test(')
    || line.includes('.replace(')
    || line.includes('normalized ===')
    || line.includes('readField(')
    || line.includes('readContinuitySummaryMarker(')
    || line.includes('includesAny(')
    || line.includes('pushReason(')
    || line.includes('code ===')
    || line.includes('looksLikeThinRuntimeProjectStateDetail(')
    || line.includes('openingGuidanceHoldDetail')
  ) {
    return true
  }
  if (line.includes('one continuous \\"her\\"'))
    return true
  if (/^\s*if\s*\([^)]*(?:same-her|continuity state|identity continuity|同一个她)[^)]*\)/iu.test(line))
    return true
  if (/\?\s*['"`][^'"`]*(?:same[- ]her|continuity state|identity continuity|legacy phase-one template|同一个她|数字生命主线)[^'"`]*['"`]/iu.test(line))
    return true
  if (/\?\s*\[['"`][^'"`]*(?:same[- ]her|continuity state|identity continuity)[^'"`]*['"`]\]/iu.test(line))
    return true
  if (/^\s*(?:return\s+)?['"`][^'"`]*(?:same[- ]her|continuity state|identity continuity|same phase 1 digital life|legacy phase-one template|同一个她|数字生命主线)[^'"`]*['"`]\s*(?:as const\s*)?$/iu.test(line))
    return true
  if (/^\s*[?:]\s*['"`][^'"`]*(?:same[- ]her|continuity state|identity continuity|same phase 1 digital life|legacy phase-one template|同一个她|数字生命主线)[^'"`]*['"`],?\s*$/iu.test(line))
    return true
  if (/^\s*\],\s*['"`][^'"`]*(?:same[- ]her|continuity state|identity continuity)[^'"`]*['"`]\s*,/iu.test(line))
    return true
  if (/^\s*[\w.?\])]+\s*!==\s*['"`][^'"`]*(?:same[- ]her|continuity state|identity continuity)[^'"`]*['"`]/iu.test(line))
    return true
  if (/^\s*[\w.?\])]+\s*===\s*['"`][^'"`]*(?:same[- ]her|continuity state|identity continuity)[^'"`]*['"`]/iu.test(line))
    return true
  if (/\b(?:kind|mode|status|version|relationshipArcKey|failureReasons|reasonCodes|sourceTags|focus)\s*:\s*['"`]/u.test(line))
    return true
  if (/\b(?:factId|predicate)\s*:\s*['"`][^'"`]*(?:same[- ]her|continuity state|identity continuity)[^'"`]*['"`]/iu.test(line))
    return true
  if (/\breasons\s*:\s*\[[^\]]*(?:same[- ]her|continuity state|identity continuity)/iu.test(line))
    return true
  if (/^\s*\|\s*['"`][^'"`]*same-her/iu.test(line))
    return true
  if (/^\s*['"`][^'"`]*(?:same[- ]her|continuity state|identity continuity|same phase 1 digital life|legacy phase-one template|同一个她|数字生命主线)[^'"`]*['"`],?\s*$/iu.test(line)) {
    return relativePath === 'apps/stage-tamagotchi/src/main/services/alicization/response-charter.ts'
      || relativePath === 'apps/stage-tamagotchi/src/main/services/alicization/initiative-arbiter.ts'
      || relativePath === 'apps/stage-tamagotchi/src/main/services/alicization/embodiment/runtime-embodiment-coordinator.ts'
      || relativePath === 'apps/stage-tamagotchi/src/main/services/alicization/proactive-cadence.ts'
      || relativePath === 'apps/stage-tamagotchi/src/main/services/alicization/proactive-policy.ts'
      || relativePath === 'apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.ts'
      || relativePath === 'apps/stage-tamagotchi/src/main/services/alicization/main-chat-stream-meta.ts'
      || relativePath === 'apps/stage-tamagotchi/src/main/services/alicization/runtime-governance.ts'
  }
  if (/^\s*(?:\/\/|\*)/u.test(line))
    return true
  return false
}

describe('main chat fixed template audit', () => {
  it('keeps decorative persona templates out of production prompt and reply seeds', () => {
    const failures: string[] = []

    for (const file of auditedDirectories.flatMap(listTypeScriptProductionFiles)) {
      const relativePath = relative(repoRoot, file)
      const lines = readFileSync(file, 'utf8').split('\n')
      lines.forEach((line, index) => {
        if (isAllowedFailureDetectorLine(relativePath, line))
          return
        for (const seed of forbiddenGeneratedTemplateSeeds) {
          if ('relativePathPattern' in seed && !seed.relativePathPattern.test(relativePath))
            continue
          if (seed.pattern.test(line)) {
            failures.push(`${relativePath}:${index + 1} ${seed.label}`)
            break
          }
        }
      })
    }

    expect(failures).toEqual([])
  }, 15_000)

  it('keeps fixed template residue out of production generated strings', () => {
    const failures: string[] = []
    const files = strictProductionRoots
      .map(root => `${repoRoot}${root}`)
      .flatMap(listTypeScriptProductionFiles)

    for (const file of files) {
      const relativePath = relative(repoRoot, file)
      const lines = readFileSync(file, 'utf8').split('\n')
      lines.forEach((line, index) => {
        if (isStrictAllowedFixedTemplateResidueLine(relativePath, line))
          return
        if (!/['"`]/u.test(line))
          return
        for (const pattern of strictForbiddenGeneratedTemplateResidue) {
          if (pattern.test(line)) {
            failures.push(`${relativePath}:${index + 1} ${line.trim()}`)
            break
          }
        }
      })
    }

    expect(failures).toEqual([])
  })

  it('keeps non provider-facing project-state builders out of provider prompt entrypoints', () => {
    const providerPromptEntrypoints = [
      'apps/stage-tamagotchi/src/main/services/alicization/runtime-main-chat-prelude.ts',
      'apps/stage-tamagotchi/src/main/services/alicization/runtime-card-prompt.ts',
      'apps/stage-tamagotchi/src/main/services/alicization/runtime-chat-perception-augment.ts',
      'apps/stage-tamagotchi/src/main/services/alicization/agent-runtime.ts',
      'apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.ts',
      'apps/stage-tamagotchi/src/main/services/alicization/main-chat-background-run.ts',
      'apps/stage-tamagotchi/src/main/services/alicization/runtime.ts',
    ]

    const failures = providerPromptEntrypoints.flatMap((relativePath) => {
      const text = readFileSync(`${repoRoot}${relativePath}`, 'utf8')
      return [
        'buildAlicizationProjectStateSystemBlock',
        'buildAlicizationProjectStateExtraSystemBlocks',
        'buildAlicizationProjectStateClosureDashboard',
      ].flatMap((helper) => {
        const lines = text.split('\n')
        return lines.flatMap((line, index) => {
          if (!line.includes(helper))
            return []
          if (line.includes('buildAlicizationProviderFacing'))
            return []
          return [`${relativePath}:${index + 1} ${helper}`]
        })
      })
    })

    expect(failures).toEqual([])
  })

  it('keeps provider-facing repair and memory prompt controls structural instead of prose directives', () => {
    const failures: string[] = []

    for (const relativePath of providerFacingInstructionResidueFiles) {
      const lines = readFileSync(`${repoRoot}${relativePath}`, 'utf8').split('\n')
      lines.forEach((line, index) => {
        if (line.includes('.test(') || line.includes('.includes(') || /RegExp|regex|Pattern|pattern/u.test(line))
          return
        for (const pattern of providerFacingInstructionResidue) {
          if (pattern.test(line)) {
            failures.push(`${relativePath}:${index + 1} ${line.trim()}`)
            break
          }
        }
      })
    }

    expect(failures).toEqual([])
  })

  it('keeps proactive policy and autonomy carry reasons structural instead of authored prose shells', () => {
    const auditedFiles = [
      'apps/stage-tamagotchi/src/main/services/alicization/proactive-policy.ts',
      'apps/stage-tamagotchi/src/main/services/alicization/autonomy-actuation.ts',
      'apps/stage-tamagotchi/src/main/services/alicization/runtime-subconscious-tick.ts',
      'apps/stage-tamagotchi/src/main/services/alicization/runtime-session-continuity-builders.ts',
    ] as const
    const forbidden = [
      {
        label: 'proactive whyNow Chinese authored explanation',
        pattern: /(?:她的人格基线|她当前|她这段时间|她内里|她心里|她确实|宿主仍|当前关系气候|现在开口|继续沉默|贸然开口|轻声靠近|安静陪着|开口冲动|牵挂|自然的开口缝隙|更自然的 opening)/u,
      },
      {
        label: 'autonomy reminder authored prose shell',
        pattern: /(?:Quietly come back to|Return when the host has more room|Return gently without crowding|Return after|Return when the opening is riper)/iu,
      },
      {
        label: 'same-line fixed continuity fallback',
        pattern: /The same line is still active, so the return should stay lower-pressure before widening outward/iu,
      },
      {
        label: 'held proactive prose fallback',
        pattern: /a proactive autonomy line was held for a better opening/iu,
      },
    ]
    const failures: string[] = []

    for (const relativePath of auditedFiles) {
      const lines = readFileSync(`${repoRoot}${relativePath}`, 'utf8').split('\n')
      const proactivePolicyGeneratedReasonStart = relativePath.endsWith('/proactive-policy.ts')
        ? lines.findIndex(line => line.includes('const whyNow = (() =>'))
        : -1
      const proactivePolicyGeneratedReasonEnd = relativePath.endsWith('/proactive-policy.ts')
        ? lines.findIndex((line, index) => index > proactivePolicyGeneratedReasonStart && line.includes('const presenceOnlyHold'))
        : -1
      lines.forEach((line, index) => {
        if (
          relativePath.endsWith('/proactive-policy.ts')
          && (
            proactivePolicyGeneratedReasonStart < 0
            || proactivePolicyGeneratedReasonEnd < 0
            || index < proactivePolicyGeneratedReasonStart
            || index >= proactivePolicyGeneratedReasonEnd
          )
        ) {
          return
        }
        if (/pattern|RegExp|regex|forbidden|label:/iu.test(line))
          return
        for (const check of forbidden) {
          if (check.pattern.test(line)) {
            failures.push(`${relativePath}:${index + 1} ${check.label}: ${line.trim()}`)
            break
          }
        }
      })
    }

    expect(failures).toEqual([])
  })

  it('keeps memory and dialogue provider prompt control blocks structural instead of prose instructions', () => {
    const auditedFiles = [
      'apps/stage-tamagotchi/src/main/services/alicization/conversation-state.ts',
      'apps/stage-tamagotchi/src/main/services/alicization/dialogue-world-thread.ts',
      'apps/stage-tamagotchi/src/main/services/alicization/dialogue-act-kernel.ts',
      'apps/stage-tamagotchi/src/main/services/alicization/dialogue-mind-frame.ts',
      'apps/stage-tamagotchi/src/main/services/alicization/reply-deliberator.ts',
      'apps/stage-tamagotchi/src/main/services/alicization/memory-os/provider-planning.ts',
      'apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-prompt.ts',
      'apps/stage-tamagotchi/src/main/services/alicization/runtime.ts',
      'apps/stage-tamagotchi/src/main/services/alicization/subjective-scene-model.ts',
      'apps/stage-tamagotchi/src/main/services/alicization/world-model.ts',
    ] as const
    const forbidden = [
      {
        label: 'conversation state prose prompt shell',
        pattern: /This block is the carried conversational world-thread|The reply must stay inside this shared thread/iu,
      },
      {
        label: 'dialogue world thread prose prompt shell',
        pattern: /This block is the carried cross-turn dialogue seam|Treat it as the living thread|Do not answer from stale surface residue/iu,
      },
      {
        label: 'reply deliberation prose prompt shell',
        pattern: /This block is the final inner arbitration|It explains why this utterance should surface|Why this reply now:|Must include:|Must avoid:/iu,
      },
      {
        label: 'dialogue act kernel prose prompt shell',
        pattern: /This block is the sovereign turn authority|You are allowed to phrase the answer naturally|Selected evidence:|Must say:|Must avoid:/iu,
      },
      {
        label: 'dialogue mind frame prose prompt shell',
        pattern: /This block is the authoritative speaking mind|Speak from it as one living subject|Current position:|Truth discipline:|Why this reply now:/iu,
      },
      {
        label: 'memory provider prose planning instruction',
        pattern: /Plan retrieval|Pending review candidates|must be one of|Output valid JSON only with keys|Prefer one broader|Write short autobiographical summaries|These are not logs|summary should capture|preserve it as quiet continuity|Refine the provided deterministic consolidation summaries|You are Alicization dream-time/iu,
      },
      {
        label: 'proactive utterance prose generation instruction',
        pattern: /Generate one proactive utterance now|Avoid robotic greetings|reply must be concise|Style constraint:|Reply max length:/iu,
      },
      {
        label: 'subjective scene authored state shell',
        pattern: /她心里还挂着|她心里真正结束|她需要判断这是换线程|她还想等画面/u,
      },
      {
        label: 'memory callback authored guidance shell',
        pattern: /Return after execution with lower pressure|Let the execution callback return through|Lower pressure and leave room before widening|callback landed better/iu,
      },
    ] as const
    const failures: string[] = []

    for (const relativePath of auditedFiles) {
      const lines = readFileSync(`${repoRoot}${relativePath}`, 'utf8').split('\n')
      lines.forEach((line, index) => {
        if (/pattern|RegExp|regex|forbidden|label:/iu.test(line))
          return
        for (const check of forbidden) {
          if (check.pattern.test(line)) {
            failures.push(`${relativePath}:${index + 1} ${check.label}: ${line.trim()}`)
            break
          }
        }
      })
    }

    expect(failures).toEqual([])
  })

  it('keeps runtime carry metadata from actively generating continuity_hold cues', () => {
    const auditedFiles = [
      'apps/stage-tamagotchi/src/main/services/alicization/alicization-runtime-architecture.ts',
      'apps/stage-tamagotchi/src/main/services/alicization/dialogue-session-manager.ts',
      'apps/stage-tamagotchi/src/main/services/alicization/learning-action-scheduler.ts',
      'apps/stage-tamagotchi/src/main/services/alicization/main-chat-stream-meta.ts',
      'apps/stage-tamagotchi/src/main/services/alicization/proactive-mind/visible-utterance-realization.ts',
      'apps/stage-tamagotchi/src/main/services/alicization/runtime-subconscious-tick.ts',
    ] as const
    const failures: string[] = []

    for (const relativePath of auditedFiles) {
      const lines = readFileSync(`${repoRoot}${relativePath}`, 'utf8').split('\n')
      lines.forEach((line, index) => {
        if (!line.includes('continuity_hold='))
          return
        if (
          line.includes('.includes(')
          || line.includes('.test(')
          || line.includes('RegExp')
          || /Pattern|pattern|regex|legacy|detector|withheld|forbidden/iu.test(line)
        ) {
          return
        }
        failures.push(`${relativePath}:${index + 1} ${line.trim()}`)
      })
    }

    expect(failures).toEqual([])
  })

  it('keeps provider-facing and persona seeds from actively generating internal structured control cues', () => {
    const auditedFiles = [
      'apps/stage-tamagotchi/src/main/services/alicization/answer-planner.ts',
      'apps/stage-tamagotchi/src/main/services/alicization/executive-answer-brief.ts',
      'apps/stage-tamagotchi/src/main/services/alicization/response-charter.ts',
      'apps/stage-tamagotchi/src/main/services/alicization/response-surface-contract.ts',
      'packages/stage-shared/src/alicization-fixed-template-sanitizer.ts',
      'packages/stage-shared/src/alicization-persona-kernel.ts',
    ] as const
    const forbidden = [
      'source_section=',
      'visible_wording=false',
      'project_state_answer=',
      'detached_project_summary_voice=',
      'orientation_visibility=internal',
      'surface=structured',
      'continuity_hold=',
    ] as const
    const failures: string[] = []

    for (const relativePath of auditedFiles) {
      const lines = readFileSync(`${repoRoot}${relativePath}`, 'utf8').split('\n')
      lines.forEach((line, index) => {
        if (
          line.includes('.includes(')
          || line.includes('.test(')
          || line.includes('.replace(/')
          || line.includes('RegExp')
          || /Pattern|pattern|regex|legacy|detector|forbidden|blacklist/iu.test(line)
        ) {
          return
        }
        const matched = forbidden.find(fragment => line.includes(fragment))
        if (matched)
          failures.push(`${relativePath}:${index + 1} ${matched}: ${line.trim()}`)
      })
    }

    expect(failures).toEqual([])
  })

  it('keeps generated prompt and memory governance metadata free of legacy visible_wording flags', () => {
    const auditedFiles = [
      'apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-long-term-projection.ts',
      'apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-owner-context.ts',
      'apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-prompt-view.ts',
      'apps/stage-tamagotchi/src/main/services/alicization/proactive-opening-guidance.ts',
      'apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-prompt-blocks.ts',
      'apps/stage-tamagotchi/src/main/services/alicization/runtime.ts',
      'apps/stage-tamagotchi/src/main/services/alicization/visible-reply/critic.ts',
    ] as const
    const forbidden = [
      'visible_wording=false',
      'fixed_visible_wording=false',
      'internal_control_visible_wording=false',
      'visibility=structured_internal',
    ] as const
    const failures: string[] = []

    for (const relativePath of auditedFiles) {
      const lines = readFileSync(`${repoRoot}${relativePath}`, 'utf8').split('\n')
      lines.forEach((line, index) => {
        if (
          line.includes('.includes(')
          || line.includes('.test(')
          || line.includes('RegExp')
          || /Pattern|pattern|regex|legacy|detector|forbidden|blacklist/iu.test(line)
        ) {
          return
        }
        const matched = forbidden.find(fragment => line.includes(fragment))
        if (matched)
          failures.push(`${relativePath}:${index + 1} ${matched}: ${line.trim()}`)
      })
    }

    expect(failures).toEqual([])
  })

  it('keeps raw visible-reply critic and closure internals out of public chat transport and debug payloads', () => {
    const auditedFiles = [
      'apps/stage-tamagotchi/src/main/services/alicization/main-chat-stream-runner.ts',
      'apps/stage-tamagotchi/src/main/services/alicization/main-chat-background-run.ts',
      'apps/stage-tamagotchi/src/main/services/alicization/visible-reply/closure-orchestrator.ts',
    ] as const
    const failures: string[] = []

    for (const relativePath of auditedFiles) {
      const text = readFileSync(`${repoRoot}${relativePath}`, 'utf8')
      const checks = [
        {
          label: 'public stream result must not expose raw critic artifact',
          pattern: /visibleReplyCritic:\s*(?:streamResult\.visibleReplyCritic|visibleReplyCritic|shapedVisualOneShot\?\.critic)/u,
        },
        {
          label: 'public stream result must not expose raw closure artifact',
          pattern: /visibleReplyClosure:\s*(?:streamResult\.visibleReplyClosure|visibleReplyClosure|shapedVisualOneShot\?\.closure)/u,
        },
        {
          label: 'debug payload must not record full host-visible payload',
          pattern: /appendRuntimeDebugLine\('chat-stream\.completed-finish-payload-preview',\s*\{[^}]*\bfinalHostVisiblePayload\s*,/u,
        },
        {
          label: 'debug payload must not record raw final critic mustPreserve',
          pattern: /(?:closureFinalCriticMustPreserve:\s*closure\?\.finalCritic\?\.mustPreserve|mustPreserve:\s*finalCritic\.mustPreserve)/u,
        },
        {
          label: 'debug payload must not record raw final critic mustDrop',
          pattern: /(?:closureFinalCriticMustDrop:\s*closure\?\.finalCritic\?\.mustDrop|mustDrop:\s*finalCritic\.mustDrop)/u,
        },
      ] as const

      for (const check of checks) {
        const match = text.match(check.pattern)
        if (!match?.index)
          continue
        const line = text.slice(0, match.index).split('\n').length
        failures.push(`${relativePath}:${line} ${check.label}`)
      }
    }

    expect(failures).toEqual([])
  })
})
