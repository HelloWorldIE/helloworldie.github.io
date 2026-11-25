# Mascot — integration & motion guide (for AI agents)

> You are wiring the **HelloWorld.ie bot** into a product. This document is the
> complete brief: how to drive it, **when** to use each motion, the motion
> philosophy every animation obeys, and the rules for inventing new ones so they
> stay on-brand. Read it before generating any code that touches the mascot.
>
> Companion files: `manifest.json` (machine-readable catalogue), `README.md`
> (human API reference), `demo.html` / `scene.html` (live examples).

---

## 1. Mental model

The bot is **one friendly character** — a chat-bubble robot head with two tall
violet eyes and an antenna — that reacts to what's happening in the product. It
is the face of an abstract idea (getting cited inside AI answers), so its job is
to make that idea feel **alive, competent, and trustworthy**.

Think of it as a tiny actor, not a spinner. It has:

- **a body** (the whole icon), **a head group**, and **two eyes** — three layers
  that move together so it has weight and follow-through;
- **expressions & actions** — ~35 short performances you trigger on events;
- **a typing trick** — an eye flies out and becomes a text cursor that types;
- **resting life** — it breathes, blinks like a human, glances around, and can
  drift across a canvas when idle.

One rule above all: **it should always look like a living thing that is paying
attention — never a mechanical loop.**

---

## 2. Quick start

```html
<link rel="stylesheet" href="mascot/mascot.css" />
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
<script type="module">
  import { Mascot, helloworld } from './mascot/index.js';

  const bot = new Mascot({ mount: '#bot', character: helloworld });

  // drive it from your app's events:
  await bot.play('thinking');               // one performance
  await bot.play('found & "Found it!"');    // performance + typing, together
  await bot.run('scan, working, found');    // a scripted sequence
  bot.setMood('float');                     // change idle behaviour
</script>

<div id="bot" style="width:120px"></div>     <!-- you size the mount; the bot fills it -->
```

GSAP 3.x is the only dependency. Pass your own with `{ gsap }` if you don't
expose it globally. Multiple instances on one page are fine (everything is
per-instance). The typed text inherits the host font — load Plus Jakarta Sans.

---

## 3. The motion philosophy — read this before authoring anything

Every motion in this system follows the same physical grammar. New motions
**must** follow it too, or they'll feel foreign next to the rest.

### 3.1 Three layers, always

Each performance drives all three layers, with the smaller, faster parts leading
and the bigger, heavier parts following:

| Layer | Selector role | What it does | Magnitude |
|---|---|---|---|
| **EYE** (`this.EYE`) | the two eyes | look, squint, widen, lead the motion | largest % moves |
| **GRP** (`this.grp`) | head + eyes group | the primary gesture | medium |
| **BOT** (`this.bot`) | the whole icon | secondary follow-through + a slight tilt | smallest, slowest |

The whole-icon (BOT) layer is what stops a motion feeling "on rails." A nod isn't
just the head sliding down — the whole body dips a little and tips, a beat behind.
**If you animate GRP, add a smaller, slightly later BOT move in the same spirit.**

### 3.2 Effort: anticipation → action → follow-through

Nothing starts or stops instantly. Real bodies wind up, commit, and overshoot:

- **Anticipation** — a small move *against* the action first (crouch before a
  jump, gather before a thrust, dip before an idea pops).
- **Action** — the committed motion, on a fast-out ease (`power2/3.out`, `back.out`).
- **Follow-through / settle** — it overshoots slightly and eases back, usually
  with `elastic.out(1, 0.5–0.7)` for springy things or `power2.inOut` for calm ones.

This "expended effort" is the single biggest reason the bot reads as alive. A
motion that just lerps from A to B looks dead.

### 3.3 No deform-for-locomotion

Squash & stretch is fine **in place** for energy (a jump, a laugh). But when the
bot **travels** (float/roam), it must **not** skew or distort — the bounce lives
entirely in **position**: a quick push that overshoots the target a hair and eases
back. (This was a hard-won art direction call: skewing while moving looked like a
cheap "walk cycle" and was rejected.)

### 3.4 Momentum, like a jellyfish

Locomotion is **pulse-and-glide**, not a constant slide: *gather → one strong
push (fast-out) → long decelerating coast that carries momentum and settles back
from a small overshoot.* One push should carry it a good distance. Eyes lead
toward the direction of travel (scaled by speed), then drift back as it coasts;
the whole icon tilts ever so slightly toward where it's heading.

### 3.5 Always return to a true rest pose

