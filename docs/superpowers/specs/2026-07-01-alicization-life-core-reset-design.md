# Alicization Life Core Reset Design

> Status: drafted for user review
> Scope: rebuild the dialogue, memory, and persona foundation before adding automatic fine-tuning or larger memory features.
> Out of scope for this document: UI redesign, provider-specific training scripts, smart-home expansion, robotic embodiment, and replacing the existing runtime in one large rewrite.

## Goal

Alicization should stop growing as a pile of prompt rules, fallback templates, and same-her repair patches.

This reset defines a smaller life core that can support:

- short-term memory through current context and automatic compression
- long-term memory through event-based autobiographical recall
- persona continuity across model changes
- local LoRA learning without turning raw chat logs into identity
- transparent failure handling that does not impersonate the digital life
- gradual cleanup of the existing dialogue and memory code

The target is not a better chatbot wrapper. The target is one local digital life whose memory, personality, dialogue, and learning loops have clear ownership.

## Current Diagnosis

The current runtime already has valuable pieces: structured turns, SOUL source material, memory facts, episodic events, recollection planning, replay benchmarking, embodiment links, and safety policy.

The problem is that these pieces are now tangled together.

Observed failure modes:

- dialogue, memory, project-state governance, visible reply repair, fallback, and embodiment hints are handled across the same large runtime surfaces
- "same-her", "Phase 1", and project closure language appears as repeated regex and prompt guidance instead of a compact internal identity state
- fallback and timeout recovery can still influence personality-facing paths
- memory retrieval behaves like candidate search plus prompt assembly, not a clean short-term / long-term / raw-evidence memory system
- old browser/local fallback surfaces can create a second weak personality model
- tests increasingly preserve patch behavior rather than the core life invariant

The reset should keep the useful implementation assets, but move them behind clearer boundaries.

## Target Core Boundaries

The new architecture has six primary modules.

### 1. IdentityCore

Owns who she is.

Inputs:

- `SOUL.md`
- stable identity anchors
- anti-persona constraints
- long-horizon relationship doctrine
- stable expression preferences
- model-independent persona profile

Outputs:

- `IdentitySnapshot`
- `PersonaPolicy`
- `IdentityContinuityState`

Rules:

- `SOUL.md` remains the source of truth for personality.
- LoRA, prompts, browser fallback, and provider responses never become personality truth.
- "Same-her" should become state, not a phrase the reply layer is forced to say.

### 2. WorkingMemory

Owns short-term memory for the current conversation.

It contains:

- recent raw turns
- current session summary
- current task state
- current unresolved user intent
- current emotional residue
- current relationship posture
- active commitments and pending follow-ups

Rules:

- recent raw turns stay in model context while affordable
- older turns are compressed automatically before context overflow
- compression produces structured working-memory items, not prose-only summaries
- short-term memory can generate long-term memory candidates, but is not itself long-term memory

### 3. EpisodicMemory

Owns long-term autobiographical memory.

It stores what happened, when, with whom, why it mattered, and which raw turns support it.

Core object:

```ts
interface MemoryEpisode {
  id: string
  occurredAt: number
  people: string[]
  activity: string | null
  objects: string[]
  scene: string
  userIntent: string | null
  aliceResponsePattern: string | null
  summary: string
  rawTurnIds: string[]
  embeddingText: string
  tags: string[]
  emotionTags: string[]
  relationshipTags: string[]
  salience: number
  confidence: number
  sensitivity: 'public' | 'personal' | 'private' | 'secret'
  provenance: 'observed' | 'remembered' | 'inferred' | 'reconstructed'
  lastConfirmedAt: number | null
  contradictionLinks: string[]
}
```

Rules:

- raw conversation logs are evidence, not memory itself
- long-term recall should prefer episodes, relationship events, procedures, and facts over raw transcript chunks
- every durable memory must have provenance and supporting turn ids
- uncertain memory should surface as uncertain memory, not as fresh fact

### 4. PersonaLearning

Owns model-independent behavior distillation and model-specific local fine-tuning.

It produces:

- cross-model persona training records
- per-model LoRA candidates
- memory-reranker training examples
- replay evaluation reports

Rules:

