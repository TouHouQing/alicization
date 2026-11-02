# Stage UI

Visible text holds one dialogue expression over the latest resident emotional state until delivery ends or is interrupted. Resident updates continue underneath it. The existing chat stream relays embodiment metadata to the stage in the same ordered, session and generation bound channel as visible glyphs; it omits retained prompt history, rejects cancelled or foreign turns and does not echo remote events. Card, pause, renderer and speech-mode changes revoke transient text presentation. Audio still derives timing and playback outcomes from its own real source.

Header metadata prepares the face while suppressing a gesture. The first actual visible glyph admits that prepared text performance once; subsequent glyphs and metadata updates preserve the one-action limit. An action-admission change participates in performance deduplication so an immediate first glyph cannot lose its gesture to the preparation frame's short deduplication window.

Live2D model settings default to quiet companionship. A per-model option enables repeating authored idle animations; motion selection in quiet mode previews the asset once. Mode changes preserve foreground actions, and reloading settings restores the saved mode without firing another preview.

Shared core for stage

VRM dialogue anchors consume the rendered body bounds and head region. Default panels first protect the face, then minimize body overlap within the available viewport. Relative user drag offsets remain available, and a center tolerance prevents breathing from changing the panel side. Body visibility witnesses sample the actual head, body center and existing anchor rather than assuming a standing pose.

Hovering or focusing dialogue takes ownership of its current rectangle. Body movement keeps updating while the composer, send button and resize/drag controls stay in place. Leaving both pointer and keyboard focus releases that ownership and resumes following the body; this temporary position is not saved as a manual preference.

Speech delivery is resolved per request by `speech-synthesis-style.ts`: user settings remain the base, relative emotional rate/pitch stays with the queued turn, plain xsAI requests receive speed, and cancellation reaches synthesis. Completed or blocked activity badges do not own the body; only active work phases can take focus. Daily life and personal projects have their own concise presentation labels. Enduring personality is not modified by sentiment telemetry.

## Desktop resident body frames

`Stage` accepts the optional `residentBehavior` rendering frame produced by the desktop life composable. `stage-resident-behavior-frame.ts` checks identity, freshness and interruption before applying small gaze, posture and breathing offsets to both Live2D and VRM. Committed expressions, speech and actual task actions retain priority. Other surfaces do not create another personality or resident behavior clock.

SOUL snapshots in `alicization-epoch1` adopt monotonically increasing revisions within the same SOUL path. Failed edits reject explicitly; they never return the previous snapshot as a successful save. The desktop main runtime explicitly registers its persona windows for SOUL and Kill Switch notifications.

## Dialogue intent and coordinated movement

Desktop finish events may carry the main process's accepted provider reply and conversation commit receipt. The chat store preserves that authority and merges logical turn IDs across gateway attempts, avoiding duplicate user and assistant entries. Infrastructure diagnostics are displayed without token speech synthesis; the presence dispatcher also excludes infrastructure-authority replies from voice and emotional routing.

The chat pipeline owns one actual voice per logical turn, including gateway attempt suffixes. Its prepared speech metadata adopts the matching committed embodiment turn before playback, so both project presentation receipts and body cues still refer to the durable main-process delivery. Independent proactive and recovery deliveries retain their own speech owners.

A valid provider reply durably committed by main also owns speech after a failed or declined tool operation. The prior tool card keeps its failure while the accepted reply can explain it naturally. Uncommitted or malformed output cannot clear that failure surface or enter speech.

The desktop's prepared interaction intent arrives inside the existing embodiment script. `use-stage-interaction-intent.ts` checks card/turn ownership, freshness, task takeover and pause before projection. `stage-interaction-performance.ts` uses actual playback phases to orient eyes before the head and torso, then releases on cooldown. Emotion, face, lip sync, voice and execution outcomes retain their existing authorities. A model switch, a new host turn, Kill Switch, pause or execution takeover clears the transient intent rather than replaying it later. No second mind, renderer memory write or independent initiative timer is introduced.

An idle gap during synthesis retains the prepared intention until its own playback or expiry. A newly accepted dialogue turn replaces earlier unplayed body previews; foreground task activity clears such previews without cancelling audio sources or claiming speech completion. Actual playback reconstructs cues from its original metadata. This keeps a pending reply from overriding a committed execution gesture.

## Persona Onboarding

The model step requires explicit confirmation after selection. Provider configuration preserves already saved inputs when revisited. Editing an inactive card changes that card's bindings without activating it; persona and runtime tabs operate only on the active card. Imported card files pass `parseImportedCard` before the card list changes.

Live2D imports must render a valid thumbnail and finish their IndexedDB write before entering the catalogue. Failure feedback stays in the selector; failed imports release their hidden canvases. User model names persist across reloads, and built-in models omit rename/removal actions. The selector locks confirmation while an import is pending.

The Live2D settings panel restores each eye's open default, exposes an explicit idle-animation switch, and selects available motions from the current model. Manual idle choices persist per model; returning to automatic mode releases that preference so the desktop's internal state can drive idle motion again.

`Section` exposes `v-model:expand` so callers can keep expansion state through navigation. The model selector keeps names and confirmation controls visible in narrow desktop windows.