Before any action, the engine glides the bot back to its rest position
(`toRest()`), so a mid-drift position never throws an animation's timing or
alignment off. Every performance must **end** back at neutral (no leftover
rotation/offset on any layer) — the engine calls `neutral()` after each, but your
timeline shouldn't strand a layer mid-transform.

### 3.6 Timing & easing cheat-sheet

- Beats are short: **0.1–0.7s** per segment. Whole performances land ~0.8–2.5s.
- Energetic out: `power2.out`, `power3.out`, `back.out(1.8–3)`.
- Springy settle: `elastic.out(1, 0.5–0.7)` (lower second number = less wobble).
- Calm/emotive: `sine.inOut`, `power2.inOut`.
- Avoid heavy `bounce.out` except for deliberately comic landings (spin).
- Avoid long `elastic` tails on travel/wave — they read as a wobble, not life.

---

## 4. Blinking — why it matters and how it works

Blinking is not decoration; it's the cheapest signal of **life and attention**.
A character that never blinks looks frozen/dead; one that blinks too much looks
anxious or glitchy (we tuned this down repeatedly). The model:

- **Human cadence.** Resting blinks are scheduled on an *irregular, clustered*
  timeline (drawn from an exponential distribution) around a relaxed mean — not a
  fixed metronome. Calm ≈ 6–10/min, Still calmer, with occasional natural
  double-blinks.
- **Graded blinks.** `light` (a quick flick), `medium` (normal), `strong` (a full
  squeeze), `double`, or a number for N blinks. Use lighter blinks for tiny
  punctuation, stronger ones for emphasis/relief.
- **Arousal coupling.** After an energetic performance (or a fast float move) an
  internal `arousal` value rises and **briefly increases the blink rate**, then
  decays back to calm. Calming actions (sad, sleep) lower it. This is why he
  seems a little more "awake" right after celebrating and sleepy after a sigh —
  it's automatic; you don't manage it.
- **As cursor.** During typing, the flown-out eye blinks *as the text cursor* —
  tying the blink to the brand's "AI is answering" idea.

**Practical guidance:** let `autoblink` (on by default) scatter natural blinks
between steps of a `run()` sequence. Use an explicit `blink` token to punctuate a
beat (e.g. surprise → `blink double` → answer). Don't spam blinks inside a single
performance.

---

## 5. Resting moods (idle behaviour)

The bot is never fully static when idle. Pick the mood to match the surface:

| Mood | Behaviour | Use for |
|---|---|---|
| `still` | near-stationary; only the odd slow blink + the faintest breathing | inline next to text, favicons-in-motion, dense UI where movement distracts |
| `calm` *(default)* | gentle breathing + occasional eye darts | most placements — a card, a header, a chat avatar |
| `float` | drifts with the jellyfish pulse-glide; eyes + slight tilt lean toward travel; gets "bored" between moves (a stretch, a slow look-around) | heroes, empty states, loading screens, anywhere with room to roam |

**Roam (big canvas).** By default `float` drifts *in place*. To make the whole
bot travel a larger container, pass `roam: { within: '#canvas', padding: 16 }`.
He'll be his mount's size and glide around the container; switching to
`calm`/`still` glides him back to centre. Expressions still fire mid-roam (he
stops where he is, performs, resumes).

Breathing is **scale-only** (no vertical translation) so the eye baseline never
shifts — this prevents a subtle "jump" when a performance ends. Keep it that way.

---

## 6. The catalogue — what to play, and when

35 performances in four categories. Choose by the **moment in your product**, not
by what looks fun. The mapping below is the intended semantics — `manifest.json`
has the same data machine-readable.

### Emotion — how he feels
`happy` · `excited` · `celebrate` · `laugh` · `proud` · `relieved` · `curious` ·
`shy` · `nervous` · `skeptical` · `sad` · `dizzy`

- **happy** — a positive result, a good-news line. Warm, not loud.
- **excited / celebrate** — a win worth a fuss: "you got cited!", upgrade success,
  milestone. `celebrate` is the bigger leap; `excited` is bouncy enthusiasm.
- **laugh** — light, playful copy; a delighter. Use sparingly.
- **proud** — showing off the user's own achievement/report ("look what we did").
- **relieved** — a problem resolved, a long task finished (visible sigh).
- **curious** — inviting exploration; "let's see…" before a scan/audit.
- **shy** — gentle, humble moments; a soft welcome.
- **nervous** — stakes/uncertainty (use rarely; can undercut trust).
- **skeptical** — "hmm, really?" — reviewing a questionable input/claim.
- **sad** — a downturn, a metric dropped (handle with care — keep it brief).
- **dizzy** — overwhelmed/too-much-data, or a playful error.