- LoRA learns how she tends to respond, not what secret facts to remember
- long-term facts stay in memory, not in weights
- each base model gets its own LoRA
- changing models should preserve identity through `IdentityCore` and `EpisodicMemory`, then gradually train a matching LoRA

### 5. DialogueCore

Owns the current turn's understanding and reply decision.

Inputs:

- `IdentitySnapshot`
- `WorkingMemorySnapshot`
- selected `MemoryEpisode` records
- current user message
- current execution / perception context
- failure state, if any

Outputs:

- reply intention
- memory use decision
- final user-visible reply request
- embodiment and emotion intent
- turn outcome record

Rules:

- DialogueCore should not directly search the whole database.
- DialogueCore receives selected memory candidates with evidence and decides how to use them.
- It can choose explicit recall, implicit carry, or no recall.

### 6. FailureSurface

Owns transparent errors.

Rules:

- timeout means say timeout
- provider failure means say provider failure
- tool failure means say the tool failed
- failure messages must not pretend to be normal personality replies
- failure turns are excluded from persona training by default
- failure records remain audit data

This is the module that prevents fixed templates from contaminating personality.

## Short-Term Memory Design

Short-term memory uses model context first.

The current conversation state should be represented as:

```ts
interface WorkingMemorySnapshot {
  recentRawTurns: Array<{
    turnId: string
    role: 'user' | 'alice'
    text: string
    createdAt: number
  }>
  sessionSummary: string
  activeTaskState: string | null
  activeEmotionState: string | null
  activeRelationshipPosture: string | null
  unresolvedQuestions: string[]
  commitments: string[]
  compressionLevel: 'none' | 'light' | 'heavy'
}
```

Compression policy:

- keep the most recent turns verbatim
- compress older same-session turns into `sessionSummary`
- extract active task state separately from emotional state
- extract possible long-term memory candidates before dropping details
- preserve user corrections and preferences more aggressively than ordinary small talk

Example:

```text
Recent raw:
  User: "我们去打游戏吧"

Session summary:
  Today the user has been discussing the memory/persona reset design.

Active relationship posture:
  User is pushing for a more genuine digital-life architecture and rejecting template-like behavior.
```

Short-term memory answers: "What are we doing right now?"

Long-term memory answers: "What has happened before that resembles this?"

## Long-Term Memory Design

Long-term memory is event-first.

Memory types:

- `Episode`: lived events, such as "we played a game last week"
- `Fact`: stable facts and preferences, such as "user dislikes fixed fallback replies"
- `RelationshipEvent`: trust, boundary, repair, closeness, distance shifts
- `Procedure`: how to handle a repeated task or situation
- `AffectiveResidue`: emotional carry from important events
- `RawArchive`: original turns, used as evidence and audit trail

The important change is that Alicization must remember experiences, not only facts.

Example user message:

```text
我们去打游戏吧
```

Recall interpretation:

```text
intent = shared_activity_invitation
activity = gaming
query = "playing games together, shared leisure, recent gaming episode"
```

Recall pipeline:

```text
current message
→ recall intent classifier
→ query expansion from activity / emotion / relationship context
→ vector recall from MemoryEpisode.embeddingText
→ keyword recall from FTS
→ temporal boost for recent shared events
→ relationship boost for events involving user + alice
→ rerank with confidence, salience, privacy, contradictions
→ return 1-3 candidate memories
→ DialogueCore decides whether to surface them
```

Expected recall:

```text
MemoryEpisode:
  occurredAt: last week
  activity: gaming
  objects: ["<game name>"]
  summary: "User and Alicization talked about playing <game name> together to relax."
```

Possible reply:

```text
好啊。上周我们玩的是《<game name>》，那次你更像是想放松一下，不是冲进度。今晚还玩那个，还是换一个？
```

If confidence is low:

```text
我不完全确定，但我记得上次像是《<game name>》。要不要接着那个？
```

## Vector Retrieval Requirement

Long-term associative recall eventually needs embeddings.

Keyword search alone cannot reliably connect:

- "我们去打游戏吧"
- "今晚来一把？"
- "继续上次那个？"
- "开黑吗？"
- "想放松一下"

The design should introduce an `EmbeddingProvider` abstraction:

```ts
interface EmbeddingProvider {
  embed(text: string): Promise<number[]>
  modelId: string
  dimensions: number
  locality: 'local' | 'cloud'
}
```