The active card also owns its display model and speech selection. Runtime selection changes update the existing card binding, so a second renderer restores the same body and voice. Applying a different card suppresses writeback during projection; switching cards must preserve each card's independent binding. Regression coverage uses a second Pinia instance and switches between two cards with distinct voices.

The guided setup collects both names, temperament, response preferences, and a review before creating the desktop persona. `alicization-genesis-workshop` owns the draft and builds the validated submission. Saving must finish before advancing to dialogue model configuration; failures and persona conflicts remain visible and preserve the draft.

```shell
pnpm exec vitest run packages/stage-ui/src/stores/alicization-genesis-workshop.test.ts packages/stage-ui/src/composables/use-alicization-genesis-submit.test.ts
```

## Cross-window chat lifecycle

Cross-window chat stream events are received synchronously and delivered through an ordered queue. Stream completion flushes the text stream; assistant completion closes the matching speech intent. The receiver retains the session, generation and message identity until that second event, so a late completion cannot close a newer turn. Disposal drops queued delivery, and an observer error is reported without blocking subsequent completion events.

## Histoire (UI storyboard)

Kokoro worker operations return download and synthesis errors through their response channel. Reported operation failures release waiting calls immediately; actual worker crashes or deadlines clean up listeners and restart the worker. The shared speech settings shell supports explicit voice loading for local models.

https://histoire.dev/

```shell
pnpm -F @proj-alicization/stage-ui run story:dev
```

### Project structure

Pure text uses the same authority metadata as speech, with no audio clock. `stage-text-dialogue-delivery.ts` deduplicates semantic updates and admits at most one primary gesture per text turn. Audio sentence decorations do not become extra text emotion events. Completion briefly holds the final expression before performance cooldown; a new turn cancels that cooldown, and late metadata cannot replay a finished text turn or block an unrelated initiative turn. Actual audio keeps its existing playback and lip sync lifecycle.

The typed `stream-cancel` terminal event releases the matching prepared or active chat turn across windows. Its session, generation and message identity guards reject stale cancellation. Completed action payloads retire while their revisions remain monotonic, so a newly loaded body does not replay a settled gesture.

`stage-action-delivery.ts` admits one primary gesture per spoken utterance across metadata, preview, playback and cadence callbacks. Sentence boundaries, transcript formatting and gateway attempts do not authorize another large gesture. Facial expression, gaze, audio lip sync and the existing speech motor layer continue through the utterance. Independent interactions and ordinary explicit action segments retain their own identity. Cadence actions wait for their intended beat instead of firing early at playback start.

1. If a story is bound to a specific component, it can be placed beside the component in the `src` folder. e.g., `MyComponent.story.vue`
2. If a story is not bound to a specific component, then it should be placed in the `stories` folder. e.g., `MyStory.story.vue`


### Live provider text and mouth presentation (2026-10-18)

The desktop extracts the root public `reply` while the provider stream is still
open. A small whitelisted emotion header can prepare the face; private fields,
JSON framing and tool arguments never enter the body channel. Concrete execution,
stored-memory, promise and attributed-history claims retain the grounding gate.
Admitted body packets carry sequence numbers and UTF-16 offsets; completion confirms
the same body and never replays it. Early packets cannot enter memory or training.

One cancellable presentation cursor consumes arriving body packets independently
of network reception, preserving the existing natural text/mouth pacing. Its first
glyph starts without waiting for provider completion or private-state settlement.
`text-presented` carries the same visible position to the body, caption and remote
chat; `token-literal` supplies admitted text to the actual speech pipeline.
Published text cannot be silently revised or retried. Failures and cancellation
retain the visible prefix with an explicit interruption status and disable learning.
Final personality, memory and tool-result admission still require full settlement.
Chinese runs use contextual `pinyin-pro` readings, including bilabial closure,
vowel spreading/rounding and punctuation pauses. Digits use Mandarin readings;
Latin spelling is an approximation, not a phonetic dictionary. Emoji and symbols
stay silent. Cancellation/generation replacement discard the remaining cursor.
The Live2D draw plugin writes only compiled mouth parameters, yields to actual
audio, and never creates PCM energy or re-arms semantic gesture budgets.
Hiyori exposes open/form controls, so full five-vowel geometry requires a rig with
corresponding bindings. Character-scale timing is a text presentation clock, not
measured speech alignment.

### Natural text pacing and one visible reply (2026-10-18)

The visible cursor advances at 230 ms per Mandarin syllable, lengthening the last
syllable of a phrase to 290 ms. Commas pause for 260 ms; sentence endings pause
for 440 ms. Connected syllables retain mouth aperture and compound finals glide;
adjacent mouth forms transition over 70 ms of wall time. Punctuation, cancellation
and actual audio retain immediate mouth authority. This is a text presentation
estimate; measured audio continues to own voice lip sync.

An active logical turn renders one bubble. Gateway retry IDs share a canonical
identity across durable replay and the live cursor. While presentation is active,
its prefix masks an already persisted full reply; completion upserts the same
row once. Durable content and its audit metadata are retained.