### Reaction — responses to an event
`yes` · `no` · `surprise` · `impressed` · `confused` · `wink` · `idea`

- **yes / no** — confirm / decline; agreement or "nope" (clean nod / shake).
- **surprise** — an unexpected result lands.
- **impressed** — admiring a strong result ("wow", big number).
- **confused** — input didn't parse, ambiguous state ("huh?").
- **wink** — a knowing, friendly aside; a tip or easter-egg.
- **idea** — a suggestion/insight appears (eureka pop).

### Gesture — communicative body language
`wave` · `look` · `point` · `shrug` · `listen` · `peek` · `spin` · `determined`

- **wave** — hello / goodbye; onboarding open, session end.
- **look** — direct attention around the scene (glances a circuit).
- **point** — direct attention to one side (toward a CTA, a field, a result).
- **shrug** — "dunno" / no strong opinion / optional step skipped.
- **listen** — waiting on user input; attentive lean (great for chat).
- **peek** — an **entrance**: slides in from offscreen and bobs to a stop.
- **spin** — playful flourish; a reset, a refresh, a "ta-da" transition.
- **determined** — "on it" with resolve before a hard task.

### Process — functional UI / system states
`thinking` · `scan` · `working` · `found` · `notfound` · `error` · `alert` · `sleep`

- **thinking** — processing / composing (eyes drift up-and-aside, considering).
- **scan** — actively searching the web for citations (methodical L→R sweep). The
  signature "what we do" motion — use it during an audit/scan step.
- **working** — generic "on it" busy state (focused bobs + side-to-side scan).
- **found** — a satisfying "got it" snap when results arrive. Pairs with typing.
- **notfound** — empty state: searches, then gives up and looks down.
- **error** — something failed: a sharp "oops" shudder, then recover.
- **alert** — a notification "ping!": pops up wide-eyed and bounces back.
- **sleep** — idle/timeout/disabled; eyes close, slow breathing.

### Special
- **blink** — punctuation (`light`/`medium`/`strong`/`double`/N). See §4.
- **type** — the eye becomes a cursor and types a string. See §7.

---

## 7. Typing — the signature trick

