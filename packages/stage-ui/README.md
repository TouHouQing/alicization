# Stage UI

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

`Section` exposes `v-model:expand` so callers can keep expansion state through navigation. The model selector keeps names and confirmation controls visible in narrow desktop windows.

The active card also owns its display model and speech selection. Runtime selection changes update the existing card binding, so a second renderer restores the same body and voice. Applying a different card suppresses writeback during projection; switching cards must preserve each card's independent binding. Regression coverage uses a second Pinia instance and switches between two cards with distinct voices.

The guided setup collects both names, temperament, response preferences, and a review before creating the desktop persona. `alicization-genesis-workshop` owns the draft and builds the validated submission. Saving must finish before advancing to dialogue model configuration; failures and persona conflicts remain visible and preserve the draft.

```shell
pnpm exec vitest run packages/stage-ui/src/stores/alicization-genesis-workshop.test.ts packages/stage-ui/src/composables/use-alicization-genesis-submit.test.ts
```

## Histoire (UI storyboard)

Kokoro worker operations return download and synthesis errors through their response channel. Reported operation failures release waiting calls immediately; actual worker crashes or deadlines clean up listeners and restart the worker. The shared speech settings shell supports explicit voice loading for local models.

https://histoire.dev/

```shell
pnpm -F @proj-alicization/stage-ui run story:dev
```

### Project structure

1. If a story is bound to a specific component, it can be placed beside the component in the `src` folder. e.g., `MyComponent.story.vue`
2. If a story is not bound to a specific component, then it should be placed in the `stories` folder. e.g., `MyStory.story.vue`
