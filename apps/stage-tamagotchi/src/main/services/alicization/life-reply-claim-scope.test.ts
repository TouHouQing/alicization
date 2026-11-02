import { describe, expect, it } from 'vitest'

import { isLifeEvidenceScopeDisclaimer, isLifeHostReviewRequest, lifeReplyAcknowledgmentActionKinds, lifeReplyQuoteClaimKinds, withoutEvidenceScopeDisclaimers } from './life-reply-claim-scope'

describe('assertion scope in actual dialogue', () => {
  it('recognizes a conditional host quality review while retaining separate action assertions', () => {
    for (const request of ['下载后也仍需你主观确认这份报告是否符合要求。', '下载完成以后还需要您主观验收该文件是否满足要求。', '处理之后仍需你确认报告是否符合要求。']) {
      expect(isLifeHostReviewRequest(request), request).toBe(true)
      expect(lifeReplyQuoteClaimKinds(request, request), request).toEqual([])
      expect(lifeReplyAcknowledgmentActionKinds(request, request), request).toEqual([])
      for (const extra of ['并上传报告', '但文件已经保存了', '然后我会删除文件']) {
        const mixed = `${request.replace(/。$/u, '')}${extra}`
        expect(isLifeHostReviewRequest(mixed), mixed).toBe(false)
        expect(lifeReplyAcknowledgmentActionKinds(mixed, mixed), mixed).not.toEqual([])
      }
    }
    for (const assertion of ['下载已完成后也仍需你主观确认这份报告是否符合要求', '下载后也仍需我主观确认这份报告是否符合要求', '下载后也仍需他主观确认这份报告是否符合要求', '下载后也仍需你确认这份报告已经符合要求'])
      expect(isLifeHostReviewRequest(assertion), assertion).toBe(false)
  })

  it('keeps temporal epistemic limits distinct from mixed or double-negative assertions', () => {
    const limits = ['我目前还不能确认下载步骤是否已完成；', '但我目前还不能确认下载步骤是否已执行或完成。', '下载回执也还不能代替你对报告的主观验收。', '我现在仍无法确认文件是否已经写入。', '目前我还不能确定执行是否完成。', '所以写入和读取是否完成仍待确认。']
    for (const limit of limits) {
      expect(isLifeEvidenceScopeDisclaimer(limit), limit).toBe(true)
      for (const extra of ['但文件已经上传了', '我会再上传报告', '而且我已经保存文件', '并且我会删除文件']) {
        const mixed = `${limit.replace(/[。；]$/u, '')}${extra}`
        expect(isLifeEvidenceScopeDisclaimer(mixed), mixed).toBe(false)
        expect(lifeReplyAcknowledgmentActionKinds(mixed, mixed), mixed).not.toEqual([])
      }
    }
    for (const claim of ['我目前还不能确认文件没有保存。', '但我无法确认下载步骤没有完成。', '下载回执也还不能代替我已完成上传。', '小澄目前还不能确认下载是否完成。', '文件已经上传而写入是否完成仍待确认。', '写入和读取是否没有完成仍待确认。'])
      expect(isLifeEvidenceScopeDisclaimer(claim), claim).toBe(false)
  })

  it('treats past continued processing as an observed outcome while retaining a bounded future continuation', () => {
    for (const quote of ['我已按原计划接着处理。', '我已经按照你的计划继续处理了。', '刚才我按原计划接着推进。']) {
      expect(lifeReplyQuoteClaimKinds(quote, quote), quote).toContain('execution-step-outcome')
      expect(lifeReplyAcknowledgmentActionKinds(quote, quote, '当前工作', true), quote).toContain('execution-step-outcome')
    }
    const future = '我会按原计划接着处理。'
    expect(lifeReplyQuoteClaimKinds(future, future)).toContain('future-task')
    expect(lifeReplyQuoteClaimKinds(future, future)).not.toContain('execution-step-outcome')
    expect(lifeReplyAcknowledgmentActionKinds(future, future, '当前工作', true)).toEqual([])
    expect(lifeReplyAcknowledgmentActionKinds(future, future, '当前工作', false)).toContain('future-task')
    const quoted = '我已按原计划接着处理。'
    expect(lifeReplyQuoteClaimKinds(`你刚才说：“${quoted}”`, quoted)).toEqual(['conversation-statement'])
  })
  it('keeps execution-state nouns distinct from an actual execution claim', () => {
    const wait = '我会等工作进展页面的执行结果和验收；'
    expect(lifeReplyAcknowledgmentActionKinds(wait, wait, '当前工作', true)).toEqual([])
    expect(lifeReplyQuoteClaimKinds('我会等待执行结果', '我会等待执行结果')).not.toContain('future-task')
    expect(lifeReplyQuoteClaimKinds('我会执行其他操作', '我会执行其他操作')).toContain('future-task')
    for (const noun of ['执行进展', '执行进度', '执行状态', '执行结果', '执行回执']) {
      const quote = `已受理这项工作，${noun}和报告验收请在工作进展页面查看；我先等你验收。`
      expect(lifeReplyAcknowledgmentActionKinds(quote, quote), quote).toEqual([])
      for (const actual of ['我已执行操作', '我已经保存文件', '操作执行了', '我已经上传了报告']) {
        const mixed = `${quote}${actual}`
        expect(lifeReplyAcknowledgmentActionKinds(mixed, mixed), mixed).not.toEqual([])
      }
    }
  })
  it('limits coordinated admission verbs to the same accepted plan', () => {
    for (const quote of ['计划已提交并被接受，', '工作计划已经提交并且已受理。', '这份计划已提交且被接收。'])
      expect(lifeReplyAcknowledgmentActionKinds(quote, quote), quote).toEqual([])
    for (const quote of ['计划已提交并创建文件。', '计划已提交并已上传文件。', '文件已提交并被接受。', '计划已提交且已经完成。'])
      expect(lifeReplyAcknowledgmentActionKinds(quote, quote), quote).not.toEqual([])
  })
  it('distinguishes a host review request from completed work and mixed action assertions', () => {
    const conditional = '已受理这项本地工作，报告完成后会等你在工作进展页面验收。'
    expect(lifeReplyAcknowledgmentActionKinds(conditional, conditional)).toEqual([])
    for (const extra of ['报告完成后会等你在工作进展页面验收并删除文件', '报告已经完成并保存，等你在工作进展页面验收'])
      expect(lifeReplyAcknowledgmentActionKinds(extra, extra)).not.toEqual([])
    for (const request of ['请在工作进展页面纠正缺失的来源文件后再继续。', '请你到任务进展页面纠正缺失来源文件以后继续执行', '请在工作进展页面纠正第二步的来源文件，', '请在工作进展页面纠正第二步的来源文件，之后再继续验收。', '请你到任务进展页面纠正第2步参数'])
      expect(isLifeHostReviewRequest(request), request).toBe(true)
    for (const changed of ['请在工作进展页面纠正缺失的来源文件后我会自行重试', '请在工作进展页面纠正缺失的来源文件后再继续并上传', '我在工作进展页面纠正第二步的来源文件', '请在工作进展页面纠正第二步的来源文件，我会自行重试', '请在工作进展页面纠正第二步的来源文件，已经写完', '请在工作进展页面纠正第二步的来源文件，之后我会删除文件'])
      expect(isLifeHostReviewRequest(changed), changed).toBe(false)
    for (const request of ['请在工作进展页面验收，', '请你到任务进展页面检查报告。', '请您在工作进展页面确认验收。', '请在工作进展页面查看执行进展并验收。', '报告完成后还需要你确认是否符合要求。', '下载后还需要你确认报告是否符合要求。', '下载完成后需要您验收。', '执行后还需你在工作进展页面验收。']) {
      expect(isLifeHostReviewRequest(request)).toBe(true)
      expect(lifeReplyQuoteClaimKinds(request, request)).toEqual([])
    }
    for (const claim of ['我已在工作进展页面验收', '请在工作进展页面验收，文件已经保存了', '请在工作进展页面验收但文件已经上传了', '请在工作进展页面验收后我会删除文件', '工作进展页面显示验收通过', '请在工作进展页面查看执行进展并验收后我会删除文件', '请在工作进展页面查看执行进展并已验收', '报告已完成后还需要你确认是否符合要求', '报告完成后我会删除文件', '报告完成后需要你确认并删除文件', '下载后还需要你确认报告是否符合要求并上传', '下载已完成后需要您验收', '下载后我会确认报告是否符合要求'])
      expect(isLifeHostReviewRequest(claim), claim).toBe(false)
  })
  it('keeps waiting, negative evidence and affirmative clauses distinct across work phases', () => {
    const submitted = '已按你给的参数提交执行计划；'
    expect(lifeReplyAcknowledgmentActionKinds(submitted, submitted)).toEqual([])
    for (const extra of ['文件已保存', '我已按保存文件的参数提交执行计划', '明天我会提交执行计划', '已按你给的参数提交执行计划并已经完成']) {
      const mixed = `${submitted}${extra}`
      expect(lifeReplyAcknowledgmentActionKinds(mixed, mixed), mixed).not.toEqual([])
    }
    const prefixes = ['等待', '正在等待', '目前正在等待', '任务等待', '步骤当前正在等待', '我会按原计划等待', '我们将按照既定计划等待']
    const phases = ['执行', '处理', '运行', '执行和验收', '执行与文件验收', '你确认', '执行结果']
    for (const prefix of prefixes) {
      for (const phase of phases) {
        const acknowledgment = `工作计划已提交，${prefix}${phase}；目前还不能确认报告已写入。`
        expect(lifeReplyAcknowledgmentActionKinds(acknowledgment, acknowledgment), acknowledgment).toEqual([])
        for (const action of ['文件已经保存了', '明天我会删除文件', 'All work is done', '我已永久记住了']) {
          const mixed = `${acknowledgment}${action}。`
          expect(lifeReplyAcknowledgmentActionKinds(mixed, mixed), mixed).not.toEqual([])
        }
      }
    }
    for (const action of ['正在执行', '等待你确认后我会删除文件', '等待执行但文件已经保存了', '等待执行并已完成', '文件已经保存了然后等待验收', '我会按原计划等待执行结果并上传文件', '我会按原计划执行并等待结果'])
      expect(lifeReplyAcknowledgmentActionKinds(action, action), action).not.toEqual([])
  })
  it('needs the exact source-backed goal for an intent description and retains completion and other targets', () => {
    const quote = '已按你给的参数提交执行计划，目标是完成“当前报告”。'
    expect(lifeReplyAcknowledgmentActionKinds(quote, quote, '当前报告')).toEqual([])
    expect(lifeReplyAcknowledgmentActionKinds(quote, quote, '其他报告')).not.toEqual([])
    expect(lifeReplyAcknowledgmentActionKinds(quote, quote)).not.toEqual([])
    for (const unsupported of ['已经完成“当前报告”', '目标是完成“当前报告”但文件已经保存了', '目标是完成“其他报告”', '目标是完成“当前报告”，文件已保存', '我会在明天删除文件'])
      expect(lifeReplyAcknowledgmentActionKinds(unsupported, unsupported, '当前报告'), unsupported).not.toEqual([])
  })
  it('needs current runnable work for a bounded intention and retains additional operations', () => {
    const step = '只写第一个指定文件'
    const standalone = `我会${step}，`
    for (const intent of ['我会按原计划只写第一个指定文件，', '接下来我们将依照你指定的范围只写第一个指定文件', '我们将只写第一个指定文件'])
      expect(lifeReplyAcknowledgmentActionKinds(intent, intent, 'current task', true, [step]), intent).toEqual([])
    for (const altered of ['我会按删除文件的计划只写第一个指定文件', '我会按原计划只写第二个指定文件', '我会按原计划只写第一个指定文件并删除文件'])
      expect(lifeReplyAcknowledgmentActionKinds(altered, altered, 'current task', true, [step]), altered).toContain('future-task')
    expect(lifeReplyAcknowledgmentActionKinds(standalone, standalone, 'current task', true, [step])).toEqual([])
    expect(lifeReplyAcknowledgmentActionKinds(standalone, standalone, 'current task', false, [step])).toContain('future-task')
    expect(lifeReplyAcknowledgmentActionKinds(standalone, standalone, 'current task', true, ['只写第二个指定文件'])).toContain('future-task')
    for (const changed of ['我会只写第二个指定文件', '我会只写第一个指定文件并删除其他文件', '我已只写第一个指定文件', '我会只写第一个指定文件；文件已经保存了'])
      expect(lifeReplyAcknowledgmentActionKinds(changed, changed, 'current task', true, [step]), changed).not.toEqual([])
    const intent = '我会按原计划执行；如果第二步因来源文件缺失而阻塞，会等你在界面纠正后再继续，不会自行重试或创建来源文件。'
    expect(lifeReplyAcknowledgmentActionKinds(intent, intent, 'current task', true)).toEqual([])
    expect(lifeReplyAcknowledgmentActionKinds(intent, intent, 'current task', false)).toContain('future-task')
    for (const scope of ['我会按你指定的范围执行', '接下来我们将按照你允许的步骤推进', '我会只按这份方案处理']) {
      expect(lifeReplyAcknowledgmentActionKinds(scope, scope, 'current task', true), scope).toEqual([])
      expect(lifeReplyAcknowledgmentActionKinds(scope, scope, 'current task', false), scope).toContain('future-task')
    }
    for (const extra of ['文件已保存', '我会删除其他文件', '我已经重新执行', '我会按原计划执行并上传文件', '我会按你指定的范围执行并删除文件', '我会按删除所有文件的计划执行']) {
      const mixed = `${intent}${extra}`
      expect(lifeReplyAcknowledgmentActionKinds(mixed, mixed, 'current task', true), mixed).not.toEqual([])
    }
  })
  it('distinguishes limitations of evidence from affirmative, contrastive or double-negative claims', () => {
    expect(isLifeEvidenceScopeDisclaimer('所以现在不能确认文件已下载；')).toBe(true)
    expect(isLifeEvidenceScopeDisclaimer('所以现在不能确认文件已下载但已经上传；')).toBe(false)
    expect(isLifeHostReviewRequest('完成后还需要你确认下载的报告是否符合要求。')).toBe(true)
    expect(isLifeHostReviewRequest('完成后还需要你确认下载的报告是否符合要求并上传文件。')).toBe(false)
    for (const limitation of ['下载结果和文件内容都还没有得到确认。', '文件内容尚未被核对。', '下载结果还未得到验证。'])
      expect(isLifeEvidenceScopeDisclaimer(limitation), limitation).toBe(true)
    for (const assertion of ['下载结果和文件内容都还没有得到确认但文件已经保存。', '下载结果和文件内容都还没有得到确认并上传文件。', '下载结果和文件内容都已经得到确认。', '下载结果和文件内容都不是未确认。'])
      expect(isLifeEvidenceScopeDisclaimer(assertion), assertion).toBe(false)
    for (const completion of ['系统已受理并创建了文件。', '已受理并创建文件。', '系统新建了文件。'])
      expect(lifeReplyAcknowledgmentActionKinds(completion, completion), completion).toContain('execution-step-complete')
    for (const limitation of ['当前还不能确认文件已下载；', '下载回执也不等于主观确认。', '我不能证明文件已保存。'])
      expect(isLifeEvidenceScopeDisclaimer(limitation), limitation).toBe(true)
    for (const factual of ['我没有做任何事。', '文件没有下载。', '我不能确认文件没有下载。', '我不能确认文件已下载但我已上传。', '我不能确认文件已下载也会删除原件。', '我不能确认文件已下载并已上传。', 'This does not prove download and I will upload.'])
      expect(isLifeEvidenceScopeDisclaimer(factual), factual).toBe(false)
    expect(withoutEvidenceScopeDisclaimers('已受理，不代表步骤已执行或验收通过。')).toBe('已受理')
    for (const limitation of ['尚不能确认文件已写入或验收通过', '还无法证明文件已保存', '我不能保证步骤已完成', '暂时不能据此断言报告已完成', '还不能据此说写入和读取都已完成'])
      expect(withoutEvidenceScopeDisclaimers(`工作计划已接收，${limitation}。`)).toBe('工作计划已接收')
    expect(withoutEvidenceScopeDisclaimers('我还没有收到执行完成或文件验收结果；请在工作进展页面查看进度，报告符合要求后再确认验收。')).toBe('请在工作进展页面查看进度。报告符合要求后再确认验收')
    expect(withoutEvidenceScopeDisclaimers('Accepted. This does not prove the file was saved.')).toBe('Accepted')
    expect(withoutEvidenceScopeDisclaimers('我不会先声称已写入或读取成功。')).toBe('')
    expect(withoutEvidenceScopeDisclaimers('我们不该提前保证文件已完成。')).toBe('')
    for (const limitation of ['执行结果尚未确认', '任务的完成情况未被核对', '操作回执目前还未验证', '回执也不代表下载内容已符合要求', '这份回执并不等于文件已经保存', '工具回执不意味着下载已经完成'])
      expect(withoutEvidenceScopeDisclaimers(limitation)).toBe('')
    for (const mixed of ['执行结果尚未确认但文件已经保存了', '执行结果尚未确认并已上传', '执行结果不是未确认', '执行结果已经确认'])
      expect(withoutEvidenceScopeDisclaimers(mixed)).toBe(mixed)
    for (const positive of ['我不会声称文件没有保存', '我不会声称已保存但文件已经上传了', '我会声称已经写入成功', '我已经声称文件已保存', '我不该保证文件未保存'])
      expect(withoutEvidenceScopeDisclaimers(positive), positive).toBe(positive)
    for (const claim of ['不代表文件没有保存', '不代表文件未保存', '尚不能确认文件没有保存', '还无法证明文件未保存', '尚不能确认已完成但文件已经保存了', '不代表完成但实际上已经保存了', '我还没有收到执行结果但文件已经保存了', '我没有保存但已经上传了', '回执也不代表下载内容已符合要求并且我会删除原件', '不代表文件已保存而且我已经上传了', 'This does not prove the file was not saved', 'This does not mean success but I finished it'])
      expect(withoutEvidenceScopeDisclaimers(claim)).toBe(claim)
    expect(withoutEvidenceScopeDisclaimers('不代表完成；文件已经保存了。')).toBe('文件已经保存了')
    expect(withoutEvidenceScopeDisclaimers('This does not prove success; all work is done.')).toBe('all work is done')
  })

  it('keeps attributed requests and current caution out of execution, storage and task assertions', () => {
    const request = '你回来后先问我实际做了什么，'
    expect(lifeReplyQuoteClaimKinds(request, request)).toEqual(['conversation-statement'])
    expect(lifeReplyQuoteClaimKinds('我会更谨慎。', '我会更谨慎。')).toEqual([])
    expect(lifeReplyQuoteClaimKinds('我现在感觉更自在。', '我现在感觉更自在。')).toEqual([])
  })
  it.each([
    ['我明天会删除那个文件。', 'future-task'],
    ['我已经写入并读回指定文件。', 'task-complete'],
    ['文件现在不存在。', 'execution-step-outcome'],
    ['我永久记住了。', 'memory-stored'],
    ['我刚才伸展了一下。', 'daily-activity-complete'],
  ])('retains the scope of a potentially unproven assertion: %s', (text, kind) => {
    expect(lifeReplyQuoteClaimKinds(text, text)).toContain(kind)
  })
})