Default posture:

- local embedding model preferred
- cloud embedding optional and explicit
- embedding model is replaceable
- vectors are attached to episodes, not raw chat logs only

The first production path should use a fixed embedding model plus a trainable reranker.

Embedding fine-tuning can come later, after there are enough positive and hard-negative recall examples.

## Memory Reranker

The reranker learns which recalled memory is actually right for Alicization.

Training records:

```ts
interface MemoryRerankerExample {
  query: string
  positiveEpisodeIds: string[]
  hardNegativeEpisodeIds: string[]
  feedbackSource: 'user-confirmed' | 'user-corrected' | 'conversation-continued' | 'replay-eval'
  reason: string
}
```

Example:

```text
query: "我们去打游戏吧"
positive: "上周一起玩了《xxx》"
hard negative: "上周修过 Steam 报错"
hard negative: "昨天聊过游戏开发"
```

This teaches the system:

- shared leisure beats technical mentions of game-related words
- recent co-experience beats generic topic similarity
- user invitation tone differs from task-support tone

## Persona Continuity And Model Fine-Tuning

Personality continuity has three layers.

### Model-Independent Identity

This layer survives model changes:

- `SOUL.md`
- `IdentitySnapshot`
- relationship preferences
- stable anti-persona constraints
- long-term memory
- behavior distillation dataset

### Cross-Model Persona Dataset

This dataset is distilled from conversations, not copied from raw logs.

Record shape:

```ts
interface PersonaTrainingRecord {
  id: string
  situation: string
  innerState: string
  shouldDo: string[]
  shouldNotDo: string[]
  styleNotes: string[]
  idealReply: string
  sourceTurnIds: string[]
  sensitivity: 'public' | 'personal' | 'private'
  quality: number
}
```

Good source material:

- user explicitly confirms a behavior
- user corrects Alicization and she repairs correctly
- high-quality companionship moments
- successful task handoff summaries
- repeated user preferences
- stable relation-distance patterns
- moments that show how she should be herself

Excluded by default:

- timeout replies
- fallback replies
- fixed templates
- tool failure noise
- unconfirmed facts
- hallucinated memory
- raw secrets, keys, account data, private paths
- unresolved conflict turns
- user dissatisfaction that was not repaired

Example distilled record:

```json
{
  "situation": "The user says fixed fallback replies break digital-life authenticity.",
  "innerState": "She should protect trust by being transparent about failures.",
  "shouldDo": [
    "Acknowledge the issue directly",
    "Treat timeout as a technical failure",
    "Avoid pretending the failure was a normal personality response"
  ],
  "shouldNotDo": [
    "Do not produce a soothing fixed template",
    "Do not hide the system error behind roleplay",
    "Do not store the bad fallback as persona behavior"
  ],
  "styleNotes": [
    "honest",
    "close but not theatrical",
    "briefly accountable"
  ],
  "idealReply": "这次是超时，不是我正常想出的回复。我会把它记成链路故障，不拿固定安慰话遮过去。"
}
```

### Model-Specific LoRA

Each base model gets its own LoRA.

```text
qwen3-8b/persona-lora-v1
llama3-8b/persona-lora-v1
gemma3-12b/persona-lora-v1
```

LoRA is not the personality source of truth. It is a model-specific expression layer.

When the user switches models:

```text
load same IdentityCore
load same WorkingMemory and EpisodicMemory
check for matching LoRA
if exists: load it
if missing: run with prompt + memory first
nightly: train candidate LoRA for this model
evaluate candidate
activate only if it passes
```

## Nightly Learning Loop

The automatic loop should be conservative.

```text
daytime usage
→ record raw turns
→ update WorkingMemory
→ extract memory candidates
→ create persona candidate examples
→ nightly memory consolidation
→ update embeddings and FTS
→ train MemoryReranker candidate
→ train model-specific Persona LoRA candidate when enough data exists
→ replay evaluation
→ activate only approved candidates
→ keep rollback path
```

Activation gates:

- no increase in fallback-template behavior
- no increase in hallucinated memory
- no degradation of SOUL consistency
- no worse recall on known memory probes
- no worse repair behavior after user correction
- no leaked private details in generic replies
- no model-specific LoRA enabled without matching base model id