`bot.type('HelloWorld.ie')` (or a `"quoted string"` token) plays the brand's hero
move: the right eye flies left, the left eye catches up, they merge into a single
**blinking text cursor**, type the string (marquee-scrolling if it overflows the
head's screen), then sweep back and split into eyes again. The brand suffix
(`.ie`) is auto-coloured with the accent. Typed text is **violet by default**.

Use it for: the wordmark reveal, a chat bot "speaking", a result being written
out ("Found it!"). Combine with a performance: `found & "Found it!"` runs the
snap and the typing **at the same time** (see §8).

---

## 8. Command grammar (driver)

`play(token)` and `run(seq)` accept a small language:

| Token | Meaning |
|---|---|
| `happy`, `scan`, … | play that performance |
| `"Found it!"` or `text "Found it!"` | type the string (eye→cursor) |
| `blink` / `blink light` / `blink strong` / `blink double` / `blink x3` | graded blink(s) |
| `a & b` | run **both at once** — `celebrate & "Sounds great!"`. Neither is cut short; the shorter waits for the longer. |

- `run(seq)` takes a comma/newline string (commas inside quotes are safe) or an
  array of tokens. Between steps, `autoblink` scatters natural blinks.
- `play`/`run` are **busy-guarded**: a new call is ignored while one is running.
  `await` them, or drive from a queue.
- Unknown tokens are skipped (reported via `onStatus`), not thrown.

**Composing app moments** (recipes):

```js
bot.run('curious, scan, working, found & "Found it!", celebrate');  // audit → win
bot.run('listen, thinking, "Here's what I found…"');                // chat answer
bot.play('alert');                                                  // a notification
bot.run('notfound, shrug');                                         // empty results
bot.run('error, "Something broke", sad');                           // failure
```

---

## 9. Authoring NEW motions (so they stay on-brand)

When asked to add an expression, **don't freehand it.** Follow this template and
the philosophy in §3. Add the function to `expressions.js`, include it in the
returned map, slot it into the right `CATEGORIES` group, and give it an `AROUSE`
value.

```js
// <name> — one-line intent: what feeling/state, and the physical idea
async function myMotion(){ return P(t=>{
  // 1) ANTICIPATION — small move against the action (optional but recommended)
  t.to(GRP,{yPercent:4,scale:0.97,duration:0.14,ease:'power2.in'},0)
   .to(EYE,{scaleY:0.8,duration:0.14,ease:'power2.in'},0)
  // 2) ACTION — the committed gesture, fast-out; lead with EYE, follow with BOT
   .to(EYE,{scaleY:1.2,yPercent:-6,duration:0.2,ease:'back.out(2.4)'})
   .to(GRP,{yPercent:-10,duration:0.22,ease:'back.out(2.2)'},'<')
   .to(BOT,{yPercent:-4,rotation:1.5,duration:0.26,ease:'power2.out'},'<')   // whole-icon follow-through
  // 3) SETTLE — overshoot & ease back to a clean neutral on EVERY layer
   .to(EYE,{scaleY:1,yPercent:0,duration:0.4,ease:'power2.out'})
   .to(GRP,{yPercent:0,duration:0.5,ease:'elastic.out(1,0.6)'},'<')
   .to(BOT,{yPercent:0,rotation:0,duration:0.55,ease:'elastic.out(1,0.5)'},'<');
}); }
```

**Checklist for a new motion:**
- [ ] Drives **all three layers**; BOT moves are smaller and a beat behind GRP.
- [ ] Has anticipation and/or follow-through — not a straight A→B lerp.
- [ ] **No skew/deform if it implies travel.** In-place squash is OK for energy.
- [ ] Ends with every layer back at neutral (no orphaned transform).
- [ ] Beats 0.1–0.7s; total ≲ 2.5s; eases per the cheat-sheet (§3.6).
- [ ] Added to the return map **and** a `CATEGORIES` group **and** `AROUSE`.
- [ ] `AROUSE`: energetic/positive = +0.5…+1.6, neutral = +0.3…+0.5, calming = negative.
- [ ] Reads at small sizes — favour clear single gestures over busy combos.

**Magnitude reference** (so new motions match): eye darts ±7–22 `xPercent`,
big eye looks up to ±38; GRP nods/shakes ±6–9; GRP rotation ±3–8°; BOT
follow-through ≈ 40–60% of the GRP move and 1–3° tilt; jumps `yPercent` −16…−34.

---

## 10. Quirks & gotchas

- **Geometry is ratio-based.** Eyes/screen are placed as fractions of the head's
  rendered box (the eye centres sit on the "ear-line", `yCenter ≈ 0.505`).
  Re-layout happens on resize. Don't hard-code pixel positions.
- **Breathing must stay scale-only.** A vertical breath shifts the eye baseline
  and causes a visible jump when a performance ends. Keep idle breaths to `scale`.
- **One owner for the eyes during float.** The directional "look toward travel"
  and the "bored squint" must not both tween the eyes at once — the squint takes
  exclusive control (`eyeBusy`) to avoid a jump. Respect this if you extend float.
- **`toRest()` before actions** is what keeps mid-drift performances aligned.
  Don't bypass it.
- **Busy-guard.** `play`/`run` no-op while busy. Build a queue if you need to
  fire many in a row; don't loop without `await`.
- **Headless capture caveat.** If you screenshot/probe in a background, non-painting
  iframe, GSAP's ticker can appear paused (timelines won't advance). Give motion
  real wall-clock time in a focused view before concluding something's broken.

---

## 11. Accessibility & performance

- **Reduced motion.** If `matchMedia('(prefers-reduced-motion: reduce)')` matches,
  start in `still`, avoid auto-running sequences, and prefer single short
  performances (or just blinks). The character should still feel present, just calm.
- **Off-screen.** Pause the mascot when not visible (e.g. via `IntersectionObserver`
  → `bot.setMood('still')` or `bot.life.stop()`), and `bot.destroy()` on unmount to
  remove listeners.
- **Cost.** It's a handful of transformed DOM nodes driven by GSAP — cheap. Many
  instances are fine, but don't run dozens of `float`/`roam` bots at once.
- **Don't block UX on it.** The bot is expressive feedback, never a gate. Fire
  performances on events; never `await` one in a path the user is waiting on.

---

## 12. Files

```
mascot/
├── index.js            barrel export
├── mascot.js           core engine (DOM, layout, rest pose, type, driver)
├── expressions.js      all performances + CATEGORIES + AROUSE
├── life.js             moods (still/calm/float) + roam + human blink scheduler
├── mascot.css          scoped styles, driven by per-character CSS vars
├── characters/
│   └── helloworld.js   the bot as data — SVG, geometry ratios, colours
├── demo.html           control playground
├── scene.html          large-canvas roam example
├── manifest.json       machine-readable catalogue (categories, semantics, params)
├── README.md           human API reference
└── AGENTS.md           ← this file
```

To make a **different** character, copy `characters/helloworld.js`, swap the SVG +
geometry ratios + colours, and `new Mascot({ character: yourChar })`. The engine,
expressions, and life loops are character-agnostic.