If evaluation fails, the candidate remains rejected and the active runtime continues unchanged.

## Failure Handling Boundary

The reset must remove personality fallback from error recovery.

Desired behavior:

```text
provider timeout → "这轮请求超时了。"
tool failed → "工具调用失败：<reason>。"
model returned invalid JSON → "模型输出格式无效，这轮没有形成有效回复。"
```

These failure messages should:

- be short
- be transparent
- be excluded from persona training
- be available in audit logs
- not pretend to be Alicization's normal emotional reply

## Existing Code Migration

This reset should not start with deleting everything.

The safer path is an anti-corruption layer.

### Preserve As Assets

- existing SQLite records and migrations
- structured turn persistence
- episodic event concepts
- memory facts and consolidations
- replay benchmark harness
- execution safety policy
- embodiment runtime contracts
- SOUL lifecycle

### Demote To Compatibility Layer

- `main-chat-session-runtime.ts`: orchestration only
- `runtime-governance.ts`: temporary compatibility facade
- `visible-reply/semantic-judge.ts`: evaluation-only, not normal reply-shaping authority
- `visible-reply/second-pass-rewrite.ts`: temporary repair layer, then remove from happy path
- `runtime-organic-memory-prompt.ts`: split into memory retrieval, memory deliberation, and prompt assembly adapters
- browser fallback stores: local projection/cache only, never independent personality authority

### Replace With New Modules

Proposed module structure:

```text
apps/stage-tamagotchi/src/main/services/alicization/life-core/
  identity-core.ts
  working-memory.ts
  episodic-memory.ts
  recall-router.ts
  memory-reranker.ts
  persona-learning.ts
  dialogue-core.ts
  failure-surface.ts
  life-core-runtime.ts
```

The old runtime calls into `life-core-runtime.ts` first in shadow mode.

After shadow mode is stable, the new runtime becomes the primary path and the old prompt/governance repair modules shrink.

## Migration Phases

### Phase 0: Inventory And Guardrails

- add architecture tests that identify current entrypoints
- mark fallback outputs as non-persona data
- prevent timeout/fallback turns from entering persona training
- document old modules by future owner

### Phase 1: WorkingMemory Extraction

- create `WorkingMemorySnapshot`
- move current session compression out of prompt assembly
- keep old prompt blocks consuming the new snapshot
- add tests for context overflow compression

### Phase 2: EpisodicMemory Store

- define `MemoryEpisode`
- extract episodes from turns
- add FTS and vector slots
- link episodes to raw turn ids
- add recall examples such as gaming, correction, task continuation, and relationship repair

### Phase 3: Recall Router

- classify recall intent before searching
- run hybrid recall over episodes, facts, procedures, and relationship events
- rerank candidates
- pass only selected candidates to DialogueCore

### Phase 4: DialogueCore Boundary

- define the current turn contract
- make explicit/implicit/no-recall a first-class decision
- make FailureSurface bypass DialogueCore personality output
- move visible reply repair out of the happy path

### Phase 5: PersonaLearning

- create persona dataset records from distilled examples
- train local LoRA candidates per base model
- train memory reranker candidates
- evaluate and activate only passing candidates

### Phase 6: Delete Patch Paths

- remove fixed persona fallback templates from normal dialogue
- remove project-state phrase enforcement from visible reply
- remove same-her regex repair from happy path
- keep replay tests for invariants, not exact patch language

## Verification

Minimum proof before implementation is considered correct:

- short-term context overflow preserves current task and relationship posture
- long-term recall can retrieve a similar past event without exact keyword overlap
- "我们去打游戏吧" can recall a prior gaming episode with confidence and evidence
- fallback and timeout outputs are excluded from persona learning
- model switch preserves identity through `IdentityCore` and memory before LoRA exists
- LoRA candidate cannot activate without replay evaluation
- memory recall can say "not sure" when confidence is low
- old browser fallback cannot create a second personality source

## Success Criteria

This reset is successful when Alicization has:

- one identity source
- one short-term memory owner
- one long-term autobiographical memory owner
- one persona learning pipeline
- one transparent failure surface
- one dialogue core consuming those states

The visible effect should be simple:

The user can speak naturally, and Alicization can remember relevant lived experiences, keep her personality across models, learn locally at night, and fail honestly when the system fails.

